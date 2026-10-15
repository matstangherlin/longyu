import type { CSSProperties } from "react";
import { ChineseOrnament } from "../ornaments/chinese/ChineseOrnament";
import { COMPLETION_PARTICLES } from "../../lib/motion/livingUiMotion";

/**
 * RC2.3.13R.3.2.4 — Victory's one-shot celebration, in the ornament language
 * instead of generic confetti: a seal medallion settles behind the mascot,
 * one stitched ring opens and fades, and six plum blossoms drift out and
 * vanish. Everything ends within --motion-celebrate (≤ 1.1 s) and never loops.
 *
 * Pure presentation: no callbacks, no timers, nothing waits for it. It does
 * not grant, count or replay anything — `play` comes from the completion's
 * first show (re-opening shows the settled seal only) and reduced motion
 * shows the settled seal only.
 */
const PETALS: ReadonlyArray<{ x: number; y: number; rot: number; delay: number }> = [
  { x: -58, y: -6, rot: -70, delay: 140 },
  { x: -44, y: 30, rot: 40, delay: 200 },
  { x: -20, y: 46, rot: -30, delay: 260 },
  { x: 22, y: 44, rot: 55, delay: 230 },
  { x: 46, y: 26, rot: -45, delay: 170 },
  { x: 58, y: -8, rot: 80, delay: 120 },
];

export function CompletionBurst({ play }: { play: boolean }) {
  return (
    <span
      className="lyo lyo-burst"
      aria-hidden="true"
      data-ornament-surface="victory"
      data-intensity="milestone"
      data-tone="accent"
      data-play={play ? "true" : "false"}
      data-testid="completion-burst"
    >
      <span className="lyo-burst-ring" />
      <ChineseOrnament id="seal-medallion" className="lyo-burst-seal" />
      {play
        ? PETALS.slice(0, COMPLETION_PARTICLES).map((petal, index) => (
            <ChineseOrnament
              key={index}
              id="plum-blossom"
              className="lyo-burst-petal"
              style={
                {
                  "--petal-x": `${petal.x}px`,
                  "--petal-y": `${petal.y}px`,
                  "--petal-rot": `${petal.rot}deg`,
                  "--petal-delay": `${petal.delay}ms`,
                } as CSSProperties
              }
            />
          ))
        : null}
    </span>
  );
}
