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
export type OrnamentSide = "left" | "right";
export type OrnamentDensity = "culture" | "journey";

export type OrnamentSlot = {
  afterIndex: number;
  side: OrnamentSide;
  motif: OrnamentMotif;
};

/** One ornament every few nodes, alternating sides. Journey is sparser. */
export function ornamentPlan(nodeCount: number, density: OrnamentDensity = "culture"): OrnamentSlot[] {
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
      motif: ORNAMENT_MOTIFS[slots.length % ORNAMENT_MOTIFS.length],
    });
    if (i >= n - 1) break;
  }
  if (n >= 2 && !slots.some((slot) => slot.side === "right")) {
    slots.push({
      afterIndex: n - 1,
      side: "right",
      motif: ORNAMENT_MOTIFS[1],
    });
  }
  return slots;
}

function motifPath(motif: OrnamentMotif) {
  switch (motif) {
    case "lantern":
      return (
        <>
          <path d="M16 4v2" />
          <path d="M11 6h10l-1.2 12.2a4 4 0 0 1-4 3.6h-.6a4 4 0 0 1-4-3.6L11 6Z" />
          <path d="M13 11h6M13.4 15h5.2" />
          <path d="M16 21.8V24" />
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
      return (
        <>
          <path d="M8 18h13a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5-1.5A4 4 0 0 0 8 18Z" />
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
      return (
        <>
          <circle cx="16" cy="16" r="1.6" />
          <path d="M16 8c1.6 2.2 1.6 3.8 0 5-1.6-1.2-1.6-2.8 0-5Z" />
          <path d="M16 24c-1.6-2.2-1.6-3.8 0-5 1.6 1.2 1.6 2.8 0 5Z" />
          <path d="M8 16c2.2-1.6 3.8-1.6 5 0-1.2 1.6-2.8 1.6-5 0Z" />
          <path d="M24 16c-2.2 1.6-3.8 1.6-5 0 1.2-1.6 2.8-1.6 5 0Z" />
        </>
      );
    case "knot":
      return (
        <>
          <path d="M12 8c6 0 8 4 4 8s-2 8 4 8" />
          <path d="M20 8c-6 0-8 4-4 8s2 8-4 8" />
        </>
      );
    default:
      return null;
  }
}

export function SymbolicOrnament({ motif }: { motif: OrnamentMotif }) {
  return (
    <svg
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
    >
      {motifPath(motif)}
    </svg>
  );
}

export function SymbolicOrnamentRail({
  nodeCount,
  density = "culture",
}: {
  nodeCount: number;
  density?: OrnamentDensity;
}) {
  const slots = ornamentPlan(nodeCount, density);
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
