import { Pause, Play, Wifi, Bell, AlertCircle, Cloud, X } from "lucide-react";
import { useStore } from "../lib/store";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const tickEnabled = useStore((s) => s.tickEnabled);
  const setTick = useStore((s) => s.setTick);
  const hasAc = useStore((s) => !!s.connection.ac);
  const hasHa = useStore((s) => !!s.connection.ha);
  const connectionError = useStore((s) => s.connectionError);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const connectionMode: "sim" | "acinfinity" | "homeassistant" | "mixed" =
    hasAc && hasHa ? "mixed" : hasAc ? "acinfinity" : hasHa ? "homeassistant" : "sim";

  return (
    <>
      <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-line bg-panel/40 backdrop-blur sticky top-0 z-10">
        <div className="min-w-0">
          <div className="display text-lg leading-tight text-cream truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-muted truncate">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {connectionMode === "sim" ? (
            <span className="pill">
              <Wifi className="size-3" /> Sim
            </span>
          ) : (
            <span
              className={`pill ${
                connectionStatus === "error"
                  ? "text-danger border-danger/30 bg-danger/10"
                  : connectionStatus === "polling"
                    ? "text-info border-info/30 bg-info/10"
                    : "text-leaf border-leaf/30 bg-leaf/10"
              }`}
              title={
                connectionMode === "mixed"
                  ? "AC Infinity + Home Assistant"
                  : connectionMode === "acinfinity"
                    ? "AC Infinity Cloud"
                    : "Home Assistant"
              }
            >
              <Cloud className="size-3" />
              {connectionStatus === "error"
                ? "Fehler"
                : connectionStatus === "polling"
                  ? "Sync"
                  : connectionMode === "mixed"
                    ? "AC+HA"
                    : connectionMode === "homeassistant"
                      ? "HA"
                      : "AC"}
            </span>
          )}
          <button
            onClick={() => setTick(!tickEnabled)}
            className="btn"
            title={tickEnabled ? "Simulation pausieren" : "Simulation starten"}
          >
            {tickEnabled ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span className="hidden sm:inline">{tickEnabled ? "Live" : "Pausiert"}</span>
          </button>
          <button className="btn btn-ghost" aria-label="Benachrichtigungen">
            <Bell className="size-4" />
          </button>
        </div>
      </header>

      {connectionError && (
        <div className="sticky top-14 z-10 bg-danger/10 border-b border-danger/30 px-4 md:px-6 py-2 flex items-start gap-3">
          <AlertCircle className="size-4 text-danger shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 text-[12px] text-fg">
            <span className="font-semibold text-danger">AC Infinity:</span> {connectionError}
          </div>
          <button
            onClick={() => useStore.setState({ connectionError: undefined })}
            className="btn btn-ghost shrink-0 -mr-2 -mt-0.5"
            aria-label="Fehler schließen"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
