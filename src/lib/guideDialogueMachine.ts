/**
 * GuideDialogue state machine — presentation only (not curriculum).
 *
 * TYPING + Continue → COMPLETE (same message)
 * COMPLETE + Continue → next message or DONE
 * One physical click never both completes and advances.
 */

export type GuideDialoguePhase = "idle" | "typing" | "complete" | "done";

export type GuideDialogueState = {
  phase: GuideDialoguePhase;
  messageIndex: number;
  visibleCount: number;
  /** After COMPLETE, ignore advance until this timestamp (ms). */
  advanceReadyAt: number;
};

export type GuideDialogueEvent =
  | { type: "START"; instant?: boolean }
  | { type: "TICK"; now: number }
  | { type: "CONTINUE"; now: number };

export function segmentGraphemes(text: string): string[] {
  const value = String(text ?? "");
  if (!value) return [];
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(value), (part) => part.segment);
    }
  } catch {
    /* fall through */
  }
  return Array.from(value);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Pause (ms) after punctuation when typing. */
export function pauseAfterGrapheme(grapheme: string): number {
  if (/[,，、;；:：]/.test(grapheme)) return 120;
  if (/[.!?。！？…]/.test(grapheme)) return 220;
  return 0;
}

export const GUIDE_TYPEWRITER_MS = 28;
export const GUIDE_ADVANCE_GUARD_MS = 80;

export function createGuideDialogueState(): GuideDialogueState {
  return {
    phase: "idle",
    messageIndex: 0,
    visibleCount: 0,
    advanceReadyAt: 0,
  };
}

export function reduceGuideDialogue(
  state: GuideDialogueState,
  event: GuideDialogueEvent,
  messages: readonly string[],
  options: { instant?: boolean; now?: number } = {}
): GuideDialogueState {
  const list = messages.filter((message) => String(message ?? "").trim().length > 0);
  if (!list.length) {
    return { ...state, phase: "done", messageIndex: 0, visibleCount: 0 };
  }

  const now = event.type === "START" ? options.now ?? 0 : "now" in event ? event.now : options.now ?? 0;
  const instant = Boolean(options.instant || (event.type === "START" && event.instant));

  if (event.type === "START") {
    if (instant) {
      return {
        phase: "complete",
        messageIndex: 0,
        visibleCount: segmentGraphemes(list[0]).length,
        advanceReadyAt: now + GUIDE_ADVANCE_GUARD_MS,
      };
    }
    return {
      phase: "typing",
      messageIndex: 0,
      visibleCount: 0,
      advanceReadyAt: 0,
    };
  }

  if (state.phase === "done") return state;

  const current = list[Math.min(state.messageIndex, list.length - 1)] ?? "";
  const graphemes = segmentGraphemes(current);

  if (event.type === "TICK") {
    if (state.phase !== "typing") return state;
    const nextCount = Math.min(state.visibleCount + 1, graphemes.length);
    if (nextCount >= graphemes.length) {
      return {
        ...state,
        phase: "complete",
        visibleCount: graphemes.length,
        advanceReadyAt: now + GUIDE_ADVANCE_GUARD_MS,
      };
    }
    return { ...state, visibleCount: nextCount };
  }

  if (event.type === "CONTINUE") {
    if (state.phase === "typing") {
      return {
        ...state,
        phase: "complete",
        visibleCount: graphemes.length,
        advanceReadyAt: now + GUIDE_ADVANCE_GUARD_MS,
      };
    }
    if (state.phase === "complete") {
      if (now < state.advanceReadyAt) return state;
      const nextIndex = state.messageIndex + 1;
      if (nextIndex >= list.length) {
        return { ...state, phase: "done" };
      }
      const nextText = list[nextIndex];
      if (instant || prefersReducedMotion()) {
        return {
          phase: "complete",
          messageIndex: nextIndex,
          visibleCount: segmentGraphemes(nextText).length,
          advanceReadyAt: now + GUIDE_ADVANCE_GUARD_MS,
        };
      }
      return {
        phase: "typing",
        messageIndex: nextIndex,
        visibleCount: 0,
        advanceReadyAt: 0,
      };
    }
  }

  return state;
}

export function visibleGuideText(messages: readonly string[], state: GuideDialogueState): string {
  const list = messages.filter((message) => String(message ?? "").trim().length > 0);
  if (!list.length) return "";
  const current = list[Math.min(state.messageIndex, list.length - 1)] ?? "";
  const graphemes = segmentGraphemes(current);
  return graphemes.slice(0, state.visibleCount).join("");
}
