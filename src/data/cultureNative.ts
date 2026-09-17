/**
 * V4.9.8A.1 — Native Culture Lessons: ids, placement, CORE/EXPLORE.
 * No Lesson objects here (avoids a journey.ts import cycle).
 */

export type CultureLessonTrack = "core" | "explore";

/**
 * V4.11A — o registro de lições deixa de ser o mesmo que o de nós da Jornada.
 *
 * Antes uma linha valia por duas coisas ao mesmo tempo: a lição canônica E o nó
 * na trilha. Isso tornava impossível ter lição que só vive no Hub — e o Culture
 * Atlas precisa disso, porque a Jornada não comporta uma dúzia de nós novos.
 *
 * `afterTopicId` ausente = hub-only: a lição existe, o Hub abre, e nenhum nó é
 * criado. Não é placement falso nem placeholder; é a ausência declarada.
 */
export type CultureLessonEntry = {
  itemId: string;
  track: CultureLessonTrack;
  /** Tópico de mandarim que ancora a lição na Jornada. Ausente = hub-only. */
  afterTopicId?: string;
};

export type CultureJourneyPlacement = {
  itemId: string;
  afterTopicId: string;
  track: CultureLessonTrack;
};

export const CULTURE_LESSON_ID_PREFIX = "culture-" as const;

/** Flagship stories that must carry Mandarin speech + LessonPlayer audio. */
export const CULTURE_STORY_FLAGSHIP_IDS = [
  "visiting-home",
  "host-insistence",
  "shared-dishes",
  "chopsticks-rest",
  "digital-pay",
  "metro-qr",
  "bargaining-context",
  "gift-receiving",
  "hotel-checkin-register",
] as const;

/**
 * Toda lição cultural canônica, ancorada na Jornada ou não. É esta lista que
 * gera `CULTURE_NATIVE_LESSONS` — por isso hub-only continua tendo lição.
 */
export const CULTURE_LESSON_ENTRIES: readonly CultureLessonEntry[] = [
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
  { itemId: "hotel-checkin-register", afterTopicId: "p6-survival-mandarin", track: "core" },
] as const;

/**
 * Só as lições que viram nó na Jornada. Derivado, não mantido à mão: uma
 * entrada hub-only não tem como escapar para cá, e o contrato de quem consome
 * a Jornada continua exigindo `afterTopicId` obrigatório.
 */
export const CULTURE_JOURNEY_PLACEMENT: readonly CultureJourneyPlacement[] =
  CULTURE_LESSON_ENTRIES.flatMap((row) =>
    row.afterTopicId
      ? [{ itemId: row.itemId, afterTopicId: row.afterTopicId, track: row.track }]
      : []
  );

/** Lições que vivem só no Hub. Vazio hoje; o Culture Atlas povoa. */
export const CULTURE_HUB_ONLY_ITEM_IDS: readonly string[] = CULTURE_LESSON_ENTRIES.filter(
  (row) => !row.afterTopicId
).map((row) => row.itemId);

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
