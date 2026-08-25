import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import {
  BUSINESS_FUNNEL_EVENTS,
  type BusinessFunnelEvent,
} from "../lib/businessLead";
import { getSupabaseClient } from "../lib/supabaseClient";

const STORAGE_KEY = "longyu:business-funnel";
const MAX_LOCAL = 40;

interface StoredBusinessEvent {
  type: BusinessFunnelEvent;
  ctaId: string | null;
  at: number;
}

function isFunnelEvent(value: string): value is BusinessFunnelEvent {
  return (BUSINESS_FUNNEL_EVENTS as readonly string[]).includes(value);
}

function readLocal(): StoredBusinessEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as StoredBusinessEvent[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_LOCAL) : [];
  } catch {
    return [];
  }
}

function writeLocal(events: StoredBusinessEvent[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_LOCAL)));
  } catch {
    // quota / modo privado
  }
}

/**
 * Funil comercial sem PII: só o nome do evento e um id de CTA.
 * Não grava e-mail, empresa, cargo nem mensagem.
 */
export function trackBusinessEvent(type: BusinessFunnelEvent, ctaId?: string): void {
  if (!isFunnelEvent(type)) return;
  const cta = ctaId ? ctaId.slice(0, 64) : null;
  const event: StoredBusinessEvent = { type, ctaId: cta, at: Date.now() };
  writeLocal([...readLocal(), event]);

  if (!isSupabaseBackendEnabled()) return;
  const client = getSupabaseClient();
  if (!client) return;
  void client.functions
    .invoke("submit-business-lead", {
      body: { kind: "funnel", event: type, ctaId: cta },
    })
    .catch(() => undefined);
}

export function readBusinessEventsForTests(): StoredBusinessEvent[] {
  return readLocal();
}
