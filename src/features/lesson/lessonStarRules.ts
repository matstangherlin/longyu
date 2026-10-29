import {
  LESSON_NO_SKIP_QI,
  LESSON_ONE_STAR_QI,
  LESSON_THREE_STAR_QI,
  LESSON_TWO_STAR_QI,
  MODULE_REVIEW_PASS_ACCURACY,
  PASS_ACCURACY,
  PRO_LESSON_QI_BONUS,
  THREE_STAR_ACCURACY,
  TWO_STAR_ACCURACY,
} from "../../data/economy";
import type { LessonStar } from "../../lib/store";

export interface LessonStarInput {
  correct: number;
  graded: number;
  hadMistakes?: boolean;
  outOfLives?: boolean;
  isReview?: boolean;
  /**
   * Etapas avaliadas que terminaram sem resultado: puladas com Fôlego ou
   * adiadas sem áudio ("Não posso ouvir agora"). Não são acerto nem erro.
   */
  unscored?: number;
}

/**
 * Estrelas da tentativa (QA 2026-10 · prompt 22, LGY-026/R7).
 *
 * Aula normal, por precisão: abaixo de 60% = 0★ (não conclui); 60–79% = 1★;
 * 80–94% = 2★; 95%+ = 3★. Um erro não derruba mais para 2★ sozinho: antes,
 * qualquer erro = 2★ e 1 acerto entre muitos erros também = 2★. Sem vidas a
 * tentativa não conclui (0★; antes 1★). A revisão de módulo mantém a regra
 * própria: 3★ só perfeita, 2★ a partir de MODULE_REVIEW_PASS_ACCURACY.
 *
 * Pulo com Fôlego e escuta adiada sem áudio não são acerto nem erro: saem do
 * denominador. Rodada com etapa sem resultado fica no máximo em 2★ (a 3ª
 * estrela fica pendente até a revisão), como a regra antiga já dava.
 */
export function computeLessonStars({
  correct,
  graded,
  hadMistakes = false,
  outOfLives = false,
  isReview = false,
  unscored = 0,
}: LessonStarInput): LessonStar {
  if (outOfLives) return isReview && correct > 0 ? 1 : 0;
  if (graded === 0) return hadMistakes ? 2 : 3;
  if (isReview) {
    const accuracy = correct / graded;
    if (accuracy >= 1 && !hadMistakes) return 3;
    if (accuracy >= MODULE_REVIEW_PASS_ACCURACY) return 2;
    return correct > 0 ? 1 : 0;
  }
  const skipped = Math.max(0, Math.min(graded, unscored));
  const answered = graded - skipped;
  const band = answered === 0 ? (hadMistakes ? 2 : 3) : starBand(correct / answered);
  return (skipped > 0 ? Math.min(band, 2) : band) as LessonStar;
}

function starBand(accuracy: number): LessonStar {
  if (accuracy >= THREE_STAR_ACCURACY) return 3;
  if (accuracy >= TWO_STAR_ACCURACY) return 2;
  if (accuracy >= PASS_ACCURACY) return 1;
  return 0;
}

/** Selo "Perfeito": 100% e nenhum erro registrado na tentativa. */
export function isPerfectLesson({ correct, graded, hadMistakes = false, unscored = 0 }: LessonStarInput): boolean {
  return !hadMistakes && unscored === 0 && correct >= graded;
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
  // Aula normal: 1★ (60%) conclui a sessão. Abaixo disso, Reforço ou nova
  // tentativa. O próximo tema só libera em mastery 4/4 (TM-017).
  return stars >= requiredStarsForLesson(isReview);
}

/**
 * O Reforço (todos os erros da tentativa corrigidos na revisão da lição)
 * devolve a 3ª estrela? Aula normal: só se a tentativa já concluía. Abaixo do
 * mínimo o Reforço é prática dos erros e não conclui nada: concluir pede uma
 * nova tentativa com pelo menos 60% (a rodada do tema só conta assim). A
 * revisão de módulo mantém a regra própria.
 */
export function reforcoRecoversAttempt({ attemptStars, isReview = false }: { attemptStars: number; isReview?: boolean }): boolean {
  if (isReview) return true;
  return attemptStars >= requiredStarsForLesson(false);
}

/** Números da regra, para o "?" da conclusão: sempre lidos das constantes. */
export function lessonRuleFacts() {
  const pct = (value: number) => Math.round(value * 100);
  return {
    oneStarPct: pct(PASS_ACCURACY),
    twoStarPct: pct(TWO_STAR_ACCURACY),
    threeStarPct: pct(THREE_STAR_ACCURACY),
    reviewPct: pct(MODULE_REVIEW_PASS_ACCURACY),
    qiOneStar: LESSON_ONE_STAR_QI,
    qiTwoStar: LESSON_TWO_STAR_QI,
    qiThreeStar: LESSON_THREE_STAR_QI,
    qiNoSkip: LESSON_NO_SKIP_QI,
    qiPro: PRO_LESSON_QI_BONUS,
  };
}
