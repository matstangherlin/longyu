/**
 * LGY-008 / LGY-019 — the name the learner actually chose.
 * Placeholder shells ("Aluno", "Aluno local", "Aluno Longyu") are not a name.
 * A cloud account never shows "Aluno local". Last resort is "Aluno".
 */

const PLACEHOLDER_NAMES = new Set(["", "aluno", "aluno local", "aluno longyu", "novo", "novo aluno"]);

export function isPlaceholderDisplayName(name: string | null | undefined): boolean {
  return PLACEHOLDER_NAMES.has(String(name ?? "").trim().toLocaleLowerCase("pt-BR"));
}

export function displayNameForAccount(
  account: { name?: string | null; authMode?: string | null } | null | undefined
): string {
  const raw = String(account?.name ?? "").trim();
  if (raw && !isPlaceholderDisplayName(raw)) return raw;
  return "Aluno";
}

/** Chip must leave "Salvando…" even if a request never settles. */
export const SYNC_SAVING_LIMIT_MS = 15_000;

export type ProfileSyncOutcome = "success" | "schema" | "timeout" | "offline" | "pending";

export function nextProfileSyncStatus(
  status: "idle" | "pending" | "loading" | "synced" | "error",
  outcome: ProfileSyncOutcome,
  elapsedMs: number
): "idle" | "pending" | "loading" | "synced" | "error" {
  if (outcome === "success") return "synced";
  if (outcome === "schema" || outcome === "timeout" || outcome === "offline") return "error";
  if ((status === "pending" || status === "loading") && elapsedMs >= SYNC_SAVING_LIMIT_MS) return "error";
  return status;
}
