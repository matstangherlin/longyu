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

export function requiredStarsForLesson(isReview = false): number {
  return isReview ? 2 : 3;
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
  return stars >= requiredStarsForLesson(isReview);
}
