/**
 * Consentimento de dados pedagógicos de melhoria.
 * localStorage guarda a escolha explícita; perfil Supabase sincroniza quando há sessão cloud.
 */
import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";

export const TELEMETRY_CONSENT_KEY = "longyu:telemetry-consent";
export const PEDAGOGY_QUEUE_KEY = "longyu:beta-pedagogy-queue";

export type TelemetryConsentDecision = {
  allowed: boolean;
  /** true se o aluno já escolheu (Permitir / Agora não / toggle). */
  decided: boolean;
};

/** Ausência de chave = ainda não decidiu → não enviar (opt-in). */
export function getTelemetryConsent(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(TELEMETRY_CONSENT_KEY);
  if (raw === null) return false;
  return raw === "1" || raw === "true";
}

export function hasTelemetryConsentChoice(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(TELEMETRY_CONSENT_KEY) !== null;
}

export function readTelemetryConsentDecision(): TelemetryConsentDecision {
  return {
    allowed: getTelemetryConsent(),
    decided: hasTelemetryConsentChoice(),
  };
}

export function clearPedagogyEventQueue(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PEDAGOGY_QUEUE_KEY);
  } catch {
    /* ignore */
  }
}

export function pedagogyEventQueueSize(): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PEDAGOGY_QUEUE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

async function syncConsentToProfile(allowed: boolean): Promise<void> {
  if (!isSupabaseBackendEnabled()) return;
  const client = getSupabaseClient();
  if (!client) return;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  const now = new Date().toISOString();
  const patch = allowed
    ? {
        pedagogy_analytics_consent: true,
        pedagogy_analytics_consented_at: now,
        pedagogy_analytics_revoked_at: null,
        updated_at: now,
      }
    : {
        pedagogy_analytics_consent: false,
        pedagogy_analytics_revoked_at: now,
        updated_at: now,
      };

  await client.from("profiles").update(patch).eq("id", user.id);
}

/**
 * Persiste a escolha local, limpa a fila ao revogar e tenta sincronizar no perfil cloud.
 * Feedback manual não passa por aqui.
 */
export async function setTelemetryConsent(enabled: boolean): Promise<void> {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(TELEMETRY_CONSENT_KEY, enabled ? "1" : "0");
  }
  if (!enabled) {
    clearPedagogyEventQueue();
  }
  await syncConsentToProfile(enabled);
}

/** Aplica consentimento vindo do perfil cloud sem reenviar sync (evita loop). */
export function applyTelemetryConsentFromProfile(allowed: boolean | null | undefined): void {
  if (typeof allowed !== "boolean") return;
  if (typeof localStorage === "undefined") return;
  // Só aplica se ainda não houver escolha local, ou se o perfil for a fonte após login.
  localStorage.setItem(TELEMETRY_CONSENT_KEY, allowed ? "1" : "0");
  if (!allowed) clearPedagogyEventQueue();
}

/** Carrega consentimento do perfil após login cloud. */
export async function hydrateTelemetryConsentFromProfile(): Promise<boolean | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("profiles")
    .select("pedagogy_analytics_consent")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  const allowed = Boolean(data.pedagogy_analytics_consent);
  applyTelemetryConsentFromProfile(allowed);
  return allowed;
}
