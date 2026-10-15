import { LESSON_NO_SKIP_QI, LESSON_THREE_STAR_QI, PRO_LESSON_QI_BONUS } from "../data/economy";

/**
 * RC2.3.13R.3.2.5 — the Qi a first completion actually pays, for display.
 *
 * The store (`grantLessonReward`) is the authority and pays exactly this:
 * nothing below three stars; at three stars the base, the no-skip bonus and
 * the Pro bonus. Victory used to add the no-skip and Pro bonuses at any star
 * count and showed "+2 Qi" / "+5 Qi" that were never granted. Presentation
 * never promises a reward the economy does not pay.
 */
export function lessonCompletionQi({ stars, noSkip, pro }: { stars: number; noSkip: boolean; pro: boolean }): number {
  if (!(stars >= 3)) return 0;
  return LESSON_THREE_STAR_QI + (noSkip ? LESSON_NO_SKIP_QI : 0) + (pro ? PRO_LESSON_QI_BONUS : 0);
}
