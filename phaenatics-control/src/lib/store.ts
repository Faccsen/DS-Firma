import { create } from "zustand";
import type { AutomationRule, Device, GrowRoom } from "./types";
import { vpd } from "./vpd";
import { seedRooms } from "../data/seed";

interface State {
  rooms: GrowRoom[];
  activeRoomId: string;
  tickEnabled: boolean;
  selectRoom: (id: string) => void;
  setTick: (on: boolean) => void;
  toggleDevice: (roomId: string, deviceId: string) => void;
  setDeviceLevel: (roomId: string, deviceId: string, level: number) => void;
  setDeviceMode: (roomId: string, deviceId: string, mode: Device["mode"]) => void;
  setTarget: (
    roomId: string,
    key: "temp" | "humidity" | "vpd",
    bounds: { min: number; max: number },
  ) => void;
  toggleRule: (roomId: string, ruleId: string) => void;
  addRule: (roomId: string, rule: Omit<AutomationRule, "id">) => void;
  deleteRule: (roomId: string, ruleId: string) => void;
  tick: () => void;
}

const HISTORY_CAP = 24 * 4 + 4; // 24h @ 15min cadence

function applyDeviceEffects(room: GrowRoom): GrowRoom {
  // Apply rough deltas from active devices to drift the climate realistically.
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
    const sensorValue = room[rule.when] as number;
    const trigger =
      (rule.op === ">" && sensorValue > rule.value) ||
      (rule.op === "<" && sensorValue < rule.value);
    if (!trigger) continue;

    devices = devices.map((d) => {
      if (d.id !== rule.deviceId) return d;
      if (rule.action === "on") return { ...d, on: true };
      if (rule.action === "off") return { ...d, on: false };
      if (rule.action === "boost") {
        const isFan = d.type === "fan" || d.type === "intake" || d.type === "exhaust";
        return { ...d, on: true, level: isFan ? Math.min(10, d.level + 1) : Math.min(100, d.level + 10) };
      }
      return d;
    });
  }
  return { ...room, devices };
}

function pushHistory(room: GrowRoom): GrowRoom {
  const history = [
    ...room.history,
    { t: Date.now(), temp: room.temp, humidity: room.humidity, vpd: room.vpd, co2: room.co2 },
  ];
  if (history.length > HISTORY_CAP) history.shift();
  return { ...room, history };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export const useStore = create<State>((set) => ({
  rooms: seedRooms,
  activeRoomId: seedRooms[0].id,
  tickEnabled: true,

  selectRoom: (id) => set({ activeRoomId: id }),
  setTick: (on) => set({ tickEnabled: on }),

  toggleDevice: (roomId, deviceId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) =>
                d.id === deviceId ? { ...d, on: !d.on, mode: "manual" } : d,
              ),
            },
      ),
    })),

  setDeviceLevel: (roomId, deviceId, level) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              devices: r.devices.map((d) =>
                d.id === deviceId ? { ...d, level, on: level > 0 ? true : d.on } : d,
              ),
            },
      ),
    })),

  setDeviceMode: (roomId, deviceId, mode) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : { ...r, devices: r.devices.map((d) => (d.id === deviceId ? { ...d, mode } : d)) },
      ),
    })),

  setTarget: (roomId, key, bounds) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, targets: { ...r.targets, [key]: bounds } },
      ),
    })),

  toggleRule: (roomId, ruleId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : {
              ...r,
              rules: r.rules.map((rule) =>
                rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
              ),
            },
      ),
    })),

  addRule: (roomId, rule) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId
          ? r
          : { ...r, rules: [...r.rules, { ...rule, id: `r-${Math.random().toString(36).slice(2, 8)}` }] },
      ),
    })),

  deleteRule: (roomId, ruleId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id !== roomId ? r : { ...r, rules: r.rules.filter((rule) => rule.id !== ruleId) },
      ),
    })),

  tick: () =>
    set((s) =>
      s.tickEnabled
        ? { rooms: s.rooms.map((r) => pushHistory(applyRules(applyDeviceEffects(r)))) }
        : s,
    ),
}));
