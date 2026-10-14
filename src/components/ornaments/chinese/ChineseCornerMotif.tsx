import { ChineseOrnament, type OrnamentTone } from "./ChineseOrnament";
import type { ChineseOrnamentId, ChineseOrnamentIntensity, OrnamentSurface } from "./chineseOrnamentRegistry";

export type ChineseCornerMotifName = "xiangyun" | "ruyi" | "plum" | "bamboo" | "lattice" | "huiwen";
export type ChineseCornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNER: Record<ChineseCornerMotifName, ChineseOrnamentId> = {
  xiangyun: "xiangyun-corner",
  ruyi: "ruyi-corner",
  plum: "plum-corner",
  bamboo: "bamboo-corner",
  lattice: "lattice-frame",
  huiwen: "huiwen-frame",
};

/**
 * RC2.3.13R.3.2.4 — one corner accent where a full frame would be too much.
 * Absolutely placed inside a `relative isolate` host, under its content.
 */
export function ChineseCornerMotif({
  motif,
  corner = "top-right",
  intensity = "subtle",
  tone = "accent",
  surface,
}: {
  motif: ChineseCornerMotifName;
  corner?: ChineseCornerPosition;
  intensity?: ChineseOrnamentIntensity;
  tone?: OrnamentTone;
  surface: OrnamentSurface;
}) {
  return (
    <span
      className="lyo lyo-corner-motif"
      aria-hidden="true"
      data-ornament-surface={surface}
      data-ornament-corner={motif}
      data-intensity={intensity}
      data-tone={tone}
    >
      <ChineseOrnament id={CORNER[motif]} className={`lyo-corner lyo-at-${corner}`} />
    </span>
  );
}
