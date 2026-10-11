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

export type LightScene =
  | "seedling"
  | "veg"
  | "preflower"
  | "flower"
  | "finish"
  | "dark"
  | "manual";

export interface LightSpectrum {
  uv: number; // 0..100
  blue: number;
  white: number;
  red: number;
  farRed: number;
}

export interface LightConfig {
  scene: LightScene;
  /** Photoperiod in whole hours, onH + offH ≤ 24 */
  photoperiod: { onH: number; offH: number };
  /** Photosynthetic Photon Flux Density target (μmol/m²/s) */
  ppfdTarget: number;
  /** Lamp power at 100% level, Watts */
  wattage: number;
  /** Sunrise ramp duration in minutes (0 = instant) */
  sunriseMin: number;
  sunsetMin: number;
  spectrum: LightSpectrum;
  /** Lifetime runtime hours (sim) */
  hoursRun: number;
  /** Can spectrum be adjusted on this fixture */
  tunable: boolean;
}

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
  lightConfig?: LightConfig;
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
  vwc: number;
  ecSubstrate: number;
  phSubstrate: number;
  substrateTemp: number;
  ecFeed: number;
  phFeed: number;
  fieldCapacity: number;
  drybackPct: number;
  runoffPct: number;
  lightsOn: string;
  lightsOff: string;
  p1StartMin: number;
  p1DurationMin: number;
  p1ShotPct: number;
  p2ShotPct: number;
  p2IntervalMin: number;
  p3StartMinBeforeOff: number;
  drybackTargetPct: number;
  irrigationHistory: IrrigationEvent[];
}

export type AlertMetric = "temp" | "humidity" | "vpd" | "co2" | "vwc" | "ec" | "ph";
export type AlertSeverity = "warn" | "bad";

export interface Alert {
  id: string;
  roomId: string;
  metric: AlertMetric;
  severity: AlertSeverity;
  value: number;
  threshold: { min: number; max: number };
  startedAt: number;
  endedAt?: number;
  acknowledged: boolean;
}

export type JournalTag =
  | "watering"
  | "feeding"
  | "defoliation"
  | "ph"
  | "transplant"
  | "harvest"
  | "ipm"
  | "note";

export interface JournalEntry {
  id: string;
  t: number;
  tag: JournalTag;
  text: string;
}

export type AuditCategory =
  | "room"
  | "device"
  | "light"
  | "target"
  | "rule"
  | "steering"
  | "journal"
  | "alert";

export interface AuditEvent {
  id: string;
  t: number;
  category: AuditCategory;
  action: string;
  roomName?: string;
  deviceName?: string;
  details?: string;
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
  /** Unix ms of day-1 (plant start) — day counter is derived from this when set */
  plantedAt?: number;
  /** Expected total days to harvest for countdown */
  harvestInDays?: number;
  journal: JournalEntry[];
}
