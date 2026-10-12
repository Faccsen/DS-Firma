import { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Cloud,
  CloudOff,
  Fan,
  Lightbulb,
  Thermometer,
  Droplets,
  Wind,
  Zap,
  Flame,
  Snowflake,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "../lib/store";
import type { DeviceType } from "../lib/types";
import {
  type AcController,
  type AcPort,
  acListDevices,
  portDeviceKind,
} from "../lib/acinfinity";
import {
  type TapoDevice,
  tapoAlias,
  tapoDeviceKind,
  tapoListDevices,
} from "../lib/tapo";
import {
  type TuyaDevice,
  tuyaDeviceKind,
  tuyaListDevices,
} from "../lib/tuya";

type Tab = "acinfinity" | "tapo" | "tuya" | "manual";

const MANUAL_TYPES: Array<{ id: DeviceType; label: string; icon: typeof Fan }> = [
  { id: "exhaust", label: "Abluft", icon: Wind },
  { id: "intake", label: "Zuluft", icon: Wind },
  { id: "fan", label: "Lüfter", icon: Fan },
  { id: "light", label: "Lampe", icon: Lightbulb },
  { id: "humidifier", label: "Befeuchter", icon: Droplets },
  { id: "dehumidifier", label: "Entfeuchter", icon: Droplets },
  { id: "heater", label: "Heizung", icon: Flame },
  { id: "ac", label: "Klima", icon: Snowflake },
  { id: "co2", label: "CO₂", icon: Zap },
  { id: "pump", label: "Pumpe", icon: Thermometer },
  { id: "doser", label: "Doser", icon: Thermometer },
];

interface Props {
  roomId: string;
  onClose: () => void;
}

export function AddDeviceModal({ roomId, onClose }: Props) {
  const connection = useStore((s) => s.connection);
  const addManualDevice = useStore((s) => s.addManualDevice);
  const addAcPortToRoom = useStore((s) => s.addAcPortToRoom);
  const importTapoDevice = useStore((s) => s.importTapoDevice);
  const importTuyaDevice = useStore((s) => s.importTuyaDevice);

  const hasAc = !!connection.ac;
  const hasTapo = !!connection.tapo;
  const hasTuya = !!connection.tuya;

  const [tab, setTab] = useState<Tab>(
    hasAc ? "acinfinity" : hasTapo ? "tapo" : hasTuya ? "tuya" : "manual",
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-5 my-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="display text-xl text-cream">Gerät hinzufügen</h3>
            <p className="text-[12px] text-muted mt-0.5">
              Scan nach vorhandener Hardware oder manuell anlegen.
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 mb-4 border-b border-line pb-2 flex-wrap">
          <TabChip
            active={tab === "acinfinity"}
            onClick={() => setTab("acinfinity")}
            label="AC Infinity"
            disabled={!hasAc}
          />
          <TabChip
            active={tab === "tapo"}
            onClick={() => setTab("tapo")}
            label="Tapo"
            disabled={!hasTapo}
          />
          <TabChip
            active={tab === "tuya"}
            onClick={() => setTab("tuya")}
            label="SmartLife"
            disabled={!hasTuya}
          />
          <TabChip
            active={tab === "manual"}
            onClick={() => setTab("manual")}
            label="Manuell"
          />
        </div>

        {tab === "acinfinity" &&
          (hasAc ? (
            <AcInfinityTab
              roomId={roomId}
              onAdd={(ctrl, port, useAsSensor) =>
                addAcPortToRoom(roomId, { controller: ctrl, port, useAsRoomSensor: useAsSensor })
              }
            />
          ) : (
            <CloudEmpty label="AC Infinity" />
          ))}

        {tab === "tapo" &&
          (hasTapo ? (
            <TapoTab roomId={roomId} onAdd={(dev) => importTapoDevice(dev, roomId)} />
          ) : (
            <CloudEmpty label="Tapo" />
          ))}

        {tab === "tuya" &&
          (hasTuya ? (
            <TuyaTab roomId={roomId} onAdd={(dev) => importTuyaDevice(dev, roomId)} />
          ) : (
            <CloudEmpty label="SmartLife" />
          ))}

        {tab === "manual" && (
          <ManualTab
            roomId={roomId}
            onAdd={(opts) => {
              addManualDevice(roomId, opts);
            }}
          />
        )}
      </div>
    </div>
  );
}

function TabChip({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs rounded-md border transition-colors inline-flex items-center gap-1.5 ${
        disabled
          ? "border-line text-muted/50 cursor-not-allowed"
          : active
            ? "border-cream/40 text-cream bg-cream/10"
            : "border-line text-muted hover:text-cream"
      }`}
    >
      {label}
      {disabled && <span className="text-[9px] uppercase tracking-wider">off</span>}
    </button>
  );
}

function CloudEmpty({ label }: { label: string }) {
  return (
    <div className="card-2 p-5 text-center text-sm text-muted flex flex-col items-center gap-2">
      <CloudOff className="size-5 opacity-60" />
      Keine Verbindung zu <span className="text-cream">{label}</span>.
      Verbinde die Cloud in den Einstellungen, dann wird dieser Tab aktiv.
    </div>
  );
}

/* ───────── AC INFINITY ───────── */

function AcInfinityTab({
  roomId,
  onAdd,
}: {
  roomId: string;
  onAdd: (ctrl: AcController, port: AcPort, useAsSensor: boolean) => void;
}) {
  const connection = useStore((s) => s.connection);
  const [controllers, setControllers] = useState<AcController[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [useAsSensorFor, setUseAsSensorFor] = useState<string | undefined>(() => {
    const current = connection.roomSensors.find((rs) => rs.roomId === roomId);
    return current?.acDevId;
  });

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

  const alreadyPaired = useMemo(
    () =>
      new Set(
        connection.pairings
          .filter((p) => p.source === "acinfinity" && p.roomId === roomId)
          .map((p) => `${p.acDevId}::${p.acPort}`),
      ),
    [connection.pairings, roomId],
  );

  if (loading)
    return (
      <div className="py-10 text-center text-muted text-sm flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Lade Controller…
      </div>
    );
  if (error)
    return (
      <div className="card-2 p-3 text-[12px] text-danger flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <span>{error}</span>
        <button onClick={refresh} className="btn text-xs ml-auto">
          <RefreshCw className="size-3.5" />
          Erneut
        </button>
      </div>
    );
  if (!controllers || controllers.length === 0)
    return (
      <div className="card-2 p-4 text-sm text-muted text-center">
        Keine Controller in deinem UIS-Account gefunden.
      </div>
    );

  return (
    <div className="space-y-4">
      {controllers.map((c) => {
        const ports = c.deviceInfo.ports ?? [];
        const sensorChecked = useAsSensorFor === c.devId;
        return (
          <div key={c.devId} className="card-2 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-cream truncate">
                  {c.devName || `Controller ${c.devId}`}
                </div>
                <div className="text-[11px] text-muted">
                  {ports.length} Ports · {sensorsLine(c)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sensorChecked}
                  onChange={(e) =>
                    setUseAsSensorFor(e.target.checked ? c.devId : undefined)
                  }
                  className="accent-leaf"
                />
                Sensorik dieses Controllers für Raum
              </label>
            </div>
            <div className="space-y-1.5">
              {ports.map((p) => {
                const key = `${c.devId}::${p.port}`;
                const already = alreadyPaired.has(key);
                const justAdded = addedKeys.has(key);
                const kind = portDeviceKind({ loadType: p.loadType, portName: p.portName });
                return (
                  <div key={p.port} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 text-[12px]">
                      <span className="text-fg">Port {p.port}</span>
                      <span className="text-muted">
                        {" · "}
                        {p.portName && p.portName.trim() ? p.portName : "(leer)"}
                      </span>
                      <span className="text-muted">
                        {" · "}
                        {kind}
                      </span>
                    </div>
                    <button
                      disabled={already || justAdded}
                      onClick={() => {
                        onAdd(c, p, sensorChecked);
                        setAddedKeys((prev) => new Set(prev).add(key));
                      }}
                      className="btn text-xs"
                    >
                      {already ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-leaf" />
                          bereits verbunden
                        </>
                      ) : justAdded ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-leaf" />
                          hinzugefügt
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          Hinzufügen
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function sensorsLine(c: AcController): string {
  const t = c.deviceInfo.temperature;
  const h = c.deviceInfo.humidity;
  const v = c.deviceInfo.vpdnums;
  const parts: string[] = [];
  if (typeof t === "number") parts.push(`T ${(t / 100).toFixed(1)}°C`);
  if (typeof h === "number") parts.push(`rF ${(h / 100).toFixed(0)}%`);
  if (typeof v === "number") parts.push(`VPD ${(v / 100).toFixed(2)}`);
  return parts.join(" · ") || "keine Sensordaten";
}

/* ───────── TAPO ───────── */

function TapoTab({
  roomId,
  onAdd,
}: {
  roomId: string;
  onAdd: (dev: TapoDevice) => void;
}) {
  const connection = useStore((s) => s.connection);
  const [devices, setDevices] = useState<TapoDevice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!connection.tapo) return;
    setLoading(true);
    setError(undefined);
    try {
      const list = await tapoListDevices(connection.tapo.token);
      setDevices(list);
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

  const alreadyPaired = useMemo(
    () =>
      new Set(
        connection.pairings
          .filter((p) => p.source === "tapo" && p.roomId === roomId)
          .map((p) => p.tapoDeviceId!)
          .filter(Boolean),
      ),
    [connection.pairings, roomId],
  );

  if (loading)
    return (
      <div className="py-10 text-center text-muted text-sm flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Lade Tapo-Geräte…
      </div>
    );
  if (error)
    return (
      <div className="card-2 p-3 text-[12px] text-danger flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  if (!devices || devices.length === 0)
    return (
      <div className="card-2 p-4 text-sm text-muted text-center">
        Keine Tapo-Geräte gefunden.
      </div>
    );

  return (
    <div className="space-y-1.5">
      {devices.map((dev) => {
        const kind = tapoDeviceKind(dev);
        const already = alreadyPaired.has(dev.deviceId);
        const justAdded = added.has(dev.deviceId);
        return (
          <div key={dev.deviceId} className="card-2 p-3 flex items-center gap-3">
            <Cloud className={`size-4 ${dev.status === 1 ? "text-leaf" : "text-muted"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-fg truncate">{tapoAlias(dev)}</div>
              <div className="text-[11px] text-muted">
                {dev.deviceModel} · {kind}
              </div>
            </div>
            <button
              disabled={already || justAdded}
              onClick={() => {
                onAdd(dev);
                setAdded((prev) => new Set(prev).add(dev.deviceId));
              }}
              className="btn text-xs"
            >
              {already || justAdded ? (
                <>
                  <CheckCircle2 className="size-3.5 text-leaf" />
                  verbunden
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Hinzufügen
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── TUYA (SmartLife) ───────── */

function TuyaTab({
  roomId,
  onAdd,
}: {
  roomId: string;
  onAdd: (dev: TuyaDevice) => void;
}) {
  const connection = useStore((s) => s.connection);
  const [devices, setDevices] = useState<TuyaDevice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!connection.tuya) return;
    setLoading(true);
    setError(undefined);
    try {
      const list = await tuyaListDevices({
        region: connection.tuya.region,
        accessId: connection.tuya.accessId,
        secret: connection.tuya.secret,
        accessToken: connection.tuya.accessToken,
        uid: connection.tuya.uid,
      });
      setDevices(list);
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

  const alreadyPaired = useMemo(
    () =>
      new Set(
        connection.pairings
          .filter((p) => p.source === "tuya" && p.roomId === roomId)
          .map((p) => p.tuyaDeviceId!)
          .filter(Boolean),
      ),
    [connection.pairings, roomId],
  );

  if (loading)
    return (
      <div className="py-10 text-center text-muted text-sm flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        Lade SmartLife-Geräte…
      </div>
    );
  if (error)
    return (
      <div className="card-2 p-3 text-[12px] text-danger flex items-start gap-2">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  if (!devices || devices.length === 0)
    return (
      <div className="card-2 p-4 text-sm text-muted text-center">
        Keine SmartLife-Geräte gefunden.
      </div>
    );

  return (
    <div className="space-y-1.5">
      {devices.map((dev) => {
        const kind = tuyaDeviceKind(dev);
        const already = alreadyPaired.has(dev.id);
        const justAdded = added.has(dev.id);
        return (
          <div key={dev.id} className="card-2 p-3 flex items-center gap-3">
            <Cloud className={`size-4 ${dev.online ? "text-leaf" : "text-muted"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-fg truncate">{dev.name}</div>
              <div className="text-[11px] text-muted">
                {dev.product_name} · {kind}
              </div>
            </div>
            <button
              disabled={already || justAdded}
              onClick={() => {
                onAdd(dev);
                setAdded((prev) => new Set(prev).add(dev.id));
              }}
              className="btn text-xs"
            >
              {already || justAdded ? (
                <>
                  <CheckCircle2 className="size-3.5 text-leaf" />
                  verbunden
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Hinzufügen
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── MANUAL ───────── */

function ManualTab({
  onAdd,
}: {
  roomId: string;
  onAdd: (opts: { type: DeviceType; name: string; wattage?: number }) => void;
}) {
  const [type, setType] = useState<DeviceType>("exhaust");
  const [name, setName] = useState("");
  const [wattage, setWattage] = useState<number>(240);

  function submit() {
    onAdd({
      type,
      name: name.trim(),
      wattage: type === "light" ? wattage : undefined,
    });
    setName("");
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="stat-label mb-2">Gerätetyp</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {MANUAL_TYPES.map((t) => {
            const Icon = t.icon;
            const active = type === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`card-2 py-2 flex flex-col items-center gap-1 text-[11px] transition-colors ${
                  active
                    ? "border-cream/40 text-cream bg-cream/10"
                    : "text-muted hover:text-cream"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="stat-label">Bezeichnung</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`z. B. ${MANUAL_TYPES.find((m) => m.id === type)?.label ?? "Gerät"}`}
          className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40"
        />
      </label>

      {type === "light" && (
        <label className="block">
          <span className="stat-label">Leistung (W)</span>
          <input
            type="number"
            min={10}
            max={2000}
            step={10}
            value={wattage}
            onChange={(e) => setWattage(Number(e.target.value) || 240)}
            className="mt-1 w-32 card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40"
          />
        </label>
      )}

      <div className="card-2 p-3 text-[11px] text-muted leading-relaxed">
        Manuelle Geräte haben keinen Live-Zugriff auf Hardware — sie
        existieren nur in der App. Für Live-Steuerung die passenden Tabs
        (AC Infinity / Tapo / SmartLife) nutzen.
      </div>

      <button onClick={submit} className="btn btn-primary w-full justify-center">
        <Plus className="size-4" />
        Gerät anlegen
      </button>
    </div>
  );
}
