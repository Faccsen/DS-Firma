import { useEffect, useState } from "react";
import {
  Zap,
  Plug,
  Unplug,
  Loader2,
  AlertCircle,
  Check,
  RefreshCw,
  Download,
  Power,
  Lightbulb,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  type TapoDevice,
  tapoAlias,
  tapoDeviceKind,
  tapoHasEnergy,
  tapoListDevices,
} from "../lib/tapo";

export function TapoIntegration() {
  const connection = useStore((s) => s.connection);
  const connect = useStore((s) => s.connectTapo);
  const disconnect = useStore((s) => s.disconnectTapo);
  const poll = useStore((s) => s.pollTapo);
  const importDevice = useStore((s) => s.importTapoDevice);
  const rooms = useStore((s) => s.rooms);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();

  const [devices, setDevices] = useState<TapoDevice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | undefined>();

  const connected = !!connection.tapo;

  async function doLogin() {
    setLoginError(undefined);
    setBusy(true);
    try {
      await connect(email.trim(), password);
      setEmail("");
      setPassword("");
      await refresh();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!connection.tapo) return;
    setLoading(true);
    setListError(undefined);
    try {
      const list = await tapoListDevices(connection.tapo.token);
      setDevices(list);
      await poll();
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (connected && devices === null) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const pairedIds = new Set(
    connection.pairings
      .filter((p) => p.source === "tapo" && p.tapoDeviceId)
      .map((p) => p.tapoDeviceId!),
  );

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-cream flex items-center gap-2">
            <Zap className="size-4" />
            Tapo (TP-Link)
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Smart-Plugs (P100/P105/P110/P115) und Bulbs (L510/L530) direkt
            via TP-Link Cloud.
          </div>
        </div>
        {connected ? (
          <span className="pill text-leaf border-leaf/30 bg-leaf/10">
            <Check className="size-3" />
            Verbunden
          </span>
        ) : (
          <span className="pill">
            <Plug className="size-3" />
            Nicht verbunden
          </span>
        )}
      </div>

      {!connected ? (
        <>
          <div className="card-2 p-3 text-[11px] text-muted leading-relaxed">
            <span className="text-warn font-semibold">Beta.</span> Nutzt die
            inoffizielle, reverse-engineerte TP-Link-Cloud-API (gleicher Endpoint
            wie die offizielle Tapo-App). Deine Zugangsdaten gehen durch unseren
            Vercel-Proxy, werden <span className="text-fg">nur im Browser</span>{" "}
            gespeichert und an keinen Drittanbieter geschickt. TP-Link kann die
            API jederzeit ändern.
          </div>
          <label className="block">
            <span className="stat-label">Tapo-Account E-Mail</span>
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
          {loginError && (
            <div className="text-[12px] text-danger flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}
          <button
            onClick={doLogin}
            disabled={busy || !email || !password}
            className="btn btn-primary w-full justify-center"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            {busy ? "Verbinde…" : "Mit Tapo verbinden"}
          </button>
        </>
      ) : (
        <>
          <div className="card-2 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-cream flex items-center gap-1.5">
                <Check className="size-4 text-leaf" />
                {connection.tapo!.email}
              </div>
              <div className="text-[11px] text-muted">
                Seit {new Date(connection.tapo!.connectedAt).toLocaleString("de-DE")}
              </div>
            </div>
            <button onClick={disconnect} className="btn text-xs">
              <Unplug className="size-3.5" />
              Trennen
            </button>
          </div>

          {/* Device grid */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-cream">
              Geräte {devices && `(${devices.length})`}
            </div>
            <button onClick={refresh} className="btn text-xs" disabled={loading}>
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Neu laden
            </button>
          </div>

          {loading && devices === null && (
            <div className="card-2 p-8 text-center text-muted text-sm flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Lade Tapo-Geräte…
            </div>
          )}

          {listError && (
            <div className="card-2 border-danger/30 bg-danger/5 p-3 text-[12px] text-danger flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{listError}</span>
            </div>
          )}

          {devices && devices.length === 0 && (
            <div className="card-2 p-6 text-center text-sm text-muted">
              Keine Geräte gefunden. Füge sie zuerst in der offiziellen
              Tapo-App zu deinem Account hinzu.
            </div>
          )}

          {devices && devices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {devices.map((d) => (
                <TapoDeviceCard
                  key={d.deviceId}
                  dev={d}
                  isImported={pairedIds.has(d.deviceId)}
                  rooms={rooms}
                  onImport={(roomId) => importDevice(d, roomId)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function TapoDeviceCard({
  dev,
  isImported,
  rooms,
  onImport,
}: {
  dev: TapoDevice;
  isImported: boolean;
  rooms: Array<{ id: string; name: string }>;
  onImport: (roomId?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const name = tapoAlias(dev);
  const kind = tapoDeviceKind(dev);
  const online = dev.status === 1;
  const hasEnergy = tapoHasEnergy(dev);
  const Icon = kind === "light" ? Lightbulb : Power;

  return (
    <div
      className={`rounded-xl bg-[#141917] border p-4 ${isImported ? "border-leaf/30" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`size-10 rounded-xl grid place-items-center border shrink-0 ${
              online
                ? "bg-cream/5 text-cream border-cream/20"
                : "bg-panel2 text-muted border-line"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-fg truncate">{name}</div>
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              {online ? (
                <Wifi className="size-3 text-leaf" />
              ) : (
                <WifiOff className="size-3 text-muted" />
              )}
              <span className="font-mono">{dev.deviceModel}</span>
              {hasEnergy && <span className="pill text-cream/80 border-cream/20 bg-cream/5 text-[9px] py-0 px-1.5">Energy</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted font-mono truncate mb-3">
        {dev.deviceId}
      </div>

      {isImported ? (
        <span className="pill text-leaf border-leaf/30 bg-leaf/10 w-full justify-center">
          <Check className="size-3" />
          Übernommen
        </span>
      ) : picking ? (
        <div className="flex items-center gap-1">
          <select
            autoFocus
            onChange={(e) => {
              onImport(e.target.value || undefined);
              setPicking(false);
            }}
            className="card-2 text-xs px-2 py-1.5 flex-1"
            defaultValue=""
          >
            <option value="">+ Neuer Raum "{name}"</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPicking(false)}
            className="btn btn-ghost text-xs"
            aria-label="Abbrechen"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          disabled={!online}
          className="btn btn-primary text-xs w-full justify-center disabled:opacity-50"
        >
          <Download className="size-3.5" />
          {online ? "Übernehmen" : "Gerät offline"}
        </button>
      )}
    </div>
  );
}
