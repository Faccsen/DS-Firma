// Vercel Edge Function — send a command to a SmartLife device.
// Body format: {code: string, value: unknown} — e.g.
//   {"code": "switch_1", "value": true}      — turn on relay 1
//   {"code": "bright_value_v2", "value": 500} — set brightness (0..1000)

import { tuyaFetch, jsonResponse } from "./_sign";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let p: {
    region?: string;
    accessId?: string;
    secret?: string;
    accessToken?: string;
    deviceId?: string;
    commands?: Array<{ code: string; value: unknown }>;
  };
  try {
    p = (await req.json()) as typeof p;
  } catch {
    return jsonResponse({ error: "invalid-json" }, 400);
  }
  if (!p.region || !p.accessId || !p.secret || !p.accessToken || !p.deviceId || !p.commands) {
    return jsonResponse({ error: "missing-fields" }, 400);
  }

  try {
    const { status, data } = await tuyaFetch({
      region: p.region,
      accessId: p.accessId,
      secret: p.secret,
      accessToken: p.accessToken,
      method: "POST",
      path: `/v1.0/devices/${encodeURIComponent(p.deviceId)}/commands`,
      body: { commands: p.commands },
    });
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return jsonResponse({ error: "upstream-failed", detail: String(e) }, 502);
  }
}
