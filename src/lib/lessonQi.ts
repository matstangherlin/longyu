import {
  LESSON_NO_SKIP_QI,
  LESSON_ONE_STAR_QI,
  LESSON_THREE_STAR_QI,
  LESSON_TWO_STAR_QI,
  PRO_LESSON_QI_BONUS,
} from "../data/economy";

/**
 * RC2.3.13R.3.2.5 — the Qi a first completion actually pays, for display.
 *
 * The store (`grantLessonReward`) is the authority and pays exactly this. At
 * three stars: the base, the no-skip bonus and the Pro bonus. Victory used to
 * add the no-skip and Pro bonuses at any star count and showed "+2 Qi" /
 * "+5 Qi" that were never granted. Presentation never promises a reward the
 * economy does not pay.
 *
 * QA 2026-10 · prompt 22 — `graduated`: 1★ and 2★ pay LESSON_ONE_STAR_QI /
 * LESSON_TWO_STAR_QI, with no bonus. Without it (a cloud account before the
 * server pays by stars), nothing below three stars, as before.
 */
export function lessonCompletionQi({
  stars,
  noSkip,
  pro,
  graduated = false,
}: {
  stars: number;
  noSkip: boolean;
  pro: boolean;
  graduated?: boolean;
}): number {
  if (!(stars >= 3)) return graduated ? graduatedLessonQi(stars) : 0;
  return LESSON_THREE_STAR_QI + (noSkip ? LESSON_NO_SKIP_QI : 0) + (pro ? PRO_LESSON_QI_BONUS : 0);
}

function graduatedLessonQi(stars: number): number {
  if (stars >= 2) return LESSON_TWO_STAR_QI;
  if (stars >= 1) return LESSON_ONE_STAR_QI;
  return 0;
}
