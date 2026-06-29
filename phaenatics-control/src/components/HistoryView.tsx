import { useState } from "react";
import { useStore } from "../lib/store";
import { HistoryChart } from "./HistoryChart";

type Metric = "temp" | "humidity" | "vpd" | "co2";

const TABS: { key: Metric; label: string }[] = [
  { key: "temp", label: "Temperatur" },
  { key: "humidity", label: "Luftfeuchte" },
  { key: "vpd", label: "VPD" },
  { key: "co2", label: "CO₂" },
];

export function HistoryView() {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const [metric, setMetric] = useState<Metric>("temp");

  const min = Math.min(...room.history.map((p) => p[metric]));
  const max = Math.max(...room.history.map((p) => p[metric]));
  const avg = room.history.reduce((s, p) => s + p[metric], 0) / Math.max(room.history.length, 1);

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{room.name} · Verlauf</h2>
        <p className="text-[12px] text-muted">Letzte 24 Stunden</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setMetric(t.key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              metric === t.key
                ? "border-leaf/40 text-leaf bg-leaf/10"
                : "border-line text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Min" value={min} metric={metric} />
        <Stat label="Ø" value={avg} metric={metric} />
        <Stat label="Max" value={max} metric={metric} />
      </div>

      <HistoryChart data={room.history} metric={metric} />
    </div>
  );
}

function Stat({ label, value, metric }: { label: string; value: number; metric: Metric }) {
  const unit = metric === "temp" ? "°C" : metric === "humidity" ? "%" : metric === "vpd" ? "kPa" : "ppm";
  const precision = metric === "vpd" ? 2 : metric === "co2" ? 0 : 1;
  return (
    <div className="card p-4">
      <div className="stat-label">{label}</div>
      <div className="mt-1">
        <span className="stat-value">{value.toFixed(precision)}</span>
        <span className="stat-unit">{unit}</span>
      </div>
    </div>
  );
}
