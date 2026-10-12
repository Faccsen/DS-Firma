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
  //    AC Infinity uses `onSpead` (sic — misspelling preserved from
  //    their API) for the "manual on" speed. The port-list `speak`
  //    we received is just the live mirror of that same field.
  const merged: Record<string, unknown> = { ...current };
  if (p.modeType != null) {
    merged.modeType = p.modeType;
  }
  if (p.speak != null) {
    merged.onSpead = p.speak;
    // Some firmwares also look at `speak` directly on write; set both.
    merged.speak = p.speak;
  }

  // Flatten the merged object into form-encoded body. Skip nulls because
  // the AC Infinity backend treats empty strings as "clear this field"
  // which can wipe schedules.
  const writeBody = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v == null) continue;
    if (typeof v === "object") continue; // nested arrays are set via other endpoints
    writeBody.set(k, String(v));
  }
  // Just in case these weren't in the GET response (rare on old firmware):
  if (!writeBody.has("devId")) writeBody.set("devId", p.devId);
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
        return json(
          {
            error: "write-settings-failed",
            code: parsed.code,
            msg: parsed.msg ?? "AC Infinity rejected the write",
            sentFields: Object.keys(merged),
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
