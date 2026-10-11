import { useState } from "react";
import {
  LayoutDashboard,
  Cpu,
  Bell,
  BarChart3,
  Settings,
  Activity,
  Plus,
  Droplet,
  Lightbulb,
  AlertTriangle,
  LayoutList,
} from "lucide-react";
import { useStore } from "../lib/store";
import { PhaenaticsSeal } from "./Brand";
import { AddRoomModal } from "./AddRoomModal";

type View =
  | "dashboard"
  | "zones"
  | "room"
  | "lights"
  | "alerts"
  | "automation"
  | "history"
  | "settings";

interface Props {
  view: View;
  onView: (v: View) => void;
}

export function Sidebar({ view, onView }: Props) {
  const rooms = useStore((s) => s.rooms);
  const alerts = useStore((s) => s.alerts);
  const activeRoomId = useStore((s) => s.activeRoomId);
  const selectRoom = useStore((s) => s.selectRoom);
  const [addOpen, setAddOpen] = useState(false);
  const activeAlerts = alerts.filter((a) => !a.endedAt).length;

  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "zones", label: "Zonen", icon: LayoutList },
    { id: "room", label: "Geräte", icon: Cpu },
    { id: "lights", label: "Lampen", icon: Lightbulb },
    { id: "alerts", label: "Alarme", icon: AlertTriangle, badge: activeAlerts },
    { id: "automation", label: "Automation", icon: Bell },
    { id: "history", label: "Verlauf", icon: BarChart3 },
    { id: "settings", label: "Einstellungen", icon: Settings },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-72 shrink-0 border-r border-line bg-panel/60 backdrop-blur h-screen sticky top-0">
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

      <nav className="px-3 mt-4 space-y-1 shrink-0">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = view === n.id;
          const badge = "badge" in n ? n.badge : undefined;
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
              <span className="flex-1 text-left">{n.label}</span>
              {typeof badge === "number" && badge > 0 && (
                <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-danger/80 text-fg">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 px-5 flex items-center justify-between shrink-0">
        <span className="stat-label">Räume ({rooms.length})</span>
        <button
          onClick={() => setAddOpen(true)}
          className="size-6 grid place-items-center rounded-md border border-line text-muted hover:text-cream hover:border-cream/30"
          aria-label="Raum hinzufügen"
          title="Raum hinzufügen"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div className="px-3 mt-2 space-y-1 overflow-y-auto flex-1 pb-3">
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
            <span className="truncate flex items-center gap-2">
              {r.kind === "cropsteering" && (
                <Droplet className="size-3 text-cream shrink-0" />
              )}
              {r.name}
            </span>
            <span
              className={`size-2 rounded-full shrink-0 ${
                r.lightOn
                  ? "bg-leaf shadow-[0_0_8px_0_rgba(141,212,168,0.7)]"
                  : "bg-muted/50"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="px-5 py-4 text-[11px] text-muted flex items-center gap-2 border-t border-line shrink-0">
        <Activity className="size-3.5" />
        Live · Sim Mode
      </div>

      <AddRoomModal open={addOpen} onClose={() => setAddOpen(false)} />
    </aside>
  );
}

export type { View };
