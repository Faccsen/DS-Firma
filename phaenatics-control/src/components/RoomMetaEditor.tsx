import { useStore } from "../lib/store";
import type { GrowRoom, GrowStage } from "../lib/types";
import { stageLabel } from "../lib/labels";

const STAGES: GrowStage[] = ["seedling", "vegetative", "flowering", "drying"];

export function RoomMetaEditor({ room }: { room: GrowRoom }) {
  const setMeta = useStore((s) => s.setRoomMeta);

  const plantedISO = room.plantedAt
    ? new Date(room.plantedAt).toISOString().slice(0, 10)
    : "";

  const toHarvest =
    room.harvestInDays != null ? Math.max(0, room.harvestInDays - room.day) : null;

  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-cream">Lebenszyklus</div>
      <div className="text-[11px] text-muted mt-0.5">
        Phase, Pflanzdatum und Ernte-Zieltage. Tag wird aus Pflanzdatum berechnet.
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="stat-label mb-1">Phase</div>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setMeta(room.id, { stage: s })}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  room.stage === s
                    ? "border-leaf/40 text-leaf bg-leaf/10"
                    : "border-line text-muted hover:text-cream"
                }`}
              >
                {stageLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="stat-label">Pflanzdatum</span>
            <input
              type="date"
              value={plantedISO}
              onChange={(e) => {
                const v = e.target.value;
                setMeta(room.id, {
                  plantedAt: v ? new Date(v).getTime() : undefined,
                });
              }}
              className="mt-1 w-full card-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-cream/40"
            />
          </label>
          <label className="block">
            <span className="stat-label">Ernte in Tagen (Ziel)</span>
            <input
              type="number"
              min={0}
              max={200}
              value={room.harvestInDays ?? ""}
              onChange={(e) =>
                setMeta(room.id, {
                  harvestInDays: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder="z. B. 63"
              className="mt-1 w-full card-2 px-2 py-1.5 text-sm tabular-nums text-fg outline-none focus:border-cream/40"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <Metric label="Aktueller Tag" value={`${room.day}`} />
          <Metric
            label="Ernte-Ziel"
            value={room.harvestInDays ? `${room.harvestInDays}` : "–"}
          />
          <Metric
            label="Verbleibend"
            value={toHarvest != null ? `D-${toHarvest}` : "–"}
          />
        </div>

        {!room.plantedAt && (
          <button
            className="btn btn-primary text-xs"
            onClick={() => setMeta(room.id, { plantedAt: Date.now() })}
          >
            Heute als Pflanzdatum setzen
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-2 p-2.5">
      <div className="stat-label">{label}</div>
      <div className="text-base font-semibold text-fg tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
