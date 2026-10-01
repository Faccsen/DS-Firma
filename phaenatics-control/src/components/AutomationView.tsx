import { useStore } from "../lib/store";
import { AutomationRules } from "./AutomationRules";

export function AutomationView() {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <div>
        <h2 className="display text-2xl text-cream">{room.name} · Automation</h2>
        <p className="text-[12px] text-muted">
          Sensor-gesteuerte Regeln. Werden in jedem Live-Tick ausgewertet.
        </p>
      </div>
      <AutomationRules room={room} />
    </div>
  );
}
