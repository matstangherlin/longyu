import { useStore } from "./store";
import { addLeagueWeeklyXpOnServer } from "../services/leagueService";

export const LEAGUE_XP_SYNCED_EVENT = "longyu:league-xp-synced";
export const LEAGUE_XP_SYNC_FAILED_EVENT = "longyu:league-xp-sync-failed";

export interface LeagueXpSyncResult {
  ok: boolean;
  added: number;
  reason?: string;
  sourceKey: string;
}

interface PendingLeagueXp {
  amount: number;
  sourceKey: string;
  queuedAt: number;
}

const PENDING_PREFIX = "longyu:league-xp-pending:";

function pendingStorageKey(accountId: string): string {
  return `${PENDING_PREFIX}${accountId}`;
}

function readPending(accountId: string): PendingLeagueXp[] {
  try {
    const raw = localStorage.getItem(pendingStorageKey(accountId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingLeagueXp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(accountId: string, items: PendingLeagueXp[]): void {
  if (items.length === 0) {
    localStorage.removeItem(pendingStorageKey(accountId));
    return;
  }
  localStorage.setItem(pendingStorageKey(accountId), JSON.stringify(items.slice(-200)));
}

function queuePending(accountId: string, amount: number, sourceKey: string): void {
  const items = readPending(accountId);
  if (items.some((item) => item.sourceKey === sourceKey)) return;
  items.push({ amount, sourceKey, queuedAt: Date.now() });
  writePending(accountId, items);
}

function dequeuePending(accountId: string, sourceKey: string): void {
  writePending(
    accountId,
    readPending(accountId).filter((item) => item.sourceKey !== sourceKey)
  );
}

function emitSyncFailed(reason: string, sourceKey: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LEAGUE_XP_SYNC_FAILED_EVENT, { detail: { reason, sourceKey } })
  );
}

function emitSynced(added: number, sourceKey: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LEAGUE_XP_SYNCED_EVENT, { detail: { added, sourceKey } })
  );
}

function logDev(message: string, detail?: unknown): void {
  if (import.meta.env.DEV) {
    console.info(`[league-xp] ${message}`, detail ?? "");
  }
}

function isCloudAccount(): { ok: true; accountId: string } | { ok: false } {
  const { accounts, currentAccountId } = useStore.getState();
  const account = accounts[currentAccountId];
  if (!account || account.authMode !== "cloud") return { ok: false };
  return { ok: true, accountId: currentAccountId };
}

async function pushLeagueXp(
  amount: number,
  sourceKey: string,
  accountId: string
): Promise<LeagueXpSyncResult> {
  const result = await addLeagueWeeklyXpOnServer(amount, sourceKey);
  if (result.added > 0) {
    dequeuePending(accountId, sourceKey);
    emitSynced(result.added, sourceKey);
    logDev(`synced +${result.added} (${sourceKey})`);
    return { ok: true, added: result.added, sourceKey };
  }
  if (result.reason === "duplicate_source") {
    dequeuePending(accountId, sourceKey);
    return { ok: true, added: 0, reason: result.reason, sourceKey };
  }
  queuePending(accountId, amount, sourceKey);
  logDev(`pending (${result.reason ?? "failed"})`, { amount, sourceKey });
  if (import.meta.env.DEV) emitSyncFailed(result.reason ?? "sync_failed", sourceKey);
  return { ok: false, added: 0, reason: result.reason ?? "sync_failed", sourceKey };
}

/**
 * Envia XP semanal ao servidor quando a conta está autenticada na nuvem.
 * Retorna resultado; em falha, enfileira para reenvio posterior.
 */
export async function syncLeagueXpToServer(
  amount: number,
  sourceKey: string
): Promise<LeagueXpSyncResult> {
  const inc = Math.max(0, Math.round(amount));
  const key = sourceKey.trim();
  if (inc <= 0) return { ok: false, added: 0, reason: "zero_amount", sourceKey: key };
  if (key.length < 3) return { ok: false, added: 0, reason: "invalid_key", sourceKey: key };

  const cloud = isCloudAccount();
  if (!cloud.ok) return { ok: false, added: 0, reason: "not_cloud", sourceKey: key };

  queuePending(cloud.accountId, inc, key);
  return pushLeagueXp(inc, key, cloud.accountId);
}

/** Fire-and-forget compatível com chamadas síncronas da store. */
export function syncLeagueXpToServerAsync(amount: number, sourceKey: string): void {
  void syncLeagueXpToServer(amount, sourceKey);
}

/** Reenvia XP pendente (offline / falha anterior). Chamado ao abrir Ligas ou após login. */
export async function flushPendingLeagueXpSync(): Promise<number> {
  const cloud = isCloudAccount();
  if (!cloud.ok) return 0;

  const pending = readPending(cloud.accountId);
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const item of pending) {
    const result = await pushLeagueXp(item.amount, item.sourceKey, cloud.accountId);
    if (result.ok && result.added > 0) synced += result.added;
  }
  if (synced > 0) logDev(`flush synced +${synced} total`);
  return synced;
}

export function onLeagueXpSynced(listener: (detail: { added: number; sourceKey: string }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ added: number; sourceKey: string }>;
    listener(custom.detail);
  };
  window.addEventListener(LEAGUE_XP_SYNCED_EVENT, handler);
  return () => window.removeEventListener(LEAGUE_XP_SYNCED_EVENT, handler);
}

export function onLeagueXpSyncFailed(
  listener: (detail: { reason: string; sourceKey: string }) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<{ reason: string; sourceKey: string }>;
    listener(custom.detail);
  };
  window.addEventListener(LEAGUE_XP_SYNC_FAILED_EVENT, handler);
  return () => window.removeEventListener(LEAGUE_XP_SYNC_FAILED_EVENT, handler);
}

/** Quantidade de eventos de XP ainda não confirmados pelo servidor. */
export function getPendingLeagueXpCount(): number {
  const cloud = isCloudAccount();
  if (!cloud.ok) return 0;
  return readPending(cloud.accountId).length;
}
