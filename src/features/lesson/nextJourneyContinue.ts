import { CULTURE_JOURNEY_PLACEMENT, cultureLessonPlayerPath } from "../../data/cultureNative";

export function cultureReturnPath(search: URLSearchParams, isCulture: boolean): string {
  const from = search.get("from");
  const gate = search.get("gate");
  if (from?.startsWith("/")) {
    const params = new URLSearchParams();
    if (gate) params.set("gate", gate);
    params.set("cultureDone", "1");
    const qs = params.toString();
    return qs ? `${from}?${qs}` : from;
  }
  const src = search.get("src");
  if (src === "jornada") {
    const params = new URLSearchParams();
    if (gate) params.set("gate", gate);
    params.set("cultureDone", "1");
    return `/jornada?${params.toString()}`;
  }
  if (src === "cultura" || isCulture) return "/cultura";
  return "/jornada";
}

/** Próxima aula CORE de cultura ancorada neste tópico de mandarim. */
export function nextCoreCultureAfterTopic(
  topicId: string,
  completedLessonIds: readonly string[] = [],
  completedCultureIds: readonly string[] = []
): (typeof CULTURE_JOURNEY_PLACEMENT)[number] | undefined {
  return CULTURE_JOURNEY_PLACEMENT.find((row) => {
    if (row.afterTopicId !== topicId || row.track !== "core") return false;
    const lessonId = `culture-${row.itemId}`;
    if (completedLessonIds.includes(lessonId)) return false;
    if (completedCultureIds.includes(row.itemId)) return false;
    return true;
  });
}

/**
 * Continuar depois de uma aula de mandarim: se o próximo nó da trilha é Cultura,
 * abre essa aula. Senão, volta à Jornada / origem.
 */
export function resolveVictoryContinuePath(input: {
  lessonId: string;
  isCultureLesson: boolean;
  search: URLSearchParams;
  completedLessonIds?: readonly string[];
  completedCultureIds?: readonly string[];
  preferJourney?: boolean;
}): string {
  if (input.isCultureLesson || input.preferJourney) {
    return cultureReturnPath(input.search, input.isCultureLesson);
  }
  const next = nextCoreCultureAfterTopic(
    input.lessonId,
    input.completedLessonIds ?? [],
    input.completedCultureIds ?? []
  );
  if (next) {
    return cultureLessonPlayerPath(next.itemId, "?src=jornada&from=/jornada&mode=journey");
  }
  return cultureReturnPath(input.search, false);
}
