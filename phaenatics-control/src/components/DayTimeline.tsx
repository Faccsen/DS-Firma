import type { Device } from "../lib/types";
import { effectiveLightPct } from "../lib/light";

interface Props {
  device: Device;
  height?: number;
}

/**
 * 24h horizontal timeline showing when a lamp is on, with sunrise/sunset
 * ramps rendered as gradients, plus a "now" marker.
 */
export function DayTimeline({ device, height = 24 }: Props) {
  const cfg = device.lightConfig;
  if (!cfg) return null;

  const scheduleOn = device.scheduleOn ?? "06:00";
  const [onH, onM] = scheduleOn.split(":").map(Number);
  const onMin = (onH ?? 0) * 60 + (onM ?? 0);
  const dur = cfg.photoperiod.onH * 60;
  const offMin = (onMin + dur) % (24 * 60);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const nowPct = (nowMin / (24 * 60)) * 100;

  // Build the gradient stops for the 24h bar
  const stops: Array<[number, string]> = [];
  const addStop = (pct: number, c: string) => stops.push([clamp(pct, 0, 100), c]);
  const DARK = "#0e1512";
  const FULL = "#f2e8d0";
  const MID = "rgba(242,232,208,0.55)";

  addStop(0, DARK);

  if (dur > 0 && cfg.scene !== "dark") {
    const sunriseEnd = (onMin + cfg.sunriseMin) % (24 * 60);
    const sunsetStart = (offMin - cfg.sunsetMin + 24 * 60) % (24 * 60);

    const points: Array<{ at: number; c: string }> = [];
    points.push({ at: onMin, c: DARK });
    points.push({ at: sunriseEnd, c: FULL });
    points.push({ at: sunsetStart, c: FULL });
    points.push({ at: offMin, c: DARK });

    // Sort by time so we can render across midnight wrap by splitting
    const normalized = normalizeWrapped(points, onMin, offMin);
    for (const p of normalized) addStop((p.at / (24 * 60)) * 100, p.c);

    void MID;
  }

  addStop(100, DARK);

  // Collapse to CSS gradient string with proper interpolation between stops
  const gradient = `linear-gradient(90deg, ${stops
    .map(([p, c]) => `${c} ${p.toFixed(1)}%`)
    .join(", ")})`;

  return (
    <div className="w-full">
      <div
        className="relative rounded-md overflow-hidden border border-line"
        style={{ height, background: gradient }}
      >
        <div
          className="absolute top-0 bottom-0 w-px bg-leaf shadow-[0_0_6px_rgba(141,212,168,0.9)]"
          style={{ left: `${nowPct}%` }}
          aria-label="Jetzt"
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-muted font-mono">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
        <span>
          {scheduleOn} → {device.scheduleOff ?? "--:--"}
        </span>
        <span>· {cfg.photoperiod.onH}/{cfg.photoperiod.offH}</span>
        <span>· Jetzt {effectiveLightPct(device, now).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Normalize ramp points that may wrap past midnight into a sorted array
 * suitable for a 0..100% horizontal gradient. If a ramp wraps, we split it
 * so the color transitions properly on both halves.
 */
function normalizeWrapped(
  points: Array<{ at: number; c: string }>,
  onMin: number,
  offMin: number,
): Array<{ at: number; c: string }> {
  if (onMin < offMin) {
    return points.slice().sort((a, b) => a.at - b.at);
  }
  // wraps midnight
  const dark = "#0e1512";
  const full = "#f2e8d0";
  const sorted: Array<{ at: number; c: string }> = [];
  // from midnight to lights-off segment (end-of-cycle tail)
  sorted.push({ at: 0, c: full });
  sorted.push({ at: offMin, c: dark });
  // dark gap until lights-on
  sorted.push({ at: onMin, c: dark });
  sorted.push({ at: onMin, c: full });
  sorted.push({ at: 24 * 60, c: full });
  return sorted;
}
