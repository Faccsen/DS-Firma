import { Pause, Play, Wifi, Bell } from "lucide-react";
import { useStore } from "../lib/store";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const tickEnabled = useStore((s) => s.tickEnabled);
  const setTick = useStore((s) => s.setTick);

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-line bg-panel/40 backdrop-blur sticky top-0 z-10">
      <div className="min-w-0">
        <div className="display text-lg leading-tight text-cream truncate">{title}</div>
        {subtitle && <div className="text-[11px] text-muted truncate">{subtitle}</div>}
      </div>
      <div className="flex items-center gap-2">
        <span className="pill">
          <Wifi className="size-3" /> Online
        </span>
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
  );
}
