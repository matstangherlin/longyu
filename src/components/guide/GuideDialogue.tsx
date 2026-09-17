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
import {
  GUIDE_ENTRANCE_READY_MS,
  initialGuideMotion,
  type GuideMotionPhase,
} from "../../lib/guideDialogueMotion";

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
 * Entrance motion is CSS-only and never blocks Continue.
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
  const [motion, setMotion] = useState<GuideMotionPhase>(() => initialGuideMotion());
  const [settle, setSettle] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const doneFiredRef = useRef(false);
  const tickTimer = useRef<number | null>(null);
  const entranceTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const prevMessageIndex = useRef(0);
  const [textSwapKey, setTextSwapKey] = useState(0);
  const mascotSize = size === "compact" ? 56 : 72;
  const reduced = prefersReducedMotion();
  const messageIdentity = cleaned.join("\u0001");

  useEffect(() => {
    const instant = prefersReducedMotion();
    doneFiredRef.current = false;
    prevMessageIndex.current = 0;
    setSettle(false);
    setMotion(initialGuideMotion(instant));
    setState(
      reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant }, cleaned, {
        instant,
        now: Date.now(),
      })
    );
    if (entranceTimer.current != null) window.clearTimeout(entranceTimer.current);
    if (!instant) {
      entranceTimer.current = window.setTimeout(() => {
        setMotion("ready");
      }, GUIDE_ENTRANCE_READY_MS);
    }
    return () => {
      if (tickTimer.current != null) window.clearTimeout(tickTimer.current);
      if (entranceTimer.current != null) window.clearTimeout(entranceTimer.current);
      if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
    };
    // Entrance only when dialogue identity changes — not per message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageIdentity]);

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

  useEffect(() => {
    if (state.messageIndex === prevMessageIndex.current) return;
    prevMessageIndex.current = state.messageIndex;
    setTextSwapKey((key) => key + 1);
  }, [state.messageIndex]);

  function continueDialogue() {
    setState((prev) => {
      const wasTyping = prev.phase === "typing";
      const next = reduceGuideDialogue(prev, { type: "CONTINUE", now: Date.now() }, cleaned, {
        instant: prefersReducedMotion(),
        now: Date.now(),
      });
      if (wasTyping && next.phase === "complete" && !prefersReducedMotion()) {
        setSettle(true);
        if (settleTimer.current != null) window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => setSettle(false), 100);
      }
      return next;
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (target?.closest("button")) return;
    event.preventDefault();
    continueDialogue();
  }

  const shown = visibleGuideText(cleaned, state);
  const fullCurrent = cleaned[Math.min(state.messageIndex, cleaned.length - 1)] ?? "";
  const label = continueLabel ?? t("player.continue");
  const isTyping = state.phase === "typing";
  const playEntrance = motion === "entering" && !reduced;
  // Blink uses existing eyes overlay only (static body) — not a fake wave.
  const blink = motion === "ready" && !reduced;

  if (!cleaned.length) return null;

  return (
    <div
      className={["guide-dialogue flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4", className].join(" ")}
      data-testid={testId}
      data-guide-phase={state.phase}
      data-guide-message-index={state.messageIndex}
      data-guide-motion={motion}
      onKeyDown={onKeyDown}
    >
      <div
        className={[
          "flex shrink-0 items-end gap-2 sm:flex-col sm:items-center",
          playEntrance ? "guide-mascot-enter" : "",
        ].join(" ")}
        data-testid="guide-mascot-slot"
      >
        <Mascot
          size={mascotSize}
          variant={blink ? "wave" : "still"}
          animated={blink}
          className="shrink-0"
        />
        {name ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{name}</span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          className={[
            "relative w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm leading-6 text-ink shadow-card sm:text-base",
            playEntrance ? "guide-bubble-enter" : "",
            settle ? "guide-bubble-settle" : "",
          ].join(" ")}
          data-testid="guide-speech-box"
          aria-label={fullCurrent}
          onClick={continueDialogue}
        >
          <span
            className="absolute -left-1.5 top-5 hidden h-3 w-3 rotate-45 border-b border-l border-line bg-surface sm:block"
            aria-hidden
          />
          <span
            key={textSwapKey}
            aria-hidden="true"
            data-testid="guide-visible-text"
            className={textSwapKey > 0 && !reduced ? "guide-text-swap" : undefined}
          >
            {shown}
            {isTyping ? (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle motion-reduce:animate-none" />
            ) : null}
          </span>
          <span className="sr-only" aria-live="polite">
            {state.phase === "complete" || state.phase === "done" ? fullCurrent : ""}
          </span>
        </button>

        <div className={["mt-3", playEntrance ? "guide-continue-enter" : ""].join(" ")}>
          <Button
            className="w-full shadow-lift"
            data-testid="guide-continue"
            data-guide-continue={isTyping ? "complete-text" : "advance"}
            onClick={continueDialogue}
          >
            {label}
            <IconChevron width={18} height={18} aria-hidden="true" />
          </Button>
        </div>
        <span className="sr-only" data-guide-guard-ms={GUIDE_ADVANCE_GUARD_MS} />
        <span className="sr-only" data-guide-entrance-ms={GUIDE_ENTRANCE_READY_MS} />
      </div>
    </div>
  );
}
