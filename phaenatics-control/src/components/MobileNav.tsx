import { LayoutDashboard, Cpu, Bell, BarChart3, Settings } from "lucide-react";
import type { View } from "./Sidebar";

export function MobileNav({ view, onView }: { view: View; onView: (v: View) => void }) {
  const items = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "room", label: "Geräte", icon: Cpu },
    { id: "automation", label: "Auto", icon: Bell },
    { id: "history", label: "Verlauf", icon: BarChart3 },
    { id: "settings", label: "Mehr", icon: Settings },
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
                className={`w-full py-3 flex flex-col items-center gap-1 text-[10px] transition-colors ${
                  active ? "text-cream" : "text-muted"
                }`}
              >
                <Icon className="size-5" />
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
