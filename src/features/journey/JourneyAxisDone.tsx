import { useLayoutEffect, useRef, useState } from "react";
import { whenScreenCalm } from "../../lib/motion/completionMoment";
import { prefersReducedMotion } from "../../lib/motion/livingUiMotion";

/**
 * RC2.3.13R.3.2.6 — the completed part of a Journey module's axis line: a calm
 * solid accent from the top of the module to the current node (the whole line
 * once the module is done). Drawn inside the existing axis line, so the axis
 * never moves and nothing reflows; scaled with transform, never height.
 *
 * The last fill per module is kept for the session: coming back from a lesson
 * that completed a node, the line grows once from where it was to the new
 * current node. It is the Journey's part of the completion moment, so it waits
 * on the same rule as the node (whenScreenCalm): it holds the old fill while a
 * milestone or streak screen is up, and grows once the screen is calm. A first
 * visit, a remount at the same place or reduced motion simply draws it
 * (progression-living.css).
 */
const lastFill = new Map<string, number>();

export type JourneyAxisFill = "none" | "partial" | "full";

export function JourneyAxisDone({
  unitId,
  fill,
  currentLessonId,
}: {
  unitId: string;
  fill: JourneyAxisFill;
  /** The module's current lesson — measured whatever it renders as (a Pro or tone-gated lesson shows LOCKED). */
  currentLessonId?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState<number>(() => (fill === "full" ? 1 : lastFill.get(unitId) ?? 0));
  const [grows, setGrows] = useState(false);

  useLayoutEffect(() => {
    const span = ref.current;
    const line = span?.parentElement;
    const frame = line?.parentElement;
    if (!span || !line || !frame) return;
    const measure = (): number => {
      if (fill === "full") return 1;
      if (fill === "none") return 0;
      const byId =
        currentLessonId && typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? frame.querySelector(`[data-lesson-id="${CSS.escape(currentLessonId)}"] [data-progression-node]`)
          : null;
      const current = byId ?? frame.querySelector('[data-progression-state="CURRENT"]');
      const lineBox = line.getBoundingClientRect();
      if (!current || lineBox.height <= 0) return 0;
      const node = current.getBoundingClientRect();
      const center = node.top + node.height / 2 - lineBox.top;
      return Math.max(0, Math.min(1, center / lineBox.height));
    };
    // lastFill is what the learner last saw drawn: a grow still waiting on a
    // ceremony is not recorded until it plays, so a re-run (the current lesson
    // settling after a Victory) holds the old fill instead of jumping to it.
    const previous = lastFill.get(unitId);
    const next = measure();
    let target: number | null = null;
    let cancelGrow = () => {};
    // Reduced motion: the final fill at once, like the node (no grow to wait for).
    if (previous !== undefined && next > previous + 0.001 && !prefersReducedMotion()) {
      // Paint the old fill first, then grow to the new one (one transition)
      // once no ceremony or modal covers the path.
      target = next;
      setScale(previous);
      setGrows(true);
      const settle = () => {
        const value = target ?? next;
        target = null;
        lastFill.set(unitId, value);
        setScale(value);
      };
      cancelGrow = whenScreenCalm(settle, () => {
        setGrows(false);
        settle();
      });
    } else {
      lastFill.set(unitId, next);
      setGrows(false);
      setScale(next);
    }
    if (typeof ResizeObserver === "undefined") return () => cancelGrow();
    // Expanding rows or late scenes move the current node: follow it, without motion.
    // (Its first callback, right after observe(), reports the same fill and is ignored.)
    // A grow still waiting just aims at the node's new place.
    const ro = new ResizeObserver(() => {
      const value = measure();
      if (target !== null) {
        target = value;
        return;
      }
      if (Math.abs(value - (lastFill.get(unitId) ?? 0)) < 0.002) return;
      lastFill.set(unitId, value);
      setGrows(false);
      setScale(value);
    });
    ro.observe(frame);
    return () => {
      cancelGrow();
      ro.disconnect();
    };
  }, [unitId, fill, currentLessonId]);

  return (
    <span
      ref={ref}
      className="journey-axis-done"
      aria-hidden
      data-journey-axis-fill={fill}
      data-axis-grows={grows ? "true" : undefined}
      style={{ transform: `scaleY(${scale})` }}
    />
  );
}
