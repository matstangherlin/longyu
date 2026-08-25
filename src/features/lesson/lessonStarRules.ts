import { MODULE_REVIEW_PASS_ACCURACY, PASS_ACCURACY } from "../../data/economy";
import type { LessonStar } from "../../lib/store";

export interface LessonStarInput {
  correct: number;
  graded: number;
  hadMistakes?: boolean;
  outOfLives?: boolean;
  isReview?: boolean;
}

/** Estrelas da tentativa: perfeição = 3; qualquer erro confirmado = no máximo 2. */
export function computeLessonStars({
  correct,
  graded,
  hadMistakes = false,
  outOfLives = false,
  isReview = false,
}: LessonStarInput): LessonStar {
  if (outOfLives) return correct > 0 ? 1 : 0;
  if (graded === 0) return hadMistakes ? 2 : 3;
  const accuracy = correct / graded;
  // 3 estrelas = desempenho perfeito, sempre. Um percentual apenas "alto" (com
  // qualquer erro) nunca fecha em 3 estrelas — nem em revisões, onde antes 90%
  // já dava 3. Assim a 3ª estrela continua sendo o alvo real de domínio.
  if (isReview) {
    if (accuracy >= 1 && !hadMistakes) return 3;
    if (accuracy >= MODULE_REVIEW_PASS_ACCURACY) return 2;
    return correct > 0 ? 1 : 0;
  }
  if (hadMistakes) return 2;
  if (accuracy >= 1) return 3;
  if (accuracy >= PASS_ACCURACY || correct > 0) return 2;
  return 1;
}

/** Estrelas mínimas para concluir a sessão (qualidade). Path unlock usa 4/4, não isto. */
export function requiredStarsForLesson(isReview = false): number {
  return isReview ? 2 : 1;
}

/**
 * Qualidade-alvo de uma sessão (não é gate curricular V4.6).
 * O avanço de tema/fase usa mastery 4/4 (TM-017).
 */
export function requiredStarsForPhaseAdvance(): number {
  return 3;
}

export function canCompleteLesson(
  stars: number,
  graded: number,
  isReview = false,
  correctCount?: number
): boolean {
  if (graded === 0) return true;
  if (isReview) {
    const accuracy =
      typeof correctCount === "number"
        ? correctCount / graded
        : stars >= 2
          ? MODULE_REVIEW_PASS_ACCURACY
          : 0;
    return accuracy >= MODULE_REVIEW_PASS_ACCURACY;
  }
  // Aula normal: 1★+ conclui a sessão (pass). A 3ª estrela é qualidade.
  // O próximo tema só libera em mastery 4/4 (TM-017).
  return stars >= requiredStarsForLesson(isReview);
}
