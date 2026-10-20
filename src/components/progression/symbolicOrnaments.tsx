import { useRef } from "react";
import { useAmbientMotion } from "../../lib/motion/ambientBudget";
import type { ScenicMotionProfile } from "../../lib/motion/visualMotionProfiles";
/**
 * RC2.3.13R.3.2.1 — decorative Chinese-inspired ornaments beside the
 * progression axis. Not interactive, not announced, not lesson content.
 */

export const ORNAMENT_MOTIFS = [
  "lantern",
  "fan",
  "bamboo",
  "cloud",
  "moon-gate",
  "seal",
  "blossom",
  "knot",
] as const;

export type OrnamentMotif = (typeof ORNAMENT_MOTIFS)[number];

/**
 * RC2.3.13R.3.2.6 — what lives in each motif. Loops run only while the
 * ornament owns an ambient slot; "still" motifs (lattice-like geometry, the
 * knot, the seal) only have the one-shot entrance.
 */
export const ORNAMENT_MOTION_PROFILE: Readonly<Record<OrnamentMotif, ScenicMotionProfile>> = {
  lantern: "lantern-sway",
  fan: "sway",
  bamboo: "sway",
  cloud: "cloud-drift",
  "moon-gate": "still",
  seal: "still",
  blossom: "blossom-breathe",
  knot: "still",
};
export type OrnamentSide = "left" | "right";
export type OrnamentDensity = "culture" | "journey";

export type OrnamentSlot = {
  afterIndex: number;
  side: OrnamentSide;
  motif: OrnamentMotif;
};

/** One ornament every few nodes, alternating sides. Journey is sparser. */
export function ornamentPlan(
  nodeCount: number,
  density: OrnamentDensity = "culture",
  /** RC2.3.13R.3.2.6 — where the motif cycle starts (per Culture topic), so topics do not all open on the lantern. */
  motifOffset = 0,
): OrnamentSlot[] {
  const start = ((Math.trunc(motifOffset) % ORNAMENT_MOTIFS.length) + ORNAMENT_MOTIFS.length) % ORNAMENT_MOTIFS.length;
  const step = density === "journey" ? 4 : 3;
  const n = Math.max(0, nodeCount);
  if (n === 0) return [];
  const slots: OrnamentSlot[] = [];
  for (let i = Math.min(step - 1, n - 1); slots.length < 8; i += step) {
    const afterIndex = Math.min(i, n - 1);
    if (slots.some((slot) => slot.afterIndex === afterIndex)) break;
    slots.push({
      afterIndex,
      side: slots.length % 2 === 0 ? "left" : "right",
      motif: ORNAMENT_MOTIFS[(slots.length + start) % ORNAMENT_MOTIFS.length],
    });
    if (i >= n - 1) break;
  }
  if (n >= 2 && !slots.some((slot) => slot.side === "right")) {
    slots.push({
      afterIndex: n - 1,
      side: "right",
      motif: ORNAMENT_MOTIFS[(1 + start) % ORNAMENT_MOTIFS.length],
    });
  }
  return slots;
}

function motifPath(motif: OrnamentMotif) {
  switch (motif) {
    case "lantern":
      return (
        <>
          <path d="M16 3v3" />
          <path d="M11 6h10l-1.2 12.2a4 4 0 0 1-4 3.6h-.6a4 4 0 0 1-4-3.6L11 6Z" fill="currentColor" fillOpacity={0.14} />
          <path d="M13 11h6M13.4 15h5.2" />
          <path d="M16 21.8V25M14.4 25h3.2M15 25l-.4 3.2M17 25l.4 3.2" />
        </>
      );
    case "fan":
      return (
        <>
          <path d="M6 18c2-8 6-12 10-12s8 4 10 12" />
          <path d="M8.5 16.5c1.6-4.2 3.8-6.5 7.5-6.5s5.9 2.3 7.5 6.5" />
          <path d="M16 6v12" />
          <path d="M12 20h8" />
        </>
      );
    case "bamboo":
      return (
        <>
          <path d="M12 3v18M20 5v16" />
          <path d="M10 8h4M10 13h4M18 9h4M18 14h4" />
          <path d="M12 8c2 1 4 1 6 0M12 13c2 1 4 1 6 0" />
        </>
      );
    case "cloud":
      // Xiangyun 祥云: a scroll that curls back on itself, not a weather cloud.
      return (
        <>
          <path d="M5 21h21" />
          <path d="M8.5 21c-2.3 0-3.4-2.7-1.6-4.1 1.4-1.1 3.5-.2 3.5 1.6 0 .9-.7 1.5-1.4 1.5" />
          <path d="M12 21c-.6-4.2 1.9-8 6-8 3.1 0 5.6 2.4 5.6 5.4 0 1.5-1.2 2.6-2.6 2.6-1.3 0-2.2-.9-2.2-2.1 0-1 .8-1.8 1.8-1.8" />
        </>
      );
    case "moon-gate":
      return (
        <>
          <circle cx="16" cy="14" r="7" />
          <path d="M9 21h14M12 21v3M20 21v3" />
        </>
      );
    case "seal":
      return (
        <>
          <rect x="7" y="7" width="18" height="18" rx="2" />
          <path d="M12 12h8M16 12v8M12 20h8" />
        </>
      );
    case "blossom":
      // Plum 梅: five round petals around a gold-dot heart.
      return (
        <>
          <circle cx="16" cy="10.6" r="3.2" />
          <circle cx="21.1" cy="14.3" r="3.2" />
          <circle cx="19.2" cy="20.4" r="3.2" />
          <circle cx="12.8" cy="20.4" r="3.2" />
          <circle cx="10.9" cy="14.3" r="3.2" />
          <circle cx="16" cy="16" r="1.4" fill="currentColor" />
        </>
      );
    case "knot":
      // Chinese knot 中国结: a lattice diamond on its cord, with a tassel.
      return (
        <>
          <path d="M16 2.5v3" />
          <path d="M16 5.5l5.5 5.5-5.5 5.5-5.5-5.5Z" />
          <path d="M16 8.6l2.4 2.4-2.4 2.4-2.4-2.4Z" />
          <path d="M16 16.5v3M14 19.5h4M14.6 19.5l-.6 9M17.4 19.5l.6 9M16 19.5v9" />
        </>
      );
    default:
      return null;
  }
}

export function SymbolicOrnament({ motif }: { motif: OrnamentMotif }) {
  // RC2.3.13R.3.2.4 — the drift loop joins the ambient budget (lowest priority).
  // RC2.3.13R.3.2.6 — the slot now moves the motif's own subject (orn-part).
  const ref = useRef<SVGSVGElement>(null);
  const profile = ORNAMENT_MOTION_PROFILE[motif];
  // A "still" motif (seal, knot, moon gate) never loops, so it never takes one of the two ornament slots.
  useAmbientMotion(ref, "ornament", profile !== "still");
  return (
    <svg
      ref={ref}
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="symbolic-ornament text-accent/55 motion-safe:animate-[ornament-drift_7s_var(--ease-standard)_infinite] motion-reduce:animate-none"
      aria-hidden
      data-symbolic-ornament={motif}
      data-ornament-profile={profile}
    >
      <g className="orn-part">{motifPath(motif)}</g>
    </svg>
  );
}

export function SymbolicOrnamentRail({
  nodeCount,
  density = "culture",
  motifOffset = 0,
}: {
  nodeCount: number;
  density?: OrnamentDensity;
  motifOffset?: number;
}) {
  const slots = ornamentPlan(nodeCount, density, motifOffset);
  if (slots.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-y-2 left-0 right-0"
      aria-hidden
      data-testid="symbolic-ornament-rail"
      data-symbolic-ornament-rail="true"
      data-ornament-density={density}
      data-ornament-count={slots.length}
    >
      {slots.map((slot, index) => (
        <div
          key={`${slot.side}-${slot.motif}-${index}`}
          className={["absolute", slot.side === "left" ? "left-0" : "right-0"].join(" ")}
          style={{ top: `${6 + (slot.afterIndex / Math.max(1, nodeCount)) * 80}%` }}
          data-ornament-side={slot.side}
          data-ornament-motif={slot.motif}
          data-ornament-index={index}
        >
          <SymbolicOrnament motif={slot.motif} />
        </div>
      ))}
    </div>
  );
}
