// Vercel Edge Function — exchange Tuya Developer Access ID + Secret for an
// access_token. The user does this once after setting up a Cloud Project at
// iot.tuya.com and linking their SmartLife account via QR code.

import { tuyaFetch, jsonResponse } from "./_sign";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: { region?: string; accessId?: string; secret?: string };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return jsonResponse({ error: "invalid-json" }, 400);
  }
  if (!p.region || !p.accessId || !p.secret) {
    return jsonResponse({ error: "region-accessId-secret-required" }, 400);
  }

  try {
    const { status, data } = await tuyaFetch({
      region: p.region,
      accessId: p.accessId,
      secret: p.secret,
      method: "GET",
      path: "/v1.0/token?grant_type=1",
    });
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return jsonResponse({ error: "upstream-failed", detail: String(e) }, 502);
  }
}
