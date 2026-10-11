import { useMemo, useState } from "react";
import {
  Home,
  Cpu,
  Lightbulb,
  Target,
  Bell,
  Droplet,
  BookOpen,
  AlertTriangle,
  Trash2,
  Search,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { AuditCategory, AuditEvent } from "../lib/types";

const CATS: Array<{ key: AuditCategory | "all"; label: string; icon: typeof Home }> = [
  { key: "all", label: "Alle", icon: Home },
  { key: "room", label: "Räume", icon: Home },
  { key: "device", label: "Geräte", icon: Cpu },
  { key: "light", label: "Lampen", icon: Lightbulb },
  { key: "target", label: "Ziele", icon: Target },
  { key: "rule", label: "Regeln", icon: Bell },
  { key: "steering", label: "Steering", icon: Droplet },
  { key: "journal", label: "Journal", icon: BookOpen },
  { key: "alert", label: "Alarme", icon: AlertTriangle },
];

export function HistoryView() {
  const audit = useStore((s) => s.audit);
  const clearAudit = useStore((s) => s.clearAudit);

  const [cat, setCat] = useState<AuditCategory | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = cat === "all" ? audit : audit.filter((e) => e.category === cat);
    const matched = needle
      ? base.filter(
          (e) =>
            e.action.toLowerCase().includes(needle) ||
            e.roomName?.toLowerCase().includes(needle) ||
            e.deviceName?.toLowerCase().includes(needle) ||
            e.details?.toLowerCase().includes(needle),
        )
      : base;
    return matched.slice().reverse();
  }, [audit, cat, q]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  return (
    <div className="px-4 md:px-6 py-6 space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-2xl text-cream">Verlauf</h2>
          <p className="text-[12px] text-muted">
            {audit.length} Änderungen in der App · chronologisch
          </p>
        </div>
        {audit.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Kompletten Verlauf löschen?")) clearAudit();
            }}
            className="btn text-xs"
          >
            <Trash2 className="size-3.5" />
            Verlauf löschen
          </button>
        )}
      </section>

      <section className="flex flex-wrap gap-1.5">
        {CATS.map((c) => {
          const Icon = c.icon;
          const active = cat === c.key;
          const count =
            c.key === "all"
              ? audit.length
              : audit.filter((e) => e.category === c.key).length;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                active
                  ? "border-cream/40 text-cream bg-cream/10"
                  : "border-line text-muted hover:text-cream"
              }`}
            >
              <Icon className="size-3.5" />
              {c.label}
              <span className="text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </section>

      <section className="card-2 flex items-center gap-2 px-3 py-2">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche nach Raum, Gerät, Aktion…"
          className="bg-transparent outline-none text-sm text-fg w-full placeholder-muted"
        />
      </section>

      {filtered.length === 0 && (
        <div className="card p-8 text-center text-muted text-sm">
          Keine Einträge für diese Auswahl.
        </div>
      )}

      <section className="space-y-5">
        {grouped.map(([day, entries]) => (
          <div key={day}>
            <div className="stat-label mb-2">{day}</div>
            <div className="space-y-1">
              {entries.map((e) => (
                <AuditRow key={e.id} e={e} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function AuditRow({ e }: { e: AuditEvent }) {
  const meta = CATEGORY_META[e.category];
  const Icon = meta.icon;
  return (
    <div className="card-2 p-2.5 flex items-start gap-3">
      <div className={`size-8 rounded-lg border grid place-items-center shrink-0 ${meta.color}`}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-fg">
          <span className="font-medium">{e.action}</span>
          {e.roomName && <span className="text-muted"> · {e.roomName}</span>}
          {e.deviceName && <span className="text-muted"> · {e.deviceName}</span>}
        </div>
        {e.details && (
          <div className="text-[11px] text-muted mt-0.5 truncate">{e.details}</div>
        )}
      </div>
      <div className="text-[11px] text-muted tabular-nums shrink-0">
        {new Date(e.t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

function groupByDay(entries: AuditEvent[]): Array<[string, AuditEvent[]]> {
  const map = new Map<string, AuditEvent[]>();
  for (const e of entries) {
    const key = new Date(e.t).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

const CATEGORY_META: Record<AuditCategory, { icon: typeof Home; color: string }> = {
  room: { icon: Home, color: "text-cream border-cream/30 bg-cream/10" },
  device: { icon: Cpu, color: "text-leaf border-leaf/30 bg-leaf/10" },
  light: { icon: Lightbulb, color: "text-warn border-warn/30 bg-warn/10" },
  target: { icon: Target, color: "text-info border-info/30 bg-info/10" },
  rule: { icon: Bell, color: "text-info border-info/30 bg-info/10" },
  steering: { icon: Droplet, color: "text-leaf border-leaf/30 bg-leaf/10" },
  journal: { icon: BookOpen, color: "text-muted border-line bg-panel2" },
  alert: { icon: AlertTriangle, color: "text-danger border-danger/30 bg-danger/10" },
};
