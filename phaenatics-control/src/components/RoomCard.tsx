import { Thermometer, Droplets, Wind, Sparkles, ChevronRight, Droplet } from "lucide-react";
import type { GrowRoom } from "../lib/types";
import { stageLabel, stageColor, kindLabel, kindColor } from "../lib/labels";

export function RoomCard({ room, onOpen }: { room: GrowRoom; onOpen: () => void }) {
  const onDevices = room.devices.filter((d) => d.on).length;
  return (
    <button
      onClick={onOpen}
      className="card p-5 text-left hover:border-leaf/30 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{room.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`pill ${stageColor(room.stage)}`} title="Wachstumsphase">
              {stageLabel(room.stage)}
            </span>
            {room.kind !== "standard" && (
              <span className={`pill ${kindColor(room.kind)}`} title="Raumtyp">
                {room.kind === "cropsteering" && <Droplet className="size-3" />}
                {kindLabel(room.kind)}
              </span>
            )}
            <span className="text-[11px] text-muted">Tag {room.day}</span>
          </div>
        </div>
        <ChevronRight className="size-4 text-muted group-hover:text-cream transition-colors shrink-0 ml-2" />
      </div>

      <div className="grid grid-cols-4 gap-3 mt-5">
        <Stat icon={Thermometer} value={room.temp.toFixed(1)} unit="°C" />
        <Stat icon={Droplets} value={Math.round(room.humidity).toString()} unit="%" />
        <Stat icon={Wind} value={room.vpd.toFixed(2)} unit="kPa" />
        <Stat icon={Sparkles} value={room.co2.toString()} unit="ppm" />
      </div>

      <div className="mt-5 flex items-center justify-between text-[11px] text-muted">
        <span>
          {onDevices}/{room.devices.length} Geräte aktiv
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`size-1.5 rounded-full ${
              room.lightOn ? "bg-leaf shadow-[0_0_6px_rgba(61,220,132,0.7)]" : "bg-muted/50"
            }`}
          />
          Licht {room.lightOn ? "an" : "aus"}
        </span>
      </div>
    </button>
  );
}

function Stat({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Thermometer;
  value: string;
  unit: string;
}) {
  return (
    <div className="card-2 p-2.5">
      <Icon className="size-3.5 text-muted" />
      <div className="mt-1 flex items-baseline">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        <span className="text-[10px] text-muted ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
