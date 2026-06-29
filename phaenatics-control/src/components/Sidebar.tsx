import { Leaf, LayoutDashboard, Cpu, Bell, BarChart3, Settings, Activity } from "lucide-react";
import { useStore } from "../lib/store";

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
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-line bg-panel/60 backdrop-blur">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="size-9 rounded-xl bg-leaf/15 grid place-items-center shadow-glow">
          <Leaf className="size-5 text-leaf" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">Phaenatics</div>
          <div className="text-[11px] text-muted -mt-0.5">Control</div>
        </div>
      </div>

      <nav className="px-3 mt-2 space-y-1">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onView(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-leaf/10 text-leaf" : "text-muted hover:text-fg hover:bg-panel2"
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
              activeRoomId === r.id ? "bg-panel2 text-fg" : "text-muted hover:text-fg hover:bg-panel2"
            }`}
          >
            <span className="truncate">{r.name}</span>
            <span
              className={`size-2 rounded-full ${
                r.lightOn ? "bg-leaf shadow-[0_0_8px_0_rgba(61,220,132,0.6)]" : "bg-muted/50"
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
