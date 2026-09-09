import { getInterfaceLocale } from "../i18n/locale";
import { getTelemetryConsent } from "./telemetryConsent";

/**
 * Local culture telemetry. Does not extend pedagogy RPC event types.
 * No private text. Consent is checked on every emit.
 */
export const CULTURE_EVENT_TYPES = [
  "culture_open",
  "culture_complete",
  "culture_save",
  "culture_from_journey",
  "culture_mission_start",
  "culture_step_answer",
  "culture_mission_complete",
  "culture_review_complete",
] as const;

export type CultureEventType = (typeof CULTURE_EVENT_TYPES)[number];

const PII_KEY = /email|name|phone|password|token|address|user|account|ip\b/i;

export type CultureEventMetadata = Record<string, string | number | boolean | null>;

export function trackCultureEvent(eventType: CultureEventType, metadata: CultureEventMetadata = {}): void {
  if (!getTelemetryConsent()) return;
  const safe: CultureEventMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEY.test(key)) continue;
    if (typeof value === "string" && value.length > 80) continue;
    safe[key] = value;
  }
  safe.interface_locale = getInterfaceLocale();
  try {
    window.dispatchEvent(new CustomEvent("longyu:culture", { detail: { eventType, metadata: safe } }));
  } catch {
    // Telemetry must never break the hub.
  }
  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.debug("[culture]", eventType, safe);
  }
}
