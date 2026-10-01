import {
  Droplet,
  Sparkles,
  Thermometer,
  Zap,
  Play,
  Trash2,
  Copy,
} from "lucide-react";
import type { GrowRoom, IrrigationPhase, SteeringStrategy } from "../lib/types";
import { useStore } from "../lib/store";
import {
  phaseColor,
  phaseLabel,
  stageColor,
  stageLabel,
  strategyDescription,
  strategyLabel,
} from "../lib/labels";
import { SensorTile } from "./SensorTile";
import { DeviceControl } from "./DeviceControl";
import { IrrigationChart } from "./IrrigationChart";

const PHASES: IrrigationPhase[] = ["P0", "P1", "P2", "P3"];
const STRATEGIES: SteeringStrategy[] = ["vegetative", "transition", "generative"];

export function CropSteeringView({ room }: { room: GrowRoom }) {
  const setStrategy = useStore((s) => s.setSteeringStrategy);
  const updateSteering = useStore((s) => s.updateSteering);
  const triggerShot = useStore((s) => s.triggerShot);
  const deleteRoom = useStore((s) => s.deleteRoom);
  const duplicateRoom = useStore((s) => s.duplicateRoom);

  const cs = room.cropSteering;
  if (!cs) return null;

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-cream">{room.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`pill ${stageColor(room.stage)}`}>
              {stageLabel(room.stage)}
            </span>
            <span className="pill text-cream border-cream/30 bg-cream/10">
              <Droplet className="size-3" /> Crop Steering
            </span>
            <span className="text-[11px] text-muted">Tag {room.day}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => duplicateRoom(room.id)} className="btn" title="Duplizieren">
            <Copy className="size-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Raum "${room.name}" wirklich löschen?`)) deleteRoom(room.id);
            }}
            className="btn text-danger border-danger/30 hover:bg-danger/10"
            title="Löschen"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-cream">Aktuelle Phase</div>
            <div className="text-[11px] text-muted">
              Lights {cs.lightsOn} → {cs.lightsOff}
            </div>
          </div>
          <button onClick={() => triggerShot(room.id)} className="btn btn-primary text-xs">
            <Play className="size-3.5" />
            Shot auslösen
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PHASES.map((p) => (
            <div
              key={p}
              className={`p-3 rounded-lg border text-center transition-colors ${
                cs.phase === p
                  ? phaseColor(p)
                  : "border-line text-muted bg-panel2/60"
              }`}
            >
              <div className="text-base font-semibold tabular-nums">{p}</div>
              <div className="text-[10px] mt-0.5">{phaseLabel(p)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SensorTile
          label="VWC Substrat"
          value={cs.vwc}
          unit="%"
          icon={Droplet}
          band={{ min: cs.fieldCapacity - cs.drybackTargetPct, max: cs.fieldCapacity }}
          current={cs.vwc}
          precision={1}
        />
        <SensorTile
          label="EC Substrat"
          value={cs.ecSubstrate}
          unit="mS/cm"
          icon={Zap}
          precision={2}
        />
        <SensorTile
          label="pH Substrat"
          value={cs.phSubstrate}
          unit=""
          icon={Droplet}
          band={{ min: 5.5, max: 6.3 }}
          current={cs.phSubstrate}
          precision={2}
        />
        <SensorTile
          label="Substrat-Temp"
          value={cs.substrateTemp}
          unit="°C"
          icon={Thermometer}
          band={{ min: 20, max: 25 }}
          current={cs.substrateTemp}
          precision={1}
        />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SensorTile
          label="Dryback"
          value={cs.drybackPct}
          unit="%"
          icon={Droplet}
          band={{ min: cs.drybackTargetPct * 0.5, max: cs.drybackTargetPct }}
          current={cs.drybackPct}
          precision={1}
        />
        <SensorTile label="Feed EC" value={cs.ecFeed} unit="mS/cm" icon={Zap} precision={2} />
        <SensorTile label="Feed pH" value={cs.phFeed} unit="" icon={Droplet} precision={2} />
        <SensorTile
          label="Runoff"
          value={cs.runoffPct}
          unit="%"
          icon={Sparkles}
          precision={0}
        />
      </section>

      <section>
        <IrrigationChart cs={cs} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="text-sm font-semibold text-cream">Steering-Strategie</div>
          <div className="text-[11px] text-muted mt-0.5">
            Presets setzen Dryback, Shot-Größen und Intervalle in einem Schritt.
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(room.id, s)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  cs.strategy === s
                    ? "border-cream/40 bg-cream/10 text-cream"
                    : "border-line text-muted hover:text-cream"
                }`}
              >
                <div className="text-sm font-semibold">{strategyLabel(s)}</div>
                <div className="text-[10px] mt-1 leading-snug">
                  {s === "vegetative" && "Viele kleine Shots · 5–15% DB"}
                  {s === "transition" && "Mittlerer Dryback · 10–20% DB"}
                  {s === "generative" && "Wenige große Shots · 20–35% DB"}
                </div>
              </button>
            ))}
          </div>
          <div className="divider my-5" />
          <div className="text-[12px] text-muted leading-relaxed">
            {strategyDescription(cs.strategy)}
          </div>
        </div>

        <div className="card p-5">
          <div className="text-sm font-semibold text-cream">Bewässerungs-Zeitplan</div>
          <div className="text-[11px] text-muted mt-0.5">
            Werte beziehen sich auf den Lichtzyklus.
          </div>
          <div className="mt-4 space-y-3">
            <Row label="Lights On / Off" value={`${cs.lightsOn} / ${cs.lightsOff}`} />
            <Row label="P1-Start (nach Lights-On)" value={`${cs.p1StartMin} min`} />
            <Row
              label="P1-Shot"
              editable
              onChange={(v) => updateSteering(room.id, { p1ShotPct: v })}
              step={0.5}
              min={1}
              max={10}
              current={cs.p1ShotPct}
              unit="%"
            />
            <Row
              label="P2-Shot"
              editable
              onChange={(v) => updateSteering(room.id, { p2ShotPct: v })}
              step={0.5}
              min={0.5}
              max={6}
              current={cs.p2ShotPct}
              unit="%"
            />
            <Row
              label="P2-Intervall"
              editable
              onChange={(v) => updateSteering(room.id, { p2IntervalMin: v })}
              step={5}
              min={15}
              max={180}
              current={cs.p2IntervalMin}
              unit="min"
            />
            <Row
              label="P3-Start (vor Lights-Off)"
              editable
              onChange={(v) => updateSteering(room.id, { p3StartMinBeforeOff: v })}
              step={15}
              min={30}
              max={240}
              current={cs.p3StartMinBeforeOff}
              unit="min"
            />
            <Row
              label="Dryback-Ziel"
              editable
              onChange={(v) => updateSteering(room.id, { drybackTargetPct: v })}
              step={1}
              min={5}
              max={40}
              current={cs.drybackTargetPct}
              unit="%"
            />
            <Row
              label="Field Capacity"
              editable
              onChange={(v) => updateSteering(room.id, { fieldCapacity: v })}
              step={1}
              min={50}
              max={80}
              current={cs.fieldCapacity}
              unit="%"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="display text-xl text-cream mb-3">Geräte</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {room.devices.map((d) => (
            <DeviceControl key={d.id} roomId={room.id} device={d} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface RowProps {
  label: string;
  value?: string;
  editable?: boolean;
  current?: number;
  onChange?: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}

function Row({ label, value, editable, current, onChange, step, min, max, unit }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-muted">{label}</span>
      {editable && typeof current === "number" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={current}
            step={step}
            min={min}
            max={max}
            onChange={(e) => onChange?.(Number(e.target.value))}
            className="card-2 px-2 py-1 text-xs tabular-nums w-20 text-right text-fg outline-none focus:border-cream/40"
          />
          {unit && <span className="text-[11px] text-muted w-10">{unit}</span>}
        </div>
      ) : (
        <span className="text-sm text-cream tabular-nums">{value}</span>
      )}
    </div>
  );
}
