import { useState } from "react";
import {
  Link2,
  Loader2,
  AlertCircle,
  Check,
  Plug,
  Unplug,
  Home,
  ExternalLink,
} from "lucide-react";
import { useStore } from "../lib/store";

export function HomeAssistantSettings() {
  const connection = useStore((s) => s.connection);
  const connect = useStore((s) => s.connectHomeAssistant);
  const disconnect = useStore((s) => s.disconnectHomeAssistant);
  const poll = useStore((s) => s.pollHomeAssistant);
  const status = useStore((s) => s.connectionStatus);

  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showHelp, setShowHelp] = useState(false);

  const connected = !!connection.ha?.verified;

  async function doConnect() {
    setError(undefined);
    setBusy(true);
    try {
      await connect(baseUrl.trim(), token.trim());
      await poll();
      setBaseUrl("");
      setToken("");
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
            <Home className="size-4" />
            Home Assistant
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            Universal-Backend für SmartLife/Tuya, Shelly, Zigbee und mehr.
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

      {!connected && (
        <div className="card-2 p-3 text-[11px] text-muted leading-relaxed">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-cream underline underline-offset-2"
          >
            {showHelp ? "Hilfe ausblenden" : "Wo bekomme ich URL + Token?"}
          </button>
          {showHelp && (
            <div className="mt-2 space-y-2">
              <div>
                <strong className="text-cream">URL</strong>: Die Adresse unter der
                du HA erreichst. Beispiele:
                <ul className="list-disc list-inside ml-1 mt-1 text-fg">
                  <li><code>https://&lt;id&gt;.ui.nabu.casa</code> (Nabu Casa)</li>
                  <li><code>https://ha.phaenatics.de</code> (eigene Domain)</li>
                  <li><code>http://192.168.1.42:8123</code> (nur im lokalen Netz)</li>
                </ul>
              </div>
              <div>
                <strong className="text-cream">Long-Lived Access Token</strong>:
                In HA auf dein Profil klicken (links unten) → Tab
                „Sicherheit" → ganz unten „Long-Lived Access Tokens" →
                <em>Token erstellen</em>, Namen vergeben, kopieren.
              </div>
              <div className="pt-1 border-t border-line text-muted">
                <strong>CORS</strong>: Falls du HA nur lokal betreibst, musst du
                in <code>configuration.yaml</code> die Phaenatics-Domain in{" "}
                <code>http: cors_allowed_origins</code> freigeben. Bei Nabu Casa
                oder öffentlichem HTTPS ist das meist nicht nötig.
              </div>
            </div>
          )}
        </div>
      )}

      {!connected ? (
        <div className="space-y-3">
          <label className="block">
            <span className="stat-label">Home Assistant URL</span>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://home.phaenatics.de"
              className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40 font-mono text-[12px]"
            />
          </label>
          <label className="block">
            <span className="stat-label">Long-Lived Access Token</span>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && doConnect()}
              placeholder="eyJhbGciOi…"
              className="mt-1 w-full card-2 px-3 py-2 text-sm text-fg outline-none focus:border-cream/40 font-mono text-[12px]"
            />
          </label>
          {error && (
            <div className="text-[12px] text-danger flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={doConnect}
            disabled={busy || !baseUrl || !token}
            className="btn btn-primary w-full justify-center"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
            {busy ? "Prüfe Verbindung…" : "Mit Home Assistant verbinden"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-cream flex items-center gap-1.5 truncate">
                  <Check className="size-4 text-leaf shrink-0" />
                  {connection.ha!.baseUrl}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {connection.ha!.version
                    ? `HA Core ${connection.ha!.version}`
                    : "HA Core · Version unbekannt"}
                </div>
              </div>
              <button onClick={disconnect} className="btn text-xs shrink-0">
                <Unplug className="size-3.5" />
                Trennen
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => poll()} className="btn text-xs flex-1 justify-center">
              <Loader2 className={`size-3.5 ${status === "polling" ? "animate-spin" : ""}`} />
              Jetzt synchronisieren
            </button>
            <a
              href={`${connection.ha!.baseUrl}/profile/security`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-xs"
            >
              <ExternalLink className="size-3.5" />
              HA öffnen
            </a>
          </div>
          <div className="card-2 p-3 text-[11px] text-muted">
            <Link2 className="size-3.5 inline mr-1" />
            Entitäten zuordnen funktioniert in der{" "}
            <span className="text-fg">„Home Assistant Entitäten"</span>-Sektion
            weiter unten.
          </div>
        </div>
      )}
    </section>
  );
}
