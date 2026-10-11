import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useStore } from "../lib/store";
import type { GrowRoom, JournalTag } from "../lib/types";

const TAGS: Array<{ key: JournalTag; label: string; icon: string }> = [
  { key: "watering", label: "Gegossen", icon: "💧" },
  { key: "feeding", label: "Gefüttert", icon: "🧪" },
  { key: "ph", label: "pH gemessen", icon: "🧫" },
  { key: "defoliation", label: "Entlaubt", icon: "✂️" },
  { key: "transplant", label: "Umgetopft", icon: "🪴" },
  { key: "ipm", label: "IPM", icon: "🪲" },
  { key: "harvest", label: "Geerntet", icon: "🌾" },
  { key: "note", label: "Notiz", icon: "📝" },
];

export function RoomJournal({ room }: { room: GrowRoom }) {
  const addJournal = useStore((s) => s.addJournal);
  const deleteJournal = useStore((s) => s.deleteJournal);

  const [tag, setTag] = useState<JournalTag>("watering");
  const [text, setText] = useState("");

  function submit() {
    if (!text.trim()) return;
    addJournal(room.id, tag, text.trim());
    setText("");
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-cream">Journal</div>
          <div className="text-[11px] text-muted">
            Zeitgestempelte Notizen · {room.journal.length} Einträge
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {TAGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTag(t.key)}
            className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
              tag === t.key
                ? "border-cream/40 text-cream bg-cream/10"
                : "border-line text-muted hover:text-cream"
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submit()}
          placeholder="z. B. pH am Runoff 6.1, EC 4.8"
          className="flex-1 card-2 px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-cream/40"
        />
        <button onClick={submit} className="btn btn-primary">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Hinzufügen</span>
        </button>
      </div>

      {room.journal.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {room.journal.slice(0, 20).map((e) => {
            const meta = TAGS.find((t) => t.key === e.tag);
            return (
              <div key={e.id} className="card-2 p-2.5 flex items-start gap-3">
                <span className="text-base leading-none mt-0.5">{meta?.icon ?? "📝"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-fg">{e.text}</div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {new Date(e.t).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {meta && ` · ${meta.label}`}
                  </div>
                </div>
                <button
                  onClick={() => deleteJournal(room.id, e.id)}
                  className="btn btn-ghost -mr-1"
                  aria-label="Löschen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
