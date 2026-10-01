export type GrowStage = "seedling" | "vegetative" | "flowering" | "drying";

export type RoomKind = "standard" | "phenohunt" | "cropsteering";

export type DeviceType =
  | "fan"
  | "intake"
  | "exhaust"
  | "light"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "ac"
  | "co2"
  | "pump"
  | "doser";

export type DeviceMode = "manual" | "auto" | "schedule" | "off";

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  port: number;
  on: boolean;
  level: number;
  mode: DeviceMode;
  scheduleOn?: string;
  scheduleOff?: string;
}

export interface Targets {
  temp: { min: number; max: number };
  humidity: { min: number; max: number };
  vpd: { min: number; max: number };
}

export interface HistoryPoint {
  t: number;
  temp: number;
  humidity: number;
  vpd: number;
  co2: number;
}

export interface AutomationRule {
  id: string;
  enabled: boolean;
  label: string;
  when: "temp" | "humidity" | "vpd" | "co2" | "vwc" | "ec" | "ph";
  op: ">" | "<";
  value: number;
  deviceId: string;
  action: "on" | "off" | "boost";
}

export type IrrigationPhase = "P0" | "P1" | "P2" | "P3";
export type SteeringStrategy = "vegetative" | "generative" | "transition";

export interface IrrigationEvent {
  t: number;
  vwc: number;
  ec: number;
  irrigated: boolean;
  shotSizePct: number;
}

export interface CropSteering {
  strategy: SteeringStrategy;
  phase: IrrigationPhase;

  // substrate sensors
  vwc: number; // %
  ecSubstrate: number; // mS/cm
  phSubstrate: number;
  substrateTemp: number; // °C

  // input (feed) sensors
  ecFeed: number;
  phFeed: number;

  // state
  fieldCapacity: number; // VWC % target
  drybackPct: number; // % below field capacity right now
  runoffPct: number; // last cycle

  // schedule (minutes offsets from lights-on)
  lightsOn: string; // "HH:MM"
  lightsOff: string; // "HH:MM"
  p1StartMin: number; // usually 60–120 min after lights-on
  p1DurationMin: number; // 60–120 min
  p1ShotPct: number; // 2–6%
  p2ShotPct: number; // 1–3%
  p2IntervalMin: number; // 30–120 min
  p3StartMinBeforeOff: number; // 60–120 min before lights-off
  drybackTargetPct: number; // overnight target dryback %

  irrigationHistory: IrrigationEvent[];
}

export interface GrowRoom {
  id: string;
  name: string;
  kind: RoomKind;
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
  cropSteering?: CropSteering;
}
