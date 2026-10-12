// Device-pairing state. Each pairing carries a `source` so the store can
// route reads and writes to the right backend. Multiple backends can be
// active at the same time — the user picks per device / per room which
// backend to use. Credentials never leave this device.

export type ConnectionSource = "acinfinity" | "tapo" | "tuya";

export interface AcCredentials {
  email: string;
  token: string;
  userId: string;
  nickname?: string;
  connectedAt: number;
}

export interface TapoCredentials {
  email: string;
  token: string;
  accountId: string;
  connectedAt: number;
}

export interface TuyaCredentials {
  region: "eu" | "us" | "us-east" | "cn" | "in";
  accessId: string;
  secret: string;
  /** Access token obtained via /v1.0/token?grant_type=1. Short-lived. */
  accessToken: string;
  refreshToken?: string;
  /** SmartLife user id (linked to the Tuya Cloud Project). */
  uid: string;
  uidNickname?: string;
  expiresAt: number;
  connectedAt: number;
}

export interface DevicePairing {
  source: ConnectionSource;
  /** Phaenatics app Device.id */
  appDeviceId: string;
  /** Phaenatics Room.id — denormalised for faster look-up */
  roomId: string;
  // AC Infinity target
  acDevId?: string;
  acPort?: number;
  // TP-Link Tapo target
  tapoDeviceId?: string;
  tapoAppServerUrl?: string;
  // Tuya (SmartLife) target
  tuyaDeviceId?: string;
}

export interface RoomSensorPairing {
  source: ConnectionSource;
  /** Phaenatics Room.id */
  roomId: string;
  // AC Infinity: single controller supplies all 4 sensors
  acDevId?: string;
}

export interface ConnectionConfig {
  /** Primary mode shown in UI chips. "mixed" when ≥2 backends are set up. */
  mode: "sim" | "acinfinity" | "tapo" | "tuya" | "mixed";
  ac?: AcCredentials;
  tapo?: TapoCredentials;
  tuya?: TuyaCredentials;
  pairings: DevicePairing[];
  roomSensors: RoomSensorPairing[];
  pollingSec: number;
}

const KEY = "phaenatics-connection-v3";

export function loadConnection(): ConnectionConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Migrate from v2 if present
      const v2 = localStorage.getItem("phaenatics-connection-v2");
      if (v2) {
        try {
          const old = JSON.parse(v2) as {
            mode?: string;
            ac?: AcCredentials;
            tapo?: TapoCredentials;
            tuya?: TuyaCredentials;
            pairings?: Array<Record<string, unknown>>;
            roomSensors?: Array<Record<string, unknown>>;
            pollingSec?: number;
          };
          const mode =
            old.mode === "acinfinity" || old.mode === "tapo" || old.mode === "tuya" || old.mode === "mixed"
              ? (old.mode as ConnectionConfig["mode"])
              : "sim";
          return {
            mode,
            ac: old.ac,
            tapo: old.tapo,
            tuya: old.tuya,
            pairings: (old.pairings ?? []).filter(
              (p) => (p as { source?: string }).source !== "ha",
            ) as unknown as DevicePairing[],
            roomSensors: (old.roomSensors ?? []).filter(
              (s) => (s as { source?: string }).source !== "ha",
            ) as unknown as RoomSensorPairing[],
            pollingSec: old.pollingSec ?? 30,
          };
        } catch {
          /* fall through */
        }
      }
      return defaultConnection();
    }
    const parsed = JSON.parse(raw) as ConnectionConfig;
    return {
      mode: parsed.mode ?? "sim",
      ac: parsed.ac,
      tapo: parsed.tapo,
      tuya: parsed.tuya,
      pairings: parsed.pairings ?? [],
      roomSensors: parsed.roomSensors ?? [],
      pollingSec: parsed.pollingSec ?? 30,
    };
  } catch {
    return defaultConnection();
  }
}

export function persistConnection(cfg: ConnectionConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export function defaultConnection(): ConnectionConfig {
  return { mode: "sim", pairings: [], roomSensors: [], pollingSec: 30 };
}

/** Derive the effective mode label from which backends are set up. */
export function effectiveMode(cfg: ConnectionConfig): ConnectionConfig["mode"] {
  const count = (cfg.ac ? 1 : 0) + (cfg.tapo ? 1 : 0) + (cfg.tuya ? 1 : 0);
  if (count > 1) return "mixed";
  if (cfg.ac) return "acinfinity";
  if (cfg.tapo) return "tapo";
  if (cfg.tuya) return "tuya";
  return "sim";
}
