import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Mascot } from "../brand/Mascot";
import { Button } from "../ui/primitives";
import { IconChevron } from "../ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import {
  GUIDE_ADVANCE_GUARD_MS,
  GUIDE_TYPEWRITER_MS,
  createGuideDialogueState,
  pauseAfterGrapheme,
  prefersReducedMotion,
  reduceGuideDialogue,
  segmentGraphemes,
  visibleGuideText,
  type GuideDialogueState,
} from "../../lib/guideDialogueMachine";

export type GuideDialogueProps = {
  messages: readonly string[];
  /** Called once when the last message advances. */
  onComplete: () => void;
  name?: string;
  /** compact = smaller mascot for mobile / culture moments */
  size?: "default" | "compact";
  className?: string;
  continueLabel?: string;
  /** test hook */
  "data-testid"?: string;
};

/**
 * Reusable Longyu guide presence: mascot + speech box + typewriter.
 * Presentation only — messages must come from existing content.
 */
export function GuideDialogue({
  messages,
  onComplete,
  name,
  size = "default",
  className = "",
  continueLabel,
  "data-testid": testId = "guide-dialogue",
}: GuideDialogueProps) {
  const { t } = useTranslation();
  const cleaned = messages.map((message) => String(message ?? "").trim()).filter(Boolean);
  const [state, setState] = useState<GuideDialogueState>(() => createGuideDialogueState());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const doneFiredRef = useRef(false);
  const tickTimer = useRef<number | null>(null);
  const mascotSize = size === "compact" ? 56 : 72;

  useEffect(() => {
    const instant = prefersReducedMotion();
    doneFiredRef.current = false;
    setState(
      reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant }, cleaned, {
        instant,
        now: Date.now(),
      })
    );
    return () => {
      if (tickTimer.current != null) window.clearTimeout(tickTimer.current);
    };
    // Re-start only when message identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned.join("\u0001")]);

  useEffect(() => {
    if (state.phase === "done") {
      if (!doneFiredRef.current) {
        doneFiredRef.current = true;
        onCompleteRef.current();
      }
      return;
    }
    if (state.phase !== "typing") return;
    const current = cleaned[state.messageIndex] ?? "";
    const graphemes = segmentGraphemes(current);
    const last = graphemes[Math.max(0, state.visibleCount - 1)] ?? "";
    const delay = GUIDE_TYPEWRITER_MS + pauseAfterGrapheme(last);
    tickTimer.current = window.setTimeout(() => {
      setState((prev) => reduceGuideDialogue(prev, { type: "TICK", now: Date.now() }, cleaned));
    }, delay);
    return () => {
      if (tickTimer.current != null) window.clearTimeout(tickTimer.current);
    };
  }, [state.phase, state.messageIndex, state.visibleCount, cleaned]);

  function continueDialogue() {
    setState((prev) => {
      const next = reduceGuideDialogue(prev, { type: "CONTINUE", now: Date.now() }, cleaned, {
        instant: prefersReducedMotion(),
        now: Date.now(),
      });
      return next;
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    // Native button activation already calls continue — do not double-fire.
    if (target?.closest("button")) return;
    event.preventDefault();
    continueDialogue();
  }

  const shown = visibleGuideText(cleaned, state);
  const fullCurrent = cleaned[Math.min(state.messageIndex, cleaned.length - 1)] ?? "";
  const label = continueLabel ?? t("player.continue");
  const isTyping = state.phase === "typing";

  if (!cleaned.length) return null;

  return (
    <div
      className={["guide-dialogue flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4", className].join(" ")}
      data-testid={testId}
      data-guide-phase={state.phase}
      data-guide-message-index={state.messageIndex}
      onKeyDown={onKeyDown}
    >
      <div className="flex shrink-0 items-end gap-2 sm:flex-col sm:items-center">
        <Mascot size={mascotSize} variant="still" animated={false} className="shrink-0" />
        {name ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{name}</span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="relative w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm leading-6 text-ink shadow-card sm:text-base"
          data-testid="guide-speech-box"
          aria-label={fullCurrent}
          onClick={continueDialogue}
        >
          <span
            className="absolute -left-1.5 top-5 hidden h-3 w-3 rotate-45 border-b border-l border-line bg-surface sm:block"
            aria-hidden
          />
          {/* Visual typewriter — AT gets the full sentence via aria-label, not char ticks. */}
          <span aria-hidden="true" data-testid="guide-visible-text">
            {shown}
            {isTyping ? (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle motion-reduce:animate-none" />
            ) : null}
          </span>
          <span className="sr-only" aria-live="polite">
            {state.phase === "complete" || state.phase === "done" ? fullCurrent : ""}
          </span>
        </button>

        <div className="mt-3">
          <Button
            className="w-full animate-pop shadow-lift"
            data-testid="guide-continue"
            data-guide-continue={isTyping ? "complete-text" : "advance"}
            onClick={continueDialogue}
          >
            {label}
            <IconChevron width={18} height={18} aria-hidden="true" />
          </Button>
        </div>
        {/* Guard window exposed for tests */}
        <span className="sr-only" data-guide-guard-ms={GUIDE_ADVANCE_GUARD_MS} />
      </div>
    </div>
  );
}
