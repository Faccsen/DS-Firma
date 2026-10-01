# Phaenatics Control

Smart Grow Controller App im Stil von AC Infinity UIS — Dashboard, Gerätesteuerung,
Automationen und Sensor-Verlauf für Indoor-Grow-Räume.

![stack](https://img.shields.io/badge/vite-5-blue) ![stack](https://img.shields.io/badge/react-18-149eca) ![stack](https://img.shields.io/badge/typescript-5-3178c6) ![stack](https://img.shields.io/badge/tailwind-3-38bdf8)

## Features

- **Mehrere Grow-Räume** mit eigenen Phasen (Keimling, Wachstum, Blüte, Trocknung)
- **Live-Sensorik** für Temperatur, Luftfeuchte, VPD (Tetens-Berechnung mit Blatt-Offset) und CO₂
- **Gerätesteuerung** für Zuluft, Abluft, Lüfter, LED-Licht, Be-/Entfeuchter, AC, Heizung, CO₂
- **Modi pro Gerät**: Auto, Manuell, Zeitplan, Aus
- **Zielbereiche** pro Sensor mit visuellem In-Range-Indikator und Farb-Status
- **Automationen** (Wenn-Dann): z. B. *„Wenn Temp > 27 °C → Abluft boosten"*
- **24h-Verlauf** mit interaktiven Charts (Recharts)
- **VPD-Gauge** mit phasenspezifischem Sweet Spot
- **Responsive UI**: Desktop-Sidebar + Mobile-Bottom-Nav
- **Sim Mode**: realistischer Klima-Drift basierend auf aktiven Geräten

## Stack

- Vite + React 18 + TypeScript
- TailwindCSS (Dark Theme, Leaf-Green Accent)
- Zustand (State)
- Recharts (Charts)
- Lucide (Icons)

## Entwicklung

```bash
cd phaenatics-control
npm install
npm run dev      # http://localhost:5173
npm run build    # produktiver Build nach dist/
```

## Deploy auf Vercel (empfohlen)

Die App ist eine installierbare PWA — der Verein kriegt eine echte URL,
jedes Mitglied kann sie auf dem Handy installieren.

**Einmaliges Setup** (ca. 3 Minuten):

1. [vercel.com](https://vercel.com) → *Sign Up* mit GitHub
2. *Add New…* → *Project* → Repository `Faccsen/DS-Firma` importieren
3. Beim Konfigurieren:
   - **Root Directory**: `phaenatics-control`
   - Framework: `Vite` (wird automatisch erkannt)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
4. *Deploy*

Nach ~1 Minute hast du eine URL wie `phaenatics.vercel.app`. Jeder Push
auf `main` deployt automatisch neu. Für eigene Domain (`control.phaenatics.de`)
im Dashboard unter *Settings → Domains* hinterlegen.

Alternativ per CLI, lokal aus `phaenatics-control/`:

```bash
npx vercel        # Login + initial deploy
npx vercel --prod # production deploy
```

## Auf dem Handy installieren

Nach dem Vercel-Deploy:

- **Android (Chrome)**: URL öffnen → Chrome zeigt automatisch den
  Install-Prompt der App ("Installieren"-Button rechts unten).
  Falls nicht: Menü → *App installieren* / *Zum Startbildschirm hinzufügen*.
- **iOS (Safari)**: URL öffnen → Share-Button (⬆) → *Zum Home-Bildschirm*.
  (iOS zeigt keinen automatischen Prompt — das ist die einzige Variante.)
- **Desktop (Chrome/Edge)**: In der Adressleiste erscheint ein
  Install-Icon rechts.

Die PWA läuft dann als eigenständige App (eigener App-Switcher-Eintrag,
Fullscreen, Offline-Cache, eigenes Icon mit Phaenatics-Siegel).

## Struktur

```
src/
├── App.tsx                 — Layout & View-Routing
├── data/seed.ts            — Demo-Räume + 24h-Historie
├── lib/
│   ├── store.ts            — Zustand store + Sim-Tick
│   ├── types.ts            — Domain-Modelle
│   ├── vpd.ts              — VPD-Berechnung (Tetens)
│   └── labels.ts           — UI-Beschriftungen
└── components/
    ├── Sidebar / TopBar / MobileNav
    ├── Dashboard / RoomDetail / HistoryView / AutomationView / SettingsView
    ├── RoomCard / SensorTile / VPDGauge / HistoryChart
    ├── DeviceControl / TargetEditor / AutomationRules
```

## Datenmodell (Auszug)

```ts
type GrowRoom = {
  id: string;
  name: string;
  stage: "seedling" | "vegetative" | "flowering" | "drying";
  temp: number; humidity: number; vpd: number; co2: number;
  targets: { temp, humidity, vpd: {min, max} };
  devices: Device[];
  rules: AutomationRule[];
  history: HistoryPoint[];
}
```

## Hinweis

Demo / Simulation. Es wird keine echte Hardware angesprochen — Sensorwerte werden
lokal aus den aktiven Geräten und einem Tag/Nacht-Modell hochgerechnet.
