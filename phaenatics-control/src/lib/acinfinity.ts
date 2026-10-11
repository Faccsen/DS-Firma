// Client for AC Infinity cloud API via our Vercel serverless proxy.
// All requests go to /api/ac-infinity/* which forward to AC Infinity's
// reverse-engineered mobile-app endpoints.

export interface AcLoginResult {
  userId: string;
  token: string;
  nickname?: string;
}

export interface AcPort {
  port: number;
  portName: string;
  speak: number;
  modeType: number; // 0 off, 1 on, 2 auto, 3 schedule…
  loadType: number; // device kind id reported by UIS
  loadState: number; // 0 off / 1 on
}

export interface AcController {
  devId: string;
  devName: string;
  devType: number;
  deviceInfo: {
    temperature?: number; // tenths of °C
    humidity?: number; // tenths of %
    vpdnums?: number; // tenths of kPa
    co2?: number;
    /** Secondary (outdoor / second-probe) sensors */
    outTemperature?: number;
    outHumidity?: number;
    outVpdnums?: number;
    /** Online timestamp */
    offlineTime?: string;
    updateTime?: string;
    ports?: AcPort[];
  };
}

interface Envelope<T> {
  code: number;
  msg?: string;
  data?: T;
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
  if (typeof parsed === "object" && parsed !== null && "code" in parsed) {
    const env = parsed as Envelope<T>;
    if (env.code !== 200) {
      throw new Error(env.msg || `API-Fehler Code ${env.code}`);
    }
    return env.data as T;
  }
  return parsed as T;
}

export async function acLogin(email: string, password: string): Promise<AcLoginResult> {
  // AC Infinity has shipped multiple field spellings for the login payload
  // across firmware/app versions. Accept any of the known names so we don't
  // break the first time they rename something.
  type LoginData = Record<string, unknown>;
  const data = (await post<LoginData>("/api/ac-infinity/login", { email, password })) ?? {};

  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.length > 0 ? v : typeof v === "number" ? String(v) : undefined;

  const userId =
    str(data.appId) ??
    str(data.userId) ??
    str(data.id) ??
    str((data.user as Record<string, unknown> | undefined)?.appId);

  // AC Infinity's cloud returns ONLY appId — no separate auth token.
  // The user's own mobile app uses appId as the auth value for every
  // subsequent request. If a future API version does add a token field,
  // we prefer that; otherwise fall back to appId.
  const token =
    str(data.loginAuthToken) ??
    str(data.appIdLogin) ??
    str(data.token) ??
    str(data.authToken) ??
    str(data.auth) ??
    str((data.user as Record<string, unknown> | undefined)?.loginAuthToken) ??
    userId;

  const nickname =
    str(data.nickName) ??
    str(data.nickname) ??
    str(data.userName) ??
    str(data.name) ??
    str((data.user as Record<string, unknown> | undefined)?.nickName) ??
    str((data.user as Record<string, unknown> | undefined)?.nickname);

  if (!userId) {
    const keys = Object.keys(data).slice(0, 15).join(", ");
    throw new Error(
      `Login-Antwort ohne userId. Felder: {${keys || "leer"}}. Melde das kurz zurück.`,
    );
  }
  return { userId, token: token!, nickname };
}

export async function acListDevices(
  userId: string,
  token: string,
): Promise<AcController[]> {
  const data = await post<AcController[]>("/api/ac-infinity/devices", { userId, token });
  return Array.isArray(data) ? data : [];
}

export async function acSetPort(args: {
  userId: string;
  token: string;
  devId: string;
  port: number;
  modeType?: number;
  speak?: number;
}): Promise<void> {
  await post<unknown>("/api/ac-infinity/set-port", args);
}

/**
 * AC Infinity reports sensor values at different precisions depending on
 * controller model and firmware (tenths, hundredths, sometimes thousandths).
 * Instead of hard-coding one divisor, autoscale by dividing by 10 until the
 * value falls below a reasonable physical cutoff for that metric.
 */
function autoScale(v: number | undefined, cutoff: number): number | undefined {
  if (v == null) return undefined;
  let n = v;
  // guard: at most 4 divisions to prevent infinite loops on bogus data
  for (let i = 0; i < 4 && n > cutoff; i++) n /= 10;
  return +n.toFixed(2);
}

export function parseSensors(d: AcController["deviceInfo"]) {
  return {
    temp: autoScale(d.temperature, 60), // °C, grow range ~15-40
    humidity: autoScale(d.humidity, 110), // %
    vpd: autoScale(d.vpdnums, 6), // kPa, max realistic ~5
    co2: autoScale(d.co2, 3000), // ppm
    outTemp: autoScale(d.outTemperature, 60),
    outHumidity: autoScale(d.outHumidity, 110),
    outVpd: autoScale(d.outVpdnums, 6),
  };
}

/** Map AC Infinity port loadType to our DeviceType. Best-effort guesses. */
export function loadTypeToDeviceKind(
  loadType: number,
): "fan" | "intake" | "exhaust" | "light" | "humidifier" | "dehumidifier" | "heater" | "ac" | "co2" | "pump" {
  // AC Infinity's load types are not fully documented. These are observed
  // mappings from the reverse-engineered API; unknowns fall back to "fan".
  switch (loadType) {
    case 1:
      return "intake";
    case 2:
      return "exhaust";
    case 3:
      return "light";
    case 4:
      return "humidifier";
    case 5:
      return "dehumidifier";
    case 6:
      return "heater";
    case 7:
      return "ac";
    case 8:
      return "co2";
    case 9:
      return "fan";
    default:
      return "fan";
  }
}
