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

/**
 * Modern AC Infinity controllers (devType ≥ 20) expose a `sensors` array
 * where each entry has a type, an access port and a raw value with its
 * own precision. This is the ground truth; the top-level temperature /
 * humidity / vpdnums fields on these controllers are a mirror of the
 * SECONDARY (external) probe for backwards compat.
 *
 * Known sensor types (verified against live devType 20 payload):
 *   1 = Temperature °C   (INNEN — fan-mounted smart probe)
 *   2 = Humidity %       (INNEN)
 *   3 = VPD kPa          (INNEN)
 *   5 = Temperature °C   (AUSSEN — dedicated controller probe)
 *   6 = Humidity %       (AUSSEN)
 *   7 = VPD kPa          (AUSSEN)
 */
export interface AcSensor {
  sensorType: number;
  sensorUnit: number;
  /** How many digits are packed as integer. 3 → ÷100, 2 → ÷10, 1 → raw. */
  sensorPrecision: number;
  sensorTrend: number;
  accessPort: number;
  sensorData: number;
  sensorKey?: string;
}

export interface AcController {
  devId: string;
  devName: string;
  devType: number;
  deviceInfo: {
    temperature?: number; // raw ints — mirrors AUSSEN probe on new firmware
    humidity?: number;
    vpdnums?: number;
    co2?: number;
    sensors?: AcSensor[];
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
 * controller model and firmware. Autoscale by dividing by 10 until the
 * value falls below a reasonable physical cutoff.
 */
function autoScale(v: number | undefined, cutoff: number): number | undefined {
  if (v == null) return undefined;
  let n = v;
  for (let i = 0; i < 4 && n > cutoff; i++) n /= 10;
  return +n.toFixed(2);
}

/** Decode one sensor entry's `sensorData` using its own precision field. */
function decodeSensor(s: AcSensor | undefined): number | undefined {
  if (!s) return undefined;
  const divisor = Math.pow(10, Math.max(0, s.sensorPrecision - 1));
  return +(s.sensorData / divisor).toFixed(2);
}

/**
 * Return INNEN (primary / tent interior) and AUSSEN (secondary / external)
 * sensor readings. Prefers the `sensors[]` array (modern firmware), falls
 * back to top-level fields for older controllers that don't ship it.
 */
export function parseSensors(d: AcController["deviceInfo"]) {
  const sensors = d.sensors ?? [];
  const find = (type: number) => sensors.find((s) => s.sensorType === type);

  // Modern path: sensors array
  const innenTemp = decodeSensor(find(1));
  const innenHum = decodeSensor(find(2));
  const innenVpd = decodeSensor(find(3));
  const aussenTemp = decodeSensor(find(5));
  const aussenHum = decodeSensor(find(6));
  const aussenVpd = decodeSensor(find(7));
  const co2FromArr = decodeSensor(find(4)); // observed on CO2-equipped controllers

  // Legacy fallback: top-level fields. Important: on newer firmware the
  // top-level `temperature/humidity/vpdnums` MIRROR the AUSSEN probe
  // (sensorType 5/6/7), so if the sensors array gave us INNEN we must
  // NOT also use top-level as INNEN (that was the "swapped" bug).
  return {
    temp: innenTemp ?? autoScale(d.temperature, 60),
    humidity: innenHum ?? autoScale(d.humidity, 110),
    vpd: innenVpd ?? autoScale(d.vpdnums, 6),
    co2: co2FromArr ?? autoScale(d.co2, 3000),
    outTemp: aussenTemp ?? (innenTemp != null ? autoScale(d.temperature, 60) : undefined),
    outHumidity: aussenHum ?? (innenHum != null ? autoScale(d.humidity, 110) : undefined),
    outVpd: aussenVpd ?? (innenVpd != null ? autoScale(d.vpdnums, 6) : undefined),
  };
}

type Kind =
  | "fan"
  | "intake"
  | "exhaust"
  | "light"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "ac"
  | "co2"
  | "pump";

/**
 * Guess a Phaenatics device type for an AC Infinity port.
 *
 * In practice `loadType` is usually `0` because AC Infinity does not
 * auto-detect what's plugged into a port — the user labels it in the app
 * ("ABLUFT", "Heizung Links", "Befeuchter"). So the port's human name is
 * the far better signal. We fall back to the loadType enum and finally to
 * a generic "fan" if nothing matches.
 */
export function portDeviceKind(opts: { loadType: number; portName?: string }): Kind {
  const name = (opts.portName ?? "").toLowerCase().trim();

  // Name-based patterns — ordered most-specific first
  if (/\b(abluft|exhaust|ablass)\b/.test(name)) return "exhaust";
  if (/\b(zuluft|intake|frischluft)\b/.test(name)) return "intake";
  if (/(dehumid|entfeucht|trockner)/.test(name)) return "dehumidifier";
  if (/(humid|befeucht|verdampfer)/.test(name)) return "humidifier";
  if (/\b(heiz|heater|wärme|warm)\w*/.test(name)) return "heater";
  if (/\b(licht|lampe|light|led|hps|cmh)\b/.test(name)) return "light";
  if (/(klima|ac\b|air\s*cond|split)/.test(name)) return "ac";
  if (/(co2|co₂)/.test(name)) return "co2";
  if (/(pump|doser|dosier|peristalt)/.test(name)) return "pump";
  if (/(fan|lüfter|lufter|clip|oscil|circ)/.test(name)) return "fan";

  // Fallback to loadType enum (observed from older firmware)
  switch (opts.loadType) {
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

/** @deprecated use portDeviceKind — kept for backwards compat */
export function loadTypeToDeviceKind(loadType: number): Kind {
  return portDeviceKind({ loadType });
}
