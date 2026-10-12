import { useEffect, useState } from "react";
import {
  Smartphone,
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
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useStore } from "../lib/store";
import {
  type TuyaDevice,
  tuyaIsOn,
  tuyaListDevices,
} from "../lib/tuya";

const REGIONS: Array<{ id: "eu" | "us" | "us-east" | "cn" | "in"; label: string }> = [
  { id: "eu", label: "EU (Zentral)" },
  { id: "us", label: "USA (West)" },
  { id: "us-east", label: "USA (Ost)" },
  { id: "cn", label: "China" },
  { id: "in", label: "Indien" },
];

export function TuyaIntegration() {
  const connection = useStore((s) => s.connection);
  const connect = useStore((s) => s.connectTuya);
  const disconnect = useStore((s) => s.disconnectTuya);
  const poll = useStore((s) => s.pollTuya);
  const importDevice = useStore((s) => s.importTuyaDevice);
  const rooms = useStore((s) => s.rooms);

  const [region, setRegion] = useState<"eu" | "us" | "us-east" | "cn" | "in">("eu");
  const [accessId, setAccessId] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [showGuide, setShowGuide] = useState(false);

  const [devices, setDevices] = useState<TuyaDevice[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | undefined>();

  const connected = !!connection.tuya;

  async function doConnect() {
    setLoginError(undefined);
    setBusy(true);
    try {
      await connect({ region, accessId: accessId.trim(), secret: secret.trim() });
      setAccessId("");
      setSecret("");
      await refresh();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!connection.tuya) return;
    setLoading(true);
    setListError(undefined);
    try {
      const list = await tuyaListDevices({
        region: connection.tuya.region,
        accessId: connection.tuya.accessId,
        secret: connection.tuya.secret,
        accessToken: connection.tuya.accessToken,
        uid: connection.tuya.uid,
      });
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
      .filter((p) => p.source === "tuya" && p.tuyaDeviceId)
      .map((p) => p.tuyaDeviceId!),
  );

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-cream flex items-center gap-2">
            <Smartphone className="size-4" />
            SmartLife / Tuya
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Direkt via Tuya OpenAPI (offiziell, stabil). Erfordert einmaliges
            Setup bei iot.tuya.com.
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
          {/* Setup Guide */}
          <div className="card-2 p-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-left text-[12px] text-cream font-medium"
            >
              <span className="flex items-center gap-2">
                {showGuide ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                So kriegst du Access ID + Secret (ca. 5 Min, einmalig)
              </span>
            </button>
            {showGuide && (
              <ol className="mt-3 space-y-2 text-[11px] text-muted leading-relaxed">
                <li>
                  <span className="text-cream">1.</span> Öffne{" "}
                  <a
                    href="https://iot.tuya.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cream underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    iot.tuya.com <ExternalLink className="size-3" />
                  </a>{" "}
                  und erstelle einen gratis Developer-Account (gleicher
                  Login wie bei SmartLife funktioniert <strong>nicht</strong> —
                  das ist ein separater Account für die Developer-Konsole).
                </li>
                <li>
                  <span className="text-cream">2.</span> Oben links auf <em>Cloud</em>{" "}
                  → <em>Development</em> → <em>Create Cloud Project</em>.
                  Industry: <em>Smart Home</em>. Region passend wählen (für Europa:{" "}
                  <em>Central Europe</em>).
                </li>
                <li>
                  <span className="text-cream">3.</span> Beim Erstellen die APIs{" "}
                  <em>IoT Core</em>, <em>Authorization</em> und{" "}
                  <em>Smart Home Family Management</em> aktivieren.
                </li>
                <li>
                  <span className="text-cream">4.</span> Im Projekt → Tab{" "}
                  <em>Devices</em> → <em>Link Tuya App Account</em> → QR-Code mit
                  deiner SmartLife-App scannen (SmartLife App → Me → Scan oben
                  rechts).
                </li>
                <li>
                  <span className="text-cream">5.</span> Zurück im Projekt-Overview:{" "}
                  <em>Access ID/Client ID</em> und <em>Access Secret/Client Secret</em>{" "}
                  kopieren → unten hier einfügen.
                </li>
              </ol>
            )}
          </div>

          <div>
            <span className="stat-label">Region (Rechenzentrum)</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegion(r.id)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                    region === r.id
                      ? "border-cream/40 text-cream bg-cream/10"
                      : "border-line text-muted hover:text-cream"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="stat-label">Access ID / Client ID</span>
            <input
              type="text"
              name="tuya-access-id"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={accessId}
              onChange={(e) => setAccessId(e.target.value)}
              placeholder="z. B. qdt7jx8k5v3n2wyr98fw"
              className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40 font-mono text-[12px]"
            />
          </label>

          <label className="block">
            <span className="stat-label">Access Secret / Client Secret</span>
            <input
              type="password"
              name="tuya-secret"
              autoComplete="off"
              spellCheck={false}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && doConnect()}
              placeholder="••••••••••••••"
              className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40 font-mono text-[12px]"
            />
          </label>

          {loginError && (
            <div className="text-[12px] text-danger flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            onClick={doConnect}
            disabled={busy || !accessId || !secret}
            className="btn btn-primary w-full justify-center"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            {busy ? "Verbinde…" : "Mit SmartLife verbinden"}
          </button>
        </>
      ) : (
        <>
          <div className="card-2 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-cream flex items-center gap-1.5">
                <Check className="size-4 text-leaf" />
                {connection.tuya!.uidNickname || connection.tuya!.uid}
              </div>
              <div className="text-[11px] text-muted">
                Region {REGIONS.find((r) => r.id === connection.tuya!.region)?.label}
                {" · "}Access ID {connection.tuya!.accessId.slice(0, 8)}…
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                Seit {new Date(connection.tuya!.connectedAt).toLocaleString("de-DE")}
              </div>
            </div>
            <button onClick={disconnect} className="btn text-xs shrink-0">
              <Unplug className="size-3.5" />
              Trennen
            </button>
          </div>

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
              Lade SmartLife-Geräte…
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
              SmartLife-App zu deinem Account hinzu, dann hier neu laden.
            </div>
          )}

          {devices && devices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {devices.map((d) => (
                <TuyaDeviceCard
                  key={d.id}
                  dev={d}
                  isImported={pairedIds.has(d.id)}
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

function TuyaDeviceCard({
  dev,
  isImported,
  rooms,
  onImport,
}: {
  dev: TuyaDevice;
  isImported: boolean;
  rooms: Array<{ id: string; name: string }>;
  onImport: (roomId?: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const on = tuyaIsOn(dev);
  const isLight = dev.category === "dj" || dev.category === "dd" || dev.category === "xdd";
  const Icon = isLight ? Lightbulb : Power;

  return (
    <div
      className={`rounded-xl bg-[#141917] border p-4 ${isImported ? "border-leaf/30" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`size-10 rounded-xl grid place-items-center border shrink-0 ${
              dev.online
                ? on
                  ? "bg-leaf/10 text-leaf border-leaf/30"
                  : "bg-cream/5 text-cream border-cream/20"
                : "bg-panel2 text-muted border-line"
            }`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-fg truncate">{dev.name}</div>
            <div className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
              {dev.online ? (
                <Wifi className="size-3 text-leaf" />
              ) : (
                <WifiOff className="size-3 text-muted" />
              )}
              <span className="truncate">{dev.product_name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted font-mono truncate mb-3">
        {dev.id}
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
            <option value="">+ Neuer Raum "{dev.name}"</option>
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
          disabled={!dev.online}
          className="btn btn-primary text-xs w-full justify-center disabled:opacity-50"
        >
          <Download className="size-3.5" />
          {dev.online ? "Übernehmen" : "Gerät offline"}
        </button>
      )}
    </div>
  );
}
