/**
 * Vapor Pressure Deficit (kPa) — Tetens-based saturation vapor pressure.
 * Leaf temperature is approximated as airTempC - 1.5, the common offset
 * most grow controllers use on their dashboards.
 */
export function vpd(airTempC: number, humidityPct: number, leafOffsetC = 1.5): number {
  const leafC = airTempC - leafOffsetC;
  const svpAir = 0.6108 * Math.exp((17.27 * airTempC) / (airTempC + 237.3));
  const svpLeaf = 0.6108 * Math.exp((17.27 * leafC) / (leafC + 237.3));
  const avp = svpAir * (humidityPct / 100);
  return Math.max(0, +(svpLeaf - avp).toFixed(2));
}

export function vpdBand(stage: "seedling" | "vegetative" | "flowering" | "drying") {
  switch (stage) {
    case "seedling":
      return { min: 0.4, max: 0.8 };
    case "vegetative":
      return { min: 0.8, max: 1.2 };
    case "flowering":
      return { min: 1.2, max: 1.6 };
    case "drying":
      return { min: 0.6, max: 1.0 };
  }
}
