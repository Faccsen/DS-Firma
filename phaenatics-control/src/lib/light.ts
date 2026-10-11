import type { Device, LightConfig, LightScene, LightSpectrum } from "./types";

export const LIGHT_SCENES: LightScene[] = [
  "seedling",
  "veg",
  "preflower",
  "flower",
  "finish",
  "dark",
  "manual",
];

export function sceneLabel(s: LightScene): string {
  return ({
    seedling: "Keimling",
    veg: "Vegetativ",
    preflower: "Pre-Flower",
    flower: "Blüte",
    finish: "Finish",
    dark: "Dunkel",
    manual: "Manuell",
  } as const)[s];
}

export function sceneDescription(s: LightScene): string {
  return ({
    seedling: "200 PPFD · 18/6 · blau-lastig · sanfte Rampen",
    veg: "500 PPFD · 18/6 · ausgewogenes Vollspektrum",
    preflower: "700 PPFD · 12/12 · Red hochgefahren · UV-Start",
    flower: "900 PPFD · 12/12 · Red/UV hoch · Peak-Blüte",
    finish: "1000 PPFD · 11/13 · UV + Far-Red · Terpen-Boost",
    dark: "Lampe aus (Dunkel-Phase)",
    manual: "Manuelle Werte · keine Preset-Overrides",
  } as const)[s];
}

export const SCENE_PRESETS: Record<LightScene, Partial<LightConfig>> = {
  seedling: {
    scene: "seedling",
    photoperiod: { onH: 18, offH: 6 },
    ppfdTarget: 200,
    sunriseMin: 30,
    sunsetMin: 30,
    spectrum: { uv: 0, blue: 40, white: 50, red: 10, farRed: 0 },
  },
  veg: {
    scene: "veg",
    photoperiod: { onH: 18, offH: 6 },
    ppfdTarget: 500,
    sunriseMin: 20,
    sunsetMin: 20,
    spectrum: { uv: 0, blue: 30, white: 50, red: 20, farRed: 0 },
  },
  preflower: {
    scene: "preflower",
    photoperiod: { onH: 12, offH: 12 },
    ppfdTarget: 700,
    sunriseMin: 20,
    sunsetMin: 30,
    spectrum: { uv: 5, blue: 20, white: 45, red: 25, farRed: 5 },
  },
  flower: {
    scene: "flower",
    photoperiod: { onH: 12, offH: 12 },
    ppfdTarget: 900,
    sunriseMin: 20,
    sunsetMin: 30,
    spectrum: { uv: 5, blue: 15, white: 40, red: 35, farRed: 5 },
  },
  finish: {
    scene: "finish",
    photoperiod: { onH: 11, offH: 13 },
    ppfdTarget: 1000,
    sunriseMin: 15,
    sunsetMin: 45,
    spectrum: { uv: 10, blue: 10, white: 35, red: 35, farRed: 10 },
  },
  dark: {
    scene: "dark",
    photoperiod: { onH: 0, offH: 24 },
    ppfdTarget: 0,
    sunriseMin: 0,
    sunsetMin: 0,
    spectrum: { uv: 0, blue: 0, white: 0, red: 0, farRed: 0 },
  },
  manual: {},
};

export function defaultLightConfig(scene: LightScene = "veg", wattage = 240): LightConfig {
  const preset = SCENE_PRESETS[scene];
  return {
    scene,
    photoperiod: preset.photoperiod ?? { onH: 18, offH: 6 },
    ppfdTarget: preset.ppfdTarget ?? 500,
    wattage,
    sunriseMin: preset.sunriseMin ?? 20,
    sunsetMin: preset.sunsetMin ?? 20,
    spectrum: preset.spectrum ?? { uv: 0, blue: 30, white: 50, red: 20, farRed: 0 },
    hoursRun: 0,
    tunable: true,
  };
}

/**
 * Given now, "lights on" time string "HH:MM" and photoperiod length,
 * return the brightness fraction 0..1 that accounts for sunrise/sunset ramps.
 *   - Full dark: 0
 *   - During sunrise: linear 0→1 over sunriseMin
 *   - Mid day: 1
 *   - During sunset: linear 1→0 over sunsetMin
 */
export function rampFactor(
  cfg: LightConfig,
  scheduleOn: string | undefined,
  now: Date = new Date(),
): number {
  if (cfg.scene === "dark" || cfg.photoperiod.onH === 0) return 0;
  const onMin = parseHHMM(scheduleOn ?? "06:00");
  const onDurationMin = cfg.photoperiod.onH * 60;
  const offMin = (onMin + onDurationMin) % (24 * 60);

  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // minutes since lights-on, modulo 24h
  const since = (nowMin - onMin + 24 * 60) % (24 * 60);
  if (since >= onDurationMin) return 0; // dark period

  // Within lights-on window
  const toOff = onDurationMin - since;

  if (since < cfg.sunriseMin) {
    return Math.max(0, since / Math.max(1, cfg.sunriseMin));
  }
  if (toOff < cfg.sunsetMin) {
    return Math.max(0, toOff / Math.max(1, cfg.sunsetMin));
  }
  // unused: offMin
  void offMin;
  return 1;
}

/** Current effective brightness (0..100 %) combining max level and ramp. */
export function effectiveLightPct(d: Device, now: Date = new Date()): number {
  if (!d.on || d.type !== "light") return 0;
  const cfg = d.lightConfig;
  if (!cfg || d.mode === "manual") return d.level;
  const r = rampFactor(cfg, d.scheduleOn, now);
  return +(d.level * r).toFixed(1);
}

/** Instant PPFD = cfg.ppfdTarget × (effective% / 100). */
export function instantPPFD(d: Device, now: Date = new Date()): number {
  const cfg = d.lightConfig;
  if (!cfg) return 0;
  const pct = effectiveLightPct(d, now);
  return Math.round((cfg.ppfdTarget * pct) / 100);
}

/** Instant wattage draw at current effective % */
export function instantWatts(d: Device, now: Date = new Date()): number {
  const cfg = d.lightConfig;
  if (!cfg) return 0;
  const pct = effectiveLightPct(d, now);
  return Math.round((cfg.wattage * pct) / 100);
}

/**
 * Theoretical daily DLI (mol/m²/day) assuming the current cfg stays constant.
 * Approximates ramp area as half the duration at full for simplicity.
 */
export function projectedDLI(cfg: LightConfig): number {
  const onMin = cfg.photoperiod.onH * 60;
  if (onMin === 0 || cfg.ppfdTarget === 0) return 0;
  const rampMin = cfg.sunriseMin / 2 + cfg.sunsetMin / 2;
  const fullMin = Math.max(0, onMin - rampMin * 2) + rampMin; // ramps count as half
  const seconds = fullMin * 60;
  const mol = (cfg.ppfdTarget * seconds) / 1_000_000; // μmol → mol
  return +mol.toFixed(1);
}

export function spectrumGradient(sp: LightSpectrum): string {
  // Build a horizontal gradient from UV→Blue→White→Red→FarRed with weighted stops
  const stops: string[] = [];
  let pos = 0;
  const parts: Array<[string, number]> = [
    ["#8b5cf6", sp.uv],
    ["#60a5fa", sp.blue],
    ["#f8fafc", sp.white],
    ["#ef4444", sp.red],
    ["#9f1239", sp.farRed],
  ];
  const total = parts.reduce((s, [, v]) => s + v, 0) || 1;
  for (const [c, v] of parts) {
    const w = (v / total) * 100;
    if (w <= 0) continue;
    stops.push(`${c} ${pos.toFixed(1)}%`);
    pos += w;
    stops.push(`${c} ${pos.toFixed(1)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function hhmmFromMin(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}
