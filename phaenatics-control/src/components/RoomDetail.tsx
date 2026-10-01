import { Thermometer, Droplets, Wind, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { DeviceControl } from "./DeviceControl";
import { SensorTile } from "./SensorTile";
import { VPDGauge } from "./VPDGauge";
import { TargetEditor } from "./TargetEditor";
import { stageLabel, stageColor } from "../lib/labels";

export function RoomDetail() {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-cream">{room.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`pill ${stageColor(room.stage)}`}>{stageLabel(room.stage)}</span>
            <span className="text-[11px] text-muted">Tag {room.day}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SensorTile
          label="Temperatur"
          value={room.temp}
          unit="°C"
          icon={Thermometer}
          band={room.targets.temp}
          current={room.temp}
        />
        <SensorTile
          label="Luftfeuchte"
          value={room.humidity}
          unit="%"
          icon={Droplets}
          band={room.targets.humidity}
          current={room.humidity}
          precision={0}
        />
        <SensorTile
          label="VPD"
          value={room.vpd}
          unit="kPa"
          icon={Wind}
          band={room.targets.vpd}
          current={room.vpd}
          precision={2}
        />
        <SensorTile
          label="CO₂"
          value={room.co2}
          unit="ppm"
          icon={Sparkles}
          precision={0}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <VPDGauge vpd={room.vpd} band={room.targets.vpd} />
        <div className="lg:col-span-2">
          <TargetEditor room={room} />
        </div>
      </section>

      <section>
        <h3 className="display text-xl text-cream mb-3">Geräte · UIS Ports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {room.devices.map((d) => (
            <DeviceControl key={d.id} roomId={room.id} device={d} />
          ))}
        </div>
      </section>
    </div>
  );
}
