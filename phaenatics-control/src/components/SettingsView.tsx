import { useState } from "react";
import { Bluetooth, Wifi, Bell, Thermometer, Leaf } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-2xl bg-leaf/15 grid place-items-center">
          <Leaf className="size-6 text-leaf" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Phaenatics Control</h2>
          <p className="text-[12px] text-muted">v0.1.0 · Sim Mode · 3 Räume verbunden</p>
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
        Phaenatics Control ist eine Demo-App im Stil von AC Infinity UIS. Sensorwerte
        werden lokal im Browser simuliert — keine Daten verlassen dein Gerät.
      </div>
    </div>
  );
}
