import { LayoutDashboard, Cpu, Bell, BarChart3, Settings, Activity } from "lucide-react";
import { useStore } from "../lib/store";
import { PhaenaticsSeal } from "./Brand";

type View = "dashboard" | "room" | "automation" | "history" | "settings";

interface Props {
  view: View;
  onView: (v: View) => void;
}

export function Sidebar({ view, onView }: Props) {
  const rooms = useStore((s) => s.rooms);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const selectRoom = useStore((s) => s.selectRoom);

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "room", label: "Geräte", icon: Cpu },
    { id: "automation", label: "Automation", icon: Bell },
    { id: "history", label: "Verlauf", icon: BarChart3 },
    { id: "settings", label: "Einstellungen", icon: Settings },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-line bg-panel/60 backdrop-blur">
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <PhaenaticsSeal size={44} />
        <div className="min-w-0">
          <div className="display text-cream text-2xl leading-none">Phaenatics</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted mt-1.5">
            Control · Lüneburg
          </div>
        </div>
      </div>

      <div className="mx-5 h-px bg-line" />

      <nav className="px-3 mt-4 space-y-1">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onView(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-cream/10 text-cream"
                  : "text-muted hover:text-cream hover:bg-panel2/60"
              }`}
            >
              <Icon className="size-4" />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 px-5 stat-label">Räume</div>
      <div className="px-3 mt-2 space-y-1">
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              selectRoom(r.id);
              if (view === "dashboard") onView("room");
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeRoomId === r.id
                ? "bg-panel2/80 text-cream"
                : "text-muted hover:text-cream hover:bg-panel2/50"
            }`}
          >
            <span className="truncate">{r.name}</span>
            <span
              className={`size-2 rounded-full ${
                r.lightOn
                  ? "bg-leaf shadow-[0_0_8px_0_rgba(141,212,168,0.7)]"
                  : "bg-muted/50"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="mt-auto px-5 py-4 text-[11px] text-muted flex items-center gap-2 border-t border-line">
        <Activity className="size-3.5" />
        Live · Sim Mode
      </div>
    </aside>
  );
}

export type { View };
