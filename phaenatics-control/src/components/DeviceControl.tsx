import {
  Fan,
  Lightbulb,
  Droplets,
  Snowflake,
  Flame,
  Wind,
  Sparkles,
  Power,
} from "lucide-react";
import type { Device, DeviceMode } from "../lib/types";
import { useStore } from "../lib/store";

const ICON: Record<Device["type"], typeof Fan> = {
  fan: Fan,
  intake: Wind,
  exhaust: Fan,
  light: Lightbulb,
  humidifier: Droplets,
  dehumidifier: Snowflake,
  heater: Flame,
  ac: Snowflake,
  co2: Sparkles,
};

const LEVEL_MAX: Record<Device["type"], number> = {
  fan: 10,
  intake: 10,
  exhaust: 10,
  light: 100,
  humidifier: 100,
  dehumidifier: 100,
  heater: 100,
  ac: 30,
  co2: 100,
};

const LEVEL_UNIT: Record<Device["type"], string> = {
  fan: "",
  intake: "",
  exhaust: "",
  light: "%",
  humidifier: "%",
  dehumidifier: "%",
  heater: "%",
  ac: "°C",
  co2: "%",
};

export function DeviceControl({ roomId, device }: { roomId: string; device: Device }) {
  const toggle = useStore((s) => s.toggleDevice);
  const setLevel = useStore((s) => s.setDeviceLevel);
  const setMode = useStore((s) => s.setDeviceMode);

  const Icon = ICON[device.type];
  const max = LEVEL_MAX[device.type];
  const unit = LEVEL_UNIT[device.type];
  const modes: DeviceMode[] = ["auto", "manual", "schedule", "off"];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`size-10 rounded-xl grid place-items-center border ${
              device.on
                ? "bg-leaf/10 text-leaf border-leaf/30"
                : "bg-panel2 text-muted border-line"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-sm font-medium">{device.name}</div>
            <div className="text-[11px] text-muted">
              Port {device.port} · {labelType(device.type)}
            </div>
          </div>
        </div>
        <button
          onClick={() => toggle(roomId, device.id)}
          className={`size-10 rounded-xl grid place-items-center border transition-colors ${
            device.on
              ? "bg-leaf text-bg border-leaf hover:bg-leaf-600"
              : "bg-panel2 text-muted border-line hover:text-fg"
          }`}
          aria-label={device.on ? "Ausschalten" : "Einschalten"}
        >
          <Power className="size-4" />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-muted mb-1">
          <span>{device.type === "ac" ? "Soll" : "Leistung"}</span>
          <span className="tabular-nums text-fg">
            {device.level}
            {unit}
          </span>
        </div>
        <input
          type="range"
          min={device.type === "ac" ? 16 : 0}
          max={max}
          step={max > 10 ? 1 : 1}
          value={device.level}
          onChange={(e) => setLevel(roomId, device.id, Number(e.target.value))}
          className="w-full accent-leaf"
          disabled={!device.on}
        />
      </div>

      <div className="flex items-center gap-1">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(roomId, device.id, m)}
            className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
              device.mode === m
                ? "border-leaf/40 text-leaf bg-leaf/10"
                : "border-line text-muted hover:text-fg"
            }`}
          >
            {labelMode(m)}
          </button>
        ))}
      </div>

      {device.mode === "schedule" && (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Zeitplan</span>
          <span className="tabular-nums text-fg">
            {device.scheduleOn ?? "--:--"} → {device.scheduleOff ?? "--:--"}
          </span>
        </div>
      )}
    </div>
  );
}

function labelType(t: Device["type"]) {
  return (
    {
      fan: "Lüfter",
      intake: "Zuluft",
      exhaust: "Abluft",
      light: "Licht",
      humidifier: "Befeuchter",
      dehumidifier: "Entfeuchter",
      heater: "Heizung",
      ac: "Klima",
      co2: "CO₂",
    } as const
  )[t];
}

function labelMode(m: DeviceMode) {
  return ({ auto: "Auto", manual: "Manuell", schedule: "Zeitplan", off: "Aus" } as const)[m];
}
