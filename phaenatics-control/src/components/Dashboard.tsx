import { Thermometer, Droplets, Wind, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { RoomCard } from "./RoomCard";
import { SensorTile } from "./SensorTile";
import { VPDGauge } from "./VPDGauge";
import { HistoryChart } from "./HistoryChart";

export function Dashboard({ onOpenRoom }: { onOpenRoom: () => void }) {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const selectRoom = useStore((s) => s.selectRoom);
  const active = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  return (
    <div className="px-4 md:px-6 py-6 space-y-6">
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Räume</h2>
            <p className="text-[12px] text-muted">{rooms.length} verbundene Grow-Räume</p>
          </div>
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
            <h2 className="text-lg font-semibold">{active.name}</h2>
            <p className="text-[12px] text-muted">Live-Klima · {active.devices.filter((d) => d.on).length} Geräte aktiv</p>
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
    </div>
  );
}
