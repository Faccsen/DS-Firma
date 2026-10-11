// Vercel Edge Function — proxy for AC Infinity cloud login.
// Browsers cannot reach the AC Infinity cloud directly (no CORS); this
// serverless proxy accepts {email, password} from the app, forwards to
// AC Infinity's reverse-engineered mobile-app endpoint, and returns the
// JSON verbatim (including the loginAuthToken on success).
//
// This is the SAME endpoint the official UIS mobile app uses; it is not
// a documented public API, so field names (incl. "appPasswordl" with the
// trailing L) are intentional and match AC Infinity's spelling.

export const config = { runtime: "edge" };

const API_BASE = "http://www.acinfinityserver.com";
const UA = "ACController/1.8.2 (iPhone; iOS 14.4; Scale/3.00)";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let payload: { email?: string; password?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return json({ error: "invalid-json" }, 400);
  }
  const email = payload.email?.trim();
  const password = payload.password;
  if (!email || !password) {
    return json({ error: "email-and-password-required" }, 400);
  }

  try {
    const upstream = await fetch(`${API_BASE}/api/user/appUserLogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      body: new URLSearchParams({ appEmail: email, appPasswordl: password }).toString(),
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
