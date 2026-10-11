// Device-pairing state: which app Device ID corresponds to which AC Infinity
// controller + port. Persisted alongside the credentials in localStorage.
// Credentials are kept client-side only; they travel to our serverless
// proxy on each request and never to any third-party service.

export interface AcCredentials {
  email: string;
  token: string;
  userId: string;
  nickname?: string;
  connectedAt: number;
}

export interface DevicePairing {
  /** Phaenatics app Device.id */
  appDeviceId: string;
  /** AC Infinity controller devId */
  acDevId: string;
  /** AC Infinity port number on that controller */
  acPort: number;
  /** Phaenatics app Room.id — denormalised for faster look-up */
  roomId: string;
}

export interface RoomSensorPairing {
  /** Phaenatics Room.id */
  roomId: string;
  /** AC Infinity controller devId — temp/rF/VPD/CO₂ from this controller feed the room */
  acDevId: string;
}

export interface ConnectionConfig {
  mode: "sim" | "acinfinity";
  ac?: AcCredentials;
  pairings: DevicePairing[];
  roomSensors: RoomSensorPairing[];
  pollingSec: number;
}

const KEY = "phaenatics-connection-v1";

export function loadConnection(): ConnectionConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultConnection();
    const parsed = JSON.parse(raw) as ConnectionConfig;
    return {
      mode: parsed.mode ?? "sim",
      ac: parsed.ac,
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
