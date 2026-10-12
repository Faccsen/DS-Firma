import { Pause, Play, Wifi, Bell, AlertCircle, Cloud, X } from "lucide-react";
import { useStore } from "../lib/store";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const tickEnabled = useStore((s) => s.tickEnabled);
  const setTick = useStore((s) => s.setTick);
  const hasAc = useStore((s) => !!s.connection.ac);
  const hasTapo = useStore((s) => !!s.connection.tapo);
  const hasTuya = useStore((s) => !!s.connection.tuya);
  const connectionError = useStore((s) => s.connectionError);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const activeCount = (hasAc ? 1 : 0) + (hasTapo ? 1 : 0) + (hasTuya ? 1 : 0);
  const connectionMode: "sim" | "acinfinity" | "tapo" | "tuya" | "mixed" =
    activeCount > 1
      ? "mixed"
      : hasAc
        ? "acinfinity"
        : hasTapo
          ? "tapo"
          : hasTuya
            ? "tuya"
            : "sim";
  const modeShort =
    connectionMode === "mixed"
      ? [hasAc && "AC", hasTapo && "Tapo", hasTuya && "SL"].filter(Boolean).join("+")
      : connectionMode === "acinfinity"
        ? "AC"
        : connectionMode === "tapo"
          ? "Tapo"
          : connectionMode === "tuya"
            ? "SL"
            : "Sim";
  const modeLong =
    connectionMode === "mixed"
      ? [hasAc && "AC Infinity", hasTapo && "Tapo", hasTuya && "SmartLife"]
          .filter(Boolean)
          .join(" + ")
      : connectionMode === "acinfinity"
        ? "AC Infinity Cloud"
        : connectionMode === "tapo"
          ? "Tapo Cloud"
          : connectionMode === "tuya"
            ? "SmartLife (Tuya) Cloud"
            : "Simulation";

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
              title={modeLong}
            >
              <Cloud className="size-3" />
              {connectionStatus === "error"
                ? "Fehler"
                : connectionStatus === "polling"
                  ? "Sync"
                  : modeShort}
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
            <span className="font-semibold text-danger">Verbindung:</span> {connectionError}
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
