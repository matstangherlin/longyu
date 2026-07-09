import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getProgressScore, isMeaningfulProgress, type ProgressSnapshotBody } from "../lib/progressSnapshot";
import { mergeRemoteProgress } from "../lib/syncMerge";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useStore } from "../lib/store";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let pendingPush = false;

function markCloudSync(status: "loading" | "synced" | "pending" | "error", message: string): void {
  useStore.getState().setCloudSyncState(status, message);
}

function snapshotBodyWithProgress(
  base: ProgressSnapshotBody | undefined,
  progress: ProgressSnapshotBody["progress"],
  fallbackName: string,
  fallbackEmail?: string
): ProgressSnapshotBody {
  const now = Date.now();
  return {
    schemaVersion: base?.schemaVersion ?? 1,
    exportedAt: now,
    account: {
      id: base?.account.id ?? "cloud",
      name: base?.account.name ?? fallbackName,
      email: base?.account.email ?? fallbackEmail,
      authMode: "cloud",
      createdAt: base?.account.createdAt ?? now,
      updatedAt: now,
    },
    progress,
  };
}

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

  markCloudSync("loading", "Sincronizando progresso com a nuvem...");
  const snapshot = activeLearningRepository().exportSnapshot();
  const result = await activeLearningRepository().importSnapshot(snapshot);
  markCloudSync(
    result.ok ? "synced" : "error",
    result.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
  );
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
  if (!session?.user?.id) {
    return { ok: false, message: "Sem sessão ativa." };
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
  if (!user?.id) return { ok: false, message: "Sem sessão ativa." };

  const store = useStore.getState();
  markCloudSync("loading", "Carregando progresso da nuvem...");

  const localSnapshot = activeLearningRepository().exportSnapshot();
  const remote = await activeLearningRepository().fetchSnapshot();
  if (!remote.ok) {
    markCloudSync("error", "Erro ao sincronizar — seu progresso local está seguro.");
    return remote;
  }

  const localProgress = localSnapshot.snapshot.progress;
  const remoteProgress = remote.snapshot?.snapshot.progress;
  const localMeaningful = isMeaningfulProgress(localSnapshot);
  const remoteMeaningful = isMeaningfulProgress(remote.snapshot);
  const localScore = getProgressScore(localSnapshot);
  const remoteScore = getProgressScore(remote.snapshot);
  const currentName = store.accounts[store.currentAccountId]?.name ?? user.email ?? "Aluno Longyu";

  if (remote.snapshot && !localMeaningful && remoteMeaningful) {
    store.activateCloudAccount(
      { userId: user.id, email: user.email, name: remote.snapshot.snapshot.account.name ?? currentName },
      remote.snapshot.snapshot.progress
    );
    markCloudSync("synced", "Progresso sincronizado.");
    return { ok: true, message: "Progresso restaurado da nuvem." };
  }

  if (remote.snapshot && remoteProgress && localMeaningful) {
    const mergedProgress = mergeRemoteProgress(localProgress, remoteProgress);
    const mergedBody = snapshotBodyWithProgress(remote.snapshot.snapshot, mergedProgress, currentName, user.email);
    store.activateCloudAccount(
      { userId: user.id, email: user.email, name: mergedBody.account.name ?? currentName },
      mergedProgress
    );
    const mergedSnapshot = activeLearningRepository().exportSnapshot();
    const push = await activeLearningRepository().importSnapshot(mergedSnapshot);
    markCloudSync(
      push.ok ? "synced" : "error",
      push.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
    );
    return {
      ok: push.ok,
      message: push.ok
        ? `Progresso mesclado com segurança (local ${localScore} · nuvem ${remoteScore}).`
        : push.message,
    };
  }

  if (!remote.snapshot && localMeaningful) {
    store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName }, localProgress);
    const push = await activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot());
    markCloudSync(
      push.ok ? "synced" : "error",
      push.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
    );
    return {
      ok: push.ok,
      message: push.ok ? "Conta na nuvem iniciada com seu progresso local." : push.message,
    };
  }

  store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName });
  const initialPush = await activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot());
  markCloudSync(
    initialPush.ok ? "synced" : "error",
    initialPush.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
  );
  return {
    ok: initialPush.ok,
    message: initialPush.ok ? "Conta na nuvem inicializada sem sobrescrever progresso existente." : initialPush.message,
  };
}

export function scheduleCloudProgressPush(delayMs = 1200): void {
  if (!isSupabaseBackendEnabled()) return;
  const { accounts, currentAccountId } = useStore.getState();
  if (accounts[currentAccountId]?.authMode !== "cloud") return;

  markCloudSync("pending", "Sincronização pendente.");
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
