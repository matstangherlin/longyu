import { ChineseOrnament, type OrnamentTone } from "./ChineseOrnament";
import type { ChineseOrnamentId, ChineseOrnamentIntensity, OrnamentSurface } from "./chineseOrnamentRegistry";

export type ChineseDividerMotif = "xiangyun" | "knot" | "lattice" | "huiwen";

const DIVIDER: Record<ChineseDividerMotif, ChineseOrnamentId> = {
  xiangyun: "xiangyun-divider",
  knot: "knot-divider",
  lattice: "lattice-divider",
  huiwen: "huiwen-strip",
};

/**
 * RC2.3.13R.3.2.4 — a section boundary lighter than a frame.
 * Its height is reserved by CSS before paint (no layout shift); the drawing
 * keeps its aspect ratio and shrinks inside narrow columns.
 */
export function ChineseOrnamentalDivider({
  motif,
  intensity = "subtle",
  tone = "accent",
  surface,
  className,
}: {
  motif: ChineseDividerMotif;
  intensity?: ChineseOrnamentIntensity;
  tone?: OrnamentTone;
  surface: OrnamentSurface;
  className?: string;
}) {
  return (
    <span
      className={className ? `lyo lyo-divider ${className}` : "lyo lyo-divider"}
      aria-hidden="true"
      data-ornament-surface={surface}
      data-ornament-divider={motif}
      data-intensity={intensity}
      data-tone={tone}
    >
      <ChineseOrnament id={DIVIDER[motif]} className="lyo-divider-glyph" />
    </span>
  );
}
