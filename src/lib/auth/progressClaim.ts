/**
 * RC2.3.8 — local progress claim after login (pure policy + idempotent ledger).
 *
 * Never loses progress, never claims twice, never sums wallets:
 *   NO_LOCAL_NO_CLOUD  → nothing to do
 *   LOCAL_ONLY         → claim silently (cloud starts from this device)
 *   CLOUD_ONLY         → restore cloud
 *   SAME               → nothing to ask
 *   LOCAL_AHEAD / DIVERGENT → ask "Salvar este progresso na sua conta?"
 *                        yes → deterministic per-field merge (max / union / by id)
 *                        no  → local progress is PARKED on the device (never deleted)
 */

export type ClaimCase = "NO_LOCAL_NO_CLOUD" | "LOCAL_ONLY" | "CLOUD_ONLY" | "SAME" | "LOCAL_AHEAD" | "DIVERGENT";
export type ClaimAction = "NONE" | "CLAIM_SILENT" | "RESTORE_CLOUD" | "ASK";

export interface ClaimInput {
  localMeaningful: boolean;
  remoteMeaningful: boolean;
  /** Stable fingerprints of each side's progress (e.g. hash of completed lessons + xp). */
  localFingerprint: string;
  remoteFingerprint: string;
  localScore: number;
  remoteScore: number;
}

export function classifyClaim(i: ClaimInput): { case: ClaimCase; action: ClaimAction } {
  if (!i.localMeaningful && !i.remoteMeaningful) return { case: "NO_LOCAL_NO_CLOUD", action: "NONE" };
  if (i.localMeaningful && !i.remoteMeaningful) return { case: "LOCAL_ONLY", action: "CLAIM_SILENT" };
  if (!i.localMeaningful && i.remoteMeaningful) return { case: "CLOUD_ONLY", action: "RESTORE_CLOUD" };
  if (i.localFingerprint === i.remoteFingerprint) return { case: "SAME", action: "NONE" };
  return { case: i.localScore >= i.remoteScore ? "LOCAL_AHEAD" : "DIVERGENT", action: "ASK" };
}

/** FNV-1a — deterministic id material, not crypto. */
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Same local progress + same account = same claim id (duplicate callbacks, resumes, double taps). */
export function claimId(localAccountId: string, userId: string, localFingerprint: string): string {
  return `claim_${fnv(`${localAccountId}|${userId}|${localFingerprint}`)}`;
}

export interface ClaimLedger {
  claimed: string[];
  parked: string[];
}

export const CLAIM_LEDGER_KEY = "longyu:progress-claims:v1";

export function emptyLedger(): ClaimLedger {
  return { claimed: [], parked: [] };
}

/** Idempotent: recording the same claim twice changes nothing. */
export function recordClaim(ledger: ClaimLedger, id: string, outcome: "claimed" | "parked"): { ledger: ClaimLedger; changed: boolean } {
  if (ledger.claimed.includes(id) || (outcome === "parked" && ledger.parked.includes(id))) return { ledger, changed: false };
  const next = { claimed: [...ledger.claimed], parked: ledger.parked.filter((p) => p !== id) };
  if (outcome === "claimed") next.claimed.push(id);
  else next.parked.push(id);
  return { ledger: { claimed: next.claimed.slice(-200), parked: next.parked.slice(-50) }, changed: true };
}

export function alreadyClaimed(ledger: ClaimLedger, id: string): boolean {
  return ledger.claimed.includes(id);
}

/**
 * Economy merge policy per field — documented and checked by the gate.
 * MAX: take the larger (both devices earned it once; never add).
 * UNION_BY_ID: ledgers/lists merged by stable id (duplicates collapse).
 * SERVER: never merged on the client (entitlements, purchases).
 */
export const ECONOMY_MERGE_POLICY = {
  xpTotal: "MAX",
  xpToday: "MAX",
  weeklyXp: "MAX",
  monthlyXp: "MAX",
  points: "MAX",
  dragonPearls: "MAX",
  pearlLedger: "UNION_BY_ID",
  streak: "MAX",
  longestStreak: "MAX",
  completedLessons: "UNION_BY_ID",
  serverIsPro: "SERVER",
  subscriptions: "SERVER",
  playEntitlement: "SERVER",
} as const;

export function mergeWalletField(policy: "MAX" | "UNION_BY_ID" | "SERVER", local: number, remote: number): number | null {
  if (policy === "SERVER") return null; // the client never decides
  return Math.max(local, remote);
}
