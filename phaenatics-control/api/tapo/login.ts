// Vercel Edge Function — proxy for TP-Link / Tapo Cloud login.
// Browsers cannot reach the TP-Link cloud directly (CORS); this
// serverless proxy accepts {email, password} from the app and forwards
// to TP-Link's reverse-engineered mobile-app endpoint.
//
// Works for both legacy Kasa HS* and modern Tapo devices registered on
// the same TP-Link account (Tapo app shares TP-Link ID credentials).

export const config = { runtime: "edge" };

const UA = "Tapo CameraClient Android";
const DEFAULT_HOST = "https://wap.tplinkcloud.com";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let payload: { email?: string; password?: string; region?: string };
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

  // Random UUID — identifies this "terminal" to the cloud. Required.
  const terminalUUID = crypto.randomUUID();
  const host = selectHost(payload.region);

  const body = {
    method: "login",
    params: {
      appType: "Tapo_Android",
      cloudUserName: email,
      cloudPassword: password,
      terminalUUID,
    },
  };

  try {
    const upstream = await fetch(host, {
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

function selectHost(region?: string): string {
  // TP-Link runs regional cloud endpoints. Pass region if the global
  // endpoint ever starts rejecting Tapo logins for a user.
  if (region === "us") return "https://use1-wap.tplinkcloud.com";
  if (region === "eu") return "https://eu-wap.tplinkcloud.com";
  return DEFAULT_HOST;
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
