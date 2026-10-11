import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { RoomDetail } from "./components/RoomDetail";
import { AutomationView } from "./components/AutomationView";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { LightsView } from "./components/LightsView";
import { AlertsView } from "./components/AlertsView";
import { ZonesView } from "./components/ZonesView";
import { MobileNav } from "./components/MobileNav";
import { BackgroundSeal } from "./components/BackgroundSeal";
import { InstallPrompt } from "./components/InstallPrompt";
import { useStore } from "./lib/store";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const tick = useStore((s) => s.tick);
  const rooms = useStore((s) => s.rooms);
  const alerts = useStore((s) => s.alerts);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const activeAlerts = alerts.filter((a) => !a.endedAt).length;

  useEffect(() => {
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tick]);

  const titles: Record<View, string> = {
    dashboard: "Übersicht",
    zones: "Zonen",
    room: room?.name ?? "Räume",
    lights: "Lampen",
    alerts: "Alarme",
    automation: "Automation",
    history: "Verlauf",
    settings: "Einstellungen",
  };

  const subtitles: Record<View, string> = {
    dashboard: `${rooms.length} Räume · Live-Klima`,
    zones: `${rooms.length} Räume`,
    room: "Geräte, Zielwerte & Journal",
    lights: "Alle Lampen aller Räume",
    alerts: `${activeAlerts} aktiv`,
    automation: "Sensor-Regeln",
    history: "Sensorverlauf",
    settings: "App & Geräteoptionen",
  };

  return (
    <div className="min-h-screen flex">
      <BackgroundSeal />
      <Sidebar view={view} onView={setView} />
      <main className="flex-1 min-w-0 flex flex-col pb-16 md:pb-0">
        <TopBar title={titles[view]} subtitle={subtitles[view]} />
        <div className="flex-1 min-w-0">
          {view === "dashboard" && (
            <Dashboard
              onOpenRoom={() => setView("room")}
              onOpenAlerts={() => setView("alerts")}
              onOpenLights={() => setView("lights")}
            />
          )}
          {view === "zones" && <ZonesView onOpenRoom={() => setView("room")} />}
          {view === "room" && <RoomDetail />}
          {view === "lights" && <LightsView />}
          {view === "alerts" && <AlertsView />}
          {view === "automation" && <AutomationView />}
          {view === "history" && <HistoryView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
      <MobileNav view={view} onView={setView} />
      <InstallPrompt />
    </div>
  );
}
