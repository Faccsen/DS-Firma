import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CropSteering } from "../lib/types";

interface Props {
  cs: CropSteering;
}

export function IrrigationChart({ cs }: Props) {
  const data = cs.irrigationHistory.map((p) => ({
    ...p,
    label: new Date(p.t).getHours().toString().padStart(2, "0") +
      ":" +
      new Date(p.t).getMinutes().toString().padStart(2, "0"),
  }));

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="stat-label">VWC & Bewässerungs-Shots · letzte 24h</div>
        <div className="text-[11px] text-muted">
          FC {cs.fieldCapacity}% · Dryback-Ziel {cs.drybackTargetPct}%
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="g-vwc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8dd4a8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#8dd4a8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              minTickGap={48}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="vwc"
              tickLine={false}
              axisLine={false}
              width={36}
              domain={[
                Math.max(0, cs.fieldCapacity - cs.drybackTargetPct - 5),
                cs.fieldCapacity + 3,
              ]}
            />
            <Tooltip
              contentStyle={{
                background: "#0f1613",
                border: "1px solid #243029",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8a9a90" }}
              formatter={(v: number, k: string) =>
                k === "vwc" ? [`${v}%`, "VWC"] : [`${v}`, k]
              }
            />
            <ReferenceLine
              yAxisId="vwc"
              y={cs.fieldCapacity}
              stroke="#f2e8d0"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: `FC ${cs.fieldCapacity}%`,
                position: "insideTopRight",
                fill: "#f2e8d0",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              yAxisId="vwc"
              y={cs.fieldCapacity - cs.drybackTargetPct}
              stroke="#f5a524"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{
                value: `Min ${cs.fieldCapacity - cs.drybackTargetPct}%`,
                position: "insideBottomRight",
                fill: "#f5a524",
                fontSize: 10,
              }}
            />
            <Area
              yAxisId="vwc"
              type="monotone"
              dataKey="vwc"
              stroke="#8dd4a8"
              strokeWidth={2}
              fill="url(#g-vwc)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
