// Vercel Edge Function — set a port's state on an AC Infinity controller.
// Body: {userId, token, devId, port, modeType, speak}
//   modeType: 0 = off, 1 = on/manual, 2 = auto, 3 = schedule, …
//   speak: 0–10 (fan level) or 0–100 depending on device
// This proxies the mobile-app endpoint used when you move a port's slider
// or toggle it. Keeps the exact field spelling the AC Infinity backend
// expects.

export const config = { runtime: "edge" };

const API_BASE = "http://www.acinfinityserver.com";
const UA = "ACController/1.8.2 (iPhone; iOS 14.4; Scale/3.00)";

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

  const body = new URLSearchParams();
  body.set("userId", p.userId);
  body.set("devId", p.devId);
  body.set("port", String(p.port));
  if (p.modeType != null) body.set("modeType", String(p.modeType));
  if (p.speak != null) body.set("speak", String(p.speak));

  try {
    const upstream = await fetch(`${API_BASE}/api/dev/addDevMode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        token: p.token,
      },
      body: body.toString(),
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
