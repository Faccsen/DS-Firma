import type { GrowRoom, HistoryPoint } from "../lib/types";
import { vpd, vpdBand } from "../lib/vpd";

const HOURS = 24;
const STEP_MS = 15 * 60 * 1000; // 15 minutes

function buildHistory(baseTemp: number, baseHum: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const now = Date.now();
  const start = now - HOURS * 60 * 60 * 1000;
  const points = (HOURS * 60 * 60 * 1000) / STEP_MS;
  for (let i = 0; i <= points; i++) {
    const t = start + i * STEP_MS;
    const hourOfDay = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    // Day/night cycle: warmer when lights are on (06–24)
    const dayCycle = Math.sin(((hourOfDay - 6) / 18) * Math.PI);
    const noise = (Math.random() - 0.5) * 0.6;
    const temp = +(baseTemp + dayCycle * 2.2 + noise).toFixed(1);
    const humidity = +(baseHum - dayCycle * 6 + (Math.random() - 0.5) * 2).toFixed(1);
    const co2 = Math.round(700 + dayCycle * 250 + (Math.random() - 0.5) * 40);
    out.push({ t, temp, humidity, vpd: vpd(temp, humidity), co2 });
  }
  return out;
}

export const seedRooms: GrowRoom[] = [
  {
    id: "room-veg",
    name: "Veg Tent · 80×80",
    stage: "vegetative",
    day: 18,
    temp: 24.6,
    humidity: 62,
    vpd: vpd(24.6, 62),
    co2: 820,
    lightOn: true,
    targets: {
      temp: { min: 22, max: 27 },
      humidity: { min: 55, max: 70 },
      vpd: vpdBand("vegetative"),
    },
    devices: [
      { id: "d1", type: "intake", name: "Intake Fan", port: 1, on: true, level: 4, mode: "auto" },
      { id: "d2", type: "exhaust", name: "Exhaust Fan", port: 2, on: true, level: 6, mode: "auto" },
      {
        id: "d3",
        type: "light",
        name: "LED Bar 240W",
        port: 3,
        on: true,
        level: 75,
        mode: "schedule",
        scheduleOn: "06:00",
        scheduleOff: "00:00",
      },
      { id: "d4", type: "humidifier", name: "Humidifier", port: 4, on: false, level: 50, mode: "auto" },
      { id: "d5", type: "fan", name: "Clip Fan", port: 5, on: true, level: 3, mode: "manual" },
    ],
    rules: [
      {
        id: "r1",
        enabled: true,
        label: "Exhaust boost wenn Temp > 27°C",
        when: "temp",
        op: ">",
        value: 27,
        deviceId: "d2",
        action: "boost",
      },
      {
        id: "r2",
        enabled: true,
        label: "Humidifier an wenn rF < 55%",
        when: "humidity",
        op: "<",
        value: 55,
        deviceId: "d4",
        action: "on",
      },
    ],
    history: buildHistory(24, 62),
  },
  {
    id: "room-flower",
    name: "Flower Tent · 120×120",
    stage: "flowering",
    day: 42,
    temp: 26.1,
    humidity: 48,
    vpd: vpd(26.1, 48),
    co2: 1100,
    lightOn: true,
    targets: {
      temp: { min: 23, max: 28 },
      humidity: { min: 40, max: 55 },
      vpd: vpdBand("flowering"),
    },
    devices: [
      { id: "f1", type: "intake", name: "Intake Fan", port: 1, on: true, level: 5, mode: "auto" },
      { id: "f2", type: "exhaust", name: "Exhaust Fan", port: 2, on: true, level: 7, mode: "auto" },
      {
        id: "f3",
        type: "light",
        name: "LED Panel 480W",
        port: 3,
        on: true,
        level: 92,
        mode: "schedule",
        scheduleOn: "08:00",
        scheduleOff: "20:00",
      },
      { id: "f4", type: "dehumidifier", name: "Dehumidifier", port: 4, on: true, level: 40, mode: "auto" },
      { id: "f5", type: "co2", name: "CO₂ Valve", port: 5, on: false, level: 0, mode: "auto" },
      { id: "f6", type: "fan", name: "Oscillating Fan", port: 6, on: true, level: 4, mode: "manual" },
    ],
    rules: [
      {
        id: "fr1",
        enabled: true,
        label: "Dehumidifier an wenn rF > 55%",
        when: "humidity",
        op: ">",
        value: 55,
        deviceId: "f4",
        action: "on",
      },
      {
        id: "fr2",
        enabled: false,
        label: "CO₂ Boost wenn unter 900 ppm",
        when: "co2",
        op: "<",
        value: 900,
        deviceId: "f5",
        action: "on",
      },
    ],
    history: buildHistory(25.5, 50),
  },
  {
    id: "room-dry",
    name: "Dry Room",
    stage: "drying",
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
    devices: [
      { id: "y1", type: "exhaust", name: "Carbon Filter Fan", port: 1, on: true, level: 2, mode: "manual" },
      { id: "y2", type: "dehumidifier", name: "Dehumidifier", port: 2, on: true, level: 30, mode: "auto" },
      { id: "y3", type: "ac", name: "Mini Split AC", port: 3, on: true, level: 19, mode: "auto" },
    ],
    rules: [],
    history: buildHistory(19.5, 58),
  },
];
