/**
 * LGY-005 / R-05 — which local snapshot a signing-in session may see or upload.
 * Anonymous device progress (`local`) can be claimed once. Another cloud
 * account, or a named profile, never rides along.
 */

export const ANONYMOUS_ACCOUNT_ID = "local";

export function isAnonymousAccountId(accountId: string | null | undefined): boolean {
  const id = String(accountId ?? "");
  return id === "" || id === ANONYMOUS_ACCOUNT_ID;
}

/** True when the live slot is the guest, or already this Supabase user. */
export function progressBelongsToSession(currentAccountId: string | null | undefined, sessionUserId: string): boolean {
  if (!sessionUserId) return false;
  if (isAnonymousAccountId(currentAccountId)) return true;
  return currentAccountId === `cloud:${sessionUserId}`;
}

export interface LoginProgressInput {
  currentAccountId: string;
  sessionUserId: string;
  /** Meaningful export of the live slot, already limited to a slot this session may read. */
  exportMeaningful: boolean;
  cacheMeaningful: boolean;
  remoteMeaningful: boolean;
  hasRemoteSnapshot: boolean;
  remoteProgressPresent: boolean;
}

export interface LoginProgressPlan {
  source: "remote" | "merge" | "local" | "cache" | "blank";
  /** Upload the resulting snapshot with this session. Never true for a foreign account. */
  push: boolean;
}

/**
 * Decides what becomes the signed-in account.
 * A foreign live slot is not "local progress": it is not merged, claimed, or pushed.
 */
export function resolveLoginProgress(input: LoginProgressInput): LoginProgressPlan {
  const own = progressBelongsToSession(input.currentAccountId, input.sessionUserId);
  const device = own && input.exportMeaningful;
  const local = device || input.cacheMeaningful;

  if (!own && !input.cacheMeaningful) {
    if (input.hasRemoteSnapshot && input.remoteMeaningful) return { source: "remote", push: false };
    return { source: "blank", push: false };
  }

  if (input.hasRemoteSnapshot && input.remoteProgressPresent && local) {
    return { source: device ? "merge" : "cache", push: true };
  }
  if (!input.hasRemoteSnapshot && local) {
    return { source: device ? "local" : "cache", push: true };
  }
  if (input.hasRemoteSnapshot && !local && input.remoteMeaningful) return { source: "remote", push: false };
  if (!device && input.cacheMeaningful) return { source: "cache", push: false };
  return { source: "blank", push: own };
}

export function syncItemMatchesSession(
  item: { accountId?: string | null; userId?: string | null },
  session: { accountId: string; userId: string | null }
): boolean {
  if (item.userId && item.userId !== session.userId) return false;
  if (item.accountId && item.accountId !== session.accountId) return false;
  if (item.userId && !session.userId) return false;
  return true;
}

export function partitionOwnedSyncItems<T extends { ownerUserId?: string | null }>(
  items: T[],
  sessionUserId: string | null
): { send: T[]; hold: T[] } {
  const send: T[] = [];
  const hold: T[] = [];
  for (const item of items) {
    if (sessionUserId && item.ownerUserId === sessionUserId) send.push(item);
    else hold.push(item);
  }
  return { send, hold };
}

/** sessionStorage charge flags. The namespace is `local` or `cloud:<uid>`. */
export function scopedEnergyStorageKey(baseKey: string, namespace: string): string {
  const ns = namespace.trim();
  if (!baseKey) return ns;
  if (!ns) return baseKey;
  return `${baseKey}::${ns}`;
}
