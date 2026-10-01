import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "phaenatics-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Already running as installed PWA? Don't nag.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error — iOS Safari non-standard flag
      window.navigator.standalone === true;
    if (standalone) {
      setDismissed(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari never fires beforeinstallprompt — detect it to show manual hint.
    const ua = navigator.userAgent;
    const iosLike =
      /iPhone|iPad|iPod/.test(ua) ||
      (ua.includes("Macintosh") && "ontouchend" in document);
    const safari = /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (iosLike && safari) setIsIOS(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed) return null;
  if (!evt && !isIOS) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no-op */
    }
    setDismissed(true);
  };

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") dismiss();
    setEvt(null);
  }

  return (
    <div className="fixed left-3 right-3 bottom-20 md:bottom-6 md:left-auto md:right-6 md:w-96 z-30">
      <div className="card p-4 flex items-start gap-3 shadow-glow">
        <div className="size-10 rounded-xl grid place-items-center border border-cream/30 bg-cream/10 text-cream">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-cream">App installieren</div>
          {isIOS ? (
            <div className="text-[12px] text-muted mt-1 leading-relaxed">
              Tippe auf <Share className="inline size-3.5 -mt-0.5" /> und wähle
              <span className="text-fg"> „Zum Home-Bildschirm"</span>.
            </div>
          ) : (
            <div className="text-[12px] text-muted mt-1 leading-relaxed">
              Phaenatics Control als App aufs Handy legen — Fullscreen, offline-fähig.
            </div>
          )}
          {!isIOS && (
            <button onClick={install} className="btn btn-primary mt-3 text-xs">
              Installieren
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="btn btn-ghost -mr-1 -mt-1"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
