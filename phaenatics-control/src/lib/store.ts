import { create } from "zustand";
import type {
  Alert,
  AutomationRule,
  CropSteering,
  Device,
  GrowRoom,
  GrowStage,
  JournalEntry,
  JournalTag,
  LightConfig,
  LightScene,
  RoomKind,
  SteeringStrategy,
} from "./types";
import { vpd } from "./vpd";
import { createRoom, seedRooms, strategyPreset } from "../data/seed";
import { SCENE_PRESETS } from "./light";
import { reconcileAlerts } from "./alerts";

interface State {
  rooms: GrowRoom[];
  alerts: Alert[];
  activeRoomId: string;
  tickEnabled: boolean;

  selectRoom: (id: string) => void;
  setTick: (on: boolean) => void;

  addRoom: (opts: {
    name: string;
    kind: RoomKind;
    stage: GrowStage;
    harvestInDays?: number;
  }) => string;
  renameRoom: (id: string, name: string) => void;
  deleteRoom: (id: string) => void;
  duplicateRoom: (id: string) => void;
  setRoomMeta: (id: string, patch: Partial<Pick<GrowRoom, "stage" | "day" | "plantedAt" | "harvestInDays">>) => void;

  toggleDevice: (roomId: string, deviceId: string) => void;
  setDeviceLevel: (roomId: string, deviceId: string, level: number) => void;
  setDeviceMode: (roomId: string, deviceId: string, mode: Device["mode"]) => void;
  setDeviceSchedule: (
    roomId: string,
    deviceId: string,
    patch: { scheduleOn?: string; scheduleOff?: string },
  ) => void;
  updateLightConfig: (roomId: string, deviceId: string, patch: Partial<LightConfig>) => void;
  applyLightScene: (roomId: string, deviceId: string, scene: LightScene) => void;

  setTarget: (
    roomId: string,
    key: "temp" | "humidity" | "vpd",
    bounds: { min: number; max: number },
  ) => void;

  toggleRule: (roomId: string, ruleId: string) => void;
  addRule: (roomId: string, rule: Omit<AutomationRule, "id">) => void;
  deleteRule: (roomId: string, ruleId: string) => void;

  setSteeringStrategy: (roomId: string, strategy: SteeringStrategy) => void;
  updateSteering: (roomId: string, patch: Partial<CropSteering>) => void;
  triggerShot: (roomId: string) => void;

  addJournal: (roomId: string, tag: JournalTag, text: string) => void;
  deleteJournal: (roomId: string, entryId: string) => void;

  acknowledgeAlert: (id: string) => void;
  clearResolvedAlerts: () => void;

  tick: () => void;
}

const STORAGE_KEY = "phaenatics-rooms-v3";
const ALERTS_KEY = "phaenatics-alerts-v1";
const HISTORY_CAP = 24 * 4 + 4;
const IRRIG_HISTORY_CAP = 24 * 12 + 2;
const DAY_MS = 86_400_000;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function loadRooms(): GrowRoom[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GrowRoom[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // migrate: ensure journal exists
    return parsed.map((r) => ({ ...r, journal: r.journal ?? [] }));
  } catch {
    return null;
  }
}
function loadAlerts(): Alert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Alert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function persist(rooms: GrowRoom[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch {
    /* storage full / disabled */
  }
}
function persistAlerts(alerts: Alert[]) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(-300)));
  } catch {
    /* ignore */
  }
}

function applyDeviceEffects(room: GrowRoom): GrowRoom {
  let tempDelta = 0;
  let humDelta = 0;
  let co2Delta = 0;

  for (const d of room.devices) {
    if (!d.on) continue;
    switch (d.type) {
      case "intake":
        tempDelta -= 0.04 * d.level;
        humDelta += 0.02 * d.level;
        break;
      case "exhaust":
        tempDelta -= 0.05 * d.level;
        humDelta -= 0.06 * d.level;
        co2Delta -= 8 * d.level;
        break;
      case "fan":
        tempDelta -= 0.01 * d.level;
        break;
      case "light":
        tempDelta += 0.012 * d.level;
        break;
      case "humidifier":
        humDelta += 0.05 * d.level;
        break;
      case "dehumidifier":
        humDelta -= 0.04 * d.level;
        break;
      case "heater":
        tempDelta += 0.03 * d.level;
        break;
      case "ac":
        tempDelta -= 0.04 * d.level;
        humDelta -= 0.01 * d.level;
        break;
      case "co2":
        co2Delta += 15 * (d.level || 50);
        break;
      case "pump":
      case "doser":
        break;
    }
  }

  const drift = () => (Math.random() - 0.5) * 0.3;
  const temp = clamp(+(room.temp + tempDelta * 0.05 + drift()).toFixed(1), 12, 38);
  const humidity = clamp(+(room.humidity + humDelta * 0.05 + drift() * 2).toFixed(1), 15, 95);
  const co2 = clamp(Math.round(room.co2 + co2Delta * 0.02 + (Math.random() - 0.5) * 20), 380, 1800);
  const v = vpd(temp, humidity);
  return { ...room, temp, humidity, vpd: v, co2 };
}

function applyRules(room: GrowRoom): GrowRoom {
  let devices = room.devices;
  for (const rule of room.rules) {
    if (!rule.enabled) continue;
    const sensor = sensorValue(room, rule.when);
    if (sensor == null) continue;
    const trigger =
      (rule.op === ">" && sensor > rule.value) ||
      (rule.op === "<" && sensor < rule.value);
    if (!trigger) continue;

    devices = devices.map((d) => {
      if (d.id !== rule.deviceId) return d;
      if (rule.action === "on") return { ...d, on: true };
      if (rule.action === "off") return { ...d, on: false };
      if (rule.action === "boost") {
        const isFan = d.type === "fan" || d.type === "intake" || d.type === "exhaust";
        return {
          ...d,
          on: true,
          level: isFan ? Math.min(10, d.level + 1) : Math.min(100, d.level + 10),
        };
      }
      return d;
    });
  }
  return { ...room, devices };
}

function sensorValue(r: GrowRoom, k: AutomationRule["when"]): number | null {
  if (k === "temp") return r.temp;
  if (k === "humidity") return r.humidity;
  if (k === "vpd") return r.vpd;
  if (k === "co2") return r.co2;
  if (!r.cropSteering) return null;
  if (k === "vwc") return r.cropSteering.vwc;
  if (k === "ec") return r.cropSteering.ecSubstrate;
  if (k === "ph") return r.cropSteering.phSubstrate;
  return null;
}

function pushHistory(room: GrowRoom): GrowRoom {
  const history = [
    ...room.history,
    { t: Date.now(), temp: room.temp, humidity: room.humidity, vpd: room.vpd, co2: room.co2 },
  ];
  if (history.length > HISTORY_CAP) history.shift();
  return { ...room, history };
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function currentPhase(cs: CropSteering, nowMinOfDay: number): "P0" | "P1" | "P2" | "P3" {
  const on = hhmmToMinutes(cs.lightsOn);
  const off = hhmmToMinutes(cs.lightsOff);
  const inLight =
    on <= off
      ? nowMinOfDay >= on && nowMinOfDay < off
      : nowMinOfDay >= on || nowMinOfDay < off;
  if (!inLight) return "P0";
  const minOfLight = on <= off ? nowMinOfDay - on : (nowMinOfDay - on + 24 * 60) % (24 * 60);
  const lightLen = (off - on + 24 * 60) % (24 * 60) || 12 * 60;
  const minFromEnd = lightLen - minOfLight;
  if (minOfLight < cs.p1StartMin) return "P1";
  if (minOfLight < cs.p1StartMin + cs.p1DurationMin) return "P1";
  if (minFromEnd <= cs.p3StartMinBeforeOff) return "P3";
  return "P2";
}

function tickCropSteering(room: GrowRoom): GrowRoom {
  if (!room.cropSteering) return room;
  const cs = room.cropSteering;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const phase = currentPhase(cs, nowMin);

  const sinceLast = cs.irrigationHistory[cs.irrigationHistory.length - 1];
  const minsSince = sinceLast ? (Date.now() - sinceLast.t) / 60000 : 999;

  let irrigated = false;
  let shot = 0;
  let vwc = cs.vwc;
  let ec = cs.ecSubstrate;

  if (phase === "P1" && minsSince >= 10) {
    irrigated = true;
    shot = cs.p1ShotPct;
  } else if (phase === "P2" && minsSince >= cs.p2IntervalMin) {
    irrigated = true;
    shot = cs.p2ShotPct;
  }

  if (irrigated) {
    vwc = Math.min(cs.fieldCapacity + 1, vwc + shot * 1.1);
    ec = Math.max(cs.ecFeed, ec - shot * 0.08);
  } else {
    const drift = phase === "P0" ? 0.08 : phase === "P3" ? 0.05 : 0.02;
    vwc -= drift;
    ec += 0.003;
  }
  vwc = clamp(vwc, cs.fieldCapacity - cs.drybackTargetPct - 2, cs.fieldCapacity + 2);
  ec = clamp(ec, cs.ecFeed, 10);

  const drybackPct = +Math.max(0, cs.fieldCapacity - vwc).toFixed(1);

  const history = [
    ...cs.irrigationHistory,
    { t: Date.now(), vwc: +vwc.toFixed(1), ec: +ec.toFixed(2), irrigated, shotSizePct: shot },
  ];
  if (history.length > IRRIG_HISTORY_CAP) history.shift();

  return {
    ...room,
    cropSteering: {
      ...cs,
      phase,
      vwc: +vwc.toFixed(1),
      ecSubstrate: +ec.toFixed(2),
      phSubstrate: +(cs.phSubstrate + (Math.random() - 0.5) * 0.02).toFixed(2),
      substrateTemp: +(cs.substrateTemp + (Math.random() - 0.5) * 0.05).toFixed(1),
      drybackPct,
      irrigationHistory: history,
    },
  };
}

function tickLightLifetime(room: GrowRoom): GrowRoom {
  // Advance hoursRun for lights that are currently effectively on.
  const now = new Date();
  const stepHours = 2.5 / 3600; // tick interval 2.5s
  const devices = room.devices.map((d) => {
    if (d.type !== "light" || !d.on || !d.lightConfig) return d;
    const cfg = d.lightConfig;
    if (cfg.scene === "dark") return d;
    const on = d.scheduleOn ?? "06:00";
    const [h, m] = on.split(":").map(Number);
    const onMin = (h ?? 0) * 60 + (m ?? 0);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const since = (nowMin - onMin + 24 * 60) % (24 * 60);
    if (since >= cfg.photoperiod.onH * 60) return d;
    return {
      ...d,
      lightConfig: { ...cfg, hoursRun: +(cfg.hoursRun + stepHours).toFixed(2) },
    };
  });
  return { ...room, devices };
}

function tickDayCounter(room: GrowRoom): GrowRoom {
  if (!room.plantedAt) return room;
  const day = Math.max(1, Math.floor((Date.now() - room.plantedAt) / DAY_MS) + 1);
  if (day === room.day) return room;
  return { ...room, day };
}

export const useStore = create<State>((set) => ({
  rooms: loadRooms() ?? seedRooms,
  alerts: loadAlerts(),
  activeRoomId: (loadRooms() ?? seedRooms)[0].id,
  tickEnabled: true,

  selectRoom: (id) => set({ activeRoomId: id }),
  setTick: (on) => set({ tickEnabled: on }),

  addRoom: (opts) => {
    const room = createRoom(opts);
    set((s) => {
      const rooms = [...s.rooms, room];
      persist(rooms);
      return { rooms, activeRoomId: room.id };
    });
    return room.id;
  },

  renameRoom: (id, name) =>
    set((s) => {
      const rooms = s.rooms.map((r) => (r.id === id ? { ...r, name } : r));
      persist(rooms);
      return { rooms };
    }),

  deleteRoom: (id) =>
    set((s) => {
      const rooms = s.rooms.filter((r) => r.id !== id);
      const activeRoomId = s.activeRoomId === id ? rooms[0]?.id ?? "" : s.activeRoomId;
      persist(rooms);
      return { rooms, activeRoomId };
    }),

  duplicateRoom: (id) =>
    set((s) => {
      const src = s.rooms.find((r) => r.id === id);
      if (!src) return s;
      const copy: GrowRoom = {
        ...src,
        id: `room-${Math.random().toString(36).slice(2, 8)}`,
        name: `${src.name} (Kopie)`,
        day: 1,
        plantedAt: Date.now(),
        journal: [],
        devices: src.devices.map((d) => ({
          ...d,
          id: `d-${Math.random().toString(36).slice(2, 8)}`,
          lightConfig: d.lightConfig ? { ...d.lightConfig, hoursRun: 0 } : undefined,
        })),
      };
      const rooms = [...s.rooms, copy];
      persist(rooms);
      return { rooms, activeRoomId: copy.id };
    }),

  setRoomMeta: (id, patch) =>
    set((s) => {
      const rooms = s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r));
      persist(rooms);
      return { rooms };
    }),

  toggleDevice: (roomId, deviceId) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) =>
                d.id === deviceId ? { ...d, on: !d.on, mode: "manual" as const } : d,
              ),
            },
      );
      persist(rooms);
      return { rooms };
    }),

  setDeviceLevel: (roomId, deviceId, level) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) =>
                d.id === deviceId ? { ...d, level, on: level > 0 ? true : d.on } : d,
              ),
            },
      );
      persist(rooms);
      return { rooms };
    }),

  setDeviceMode: (roomId, deviceId, mode) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : { ...r, devices: r.devices.map((d) => (d.id === deviceId ? { ...d, mode } : d)) },
      );
      persist(rooms);
      return { rooms };
    }),

  setDeviceSchedule: (roomId, deviceId, patch) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)),
            },
      );
      persist(rooms);
      return { rooms };
    }),

  updateLightConfig: (roomId, deviceId, patch) =>
    set((s) => {
      const rooms = s.rooms.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          devices: r.devices.map((d) => {
            if (d.id !== deviceId || !d.lightConfig) return d;
            return { ...d, lightConfig: { ...d.lightConfig, ...patch } };
          }),
        };
      });
      persist(rooms);
      return { rooms };
    }),

  applyLightScene: (roomId, deviceId, scene) =>
    set((s) => {
      const rooms = s.rooms.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          devices: r.devices.map((d) => {
            if (d.id !== deviceId || !d.lightConfig) return d;
            const preset = SCENE_PRESETS[scene];
            const merged = { ...d.lightConfig, ...preset, scene };
            // adjust scheduleOff from scheduleOn + onH
            let patch: Partial<Device> = { lightConfig: merged };
            if (preset.photoperiod && d.scheduleOn) {
              const [h, m] = d.scheduleOn.split(":").map(Number);
              const offMin = ((h ?? 0) * 60 + (m ?? 0) + preset.photoperiod.onH * 60) % (24 * 60);
              const off = `${Math.floor(offMin / 60).toString().padStart(2, "0")}:${(offMin % 60).toString().padStart(2, "0")}`;
              patch = { ...patch, scheduleOff: off };
            }
            if (scene === "dark") patch = { ...patch, on: false };
            else patch = { ...patch, on: true };
            return { ...d, ...patch };
          }),
        };
      });
      persist(rooms);
      return { rooms };
    }),

  setTarget: (roomId, key, bounds) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, targets: { ...r.targets, [key]: bounds } },
      );
      persist(rooms);
      return { rooms };
    }),

  toggleRule: (roomId, ruleId) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              rules: r.rules.map((rule) =>
                rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
              ),
            },
      );
      persist(rooms);
      return { rooms };
    }),

  addRule: (roomId, rule) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : { ...r, rules: [...r.rules, { ...rule, id: `r-${Math.random().toString(36).slice(2, 8)}` }] },
      );
      persist(rooms);
      return { rooms };
    }),

  deleteRule: (roomId, ruleId) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, rules: r.rules.filter((rule) => rule.id !== ruleId) },
      );
      persist(rooms);
      return { rooms };
    }),

  setSteeringStrategy: (roomId, strategy) =>
    set((s) => {
      const rooms = s.rooms.map((r) => {
        if (r.id !== roomId || !r.cropSteering) return r;
        return { ...r, cropSteering: { ...r.cropSteering, ...strategyPreset(strategy) } };
      });
      persist(rooms);
      return { rooms };
    }),

  updateSteering: (roomId, patch) =>
    set((s) => {
      const rooms = s.rooms.map((r) => {
        if (r.id !== roomId || !r.cropSteering) return r;
        return { ...r, cropSteering: { ...r.cropSteering, ...patch } };
      });
      persist(rooms);
      return { rooms };
    }),

  triggerShot: (roomId) =>
    set((s) => {
      const rooms = s.rooms.map((r) => {
        if (r.id !== roomId || !r.cropSteering) return r;
        const cs = r.cropSteering;
        const shot = cs.phase === "P1" ? cs.p1ShotPct : cs.p2ShotPct;
        const vwc = Math.min(cs.fieldCapacity + 1, cs.vwc + shot * 1.1);
        const ec = Math.max(cs.ecFeed, cs.ecSubstrate - shot * 0.08);
        return {
          ...r,
          cropSteering: {
            ...cs,
            vwc: +vwc.toFixed(1),
            ecSubstrate: +ec.toFixed(2),
            drybackPct: +Math.max(0, cs.fieldCapacity - vwc).toFixed(1),
            irrigationHistory: [
              ...cs.irrigationHistory,
              { t: Date.now(), vwc: +vwc.toFixed(1), ec: +ec.toFixed(2), irrigated: true, shotSizePct: shot },
            ].slice(-IRRIG_HISTORY_CAP),
          },
        };
      });
      persist(rooms);
      return { rooms };
    }),

  addJournal: (roomId, tag, text) =>
    set((s) => {
      const entry: JournalEntry = {
        id: `j-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        t: Date.now(),
        tag,
        text: text.slice(0, 500),
      };
      const rooms = s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, journal: [entry, ...r.journal].slice(0, 200) },
      );
      persist(rooms);
      return { rooms };
    }),

  deleteJournal: (roomId, entryId) =>
    set((s) => {
      const rooms = s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, journal: r.journal.filter((e) => e.id !== entryId) },
      );
      persist(rooms);
      return { rooms };
    }),

  acknowledgeAlert: (id) =>
    set((s) => {
      const alerts = s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
      persistAlerts(alerts);
      return { alerts };
    }),

  clearResolvedAlerts: () =>
    set((s) => {
      const alerts = s.alerts.filter((a) => !a.endedAt);
      persistAlerts(alerts);
      return { alerts };
    }),

  tick: () =>
    set((s) => {
      if (!s.tickEnabled) return s;
      const rooms = s.rooms.map((r) => {
        let next = applyDeviceEffects(r);
        next = applyRules(next);
        next = pushHistory(next);
        next = tickCropSteering(next);
        next = tickLightLifetime(next);
        next = tickDayCounter(next);
        return next;
      });
      let alerts = s.alerts;
      for (const r of rooms) alerts = reconcileAlerts(r, alerts);
      persistAlerts(alerts);
      return { rooms, alerts };
    }),
}));
