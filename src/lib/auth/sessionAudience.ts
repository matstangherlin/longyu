import { useStore } from "../store";
import { allowSeededLocalSession } from "./localAuthPolicy";
import { getCloudUserId } from "./cloudSession";
import { buildProgressSnapshot, isMeaningfulProgress } from "../progressSnapshot";

export type SessionAudience = "cloud" | "seeded" | "legacy" | "anonymous";

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

/**
 * Identidade efetiva. Nunca usa só accountSetupComplete / authMode persistidos.
 * cloud = sessão Supabase viva; seeded = bypass E2E explícito; legacy = migração.
 */
export async function resolveSessionAudience(): Promise<SessionAudience> {
  await waitForStoreHydration();
  const state = useStore.getState();
  if (allowSeededLocalSession() && state.accountSetupComplete) return "seeded";
  if (hasLegacyLocalProgress(state)) return "legacy";
  const userId = await getCloudUserId();
  if (userId) return "cloud";
  return "anonymous";
}
