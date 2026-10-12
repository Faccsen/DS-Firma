import { useState } from "react";
import {
  Cloud,
  CloudOff,
  Link2,
  Loader2,
  AlertCircle,
  Check,
  Plug,
  Unplug,
} from "lucide-react";
import { useStore } from "../lib/store";
import { acLogin } from "../lib/acinfinity";
import { AcInfinityPairingModal } from "./AcInfinityPairingModal";

export function ConnectionsSettings() {
  const connection = useStore((s) => s.connection);
  const setConnection = useStore((s) => s.setConnection);
  const disconnect = useStore((s) => s.disconnectAcInfinity);
  const poll = useStore((s) => s.pollAcInfinity);
  const status = useStore((s) => s.connectionStatus);
  const connErr = useStore((s) => s.connectionError);
  const lastPollAt = useStore((s) => s.lastPollAt);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pairingOpen, setPairingOpen] = useState(false);

  const connected = connection.mode === "acinfinity" && !!connection.ac;

  async function doLogin() {
    setError(undefined);
    setBusy(true);
    try {
      const { userId, token, nickname } = await acLogin(email, password);
      setConnection({
        mode: "acinfinity",
        ac: {
          email,
          userId,
          token,
          nickname,
          connectedAt: Date.now(),
        },
      });
      setEmail("");
      setPassword("");
      // Immediately pull devices
      await poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-cream flex items-center gap-2">
            <Cloud className="size-4" />
            Verbindungen
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Echte AC-Infinity-UIS-Hardware (Controller 69/69 Pro, LED-Panels, Clip-Fans).
          </div>
        </div>
        <ModeBadge mode={connection.mode} status={status} />
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-1">
        <ModeChip
          active={connection.mode === "sim"}
          onClick={() => setConnection({ mode: "sim" })}
          icon={<CloudOff className="size-3.5" />}
          label="Simulation"
        />
        <ModeChip
          active={connection.mode === "acinfinity"}
          onClick={() => setConnection({ mode: "acinfinity" })}
          icon={<Cloud className="size-3.5" />}
          label="AC Infinity Cloud"
        />
      </div>

      {connection.mode === "acinfinity" && (
        <>
          <div className="card-2 p-3 text-[11px] text-muted leading-relaxed">
            <span className="text-warn font-semibold">Beta.</span> Nutzt die
            inoffizielle, reverse-engineerte UIS-Cloud-API (gleicher Endpoint
            wie die offizielle AC-Infinity-App). Deine Zugangsdaten gehen durch
            unseren Vercel-Proxy, werden <span className="text-fg">nur im
            Browser</span> gespeichert und an keinen Drittanbieter geschickt.
            AC Infinity kann die API jederzeit ändern.
          </div>

          {!connected ? (
            <div className="space-y-3">
              <label className="block">
                <span className="stat-label">UIS-Account E-Mail</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="du@phaenatics.de"
                  className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40"
                />
              </label>
              <label className="block">
                <span className="stat-label">Passwort</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !busy && doLogin()}
                  placeholder="••••••••"
                  className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40"
                />
              </label>
              {error && (
                <div className="text-[12px] text-danger flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <button
                onClick={doLogin}
                disabled={busy || !email || !password}
                className="btn btn-primary w-full justify-center"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
                {busy ? "Verbinde…" : "Mit AC Infinity verbinden"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="card-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-cream flex items-center gap-1.5">
                      <Check className="size-4 text-leaf" />
                      Verbunden
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {connection.ac!.email}
                      {connection.ac!.nickname && ` · ${connection.ac!.nickname}`}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      Seit {new Date(connection.ac!.connectedAt).toLocaleString("de-DE")}
                      {lastPollAt && ` · zuletzt synced ${timeAgo(lastPollAt)}`}
                    </div>
                  </div>
                  <button onClick={disconnect} className="btn text-xs">
                    <Unplug className="size-3.5" />
                    Trennen
                  </button>
                </div>
                {connErr && (
                  <div className="mt-2 text-[11px] text-danger flex items-start gap-2">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{connErr}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => poll()} className="btn text-xs justify-center">
                  <Loader2 className={`size-3.5 ${status === "polling" ? "animate-spin" : ""}`} />
                  Jetzt synchronisieren
                </button>
                <button
                  onClick={() => setPairingOpen(true)}
                  className="btn btn-primary text-xs justify-center"
                >
                  <Link2 className="size-3.5" />
                  Geräte zuordnen
                </button>
              </div>

              <div className="card-2 p-3">
                <div className="text-sm font-medium text-cream mb-2">Aktive Zuordnungen</div>
                {connection.pairings.length === 0 && connection.roomSensors.length === 0 ? (
                  <div className="text-[11px] text-muted">
                    Noch keine Zuordnungen. Tippe oben auf <span className="text-fg">„Geräte zuordnen"</span>.
                  </div>
                ) : (
                  <ul className="text-[11px] text-muted space-y-1">
                    {connection.roomSensors.map((rs) => (
                      <li key={`sensor-${rs.roomId}`}>
                        Sensor · Raum <span className="text-fg">{roomName(rs.roomId)}</span> ← Controller{" "}
                        <span className="text-fg">{rs.acDevId}</span>
                      </li>
                    ))}
                    {connection.pairings.map((p) => (
                      <li key={`${p.appDeviceId}`}>
                        Gerät · <span className="text-fg">{deviceName(p.appDeviceId)}</span>
                        {" "}← Port {p.acPort} auf <span className="text-fg">{p.acDevId}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card-2 p-3 flex items-center justify-between">
                <span className="text-[12px] text-muted">Polling-Intervall</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={300}
                    step={5}
                    value={connection.pollingSec}
                    onChange={(e) =>
                      setConnection({ pollingSec: Math.max(10, Number(e.target.value) || 30) })
                    }
                    className="card-2 w-16 text-right text-xs tabular-nums px-2 py-1 outline-none"
                  />
                  <span className="text-[11px] text-muted">s</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {pairingOpen && (
        <AcInfinityPairingModal onClose={() => setPairingOpen(false)} />
      )}
    </section>
  );
}

function roomName(id: string): string {
  return useStore.getState().rooms.find((r) => r.id === id)?.name ?? "?";
}
function deviceName(id: string): string {
  for (const r of useStore.getState().rooms) {
    const d = r.devices.find((dd) => dd.id === id);
    if (d) return `${d.name} (${r.name})`;
  }
  return "?";
}
function timeAgo(t: number): string {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `vor ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `vor ${m} min`;
  const h = Math.round(m / 60);
  return `vor ${h} h`;
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors inline-flex items-center gap-1.5 ${
        active
          ? "border-cream/40 text-cream bg-cream/10"
          : "border-line text-muted hover:text-cream"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ModeBadge({
  mode,
  status,
}: {
  mode: "sim" | "acinfinity" | "homeassistant" | "tapo" | "mixed";
  status: "idle" | "polling" | "error";
}) {
  const label =
    mode === "sim"
      ? "Simulation"
      : status === "polling"
        ? "Sync…"
        : status === "error"
          ? "Fehler"
          : "Live";
  const cls =
    mode === "sim"
      ? "text-muted border-line bg-panel2"
      : status === "error"
        ? "text-danger border-danger/30 bg-danger/10"
        : status === "polling"
          ? "text-info border-info/30 bg-info/10"
          : "text-leaf border-leaf/30 bg-leaf/10";
  return <span className={`pill ${cls}`}>{label}</span>;
}
