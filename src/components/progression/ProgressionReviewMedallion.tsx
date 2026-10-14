import type { ProgressionNodeState } from "./progressionTypes";

/**
 * RC2.3.13R.3.2.3 — embroidered medallion behind the module-review bubble.
 *
 * A lotus rosette of twelve scallops, a ring of French-knot stitches and four
 * ruyi knots at the cardinal points — the review that closes a module reads
 * as a small celebration, like a stitched seal. It frames the bubble only:
 * the bubble, its state icon and its label are untouched, the medallion is
 * hidden from assistive tech and never takes taps. State stays legible: a
 * locked review is drawn in muted line color, never in accent.
 */

const SIZE = 84;
const C = SIZE / 2;
const PETALS = 12;

function polar(r: number, angle: number): [number, number] {
  const a = (angle - 90) * (Math.PI / 180);
  return [Math.round((C + r * Math.cos(a)) * 100) / 100, Math.round((C + r * Math.sin(a)) * 100) / 100];
}

/** Twelve outward scallops between r=35 and r=41. */
const ROSETTE = (() => {
  const step = 360 / PETALS;
  let d = "";
  for (let i = 0; i < PETALS; i += 1) {
    const [x0, y0] = polar(35, i * step);
    const [cx, cy] = polar(42.5, i * step + step / 2);
    const [x1, y1] = polar(35, (i + 1) * step);
    d += `${i === 0 ? `M${x0} ${y0}` : ""}Q${cx} ${cy} ${x1} ${y1}`;
  }
  return `${d}Z`;
})();

/** Ruyi knot heads: a lobe with two small curls, rotated to each cardinal point. */
const RUYI = [0, 90, 180, 270].map((angle) => {
  const [x, y] = polar(38.5, angle);
  return { x, y, angle };
});

const DIAMONDS = [45, 135, 225, 315].map((angle) => polar(36.5, angle));

const TONE: Record<ProgressionNodeState, { line: string; knot: string; wash: string }> = {
  COMPLETED: { line: "rgb(var(--gold) / 0.85)", knot: "rgb(var(--accent) / 0.85)", wash: "rgb(var(--gold) / 0.1)" },
  CURRENT: { line: "rgb(var(--accent) / 0.8)", knot: "rgb(var(--gold) / 0.9)", wash: "rgb(var(--accent) / 0.08)" },
  AVAILABLE: { line: "rgb(var(--accent) / 0.6)", knot: "rgb(var(--gold) / 0.75)", wash: "rgb(var(--accent) / 0.05)" },
  LOCKED: { line: "rgb(var(--text-faint) / 0.55)", knot: "rgb(var(--text-faint) / 0.6)", wash: "transparent" },
};

export function ProgressionReviewMedallion({ state }: { state: ProgressionNodeState }) {
  const tone = TONE[state];
  return (
    <svg
      className="progression-review-medallion pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-testid="progression-review-medallion"
      data-medallion-state={state}
    >
      <path d={ROSETTE} fill={tone.wash} stroke={tone.line} strokeWidth={1.3} />
      <circle cx={C} cy={C} r={31.5} stroke={tone.line} strokeWidth={1.7} strokeDasharray="0.1 3.4" />
      <circle cx={C} cy={C} r={29} stroke={tone.line} strokeOpacity={0.45} strokeWidth={0.8} />
      {RUYI.map(({ x, y, angle }) => (
        <g key={angle} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <path d="M0 2.6C-2.6 2.6-3.4-0.4-1.6-1.8C-0.8-2.5 0.8-2.5 1.6-1.8C3.4-0.4 2.6 2.6 0 2.6Z" fill={tone.knot} />
          <path d="M-1.6-1.8C-2.8-3-4.4-2.2-4-0.8M1.6-1.8C2.8-3 4.4-2.2 4-0.8" stroke={tone.knot} strokeWidth={0.9} />
        </g>
      ))}
      {DIAMONDS.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y - 2}L${x + 2} ${y}L${x} ${y + 2}L${x - 2} ${y}Z`} fill={tone.knot} />
      ))}
    </svg>
  );
}
