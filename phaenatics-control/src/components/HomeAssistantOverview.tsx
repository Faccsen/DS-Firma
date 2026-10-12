import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  Check,
  Search,
  Thermometer,
  Droplets,
  Wind,
  Sparkles,
  Lightbulb,
  Fan,
  Snowflake,
  Flame,
  Power,
  Zap,
  Plug,
} from "lucide-react";
import { useStore } from "../lib/store";
import { type HaEntityState, haListStates, haEntityKind, sensorMeasurement, haStateOn } from "../lib/homeassistant";

const DOMAIN_ICONS: Record<string, typeof Fan> = {
  light: Lightbulb,
  switch: Power,
  fan: Fan,
  climate: Snowflake,
  humidifier: Droplets,
  sensor: Thermometer,
  binary_sensor: Zap,
  cover: Wind,
  input_boolean: Power,
};

const RELEVANT_DOMAINS = [
  "sensor",
  "switch",
  "light",
  "fan",
  "climate",
  "humidifier",
  "binary_sensor",
];

export function HomeAssistantOverview() {
  const connection = useStore((s) => s.connection);
  const rooms = useStore((s) => s.rooms);
  const importHa = useStore((s) => s.importHaEntity);
  const setConnection = useStore((s) => s.setConnection);
  const poll = useStore((s) => s.pollHomeAssistant);

  const [states, setStates] = useState<HaEntityState[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [q, setQ] = useState("");

  async function refresh() {
    if (!connection.ha) return;
    setLoading(true);
    setError(undefined);
    try {
      const all = await haListStates(connection.ha.baseUrl, connection.ha.token);
      // Filter out noisy non-controllable entities we never need to show
      const relevant = all.filter((e) => {
        const [domain] = e.entity_id.split(".");
        return RELEVANT_DOMAINS.includes(domain);
      });
      setStates(relevant);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.ha?.baseUrl]);

  const pairedEntities = useMemo(
    () =>
      new Set(
        connection.pairings
          .filter((p) => p.source === "ha" && p.haEntityId)
          .map((p) => p.haEntityId!),
      ),
    [connection.pairings],
  );

  const filtered = useMemo(() => {
    if (!states) return [];
    if (!q.trim()) return states;
    const needle = q.trim().toLowerCase();
    return states.filter(
      (e) =>
        e.entity_id.toLowerCase().includes(needle) ||
        (e.attributes.friendly_name ?? "").toLowerCase().includes(needle),
    );
  }, [states, q]);

  // Group entities by their first path segment (switch, sensor, light, …)
  const byDomain = useMemo(() => {
    const map = new Map<string, HaEntityState[]>();
    for (const e of filtered) {
      const [domain] = e.entity_id.split(".");
      const arr = map.get(domain) ?? [];
      arr.push(e);
      map.set(domain, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  if (!connection.ha?.verified) {
    return (
      <div className="card p-6 text-center text-muted text-sm">
        Erst in <span className="text-fg">Home Assistant</span> oben verbinden.
      </div>
    );
  }

  const sensorsOnly = (states ?? []).filter((e) => e.entity_id.startsWith("sensor."));

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display text-xl text-cream">Home Assistant Entitäten</h3>
          <p className="text-[12px] text-muted">
            {states?.length ?? 0} relevante Entitäten · SmartLife, Shelly, Zigbee usw.
          </p>
        </div>
        <button onClick={refresh} className="btn text-xs" disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Neu laden
        </button>
      </section>

      {loading && !states && (
        <div className="card p-10 text-center text-muted text-sm flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Lade Entitäten aus Home Assistant…
        </div>
      )}

      {error && (
        <div className="card border-danger/30 bg-danger/5 p-3 text-[12px] text-danger flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-1">{error}</div>
            <div className="text-fg/80 text-[11px]">
              Bei CORS-Fehler: in HA <code>configuration.yaml</code> unter{" "}
              <code>http:</code> einen Eintrag{" "}
              <code>cors_allowed_origins</code> mit deiner Phaenatics-URL
              hinzufügen und HA neu starten.
            </div>
          </div>
        </div>
      )}

      {/* Raum-Sensor-Zuordnung */}
      {states && states.length > 0 && (
        <section className="card p-4 space-y-3">
          <div>
            <div className="text-sm font-semibold text-cream">Raum-Klima aus HA</div>
            <div className="text-[11px] text-muted">
              Wähle pro Raum welche HA-Sensoren Temp/rF/VPD/CO₂ liefern.
            </div>
          </div>
          <div className="space-y-3">
            {rooms.map((r) => {
              const current = connection.roomSensors.find(
                (rs) => rs.source === "ha" && rs.roomId === r.id,
              );
              const update = (patch: Partial<typeof current>) => {
                const next = connection.roomSensors.filter(
                  (rs) => !(rs.source === "ha" && rs.roomId === r.id),
                );
                const merged = {
                  source: "ha" as const,
                  roomId: r.id,
                  ...(current ?? {}),
                  ...patch,
                };
                const anyPaired =
                  merged.haTempEntity ||
                  merged.haHumidityEntity ||
                  merged.haVpdEntity ||
                  merged.haCo2Entity;
                if (anyPaired) next.push(merged);
                setConnection({ roomSensors: next });
              };

              return (
                <div key={r.id} className="card-2 p-3">
                  <div className="text-sm text-cream mb-2">{r.name}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <SensorPicker
                      label="Temperatur"
                      icon={Thermometer}
                      options={sensorsOnly.filter((e) => sensorMeasurement(e) === "temp")}
                      value={current?.haTempEntity}
                      onChange={(v) => update({ haTempEntity: v || undefined })}
                    />
                    <SensorPicker
                      label="Luftfeuchte"
                      icon={Droplets}
                      options={sensorsOnly.filter((e) => sensorMeasurement(e) === "humidity")}
                      value={current?.haHumidityEntity}
                      onChange={(v) => update({ haHumidityEntity: v || undefined })}
                    />
                    <SensorPicker
                      label="VPD"
                      icon={Wind}
                      options={sensorsOnly.filter((e) => sensorMeasurement(e) === "vpd")}
                      value={current?.haVpdEntity}
                      onChange={(v) => update({ haVpdEntity: v || undefined })}
                    />
                    <SensorPicker
                      label="CO₂"
                      icon={Sparkles}
                      options={sensorsOnly.filter((e) => sensorMeasurement(e) === "co2")}
                      value={current?.haCo2Entity}
                      onChange={(v) => update({ haCo2Entity: v || undefined })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={poll} className="btn btn-primary text-xs w-full justify-center">
            <RefreshCw className="size-3.5" />
            Jetzt alle Zuordnungen abrufen
          </button>
        </section>
      )}

      {/* Entity list for import */}
      {states && (
        <section className="card-2 flex items-center gap-2 px-3 py-2">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suche: 'bloom', 'temp_tent', 'kitchen'…"
            className="bg-transparent outline-none text-sm text-fg w-full placeholder-muted"
          />
        </section>
      )}

      {byDomain.map(([domain, entities]) => {
        if (domain === "sensor") return null; // sensors live in the mapping grid above
        const Icon = DOMAIN_ICONS[domain] ?? Plug;
        return (
          <section key={domain} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="size-4 text-muted" />
              <h3 className="text-sm font-semibold text-cream uppercase tracking-wider">
                {domain}
              </h3>
              <span className="text-[11px] text-muted">· {entities.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {entities.map((e) => (
                <EntityRow
                  key={e.entity_id}
                  entity={e}
                  isImported={pairedEntities.has(e.entity_id)}
                  rooms={rooms}
                  onImport={(roomId) => importHa(e, roomId)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {states && byDomain.length === 0 && !loading && (
        <div className="card p-6 text-center text-sm text-muted">
          Keine passenden Entitäten gefunden. Prüfe deinen Filter oder
          verbinde zuerst Geräte in Home Assistant selbst.
        </div>
      )}
    </div>
  );
}

/* ============ Entity row with per-row import ============ */

function EntityRow({
  entity,
  isImported,
  rooms,
  onImport,
}: {
  entity: HaEntityState;
  isImported: boolean;
  rooms: Array<{ id: string; name: string }>;
  onImport: (roomId?: string) => void;
}) {
  const [showPick, setShowPick] = useState(false);
  const kind = haEntityKind(entity);
  const KindIcon = KIND_ICONS[kind] ?? Plug;
  const on = haStateOn(entity);

  return (
    <div className="card-2 p-2.5 flex items-center gap-3">
      <div
        className={`size-9 rounded-lg grid place-items-center border shrink-0 ${
          on ? "bg-leaf/10 text-leaf border-leaf/30" : "bg-panel2 text-muted border-line"
        }`}
      >
        <KindIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-fg truncate">
          {entity.attributes.friendly_name ?? entity.entity_id}
        </div>
        <div className="text-[11px] text-muted truncate font-mono">
          {entity.entity_id} · {entity.state}
          {entity.attributes.unit_of_measurement
            ? ` ${entity.attributes.unit_of_measurement}`
            : ""}
        </div>
      </div>
      {isImported ? (
        <span className="pill text-leaf border-leaf/30 bg-leaf/10 shrink-0">
          <Check className="size-3" />
          Übernommen
        </span>
      ) : showPick ? (
        <div className="flex items-center gap-1 shrink-0">
          <select
            autoFocus
            onChange={(e) => {
              onImport(e.target.value || undefined);
              setShowPick(false);
            }}
            className="card-2 text-xs px-2 py-1 max-w-[160px]"
            defaultValue=""
          >
            <option value="">+ Neuer Raum</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowPick(false)}
            className="btn btn-ghost text-xs"
            aria-label="Abbrechen"
          >
            ✕
          </button>
        </div>
      ) : (
        <button onClick={() => setShowPick(true)} className="btn text-xs shrink-0">
          <Download className="size-3" />
          Übernehmen
        </button>
      )}
    </div>
  );
}

const KIND_ICONS: Record<string, typeof Fan> = {
  fan: Fan,
  intake: Fan,
  exhaust: Fan,
  light: Lightbulb,
  humidifier: Droplets,
  dehumidifier: Snowflake,
  heater: Flame,
  ac: Snowflake,
  co2: Sparkles,
  pump: Droplets,
};

/* ============ Sensor-dropdown reused in the mapping grid ============ */

function SensorPicker({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: typeof Thermometer;
  options: HaEntityState[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="stat-label flex items-center gap-1.5 mb-1">
        <Icon className="size-3.5" />
        {label}
      </div>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full card-2 px-2 py-1.5 text-xs"
      >
        <option value="">— keine Quelle —</option>
        {options.map((e) => (
          <option key={e.entity_id} value={e.entity_id}>
            {e.attributes.friendly_name ?? e.entity_id}
          </option>
        ))}
      </select>
    </label>
  );
}
