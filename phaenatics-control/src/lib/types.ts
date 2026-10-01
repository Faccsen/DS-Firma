export type GrowStage = "seedling" | "vegetative" | "flowering" | "drying";

export type DeviceType =
  | "fan"
  | "intake"
  | "exhaust"
  | "light"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "ac"
  | "co2";

export type DeviceMode = "manual" | "auto" | "schedule" | "off";

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  port: number;
  on: boolean;
  /** 0–10 for fans, 0–100 for lights / others. */
  level: number;
  mode: DeviceMode;
  /** Optional schedule window in 24h format e.g. "06:00". */
  scheduleOn?: string;
  scheduleOff?: string;
}

export interface Targets {
  temp: { min: number; max: number };
  humidity: { min: number; max: number };
  vpd: { min: number; max: number };
}

export interface HistoryPoint {
  t: number; // unix ms
  temp: number;
  humidity: number;
  vpd: number;
  co2: number;
}

export interface AutomationRule {
  id: string;
  enabled: boolean;
  /** human readable label */
  label: string;
  /** sensor to watch */
  when: "temp" | "humidity" | "vpd" | "co2";
  op: ">" | "<";
  value: number;
  /** device to toggle */
  deviceId: string;
  action: "on" | "off" | "boost";
}

export interface GrowRoom {
  id: string;
  name: string;
  stage: GrowStage;
  day: number;
  temp: number;
  humidity: number;
  vpd: number;
  co2: number;
  lightOn: boolean;
  targets: Targets;
  devices: Device[];
  rules: AutomationRule[];
  history: HistoryPoint[];
}
