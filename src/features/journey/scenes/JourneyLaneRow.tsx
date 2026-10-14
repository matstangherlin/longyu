import type { ReactNode } from "react";
import { ORNAMENT_MOTIFS, SymbolicOrnament } from "../../../components/progression/symbolicOrnaments";
import { JourneyScene } from "./JourneyScene";
import type { JourneyLaneDecor, JourneyOrnamentSlot } from "./journeyScenePlan";

/**
 * Three lanes around one lesson-node row:
 *
 *   LEFT SCENE LANE · CENTER PROGRESSION LANE · RIGHT SCENE LANE
 *
 * The side tracks are equal (`minmax(0, 1fr)`), so the center lane — node,
 * label, CTA — sits on exactly the same axis as undecorated rows. Lanes are
 * grid cells: a scene can shrink with its lane but can never cross into the
 * center, and the row never scrolls sideways.
 */
export function JourneyLaneRow({
  lessonId,
  decor,
  children,
}: {
  lessonId: string;
  decor: JourneyLaneDecor;
  children: ReactNode;
}) {
  const { scene, ornament } = decor;
  const laneContent = (side: "left" | "right") => {
    if (scene?.side === side) {
      return <JourneyScene sceneId={scene.sceneId} side={side} ordinal={scene.ordinal} />;
    }
    if (!scene && ornament?.side === side) return <JourneyLaneOrnament slot={ornament} />;
    return null;
  };

  return (
    <div
      className="journey-lane-row"
      data-testid="journey-lane-row"
      data-journey-lane-row={lessonId}
      data-lane-scene={scene?.sceneId}
      data-lane-scene-side={scene?.side}
      data-lane-ornament-side={!scene && ornament ? ornament.side : undefined}
    >
      <div className="journey-lane journey-lane-left" aria-hidden="true" data-journey-lane="left">
        {laneContent("left")}
      </div>
      <div className="journey-lane-center" data-journey-lane="center">
        {children}
      </div>
      <div className="journey-lane journey-lane-right" aria-hidden="true" data-journey-lane="right">
        {laneContent("right")}
      </div>
    </div>
  );
}

/** Small ornament, lane-anchored so it can never land beside a scene. */
function JourneyLaneOrnament({ slot }: { slot: JourneyOrnamentSlot }) {
  const motif = ORNAMENT_MOTIFS[slot.motifIndex % ORNAMENT_MOTIFS.length];
  return (
    <span
      className="journey-lane-ornament pointer-events-none"
      aria-hidden="true"
      data-journey-lane-ornament={motif}
      data-ornament-side={slot.side}
    >
      <SymbolicOrnament motif={motif} />
    </span>
  );
}
