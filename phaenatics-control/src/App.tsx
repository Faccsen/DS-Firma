import { useEffect, useState } from "react";
import { Sidebar, type View } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Dashboard } from "./components/Dashboard";
import { RoomDetail } from "./components/RoomDetail";
import { HistoryView } from "./components/HistoryView";
import { SettingsView } from "./components/SettingsView";
import { LightsView } from "./components/LightsView";
import { AlertsView } from "./components/AlertsView";
import { ZonesView } from "./components/ZonesView";
import { MobileNav } from "./components/MobileNav";
import { TrichomeBackground } from "./components/TrichomeBackground";
import { InstallPrompt } from "./components/InstallPrompt";
import { useStore } from "./lib/store";

export default function App() {
  const [view, setView] = useState<View>("dashboard");
  const tick = useStore((s) => s.tick);
  const rooms = useStore((s) => s.rooms);
  const alerts = useStore((s) => s.alerts);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const hasAc = useStore((s) => !!s.connection.ac);
  const hasHa = useStore((s) => !!s.connection.ha?.verified);
  const hasTapo = useStore((s) => !!s.connection.tapo);
  const hasTuya = useStore((s) => !!s.connection.tuya);
  const pollingSec = useStore((s) => s.connection.pollingSec);
  const pollAcInfinity = useStore((s) => s.pollAcInfinity);
  const pollHomeAssistant = useStore((s) => s.pollHomeAssistant);
  const pollTapo = useStore((s) => s.pollTapo);
  const pollTuya = useStore((s) => s.pollTuya);
  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0];
  const activeAlerts = alerts.filter((a) => !a.endedAt).length;

  useEffect(() => {
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, [tick]);

  // Live polling of AC Infinity cloud when connected
  useEffect(() => {
    if (!hasAc) return;
    pollAcInfinity();
    const id = setInterval(pollAcInfinity, Math.max(10, pollingSec) * 1000);
    return () => clearInterval(id);
  }, [hasAc, pollingSec, pollAcInfinity]);

  // Live polling of Home Assistant when connected
  useEffect(() => {
    if (!hasHa) return;
    pollHomeAssistant();
    const id = setInterval(pollHomeAssistant, Math.max(10, pollingSec) * 1000);
    return () => clearInterval(id);
  }, [hasHa, pollingSec, pollHomeAssistant]);

  // Live polling of Tapo cloud when connected
  useEffect(() => {
    if (!hasTapo) return;
    pollTapo();
    const id = setInterval(pollTapo, Math.max(10, pollingSec) * 1000);
    return () => clearInterval(id);
  }, [hasTapo, pollingSec, pollTapo]);

  // Live polling of Tuya OpenAPI (SmartLife) when connected
  useEffect(() => {
    if (!hasTuya) return;
    pollTuya();
    const id = setInterval(pollTuya, Math.max(10, pollingSec) * 1000);
    return () => clearInterval(id);
  }, [hasTuya, pollingSec, pollTuya]);

  const titles: Record<View, string> = {
    dashboard: "Übersicht",
    zones: "Zonen",
    room: room?.name ?? "Räume",
    lights: "Lampen",
    alerts: "Alarme",
    history: "Verlauf",
    settings: "Einstellungen",
  };

  const subtitles: Record<View, string> = {
    dashboard: `${rooms.length} Räume · Live-Klima`,
    zones: `${rooms.length} Räume`,
    room: "Geräte, Zielwerte & Journal",
    lights: "Alle Lampen aller Räume",
    alerts: `${activeAlerts} aktiv`,
    history: "Was wurde wann geändert",
    settings: "App & Geräteoptionen",
  };

  return (
    <div className="min-h-screen flex">
      <TrichomeBackground />
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
          {view === "history" && <HistoryView />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>
      <MobileNav view={view} onView={setView} />
      <InstallPrompt />
    </div>
  );
}
