import { useMemo, useState } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Sparkles,
  Plus,
  Droplet,
  AlertTriangle,
  Lightbulb,
  Zap,
  Gauge,
  Scissors,
  Grid3x3,
} from "lucide-react";
import { useStore } from "../lib/store";
import { RoomCard } from "./RoomCard";
import { SensorTile } from "./SensorTile";
import { VPDGauge } from "./VPDGauge";
import { HistoryChart } from "./HistoryChart";
import { AddRoomModal } from "./AddRoomModal";
import { activeAlerts as computeAlerts } from "../lib/alerts";
import { instantPPFD, instantWatts } from "../lib/light";
import type { RoomKind } from "../lib/types";

type Filter = "all" | RoomKind;

interface Props {
  onOpenRoom: () => void;
  onOpenAlerts?: () => void;
  onOpenLights?: () => void;
}

export function Dashboard({ onOpenRoom, onOpenAlerts, onOpenLights }: Props) {
  const rooms = useStore((s) => s.rooms);
  const alerts = useStore((s) => s.alerts);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const selectRoom = useStore((s) => s.selectRoom);
  const active = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  // Hero stats
  const stats = useMemo(() => {
    const activeAlertCount = alerts.filter((a) => !a.endedAt).length;
    let lamps = 0;
    let activeLamps = 0;
    let watts = 0;
    let ppfdSum = 0;
    for (const r of rooms) {
      for (const d of r.devices) {
        if (d.type !== "light" || !d.lightConfig) continue;
        lamps++;
        const w = instantWatts(d);
        if (w > 0) activeLamps++;
        watts += w;
        ppfdSum += instantPPFD(d);
      }
    }
    const avgVPD = rooms.length ? rooms.reduce((s, r) => s + r.vpd, 0) / rooms.length : 0;
    return {
      activeAlertCount,
      lamps,
      activeLamps,
      watts,
      avgPPFD: lamps ? Math.round(ppfdSum / lamps) : 0,
      avgVPD: +avgVPD.toFixed(2),
      harvestSoon: rooms.filter((r) => daysToHarvest(r.day, r.harvestInDays) <= 7 && daysToHarvest(r.day, r.harvestInDays) >= 0).length,
    };
  }, [rooms, alerts]);

  const needsAttention = useMemo(
    () => rooms.filter((r) => computeAlerts(r).length > 0),
    [rooms],
  );

  const filtered = useMemo(
    () => (filter === "all" ? rooms : rooms.filter((r) => r.kind === filter)),
    [rooms, filter],
  );

  if (!active) {
    return (
      <div className="px-4 md:px-6 py-10 text-center">
        <p className="text-muted mb-4">Noch keine Räume angelegt.</p>
        <button onClick={() => setAddOpen(true)} className="btn btn-primary">
          <Plus className="size-4" />
          Ersten Raum anlegen
        </button>
        <AddRoomModal open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    );
  }

  const cs = active.cropSteering;
  const filters: Array<{ k: Filter; label: string; icon: typeof Grid3x3 }> = [
    { k: "all", label: "Alle", icon: Grid3x3 },
    { k: "standard", label: "Standard", icon: Grid3x3 },
    { k: "phenohunt", label: "Pheno Hunt", icon: Scissors },
    { k: "cropsteering", label: "Crop Steering", icon: Droplet },
  ];

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      {/* Hero stats row */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <HeroStat
          label="Räume"
          value={rooms.length}
          icon={Grid3x3}
        />
        <HeroStat
          label="Alarme"
          value={stats.activeAlertCount}
          icon={AlertTriangle}
          tone={stats.activeAlertCount > 0 ? "warn" : "ok"}
          onClick={onOpenAlerts}
        />
        <HeroStat
          label="Lampen aktiv"
          value={`${stats.activeLamps}/${stats.lamps}`}
          icon={Lightbulb}
          onClick={onOpenLights}
        />
        <HeroStat
          label="Live Watt"
          value={`${stats.watts}`}
          unit="W"
          icon={Zap}
        />
        <HeroStat
          label="Ø VPD"
          value={stats.avgVPD}
          unit="kPa"
          icon={Gauge}
          precision={2}
        />
      </section>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <section className="card border-warn/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warn" />
              <h3 className="text-sm font-semibold text-cream">
                Aufmerksamkeit nötig · {needsAttention.length} Räume
              </h3>
            </div>
            {onOpenAlerts && (
              <button className="btn btn-ghost text-xs" onClick={onOpenAlerts}>
                Alle Alarme →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {needsAttention.slice(0, 6).map((r) => {
              const live = computeAlerts(r);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    selectRoom(r.id);
                    onOpenRoom();
                  }}
                  className="card-2 p-3 text-left hover:border-warn/40 transition-colors"
                >
                  <div className="text-sm font-medium text-cream truncate">{r.name}</div>
                  <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {live.map((c) => (
                      <span
                        key={c.metric}
                        className={`pill ${c.severity === "bad" ? "text-danger border-danger/30 bg-danger/10" : "text-warn border-warn/30 bg-warn/10"}`}
                      >
                        {c.metric.toUpperCase()} {c.value.toFixed(1)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Rooms list */}
      <section>
        <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
          <div>
            <h2 className="display text-2xl text-cream">Räume</h2>
            <p className="text-[12px] text-muted">
              {filtered.length} von {rooms.length} angezeigt
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {filters.map((f) => (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                    filter === f.k
                      ? "border-cream/40 text-cream bg-cream/10"
                      : "border-line text-muted hover:text-cream"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => setAddOpen(true)} className="btn btn-primary">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Raum</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              onOpen={() => {
                selectRoom(r.id);
                onOpenRoom();
              }}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted text-sm">
              Keine Räume mit diesem Filter.
            </div>
          )}
        </div>
      </section>

      {/* Active room detail preview */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="display text-2xl text-cream">{active.name}</h2>
            <p className="text-[12px] text-muted">
              Live-Klima · {active.devices.filter((d) => d.on).length} Geräte aktiv
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SensorTile
            label="Temperatur"
            value={active.temp}
            unit="°C"
            icon={Thermometer}
            band={active.targets.temp}
            current={active.temp}
          />
          <SensorTile
            label="Luftfeuchte"
            value={active.humidity}
            unit="%"
            icon={Droplets}
            band={active.targets.humidity}
            current={active.humidity}
            precision={0}
          />
          <SensorTile
            label="VPD"
            value={active.vpd}
            unit="kPa"
            icon={Wind}
            band={active.targets.vpd}
            current={active.vpd}
            precision={2}
          />
          <SensorTile
            label="CO₂"
            value={active.co2}
            unit="ppm"
            icon={Sparkles}
            precision={0}
          />
        </div>

        {cs && (
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SensorTile
              label="VWC"
              value={cs.vwc}
              unit="%"
              icon={Droplet}
              band={{ min: cs.fieldCapacity - cs.drybackTargetPct, max: cs.fieldCapacity }}
              current={cs.vwc}
            />
            <SensorTile label="EC Substrat" value={cs.ecSubstrate} unit="mS/cm" icon={Sparkles} precision={2} />
            <SensorTile label="pH Substrat" value={cs.phSubstrate} unit="" icon={Droplet} precision={2} />
            <SensorTile label="Dryback" value={cs.drybackPct} unit="%" icon={Wind} precision={1} />
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <VPDGauge vpd={active.vpd} band={active.targets.vpd} />
          <div className="lg:col-span-2">
            <HistoryChart data={active.history} metric="temp" />
          </div>
        </div>
      </section>

      <AddRoomModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function daysToHarvest(day: number, total?: number): number {
  if (!total) return Infinity;
  return total - day;
}

function HeroStat({
  label,
  value,
  unit,
  icon: Icon,
  tone,
  onClick,
  precision,
}: {
  label: string;
  value: number | string;
  unit?: string;
  icon: typeof Grid3x3;
  tone?: "ok" | "warn";
  onClick?: () => void;
  precision?: number;
}) {
  const toneCls =
    tone === "warn"
      ? "border-warn/40 bg-warn/10"
      : "border-line";
  const iconCls =
    tone === "warn"
      ? "text-warn border-warn/30 bg-warn/10"
      : "text-cream border-cream/20 bg-cream/10";
  const Wrap: React.ElementType = onClick ? "button" : "div";
  const display =
    typeof value === "number" && precision != null ? value.toFixed(precision) : String(value);
  return (
    <Wrap
      onClick={onClick}
      className={`card p-3 flex items-center gap-3 ${toneCls} ${onClick ? "text-left hover:border-cream/30 transition-colors" : ""}`}
    >
      <div className={`size-9 rounded-lg border grid place-items-center shrink-0 ${iconCls}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div>
          <span className="text-lg font-semibold text-fg tabular-nums">{display}</span>
          {unit && <span className="text-[10px] text-muted ml-1">{unit}</span>}
        </div>
      </div>
    </Wrap>
  );
}
