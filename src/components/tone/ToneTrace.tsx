import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { guidedContourPath } from "./ToneContour";
import { TONE_COLOR } from "../../data/tones";
import type { MandarinToneNumber } from "../../data/toneKnowledge";
import { haptic } from "../../lib/haptics";
import {
  TONE_TRACE_INSTRUCTION,
  TONE_TRACE_MEMORY_PROMPT,
  advanceTraceProgress,
  memoryChoiceFeedback,
  nearestSampleIndex,
  nextTraceLevel,
  traceComplete,
  traceFeedback,
  traceStartsCorrectly,
  type ToneTraceLevel,
  type TracePoint,
} from "../../lib/toneTrace";
import { PedagogicalInlineTip } from "../guidance/PedagogicalInlineTip";

const SAMPLES = 48;

/**
 * RC2.2.24 — Tone Trace (Pointer Events: mouse, toque e caneta). O ponto
 * acompanha a posição horizontal do dedo e a ALTURA do contorno. A ajuda
 * diminui a cada traço completo: linha → parcial → pontos → nada.
 */
export function ToneTrace({ tone, onTraced }: { tone: MandarinToneNumber; onTraced?: (level: ToneTraceLevel) => void }) {
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [samples, setSamples] = useState<TracePoint[]>([]);
  const [level, setLevel] = useState<ToneTraceLevel>("FULL_LINE");
  const [progress, setProgress] = useState(0);
  const [dot, setDot] = useState<TracePoint | null>(null);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [completions, setCompletions] = useState(0);
  // RC2.2.25 — depois do traço sem linha: escolha de memória entre 4 caminhos.
  const [memoryChoice, setMemoryChoice] = useState(false);
  const [memoryResult, setMemoryResult] = useState<"correct" | "wrong" | null>(null);
  const d = useMemo(() => guidedContourPath(tone), [tone]);

  useEffect(() => {
    const path = pathRef.current;
    if (!path || typeof path.getTotalLength !== "function") return;
    const total = path.getTotalLength();
    setSamples(Array.from({ length: SAMPLES }, (_, i) => {
      const point = path.getPointAtLength((total * i) / (SAMPLES - 1));
      return { x: point.x, y: point.y };
    }));
  }, [d]);

  /** Coordenada no viewBox (respeita o letterbox do preserveAspectRatio). */
  function svgX(event: ReactPointerEvent): number {
    const svg = svgRef.current;
    if (!svg) return 0;
    const matrix = svg.getScreenCTM?.();
    if (matrix && typeof svg.createSVGPoint === "function") {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      return point.matrixTransform(matrix.inverse()).x;
    }
    const rect = svg.getBoundingClientRect();
    return ((event.clientX - rect.left) / Math.max(1, rect.width)) * 120;
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!samples.length) return;
    const index = nearestSampleIndex(samples, svgX(event));
    if (!traceStartsCorrectly(index, samples.length)) {
      setMessage(traceFeedback(level, false));
      return;
    }
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      /* ponteiro já liberado: o traço segue pelos eventos do próprio SVG */
    }
    haptic("selection");
    setDragging(true);
    setMessage(null);
    setProgress(0);
    setDot(samples[index]);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging || !samples.length) return;
    const index = nearestSampleIndex(samples, svgX(event));
    setDot(samples[index]);
    setProgress((previous) => advanceTraceProgress(previous, index, samples.length));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (traceComplete(progress)) {
      haptic("piecePlaced");
      setMessage(traceFeedback(level, true));
      setCompletions((count) => count + 1);
      onTraced?.(level);
      if (level === "NO_LINE") setMemoryChoice(true);
      setLevel((current) => nextTraceLevel(current));
    } else {
      setMessage(traceFeedback(level, false));
    }
    setProgress(0);
  }

  const color = TONE_COLOR[tone];
  const lineOpacity = level === "NO_LINE" ? 0 : level === "GUIDE_DOTS" ? 0.9 : 0.85;
  const dash = level === "PARTIAL_LINE" ? "40 200" : level === "GUIDE_DOTS" ? "0.1 9" : undefined;

  if (memoryChoice) {
    return (
      <div className="flex w-full flex-col items-center" data-tone-trace={tone} data-trace-level="MEMORY_CHOICE" data-trace-completions={completions}>
        <p className="text-center text-base font-semibold text-ink">{TONE_TRACE_MEMORY_PROMPT}</p>
        <div className="mt-3 grid w-full max-w-sm grid-cols-2 gap-2" data-testid="tone-trace-memory-options">
          {([1, 2, 3, 4] as MandarinToneNumber[]).map((option) => (
            <button
              key={option}
              type="button"
              disabled={memoryResult === "correct"}
              onClick={() => {
                const correct = option === tone;
                setMemoryResult(correct ? "correct" : "wrong");
                if (correct) haptic("piecePlaced");
              }}
              className="flex min-h-16 items-center justify-center rounded-2xl border border-line bg-surface p-2 transition hover:bg-surface-2 disabled:opacity-80"
              data-memory-option={option}
              aria-label={`${option}`}
            >
              <svg viewBox="0 0 120 68" className="h-10 w-full" aria-hidden="true">
                <path d={guidedContourPath(option)} fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" className="text-ink-soft" />
              </svg>
            </button>
          ))}
        </div>
        <p className="mt-2 min-h-5 text-sm font-medium text-ink-soft" role="status" data-testid="tone-trace-message" data-memory-result={memoryResult ?? ""}>
          {memoryResult ? memoryChoiceFeedback(memoryResult === "correct") : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center" data-tone-trace={tone} data-trace-level={level} data-trace-completions={completions} data-coachmark-target="tone-trace">
      <PedagogicalInlineTip interaction="tone_trace" className="mb-1 w-full max-w-sm" />
      <p className="text-center text-base font-semibold text-ink">{TONE_TRACE_INSTRUCTION}</p>
      <svg
        ref={svgRef}
        viewBox="0 0 120 68"
        className="mt-3 h-40 w-full max-w-sm touch-none select-none rounded-2xl bg-surface-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={TONE_TRACE_INSTRUCTION}
        data-testid="tone-trace-surface"
      >
        <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={dash} opacity={lineOpacity} />
        {dragging && progress > 0 && (
          <path d={d} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={`${progress} 1`} opacity={0.35} />
        )}
        {dot && <circle cx={dot.x} cy={dot.y} r={5} fill={color} data-testid="tone-trace-dot" />}
      </svg>
      <p className="mt-2 min-h-5 text-sm font-medium text-ink-soft" role="status" data-testid="tone-trace-message">{message ?? ""}</p>
    </div>
  );
}
