import { withTimeout as withTimeoutMs } from "../lib/async/withTimeout";
import { isSupabaseBackendEnabled } from "../lib/backendConfig";
import { getProgressScore, isMeaningfulProgress, type ProgressSnapshotBody } from "../lib/progressSnapshot";
import { readUserCache, writeUserCache } from "../lib/auth/userCache";
import { mergeRemoteProgress } from "../lib/syncMerge";
import { activeLearningRepository } from "../lib/repositories/learningRepository";
import { getSupabaseClient } from "../lib/supabaseClient";
import { flushSocialEventQueue } from "./socialActivityQueue";
import { syncSocialProfileFromStore } from "./socialService";
import { cloudAccountId, useStore } from "../lib/store";
import { claimAnonymousEvidence } from "../lib/auth/evidenceClaim";
import { isAnonymousAccountId, progressBelongsToSession, resolveLoginProgress } from "../lib/auth/accountIsolation";
import { claimId, classifyClaim, CLAIM_LEDGER_KEY, emptyLedger, recordClaim, type ClaimInput, type ClaimLedger } from "../lib/auth/progressClaim";
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
import { isQaTestStateActive } from "../lib/qaFastPathAccess";
import { noteOps, newOpsCorrelationId } from "../lib/opsCorrelation";
import { applySyncNoticePolicy, SYNC_TRANSIENT_RETRY_MS } from "../lib/syncUx";

const CLOUD_SYNC_TIMEOUT_MS = 12_000;
const SYNC_TIMEOUT_MESSAGE =
  "A sincronização demorou demais. Seu progresso local está seguro — tente de novo.";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let transientRetryTimer: ReturnType<typeof setTimeout> | null = null;

/** Falha transitória: uma nova tentativa silenciosa logo, sem esperar os 30 s. */
function scheduleTransientRetry(): void {
  if (transientRetryTimer) return;
  transientRetryTimer = setTimeout(() => {
    transientRetryTimer = null;
    void flushCloudProgressPush();
  }, SYNC_TRANSIENT_RETRY_MS);
}
let syncInFlight = false;
let pendingPush = false;

function withTimeout<T>(promise: Promise<T>, ms = CLOUD_SYNC_TIMEOUT_MS): Promise<T> {
  return withTimeoutMs(promise, ms);
}

function markCloudSync(rawStatus: "loading" | "synced" | "pending" | "error", rawMessage: string): void {
  // RC2.2.11 — toda decisão de aviso passa pela syncNoticePolicy (syncUx.ts):
  // rotina é silenciosa; falha transitória continua "pending" e é re-tentada
  // sozinha; só falha persistente vira "error" com UM aviso calmo e deduplicado.
  const now = Date.now();
  const decision =
    rawStatus === "error"
      ? applySyncNoticePolicy({ kind: "failure", resource: "cloud-progress", errorKind: "progress-push", now })
      : rawStatus === "synced"
        ? applySyncNoticePolicy({ kind: "success", resource: "cloud-progress", now })
        : applySyncNoticePolicy({ kind: "routine", resource: "cloud-progress", status: rawStatus, now });
  const status = decision.status;
  const message = decision.message ?? rawMessage;
  if (decision.retry) scheduleTransientRetry();
  // O estado vai para a store (Conta/Perfil/Ajustes o leem como estado
  // discreto). Só o erro persistente vira aviso global, deduplicado (RC2.2.8 · C3/C5).
  useStore.getState().setCloudSyncState(status, message);
  if (status === "error") {
    if (decision.surface === "global") useStore.getState().setEconomySyncMessage(message);
    const correlationId = newOpsCorrelationId();
    noteOps("sync", correlationId, "error", { code: "sync_error" });
    recordClientDiagnostic({
      kind: "sync_error",
      area: "cloud_sync",
      message: `${message} [${correlationId}]`,
    });
  }
}

function persistNamespacedCache(userId: string): void {
  try {
    writeUserCache(userId, activeLearningRepository().exportSnapshot());
  } catch {
    // ignore
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
  if (isQaTestStateActive()) {
    return { ok: false, message: "QA test state: sync desligado." };
  }
  if (!isSupabaseBackendEnabled()) {
    return { ok: false, message: "Backend em nuvem desativado." };
  }
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Cliente Supabase indisponível." };

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, message: "Faça login para sincronizar o progresso." };
  if (useStore.getState().currentAccountId !== cloudAccountId(user.id)) {
    return { ok: false, message: "A conta ativa não é a desta sessão." };
  }

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
  if (isQaTestStateActive()) {
    return { ok: false, message: "QA test state: restore cloud ignorado." };
  }
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

// ─────────────────────────────────────────────────────────────────────────
// RC2.3.8 — progress claim (idempotent; never loses, never sums wallets)
// ─────────────────────────────────────────────────────────────────────────

export const PARKED_LOCAL_PROGRESS_KEY = "longyu:parked-local-progress:v1";

function readLedger(): ClaimLedger {
  try {
    return { ...emptyLedger(), ...(JSON.parse(localStorage.getItem(CLAIM_LEDGER_KEY) ?? "{}") as Partial<ClaimLedger>) };
  } catch {
    return emptyLedger();
  }
}

function writeLedger(ledger: ClaimLedger): void {
  try {
    localStorage.setItem(CLAIM_LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* quota */
  }
}

function progressFingerprint(source: Parameters<typeof getProgressScore>[0]): string {
  const p = source && "snapshot" in (source as object) ? (source as { snapshot: { progress: ProgressSnapshotBody["progress"] } }).snapshot.progress : (source as ProgressSnapshotBody["progress"] | null);
  if (!p) return "empty";
  return [[...(p.completedLessons ?? [])].sort().join(","), p.xpTotal ?? 0, Object.keys(p.srs ?? {}).length, p.streak ?? 0].join("|");
}

/** Inspect the claim case for the signed-in user BEFORE syncing (for the "Salvar na conta?" step). */
export async function inspectProgressClaim(): Promise<{ ok: boolean; input?: ClaimInput; case?: ReturnType<typeof classifyClaim>; id?: string }> {
  const client = getSupabaseClient();
  if (!client || !isSupabaseBackendEnabled()) return { ok: false };
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) return { ok: false };
  const local = activeLearningRepository().exportSnapshot();
  const remote = await withTimeout(activeLearningRepository().fetchSnapshot());
  if (!remote.ok) return { ok: false };
  const currentAccountId = useStore.getState().currentAccountId;
  const ownDevice = progressBelongsToSession(currentAccountId, user.id);
  const input: ClaimInput = {
    localMeaningful: ownDevice && isMeaningfulProgress(local),
    remoteMeaningful: isMeaningfulProgress(remote.snapshot),
    localFingerprint: progressFingerprint(local),
    remoteFingerprint: progressFingerprint(remote.snapshot ?? null),
    localScore: getProgressScore(local),
    remoteScore: getProgressScore(remote.snapshot),
    localAccountId: currentAccountId,
    sessionUserId: user.id,
  };
  const id = claimId(currentAccountId, user.id, input.localFingerprint);
  return { ok: true, input, case: classifyClaim(input), id };
}

/** After a successful claim: anonymous evidence moves into the account, once. */
function completeClaim(userId: string, id: string | null): void {
  claimAnonymousEvidence(`cloud:${userId}`);
  if (!id) return;
  const { ledger, changed } = recordClaim(readLedger(), id, "claimed");
  if (changed) writeLedger(ledger);
}

export async function syncAuthSessionProgress(options: { keepLocalParked?: boolean; claimId?: string } = {}): Promise<{ ok: boolean; message: string }> {
  if (isQaTestStateActive()) {
    return { ok: false, message: "QA test state: sync desligado." };
  }
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
  const currentAccountId = store.currentAccountId;
  const ownDevice = progressBelongsToSession(currentAccountId, user.id);
  markCloudSync("loading", "Carregando progresso da nuvem...");

  try {
    const exported = activeLearningRepository().exportSnapshot();
    const cached = readUserCache(user.id);
    const exportMeaningful = ownDevice && isMeaningfulProgress(exported);
    const cacheMeaningful = Boolean(cached && isMeaningfulProgress(cached));
    const remote = await withTimeout(activeLearningRepository().fetchSnapshot());
    if (!remote.ok) {
      markCloudSync("error", "Erro ao sincronizar — seu progresso local está seguro.");
      return remote;
    }

    const currentName = ownDevice
      ? (store.accounts[currentAccountId]?.name ?? user.email ?? "Aluno Longyu")
      : (user.email ?? "Aluno Longyu");

    // RC2.3.8 — "Agora não": the device progress is parked (never deleted) and the cloud is restored.
    if (options.keepLocalParked && remote.snapshot && isMeaningfulProgress(remote.snapshot)) {
      if (ownDevice) {
        try {
          localStorage.setItem(PARKED_LOCAL_PROGRESS_KEY, JSON.stringify({ at: Date.now(), claimId: options.claimId ?? null, snapshot: exported }));
        } catch {
          /* quota: keep the user cache path below as the fallback copy */
        }
        if (options.claimId) {
          const { ledger, changed } = recordClaim(readLedger(), options.claimId, "parked");
          if (changed) writeLedger(ledger);
        }
      }
      store.activateCloudAccount(
        { userId: user.id, email: user.email, name: remote.snapshot.snapshot.account.name ?? currentName },
        remote.snapshot.snapshot.progress
      );
      markCloudSync("synced", "Progresso sincronizado.");
      persistNamespacedCache(user.id);
      await migrateEconomyAfterCloudLogin(user.id);
      await refreshServerEntitlementAfterLogin();
      return { ok: true, message: "Progresso da conta restaurado; o deste aparelho ficou guardado." };
    }

    const remoteProgress = remote.snapshot?.snapshot.progress;
    const remoteMeaningful = isMeaningfulProgress(remote.snapshot);
    const plan = resolveLoginProgress({
      currentAccountId,
      sessionUserId: user.id,
      exportMeaningful,
      cacheMeaningful,
      remoteMeaningful,
      hasRemoteSnapshot: Boolean(remote.snapshot),
      remoteProgressPresent: Boolean(remoteProgress),
    });
    const localBody = exportMeaningful ? exported : cacheMeaningful ? cached : null;
    const localProgress = localBody?.snapshot.progress;
    const localScore = getProgressScore(localBody);
    const remoteScore = getProgressScore(remote.snapshot);

    const rememberClaim = (ok: boolean) => {
      if (!ok || !ownDevice) return;
      completeClaim(user.id, isAnonymousAccountId(currentAccountId) ? (options.claimId ?? null) : null);
    };

    if (plan.source === "remote" && remote.snapshot) {
      store.activateCloudAccount(
        { userId: user.id, email: user.email, name: remote.snapshot.snapshot.account.name ?? currentName },
        remote.snapshot.snapshot.progress
      );
      markCloudSync("synced", "Progresso sincronizado.");
      persistNamespacedCache(user.id);
      await migrateEconomyAfterCloudLogin(user.id);
      await refreshServerEntitlementAfterLogin();
      return { ok: true, message: "Progresso restaurado da nuvem." };
    }

    if ((plan.source === "merge" || plan.source === "cache") && remote.snapshot && remoteProgress && localProgress && plan.push) {
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
        rememberClaim(true);
        persistNamespacedCache(user.id);
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

    if ((plan.source === "local" || plan.source === "cache") && localProgress) {
      store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName }, localProgress);
      if (!plan.push) {
        markCloudSync("synced", "Progresso sincronizado.");
        persistNamespacedCache(user.id);
        await migrateEconomyAfterCloudLogin(user.id);
        await refreshServerEntitlementAfterLogin();
        return { ok: true, message: "Progresso desta conta restaurado neste aparelho." };
      }
      const push = await withTimeout(activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot()));
      markCloudSync(
        push.ok ? "synced" : "error",
        push.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
      );
      if (push.ok) {
        rememberClaim(true);
        persistNamespacedCache(user.id);
        await migrateEconomyAfterCloudLogin(user.id);
        await refreshServerEntitlementAfterLogin();
      }
      return {
        ok: push.ok,
        message: push.ok ? "Conta na nuvem iniciada com seu progresso local." : push.message,
      };
    }

    store.activateCloudAccount({ userId: user.id, email: user.email, name: currentName });
    if (!plan.push) {
      markCloudSync("synced", "Progresso sincronizado.");
      await refreshServerEntitlementAfterLogin();
      return { ok: true, message: "Conta carregada sem progresso de outra pessoa." };
    }
    const initialPush = await withTimeout(activeLearningRepository().importSnapshot(activeLearningRepository().exportSnapshot()));
    markCloudSync(
      initialPush.ok ? "synced" : "error",
      initialPush.ok ? "Progresso sincronizado." : "Erro ao sincronizar — seu progresso local está seguro."
    );
    if (initialPush.ok) {
      persistNamespacedCache(user.id);
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
  if (isQaTestStateActive()) return;
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
