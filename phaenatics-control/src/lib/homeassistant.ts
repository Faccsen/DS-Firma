// Home Assistant REST client. Calls go directly from the browser to the
// HA instance — no Vercel proxy needed because HA exposes a documented
// REST API with Long-Lived Access Tokens. The user has to allow our
// origin in HA's `cors_allowed_origins` for the local case; Nabu Casa
// / public HTTPS hosts work out of the box.

export interface HaEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    unit_of_measurement?: string;
    device_class?: string;
    icon?: string;
    brightness?: number;
    supported_features?: number;
    hvac_mode?: string;
    current_temperature?: number;
    current_humidity?: number;
    percentage?: number;
  };
  last_changed: string;
  last_updated: string;
}

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

async function haFetch(baseUrl: string, token: string, path: string, init?: RequestInit) {
  const resp = await fetch(`${trimBase(baseUrl)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.text();
      if (body) detail = `${resp.statusText} — ${body.slice(0, 180)}`;
    } catch {
      /* keep statusText */
    }
    throw new Error(`HA ${resp.status}: ${detail}`);
  }
  return resp;
}

/** `GET /api/` — returns `{message, version}`. Used to verify a token. */
export async function haPing(
  baseUrl: string,
  token: string,
): Promise<{ ok: true; version?: string }> {
  const resp = await haFetch(baseUrl, token, "/api/");
  const data = (await resp.json()) as { message?: string; version?: string };
  if (data.message !== "API running.") {
    throw new Error(`Unerwartete Antwort: ${JSON.stringify(data).slice(0, 100)}`);
  }
  return { ok: true, version: data.version };
}

/** `GET /api/states` — list every entity with its current state. */
export async function haListStates(
  baseUrl: string,
  token: string,
): Promise<HaEntityState[]> {
  const resp = await haFetch(baseUrl, token, "/api/states");
  return (await resp.json()) as HaEntityState[];
}

/** Call a service, e.g. switch.toggle, light.turn_on, climate.set_temperature. */
export async function haCallService(
  baseUrl: string,
  token: string,
  domain: string,
  service: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await haFetch(baseUrl, token, `/api/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Translate a Phaenatics device state change into the right HA service call.
 * Supports: switch / light / fan / climate domains at a minimum.
 */
export async function haWriteDevice(
  baseUrl: string,
  token: string,
  entityId: string,
  change: { on?: boolean; level?: number },
): Promise<void> {
  const domain = entityId.split(".")[0];
  const base = { entity_id: entityId } as Record<string, unknown>;

  if (change.on !== undefined && change.level === undefined) {
    const service = change.on ? "turn_on" : "turn_off";
    await haCallService(baseUrl, token, domain, service, base);
    return;
  }
  if (change.level !== undefined) {
    switch (domain) {
      case "light":
        await haCallService(baseUrl, token, "light", "turn_on", {
          ...base,
          brightness_pct: clamp(change.level, 0, 100),
        });
        return;
      case "fan":
        await haCallService(baseUrl, token, "fan", "set_percentage", {
          ...base,
          percentage: clamp(change.level * 10, 0, 100),
        });
        return;
      case "climate":
        await haCallService(baseUrl, token, "climate", "set_temperature", {
          ...base,
          temperature: change.level,
        });
        return;
      case "cover":
        await haCallService(baseUrl, token, "cover", "set_cover_position", {
          ...base,
          position: clamp(change.level, 0, 100),
        });
        return;
      case "switch":
      default:
        // Switches have no level — just toggle based on sign
        if (change.level > 0) await haCallService(baseUrl, token, domain, "turn_on", base);
        else await haCallService(baseUrl, token, domain, "turn_off", base);
        return;
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Parse a HA sensor state string to a number if possible. */
export function haStateNumber(s: HaEntityState | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s.state);
  return Number.isFinite(n) ? n : undefined;
}

/** Return `true` when the HA state represents "on" for switch/light/fan. */
export function haStateOn(s: HaEntityState | undefined): boolean {
  if (!s) return false;
  return ["on", "home", "open", "unlocked", "playing"].includes(s.state.toLowerCase());
}

/**
 * Deduce a Phaenatics device kind from a HA entity id + attributes. Used
 * when the user imports an entity so the resulting app Device gets the
 * right icon and semantics.
 */
export type Kind =
  | "fan"
  | "intake"
  | "exhaust"
  | "light"
  | "humidifier"
  | "dehumidifier"
  | "heater"
  | "ac"
  | "co2"
  | "pump";

export function haEntityKind(e: HaEntityState): Kind {
  const [domain] = e.entity_id.split(".");
  const name = `${e.attributes.friendly_name ?? ""} ${e.entity_id}`.toLowerCase();
  if (/(abluft|exhaust|ablass)/.test(name)) return "exhaust";
  if (/(zuluft|intake|frischluft)/.test(name)) return "intake";
  if (/(dehumid|entfeucht|trockner)/.test(name)) return "dehumidifier";
  if (/(humid|befeucht|verdampfer)/.test(name)) return "humidifier";
  if (/(heiz|heater|warm)/.test(name)) return "heater";
  if (/(klima|air\s*cond|split|mini-?split)/.test(name)) return "ac";
  if (/(pump|doser|dosier|peristalt)/.test(name)) return "pump";
  if (/(co2|co₂)/.test(name)) return "co2";
  if (domain === "light") return "light";
  if (domain === "fan") return "fan";
  if (domain === "humidifier") return e.attributes.device_class === "dehumidifier" ? "dehumidifier" : "humidifier";
  if (domain === "climate") return "ac";
  return "fan";
}

/** HA device_class for a sensor entity, if any. */
export function sensorMeasurement(e: HaEntityState): "temp" | "humidity" | "vpd" | "co2" | "other" {
  const cls = (e.attributes.device_class ?? "").toLowerCase();
  const name = `${e.attributes.friendly_name ?? ""} ${e.entity_id}`.toLowerCase();
  if (cls === "temperature" || /temp/.test(name)) return "temp";
  if (cls === "humidity" || /\b(humid|feucht|rf|rh)\b/.test(name)) return "humidity";
  if (/vpd/.test(name)) return "vpd";
  if (cls === "carbon_dioxide" || /co2|co₂/.test(name)) return "co2";
  return "other";
}
