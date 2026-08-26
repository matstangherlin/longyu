import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getProgressScore, isMeaningfulProgress, type ProgressSnapshotBody } from "../lib/progressSnapshot";
import { mergeRemoteProgress } from "../lib/syncMerge";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { getSupabaseClient } from "../lib/supabaseClient";
import { flushSocialEventQueue } from "./socialActivityQueue";
import { syncSocialProfileFromStore } from "./socialService";
import { useStore } from "../lib/store";
import {
  buildLocalEconomyMigrationPayload,
  fetchServerEconomy,
  flushEconomyIntentQueue,
  serverMigrateLocalEconomy,
  shouldUseServerEconomy,
} from "../lib/economyServerBridge";
import { fetchServerIsPro } from "./entitlementService";
import { attributeStoredReferralCode, processReferralPipeline } from "./referralService";
import { recordClientDiagnostic } from "../lib/clientDiagnostics";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let pendingPush = false;

const CLOUD_SYNC_TIMEOUT_MS = 12_000;
const SYNC_TIMEOUT_MESSAGE = "Erro ao sincronizar — seu progresso local está seguro.";

function withTimeout<T>(promise: Promise<T>, ms = CLOUD_SYNC_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function markCloudSync(status: "loading" | "synced" | "pending" | "error", message: string): void {
  useStore.getState().setCloudSyncState(status, message);
  if (status === "error") {
    recordClientDiagnostic({
      kind: "sync_error",
      area: "cloud_sync",
      message,
    });
  }
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
  try {
    const snapshot = activeLearningRepository().exportSnapshot();
    const result = await withTimeout(activeLearningRepository().importSnapshot(snapshot));
    markCloudSync(
      result.ok ? "synced" : "error",
      result.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
    );
    if (result.ok) {
      await syncSocialProfileFromStore();
      await flushSocialEventQueue();
      await attributeStoredReferralCode();
      await processReferralPipeline();
      const isPro = await fetchServerIsPro();
      useStore.getState().setServerEntitlement(isPro);
    }
    return { ok: result.ok, message: result.message };
  } catch {
    markCloudSync("error", SYNC_TIMEOUT_MESSAGE);
    return { ok: false, message: SYNC_TIMEOUT_MESSAGE };
  }
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

  try {
    const localSnapshot = activeLearningRepository().exportSnapshot();
    const remote = await withTimeout(activeLearningRepository().fetchSnapshot());
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
      await migrateEconomyAfterCloudLogin(user.id);
      await refreshServerEntitlementAfterLogin();
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
      const push = await withTimeout(activeLearningRepository().importSnapshot(mergedSnapshot));
      markCloudSync(
        push.ok ? "synced" : "error",
        push.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
      );
      if (push.ok) {
        await migrateEconomyAfterCloudLogin(user.id);
        await refreshServerEntitlementAfterLogin();
      }
      return {
        ok: push.ok,
        message: push.ok
          ? `Progresso mesclado com segurança (local ${localScore} · nuvem ${remoteScore}).`
          : push.message,
      };
    }

    if (!remote.snapshot && localMeaningful) {
      store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName }, localProgress);
      const push = await withTimeout(activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot()));
      markCloudSync(
        push.ok ? "synced" : "error",
        push.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
      );
      if (push.ok) {
        await migrateEconomyAfterCloudLogin(user.id);
        await refreshServerEntitlementAfterLogin();
      }
      return {
        ok: push.ok,
        message: push.ok ? "Conta na nuvem iniciada com seu progresso local." : push.message,
      };
    }

    store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName });
    const initialPush = await withTimeout(activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot()));
    markCloudSync(
      initialPush.ok ? "synced" : "error",
      initialPush.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
    );
    if (initialPush.ok) {
      await migrateEconomyAfterCloudLogin(user.id);
      await refreshServerEntitlementAfterLogin();
    }
    return {
      ok: initialPush.ok,
      message: initialPush.ok ? "Conta na nuvem inicializada sem sobrescrever progresso existente." : initialPush.message,
    };
  } catch {
    markCloudSync("error", SYNC_TIMEOUT_MESSAGE);
    return { ok: false, message: SYNC_TIMEOUT_MESSAGE };
  }
}

async function refreshServerEntitlementAfterLogin(): Promise<void> {
  await attributeStoredReferralCode();
  await processReferralPipeline();
  const isPro = await fetchServerIsPro();
  useStore.getState().setServerEntitlement(isPro);
  await syncSocialProfileFromStore();
}

async function migrateEconomyAfterCloudLogin(userId: string): Promise<void> {
  if (!shouldUseServerEconomy()) return;
  await serverMigrateLocalEconomy(buildLocalEconomyMigrationPayload(), `economy-migration:${userId}`);
  await fetchServerEconomy();
  await flushEconomyIntentQueue();
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
