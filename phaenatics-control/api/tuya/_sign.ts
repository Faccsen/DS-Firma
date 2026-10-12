// Shared HMAC-SHA256 signing helpers for Tuya OpenAPI.
// Tuya requires signed requests even over HTTPS. The algorithm is:
//
//   sign = HMAC-SHA256(client_id + [access_token] + t + nonce + strToHash, secret)
//     where strToHash = method + "\n" + sha256(body or "") + "\n" + signedHeaders + "\n" + urlPath
//
// Business endpoints include access_token in the prefix, the token endpoint
// itself does not. Signature is uppercase hex.

export const TUYA_HOSTS: Record<string, string> = {
  eu: "https://openapi.tuyaeu.com",
  us: "https://openapi.tuyaus.com",
  "us-east": "https://openapi-ueaz.tuyaus.com",
  cn: "https://openapi.tuyacn.com",
  in: "https://openapi.tuyain.com",
};

export function tuyaBase(region: string): string {
  return TUYA_HOSTS[region] ?? TUYA_HOSTS.eu;
}

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const h = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return Array.from(new Uint8Array(h))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface TuyaRequest {
  region: string;
  accessId: string;
  secret: string;
  accessToken?: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // includes query string
  body?: unknown;
}

export async function tuyaFetch(
  r: TuyaRequest,
): Promise<{ status: number; data: unknown; raw: string }> {
  const t = Date.now().toString();
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const bodyStr = r.body !== undefined ? JSON.stringify(r.body) : "";
  const contentHash = await sha256Hex(bodyStr);
  const strToHash = `${r.method}\n${contentHash}\n\n${r.path}`;
  const strToSign = r.accessToken
    ? `${r.accessId}${r.accessToken}${t}${nonce}${strToHash}`
    : `${r.accessId}${t}${nonce}${strToHash}`;
  const sign = await hmacSha256Hex(r.secret, strToSign);

  const url = `${tuyaBase(r.region)}${r.path}`;
  const headers: Record<string, string> = {
    client_id: r.accessId,
    sign,
    sign_method: "HMAC-SHA256",
    t,
    nonce,
    "Content-Type": "application/json",
  };
  if (r.accessToken) headers.access_token = r.accessToken;

  const resp = await fetch(url, {
    method: r.method,
    headers,
    body: r.method === "GET" || r.method === "DELETE" ? undefined : bodyStr,
  });
  const raw = await resp.text();
  let data: unknown = raw;
  try {
    data = JSON.parse(raw);
  } catch {
    /* keep as string */
  }
  return { status: resp.status, data, raw };
}

export function jsonResponse(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
