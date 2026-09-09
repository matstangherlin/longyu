/**
 * Culture mastery, memory, and seals — isolated from lexical SRS / hànzì.
 */

import { getCultureItem } from "../data/culture";
import {
  CULTURE_MISSION_XP,
  CULTURE_ROUTES,
  CULTURE_SEALS,
  cultureStarsForAttempt,
  nextCultureReviewDue,
  type CultureMasteryRecord,
  type CultureMemoryRecord,
  type CultureSealId,
} from "../data/cultureQuest";
import { getCultureMission, memoryTargetsForItem } from "../data/cultureMissions";
import { unionIds } from "./cultureProgress";

export type CultureMasteryMaps = {
  cultureMasteryById: Record<string, CultureMasteryRecord>;
  cultureMemoryById: Record<string, CultureMemoryRecord>;
  cultureSeals: string[];
  cultureCompletedIds: string[];
  cultureSavedIds: string[];
  cultureStartedIds: string[];
};

export function emptyCultureMastery(): Pick<
  CultureMasteryMaps,
  "cultureMasteryById" | "cultureMemoryById" | "cultureSeals"
> {
  return {
    cultureMasteryById: {},
    cultureMemoryById: {},
    cultureSeals: [],
  };
}

export function migrateCultureV21ToQuest(input: {
  cultureCompletedIds?: string[];
  cultureSavedIds?: string[];
  cultureStartedIds?: string[];
  cultureMasteryById?: Record<string, CultureMasteryRecord>;
  cultureMemoryById?: Record<string, CultureMemoryRecord>;
  cultureSeals?: string[];
  now?: number;
}): CultureMasteryMaps {
  const now = input.now ?? Date.now();
  const completedIds = unionIds(input.cultureCompletedIds);
  const savedIds = unionIds(input.cultureSavedIds);
  const startedIds = unionIds(input.cultureStartedIds);
  const mastery = { ...(input.cultureMasteryById ?? {}) };
  const memory = { ...(input.cultureMemoryById ?? {}) };

  for (const id of completedIds) {
    if (!getCultureItem(id)) continue;
    const existing = mastery[id];
    if (!existing) {
      mastery[id] = {
        itemId: id,
        completed: true,
        stars: 1,
        bestScore: 0.5,
        attempts: 1,
        reviewDueAt: nextCultureReviewDue(0, now),
        reviewStage: 0,
      };
    }
    for (const target of memoryTargetsForItem(id)) {
      if (memory[target.id]) continue;
      memory[target.id] = {
        targetId: target.id,
        cultureItemId: id,
        due: nextCultureReviewDue(0, now),
        stage: 0,
        reps: 0,
        lapses: 0,
        updatedAt: now,
      };
    }
  }

  const seals = unionIds([...(input.cultureSeals ?? []), ...sealsEarnedFromMastery(mastery)]).filter((id) =>
    CULTURE_SEALS.some((seal) => seal.id === id)
  );

  return {
    cultureMasteryById: mastery,
    cultureMemoryById: memory,
    cultureSeals: seals,
    cultureCompletedIds: completedIds,
    cultureSavedIds: savedIds,
    cultureStartedIds: startedIds,
  };
}

export function sealsEarnedFromMastery(mastery: Record<string, CultureMasteryRecord>): CultureSealId[] {
  return CULTURE_SEALS.filter((seal) =>
    seal.requiredItemIds.every((itemId) => (mastery[itemId]?.stars ?? 0) >= 1)
  ).map((seal) => seal.id);
}

export type CultureMissionResult = {
  itemId: string;
  score: number;
  memoryCorrect: boolean;
  scoredCount: number;
  correctCount: number;
};

export function applyCultureMissionComplete(
  maps: CultureMasteryMaps,
  result: CultureMissionResult,
  now = Date.now()
): CultureMasteryMaps & { grantedXp: boolean; newSeals: CultureSealId[]; stars: 1 | 2 | 3 } {
  const itemId = result.itemId;
  const previous = maps.cultureMasteryById[itemId];
  const alreadyCompleted = Boolean(previous?.completed) || maps.cultureCompletedIds.includes(itemId);
  const stars = cultureStarsForAttempt(result.score, result.memoryCorrect);
  const bestStars = Math.max(previous?.stars ?? 0, stars) as 0 | 1 | 2 | 3;
  const nextMastery: CultureMasteryRecord = {
    itemId,
    completed: true,
    stars: bestStars,
    bestScore: Math.max(previous?.bestScore ?? 0, result.score),
    attempts: (previous?.attempts ?? 0) + 1,
    reviewDueAt:
      previous?.reviewDueAt && previous.reviewDueAt > now
        ? previous.reviewDueAt
        : nextCultureReviewDue(previous?.reviewStage ?? 0, now),
    reviewStage: previous?.reviewStage ?? 0,
  };

  const cultureMasteryById = { ...maps.cultureMasteryById, [itemId]: nextMastery };
  const cultureMemoryById = { ...maps.cultureMemoryById };
  for (const target of memoryTargetsForItem(itemId)) {
    const existing = cultureMemoryById[target.id];
    if (existing) {
      cultureMemoryById[target.id] = {
        ...existing,
        due: existing.due > now ? existing.due : nextCultureReviewDue(existing.stage, now),
        updatedAt: now,
      };
    } else {
      cultureMemoryById[target.id] = {
        targetId: target.id,
        cultureItemId: itemId,
        due: nextCultureReviewDue(0, now),
        stage: 0,
        reps: 0,
        lapses: 0,
        updatedAt: now,
      };
    }
  }

  const previousSeals = new Set(maps.cultureSeals);
  const nextSeals = unionIds([...maps.cultureSeals, ...sealsEarnedFromMastery(cultureMasteryById)]);
  const newSeals = nextSeals.filter(
    (id): id is CultureSealId => CULTURE_SEALS.some((seal) => seal.id === id) && !previousSeals.has(id)
  );

  return {
    cultureMasteryById,
    cultureMemoryById,
    cultureSeals: nextSeals,
    cultureCompletedIds: unionIds([...maps.cultureCompletedIds, itemId]),
    cultureSavedIds: unionIds(maps.cultureSavedIds).filter((id) => id !== itemId),
    cultureStartedIds: unionIds([...maps.cultureStartedIds, itemId]),
    grantedXp: !alreadyCompleted,
    newSeals,
    stars,
  };
}

export function applyCultureMemoryReview(
  memoryById: Record<string, CultureMemoryRecord>,
  targetId: string,
  correct: boolean,
  now = Date.now()
): Record<string, CultureMemoryRecord> {
  const existing = memoryById[targetId];
  if (!existing) return memoryById;
  const stage = correct ? Math.min(3, existing.stage + 1) : 0;
  return {
    ...memoryById,
    [targetId]: {
      ...existing,
      stage,
      due: nextCultureReviewDue(stage, now),
      reps: existing.reps + 1,
      lapses: existing.lapses + (correct ? 0 : 1),
      lastResult: correct ? "pass" : "fail",
      updatedAt: now,
    },
  };
}

export function dueCultureMemoryTargets(
  memoryById: Record<string, CultureMemoryRecord>,
  now = Date.now()
): CultureMemoryRecord[] {
  return Object.values(memoryById)
    .filter((row) => row.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function mergeCultureMastery(
  local: Record<string, CultureMasteryRecord> | undefined,
  remote: Record<string, CultureMasteryRecord> | undefined
): Record<string, CultureMasteryRecord> {
  const merged: Record<string, CultureMasteryRecord> = { ...(remote ?? {}) };
  for (const [id, row] of Object.entries(local ?? {})) {
    const other = merged[id];
    if (!other) {
      merged[id] = row;
      continue;
    }
    const reviewDueAt =
      row.reviewDueAt == null
        ? other.reviewDueAt
        : other.reviewDueAt == null
          ? row.reviewDueAt
          : Math.min(row.reviewDueAt, other.reviewDueAt);
    merged[id] = {
      itemId: row.itemId || other.itemId,
      completed: Boolean(row.completed || other.completed),
      stars: Math.max(row.stars ?? 0, other.stars ?? 0) as 0 | 1 | 2 | 3,
      bestScore: Math.max(row.bestScore ?? 0, other.bestScore ?? 0),
      attempts: Math.max(row.attempts ?? 0, other.attempts ?? 0),
      reviewDueAt,
      reviewStage: Math.max(row.reviewStage ?? 0, other.reviewStage ?? 0),
    };
  }
  return merged;
}

export function mergeCultureMemory(
  local: Record<string, CultureMemoryRecord> | undefined,
  remote: Record<string, CultureMemoryRecord> | undefined
): Record<string, CultureMemoryRecord> {
  const merged: Record<string, CultureMemoryRecord> = { ...(remote ?? {}) };
  for (const [id, row] of Object.entries(local ?? {})) {
    const other = merged[id];
    if (!other) {
      merged[id] = row;
      continue;
    }
    merged[id] = other.updatedAt >= row.updatedAt ? other : row;
  }
  return merged;
}

export function cultureMissionRewardId(itemId: string): string {
  return `culture-complete:${itemId}`;
}

export function cultureMissionXpAmount(): number {
  return CULTURE_MISSION_XP;
}

export function pickNextCultureMissionId(
  completedIds: readonly string[],
  startedIds: readonly string[]
): string | undefined {
  const done = new Set(completedIds);
  const started = startedIds.find((id) => !done.has(id) && getCultureMission(id));
  if (started) return started;
  for (const route of CULTURE_ROUTES) {
    const next = route.itemIds.find((id) => !done.has(id));
    if (next) return next;
  }
  return undefined;
}
