import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../lib/types";

interface Props {
  data: HistoryPoint[];
  metric: "temp" | "humidity" | "vpd" | "co2";
}

const META: Record<
  Props["metric"],
  { color: string; unit: string; label: string; domain?: [number | "auto", number | "auto"] }
> = {
  temp: { color: "#f5a524", unit: "°C", label: "Temperatur", domain: ["auto", "auto"] },
  humidity: { color: "#38bdf8", unit: "%", label: "Luftfeuchte", domain: [0, 100] },
  vpd: { color: "#3ddc84", unit: " kPa", label: "VPD" },
  co2: { color: "#a78bfa", unit: " ppm", label: "CO₂" },
};

export function HistoryChart({ data, metric }: Props) {
  const m = META[metric];
  const formatted = data.map((d) => ({ ...d, label: timeLabel(d.t) }));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="stat-label">{m.label} · letzte 24h</div>
        <div className="text-[11px] text-muted">{data.length} Datenpunkte</div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={`g-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={m.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              minTickGap={32}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={36}
              domain={m.domain as [number, number] | undefined}
            />
            <Tooltip
              contentStyle={{
                background: "#111613",
                border: "1px solid #1f2823",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#7a8a82" }}
              formatter={(v: number) => [`${v}${m.unit}`, m.label]}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={m.color}
              strokeWidth={2}
              fill={`url(#g-${metric})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function timeLabel(t: number) {
  const d = new Date(t);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
