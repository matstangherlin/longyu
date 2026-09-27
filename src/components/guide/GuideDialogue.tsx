import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
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
import { guideTextBlip, planGuideTextBlips, stopGuideTextVoice } from "../../lib/soundFx";
import { ProseGlossText } from "../hanzi/ProseGlossText";

export type GuideDialogueProps = {
  messages: readonly string[];
  /** Called once when the last message advances. */
  onComplete: () => void;
  name?: string;
  /** compact = smaller mascot for mobile / culture moments */
  size?: "default" | "compact";
  className?: string;
  continueLabel?: string;
  /**
   * RC2.2.11 — com o texto completo, Hànzì conhecidos viram consultáveis
   * (hover/foco no desktop, toque no mobile). Durante o typewriter nada muda.
   * Nunca ligar em prova.
   */
  gloss?: boolean;
  /**
   * RC2.2.17B · PART N/AX — "guided": mascote + balão lado a lado (como o
   * Teste guiado), em qualquer largura. "default": layout histórico.
   */
  layout?: "default" | "guided";
  /**
   * RC2.2.17B · PART I — quem hospeda decide onde mora o botão (ex.: dock do
   * GuidedLessonShell). Sem isso, o botão fica logo abaixo do balão.
   */
  renderAction?: (action: ReactNode) => ReactNode;
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
  gloss = false,
  layout = "default",
  renderAction,
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
  const guidedLayout = layout === "guided";
  const mascotSize = size === "compact" || guidedLayout ? 56 : 72;
  const reduced = prefersReducedMotion();
  const messageIdentity = cleaned.join("\u0001");
  const currentMessage = cleaned[Math.min(state.messageIndex, Math.max(0, cleaned.length - 1))] ?? "";
  // Quais graphemes ganham voz. Calculado uma vez por mensagem: o tick só consulta.
  const blipPlan = useMemo(
    () => planGuideTextBlips(segmentGraphemes(currentMessage)),
    [currentMessage]
  );

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
      stopGuideTextVoice();
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
      stopGuideTextVoice();
      return;
    }
    if (state.phase !== "typing") return;
    const current = cleaned[state.messageIndex] ?? "";
    const graphemes = segmentGraphemes(current);
    const last = graphemes[Math.max(0, state.visibleCount - 1)] ?? "";
    const delay = GUIDE_TYPEWRITER_MS + pauseAfterGrapheme(last);
    // O grapheme que este tick vai revelar. A voz nasce do tick real da máquina —
    // sem segundo typewriter e sem estimar a animação por CSS.
    const revealIndex = state.visibleCount;
    tickTimer.current = window.setTimeout(() => {
      if (blipPlan.has(revealIndex)) guideTextBlip(revealIndex);
      setState((prev) => reduceGuideDialogue(prev, { type: "TICK", now: Date.now() }, cleaned));
    }, delay);
    return () => {
      if (tickTimer.current != null) window.clearTimeout(tickTimer.current);
    };
  }, [state.phase, state.messageIndex, state.visibleCount, cleaned, blipPlan]);

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
      // Antecipou: o texto aparece inteiro e a voz para AGORA. Nenhum blip
      // pendente sobrevive ao reveal instantâneo.
      if (wasTyping) stopGuideTextVoice();
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
    if (event.defaultPrevented || target?.closest('button, [role="button"]')) return;
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

  const continueButton = (
    <div className={[renderAction ? "" : "mt-3", playEntrance ? "guide-continue-enter" : ""].join(" ")}>
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
  );

  if (!cleaned.length) return null;

  return (
    <div
      className={[
        guidedLayout ? "guide-dialogue flex flex-row items-end gap-3" : "guide-dialogue flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4",
        className,
      ].join(" ")}
      data-guide-layout={layout}
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
        {gloss && state.phase === "complete" ? (
          // Texto completo + gloss: a caixa deixa de ser <button> para os termos
          // serem controles próprios (sem botão dentro de botão). Clique fora de
          // um termo continua avançando, como antes.
          <div
            role="group"
            aria-label={fullCurrent}
            className="relative w-full cursor-pointer rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm leading-6 text-ink shadow-card sm:text-base"
            data-testid="guide-speech-box"
            data-guide-gloss="on"
            onClick={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest('[role="button"], [role="dialog"], a, button')) return;
              continueDialogue();
            }}
          >
            <span
              className="absolute -left-1.5 top-5 hidden h-3 w-3 rotate-45 border-b border-l border-line bg-surface sm:block"
              aria-hidden
            />
            <span data-testid="guide-visible-text">
              <ProseGlossText text={fullCurrent} />
            </span>
          </div>
        ) : (
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
        )}

        {renderAction ? renderAction(continueButton) : continueButton}
        <span className="sr-only" data-guide-guard-ms={GUIDE_ADVANCE_GUARD_MS} />
        <span className="sr-only" data-guide-entrance-ms={GUIDE_ENTRANCE_READY_MS} />
      </div>
    </div>
  );
}
