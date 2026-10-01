import type { GrowRoom } from "../lib/types";
import { useStore } from "../lib/store";

export function TargetEditor({ room }: { room: GrowRoom }) {
  const setTarget = useStore((s) => s.setTarget);

  const rows: Array<{
    key: "temp" | "humidity" | "vpd";
    label: string;
    unit: string;
    step: number;
    min: number;
    max: number;
  }> = [
    { key: "temp", label: "Temperatur", unit: "°C", step: 0.5, min: 10, max: 35 },
    { key: "humidity", label: "Luftfeuchte", unit: "%", step: 1, min: 20, max: 90 },
    { key: "vpd", label: "VPD", unit: "kPa", step: 0.1, min: 0.2, max: 2.4 },
  ];

  return (
    <div className="card p-5">
      <div className="text-sm font-semibold">Zielbereiche</div>
      <div className="text-[11px] text-muted">
        Phase: bestimmt empfohlene Werte. Du kannst sie hier feinjustieren.
      </div>
      <div className="mt-4 space-y-4">
        {rows.map((r) => {
          const b = room.targets[r.key];
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between text-[11px] text-muted mb-1">
                <span>{r.label}</span>
                <span className="tabular-nums text-fg">
                  {b.min} – {b.max} {r.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="card-2 px-3 py-2 text-xs flex items-center gap-2">
                  <span className="text-muted">Min</span>
                  <input
                    type="number"
                    step={r.step}
                    min={r.min}
                    max={b.max}
                    value={b.min}
                    onChange={(e) =>
                      setTarget(room.id, r.key, { ...b, min: Number(e.target.value) })
                    }
                    className="bg-transparent w-full text-fg outline-none tabular-nums"
                  />
                </label>
                <label className="card-2 px-3 py-2 text-xs flex items-center gap-2">
                  <span className="text-muted">Max</span>
                  <input
                    type="number"
                    step={r.step}
                    min={b.min}
                    max={r.max}
                    value={b.max}
                    onChange={(e) =>
                      setTarget(room.id, r.key, { ...b, max: Number(e.target.value) })
                    }
                    className="bg-transparent w-full text-fg outline-none tabular-nums"
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
