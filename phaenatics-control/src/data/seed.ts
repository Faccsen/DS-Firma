import type {
  CropSteering,
  Device,
  GrowRoom,
  GrowStage,
  HistoryPoint,
  IrrigationEvent,
  RoomKind,
  SteeringStrategy,
} from "../lib/types";
import { vpd, vpdBand } from "../lib/vpd";

const HOURS = 24;
const STEP_MS = 15 * 60 * 1000;

function buildHistory(baseTemp: number, baseHum: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const now = Date.now();
  const start = now - HOURS * 60 * 60 * 1000;
  const points = (HOURS * 60 * 60 * 1000) / STEP_MS;
  for (let i = 0; i <= points; i++) {
    const t = start + i * STEP_MS;
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    const dayCycle = Math.sin(((hour - 6) / 18) * Math.PI);
    const noise = (Math.random() - 0.5) * 0.6;
    const temp = +(baseTemp + dayCycle * 2.2 + noise).toFixed(1);
    const humidity = +(baseHum - dayCycle * 6 + (Math.random() - 0.5) * 2).toFixed(1);
    const co2 = Math.round(700 + dayCycle * 250 + (Math.random() - 0.5) * 40);
    out.push({ t, temp, humidity, vpd: vpd(temp, humidity), co2 });
  }
  return out;
}

function buildIrrigationHistory(cs: {
  fieldCapacity: number;
  drybackTargetPct: number;
  p1StartMin: number;
  p1ShotPct: number;
  p2IntervalMin: number;
  p2ShotPct: number;
  p3StartMinBeforeOff: number;
  ecFeed: number;
}): IrrigationEvent[] {
  const out: IrrigationEvent[] = [];
  const now = Date.now();
  const start = now - HOURS * 60 * 60 * 1000;
  const points = (HOURS * 60 * 60 * 1000) / (5 * 60 * 1000); // 5 min granularity
  const lightsOnH = 7;
  const lightsOffH = 19;

  let vwcCur = cs.fieldCapacity - cs.drybackTargetPct;
  let ecCur = cs.ecFeed + 1.2;

  for (let i = 0; i <= points; i++) {
    const t = start + i * 5 * 60 * 1000;
    const d = new Date(t);
    const hour = d.getHours() + d.getMinutes() / 60;
    const minuteOfLightDay = (hour - lightsOnH) * 60;
    const minuteFromLightEnd = (lightsOffH - hour) * 60;
    const lightsOnNow = hour >= lightsOnH && hour < lightsOffH;

    let irrigated = false;
    let shot = 0;

    if (lightsOnNow) {
      if (minuteOfLightDay >= cs.p1StartMin && minuteOfLightDay < cs.p1StartMin + 90) {
        // P1 ramp: shots every 10–15 min
        if (Math.round(minuteOfLightDay) % 12 === 0) {
          irrigated = true;
          shot = cs.p1ShotPct;
        }
      } else if (
        minuteOfLightDay >= cs.p1StartMin + 90 &&
        minuteFromLightEnd > cs.p3StartMinBeforeOff
      ) {
        // P2 maintenance
        if (Math.round(minuteOfLightDay) % Math.round(cs.p2IntervalMin) === 0) {
          irrigated = true;
          shot = cs.p2ShotPct;
        }
      }
    }

    if (irrigated) {
      vwcCur = Math.min(cs.fieldCapacity + 1, vwcCur + shot * 1.1);
      ecCur = Math.max(cs.ecFeed, ecCur - shot * 0.08);
    } else {
      const inDryback = !lightsOnNow || minuteFromLightEnd <= cs.p3StartMinBeforeOff;
      vwcCur -= inDryback ? 0.18 : 0.08;
      ecCur += 0.004;
    }
    vwcCur = Math.max(cs.fieldCapacity - cs.drybackTargetPct - 2, vwcCur);

    out.push({
      t,
      vwc: +vwcCur.toFixed(1),
      ec: +ecCur.toFixed(2),
      irrigated,
      shotSizePct: shot,
    });
  }
  return out;
}

function makeCropSteering(overrides: Partial<CropSteering> = {}): CropSteering {
  const base: CropSteering = {
    strategy: "generative",
    phase: "P2",
    vwc: 61,
    ecSubstrate: 5.8,
    phSubstrate: 6.0,
    substrateTemp: 22.4,
    ecFeed: 2.8,
    phFeed: 5.9,
    fieldCapacity: 65,
    drybackPct: 6,
    runoffPct: 12,
    lightsOn: "07:00",
    lightsOff: "19:00",
    p1StartMin: 90,
    p1DurationMin: 90,
    p1ShotPct: 4,
    p2ShotPct: 2,
    p2IntervalMin: 60,
    p3StartMinBeforeOff: 90,
    drybackTargetPct: 25,
    irrigationHistory: [],
  };
  const merged = { ...base, ...overrides };
  merged.irrigationHistory = buildIrrigationHistory(merged);
  return merged;
}

export function defaultDevices(stage: GrowStage): Device[] {
  const flower = stage === "flowering";
  return [
    { id: dId(), type: "intake", name: "Intake Fan", port: 1, on: true, level: 4, mode: "auto" },
    { id: dId(), type: "exhaust", name: "Exhaust Fan", port: 2, on: true, level: flower ? 7 : 5, mode: "auto" },
    {
      id: dId(),
      type: "light",
      name: flower ? "LED Panel 480W" : "LED Bar 240W",
      port: 3,
      on: true,
      level: flower ? 92 : 75,
      mode: "schedule",
      scheduleOn: flower ? "08:00" : "06:00",
      scheduleOff: flower ? "20:00" : "00:00",
    },
    {
      id: dId(),
      type: flower ? "dehumidifier" : "humidifier",
      name: flower ? "Dehumidifier" : "Humidifier",
      port: 4,
      on: flower,
      level: flower ? 40 : 50,
      mode: "auto",
    },
    { id: dId(), type: "fan", name: "Oscillating Fan", port: 5, on: true, level: 3, mode: "manual" },
  ];
}

export function defaultCropSteeringDevices(): Device[] {
  return [
    { id: dId(), type: "pump", name: "Dosing Pump A", port: 1, on: true, level: 60, mode: "auto" },
    { id: dId(), type: "pump", name: "Dosing Pump B", port: 2, on: true, level: 60, mode: "auto" },
    { id: dId(), type: "doser", name: "pH Down Doser", port: 3, on: true, level: 20, mode: "auto" },
    { id: dId(), type: "light", name: "LED Panel 600W", port: 4, on: true, level: 95, mode: "schedule", scheduleOn: "07:00", scheduleOff: "19:00" },
    { id: dId(), type: "exhaust", name: "Exhaust Fan", port: 5, on: true, level: 6, mode: "auto" },
    { id: dId(), type: "dehumidifier", name: "Dehumidifier", port: 6, on: true, level: 45, mode: "auto" },
    { id: dId(), type: "ac", name: "Mini Split AC", port: 7, on: true, level: 23, mode: "auto" },
  ];
}

function dId() {
  return `d-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRoom(opts: {
  name: string;
  kind: RoomKind;
  stage: GrowStage;
}): GrowRoom {
  const { name, kind, stage } = opts;
  const flower = stage === "flowering";
  const seedling = stage === "seedling";
  const baseTemp = flower ? 25.5 : seedling ? 23 : 24;
  const baseHum = flower ? 50 : seedling ? 68 : 62;

  const room: GrowRoom = {
    id: `room-${Math.random().toString(36).slice(2, 8)}`,
    name,
    kind,
    stage,
    day: 1,
    temp: baseTemp,
    humidity: baseHum,
    vpd: vpd(baseTemp, baseHum),
    co2: 800,
    lightOn: stage !== "drying",
    targets: {
      temp: { min: flower ? 23 : 22, max: flower ? 28 : 27 },
      humidity: { min: flower ? 40 : 55, max: flower ? 55 : 70 },
      vpd: vpdBand(stage),
    },
    devices: kind === "cropsteering" ? defaultCropSteeringDevices() : defaultDevices(stage),
    rules: [],
    history: buildHistory(baseTemp, baseHum),
  };

  if (kind === "cropsteering") {
    room.cropSteering = makeCropSteering();
  }
  return room;
}

function flowerRoom(name: string, day: number, kind: "standard" | "phenohunt" = "standard"): GrowRoom {
  const r = createRoom({ name, kind, stage: "flowering" });
  r.day = day;
  return r;
}

export const seedRooms: GrowRoom[] = [
  {
    ...createRoom({ name: "Veg Tent · 80×80", kind: "standard", stage: "vegetative" }),
    day: 18,
  },
  flowerRoom("Bloom 1 · 120×120", 42),
  flowerRoom("Bloom 2 · 120×120", 28),
  flowerRoom("Bloom 3 · 120×120", 14),
  flowerRoom("Pheno Hunt · 100×100", 35, "phenohunt"),
  {
    ...createRoom({ name: "Crop Steering · Rockwool", kind: "cropsteering", stage: "flowering" }),
    day: 24,
  },
  {
    ...createRoom({ name: "Dry Room", kind: "standard", stage: "drying" }),
    day: 4,
    temp: 19.4,
    humidity: 58,
    vpd: vpd(19.4, 58),
    co2: 540,
    lightOn: false,
    targets: {
      temp: { min: 18, max: 21 },
      humidity: { min: 55, max: 62 },
      vpd: vpdBand("drying"),
    },
  },
];

export function strategyPreset(s: SteeringStrategy): Partial<CropSteering> {
  if (s === "vegetative") {
    return {
      strategy: "vegetative",
      p1ShotPct: 5,
      p2ShotPct: 3,
      p2IntervalMin: 30,
      drybackTargetPct: 10,
    };
  }
  if (s === "generative") {
    return {
      strategy: "generative",
      p1ShotPct: 4,
      p2ShotPct: 2,
      p2IntervalMin: 60,
      drybackTargetPct: 25,
    };
  }
  return {
    strategy: "transition",
    p1ShotPct: 4,
    p2ShotPct: 2.5,
    p2IntervalMin: 45,
    drybackTargetPct: 15,
  };
}
