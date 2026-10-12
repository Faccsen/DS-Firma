import { useState } from "react";
import { Thermometer, Droplets, Wind, Sparkles, Settings2, Plus } from "lucide-react";
import { useStore } from "../lib/store";
import { DeviceControl } from "./DeviceControl";
import { SensorTile } from "./SensorTile";
import { VPDGauge } from "./VPDGauge";
import { TargetEditor } from "./TargetEditor";
import { CropSteeringView } from "./CropSteeringView";
import { RoomJournal } from "./RoomJournal";
import { RoomMetaEditor } from "./RoomMetaEditor";
import { CombinedChart } from "./CombinedChart";
import { EditRoomModal } from "./EditRoomModal";
import { AddDeviceModal } from "./AddDeviceModal";
import { stageLabel, stageColor, kindLabel, kindColor } from "../lib/labels";

export function RoomDetail() {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const [editOpen, setEditOpen] = useState(false);
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);

  if (!room) {
    return (
      <div className="px-4 md:px-6 py-10 text-center text-muted">
        Noch kein Raum ausgewählt.
      </div>
    );
  }

  if (room.kind === "cropsteering") {
    return <CropSteeringView room={room} />;
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-cream">{room.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`pill ${stageColor(room.stage)}`}>{stageLabel(room.stage)}</span>
            {room.kind !== "standard" && (
              <span className={`pill ${kindColor(room.kind)}`}>{kindLabel(room.kind)}</span>
            )}
            <span className="text-[11px] text-muted">Tag {room.day}</span>
            {room.harvestInDays && (
              <span className="pill text-cream border-cream/30 bg-cream/10">
                🌾 D-{Math.max(0, room.harvestInDays - room.day)}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setEditOpen(true)} className="btn">
          <Settings2 className="size-4" />
          Raum bearbeiten
        </button>
      </section>

      {editOpen && (
        <EditRoomModal room={room} onClose={() => setEditOpen(false)} />
      )}

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
        <CombinedChart data={room.history} />
      </section>

      <section>
        <div className="flex items-end justify-between mb-3 gap-3">
          <h3 className="display text-xl text-cream">Geräte</h3>
          <button
            onClick={() => setAddDeviceOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="size-4" />
            Gerät hinzufügen
          </button>
        </div>
        {room.devices.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            Noch keine Geräte in diesem Raum. Tippe oben rechts auf{" "}
            <span className="text-cream">„Gerät hinzufügen"</span>, um
            AC-Infinity-Ports, Tapo- oder SmartLife-Geräte zu scannen oder
            ein manuelles Platzhalter-Gerät anzulegen.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {room.devices.map((d) => (
              <DeviceControl key={d.id} roomId={room.id} device={d} />
            ))}
          </div>
        )}
      </section>

      {addDeviceOpen && (
        <AddDeviceModal roomId={room.id} onClose={() => setAddDeviceOpen(false)} />
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RoomMetaEditor room={room} />
        <RoomJournal room={room} />
      </section>
    </div>
  );
}
