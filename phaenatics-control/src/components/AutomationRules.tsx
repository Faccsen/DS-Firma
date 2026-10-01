import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AutomationRule, GrowRoom } from "../lib/types";
import { useStore } from "../lib/store";

export function AutomationRules({ room }: { room: GrowRoom }) {
  const toggleRule = useStore((s) => s.toggleRule);
  const deleteRule = useStore((s) => s.deleteRule);
  const addRule = useStore((s) => s.addRule);

  const [draft, setDraft] = useState<Omit<AutomationRule, "id">>({
    enabled: true,
    label: "",
    when: "temp",
    op: ">",
    value: 27,
    deviceId: room.devices[0]?.id ?? "",
    action: "on",
  });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Automationen</div>
          <div className="text-[11px] text-muted">
            Wenn-Dann-Regeln · greifen bei jedem Sensor-Tick
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {room.rules.length === 0 && (
          <div className="text-sm text-muted py-6 text-center border border-dashed border-line rounded-lg">
            Noch keine Regeln. Erstelle unten deine erste.
          </div>
        )}
        {room.rules.map((r) => {
          const dev = room.devices.find((d) => d.id === r.deviceId);
          return (
            <div key={r.id} className="card-2 p-3 flex items-center gap-3">
              <button
                onClick={() => toggleRule(room.id, r.id)}
                className={`relative h-6 w-10 rounded-full border transition-colors ${
                  r.enabled
                    ? "bg-leaf/20 border-leaf/40"
                    : "bg-panel border-line"
                }`}
                aria-label="Regel umschalten"
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full transition-all ${
                    r.enabled ? "left-[18px] bg-leaf" : "left-0.5 bg-muted"
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{r.label}</div>
                <div className="text-[11px] text-muted truncate">
                  Wenn {labelMetric(r.when)} {r.op} {r.value}
                  {unitFor(r.when)} → {dev?.name ?? "?"} {labelAction(r.action)}
                </div>
              </div>
              <button
                onClick={() => deleteRule(room.id, r.id)}
                className="btn btn-ghost"
                aria-label="Regel löschen"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="divider my-5" />

      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <input
          className="md:col-span-2 card-2 px-3 py-2 text-sm placeholder-muted focus:outline-none focus:border-leaf/40"
          placeholder="Bezeichnung"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        <select
          className="card-2 px-2 py-2 text-sm"
          value={draft.when}
          onChange={(e) => setDraft({ ...draft, when: e.target.value as AutomationRule["when"] })}
        >
          <option value="temp">Temp</option>
          <option value="humidity">rF</option>
          <option value="vpd">VPD</option>
          <option value="co2">CO₂</option>
        </select>
        <select
          className="card-2 px-2 py-2 text-sm"
          value={draft.op}
          onChange={(e) => setDraft({ ...draft, op: e.target.value as AutomationRule["op"] })}
        >
          <option value=">">&gt;</option>
          <option value="<">&lt;</option>
        </select>
        <input
          type="number"
          step="0.1"
          className="card-2 px-3 py-2 text-sm"
          value={draft.value}
          onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
        />
        <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            className="card-2 px-2 py-2 text-sm"
            value={draft.deviceId}
            onChange={(e) => setDraft({ ...draft, deviceId: e.target.value })}
          >
            {room.devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="card-2 px-2 py-2 text-sm"
            value={draft.action}
            onChange={(e) =>
              setDraft({ ...draft, action: e.target.value as AutomationRule["action"] })
            }
          >
            <option value="on">Einschalten</option>
            <option value="off">Ausschalten</option>
            <option value="boost">Boost</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!draft.label.trim() || !draft.deviceId) return;
              addRule(room.id, draft);
              setDraft({ ...draft, label: "" });
            }}
          >
            <Plus className="size-4" />
            Regel hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

function labelMetric(m: AutomationRule["when"]) {
  return ({ temp: "Temperatur", humidity: "rF", vpd: "VPD", co2: "CO₂" } as const)[m];
}

function labelAction(a: AutomationRule["action"]) {
  return ({ on: "einschalten", off: "ausschalten", boost: "Boost" } as const)[a];
}

function unitFor(w: AutomationRule["when"]) {
  return w === "temp" ? "°C" : w === "humidity" ? "%" : w === "vpd" ? "kPa" : "ppm";
}
