import { useState } from "react";
import { Bluetooth, Wifi, Bell, Thermometer } from "lucide-react";
import { PhaenaticsSeal } from "./Brand";

interface Toggle {
  key: string;
  label: string;
  desc: string;
  enabled: boolean;
  icon: typeof Wifi;
}

export function SettingsView() {
  const [toggles, setToggles] = useState<Toggle[]>([
    {
      key: "wifi",
      label: "WiFi Sync",
      desc: "Cloud-Backup von Sensorverläufen alle 5 Minuten.",
      enabled: true,
      icon: Wifi,
    },
    {
      key: "bt",
      label: "Bluetooth Discovery",
      desc: "Neue UIS-Geräte automatisch erkennen.",
      enabled: true,
      icon: Bluetooth,
    },
    {
      key: "alerts",
      label: "Push-Benachrichtigungen",
      desc: "Alarm bei Werten außerhalb der Zielbereiche.",
      enabled: true,
      icon: Bell,
    },
    {
      key: "units",
      label: "Fahrenheit verwenden",
      desc: "Temperaturen in °F statt °C anzeigen.",
      enabled: false,
      icon: Thermometer,
    },
  ]);

  function flip(key: string) {
    setToggles((t) => t.map((x) => (x.key === key ? { ...x, enabled: !x.enabled } : x)));
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-4">
        <PhaenaticsSeal size={64} />
        <div>
          <h2 className="display text-3xl text-cream leading-none">Phaenatics Control</h2>
          <p className="text-[12px] text-muted mt-1.5">
            v0.1.0 · Sim Mode · 3 Räume verbunden · Cannabis Social Club Lüneburg
          </p>
        </div>
      </div>

      <div className="card divide-y divide-line">
        {toggles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-panel2 border border-line grid place-items-center text-muted">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-[12px] text-muted">{t.desc}</div>
              </div>
              <button
                onClick={() => flip(t.key)}
                className={`relative h-6 w-10 rounded-full border transition-colors ${
                  t.enabled ? "bg-leaf/20 border-leaf/40" : "bg-panel border-line"
                }`}
                aria-label="Umschalten"
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full transition-all ${
                    t.enabled ? "left-[18px] bg-leaf" : "left-0.5 bg-muted"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="card p-5 text-[12px] text-muted leading-relaxed">
        <span className="display text-cream text-base">Phaenatics Control</span> ist die
        Grow-Controller-App des Phaenatics e.V. — Professioneller Cannabis Social Club
        in Lüneburg. Design und Werte im Vereins-Stil, Steuerung inspiriert von AC Infinity
        UIS. Sensorwerte werden hier lokal simuliert — keine Daten verlassen dein Gerät.
      </div>
    </div>
  );
}
