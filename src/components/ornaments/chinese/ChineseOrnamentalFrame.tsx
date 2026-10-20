import { ChineseOrnament, type OrnamentTone } from "./ChineseOrnament";
import {
  FRAME_CORNER,
  type ChineseOrnamentIntensity,
  type OrnamentSurface,
} from "./chineseOrnamentRegistry";

export type ChineseFrameMotif = keyof typeof FRAME_CORNER;

/**
 * RC2.3.13R.3.2.6 — frame levels (docs/ux/chinese-frame-system.md).
 * "embroidered" is the R.3.2.4 stitched frame. "heritage" and "ceremony"
 * draw a solid gilt inner rule whose corner hooks are part of the rule
 * (回纹 key-fret / ruyi cloud), so the corner glyphs are not rendered.
 */
export type ChineseFrameLevel = "embroidered" | "heritage" | "ceremony";

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

/**
 * RC2.3.13R.3.2.4 — embroidered frame for a meaningful surface.
 *
 * An overlay, not a wrapper: rendered as the first child of a host that is
 * `relative isolate`, it sits under the host's content (z-index -1 inside the
 * isolated host), never changes the host's size, never takes taps and is
 * hidden from assistive tech. Four mirrored corner motifs + paired edge
 * threads with a stitched secondary line. `animated` draws the stitch once
 * on entrance (never a loop; off under reduced motion).
 */
export function ChineseOrnamentalFrame({
  motif,
  intensity = "medium",
  tone = "accent",
  corners = true,
  animated = false,
  surface,
  level = "embroidered",
}: {
  motif: ChineseFrameMotif;
  intensity?: ChineseOrnamentIntensity;
  tone?: OrnamentTone;
  corners?: boolean;
  animated?: boolean;
  surface: OrnamentSurface;
  level?: ChineseFrameLevel;
}) {
  const corner = FRAME_CORNER[motif];
  const structural = level !== "embroidered";
  return (
    <span
      className="lyo lyo-frame"
      aria-hidden="true"
      data-ornament-surface={surface}
      data-ornament-frame={motif}
      data-intensity={intensity}
      data-tone={tone}
      data-animate={animated ? "once" : undefined}
      data-frame-level={structural ? level : undefined}
    >
      <span className="lyo-edge lyo-edge-top" />
      <span className="lyo-edge lyo-edge-bottom" />
      <span className="lyo-edge lyo-edge-left" />
      <span className="lyo-edge lyo-edge-right" />
      {corners && !structural
        ? CORNERS.map((position) => (
            <ChineseOrnament key={position} id={corner} className={`lyo-corner lyo-at-${position}`} />
          ))
        : null}
    </span>
  );
}
