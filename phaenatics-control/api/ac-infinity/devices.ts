// Vercel Edge Function — list all AC Infinity devices and ports for the
// authenticated user. Takes {userId, token} in the body, forwards to the
// UIS cloud, returns JSON. Includes current sensor readings and the port
// (plug) list with their names, speak levels, mode types, etc.

export const config = { runtime: "edge" };

const API_BASE = "http://www.acinfinityserver.com";
const UA = "ACController/1.8.2 (iPhone; iOS 14.4; Scale/3.00)";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let payload: { userId?: string; token?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return json({ error: "invalid-json" }, 400);
  }
  if (!payload.userId || !payload.token) {
    return json({ error: "userId-and-token-required" }, 400);
  }

  try {
    const upstream = await fetch(`${API_BASE}/api/user/devInfoListAll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        token: payload.token,
      },
      body: new URLSearchParams({ userId: payload.userId }).toString(),
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
