import { useStore } from "../store";
import { allowSeededLocalSession, isDevLocalAuthAllowed } from "./localAuthPolicy";
import { getCloudUserId } from "./cloudSession";
import { buildProgressSnapshot, isMeaningfulProgress } from "../progressSnapshot";
import { getSupabaseClient } from "../supabaseClient";
import { isSupabaseBackendEnabled } from "../backendConfig";

export type SessionAudience =
  | "anonymous"
  | "legacy"
  | "seeded"
  | "cloud_pending_onboarding"
  | "cloud_ready";

export const E2E_SESSION_AUDIENCE_KEY = "longyu:e2e-session-audience";

const AUDIENCES = new Set<SessionAudience>([
  "anonymous",
  "legacy",
  "seeded",
  "cloud_pending_onboarding",
  "cloud_ready",
]);

export function waitForStoreHydration(): Promise<void> {
  if (useStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export function hasLegacyLocalProgress(state = useStore.getState()): boolean {
  if (allowSeededLocalSession()) return false;
  const account = state.accounts[state.currentAccountId];
  if (!account || account.authMode !== "local") return false;
  return (
    isMeaningfulProgress(buildProgressSnapshot(account)) ||
    state.accountSetupComplete ||
    state.completedLessons.length > 0
  );
}

export function canEnterJourney(audience: SessionAudience): boolean {
  return audience === "cloud_ready" || audience === "seeded";
}

function readE2EAudienceOverride(): SessionAudience | null {
  if (!isDevLocalAuthAllowed()) return null;
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(E2E_SESSION_AUDIENCE_KEY);
    if (!raw || !AUDIENCES.has(raw as SessionAudience)) return null;
    return raw as SessionAudience;
  } catch {
    return null;
  }
}

async function readServerOnboardingCompleted(userId: string): Promise<boolean | null> {
  if (!isSupabaseBackendEnabled()) return null;
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  if (!data) return false;
  return data.onboarding_completed === true;
}

/**
 * Identidade efetiva. Nunca usa so accountSetupComplete / authMode persistidos.
 * cloud_ready = sessao auth + profile.onboarding_completed no servidor.
 */
export async function resolveSessionAudience(): Promise<SessionAudience> {
  await waitForStoreHydration();
  const state = useStore.getState();
  if (allowSeededLocalSession() && state.accountSetupComplete) return "seeded";

  const e2eOverride = readE2EAudienceOverride();
  if (e2eOverride) return e2eOverride;

  const userId = await getCloudUserId();
  if (userId) {
    const completed = await readServerOnboardingCompleted(userId);
    if (completed === true) return "cloud_ready";
    return "cloud_pending_onboarding";
  }

  if (hasLegacyLocalProgress(state)) return "legacy";
  return "anonymous";
}
