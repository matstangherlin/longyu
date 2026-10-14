import { useEffect, useRef, useState } from "react";
import { Mascot } from "../../components/brand/Mascot";
import { GUIDED_DRAGON_SIZE } from "../../lib/guidedPresentation";

export type BubbleAnimState = "ENTER" | "TYPING" | "READY" | "EXIT";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Dragon/teacher bubble with fast type-on.
 * Tap 1 while typing → finish text. Tap does not navigate.
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

  useEffect(() => {
    textRef.current = text;
    indexRef.current = 0;
    if (reduced) {
      setShown(text);
      setState("READY");
      onReady?.();
      onTypingComplete?.();
      return;
    }
    setShown("");
    setState("ENTER");
    const enter = window.setTimeout(() => setState("TYPING"), 120);
    return () => window.clearTimeout(enter);
  }, [text, reduced, onReady, onTypingComplete]);

  useEffect(() => {
    if (state !== "TYPING") return;
    const full = textRef.current;
    // Fast type-on (~28ms/char) — never a slow forced wait.
    const id = window.setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= full.length) {
        setShown(full);
        setState("READY");
        onTypingComplete?.();
        onReady?.();
        window.clearInterval(id);
        return;
      }
      setShown(full.slice(0, indexRef.current));
    }, 28);
    return () => window.clearInterval(id);
  }, [state, onReady, onTypingComplete]);

  const finishTyping = () => {
    if (state === "TYPING") {
      setShown(textRef.current);
      setState("READY");
      onTypingComplete?.();
      onReady?.();
    }
  };

  return (
    <div
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
        />
      </div>
      <button
        type="button"
        data-testid="teacher-bubble-tap"
        data-cta-hierarchy="tertiary"
        aria-live="polite"
        className="relative min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-left text-base font-medium leading-6 text-ink shadow-card"
        onClick={finishTyping}
      >
        <span
          className="absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l border-line bg-surface"
          aria-hidden
        />
        <span data-testid="teacher-bubble-text">{shown}</span>
        {state === "TYPING" ? (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle motion-reduce:hidden" aria-hidden />
        ) : null}
      </button>
    </div>
  );
}
