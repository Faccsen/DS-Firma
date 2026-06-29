import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { RoomDetail } from "./components/RoomDetail";
import { AutomationView } from "./components/AutomationView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { MobileNav } from "./components/MobileNav";
import { useStore } from "./lib/store";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const tick = useStore((s) => s.tick);
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];

  useEffect(() => {
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tick]);

  const title = {
    dashboard: "Übersicht",
    room: room.name,
    automation: "Automation",
    history: "Verlauf",
    settings: "Einstellungen",
  }[view];

  const subtitle = {
    dashboard: `${rooms.length} Räume · Live-Klima`,
    room: "Geräte & Zielwerte",
    automation: "Sensor-Regeln",
    history: "Sensorverlauf",
    settings: "App & Geräteoptionen",
  }[view];

  return (
    <div className="min-h-screen flex">
      <Sidebar view={view} onView={setView} />
      <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        <TopBar title={title} subtitle={subtitle} />
        <div className="flex-1 min-w-0">
          {view === "dashboard" && <Dashboard onOpenRoom={() => setView("room")} />}
          {view === "room" && <RoomDetail />}
          {view === "automation" && <AutomationView />}
          {view === "history" && <HistoryView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
      <MobileNav view={view} onView={setView} />
    </div>
  );
}
