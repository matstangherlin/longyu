import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { mergeRemoteProgress } from "../lib/syncMerge";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useStore } from "../lib/store";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let pendingPush = false;

export async function pushProgressToCloud(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Backend em nuvem desativado." };
  }
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, message: "Faça login para sincronizar o progresso." };

  const snapshot = activeLearningRepository().exportSnapshot();
  const result = await activeLearningRepository().importSnapshot(snapshot);
  return { ok: result.ok, message: result.message };
}

/** Após login: mescla nuvem + local e envia o melhor snapshot de volta. */
/** Se já existir sessão Supabase no dispositivo, promove para cloud e sincroniza. */
export async function restoreCloudSessionIfPresent(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Backend em nuvem desativado." };
  }

  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.user?.email) {
    return { ok: false, message: "Sem sessão ativa." };
  }

  const { accounts, currentAccountId } = useStore.getState();
  if (accounts[currentAccountId]?.authMode === "cloud") {
    return { ok: true, message: "Sessão já ativa." };
  }

  return syncAuthSessionProgress();
}

export async function syncAuthSessionProgress(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Backend em nuvem desativado." };
  }

  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email) return { ok: false, message: "Sem sessão ativa." };

  const store = useStore.getState();
  store.syncAccountWithCloudAuth(user.email);

  const localSnapshot = activeLearningRepository().exportSnapshot();
  const remote = await activeLearningRepository().fetchSnapshot();

  if (remote.ok && remote.snapshot) {
    const mergedProgress = mergeRemoteProgress(
      localSnapshot.snapshot.progress,
      remote.snapshot.snapshot.progress
    );
    store.applyCloudProgressSnapshot({
      ...remote.snapshot.snapshot,
      progress: mergedProgress,
    });
  }

  return pushProgressToCloud();
}

export function scheduleCloudProgressPush(delayMs = 1200): void {
  if (!isSupabaseBackendEnabled()) return;
  const { accounts, currentAccountId } = useStore.getState();
  if (accounts[currentAccountId]?.authMode !== "cloud") return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushCloudProgressPush();
  }, delayMs);
}

export async function flushCloudProgressPush(): Promise<void> {
  if (syncInFlight) {
    pendingPush = true;
    return;
  }
  syncInFlight = true;
  try {
    await pushProgressToCloud();
  } finally {
    syncInFlight = false;
    if (pendingPush) {
      pendingPush = false;
      void flushCloudProgressPush();
    }
  }
}

export function cancelScheduledCloudPush(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}
