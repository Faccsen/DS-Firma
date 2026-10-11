import { useState } from "react";
import { X, Save, Trash2, Copy, AlertTriangle } from "lucide-react";
import { useStore } from "../lib/store";
import type { GrowRoom, GrowStage, RoomKind } from "../lib/types";
import { kindLabel, stageLabel } from "../lib/labels";

interface Props {
  room: GrowRoom;
  onClose: () => void;
  onDeleted?: () => void;
}

const STAGES: GrowStage[] = ["seedling", "vegetative", "flowering", "drying"];
const KINDS: RoomKind[] = ["standard", "phenohunt", "cropsteering"];

export function EditRoomModal({ room, onClose, onDeleted }: Props) {
  const renameRoom = useStore((s) => s.renameRoom);
  const setMeta = useStore((s) => s.setRoomMeta);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const duplicateRoom = useStore((s) => s.duplicateRoom);

  const [name, setName] = useState(room.name);
  const [stage, setStage] = useState<GrowStage>(room.stage);
  const [harvestInDays, setHarvestInDays] = useState<number | "">(
    room.harvestInDays ?? "",
  );
  const [plantedISO, setPlantedISO] = useState(
    room.plantedAt ? new Date(room.plantedAt).toISOString().slice(0, 10) : "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    if (name.trim() && name !== room.name) renameRoom(room.id, name.trim());
    const patch: Parameters<typeof setMeta>[1] = {};
    if (stage !== room.stage) patch.stage = stage;
    const newHarvest = harvestInDays === "" ? undefined : Number(harvestInDays);
    if (newHarvest !== room.harvestInDays) patch.harvestInDays = newHarvest;
    const newPlanted = plantedISO ? new Date(plantedISO).getTime() : undefined;
    if (newPlanted !== room.plantedAt) patch.plantedAt = newPlanted;
    if (Object.keys(patch).length) setMeta(room.id, patch);
    onClose();
  }

  function doDelete() {
    deleteRoom(room.id);
    onClose();
    onDeleted?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-5 my-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="display text-xl text-cream">Raum bearbeiten</h3>
            <p className="text-[12px] text-muted mt-0.5">
              Name, Phase und Lebenszyklus. {kindLabel(room.kind)} · {room.devices.length} Geräte.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost -mr-2 -mt-1" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>

        <label className="block">
          <span className="stat-label">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40"
          />
        </label>

        <div className="mt-4">
          <div className="stat-label mb-1">Phase</div>
          <div className="flex flex-wrap gap-1">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                  stage === s
                    ? "border-leaf/40 text-leaf bg-leaf/10"
                    : "border-line text-muted hover:text-cream"
                }`}
              >
                {stageLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="block">
            <span className="stat-label">Pflanzdatum</span>
            <input
              type="date"
              value={plantedISO}
              onChange={(e) => setPlantedISO(e.target.value)}
              className="mt-1 w-full card-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-cream/40"
            />
          </label>
          <label className="block">
            <span className="stat-label">Ernte in Tagen (Ziel)</span>
            <input
              type="number"
              min={0}
              max={200}
              value={harvestInDays}
              onChange={(e) =>
                setHarvestInDays(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mt-1 w-full card-2 px-2 py-1.5 text-sm tabular-nums text-fg outline-none focus:border-cream/40"
            />
          </label>
        </div>

        <div className="card-2 p-3 mt-4 text-[11px] text-muted">
          Raumtyp (<span className="text-fg">{kindLabel(room.kind)}</span>) kann nicht
          nachträglich geändert werden — stattdessen den Raum duplizieren oder einen
          neuen anlegen. Zugelassene Typen: {KINDS.map(kindLabel).join(", ")}.
        </div>

        <div className="flex items-center justify-between gap-2 mt-6">
          <button
            onClick={() => {
              duplicateRoom(room.id);
              onClose();
            }}
            className="btn text-xs"
          >
            <Copy className="size-3.5" />
            Duplizieren
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn">
              Abbrechen
            </button>
            <button onClick={save} className="btn btn-primary">
              <Save className="size-4" />
              Speichern
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 pt-4 border-t border-danger/20">
          <div className="flex items-center gap-2 text-[11px] text-danger mb-2">
            <AlertTriangle className="size-3.5" />
            <span className="uppercase tracking-wider font-semibold">Danger Zone</span>
          </div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn text-xs text-danger border-danger/30 hover:bg-danger/10"
            >
              <Trash2 className="size-3.5" />
              Raum löschen
            </button>
          ) : (
            <div className="card-2 p-3 border-danger/30 bg-danger/5">
              <div className="text-[12px] text-fg mb-2">
                „{room.name}" wirklich löschen? Alle Journale, Regeln und Historie gehen verloren.
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn text-xs">
                  Doch nicht
                </button>
                <button
                  onClick={doDelete}
                  className="btn text-xs bg-danger/90 text-fg border-danger"
                >
                  <Trash2 className="size-3.5" />
                  Endgültig löschen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
