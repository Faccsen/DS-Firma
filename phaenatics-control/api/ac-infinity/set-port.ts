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
  //    AC Infinity uses `onSpead` (sic — their misspelling of "on
  //    speed") for the manual-on target. The port-list `speak` is
  //    just the live mirror of the same field — do NOT send it as an
  //    extra key.
  const merged: Record<string, unknown> = { ...current };
  if (p.modeType != null) {
    merged.modeType = p.modeType;
  }
  // When turning OFF (modeType=0) we leave onSpead alone — turning
  // off shouldn't rewrite the "when on, run at speed N" preference.
  if (p.speak != null && p.modeType !== 0) {
    merged.onSpead = p.speak;
  }

  // Whitelist of fields the AC-Infinity /api/dev/addDevMode validator
  // actually accepts. The GET response includes ~120 fields but most
  // are read-only metadata or firmware internals — echoing them back
  // triggers error 100001 "parameter error". This list follows the
  // HomeAssistant community integration's known-settable set, plus
  // the UIS-Pro additions (activeTypeV2, onlyUpdateSpeed, settingMode,
  // externalPort). Extend it as new fields prove settable.
  const ALLOWED_WRITE_KEYS = new Set<string>([
    // identifiers
    "modeSetid",
    "devId",
    "port",
    "externalPort",
    // mode + base speeds
    "modeType",
    "atType",
    "onSpead",
    "offSpead",
    "onlyUpdateSpeed",
    // timer / cycle
    "activeTimerOn",
    "activeTimerOff",
    "activeCycleOn",
    "activeCycleOff",
    // schedule (note AC Infinity's "Endt" typo in the field name)
    "schedStartTime",
    "schedEndtTime",
    // humidity triggers
    "devHs",
    "devHl",
    "devHhSpead",
    "devHlSpead",
    "humidityHighEnable",
    "humidityLowEnable",
    "autoHumidityHigh",
    "autoHumidityLow",
    "autoHumidityHighTrigger",
    "autoHumidityLowTrigger",
    // temperature triggers
    "devTh",
    "devTl",
    "devThSpead",
    "devTlSpead",
    "tempHighEnable",
    "tempLowEnable",
    "autoTempHigh",
    "autoTempLow",
    "autoTempHighTrigger",
    "autoTempLowTrigger",
    "tempUnit",
    // vpd triggers
    "devVpdHigh",
    "devVpdLow",
    "devVpdHighSpead",
    "devVpdLowSpead",
    "vpdHighEnable",
    "vpdLowEnable",
    "vpdHighTrigger",
    "vpdLowTrigger",
    "vpdSettingMode",
    "vpdTargetHigh",
    "vpdTargetLow",
    // co2 triggers
    "devCh",
    "devCl",
    "devChSpead",
    "devClSpead",
    "co2HighEnable",
    "co2LowEnable",
    "co2HighTrigger",
    "co2LowTrigger",
    "co2TargetHigh",
    "co2TargetLow",
    "co2SettingMode",
    // targets (shared)
    "targetTSwitch",
    "targetHumiSwitch",
    "targetVpdSwitch",
    "targetTemp",
    "targetHumi",
    "targetVpd",
    // buffer / transition (Puffer/Übergang in the AC app)
    "fitMode",
    "tempFitValue",
    "humFitValue",
    "vpdFitValue",
    "tempSurplus",
    "humSurplus",
    "vpdSurplus",
    "surplus",
    // runtime caps (Min/Max EIN-Dauer)
    "atMin",
    "atMax",
    // trend compare
    "trend",
    // UIS Pro additions
    "activeTypeV2",
    "settingMode",
    "triggerMode",
    // misc small flags that look settable
    "masterPort",
    "nextTime",
  ]);

  // Flatten the merged object into form-encoded body. Only known-good
  // keys. Convert booleans → 1/0 (AC Infinity rejects "true"/"false"
  // strings). Skip nulls to avoid clearing fields.
  const writeBody = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (!ALLOWED_WRITE_KEYS.has(k)) continue;
    if (v == null) continue;
    if (typeof v === "object") continue;
    if (typeof v === "boolean") {
      writeBody.set(k, v ? "1" : "0");
    } else {
      writeBody.set(k, String(v));
    }
  }
  // Hard-set the identifiers so we never miss them.
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
