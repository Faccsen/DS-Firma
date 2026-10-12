import { Droplet, AlertTriangle, ChevronRight } from "lucide-react";
import { useStore } from "../lib/store";
import { stageLabel, stageColor, kindLabel, kindColor } from "../lib/labels";
import { activeAlerts } from "../lib/alerts";

export function ZonesView({ onOpenRoom }: { onOpenRoom: () => void }) {
  const rooms = useStore((s) => s.rooms);
  const selectRoom = useStore((s) => s.selectRoom);

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      <section>
        <h2 className="display text-2xl text-cream">Zonen</h2>
        <p className="text-[12px] text-muted">{rooms.length} Räume · Tippe für Details</p>
      </section>

      {rooms.length === 0 && (
        <div className="card p-6 text-center text-muted text-sm">
          Noch keine Zonen angelegt. Lege im Dashboard einen Raum an oder
          verbinde eine Cloud (AC Infinity / Tapo / SmartLife) in den
          Einstellungen.
        </div>
      )}

      <div className="space-y-1.5">
        {rooms.map((r) => {
          const alerts = activeAlerts(r);
          const worst = alerts.find((a) => a.severity === "bad") ? "bad" : alerts[0]?.severity;
          const toHarvest = r.harvestInDays ? r.harvestInDays - r.day : null;
          const borderCls = worst === "bad"
            ? "border-danger/30"
            : worst === "warn"
              ? "border-warn/30"
              : "border-line";

          return (
            <button
              key={r.id}
              onClick={() => {
                selectRoom(r.id);
                onOpenRoom();
              }}
              className={`card-2 p-3 w-full flex items-center gap-3 text-left transition-colors hover:border-cream/30 ${borderCls}`}
            >
              <span
                className={`size-2 rounded-full shrink-0 ${
                  r.lightOn
                    ? "bg-leaf shadow-[0_0_6px_rgba(141,212,168,0.7)]"
                    : "bg-muted/40"
                }`}
                title={r.lightOn ? "Licht an" : "Licht aus"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg truncate">{r.name}</span>
                  {alerts.length > 0 && (
                    <span
                      className={`pill ${
                        worst === "bad"
                          ? "text-danger border-danger/30 bg-danger/10"
                          : "text-warn border-warn/30 bg-warn/10"
                      }`}
                    >
                      <AlertTriangle className="size-3" />
                      {alerts.length}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className={`pill ${stageColor(r.stage)}`}>{stageLabel(r.stage)}</span>
                  {r.kind !== "standard" && (
                    <span className={`pill ${kindColor(r.kind)}`}>
                      {r.kind === "cropsteering" && <Droplet className="size-3" />}
                      {kindLabel(r.kind)}
                    </span>
                  )}
                  <span>Tag {r.day}</span>
                  {toHarvest !== null && toHarvest >= 0 && toHarvest <= 14 && (
                    <span className="pill text-cream border-cream/30 bg-cream/10">
                      🌾 D-{toHarvest}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
