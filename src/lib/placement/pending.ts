import {
  PENDING_PLACEMENT_TTL_MS,
  PLACEMENT_VERSION,
  type Experience,
  type PendingPlacementV2,
  type PlacementAnswerEvidence,
} from "./types";

export const PENDING_PLACEMENT_KEY = "longyu:pending-placement-v2";

function now(): number {
  return Date.now();
}

export function createPendingPlacement(input: {
  declaredExperience: Experience;
  goal?: string | null;
}): PendingPlacementV2 {
  const startedAt = now();
  return {
    version: PLACEMENT_VERSION,
    startedAt,
    expiresAt: startedAt + PENDING_PLACEMENT_TTL_MS,
    answers: [],
    declaredExperience: input.declaredExperience,
    goal: input.goal ?? null,
    askedQuestionIds: [],
  };
}

export function isPendingPlacementFresh(pending: PendingPlacementV2 | null | undefined): pending is PendingPlacementV2 {
  if (!pending) return false;
  if (pending.version !== PLACEMENT_VERSION) return false;
  return pending.expiresAt > now();
}

export function readPendingPlacement(): PendingPlacementV2 | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PLACEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPlacementV2;
    if (!isPendingPlacementFresh(parsed)) {
      clearPendingPlacement();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingPlacement(pending: PendingPlacementV2): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_PLACEMENT_KEY, JSON.stringify(pending));
  } catch {
    // ignore quota
  }
}

export function clearPendingPlacement(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PLACEMENT_KEY);
  } catch {
    // ignore
  }
}

export function appendPendingAnswer(
  pending: PendingPlacementV2,
  evidence: PlacementAnswerEvidence,
  askedQuestionIds: string[]
): PendingPlacementV2 {
  const next: PendingPlacementV2 = {
    ...pending,
    answers: [...pending.answers.filter((item) => item.questionId !== evidence.questionId), evidence],
    askedQuestionIds,
    expiresAt: now() + PENDING_PLACEMENT_TTL_MS,
  };
  writePendingPlacement(next);
  return next;
}

export function pendingOnboardingStarted(): boolean {
  return readPendingPlacement() != null;
}
