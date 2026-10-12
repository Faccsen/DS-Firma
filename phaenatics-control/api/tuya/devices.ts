// Vercel Edge Function — list all SmartLife devices for a specific uid
// (one of the users linked to the Tuya Cloud Project).

import { tuyaFetch, jsonResponse } from "./_sign";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: {
    region?: string;
    accessId?: string;
    secret?: string;
    accessToken?: string;
    uid?: string;
  };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return jsonResponse({ error: "invalid-json" }, 400);
  }
  if (!p.region || !p.accessId || !p.secret || !p.accessToken || !p.uid) {
    return jsonResponse({ error: "credentials-and-uid-required" }, 400);
  }

  try {
    const { status, data } = await tuyaFetch({
      region: p.region,
      accessId: p.accessId,
      secret: p.secret,
      accessToken: p.accessToken,
      method: "GET",
      path: `/v1.0/users/${encodeURIComponent(p.uid)}/devices`,
    });
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return jsonResponse({ error: "upstream-failed", detail: String(e) }, 502);
  }
}
