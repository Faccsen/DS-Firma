import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "../lib/types";

interface Props {
  data: HistoryPoint[];
  /** Hide CO2 line for rooms where it is irrelevant */
  showCo2?: boolean;
  title?: string;
}

type SeriesKey = "temp" | "humidity" | "vpd" | "co2";

const SERIES: Record<
  SeriesKey,
  { color: string; unit: string; label: string; axis: "left" | "rightPct" | "rightVpd" | "rightCo2" }
> = {
  temp: { color: "#f5a524", unit: "°C", label: "Temperatur", axis: "left" },
  humidity: { color: "#38bdf8", unit: "%", label: "Luftfeuchte", axis: "rightPct" },
  vpd: { color: "#8dd4a8", unit: " kPa", label: "VPD", axis: "rightVpd" },
  co2: { color: "#a78bfa", unit: " ppm", label: "CO₂", axis: "rightCo2" },
};

export function CombinedChart({ data, showCo2 = true, title }: Props) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    temp: true,
    humidity: true,
    vpd: true,
    co2: showCo2,
  });

  const formatted = data.map((d) => ({
    ...d,
    label:
      new Date(d.t).getHours().toString().padStart(2, "0") +
      ":" +
      new Date(d.t).getMinutes().toString().padStart(2, "0"),
  }));

  const keys = (Object.keys(SERIES) as SeriesKey[]).filter((k) => showCo2 || k !== "co2");

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="stat-label">{title ?? "Verlauf · letzte 24h"}</div>
        <div className="flex flex-wrap gap-1">
          {keys.map((k) => {
            const s = SERIES[k];
            const on = visible[k];
            return (
              <button
                key={k}
                onClick={() => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                className={`px-2 py-0.5 text-[11px] rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                  on ? "text-fg border-line bg-panel2" : "text-muted/60 border-line"
                }`}
                style={on ? { boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: on ? s.color : "#2a3029" }}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 4, right: 24, bottom: 0, left: -4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              interval="preserveStartEnd"
              minTickGap={48}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              width={34}
              domain={["dataMin - 1", "dataMax + 1"]}
              stroke={SERIES.temp.color}
            />
            <YAxis
              yAxisId="rightPct"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={34}
              domain={[0, 100]}
              stroke={SERIES.humidity.color}
            />
            <YAxis
              yAxisId="rightVpd"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={32}
              domain={[0, "dataMax + 0.4"]}
              stroke={SERIES.vpd.color}
              hide
            />
            {showCo2 && (
              <YAxis
                yAxisId="rightCo2"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={0}
                domain={[0, "dataMax + 100"]}
                stroke={SERIES.co2.color}
                hide
              />
            )}
            <Tooltip
              contentStyle={{
                background: "#0f1613",
                border: "1px solid #243029",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8a9a90" }}
              formatter={(value: number, name: string) => {
                const key = name.toLowerCase() as SeriesKey;
                const s = SERIES[key];
                return [`${value}${s.unit}`, s.label];
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: "#8a9a90" }}
            />
            {keys.map((k) => {
              const s = SERIES[k];
              if (!visible[k]) return null;
              return (
                <Line
                  key={k}
                  yAxisId={s.axis}
                  type="monotone"
                  dataKey={k}
                  name={k}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
