import { LayoutDashboard, Cpu, Lightbulb, AlertTriangle, Settings } from "lucide-react";
import type { View } from "./Sidebar";
import { useStore } from "../lib/store";

export function MobileNav({ view, onView }: { view: View; onView: (v: View) => void }) {
  const activeAlerts = useStore((s) => s.alerts.filter((a) => !a.endedAt).length);
  const items = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard, badge: 0 },
    { id: "room", label: "Geräte", icon: Cpu, badge: 0 },
    { id: "lights", label: "Lampen", icon: Lightbulb, badge: 0 },
    { id: "alerts", label: "Alarme", icon: AlertTriangle, badge: activeAlerts },
    { id: "settings", label: "Mehr", icon: Settings, badge: 0 },
  ] as const;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-line bg-panel/90 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.id;
          return (
            <li key={it.id}>
              <button
                onClick={() => onView(it.id)}
                className={`w-full py-3 flex flex-col items-center gap-1 text-[10px] transition-colors relative ${
                  active ? "text-cream" : "text-muted"
                }`}
              >
                <div className="relative">
                  <Icon className="size-5" />
                  {it.badge > 0 && (
                    <span className="absolute -top-1 -right-2 text-[9px] font-semibold tabular-nums px-1 rounded-full bg-danger text-fg">
                      {it.badge}
                    </span>
                  )}
                </div>
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
