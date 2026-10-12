// Vercel Edge Function — set a port's state on an AC Infinity controller.
//
// Body: {userId, token, devId, port, modeType, speak}
//   modeType: 0 = off, 1 = on/manual, 2 = auto, 3 = schedule, 4 = timer-to-on,
//             5 = timer-to-off, 7 = cycle, 8 = VPD trigger
//   speak:    0–10 (fan level) or 0–100 (dimmer / humidifier / pump level)
//
// Why this is a two-step dance: `/api/dev/addDevMode` is NOT a partial
// patch endpoint — the AC Infinity backend expects the ENTIRE advanced
// settings record for the port on every call. If you only send modeType
// + speak, the server rejects it with the generic "Operation failed,
// please try again" message because dozens of required fields are null.
//
// So we first GET the current record for (devId, port) via
// `/api/dev/getdevModeSettingList`, merge the user's requested fields
// into it, and only then POST the merged object back to
// `/api/dev/addDevMode`. Same pattern the HomeAssistant AC-Infinity
// community integration uses.
//
// Known AC Infinity response codes we surface:
//   10000 → token invalid or expired → user needs to re-login
//   10001 → device offline (controller not reachable from the cloud)

export const config = { runtime: "edge" };

const API_BASE = "http://www.acinfinityserver.com";
const UA = "ACController/1.8.2 (iPhone; iOS 14.4; Scale/3.00)";

interface Envelope<T> {
  code: number;
  msg?: string;
  data?: T;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: {
    userId?: string;
    token?: string;
    devId?: string;
    port?: number;
    modeType?: number;
    speak?: number;
  };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return json({ error: "invalid-json" }, 400);
  }
  if (!p.userId || !p.token || !p.devId || p.port == null) {
    return json({ error: "missing-required-fields" }, 400);
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    token: p.token,
  } as const;

  // 1. Fetch the current advanced settings for this port.
  let current: Record<string, unknown>;
  try {
    const getBody = new URLSearchParams({
      devId: p.devId,
      port: String(p.port),
    }).toString();
    const getRes = await fetch(`${API_BASE}/api/dev/getdevModeSettingList`, {
      method: "POST",
      headers,
      body: getBody,
    });
    const getText = await getRes.text();
    let parsed: Envelope<Record<string, unknown>>;
    try {
      parsed = JSON.parse(getText) as Envelope<Record<string, unknown>>;
    } catch {
      return json(
        { error: "upstream-non-json-on-read", status: getRes.status, body: getText.slice(0, 300) },
        502,
      );
    }
    if (parsed.code !== 200 || !parsed.data) {
      return json(
        {
          error: "read-settings-failed",
          code: parsed.code,
          msg: parsed.msg ?? "Failed to read current port settings",
        },
        parsed.code === 10000 ? 401 : 502,
      );
    }
    current = parsed.data;
  } catch (e) {
    return json({ error: "upstream-read-exception", detail: String(e) }, 502);
  }

  // 2. Merge the user's requested changes onto the current record.
  //
  // After seeing the real UIS Pro firmware field names (devHt/devHh
  // not devTh/devHs, acitveTimerOn with a typo, atType co-existing
  // with modeType, …) we drop the whitelist approach and use a
  // tight BLACKLIST instead: send back virtually everything the GET
  // gave us except a handful of known read-only fields. That's the
  // only way to not drop the one odd-named field the backend wants.
  //
  // AC Infinity's SENSOR mode is driven by (activeHh=1, devHh=67 …)
  // plus atType=2 or 3. To force a hard "off" we also set atType=0
  // (= EIN/AUS tab in the AC app, manual mode) alongside modeType=0,
  // because leaving atType in sensor/timer mode means the controller
  // may re-enable the port on its own even after we requested off.
  const merged: Record<string, unknown> = { ...current };
  if (p.modeType != null) {
    merged.modeType = p.modeType;
    if (p.modeType === 0) {
      merged.atType = 0; // force to manual-off mode
    } else if (p.modeType === 1) {
      merged.atType = 1; // manual-on
    }
  }
  // When turning OFF we leave onSpead alone — toggling off should
  // not rewrite the "when on, run at speed N" preference.
  if (p.speak != null && p.modeType !== 0) {
    merged.onSpead = p.speak;
  }

  // Known read-only fields that come back in the GET response but
  // must not be echoed back on write — these trigger error 100001
  // "parameter error" from AC Infinity's validator.
  const DROP_ON_WRITE = new Set<string>([
    // state & diagnostics
    "abnormalState",
    "errorState",
    "connectionState",
    "fitState",
    // timestamps that are not schedule-relevant
    "createTime",
    "updateTime",
    "endTime",
    "startTime",
    // hardware identity
    "devMacAddr",
    "ipAddr",
    "rssi",
    "serial",
    "devCode",
    "devType",
    // firmware
    "hardwareVersion",
    "softwareVersion",
    "firmwareVersion",
    // sharing / UI flags
    "isShared",
    "isAccept",
    "isDisTempPicker",
    "isDisHumidPicker",
    "generalText",
    "customText",
    // live sensor values that mirror elsewhere — safe to omit on write
    "hTrend",
    "tTrend",
    "vpdTrend",
    "co2Trend",
    "trend",
  ]);

  // Flatten the merged record into a form-encoded body. Only drop
  // nested objects/arrays, booleans → 1/0, nulls skipped so we don't
  // clear schedule times with empty strings.
  const writeBody = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (DROP_ON_WRITE.has(k)) continue;
    if (v == null) continue;
    if (typeof v === "object") continue;
    if (typeof v === "boolean") {
      writeBody.set(k, v ? "1" : "0");
    } else {
      writeBody.set(k, String(v));
    }
  }
  // Hard-set the identifiers so we never miss them (externalPort is
  // the UIS-Pro key, port is the legacy key — belt-and-braces).
  if (!writeBody.has("devId")) writeBody.set("devId", p.devId);
  if (!writeBody.has("externalPort")) writeBody.set("externalPort", String(p.port));
  if (!writeBody.has("port")) writeBody.set("port", String(p.port));

  // 3. Push the merged record back.
  try {
    const upstream = await fetch(`${API_BASE}/api/dev/addDevMode`, {
      method: "POST",
      headers,
      body: writeBody.toString(),
    });
    const text = await upstream.text();
    // Parse to surface AC Infinity error codes with a sensible HTTP status
    try {
      const parsed = JSON.parse(text) as Envelope<unknown>;
      if (parsed.code !== 200) {
        // Also surface the full field map we read + the writeBody so we
        // can diff and spot the offending field in the browser.
        const currentPreview: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(current)) {
          if (typeof v === "object") {
            currentPreview[k] = Array.isArray(v) ? `[array:${v.length}]` : "[object]";
          } else {
            currentPreview[k] = v;
          }
        }
        const writePreview: Record<string, string> = {};
        for (const [k, v] of writeBody.entries()) writePreview[k] = v;
        return json(
          {
            error: "write-settings-failed",
            code: parsed.code,
            msg: parsed.msg ?? "AC Infinity rejected the write",
            attempted: {
              modeType: p.modeType,
              speak: p.speak,
            },
            readFields: Object.keys(current),
            sentFields: Array.from(writeBody.keys()),
            readValues: currentPreview,
            sentValues: writePreview,
            rawFirstBytes: text.slice(0, 400),
          },
          parsed.code === 10000 ? 401 : 502,
        );
      }
      return new Response(text, {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch {
      // Non-JSON upstream — forward raw
      return new Response(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  } catch (e) {
    return json({ error: "upstream-write-exception", detail: String(e) }, 502);
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
