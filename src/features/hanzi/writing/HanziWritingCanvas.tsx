/**
 * RC2.3.4 — pointer-driven writing canvas (mobile-first).
 * Drawing state lives in refs + rAF — does not re-render LessonPlayer on every move.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { GuideLevel } from "../../../lib/hanziWriting/stages";
import type { HanziHandwritingReference, Point2D, StrokeAttemptSample } from "../../../lib/hanziWriting/types";

export interface HanziWritingCanvasProps {
  reference: HanziHandwritingReference;
  guideLevel: GuideLevel;
  /** Index of the next expected stroke (for ghost highlight). */
  nextStrokeIndex: number;
  /** Show target glyph ghost behind strokes. */
  showGlyph: boolean;
  /** Character glyph for ghost (may be hidden in memory write). */
  glyph: string;
  /** When true, hide the expected character (memory write). */
  hideTargetGlyph?: boolean;
  showGrid?: boolean;
  disabled?: boolean;
  className?: string;
  onStrokeComplete: (sample: StrokeAttemptSample) => void;
  /** Live ink path for current stroke (optional parent notify — throttled). */
  onInkChange?: (points: readonly Point2D[]) => void;
}

function toNorm(clientX: number, clientY: number, rect: DOMRect): Point2D {
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  const mid = size / 2;
  ctx.beginPath();
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, size);
  ctx.moveTo(0, mid);
  ctx.lineTo(size, mid);
  ctx.stroke();
  ctx.strokeRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84);
  ctx.restore();
}

function strokeToCanvas(points: readonly Point2D[], size: number): { x: number; y: number }[] {
  return points.map((p) => ({ x: (p.x / 100) * size, y: (p.y / 100) * size }));
}

export function HanziWritingCanvas({
  reference,
  guideLevel,
  nextStrokeIndex,
  showGlyph,
  glyph,
  hideTargetGlyph = false,
  showGrid = true,
  disabled = false,
  className,
  onStrokeComplete,
  onInkChange,
}: HanziWritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<Point2D[]>([]);
  const committedRef = useRef<Point2D[][]>([]);
  const drawingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const [size, setSize] = useState(280);
  const [error, setError] = useState<string | null>(null);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const css = size;
    if (canvas.width !== css * dpr || canvas.height !== css * dpr) {
      canvas.width = css * dpr;
      canvas.height = css * dpr;
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, css, css);

    // Background
    ctx.fillStyle = "rgb(250, 248, 244)";
    ctx.fillRect(0, 0, css, css);

    if (showGrid && guideLevel > 0) drawGrid(ctx, css);

    // Ghost glyph
    if (showGlyph && !hideTargetGlyph && guideLevel >= 2) {
      ctx.save();
      ctx.globalAlpha = guideLevel >= 3 ? 0.18 : 0.1;
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `${Math.floor(css * 0.72)}px "Noto Sans SC", "PingFang SC", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(glyph, css / 2, css / 2 + css * 0.02);
      ctx.restore();
    }

    // Reference ghosts / next stroke
    const drawRefStroke = (idx: number, alpha: number, color: string, width: number) => {
      const s = reference.strokes[idx];
      if (!s || s.points.length < 2) return;
      const pts = strokeToCanvas(s.points, css);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.stroke();
      ctx.restore();
    };

    if (guideLevel >= 3) {
      for (let i = 0; i < reference.strokes.length; i += 1) {
        if (i === nextStrokeIndex) continue;
        drawRefStroke(i, 0.12, "#6b7280", 3);
      }
    }
    if (guideLevel >= 1 && nextStrokeIndex < reference.strokes.length) {
      drawRefStroke(nextStrokeIndex, guideLevel >= 2 ? 0.45 : 0.25, "#c45c26", 4);
      const start = reference.strokes[nextStrokeIndex]!.points[0]!;
      const sx = (start.x / 100) * css;
      const sy = (start.y / 100) * css;
      ctx.save();
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.arc(sx, sy, guideLevel >= 2 ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      // Direction tick
      const dir = reference.strokes[nextStrokeIndex]!.direction;
      ctx.strokeStyle = "#c45c26";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + dir.x * 18, sy + dir.y * 18);
      ctx.stroke();
      ctx.restore();
    }

    // Committed user ink
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of committedRef.current) {
      if (stroke.length < 2) continue;
      const pts = strokeToCanvas(stroke, css);
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.stroke();
    }

    // Live ink
    if (inkRef.current.length >= 2) {
      const pts = strokeToCanvas(inkRef.current, css);
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.stroke();
    }
  }, [guideLevel, glyph, hideTargetGlyph, nextStrokeIndex, reference, showGlyph, showGrid, size]);

  const schedulePaint = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      try {
        paint();
      } catch {
        setError("Não consegui abrir o treino de escrita agora.");
      }
    });
  }, [paint]);

  useEffect(() => {
    schedulePaint();
  }, [schedulePaint, nextStrokeIndex, guideLevel]);

  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 280;
      setSize(Math.max(220, Math.min(360, Math.floor(w))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const endStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const sample = inkRef.current.slice();
    inkRef.current = [];
    if (sample.length >= 2) {
      committedRef.current = [...committedRef.current, sample];
      onStrokeComplete({ points: sample });
    }
    schedulePaint();
  }, [onStrokeComplete, schedulePaint]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || error) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    inkRef.current = [toNorm(e.clientX, e.clientY, rect)];
    schedulePaint();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    inkRef.current = [...inkRef.current, toNorm(e.clientX, e.clientY, rect)];
    onInkChange?.(inkRef.current);
    schedulePaint();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endStroke();
  };

  const onPointerCancel = () => {
    drawingRef.current = false;
    inkRef.current = [];
    schedulePaint();
  };

  /** Imperative helpers for parent Undo / Clear via ref callback pattern */
  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement & {
      __hanziClear?: () => void;
      __hanziUndo?: () => void;
      __hanziCommitted?: () => Point2D[][];
    } | null;
    if (!canvas) return;
    canvas.__hanziClear = () => {
      committedRef.current = [];
      inkRef.current = [];
      schedulePaint();
    };
    canvas.__hanziUndo = () => {
      committedRef.current = committedRef.current.slice(0, -1);
      schedulePaint();
    };
    canvas.__hanziCommitted = () => committedRef.current;
  }, [schedulePaint]);

  if (error) {
    return (
      <div
        className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-center"
        data-testid="hanzi-writing-canvas-fallback"
      >
        <p className="text-sm text-ink-soft">{error}</p>
        <button
          type="button"
          className="min-h-12 rounded-xl bg-accent px-4 text-sm font-semibold text-white"
          onClick={() => {
            setError(null);
            schedulePaint();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[360px] touch-none ${className ?? ""}`} data-testid="hanzi-writing-canvas-wrap">
      <canvas
        ref={canvasRef}
        data-testid="hanzi-writing-canvas"
        className="mx-auto block w-full touch-none rounded-2xl border border-line shadow-sm"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={(e) => {
          if (drawingRef.current) onPointerUp(e);
        }}
        aria-label={`Área de escrita para ${glyph}`}
      />
    </div>
  );
}

export function clearHanziCanvas(canvas: HTMLCanvasElement | null) {
  const c = canvas as HTMLCanvasElement & { __hanziClear?: () => void };
  c?.__hanziClear?.();
}

export function undoHanziCanvas(canvas: HTMLCanvasElement | null) {
  const c = canvas as HTMLCanvasElement & { __hanziUndo?: () => void };
  c?.__hanziUndo?.();
}
