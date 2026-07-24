import type { LearningAccount } from "./store";
import type { LessonStar } from "./store";
import type { SRSItem } from "./srs";
import { getProgressScore } from "./progressSnapshot";
import { isDevPreviewAllowed } from "./entitlements";
import { FOLEGO_START, FOLEGO_MAX_FREE } from "../data/economy";

/**
 * Une as estrelas pendentes de dois dispositivos. Lições já dominadas (3★ no
 * merge de estrelas) saem da lista; para as demais, une os refs pendentes (o
 * lado que ainda não dominou mantém a pendência).
 */
function mergeLessonPendingStars(
  local: Record<string, string[]> | undefined,
  remote: Record<string, string[]> | undefined,
  mergedStars: Record<string, LessonStar>
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})]);
  for (const lessonId of keys) {
    if ((mergedStars[lessonId] ?? 0) >= 3) continue;
    const refs = [...new Set([...(local?.[lessonId] ?? []), ...(remote?.[lessonId] ?? [])])];
    if (refs.length > 0) merged[lessonId] = refs;
  }
  return merged;
}

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

function mergeChestInventory(
  local: ProgressSlice["chests"],
  remote: ProgressSlice["chests"]
): ProgressSlice["chests"] {
  return {
    small: Math.max(local.small ?? 0, remote.small ?? 0),
    dragon: Math.max(local.dragon ?? 0, remote.dragon ?? 0),
    monthly: Math.max(local.monthly ?? 0, remote.monthly ?? 0),
    legendary: Math.max(local.legendary ?? 0, remote.legendary ?? 0),
  };
}

function uniqueById<T extends { id?: string }>(items: T[]): T[] {
  const byId = new Map<string, T>();
  items.forEach((item, index) => {
    const key = item.id?.trim() || `idx:${index}:${JSON.stringify(item)}`;
    byId.set(key, item);
  });
  return [...byId.values()];
}

function sortByTimestampDesc<T>(items: T[], pickTimestamp: (item: T) => number): T[] {
  return [...items].sort((a, b) => pickTimestamp(b) - pickTimestamp(a));
}

/** Une dois históricos de conversa, deduplicando por (cena+lição+timestamp).
 * Em empate de chave, preserva a entrada mais rica (assistência / erros / setting).
 */
function mergeConversationHistory(
  local: ProgressSlice["conversationHistory"],
  remote: ProgressSlice["conversationHistory"]
): ProgressSlice["conversationHistory"] {
  const richness = (entry: NonNullable<ProgressSlice["conversationHistory"]>[number]) =>
    (entry.assistanceLevel ? 1 : 0) +
    (entry.mainAnswer ? 1 : 0) +
    (entry.setting ? 1 : 0) +
    (entry.errorRefs?.length ?? 0) +
    (entry.attempts > 1 ? 1 : 0) +
    (entry.result === "mistake" || entry.result === "abandoned" ? 1 : 0);

  const byKey = new Map<string, NonNullable<ProgressSlice["conversationHistory"]>[number]>();
  for (const entry of [...(local ?? []), ...(remote ?? [])]) {
    if (!entry?.sceneId) continue;
    const key = `${entry.sceneId}:${entry.lessonId ?? ""}:${entry.completedAt ?? 0}`;
    const previous = byKey.get(key);
    if (!previous || richness(entry) > richness(previous)) byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 100);
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
  const primary = getProgressScore(local) >= getProgressScore(remote) ? local : remote;
  const secondary = primary === local ? remote : local;

  const lessonStarsById = maxLessonStars(local.lessonStarsById, remote.lessonStarsById);

  return {
    ...secondary,
    ...primary,
    completedLessons: unionUnique([...local.completedLessons, ...remote.completedLessons]),
    learnedChars: unionUnique([...local.learnedChars, ...remote.learnedChars]),
    learnedChunks: unionUnique([...local.learnedChunks, ...remote.learnedChunks]),
    badges: unionUnique([...(local.badges ?? []), ...(remote.badges ?? [])]),
    favoriteItems: unionUnique([...(local.favoriteItems ?? []), ...(remote.favoriteItems ?? [])]),
    ownedCosmetics: unionUnique([...(local.ownedCosmetics ?? []), ...(remote.ownedCosmetics ?? [])]),
    journeyChestsOpened: unionUnique([...(local.journeyChestsOpened ?? []), ...(remote.journeyChestsOpened ?? [])]),
    validatedModules: unionUnique([...(local.validatedModules ?? []), ...(remote.validatedModules ?? [])]),
    lessonStarsById,
    lessonPendingStars: mergeLessonPendingStars(local.lessonPendingStars, remote.lessonPendingStars, lessonStarsById),
    folego: Math.min(FOLEGO_MAX_FREE, Math.max(local.folego ?? FOLEGO_START, remote.folego ?? FOLEGO_START)),
    lessonTaskProgress: maxRecordValues(local.lessonTaskProgress, remote.lessonTaskProgress),
    correctedMistakes: maxRecordValues(local.correctedMistakes, remote.correctedMistakes),
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
    achievementHistory: sortByTimestampDesc(
      uniqueById([...(local.achievementHistory ?? []), ...(remote.achievementHistory ?? [])]),
      (item) => item.unlockedAt ?? 0
    ),
    rewardHistory: sortByTimestampDesc(uniqueById([...(local.rewardHistory ?? []), ...(remote.rewardHistory ?? [])]), (item) => item.claimedAt ?? 0),
    chestOpenHistory: sortByTimestampDesc(
      uniqueById([...(local.chestOpenHistory ?? []), ...(remote.chestOpenHistory ?? [])]),
      (item) => item.openedAt ?? 0
    ),
    purchaseHistory: sortByTimestampDesc(
      uniqueById([...(local.purchaseHistory ?? []), ...(remote.purchaseHistory ?? [])]),
      (item) => item.purchasedAt ?? 0
    ),
    missionHistory: sortByTimestampDesc(uniqueById([...(local.missionHistory ?? []), ...(remote.missionHistory ?? [])]), (item) => item.claimedAt ?? 0),
    medals: sortByTimestampDesc(uniqueById([...(local.medals ?? []), ...(remote.medals ?? [])]), (item) => item.earnedAt ?? 0),
    mistakeHistory: sortByTimestampDesc(uniqueById([...(local.mistakeHistory ?? []), ...(remote.mistakeHistory ?? [])]), (item) => item.createdAt ?? 0),
    recentErrors: sortByTimestampDesc(uniqueById([...(local.recentErrors ?? []), ...(remote.recentErrors ?? [])]), (item) => item.createdAt ?? 0),
    recentActivityErrors: sortByTimestampDesc(
      uniqueById([...(local.recentActivityErrors ?? []), ...(remote.recentActivityErrors ?? [])]),
      (item) => item.timestamp ?? 0
    ),
    conversationHistory: mergeConversationHistory(local.conversationHistory, remote.conversationHistory),
    inventory: maxRecordValues(local.inventory, remote.inventory),
    chests: mergeChestInventory(local.chests, remote.chests),
    leagueHistory: sortByTimestampDesc(uniqueById([...(local.leagueHistory ?? []), ...(remote.leagueHistory ?? [])]), (item) => item.createdAt ?? 0).slice(0, 24),
    leagueJoinedAt:
      local.leagueJoinedAt == null
        ? remote.leagueJoinedAt
        : remote.leagueJoinedAt == null
        ? local.leagueJoinedAt
        : Math.min(local.leagueJoinedAt, remote.leagueJoinedAt),
    leagueBots: (local.leagueBots?.length ?? 0) >= (remote.leagueBots?.length ?? 0) ? local.leagueBots : remote.leagueBots,
    isPremium: isDevPreviewAllowed() ? local.isPremium || remote.isPremium : false,
    placement: local.placement ?? remote.placement,
  };
}
