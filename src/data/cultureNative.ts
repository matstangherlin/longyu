/**
 * V4.9.8A.1 — Native Culture Lessons: ids, placement, CORE/EXPLORE.
 * No Lesson objects here (avoids a journey.ts import cycle).
 */

export type CultureLessonTrack = "core" | "explore";

export type CultureJourneyPlacement = {
  itemId: string;
  afterTopicId: string;
  track: CultureLessonTrack;
};

export const CULTURE_LESSON_ID_PREFIX = "culture-" as const;

export const CULTURE_JOURNEY_PLACEMENT: readonly CultureJourneyPlacement[] = [
  { itemId: "greetings-nihao", afterTopicId: "l2", track: "core" },
  { itemId: "thanks-keqi", afterTopicId: "l4", track: "core" },
  { itemId: "qingwen-ask", afterTopicId: "p1-qingwen-cortesia", track: "core" },
  { itemId: "gift-receiving", afterTopicId: "l4", track: "explore" },
  { itemId: "teacher-title", afterTopicId: "l9", track: "explore" },
  { itemId: "four-and-eight", afterTopicId: "l19", track: "explore" },
  { itemId: "family-terms", afterTopicId: "l24", track: "explore" },
  { itemId: "mid-autumn", afterTopicId: "l24", track: "explore" },
  { itemId: "spring-festival", afterTopicId: "l25", track: "explore" },
  { itemId: "host-insistence", afterTopicId: "l26", track: "core" },
  { itemId: "shared-dishes", afterTopicId: "l26b", track: "core" },
  { itemId: "chopsticks-rest", afterTopicId: "l26c", track: "core" },
  { itemId: "digital-pay", afterTopicId: "l27", track: "core" },
  { itemId: "metro-qr", afterTopicId: "p6-cidade-lugares", track: "core" },
  { itemId: "bargaining-context", afterTopicId: "p6-compras", track: "core" },
  { itemId: "office-hours", afterTopicId: "p6-horarios", track: "explore" },
  { itemId: "dragon-boat", afterTopicId: "p6-natureza", track: "explore" },
  { itemId: "qingming", afterTopicId: "p6-rotina-trabalho", track: "explore" },
  { itemId: "visiting-home", afterTopicId: "p7-imersao-casa-amigo", track: "core" },
] as const;

export function cultureLessonIdForItem(itemId: string): string {
  return `${CULTURE_LESSON_ID_PREFIX}${itemId}`;
}

export function cultureItemIdFromLessonId(lessonId: string | undefined | null): string | undefined {
  if (!lessonId?.startsWith(CULTURE_LESSON_ID_PREFIX)) return undefined;
  return lessonId.slice(CULTURE_LESSON_ID_PREFIX.length);
}

export function isCultureLessonId(lessonId: string | undefined | null): boolean {
  return Boolean(lessonId && lessonId.startsWith(CULTURE_LESSON_ID_PREFIX));
}

export function culturePlacementForItem(itemId: string): CultureJourneyPlacement | undefined {
  return CULTURE_JOURNEY_PLACEMENT.find((row) => row.itemId === itemId);
}

export function cultureLessonPlayerPath(itemId: string, search = ""): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (!params.get("src")) params.set("src", "cultura");
  const query = params.toString();
  return `/licao/${cultureLessonIdForItem(itemId)}/player${query ? `?${query}` : ""}`;
}

export function cultureLessonPerfectRewardId(itemId: string): string {
  return `culture-lesson:${itemId}:perfect`;
}

export function cultureJourneyNodeId(itemId: string): string {
  return `culture:${itemId}`;
}

export function migrateNativeCultureProgress(input: {
  completedLessons?: readonly string[];
  cultureCompletedIds?: readonly string[];
}): { completedLessons: string[]; cultureCompletedIds: string[] } {
  const lessons = new Set((input.completedLessons ?? []).filter(Boolean));
  const items = new Set((input.cultureCompletedIds ?? []).filter(Boolean));
  for (const itemId of items) lessons.add(cultureLessonIdForItem(itemId));
  for (const lessonId of [...lessons]) {
    const itemId = cultureItemIdFromLessonId(lessonId);
    if (itemId) items.add(itemId);
  }
  return { completedLessons: [...lessons], cultureCompletedIds: [...items] };
}
