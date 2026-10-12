// Client for Tuya OpenAPI (SmartLife devices) via our Vercel proxy that
// handles the HMAC-SHA256 request signing.

export interface TuyaDevice {
  id: string;
  name: string;
  category: string; // "cz" switch, "dj" light, "fs" fan, "jsq" humidifier …
  product_id: string;
  product_name: string;
  online: boolean;
  icon?: string;
  status: Array<{ code: string; value: unknown }>;
}

export interface TuyaUser {
  uid: string;
  nickname: string;
  country_code?: string;
}

export interface TuyaTokenResult {
  access_token: string;
  refresh_token: string;
  expire_time: number; // seconds
  uid?: string;
}

interface Envelope<T> {
  success?: boolean;
  code?: number;
  msg?: string;
  result?: T;
  t?: number;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let parsed: Envelope<T>;
  try {
    parsed = JSON.parse(text) as Envelope<T>;
  } catch {
    throw new Error(`Nicht-JSON Antwort (${resp.status}): ${text.slice(0, 120)}`);
  }
  if (parsed.success === false || (parsed.code !== undefined && parsed.code !== 0 && parsed.code !== 200)) {
    throw new Error(mapTuyaError(parsed.code, parsed.msg));
  }
  return parsed.result as T;
}

export async function tuyaGetToken(args: {
  region: string;
  accessId: string;
  secret: string;
}): Promise<TuyaTokenResult> {
  return call<TuyaTokenResult>("/api/tuya/token", args);
}

export async function tuyaListUsers(args: {
  region: string;
  accessId: string;
  secret: string;
  accessToken: string;
}): Promise<TuyaUser[]> {
  const result = await call<TuyaUser[]>("/api/tuya/users", args);
  return Array.isArray(result) ? result : [];
}

export async function tuyaListDevices(args: {
  region: string;
  accessId: string;
  secret: string;
  accessToken: string;
  uid: string;
}): Promise<TuyaDevice[]> {
  const result = await call<TuyaDevice[]>("/api/tuya/devices", args);
  return Array.isArray(result) ? result : [];
}

export async function tuyaCommand(args: {
  region: string;
  accessId: string;
  secret: string;
  accessToken: string;
  deviceId: string;
  commands: Array<{ code: string; value: unknown }>;
}): Promise<void> {
  await call<unknown>("/api/tuya/command", args);
}

/** Pull on/off from a status array for the common switch_* codes. */
export function tuyaIsOn(dev: TuyaDevice): boolean | undefined {
  for (const s of dev.status) {
    if (/^switch(_1)?$/.test(s.code) || s.code === "on_off") {
      return !!s.value;
    }
    if (s.code === "light_state") return s.value === "on";
  }
  return undefined;
}

/** For dimmable bulbs — pull brightness normalised to 0..100. */
export function tuyaBrightness(dev: TuyaDevice): number | undefined {
  for (const s of dev.status) {
    if (s.code === "bright_value_v2" && typeof s.value === "number") {
      return Math.round((s.value / 1000) * 100);
    }
    if (s.code === "bright_value" && typeof s.value === "number") {
      return Math.round((s.value / 255) * 100);
    }
  }
  return undefined;
}

export type TuyaKind =
  | "fan"
  | "light"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "ac"
  | "pump";

export function tuyaDeviceKind(dev: TuyaDevice): TuyaKind {
  const name = (dev.name + " " + dev.product_name).toLowerCase();
  if (/(befeucht|humidif|verdampfer)/.test(name)) return "humidifier";
  if (/(entfeucht|dehumid)/.test(name)) return "dehumidifier";
  if (/(heizung|heater|wärme)/.test(name)) return "heater";
  if (/(klima|air\s*cond|ac\b)/.test(name)) return "ac";
  if (/(pump|doser|dosier)/.test(name)) return "pump";
  if (/(lüfter|fan|abluft|zuluft|exhaust|intake)/.test(name)) return "fan";
  switch (dev.category) {
    case "dj":
    case "dd":
    case "xdd":
    case "fwl":
    case "fsd":
      return "light";
    case "fs":
    case "fskg":
      return "fan";
    case "jsq":
      return "humidifier";
    case "cs":
    case "qn":
      return "dehumidifier";
    case "rs":
      return "heater";
    case "kt":
      return "ac";
    default:
      return "fan";
  }
}

/** Which status code to use when turning a device on/off. */
export function tuyaSwitchCode(dev: TuyaDevice): string {
  for (const s of dev.status) {
    if (/^switch(_1|_led)?$/.test(s.code)) return s.code;
    if (s.code === "on_off") return s.code;
  }
  // Fallback: most SmartLife switches use switch_1
  return "switch_1";
}

export function tuyaBrightnessCode(dev: TuyaDevice): string {
  for (const s of dev.status) {
    if (s.code === "bright_value_v2") return s.code;
    if (s.code === "bright_value") return s.code;
  }
  return "bright_value_v2";
}

/** Known Tuya error codes with user-friendly German messages. */
function mapTuyaError(code?: number, msg?: string): string {
  const known: Record<number, string> = {
    1004: "Signatur ungültig — prüfe Access ID / Secret / Region.",
    1005: "Access ID ungültig oder Projekt existiert nicht.",
    1006: "Secret ungültig oder abgelaufen.",
    1010: "Token abgelaufen — bitte neu einloggen.",
    1100: "Parameter leer oder ungültig.",
    1106: "Access-Token wird noch nicht akzeptiert, kurz warten.",
    1108: "URL nicht erlaubt für diese Credentials.",
    2007: "SmartLife-Account noch nicht mit dem Projekt verknüpft. In Tuya IoT → Dein Projekt → Devices → \"Link Tuya App Account\" per QR scannen.",
    2008: "SmartLife-Benutzer-ID nicht gefunden.",
    28841105: "Berechtigung nicht erteilt — in Tuya IoT → Service API prüfen ob \"IoT Core\" aktiviert ist.",
  };
  if (code && known[code]) return known[code];
  return `Tuya Fehler ${code ?? "?"}${msg ? ` — ${msg}` : ""}`;
}
