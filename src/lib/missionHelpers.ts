import type { ActivityErrorRecord, LessonStar } from "./store";

/** Erro de lição em aula com menos de 3 estrelas (ainda vale buscar domínio da fase). */
export function isJourneyBlockingActivityError(
  error: ActivityErrorRecord,
  lessonStarsById: Record<string, LessonStar>,
  completedLessons: string[]
): boolean {
  const lessonId = error.lessonId?.trim();
  if (!lessonId || lessonId.startsWith("story:") || lessonId.startsWith("test:")) return false;
  if (!completedLessons.includes(lessonId)) return false;
  const stars = lessonStarsById[lessonId] ?? 0;
  return stars > 0 && stars < 3;
}

/** Passo de história que conta como prática de frase (diálogo, escolha, lacuna). */
export function storyStepCountsAsPhrasePractice(type: string): boolean {
  return type === "choice" || type === "fill_hanzi" || type === "fill_pinyin" || type === "short_answer";
}
