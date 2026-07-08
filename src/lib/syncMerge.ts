import type { LearningAccount } from "./store";
import type { LessonStar } from "./store";
import type { SRSItem } from "./srs";

export type ProgressSlice = Omit<LearningAccount, "id" | "name" | "email" | "authMode" | "createdAt" | "updatedAt">;

function unionUnique(values: string[]): string[] {
  return [...new Set(values)];
}

function maxRecordValues(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: Record<string, number> = {};
  for (const key of keys) {
    merged[key] = Math.max(a[key] ?? 0, b[key] ?? 0);
  }
  return merged;
}

function maxLessonStars(a: Record<string, LessonStar>, b: Record<string, LessonStar>): Record<string, LessonStar> {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const merged: Record<string, LessonStar> = {};
  for (const key of keys) {
    const value = Math.max(a[key] ?? 0, b[key] ?? 0);
    merged[key] = Math.min(3, value) as LessonStar;
  }
  return merged;
}

function mergeSrs(local: Record<string, SRSItem>, remote: Record<string, SRSItem>): Record<string, SRSItem> {
  const merged: Record<string, SRSItem> = { ...local };
  for (const [key, remoteItem] of Object.entries(remote)) {
    const localItem = merged[key];
    if (!localItem) {
      merged[key] = remoteItem;
      continue;
    }
    const remoteDue = remoteItem.due ?? 0;
    const localDue = localItem.due ?? 0;
    merged[key] = remoteDue >= localDue ? remoteItem : localItem;
  }
  return merged;
}

/** Mescla progresso remoto com o local preservando o melhor de cada lado. */
export function mergeRemoteProgress(local: ProgressSlice, remote: ProgressSlice): ProgressSlice {
  return {
    ...local,
    ...remote,
    completedLessons: unionUnique([...local.completedLessons, ...remote.completedLessons]),
    learnedChars: unionUnique([...local.learnedChars, ...remote.learnedChars]),
    learnedChunks: unionUnique([...local.learnedChunks, ...remote.learnedChunks]),
    lessonStarsById: maxLessonStars(local.lessonStarsById, remote.lessonStarsById),
    lessonTaskProgress: maxRecordValues(local.lessonTaskProgress, remote.lessonTaskProgress),
    points: Math.max(local.points, remote.points),
    xpTotal: Math.max(local.xpTotal, remote.xpTotal),
    xpToday: Math.max(local.xpToday, remote.xpToday),
    weeklyXp: Math.max(local.weeklyXp, remote.weeklyXp),
    monthlyXp: Math.max(local.monthlyXp, remote.monthlyXp),
    streak: Math.max(local.streak, remote.streak),
    longestStreak: Math.max(local.longestStreak, remote.longestStreak),
    dragonPearls: Math.max(local.dragonPearls, remote.dragonPearls),
    streakShields: Math.max(local.streakShields, remote.streakShields),
    srs: mergeSrs(local.srs, remote.srs),
    achievementsUnlocked: { ...remote.achievementsUnlocked, ...local.achievementsUnlocked },
    isPremium: local.isPremium || remote.isPremium,
    placement: local.placement ?? remote.placement,
  };
}
