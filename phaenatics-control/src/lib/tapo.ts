// Client for TP-Link Tapo cloud via our Vercel serverless proxy.
// Browser → /api/tapo/* → TP-Link Cloud (wap.tplinkcloud.com).

export interface TapoLoginResult {
  token: string;
  accountId: string;
  email?: string;
}

export interface TapoDevice {
  deviceId: string;
  deviceType: string; // "IOT.SMARTPLUGSWITCH" / "IOT.IPCAMERA" / "SMART.TAPOPLUG" etc.
  deviceModel: string; // "P110(EU)" "L510E" "HS110(UK)" "P100" ...
  deviceMac: string;
  alias: string; // Base64-encoded display name
  appServerUrl: string;
  deviceHwVer: string;
  fwVer: string;
  status: number; // 1 = online
  role?: number;
}

interface Envelope<T> {
  error_code: number;
  msg?: string;
  result?: T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let parsed: Envelope<T> | T;
  try {
    parsed = JSON.parse(text) as Envelope<T> | T;
  } catch {
    throw new Error(`Nicht-JSON Antwort (${resp.status}): ${text.slice(0, 120)}`);
  }
  if (typeof parsed === "object" && parsed !== null && "error_code" in parsed) {
    const env = parsed as Envelope<T>;
    if (env.error_code !== 0) {
      throw new Error(mapTapoError(env.error_code, env.msg));
    }
    return env.result as T;
  }
  return parsed as T;
}

export async function tapoLogin(
  email: string,
  password: string,
): Promise<TapoLoginResult> {
  type LoginData = {
    token: string;
    accountId: string;
    email?: string;
  };
  const data = await post<LoginData>("/api/tapo/login", { email, password });
  if (!data?.token) {
    throw new Error("Login-Antwort ohne Token.");
  }
  return { token: data.token, accountId: data.accountId, email: data.email };
}

export async function tapoListDevices(token: string): Promise<TapoDevice[]> {
  const data = await post<{ deviceList: TapoDevice[] }>("/api/tapo/devices", { token });
  return Array.isArray(data?.deviceList) ? data.deviceList : [];
}

/** Decode the Base64-encoded `alias` field into a human-readable name. */
export function tapoAlias(d: TapoDevice): string {
  try {
    // The alias is Base64 UTF-8
    const bin = atob(d.alias);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return d.alias;
  }
}

/** Set relay on/off for a Kasa-style plug (also works for most Tapo plugs via compat). */
export async function tapoSetRelay(
  token: string,
  device: TapoDevice,
  on: boolean,
): Promise<void> {
  await post<unknown>("/api/tapo/command", {
    token,
    deviceId: device.deviceId,
    appServerUrl: device.appServerUrl,
    request: { system: { set_relay_state: { state: on ? 1 : 0 } } },
  });
}

/** Set brightness (0..100) for Tapo bulbs L510/L520/L530. */
export async function tapoSetBrightness(
  token: string,
  device: TapoDevice,
  brightness: number,
): Promise<void> {
  const b = Math.max(0, Math.min(100, Math.round(brightness)));
  await post<unknown>("/api/tapo/command", {
    token,
    deviceId: device.deviceId,
    appServerUrl: device.appServerUrl,
    request: {
      "smartlife.iot.smartbulb.lightingservice": {
        transition_light_state: { ignore_default: 1, on_off: b > 0 ? 1 : 0, brightness: b },
      },
    },
  });
}

export interface TapoStatus {
  on?: boolean;
  rssi?: number;
  alias?: string;
  brightness?: number;
  powerMw?: number; // instant power in milliwatts
  energyTotalWh?: number;
}

/** Fetch current state. For P110/HS110 also fetches realtime energy. */
export async function tapoGetStatus(
  token: string,
  device: TapoDevice,
): Promise<TapoStatus> {
  type Sysinfo = {
    system?: { get_sysinfo?: { relay_state?: number; alias?: string; rssi?: number; brightness?: number; light_state?: { on_off?: number; brightness?: number } } };
    emeter?: { get_realtime?: { power_mw?: number; total_wh?: number; voltage_mv?: number } };
  };
  const data = await post<Sysinfo>("/api/tapo/command", {
    token,
    deviceId: device.deviceId,
    appServerUrl: device.appServerUrl,
    request: {
      system: { get_sysinfo: {} },
      emeter: { get_realtime: {} },
    },
  });
  const sys = data?.system?.get_sysinfo;
  const em = data?.emeter?.get_realtime;
  return {
    on:
      sys?.relay_state !== undefined
        ? sys.relay_state === 1
        : sys?.light_state?.on_off === 1,
    rssi: sys?.rssi,
    alias: sys?.alias,
    brightness: sys?.brightness ?? sys?.light_state?.brightness,
    powerMw: em?.power_mw,
    energyTotalWh: em?.total_wh,
  };
}

/** Map TP-Link's deviceModel/deviceType to a Phaenatics DeviceType. */
export function tapoDeviceKind(
  dev: TapoDevice,
): "fan" | "light" | "humidifier" | "dehumidifier" | "heater" | "ac" | "pump" {
  const model = dev.deviceModel.toUpperCase();
  const type = dev.deviceType.toUpperCase();
  if (/^L\d/.test(model) || type.includes("BULB")) return "light";
  const name = (tapoAlias(dev) + " " + model).toLowerCase();
  if (/(befeucht|humid|verdampfer)/.test(name)) return "humidifier";
  if (/(entfeucht|dehumid)/.test(name)) return "dehumidifier";
  if (/(heizung|heater|wärme)/.test(name)) return "heater";
  if (/(klima|air\s*cond)/.test(name)) return "ac";
  if (/(pump|doser)/.test(name)) return "pump";
  if (/(lüfter|lufter|fan|abluft|zuluft|exhaust|intake)/.test(name)) return "fan";
  return "fan";
}

/** True when the device model exposes an energy meter (power/total). */
export function tapoHasEnergy(dev: TapoDevice): boolean {
  const m = dev.deviceModel.toUpperCase();
  // P110/P115 (Tapo) and HS110/HS300 (Kasa) have an energy monitor
  return /^P11|^HS110|^HS300|^KP115|^KP125/.test(m);
}

function mapTapoError(code: number, msg?: string): string {
  // Known codes from the reverse-engineered API
  const known: Record<number, string> = {
    [-20601]: "Falscher Benutzername oder Passwort",
    [-20651]: "Konto gesperrt (zu viele Versuche)",
    [-20671]: "Konto nicht aktiviert",
    [-20100]: "Session abgelaufen — bitte neu einloggen",
    [-20571]: "Gerät offline",
    [-20013]: "Berechtigt — Account/Device-Mismatch",
  };
  return known[code] ?? `TP-Link Fehler ${code}${msg ? ` — ${msg}` : ""}`;
}
