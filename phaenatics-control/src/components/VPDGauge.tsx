interface Props {
  vpd: number;
  band: { min: number; max: number };
}

export function VPDGauge({ vpd, band }: Props) {
  const lo = 0;
  const hi = 2.4;
  const span = hi - lo;
  const angle = (v: number) => ((v - lo) / span) * 180 - 90;

  const radius = 70;
  const cx = 90;
  const cy = 90;
  const polar = (a: number, r = radius) => {
    const rad = (a - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arc = (a0: number, a1: number, r = radius) => {
    const p0 = polar(a0, r);
    const p1 = polar(a1, r);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  const startA = angle(lo) + 90;
  const endA = angle(hi) + 90;
  const bandStartA = angle(band.min) + 90;
  const bandEndA = angle(band.max) + 90;
  const needleA = Math.max(startA, Math.min(endA, angle(vpd) + 90));

  let status: "ok" | "warn" | "bad" = "ok";
  if (vpd < band.min - 0.1 || vpd > band.max + 0.2) status = "bad";
  else if (vpd < band.min || vpd > band.max) status = "warn";

  const statusColor =
    status === "ok" ? "#3ddc84" : status === "warn" ? "#f5a524" : "#ef4444";

  return (
    <div className="card p-4 flex flex-col items-center">
      <div className="self-start stat-label">VPD</div>
      <svg viewBox="0 0 180 110" className="w-full max-w-[280px] mt-1">
        <path d={arc(startA, endA)} stroke="#1f2823" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path
          d={arc(bandStartA, bandEndA)}
          stroke="#3ddc84"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
        <line
          x1={cx}
          y1={cy}
          x2={polar(needleA, radius - 6).x}
          y2={polar(needleA, radius - 6).y}
          stroke={statusColor}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill={statusColor} />
        <text x={polar(startA, radius + 14).x} y={polar(startA, radius + 14).y} fill="#7a8a82" fontSize="9" textAnchor="middle" dy="3">
          0
        </text>
        <text x={polar(endA, radius + 14).x} y={polar(endA, radius + 14).y} fill="#7a8a82" fontSize="9" textAnchor="middle" dy="3">
          2.4
        </text>
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-3xl font-semibold tabular-nums" style={{ color: statusColor }}>
          {vpd.toFixed(2)}
        </div>
        <div className="text-[11px] text-muted">
          Ziel {band.min.toFixed(1)}–{band.max.toFixed(1)} kPa
        </div>
      </div>
    </div>
  );
}
