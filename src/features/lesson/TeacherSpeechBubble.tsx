import { useEffect, useRef, useState } from "react";
import { TypingCaret } from "../../components/guide/GuideDialogue";
import { Mascot } from "../../components/brand/Mascot";
import { GUIDED_DRAGON_SIZE } from "../../lib/guidedPresentation";
import { segmentGraphemes } from "../../lib/guideDialogueMachine";
// RC2.3.13R.3.2.5 — the one reduced-motion signal (no third copy here).
import { prefersReducedMotion } from "../../lib/motion/livingUiMotion";
// RC2.3.13R.3.2.6 — the shared start rule (on screen, visible document, one speaker).
import { useGuideFloor, useOnScreenOnce } from "../../lib/motion/guideStart";

export type BubbleAnimState = "ENTER" | "TYPING" | "READY" | "EXIT";

/**
 * Dragon/teacher bubble with fast type-on.
 * Tap 1 while typing (or still waiting to be seen) → finish text. Tap does not navigate.
 * RC2.3.13R.3.2.6 — a line starts only once the bubble is on screen in a
 * visible document (offscreen = no timer, no interval); reduced motion shows it whole.
 * Dock advances; Back navigates (caller responsibility).
 */
export function TeacherSpeechBubble({
  text,
  onReady,
  onTypingComplete,
  reducedMotion: reducedMotionProp,
}: {
  text: string;
  onReady?: () => void;
  onTypingComplete?: () => void;
  reducedMotion?: boolean;
}) {
  const reduced = reducedMotionProp ?? prefersReducedMotion();
  const [state, setState] = useState<BubbleAnimState>(reduced ? "READY" : "ENTER");
  const [shown, setShown] = useState(reduced ? text : "");
  const indexRef = useRef(0);
  const textRef = useRef(text);
  // RC2.3.13R.3.2.5 — callbacks live in refs. Callers pass inline arrows
  // (`onReady={() => setBubbleReady(true)}`); with them in the deps every
  // parent render restarted the text, so each line typed twice and a tap to
  // skip started it over. Only the text (or the motion mode) restarts it now.
  const onReadyRef = useRef(onReady);
  const onTypingCompleteRef = useRef(onTypingComplete);
  onReadyRef.current = onReady;
  onTypingCompleteRef.current = onTypingComplete;
  // RC2.3.13R.3.2.6 — seen once per line (never restarted by scrolling) and
  // only while this bubble holds the guide floor.
  const rootRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreenOnce(rootRef, !reduced && state === "ENTER", text);
  const mayType = useGuideFloor(state === "TYPING");

  useEffect(() => {
    textRef.current = text;
    indexRef.current = 0;
    if (reduced) {
      setShown(text);
      setState("READY");
      onReadyRef.current?.();
      onTypingCompleteRef.current?.();
      return;
    }
    setShown("");
    setState("ENTER");
  }, [text, reduced]);

  // Separate from the reset above: being seen starts a line, never restarts it.
  useEffect(() => {
    if (reduced || !onScreen || state !== "ENTER") return;
    const enter = window.setTimeout(() => setState("TYPING"), 120);
    return () => window.clearTimeout(enter);
  }, [state, onScreen, reduced]);

  useEffect(() => {
    if (state !== "TYPING" || !mayType) return;
    const full = textRef.current;
    // Graphemes, not UTF-16 units: an emoji or a combining tone mark is never
    // split in half on screen.
    const graphemes = segmentGraphemes(full);
    // Fast type-on (~28ms/char) — never a slow forced wait.
    const id = window.setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= graphemes.length) {
        setShown(full);
        setState("READY");
        onTypingCompleteRef.current?.();
        onReadyRef.current?.();
        window.clearInterval(id);
        return;
      }
      setShown(graphemes.slice(0, indexRef.current).join(""));
    }, 28);
    return () => window.clearInterval(id);
  }, [state, mayType]);

  const finishTyping = () => {
    // RC2.3.13R.3.2.6 — a tap before the line started ("ENTER", waiting to be
    // seen) shows it whole too: a tap is never swallowed.
    if (state === "TYPING" || (state === "ENTER" && !reduced)) {
      setShown(textRef.current);
      setState("READY");
      onTypingCompleteRef.current?.();
      onReadyRef.current?.();
    }
  };

  return (
    <div
      ref={rootRef}
      className={[
        "flex items-end gap-3",
        state === "ENTER" && !reduced ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
        "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
      ].join(" ")}
      data-testid="teacher-speech-bubble"
      data-bubble-state={state}
      data-reduced-motion={reduced ? "true" : "false"}
    >
      <div data-testid="teacher-mascot">
        <Mascot
          size={GUIDED_DRAGON_SIZE.default}
          className="shrink-0"
          decorative
        />
      </div>
      <button
        type="button"
        data-testid="teacher-bubble-tap"
        data-cta-hierarchy="tertiary"
        aria-label={text}
        className="relative min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-base font-medium leading-6 text-ink shadow-card"
        onClick={finishTyping}
      >
        <span
          className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-line bg-surface"
          aria-hidden
        />
        {/* Screen readers hear the whole line once, not every 28 ms fragment. */}
        {/* RC2.3.13R.3.2.6 — the bubble reserves the whole line (no shift while it types). */}
        <span className="typewriter-reserve" data-full-line={text} aria-hidden="true">
          <span className="typewriter-line">
            <span data-testid="teacher-bubble-text" aria-hidden="true">{shown}</span>
            {state === "TYPING" ? (
              // RC2.3.13R.3.2.5 — the same budgeted caret as the guide (it looped offscreen).
              <TypingCaret />
            ) : null}
          </span>
        </span>
        <span className="sr-only" aria-live="polite">{state === "READY" ? text : ""}</span>
      </button>
    </div>
  );
}
