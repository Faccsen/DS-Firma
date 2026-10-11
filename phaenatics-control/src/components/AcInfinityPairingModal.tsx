import { useEffect, useState } from "react";
import { X, Loader2, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { useStore } from "../lib/store";
import {
  type AcController,
  type AcPort,
  acListDevices,
  portDeviceKind,
} from "../lib/acinfinity";

interface Props {
  onClose: () => void;
}

export function AcInfinityPairingModal({ onClose }: Props) {
  const connection = useStore((s) => s.connection);
  const setConnection = useStore((s) => s.setConnection);
  const rooms = useStore((s) => s.rooms);
  const poll = useStore((s) => s.pollAcInfinity);

  const [controllers, setControllers] = useState<AcController[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

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

  function setSensorPairing(roomId: string, acDevId: string | "") {
    const next = connection.roomSensors.filter((rs) => rs.roomId !== roomId);
    if (acDevId) next.push({ roomId, acDevId });
    setConnection({ roomSensors: next });
  }

  function setDevicePairing(appDeviceId: string, roomId: string, token: string | "") {
    const next = connection.pairings.filter((p) => p.appDeviceId !== appDeviceId);
    if (token) {
      const [acDevId, portStr] = token.split("::");
      next.push({ appDeviceId, roomId, acDevId, acPort: Number(portStr) });
    }
    setConnection({ pairings: next });
  }

  const allPorts: Array<{ ctrl: AcController; port: AcPort }> = (controllers ?? []).flatMap(
    (c) => (c.deviceInfo.ports ?? []).map((p) => ({ ctrl: c, port: p })),
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm grid place-items-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-3xl p-5 my-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="display text-xl text-cream">Geräte zuordnen</h3>
            <p className="text-[12px] text-muted mt-0.5">
              Links deine Räume und App-Geräte, rechts die echten AC-Infinity-Controller.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refresh} className="btn text-xs" disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Neu laden
            </button>
            <button onClick={onClose} className="btn btn-ghost" aria-label="Schließen">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-10 text-center text-muted text-sm flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Lade Controller aus deinem UIS-Account…
          </div>
        )}

        {error && (
          <div className="card-2 p-3 text-[12px] text-danger flex items-start gap-2 mb-4">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {controllers && controllers.length === 0 && !loading && (
          <div className="card-2 p-4 text-sm text-muted text-center">
            Keine Controller gefunden. Füge sie zuerst in der offiziellen
            AC-Infinity-App zu deinem Account hinzu, dann hier „Neu laden".
          </div>
        )}

        {controllers && controllers.length > 0 && (
          <>
            <div className="card-2 p-3 mb-4 text-[12px] text-muted">
              <strong className="text-cream">Gefunden:</strong>{" "}
              {controllers.length} Controller · {allPorts.length} Ports gesamt.
            </div>

            {/* Raum-Sensoren */}
            <section className="mb-6">
              <div className="stat-label mb-2">Raum-Klima (Temp/rF/VPD/CO₂)</div>
              <p className="text-[11px] text-muted mb-3">
                Jeder AC-Infinity-Controller misst das Raumklima. Wähle,
                welcher Controller welchen Raum befeedt.
              </p>
              <div className="space-y-2">
                {rooms.map((r) => {
                  const current = connection.roomSensors.find((rs) => rs.roomId === r.id);
                  return (
                    <div
                      key={r.id}
                      className="card-2 p-3 flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-cream truncate">{r.name}</div>
                        <div className="text-[11px] text-muted">{r.devices.length} App-Geräte</div>
                      </div>
                      <select
                        value={current?.acDevId ?? ""}
                        onChange={(e) => setSensorPairing(r.id, e.target.value)}
                        className="card-2 text-xs px-2 py-1.5 min-w-[180px]"
                      >
                        <option value="">— keine Sensor-Quelle —</option>
                        {controllers.map((c) => (
                          <option key={c.devId} value={c.devId}>
                            {c.devName || `Controller ${c.devId}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Geräte-Ports */}
            <section>
              <div className="stat-label mb-2">Geräte-Ports</div>
              <p className="text-[11px] text-muted mb-3">
                Verbinde ein App-Gerät (z. B. „LED Panel 480W" in Bloom 1) mit einem
                konkreten Port auf einem Controller. Steuerung geht dann live.
              </p>
              <div className="space-y-3">
                {rooms.map((r) => (
                  <div key={r.id} className="card-2 p-3">
                    <div className="text-sm text-cream mb-2">{r.name}</div>
                    <div className="space-y-1.5">
                      {r.devices.map((d) => {
                        const pair = connection.pairings.find((p) => p.appDeviceId === d.id);
                        const current =
                          pair ? `${pair.acDevId}::${pair.acPort}` : "";
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-fg truncate">
                                {d.name}{" "}
                                <span className="text-muted">· {d.type}</span>
                              </div>
                            </div>
                            <select
                              value={current}
                              onChange={(e) => setDevicePairing(d.id, r.id, e.target.value)}
                              className="card-2 text-xs px-2 py-1 min-w-[200px]"
                            >
                              <option value="">— nicht verbunden —</option>
                              {allPorts.map(({ ctrl, port }) => (
                                <option
                                  key={`${ctrl.devId}::${port.port}`}
                                  value={`${ctrl.devId}::${port.port}`}
                                >
                                  {ctrl.devName || ctrl.devId} · Port {port.port}{" "}
                                  {port.portName && `(${port.portName})`}
                                  {" · "}
                                  {portDeviceKind({ loadType: port.loadType, portName: port.portName })}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={() => {
              poll();
              onClose();
            }}
            className="btn btn-primary"
          >
            <Zap className="size-4" />
            Zuordnungen übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
