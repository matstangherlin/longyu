/**
 * GuideDialogue presentation motion — separate from pedagogical state machine.
 *
 * entering → ready once (per dialogue mount / message-set identity).
 * Message-to-message advances do NOT re-run entrance.
 */

import { prefersReducedMotion } from "./guideDialogueMachine";

/** Mascot entrance ~220ms; bubble delayed ~80ms; ready shortly after. */
export const GUIDE_ENTRANCE_READY_MS = 280;
/** Soft cap: first grapheme must start well under this. */
export const GUIDE_FIRST_LETTER_BUDGET_MS = 350;

export type GuideMotionPhase = "entering" | "ready";

export function initialGuideMotion(instant = prefersReducedMotion()): GuideMotionPhase {
  return instant ? "ready" : "entering";
}

export function guideMotionAfterTimeout(
  phase: GuideMotionPhase,
  elapsedMs: number,
  readyMs = GUIDE_ENTRANCE_READY_MS
): GuideMotionPhase {
  if (phase === "ready") return "ready";
  return elapsedMs >= readyMs ? "ready" : "entering";
}
