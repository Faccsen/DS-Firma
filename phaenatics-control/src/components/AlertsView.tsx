import { useMemo } from "react";
import { AlertTriangle, Check, CheckCheck, Trash2 } from "lucide-react";
import { useStore } from "../lib/store";
import type { Alert } from "../lib/types";
import { metricLabel, metricUnit } from "../lib/alerts";

export function AlertsView() {
  const alerts = useStore((s) => s.alerts);
  const rooms = useStore((s) => s.rooms);
  const ack = useStore((s) => s.acknowledgeAlert);
  const ackAll = useStore((s) => s.acknowledgeAllAlerts);
  const clear = useStore((s) => s.clearResolvedAlerts);
  const selectRoom = useStore((s) => s.selectRoom);

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? "–";

  const sorted = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        if (!!a.endedAt !== !!b.endedAt) return a.endedAt ? 1 : -1;
        return b.startedAt - a.startedAt;
      }),
    [alerts],
  );

  const active = sorted.filter((a) => !a.endedAt);
  const resolved = sorted.filter((a) => a.endedAt);
  const unackActive = active.filter((a) => !a.acknowledged).length;

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-cream">Alarme</h2>
          <p className="text-[12px] text-muted">
            {active.length} aktiv · {resolved.length} aufgelöst
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unackActive > 0 && (
            <button onClick={ackAll} className="btn btn-primary">
              <CheckCheck className="size-4" />
              Alle bestätigen ({unackActive})
            </button>
          )}
          {resolved.length > 0 && (
            <button onClick={clear} className="btn">
              <Trash2 className="size-4" />
              Aufgelöste löschen
            </button>
          )}
        </div>
      </section>

      {active.length === 0 && (
        <div className="card p-8 text-center">
          <div className="size-10 mx-auto rounded-full bg-leaf/15 grid place-items-center text-leaf mb-3">
            <Check className="size-5" />
          </div>
          <div className="text-sm font-semibold text-cream">Alles im grünen Bereich</div>
          <div className="text-[12px] text-muted mt-1">
            Keine Räume außerhalb der Zielwerte. Weiter so.
          </div>
        </div>
      )}

      {active.length > 0 && (
        <section>
          <div className="stat-label mb-2">Aktuell aktiv</div>
          <div className="space-y-2">
            {active.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                roomName={roomName(a.roomId)}
                onAck={() => ack(a.id)}
                onJump={() => selectRoom(a.roomId)}
              />
            ))}
          </div>
        </section>
      )}

      {resolved.length > 0 && (
        <section>
          <div className="stat-label mb-2">Historie</div>
          <div className="space-y-2 opacity-80">
            {resolved.slice(0, 50).map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                roomName={roomName(a.roomId)}
                onAck={() => {}}
                onJump={() => selectRoom(a.roomId)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  roomName,
  onAck,
  onJump,
}: {
  alert: Alert;
  roomName: string;
  onAck: () => void;
  onJump: () => void;
}) {
  const sevColor =
    alert.severity === "bad"
      ? "text-danger border-danger/30 bg-danger/10"
      : "text-warn border-warn/30 bg-warn/10";
  const duration = (alert.endedAt ?? Date.now()) - alert.startedAt;
  const dmin = Math.max(1, Math.round(duration / 60000));
  const out =
    alert.value < alert.threshold.min
      ? `${alert.value}${metricUnit(alert.metric)} < Min ${alert.threshold.min}`
      : `${alert.value}${metricUnit(alert.metric)} > Max ${alert.threshold.max}`;

  return (
    <div className="card-2 p-3 flex items-center gap-3">
      <div className={`size-9 rounded-lg border grid place-items-center shrink-0 ${sevColor}`}>
        <AlertTriangle className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onJump}
            className="text-sm font-medium text-cream hover:underline truncate"
          >
            {roomName}
          </button>
          <span className="pill">{metricLabel(alert.metric)}</span>
          {alert.acknowledged && !alert.endedAt && (
            <span className="pill text-leaf border-leaf/30 bg-leaf/10">Bestätigt</span>
          )}
          {alert.endedAt && (
            <span className="pill">aufgelöst</span>
          )}
        </div>
        <div className="text-[11px] text-muted mt-0.5 truncate">
          {out} · seit {formatAgo(alert.startedAt)} ({dmin} min)
        </div>
      </div>
      {!alert.endedAt && !alert.acknowledged && (
        <button onClick={onAck} className="btn text-xs">
          <Check className="size-3.5" />
          OK
        </button>
      )}
    </div>
  );
}

function formatAgo(t: number): string {
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} d`;
}
