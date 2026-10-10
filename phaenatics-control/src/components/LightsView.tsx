import { useMemo, useState } from "react";
import { Lightbulb, Zap, Clock, Sun, Settings2 } from "lucide-react";
import { useStore } from "../lib/store";
import type { Device, GrowRoom } from "../lib/types";
import { effectiveLightPct, instantPPFD, instantWatts, LIGHT_SCENES, projectedDLI, sceneLabel } from "../lib/light";
import { DayTimeline } from "./DayTimeline";
import { LightControlModal } from "./LightControlModal";

interface Lamp {
  room: GrowRoom;
  device: Device;
}

export function LightsView() {
  const rooms = useStore((s) => s.rooms);
  const [editing, setEditing] = useState<{ roomId: string; deviceId: string } | null>(null);

  const lamps: Lamp[] = useMemo(
    () =>
      rooms.flatMap((r) =>
        r.devices
          .filter((d) => d.type === "light" && d.lightConfig)
          .map((d) => ({ room: r, device: d })),
      ),
    [rooms],
  );

  const totals = useMemo(() => {
    const activeLamps = lamps.filter((l) => effectiveLightPct(l.device) > 0).length;
    const watts = lamps.reduce((s, l) => s + instantWatts(l.device), 0);
    const dli = lamps.reduce((s, l) => s + projectedDLI(l.device.lightConfig!), 0);
    const avgPPFD =
      lamps.length === 0
        ? 0
        : Math.round(lamps.reduce((s, l) => s + instantPPFD(l.device), 0) / lamps.length);
    return { activeLamps, watts, dli: +dli.toFixed(1), avgPPFD };
  }, [lamps]);

  const activeEditing = editing
    ? lamps.find((l) => l.room.id === editing.roomId && l.device.id === editing.deviceId)
    : null;

  const grouped = useMemo(() => {
    const by = new Map<string, Lamp[]>();
    for (const l of lamps) {
      const arr = by.get(l.room.id) ?? [];
      arr.push(l);
      by.set(l.room.id, arr);
    }
    return Array.from(by.entries());
  }, [lamps]);

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section>
        <h2 className="display text-2xl text-cream">Lampen</h2>
        <p className="text-[12px] text-muted">
          {lamps.length} Lampen in {rooms.length} Räumen · {totals.activeLamps} aktuell leuchtend
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Aktive Lampen" value={`${totals.activeLamps}/${lamps.length}`} icon={Lightbulb} />
        <Stat label="Live-Leistung" value={`${totals.watts}`} unit="W" icon={Zap} />
        <Stat label="Ø PPFD" value={`${totals.avgPPFD}`} unit="μmol" icon={Sun} />
        <Stat label="Σ DLI (Tag)" value={`${totals.dli}`} unit="mol" icon={Clock} />
      </section>

      <section className="space-y-4">
        {grouped.map(([roomId, lampsOfRoom]) => {
          const room = lampsOfRoom[0].room;
          const roomWatts = lampsOfRoom.reduce((s, l) => s + instantWatts(l.device), 0);
          return (
            <div key={roomId} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-cream/10 text-cream grid place-items-center border border-cream/20">
                    <Lightbulb className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-cream">{room.name}</div>
                    <div className="text-[11px] text-muted">
                      {lampsOfRoom.length} Lampen · {roomWatts} W live
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {lampsOfRoom.map(({ device }) => (
                  <LampRow
                    key={device.id}
                    device={device}
                    onEdit={() => setEditing({ roomId, deviceId: device.id })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {activeEditing && (
        <LightControlModal
          roomId={activeEditing.room.id}
          device={activeEditing.device}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function LampRow({ device, onEdit }: { device: Device; onEdit: () => void }) {
  const cfg = device.lightConfig!;
  const pct = effectiveLightPct(device);
  const applyScene = useStore((s) => s.applyLightScene);
  const toggle = useStore((s) => s.toggleDevice);

  return (
    <div className="card-2 p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-fg truncate">{device.name}</span>
            <span className="pill">
              {sceneLabel(cfg.scene)}
            </span>
            <span className="text-[11px] text-muted">
              {cfg.photoperiod.onH}/{cfg.photoperiod.offH}
            </span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {cfg.wattage} W · PPFD-Ziel {cfg.ppfdTarget} · {cfg.hoursRun.toFixed(0)} h
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-semibold text-fg tabular-nums">
              {pct.toFixed(0)}%
            </div>
            <div className="text-[10px] text-muted">
              {instantPPFD(device)} μmol
            </div>
          </div>
          <button onClick={onEdit} className="btn btn-ghost" aria-label="Konfigurieren">
            <Settings2 className="size-4" />
          </button>
        </div>
      </div>

      <DayTimeline device={device} height={18} />

      <div className="mt-3 flex flex-wrap gap-1">
        {LIGHT_SCENES.filter((s) => s !== "manual").map((s) => (
          <button
            key={s}
            onClick={() => applyScene(deviceRoomId(device), device.id, s)}
            className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
              cfg.scene === s
                ? "border-cream/40 text-cream bg-cream/10"
                : "border-line text-muted hover:text-cream"
            }`}
          >
            {sceneLabel(s)}
          </button>
        ))}
        <button
          onClick={() => toggle(deviceRoomId(device), device.id)}
          className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ml-auto ${
            device.on ? "border-leaf/40 text-leaf bg-leaf/10" : "border-line text-muted"
          }`}
        >
          {device.on ? "An" : "Aus"}
        </button>
      </div>
    </div>
  );
}

/** Walk the store once to find which room owns a device — avoids drilling props. */
function deviceRoomId(device: Device): string {
  const rooms = useStore.getState().rooms;
  for (const r of rooms) if (r.devices.some((d) => d.id === device.id)) return r.id;
  return "";
}

function Stat({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Lightbulb;
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="size-9 rounded-lg bg-cream/10 text-cream border border-cream/20 grid place-items-center">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div>
          <span className="text-lg font-semibold text-fg tabular-nums">{value}</span>
          {unit && <span className="text-[10px] text-muted ml-1">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
