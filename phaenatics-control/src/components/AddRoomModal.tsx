import { useState } from "react";
import { X, Plus } from "lucide-react";
import { useStore } from "../lib/store";
import type { GrowStage, RoomKind } from "../lib/types";
import { kindLabel, stageLabel } from "../lib/labels";

interface Props {
  open: boolean;
  onClose: () => void;
}

const KINDS: RoomKind[] = ["standard", "phenohunt", "cropsteering"];
const STAGES: GrowStage[] = ["seedling", "vegetative", "flowering", "drying"];

const PRESETS: Array<{ name: string; kind: RoomKind; stage: GrowStage }> = [
  { name: "Bloom", kind: "standard", stage: "flowering" },
  { name: "Veg", kind: "standard", stage: "vegetative" },
  { name: "Mother", kind: "standard", stage: "vegetative" },
  { name: "Pheno Hunt", kind: "phenohunt", stage: "flowering" },
  { name: "Crop Steering", kind: "cropsteering", stage: "flowering" },
  { name: "Dry", kind: "standard", stage: "drying" },
];

export function AddRoomModal({ open, onClose }: Props) {
  const addRoom = useStore((s) => s.addRoom);
  const rooms = useStore((s) => s.rooms);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RoomKind>("standard");
  const [stage, setStage] = useState<GrowStage>("flowering");

  if (!open) return null;

  function applyPreset(p: (typeof PRESETS)[number]) {
    setKind(p.kind);
    setStage(p.stage);
    // suggest a numbered name based on existing rooms of this kind
    const existing = rooms.filter((r) => r.name.toLowerCase().startsWith(p.name.toLowerCase())).length;
    setName(`${p.name} ${existing + 1}`);
  }

  function submit() {
    const n = name.trim() || `Neuer Raum`;
    addRoom({ name: n, kind, stage });
    setName("");
    setKind("standard");
    setStage("flowering");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="display text-xl text-cream">Raum hinzufügen</h3>
            <p className="text-[12px] text-muted mt-0.5">
              Zone, Zelt oder Flow-Bench — gib ihm einen Namen und wähle den Typ.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost -mr-2 -mt-1" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>

        <div className="stat-label mb-2">Preset</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs rounded-md border border-line text-muted hover:text-cream hover:border-cream/30"
            >
              {p.name}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="stat-label">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="z. B. Bloom 4"
            className="mt-1 w-full card-2 px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-cream/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <div className="stat-label mb-1">Typ</div>
            <div className="flex flex-wrap gap-1">
              {KINDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    kind === k
                      ? "border-cream/40 text-cream bg-cream/10"
                      : "border-line text-muted hover:text-cream"
                  }`}
                >
                  {kindLabel(k)}
                </button>
              ))}
            </div>
          </div>
          <div>
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
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn">
            Abbrechen
          </button>
          <button onClick={submit} className="btn btn-primary">
            <Plus className="size-4" />
            Raum anlegen
          </button>
        </div>
      </div>
    </div>
  );
}
