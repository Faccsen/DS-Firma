import { useState } from "react";
import { Thermometer, Droplets, Wind, Sparkles, Plus, Droplet } from "lucide-react";
import { useStore } from "../lib/store";
import { RoomCard } from "./RoomCard";
import { SensorTile } from "./SensorTile";
import { VPDGauge } from "./VPDGauge";
import { HistoryChart } from "./HistoryChart";
import { AddRoomModal } from "./AddRoomModal";

export function Dashboard({ onOpenRoom }: { onOpenRoom: () => void }) {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const selectRoom = useStore((s) => s.selectRoom);
  const active = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const [addOpen, setAddOpen] = useState(false);

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

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="display text-2xl text-cream">Räume</h2>
            <p className="text-[12px] text-muted">{rooms.length} verbundene Grow-Räume</p>
          </div>
          <button onClick={() => setAddOpen(true)} className="btn btn-primary">
            <Plus className="size-4" />
            Raum hinzufügen
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              onOpen={() => {
                selectRoom(r.id);
                onOpenRoom();
              }}
            />
          ))}
        </div>
      </section>

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
            <SensorTile
              label="Dryback"
              value={cs.drybackPct}
              unit="%"
              icon={Wind}
              precision={1}
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <VPDGauge vpd={active.vpd} band={active.targets.vpd} />
          <div className="lg:col-span-2">
            <HistoryChart data={active.history} metric="temp" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HistoryChart data={active.history} metric="humidity" />
          <HistoryChart data={active.history} metric="vpd" />
        </div>
      </section>

      <AddRoomModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
