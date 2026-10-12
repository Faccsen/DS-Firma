// Vercel Edge Function — send a passthrough command to a specific
// TP-Link / Tapo device. The `request` field is the full JSON command
// understood by the device firmware, e.g.
//   {"system":{"set_relay_state":{"state":1}}}     — switch on (Kasa)
//   {"system":{"get_sysinfo":{}}}                   — read status
//   {"emeter":{"get_realtime":{}}}                  — energy monitor (P110/HS110)
//
// The proxy wraps it as:
//   {"method":"passthrough","params":{"deviceId":X,"requestData":"<json>"}}

export const config = { runtime: "edge" };

const DEFAULT_HOST = "https://wap.tplinkcloud.com";
const UA = "Tapo CameraClient Android";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: {
    token?: string;
    deviceId?: string;
    request?: unknown;
    appServerUrl?: string;
  };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return json({ error: "invalid-json" }, 400);
  }
  if (!p.token || !p.deviceId || p.request === undefined) {
    return json({ error: "missing-required-fields" }, 400);
  }

  const host = p.appServerUrl || DEFAULT_HOST;
  const url = `${host}?token=${encodeURIComponent(p.token)}`;

  const body = {
    method: "passthrough",
    params: {
      deviceId: p.deviceId,
      requestData: JSON.stringify(p.request),
    },
  };

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": UA,
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return json({ error: "upstream-failed", detail: String(e) }, 502);
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
