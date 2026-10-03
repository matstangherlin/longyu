/**
 * RC2.3.4 — TRACE / MEMORY_WRITE / draw_missing_stroke exercise shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PedagogicalInlineTip } from "../../../components/guidance/PedagogicalInlineTip";
import { SpeakButton } from "../../../components/ui/SpeakButton";
import { evaluateCharacterAttempt, evaluateStrokeAttempt } from "../../../lib/hanziWriting/geometry";
import {
  appendWritingTelemetry,
  recordFormEvidence,
} from "../../../lib/hanziWriting/evidence";
import { handwritingReferenceFor } from "../../../lib/hanziWriting/handwritingReference";
import type { GuideLevel, HanziLearningStage } from "../../../lib/hanziWriting/stages";
import { guideLevelForStage, pinyinVisibleForStage, targetGlyphVisibleForStage } from "../../../lib/hanziWriting/stages";
import type { MemoryWritePrompt, StrokeAttemptSample } from "../../../lib/hanziWriting/types";
import { haptic } from "../../../lib/haptics";
import { clearHanziCanvas, HanziWritingCanvas, undoHanziCanvas } from "./HanziWritingCanvas";

export interface HanziWritingExerciseProps {
  character: string;
  charId: string;
  stage: HanziLearningStage;
  masteryPass?: number;
  meaningPt?: string;
  pinyin?: string;
  prompt?: MemoryWritePrompt;
  /** draw_missing_stroke: index of the stroke to draw (others shown as ghost). */
  missingStrokeIndex?: number;
  evaluative?: boolean;
  onComplete?: (result: { correct: boolean; helpUsed: boolean }) => void;
  onFallbackAssemble?: () => void;
  className?: string;
}

export function HanziWritingExercise({
  character,
  charId,
  stage,
  masteryPass = 3,
  meaningPt,
  pinyin,
  prompt,
  missingStrokeIndex,
  evaluative = false,
  onComplete,
  onFallbackAssemble,
  className,
}: HanziWritingExerciseProps) {
  const reference = useMemo(() => handwritingReferenceFor(character), [character]);
  const [attempts, setAttempts] = useState<StrokeAttemptSample[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [helpUsed, setHelpUsed] = useState(false);
  const [undoUsed, setUndoUsed] = useState(false);
  const [replayUsed, setReplayUsed] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayStroke, setReplayStroke] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [engineError, setEngineError] = useState(false);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  const guideLevel: GuideLevel = guideLevelForStage(stage, attemptCount, helpUsed);
  const showGlyph = targetGlyphVisibleForStage(stage, masteryPass);
  const pinyinMode = pinyinVisibleForStage(stage, masteryPass);
  const isMemory = stage === "MEMORY_WRITE" || stage === "CONTEXT_USE";
  const isMissing = stage === "COMPLETE" || missingStrokeIndex != null;
  const expectedIndex = isMissing
    ? missingStrokeIndex ?? Math.max(0, (reference?.strokes.length ?? 1) - 1)
    : attempts.length;

  useEffect(() => {
    setAttempts([]);
    setFeedback(null);
    setVerdict(null);
    setAttemptCount(0);
  }, [character, stage]);

  const playDemo = useCallback(() => {
    if (!reference) return;
    setReplayUsed(true);
    setHelpUsed(true);
    setReplaying(true);
    setReplayStroke(0);
    let i = 0;
    const tick = () => {
      if (i >= reference.strokes.length) {
        setReplaying(false);
        return;
      }
      setReplayStroke(i);
      i += 1;
      window.setTimeout(tick, 650);
    };
    tick();
  }, [reference]);

  const finishCharacter = useCallback(
    (samples: StrokeAttemptSample[], meta: { help: boolean; undo: boolean; replay: boolean }) => {
      if (!reference) return;
      const result = evaluateCharacterAttempt(reference, samples, {
        helpUsed: meta.help,
        undoUsed: meta.undo,
        replayUsed: meta.replay,
      });
      setVerdict(result.verdict);
      setFeedback(result.strokeResults[result.strokeResults.length - 1]?.feedbackPt ?? null);
      if (result.complete) {
        haptic("answerCorrect");
        const channel = isMemory ? (stage === "CONTEXT_USE" ? "contextWrite" : "memoryWrite") : "tracing";
        recordFormEvidence({
          charId,
          character,
          channel,
          correct: !evaluative || (result.complete && !meta.help && !meta.replay),
          stage,
          helpUsed: meta.help,
          undoUsed: meta.undo,
          replayUsed: meta.replay,
        });
        appendWritingTelemetry({
          characterId: charId,
          stage,
          masteryPass,
          attemptCount: attemptCount + 1,
          helpUsed: meta.help,
          undoUsed: meta.undo,
          replayUsed: meta.replay,
          strokeCount: samples.length,
          orderIssue: result.orderIssue,
          shapeIssue: result.shapeIssue,
          completed: true,
          correct: result.complete && (!evaluative || (!meta.help && !meta.replay)),
          at: Date.now(),
        });
        onComplete?.({
          correct: result.complete && (!evaluative || (!meta.help && !meta.replay)),
          helpUsed: meta.help || meta.replay,
        });
      } else {
        haptic("answerWrong");
      }
    },
    [attemptCount, charId, character, evaluative, isMemory, masteryPass, onComplete, reference, stage]
  );

  const onStrokeComplete = useCallback(
    (sample: StrokeAttemptSample) => {
      if (!reference) return;
      try {
        if (isMissing) {
          const idx = missingStrokeIndex ?? reference.strokes.length - 1;
          const ev = evaluateStrokeAttempt(reference, idx, sample);
          setFeedback(ev.feedbackPt);
          if (ev.accepted) {
            haptic("piecePlaced");
            recordFormEvidence({
              charId,
              character,
              channel: "complete",
              correct: true,
              stage: "COMPLETE",
              helpUsed,
            });
            setVerdict("Ótimo");
            onComplete?.({ correct: true, helpUsed });
          } else {
            haptic("answerWrong");
            if (ev.category === "STROKE_ORDER") {
              setFeedback("Tente começar pelo traço indicado.");
            }
          }
          return;
        }

        const nextIdx = attempts.length;
        const ev = evaluateStrokeAttempt(reference, nextIdx, sample);
        setFeedback(ev.feedbackPt);
        if (!ev.accepted) {
          haptic("answerWrong");
          if (ev.category === "STROKE_ORDER") {
            setFeedback("Tente começar pelo traço indicado.");
          }
          setAttemptCount((n) => n + 1);
          // Rejected stroke: do not advance index — parent canvas still committed ink;
          // user can Undo. We still append for feedback loop then pop via undo hint.
          return;
        }
        haptic("piecePlaced");
        recordFormEvidence({
          charId,
          character,
          channel: "strokeOrder",
          correct: true,
          stage,
        });
        const next = [...attempts, sample];
        setAttempts(next);
        if (next.length >= reference.strokes.length) {
          finishCharacter(next, { help: helpUsed, undo: undoUsed, replay: replayUsed });
        }
      } catch {
        setEngineError(true);
      }
    },
    [
      attempts,
      charId,
      character,
      finishCharacter,
      helpUsed,
      isMissing,
      missingStrokeIndex,
      onComplete,
      reference,
      replayUsed,
      stage,
      undoUsed,
    ]
  );

  const handleUndo = () => {
    const canvas = canvasHostRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    undoHanziCanvas(canvas);
    setAttempts((a) => a.slice(0, -1));
    setUndoUsed(true);
    setFeedback(null);
    setVerdict(null);
    // Undo during teaching is not an error
  };

  const handleClear = () => {
    const canvas = canvasHostRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    clearHanziCanvas(canvas);
    setAttempts([]);
    setFeedback(null);
    setVerdict(null);
  };

  if (!reference) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4" data-testid="hanzi-writing-no-ref">
        <p className="text-sm text-ink-soft">
          Ainda não há referência de escrita verificada para {character}. Pratique por montagem.
        </p>
        {onFallbackAssemble && (
          <button
            type="button"
            className="mt-3 min-h-12 w-full rounded-xl bg-accent px-4 font-semibold text-white"
            onClick={onFallbackAssemble}
          >
            Praticar por montagem
          </button>
        )}
      </div>
    );
  }

  if (engineError) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4" data-testid="hanzi-writing-engine-error">
        <p className="text-sm text-ink-soft">Não consegui abrir o treino de escrita agora.</p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            className="min-h-12 rounded-xl bg-accent px-4 font-semibold text-white"
            onClick={() => setEngineError(false)}
          >
            Tentar novamente
          </button>
          {onFallbackAssemble && (
            <button type="button" className="min-h-12 rounded-xl border border-line px-4" onClick={onFallbackAssemble}>
              Praticar por montagem
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className ?? ""}`} data-testid="hanzi-writing-exercise" data-stage={stage}>
      <PedagogicalInlineTip interaction={isMemory ? "hanzi_memory_write" : "hanzi_trace"} />

      <div className="text-center">
        {showGlyph && !isMemory && (
          <div className="hanzi mx-auto text-7xl leading-none text-ink sm:text-8xl" data-testid="hanzi-writing-glyph">
            {character}
          </div>
        )}
        {isMemory && prompt && (
          <div className="space-y-2" data-testid="hanzi-memory-prompt">
            {prompt.kind === "meaning" && (
              <p className="font-serif text-2xl font-semibold text-ink">{prompt.promptPt}</p>
            )}
            {prompt.kind === "audio" && (
              <div className="flex items-center justify-center gap-3">
                <SpeakButton text={prompt.audioText ?? character} size="md" />
                <span className="text-sm text-ink-soft">{prompt.promptPt}</span>
              </div>
            )}
            {prompt.kind === "sentence_blank" && (
              <p className="hanzi text-3xl text-ink">
                {prompt.sentenceBefore}
                <span className="mx-1 inline-block min-w-[2.5rem] border-b-2 border-accent text-center">　</span>
                {prompt.sentenceAfter}
              </p>
            )}
          </div>
        )}
        {isMemory && !prompt && meaningPt && (
          <p className="font-serif text-2xl font-semibold text-ink">{meaningPt}</p>
        )}
        {pinyinMode === "always" && pinyin && <p className="mt-1 font-serif text-lg text-ink-soft">{pinyin}</p>}
        {pinyinMode === "on_demand" && pinyin && (
          <details className="mt-1 text-sm text-ink-soft">
            <summary>Som (pinyin)</summary>
            {pinyin}
          </details>
        )}
        <p className="mt-2 text-sm text-ink-soft">
          {isMemory
            ? "Agora escreva sem o guia."
            : isMissing
              ? "Desenhe o traço que falta."
              : "Siga o traço na direção indicada."}
        </p>
      </div>

      <div ref={canvasHostRef} className="flex justify-center">
        <HanziWritingCanvas
          reference={reference}
          guideLevel={isMemory ? 0 : replaying ? 3 : guideLevel}
          nextStrokeIndex={replaying ? replayStroke : expectedIndex}
          showGlyph={showGlyph}
          glyph={character}
          hideTargetGlyph={isMemory}
          showGrid={!isMemory || guideLevel > 0}
          onStrokeComplete={onStrokeComplete}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line bg-surface text-sm font-semibold"
          onClick={handleUndo}
          data-testid="hanzi-writing-undo"
        >
          Desfazer
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line bg-surface text-sm font-semibold"
          onClick={handleClear}
          data-testid="hanzi-writing-clear"
        >
          Limpar
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-line bg-surface text-sm font-semibold"
          onClick={playDemo}
          data-testid="hanzi-writing-replay"
        >
          {replaying ? "…" : "Ver como escreve"}
        </button>
      </div>

      {feedback && (
        <p className="text-center text-sm text-ink" data-testid="hanzi-writing-feedback">
          {feedback}
        </p>
      )}
      {verdict && (
        <p
          className="text-center font-serif text-lg font-semibold text-accent"
          data-testid="hanzi-writing-verdict"
        >
          {verdict}
        </p>
      )}

      {onFallbackAssemble && (
        <button
          type="button"
          className="min-h-11 w-full text-sm text-ink-soft underline"
          onClick={onFallbackAssemble}
          data-testid="hanzi-writing-a11y-fallback"
        >
          Preferir montagem / ordem sem desenhar
        </button>
      )}
    </div>
  );
}
