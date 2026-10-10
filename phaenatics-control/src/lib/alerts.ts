import type { Alert, AlertMetric, AlertSeverity, GrowRoom } from "./types";

const BAD_RATIO = 0.15; // > 15% out of band → bad

interface BandCheck {
  metric: AlertMetric;
  value: number;
  band: { min: number; max: number };
}

function checkBand({ value, band }: BandCheck): { severity: AlertSeverity } | null {
  if (value >= band.min && value <= band.max) return null;
  const span = band.max - band.min || 1;
  const dist = value < band.min ? band.min - value : value - band.max;
  return { severity: dist / span > BAD_RATIO ? "bad" : "warn" };
}

/** Return the set of currently-active alerts derived from a room's live values. */
export function evaluateRoom(room: GrowRoom): BandCheck[] {
  const checks: BandCheck[] = [
    { metric: "temp", value: room.temp, band: room.targets.temp },
    { metric: "humidity", value: room.humidity, band: room.targets.humidity },
    { metric: "vpd", value: room.vpd, band: room.targets.vpd },
  ];
  if (room.cropSteering) {
    const cs = room.cropSteering;
    checks.push({
      metric: "vwc",
      value: cs.vwc,
      band: { min: cs.fieldCapacity - cs.drybackTargetPct, max: cs.fieldCapacity },
    });
    checks.push({ metric: "ph", value: cs.phSubstrate, band: { min: 5.5, max: 6.3 } });
  }
  return checks;
}

export function activeAlerts(room: GrowRoom): Array<BandCheck & { severity: AlertSeverity }> {
  return evaluateRoom(room)
    .map((c) => {
      const r = checkBand(c);
      return r ? { ...c, severity: r.severity } : null;
    })
    .filter((x): x is BandCheck & { severity: AlertSeverity } => x !== null);
}

/**
 * Reconcile a stored alert list with freshly evaluated conditions.
 * - Opens new alerts for conditions that aren't already active.
 * - Closes existing active alerts whose condition cleared (sets endedAt).
 * - Returns the updated list, capped at the newest N.
 */
export function reconcileAlerts(
  room: GrowRoom,
  current: Alert[],
  cap = 200,
): Alert[] {
  const live = activeAlerts(room);
  const liveKey = (c: BandCheck) => `${room.id}:${c.metric}`;
  const liveSet = new Set(live.map(liveKey));
  const now = Date.now();

  // close resolved
  const updated = current.map((a): Alert => {
    if (a.roomId !== room.id || a.endedAt) return a;
    const key = `${room.id}:${a.metric}`;
    if (!liveSet.has(key)) return { ...a, endedAt: now };
    return a;
  });

  // open new
  const openKeys = new Set(
    updated
      .filter((a) => a.roomId === room.id && !a.endedAt)
      .map((a) => `${room.id}:${a.metric}`),
  );
  for (const c of live) {
    const key = liveKey(c);
    if (openKeys.has(key)) continue;
    updated.push({
      id: `al-${now}-${Math.random().toString(36).slice(2, 6)}`,
      roomId: room.id,
      metric: c.metric,
      severity: c.severity,
      value: c.value,
      threshold: c.band,
      startedAt: now,
      acknowledged: false,
    });
  }

  return updated.slice(-cap);
}

export function metricLabel(m: AlertMetric): string {
  return (
    {
      temp: "Temperatur",
      humidity: "Luftfeuchte",
      vpd: "VPD",
      co2: "CO₂",
      vwc: "VWC",
      ec: "EC",
      ph: "pH",
    } as const
  )[m];
}

export function metricUnit(m: AlertMetric): string {
  return (
    {
      temp: "°C",
      humidity: "%",
      vpd: "kPa",
      co2: "ppm",
      vwc: "%",
      ec: "mS/cm",
      ph: "",
    } as const
  )[m];
}
