import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  Check,
  Thermometer,
  Droplets,
  Wind,
  Sparkles,
  Fan,
  Lightbulb,
  Snowflake,
  Flame,
  Droplet,
  Plug,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  type AcController,
  type AcPort,
  acListDevices,
  loadTypeToDeviceKind,
  parseSensors,
} from "../lib/acinfinity";

export function AcInfinityOverview() {
  const connection = useStore((s) => s.connection);
  const importController = useStore((s) => s.importAcController);
  const poll = useStore((s) => s.pollAcInfinity);

  const [controllers, setControllers] = useState<AcController[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [imported, setImported] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!connection.ac) return;
    setLoading(true);
    setError(undefined);
    try {
      const list = await acListDevices(connection.ac.userId, connection.ac.token);
      setControllers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-mark controllers that already have a sensor pairing to a room
  const pairedDevIds = useMemo(
    () => new Set(connection.roomSensors.map((rs) => rs.acDevId)),
    [connection.roomSensors],
  );

  function doImport(ctrl: AcController) {
    importController(ctrl);
    setImported((s) => new Set([...s, ctrl.devId]));
    poll();
  }

  function importAll() {
    if (!controllers) return;
    for (const c of controllers) {
      if (!pairedDevIds.has(c.devId) && !imported.has(c.devId)) {
        importController(c);
      }
    }
    setImported(new Set(controllers.map((c) => c.devId)));
    poll();
  }

  if (!connection.ac) {
    return (
      <div className="card p-6 text-center text-muted text-sm">
        Erst in <span className="text-fg">Verbindungen</span> mit AC Infinity verbinden.
      </div>
    );
  }

  const importableCount = (controllers ?? []).filter(
    (c) => !pairedDevIds.has(c.devId) && !imported.has(c.devId),
  ).length;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="display text-xl text-cream">AC Infinity Hardware</h3>
          <p className="text-[12px] text-muted">
            Live-Übersicht deines UIS-Accounts. Übernimm Controller als
            vollständige Phaenatics-Räume mit allen Ports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn text-xs" disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Neu laden
          </button>
          {importableCount > 0 && (
            <button onClick={importAll} className="btn btn-primary text-xs">
              <Download className="size-3.5" />
              Alle übernehmen ({importableCount})
            </button>
          )}
        </div>
      </section>

      {loading && !controllers && (
        <div className="card p-10 text-center text-muted text-sm flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Lade AC-Infinity-Controller…
        </div>
      )}

      {error && (
        <div className="card border-danger/30 bg-danger/5 p-3 text-[12px] text-danger flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {controllers && controllers.length === 0 && (
        <div className="card p-6 text-center text-sm text-muted">
          Keine Controller in deinem UIS-Account gefunden.
          Füge sie zuerst in der offiziellen AC-Infinity-App hinzu.
        </div>
      )}

      {controllers && controllers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {controllers.map((c) => (
            <ControllerCard
              key={c.devId}
              ctrl={c}
              isImported={pairedDevIds.has(c.devId) || imported.has(c.devId)}
              onImport={() => doImport(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ControllerCard({
  ctrl,
  isImported,
  onImport,
}: {
  ctrl: AcController;
  isImported: boolean;
  onImport: () => void;
}) {
  const sensors = parseSensors(ctrl.deviceInfo);
  const ports = ctrl.deviceInfo.ports ?? [];
  return (
    <div className={`card p-4 ${isImported ? "border-leaf/30" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-cream truncate">
            {ctrl.devName || `Controller ${ctrl.devId}`}
          </div>
          <div className="text-[11px] text-muted truncate">
            ID {ctrl.devId}
            {ctrl.devType != null && ` · Model ${ctrl.devType}`}
            {" · "}
            {ports.length} Ports
          </div>
        </div>
        {isImported ? (
          <span className="pill text-leaf border-leaf/30 bg-leaf/10 shrink-0">
            <Check className="size-3" />
            Übernommen
          </span>
        ) : (
          <button onClick={onImport} className="btn btn-primary text-xs shrink-0">
            <Download className="size-3.5" />
            Übernehmen
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <Mini icon={Thermometer} value={sensors.temp} unit="°C" prec={1} />
        <Mini icon={Droplets} value={sensors.humidity} unit="%" prec={0} />
        <Mini icon={Wind} value={sensors.vpd} unit="kPa" prec={2} />
        <Mini icon={Sparkles} value={sensors.co2} unit="ppm" prec={0} />
      </div>

      {ports.length > 0 && (
        <div className="space-y-1">
          <div className="stat-label mb-1">Ports</div>
          {ports.map((p) => (
            <PortRow key={p.port} port={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({
  icon: Icon,
  value,
  unit,
  prec = 1,
}: {
  icon: typeof Thermometer;
  value: number | undefined;
  unit: string;
  prec?: number;
}) {
  return (
    <div className="card-2 p-2">
      <Icon className="size-3 text-muted" />
      <div className="mt-0.5 flex items-baseline">
        <span className="text-sm font-semibold tabular-nums">
          {value != null ? value.toFixed(prec) : "–"}
        </span>
        <span className="text-[9px] text-muted ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

const PORT_ICONS: Record<string, typeof Fan> = {
  fan: Fan,
  intake: Wind,
  exhaust: Fan,
  light: Lightbulb,
  humidifier: Droplets,
  dehumidifier: Snowflake,
  heater: Flame,
  ac: Snowflake,
  co2: Sparkles,
  pump: Droplet,
};

function PortRow({ port }: { port: AcPort }) {
  const kind = loadTypeToDeviceKind(port.loadType);
  const Icon = PORT_ICONS[kind] ?? Plug;
  const isOn = port.loadState === 1 || port.modeType !== 0;
  const modeTxt =
    port.modeType === 0
      ? "Aus"
      : port.modeType === 2
        ? "Auto"
        : port.modeType === 3
          ? "Zeitplan"
          : "Manuell";
  return (
    <div className="card-2 p-2 flex items-center gap-2.5">
      <div
        className={`size-7 rounded-md grid place-items-center border shrink-0 ${
          isOn
            ? "bg-leaf/10 text-leaf border-leaf/30"
            : "bg-panel2 text-muted border-line"
        }`}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-fg truncate">
          Port {port.port}
          {port.portName && port.portName !== "" && ` · ${port.portName}`}
        </div>
        <div className="text-[10px] text-muted">
          {kind} · {modeTxt}
        </div>
      </div>
      <div className="text-xs tabular-nums text-fg shrink-0">
        {isOn ? port.speak : 0}
      </div>
    </div>
  );
}
