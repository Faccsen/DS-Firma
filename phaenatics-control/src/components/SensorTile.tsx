import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  band?: { min: number; max: number };
  current?: number;
  precision?: number;
}

export function SensorTile({ label, value, unit, icon: Icon, band, current, precision = 1 }: Props) {
  let status: "ok" | "warn" | "bad" = "ok";
  if (band && typeof current === "number") {
    if (current < band.min || current > band.max) {
      const dist = Math.min(Math.abs(current - band.min), Math.abs(current - band.max));
      const range = band.max - band.min || 1;
      status = dist / range > 0.15 ? "bad" : "warn";
    }
  }

  const color =
    status === "ok"
      ? "text-leaf border-leaf/30 bg-leaf/10"
      : status === "warn"
        ? "text-warn border-warn/30 bg-warn/10"
        : "text-danger border-danger/30 bg-danger/10";

  const displayValue =
    typeof value === "number" ? value.toFixed(precision) : value;

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`size-8 rounded-lg grid place-items-center border ${color}`}>
            <Icon className="size-4" />
          </div>
          <span className="stat-label">{label}</span>
        </div>
        {band && (
          <span className="text-[10px] text-muted tabular-nums">
            Ziel {band.min}–{band.max}
          </span>
        )}
      </div>
      <div>
        <span className="stat-value">{displayValue}</span>
        <span className="stat-unit">{unit}</span>
      </div>
      {band && typeof current === "number" && (
        <RangeBar min={band.min} max={band.max} current={current} status={status} />
      )}
    </div>
  );
}

function RangeBar({
  min,
  max,
  current,
  status,
}: {
  min: number;
  max: number;
  current: number;
  status: "ok" | "warn" | "bad";
}) {
  const span = Math.max(max - min, 0.01);
  const padded = { lo: min - span * 0.5, hi: max + span * 0.5 };
  const total = padded.hi - padded.lo;
  const left = ((min - padded.lo) / total) * 100;
  const right = ((padded.hi - max) / total) * 100;
  const pos = ((Math.max(padded.lo, Math.min(padded.hi, current)) - padded.lo) / total) * 100;
  const dotColor =
    status === "ok" ? "bg-leaf" : status === "warn" ? "bg-warn" : "bg-danger";
  return (
    <div className="relative h-1.5 rounded-full bg-panel2 overflow-hidden">
      <div
        className="absolute h-full bg-leaf/25"
        style={{ left: `${left}%`, right: `${right}%` }}
      />
      <div
        className={`absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full ring-2 ring-bg ${dotColor}`}
        style={{ left: `calc(${pos}% - 5px)` }}
      />
    </div>
  );
}
