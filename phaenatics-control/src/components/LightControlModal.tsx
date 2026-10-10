import { useState } from "react";
import { X, Sunrise, Sunset, Zap, Clock } from "lucide-react";
import type { Device, LightScene } from "../lib/types";
import { LIGHT_SCENES, instantPPFD, instantWatts, projectedDLI, sceneDescription, sceneLabel, spectrumGradient } from "../lib/light";
import { useStore } from "../lib/store";
import { DayTimeline } from "./DayTimeline";

interface Props {
  roomId: string;
  device: Device;
  onClose: () => void;
}

export function LightControlModal({ roomId, device, onClose }: Props) {
  const update = useStore((s) => s.updateLightConfig);
  const applyScene = useStore((s) => s.applyLightScene);
  const setSchedule = useStore((s) => s.setDeviceSchedule);
  const setLevel = useStore((s) => s.setDeviceLevel);
  const toggle = useStore((s) => s.toggleDevice);

  const [tab, setTab] = useState<"scene" | "schedule" | "spectrum">("scene");

  const cfg = device.lightConfig;
  if (!cfg) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-5 my-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="display text-xl text-cream">{device.name}</h3>
            <p className="text-[12px] text-muted mt-0.5">
              {sceneLabel(cfg.scene)} · {cfg.wattage} W · Port {device.port} · {cfg.hoursRun.toFixed(0)}h gelaufen
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggle(roomId, device.id)}
              className={`btn text-xs ${device.on ? "btn-primary" : ""}`}
            >
              {device.on ? "Ein" : "Aus"}
            </button>
            <button onClick={onClose} className="btn btn-ghost -mr-2 -mt-1" aria-label="Schließen">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Stat label="Jetzt" value={`${instantWatts(device)} W`} />
          <Stat label="PPFD jetzt" value={`${instantPPFD(device)}`} unit="μmol" />
          <Stat label="PPFD-Ziel" value={`${cfg.ppfdTarget}`} unit="μmol" />
          <Stat label="DLI (projiziert)" value={`${projectedDLI(cfg)}`} unit="mol" />
        </div>

        <div className="mb-3">
          <DayTimeline device={device} height={28} />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-line mt-2">
          {(["scene", "schedule", "spectrum"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                tab === t
                  ? "border-cream text-cream"
                  : "border-transparent text-muted hover:text-cream"
              }`}
            >
              {t === "scene" && "Szene"}
              {t === "schedule" && "Zeitplan"}
              {t === "spectrum" && "Spektrum"}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {tab === "scene" && (
            <SceneTab
              currentScene={cfg.scene}
              onPick={(s) => applyScene(roomId, device.id, s)}
            />
          )}

          {tab === "schedule" && (
            <ScheduleTab
              device={device}
              roomId={roomId}
              onSchedule={(p) => setSchedule(roomId, device.id, p)}
              onPeriod={(onH) =>
                update(roomId, device.id, {
                  photoperiod: { onH, offH: Math.max(0, 24 - onH) },
                })
              }
              onSunrise={(v) => update(roomId, device.id, { sunriseMin: v })}
              onSunset={(v) => update(roomId, device.id, { sunsetMin: v })}
              onLevel={(v) => setLevel(roomId, device.id, v)}
              onPPFD={(v) => update(roomId, device.id, { ppfdTarget: v })}
              onWatt={(v) => update(roomId, device.id, { wattage: v })}
            />
          )}

          {tab === "spectrum" && (
            <SpectrumTab
              roomId={roomId}
              deviceId={device.id}
              spectrum={cfg.spectrum}
              tunable={cfg.tunable}
              onChange={(sp) => update(roomId, device.id, { spectrum: sp })}
              onToggleTunable={(v) => update(roomId, device.id, { tunable: v })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card-2 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1">
        <span className="text-base font-semibold text-fg tabular-nums">{value}</span>
        {unit && <span className="text-[10px] text-muted ml-1">{unit}</span>}
      </div>
    </div>
  );
}

/* ========== Scene tab ========== */

function SceneTab({
  currentScene,
  onPick,
}: {
  currentScene: LightScene;
  onPick: (s: LightScene) => void;
}) {
  return (
    <div>
      <div className="text-[12px] text-muted mb-3">
        Szenen setzen Photoperiode, PPFD-Ziel, Rampen und Spektrum passend zur Pflanzenphase.
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {LIGHT_SCENES.map((s) => {
          const active = currentScene === s;
          return (
            <button
              key={s}
              onClick={() => onPick(s)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                active
                  ? "border-cream/50 bg-cream/10 text-cream"
                  : "border-line text-muted hover:text-cream hover:border-cream/30"
              }`}
            >
              <div className="text-sm font-semibold">{sceneLabel(s)}</div>
              <div className="text-[10px] mt-1 leading-snug">{sceneDescription(s)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========== Schedule tab ========== */

interface ScheduleProps {
  device: Device;
  roomId: string;
  onSchedule: (p: { scheduleOn?: string; scheduleOff?: string }) => void;
  onPeriod: (onH: number) => void;
  onSunrise: (v: number) => void;
  onSunset: (v: number) => void;
  onLevel: (v: number) => void;
  onPPFD: (v: number) => void;
  onWatt: (v: number) => void;
}

const PERIOD_PRESETS: Array<{ onH: number; label: string }> = [
  { onH: 24, label: "24/0" },
  { onH: 20, label: "20/4" },
  { onH: 18, label: "18/6" },
  { onH: 14, label: "14/10" },
  { onH: 12, label: "12/12" },
  { onH: 11, label: "11/13" },
  { onH: 0, label: "0/24" },
];

function ScheduleTab(p: ScheduleProps) {
  const cfg = p.device.lightConfig!;
  return (
    <div className="space-y-4">
      <div>
        <div className="stat-label mb-2">Lichtzyklus</div>
        <div className="flex flex-wrap gap-1 mb-3">
          {PERIOD_PRESETS.map((pre) => (
            <button
              key={pre.label}
              onClick={() => p.onPeriod(pre.onH)}
              className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                cfg.photoperiod.onH === pre.onH
                  ? "border-cream/40 text-cream bg-cream/10"
                  : "border-line text-muted hover:text-cream"
              }`}
            >
              {pre.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TimeField
          label="Lights On"
          value={p.device.scheduleOn ?? "06:00"}
          onChange={(v) => p.onSchedule({ scheduleOn: v })}
        />
        <TimeField
          label="Lights Off"
          value={p.device.scheduleOff ?? "22:00"}
          onChange={(v) => p.onSchedule({ scheduleOff: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RampField
          label="Sunrise"
          icon={<Sunrise className="size-3.5" />}
          value={cfg.sunriseMin}
          onChange={p.onSunrise}
        />
        <RampField
          label="Sunset"
          icon={<Sunset className="size-3.5" />}
          value={cfg.sunsetMin}
          onChange={p.onSunset}
        />
      </div>

      <div className="divider" />

      <Slider
        label="Max-Helligkeit"
        value={p.device.level}
        min={0}
        max={100}
        unit="%"
        onChange={p.onLevel}
      />

      <Slider
        label="PPFD-Ziel"
        value={cfg.ppfdTarget}
        min={0}
        max={1500}
        step={25}
        unit="μmol/m²/s"
        onChange={p.onPPFD}
      />

      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted flex items-center gap-1.5">
          <Zap className="size-3.5" /> Wattage bei 100 %
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={cfg.wattage}
            step={10}
            min={0}
            max={2000}
            onChange={(e) => p.onWatt(Number(e.target.value))}
            className="card-2 px-2 py-1 text-xs tabular-nums w-20 text-right text-fg outline-none focus:border-cream/40"
          />
          <span className="text-[11px] text-muted w-6">W</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[12px] text-muted">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> Betriebsstunden gesamt
        </span>
        <span className="text-fg tabular-nums">{cfg.hoursRun.toFixed(1)} h</span>
      </div>
    </div>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="stat-label">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full card-2 px-2 py-1.5 text-sm tabular-nums text-fg outline-none focus:border-cream/40"
      />
    </label>
  );
}

function RampField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="stat-label flex items-center gap-1.5 mb-1">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2 card-2 px-2 py-1.5">
        <input
          type="range"
          min={0}
          max={60}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-cream"
        />
        <span className="text-xs tabular-nums text-fg w-10 text-right">{value} min</span>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-fg">
          {value}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cream"
      />
    </div>
  );
}

/* ========== Spectrum tab ========== */

function SpectrumTab({
  roomId,
  deviceId,
  spectrum,
  tunable,
  onChange,
  onToggleTunable,
}: {
  roomId: string;
  deviceId: string;
  spectrum: import("../lib/types").LightSpectrum;
  tunable: boolean;
  onChange: (sp: import("../lib/types").LightSpectrum) => void;
  onToggleTunable: (v: boolean) => void;
}) {
  void roomId;
  void deviceId;
  const set = (k: keyof typeof spectrum, v: number) =>
    onChange({ ...spectrum, [k]: v });

  const items: Array<{ key: keyof typeof spectrum; label: string; max: number }> = [
    { key: "uv", label: "UV", max: 30 },
    { key: "blue", label: "Blue", max: 100 },
    { key: "white", label: "White", max: 100 },
    { key: "red", label: "Red", max: 100 },
    { key: "farRed", label: "Far-Red", max: 30 },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-muted">
          Nur bei Panels mit tunable Spektrum (z. B. Mammoth Tunable, Fluence Spydr X Plus).
        </div>
        <label className="text-[11px] text-muted flex items-center gap-2">
          <input
            type="checkbox"
            checked={tunable}
            onChange={(e) => onToggleTunable(e.target.checked)}
            className="accent-cream"
          />
          Tunable
        </label>
      </div>

      <div
        className="h-6 rounded-md border border-line mb-4"
        style={{ background: spectrumGradient(spectrum) }}
        aria-label="Spektrum-Vorschau"
      />

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.key}>
            <div className="flex items-center justify-between text-[11px] text-muted mb-1">
              <span>{it.label}</span>
              <span className="tabular-nums text-fg">{spectrum[it.key]} %</span>
            </div>
            <input
              type="range"
              min={0}
              max={it.max}
              value={spectrum[it.key]}
              disabled={!tunable}
              onChange={(e) => set(it.key, Number(e.target.value))}
              className="w-full accent-cream disabled:opacity-40"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
