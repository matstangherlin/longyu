import { useEffect, useRef, useState } from "react";

/**
 * RC2.3.13R.3.2.4 — real deltas only.
 *
 * A counter or progress value responds once when it genuinely changes —
 * never on first mount, never on a re-render with the same value, never by
 * replaying from zero. The last value seen per id survives remounts (Home →
 * lesson → Home), so a delta earned while a widget was unmounted is shown
 * once, and opening a screen again shows nothing.
 *
 * Presentation only: this reads values, it never writes XP, energy,
 * streak or progress.
 */

const lastSeen = new Map<string, number>();

export type ValueDelta = { key: number; direction: "up" | "down" | null };

/** Pure step (exported for gates): returns the direction of a real change, if any. */
export function deltaDirection(previous: number | undefined, next: number): "up" | "down" | null {
  if (previous === undefined || !Number.isFinite(previous) || previous === next) return null;
  return next > previous ? "up" : "down";
}

export function useValueDelta(id: string, value: number | null | undefined): ValueDelta {
  const baseline = useRef<number | undefined>(lastSeen.get(id));
  const [delta, setDelta] = useState<ValueDelta>({ key: 0, direction: null });
  useEffect(() => {
    if (value === null || value === undefined || !Number.isFinite(value)) return;
    const previous = baseline.current;
    baseline.current = value;
    lastSeen.set(id, value);
    const direction = deltaDirection(previous, value);
    if (direction) setDelta((current) => ({ key: current.key + 1, direction }));
  }, [id, value]);
  return delta;
}

/** Tests only. */
export function resetValueDeltasForTests(): void {
  lastSeen.clear();
}
