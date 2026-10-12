// Vercel Edge Function — list all SmartLife-app users linked to the Tuya
// Cloud Project. We call this right after login so the user doesn't have
// to copy their uid from the Tuya console by hand.

import { tuyaFetch, jsonResponse } from "./_sign";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: { region?: string; accessId?: string; secret?: string; accessToken?: string };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return jsonResponse({ error: "invalid-json" }, 400);
  }
  if (!p.region || !p.accessId || !p.secret || !p.accessToken) {
    return jsonResponse({ error: "credentials-required" }, 400);
  }

  try {
    const { status, data } = await tuyaFetch({
      region: p.region,
      accessId: p.accessId,
      secret: p.secret,
      accessToken: p.accessToken,
      method: "GET",
      path: "/v1.0/iot-01/associated-users?page_size=100",
    });
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return jsonResponse({ error: "upstream-failed", detail: String(e) }, 502);
  }
}
