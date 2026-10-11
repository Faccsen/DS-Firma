import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Download,
  Check,
  Fan,
  Lightbulb,
  Snowflake,
  Flame,
  Droplets,
  Droplet,
  Sparkles,
  Plug,
  ArrowUp,
  ArrowDown,
  Minus,
  Wifi,
  Bluetooth,
  Share2,
  Cpu,
  Code,
  Copy as CopyIcon,
  X,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  type AcController,
  type AcPort,
  acListDevices,
  portDeviceKind,
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

  // Keep the previous sensor snapshot per controller so we can draw trend arrows
  const prevRef = useRef<
    Record<string, { temp?: number; humidity?: number; vpd?: number; co2?: number; outTemp?: number; outHumidity?: number; outVpd?: number }>
  >({});

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
    const id = setInterval(refresh, Math.max(10, connection.pollingSec) * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.ac?.userId]);

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
            Live-Übersicht deines UIS-Accounts im Stil der AC-Infinity-App.
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
          Keine Controller gefunden. Füge sie zuerst in der offiziellen
          AC-Infinity-App zu deinem Account hinzu.
        </div>
      )}

      {controllers && controllers.length > 0 && (
        <div className="space-y-5">
          {controllers.map((c) => {
            const prev = prevRef.current[c.devId];
            const curr = parseSensors(c.deviceInfo);
            // Save for next render
            prevRef.current[c.devId] = { ...curr };
            return (
              <ControllerCard
                key={c.devId}
                ctrl={c}
                prev={prev}
                isImported={pairedDevIds.has(c.devId) || imported.has(c.devId)}
                onImport={() => doImport(c)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ Controller card — AC Infinity style ============ */

function ControllerCard({
  ctrl,
  prev,
  isImported,
  onImport,
}: {
  ctrl: AcController;
  prev?: {
    temp?: number;
    humidity?: number;
    vpd?: number;
    co2?: number;
    outTemp?: number;
    outHumidity?: number;
    outVpd?: number;
  };
  isImported: boolean;
  onImport: () => void;
}) {
  const [showRaw, setShowRaw] = useState(false);

  const s = parseSensors(ctrl.deviceInfo);
  const ports = ctrl.deviceInfo.ports ?? [];
  const lightPort = ports.find(
    (p) => portDeviceKind({ loadType: p.loadType, portName: p.portName }) === "light",
  );
  const lightPct = lightPort?.loadState === 1 || (lightPort && lightPort.modeType !== 0) ? lightPort.speak : undefined;
  // AC Infinity controllers can have a dedicated external probe (sensorType
  // 5/6/7). When present we show an AUSSEN row inline. On modern firmware
  // (devType ≥ 20) the sensors[] array is the ground truth, so there is no
  // more need for a "weitere Sensoren"-fallback section.
  const hasOut = s.outTemp != null || s.outHumidity != null || s.outVpd != null;

  const now = new Date();
  const timeStr = now.toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`rounded-2xl bg-[#141917] border p-5 shadow-soft ${isImported ? "border-leaf/30" : "border-line"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-lg bg-panel2 border border-line grid place-items-center shrink-0">
            <Cpu className="size-5 text-muted" />
          </div>
          <div className="text-2xl font-semibold text-fg truncate">
            {ctrl.devName || `Controller ${ctrl.devId}`}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted shrink-0">
          <Share2 className="size-3.5" />
          <Bluetooth className="size-3.5 text-info" />
          <Wifi className="size-3.5 text-info" />
          <div className="text-right leading-tight">
            <div className="font-mono text-fg">{ctrl.devId}</div>
            <div className="opacity-80">{timeStr}</div>
          </div>
        </div>
      </div>

      {/* Big sensor grid — Innen */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-5">
        <BigStat
          label="INNEN TEMP"
          value={s.temp}
          unit="°C"
          precision={1}
          trend={trend(s.temp, prev?.temp)}
        />
        <BigStat
          label="INNEN FEUCHT"
          value={s.humidity}
          unit="%"
          precision={1}
          trend={trend(s.humidity, prev?.humidity)}
        />
        <BigStat
          label="INNEN VPD"
          value={s.vpd}
          unit="kPa"
          precision={2}
          trend={trend(s.vpd, prev?.vpd)}
        />

        <BigStat
          label="CO₂"
          value={s.co2}
          unit="ppm"
          precision={0}
          trend={trend(s.co2, prev?.co2)}
        />
        <BigStat
          label="LICHT"
          value={lightPct}
          unit="%"
          precision={1}
        />
        <div />


        {/* AUSSEN probe row (external sensor) — shown inline when present */}
        {hasOut && (
          <>
            <BigStat
              label="AUSSEN TEMP"
              value={s.outTemp}
              unit="°C"
              precision={1}
              trend={trend(s.outTemp, prev?.outTemp)}
            />
            <BigStat
              label="AUSSEN FEUCHT"
              value={s.outHumidity}
              unit="%"
              precision={1}
              trend={trend(s.outHumidity, prev?.outHumidity)}
            />
            <BigStat
              label="AUSSEN VPD"
              value={s.outVpd}
              unit="kPa"
              precision={2}
              trend={trend(s.outVpd, prev?.outVpd)}
            />
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-line my-5" />

      {/* Ports — 2 column grid like AC app */}
      {ports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
          {ports.map((p) => (
            <PortRow key={p.port} port={p} />
          ))}
        </div>
      )}

      {/* Footer / import action */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-line gap-2 flex-wrap">
        <div className="text-[11px] text-muted">
          {ports.length} Ports · Model {ctrl.devType ?? "–"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(true)}
            className="btn text-xs"
            title="Rohe API-Antwort anzeigen"
          >
            <Code className="size-3.5" />
            Rohdaten
          </button>
          {isImported ? (
            <span className="pill text-leaf border-leaf/30 bg-leaf/10">
              <Check className="size-3" />
              Übernommen
            </span>
          ) : (
            <button onClick={onImport} className="btn btn-primary text-xs">
              <Download className="size-3.5" />
              Als Phaenatics-Raum übernehmen
            </button>
          )}
        </div>
      </div>

      {showRaw && (
        <RawDataModal ctrl={ctrl} onClose={() => setShowRaw(false)} />
      )}
    </div>
  );
}

/* ============ Raw data modal ============ */

function RawDataModal({ ctrl, onClose }: { ctrl: AcController; onClose: () => void }) {
  const json = JSON.stringify(ctrl, null, 2);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-3xl p-4 my-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div>
            <h3 className="display text-lg text-cream">
              Rohdaten · {ctrl.devName || ctrl.devId}
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              Volle API-Antwort. Kopieren und mir schicken, dann map ich
              Innen-/Außen-Felder exakt für dieses Controller-Modell.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copy} className="btn text-xs">
              <CopyIcon className="size-3.5" />
              {copied ? "Kopiert" : "Kopieren"}
            </button>
            <button onClick={onClose} className="btn btn-ghost" aria-label="Schließen">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <pre className="card-2 p-3 text-[11px] text-fg font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">
          {json}
        </pre>
      </div>
    </div>
  );
}

/* ============ Big stat tile ============ */

function BigStat({
  label,
  value,
  unit,
  precision = 1,
  trend,
}: {
  label: string;
  value?: number;
  unit: string;
  precision?: number;
  trend?: "up" | "down" | "flat";
}) {
  const display = value == null ? "–" : value.toFixed(precision).replace(".", ",");
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted mb-1">
        {label}
      </div>
      <div className="flex items-start gap-1.5">
        <span className="text-[2.1rem] leading-none font-light text-fg tabular-nums">
          {display}
        </span>
        <div className="flex flex-col pt-1 text-muted">
          <span className="text-[10px] leading-none">{unit}</span>
          <TrendIcon trend={trend} />
        </div>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "flat" }) {
  if (!trend) return <span className="size-3 inline-block" />;
  if (trend === "up") return <ArrowUp className="size-3 text-leaf mt-0.5" />;
  if (trend === "down") return <ArrowDown className="size-3 text-info mt-0.5" />;
  return <Minus className="size-3 text-muted mt-0.5" />;
}

function trend(curr?: number, prev?: number): "up" | "down" | "flat" | undefined {
  if (curr == null || prev == null) return undefined;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.05) return "flat";
  return diff > 0 ? "up" : "down";
}

/* ============ Port row ============ */

const PORT_ICONS: Record<string, typeof Fan> = {
  fan: Fan,
  intake: Fan,
  exhaust: Fan,
  light: Lightbulb,
  humidifier: Droplets,
  dehumidifier: Snowflake,
  heater: Flame,
  ac: Snowflake,
  co2: Sparkles,
  pump: Droplet,
};

function portLabel(p: AcPort): string {
  if (p.portName && p.portName.trim()) return p.portName.toUpperCase();
  return `PORT ${p.port}`;
}

function PortRow({ port }: { port: AcPort }) {
  const kind = portDeviceKind({ loadType: port.loadType, portName: port.portName });
  const Icon = PORT_ICONS[kind] ?? Plug;
  const isOn = port.loadState === 1 || port.modeType !== 0;
  const value = isOn ? String(port.speak) : "– –";
  const auto = port.modeType === 2;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className={`size-9 rounded-full grid place-items-center shrink-0 ${
          isOn ? "bg-info/15 text-info" : "bg-panel2 text-muted/60"
        }`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted/80 leading-tight">
          {port.port}:
        </div>
        <div className="text-sm text-fg leading-tight truncate">
          {portLabel(port)}
        </div>
      </div>
      <div className="text-right shrink-0 flex items-center gap-1.5">
        <span className="text-xl font-light tabular-nums text-fg">{value}</span>
        {auto && isOn && (
          <span
            className="inline-block size-4 rounded-full border-2 border-dashed border-muted/60"
            title="Auto-Modus"
          />
        )}
      </div>
    </div>
  );
}
