// Vercel Edge Function — list all TP-Link / Tapo devices registered on
// the user's account. Takes {token, appServerUrl?} and returns the
// upstream JSON verbatim.

export const config = { runtime: "edge" };

const DEFAULT_HOST = "https://wap.tplinkcloud.com";
const UA = "Tapo CameraClient Android";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let payload: { token?: string; appServerUrl?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return json({ error: "invalid-json" }, 400);
  }
  if (!payload.token) return json({ error: "token-required" }, 400);

  const host = payload.appServerUrl || DEFAULT_HOST;
  const url = `${host}?token=${encodeURIComponent(payload.token)}`;

  const body = {
    method: "getDeviceList",
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
