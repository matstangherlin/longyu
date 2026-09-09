/**
 * Culture progress is stored beside Mandarin progress, never inside SRS / hànzì mastery.
 */

export function unionIds(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).filter((id) => typeof id === "string" && id.trim()))];
}

export function applyCultureStarted(
  completedIds: readonly string[],
  startedIds: readonly string[],
  id: string
): { cultureStartedIds: string[] } {
  if (completedIds.includes(id) || startedIds.includes(id)) {
    return { cultureStartedIds: unionIds(startedIds) };
  }
  return { cultureStartedIds: unionIds([...startedIds, id]) };
}

export function applyCultureSaved(
  savedIds: readonly string[],
  id: string,
  saved: boolean
): { cultureSavedIds: string[] } {
  if (saved) return { cultureSavedIds: unionIds([...savedIds, id]) };
  return { cultureSavedIds: unionIds(savedIds).filter((item) => item !== id) };
}

export function applyCultureComplete(
  completedIds: readonly string[],
  savedIds: readonly string[],
  startedIds: readonly string[],
  id: string
): {
  cultureCompletedIds: string[];
  cultureSavedIds: string[];
  cultureStartedIds: string[];
} {
  return {
    cultureCompletedIds: unionIds([...completedIds, id]),
    cultureSavedIds: unionIds(savedIds).filter((item) => item !== id),
    cultureStartedIds: unionIds([...startedIds, id]),
  };
}

export type CultureCardStatus = "new" | "in_progress" | "completed";

export function cultureCardStatus(
  id: string,
  completedIds: readonly string[],
  savedIds: readonly string[],
  startedIds: readonly string[]
): CultureCardStatus {
  if (completedIds.includes(id)) return "completed";
  if (savedIds.includes(id) || startedIds.includes(id)) return "in_progress";
  return "new";
}
