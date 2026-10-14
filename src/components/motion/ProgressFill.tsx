import { useEffect, useRef, useState } from "react";
import { documentHidden, prefersReducedMotion } from "../../lib/motion/livingUiMotion";

/**
 * RC2.3.13R.3.2.4 — progress that moves only by a real delta.
 *
 * The fill is a full-width bar shifted with `transform` (composited, keeps the
 * rounded end) instead of a width transition. First paint is the true value —
 * never a replay from zero. When the value changes while mounted, or differs
 * from the last value seen under the same `id` (e.g. 42% → 50% after a
 * lesson), it moves once from the old value to the new one.
 */
const lastSeen = new Map<string, number>();

function clampPct(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function ProgressFill({
  value,
  id,
  className,
}: {
  /** 0–100 */
  value: number;
  id?: string;
  className?: string;
}) {
  const target = clampPct(value);
  const start = useRef<number>(id !== undefined && lastSeen.has(id) ? (lastSeen.get(id) as number) : target);
  const [shown, setShown] = useState(start.current);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (id !== undefined) lastSeen.set(id, target);
    if (shown === target) return;
    setAnimate(!prefersReducedMotion());
    if (documentHidden() || typeof requestAnimationFrame !== "function") {
      setShown(target);
      return;
    }
    // Let the old value paint first so the move starts from it.
    const frame = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, target]);

  return (
    <div
      className={className}
      data-progress-fill={target}
      style={{
        transform: `translateX(${shown - 100}%)`,
        transition: animate ? "transform var(--motion-emphasis) var(--ease-standard)" : undefined,
      }}
    />
  );
}

/** Tests only. */
export function resetProgressFillForTests(): void {
  lastSeen.clear();
}
