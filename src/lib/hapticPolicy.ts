/**
 * RC2.3.7 — haptic policy (pure, no store, no platform): the closed map of what
 * vibrates and when a vibration is dropped. `haptics.ts` applies it; gates
 * execute it. Sound lives in `sfxPolicy.ts` (independent preferences).
 */
import type { NativeHapticPattern } from "./platform/nativeHaptics";

export type HapticEvent =
  | "selection"
  | "piecePlaced"
  | "pieceRemoved"
  | "answerCorrect"
  | "answerWrong"
  | "lessonComplete"
  | "practiceComplete"
  | "achievementReveal"
  | "streakMilestone"
  | "chestOpen"
  | "blocked";

/** Mapa central evento → padrão físico (curtos; APIs de impacto/notificação). */
export const HAPTIC_MAP: Record<HapticEvent, NativeHapticPattern> = {
  selection: "impactLight",
  piecePlaced: "impactLight",
  pieceRemoved: "impactLight",
  answerCorrect: "success",
  answerWrong: "warning",
  lessonComplete: "success",
  practiceComplete: "success",
  achievementReveal: "impactMedium",
  streakMilestone: "impactMedium",
  chestOpen: "impactMedium",
  blocked: "warning",
};

/** Força relativa: dentro da mesma janela, só um evento mais forte substitui. */
export const HAPTIC_WEIGHT: Record<HapticEvent, number> = {
  selection: 1,
  piecePlaced: 1,
  pieceRemoved: 1,
  answerCorrect: 3,
  answerWrong: 3,
  blocked: 3,
  lessonComplete: 4,
  practiceComplete: 4,
  achievementReveal: 4,
  streakMilestone: 4,
  chestOpen: 4,
};

/** Um gesto = um feedback: eventos disparados juntos por um só toque colapsam. */
export const HAPTIC_GESTURE_WINDOW_MS = 120;

/**
 * RC2.3.7 — a completion right after a result is the same moment: one
 * vibration for "the answer that finishes the lesson", not two.
 */
export const HAPTIC_RESULT_SETTLE_MS = 700;

/** Pure decision (testable). */
export function hapticDecision(input: { enabled: boolean; event: HapticEvent; now: number; lastAt: number; lastWeight: number }): { fire: boolean; reason?: string } {
  if (!input.enabled) return { fire: false, reason: "setting_off" };
  const weight = HAPTIC_WEIGHT[input.event];
  const since = input.now - input.lastAt;
  // One gesture = one feedback: a weaker/equal event in the same window is dropped.
  if (since < HAPTIC_GESTURE_WINDOW_MS && weight <= input.lastWeight) return { fire: false, reason: "gesture_window" };
  if (weight === 4 && input.lastWeight === 3 && since < HAPTIC_RESULT_SETTLE_MS) return { fire: false, reason: "result_settle" };
  return { fire: true };
}

