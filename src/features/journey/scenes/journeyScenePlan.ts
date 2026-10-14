/**
 * RC2.3.13R.3.2.3 — deterministic Journey scene arrangement.
 *
 * Same curriculum → same arrangement, on every device and every render:
 * no randomness, no clock, no progress state, no expansion state. The plan is
 * computed from the canonical Journey order and the static inline nodes that
 * sit between lessons, so a scene never jumps when the learner expands a
 * module, finishes a lesson or reloads the page.
 *
 * Cadence counts progression "stops" (AULA bubbles, lesson nodes, trainer
 * cards, culture moments) so a scene lands roughly every 4 stops whatever the
 * module's density. Scenes attach only to lesson-node rows and live in the
 * side lanes; the center lane (nodes, labels, CTA) is never touched.
 *
 * Presentation only — this module never reads unlock, completion, XP,
 * mastery, Culture gates or persistence.
 */
import { JOURNEY } from "../../../data/journey";
import { instructionNodesBeforeTopic, instructionNodesWithinTopic } from "../../../data/coreInstructionSlots";
import { auxiliaryJourneyNodesAfterTopic } from "../../../data/journeyOrchestrator";
import { cultureMomentsAfterTopic } from "../../../data/journeyCultureMoments";
import {
  JOURNEY_SCENE_BY_ID,
  JOURNEY_SCENE_PACK_VERSION,
  type JourneySceneId,
  type JourneySceneSide,
  type JourneyStoryRegion,
} from "./journeySceneRegistry";

export const JOURNEY_SCENE_CADENCE = {
  /** First scene of a module once the path has shown this many stops. */
  firstAtStop: 2,
  /** Minimum progression stops between two scenes of the same module. */
  minStopsBetween: 4,
  /** Never on two consecutive lesson rows. */
  minLessonsBetween: 2,
} as const;

/** Small ornaments keep this many lesson rows away from any scene. */
export const JOURNEY_ORNAMENT_SCENE_CLEARANCE = 2;
/** Minimum lesson rows between two Journey ornaments. */
export const JOURNEY_ORNAMENT_MIN_GAP = 4;

/** Visual storytelling: the mood follows the phase, never the learner's level label. */
export const JOURNEY_PHASE_REGION: Readonly<Record<string, JourneyStoryRegion>> = {
  p1: "FOUNDATION",
  p2: "FOUNDATION",
  p3: "EVERYDAY",
  p4: "FOUNDATION",
  p5: "REAL_LIFE",
  p6: "REAL_LIFE",
  p7: "MODERN",
};

/** Fallback pools when a module has no authored sequence. */
export const JOURNEY_REGION_SCENES: Readonly<Record<JourneyStoryRegion, readonly JourneySceneId[]>> = {
  FOUNDATION: ["moon-gate", "buddhist-temple", "bamboo-mountains", "brush-seal", "river-bridge"],
  EVERYDAY: ["lantern-street", "tea-table", "courtyard", "sun-wukong"],
  REAL_LIFE: ["market", "lucky-cat", "high-speed-rail", "great-wall", "courtyard"],
  MODERN: ["modern-city", "digital-life", "night-street", "great-wall"],
};

/**
 * Semantic mapping per module (lesson cluster). Each module cycles through its
 * own sequence; every id must be allowed in the module's story region. Where
 * the Journey already carries a related Culture moment, the scene sits beside
 * it (Sun Wukong after l9, Journey to the West stories in u7-1).
 */
export const JOURNEY_UNIT_SCENES: Readonly<Record<string, readonly JourneySceneId[]>> = {
  // FOUNDATION — entering, temple calm, sound, the written mark.
  "u1-1": ["moon-gate", "buddhist-temple", "bamboo-mountains", "brush-seal"],
  "u1-2": ["tea-table", "river-bridge"],
  // Tones: karst ridges as contours, river waves, temple bells.
  "u2-1": ["bamboo-mountains", "river-bridge", "buddhist-temple"],
  "u2-2": ["river-bridge", "bamboo-mountains"],
  // EVERYDAY — who I am (Sun Wukong culture moment sits after l9), first reading.
  "u3-1": ["sun-wukong", "courtyard", "tea-table"],
  "u3-2": ["brush-seal", "lantern-street"],
  // FOUNDATION (Hànzì) — components, roofs, brushwork, temple architecture.
  "u4-1": ["brush-seal", "buddhist-temple", "moon-gate", "courtyard", "bamboo-mountains"],
  "u4-2": ["brush-seal", "river-bridge"],
  // REAL_LIFE — 林/森 forest compounds and building, numbers and money, family, food and shopping.
  "u5-0": ["bamboo-mountains", "great-wall", "river-bridge", "high-speed-rail"],
  "u5-1": ["lucky-cat"],
  "u5-2": ["high-speed-rail"],
  "u6-1": ["courtyard", "tea-table"],
  "u6-2": ["market", "lucky-cat", "tea-table", "night-street", "digital-life", "lantern-street"],
  // MODERN — stories (Journey to the West), immersion in modern China.
  "u7-1": ["sun-wukong", "night-street"],
  "u7-2": ["modern-city", "great-wall", "digital-life", "high-speed-rail"],
};

export type JourneyPlanUnit = {
  id: string;
  phaseId: string;
  lessonIds: readonly string[];
};

/** Static progression stops around a lesson node (excluding the node itself). */
export type JourneyLessonStops = { before: number; after: number };

export type JourneySceneSlot = {
  kind: "scene";
  /** Global position in canonical Journey order — drives the side. */
  ordinal: number;
  unitId: string;
  phaseId: string;
  region: JourneyStoryRegion;
  lessonId: string;
  lessonIndex: number;
  /** Progression stop (1-based, within the module) of the lesson row. */
  stop: number;
  side: JourneySceneSide;
  sceneId: JourneySceneId;
};

export type JourneyOrnamentSlot = {
  kind: "ornament";
  ordinal: number;
  unitId: string;
  lessonId: string;
  lessonIndex: number;
  side: JourneySceneSide;
  /** Index into ORNAMENT_MOTIFS (symbolicOrnaments.tsx). */
  motifIndex: number;
};

export type JourneyLaneDecor = {
  scene?: JourneySceneSlot;
  ornament?: JourneyOrnamentSlot;
};

export type JourneyScenePlan = {
  version: number;
  scenes: readonly JourneySceneSlot[];
  ornaments: readonly JourneyOrnamentSlot[];
  byLesson: ReadonlyMap<string, JourneyLaneDecor>;
  /** Stable digest of the arrangement (inventory drift check). */
  digest: string;
};

export function sideForOrdinal(ordinal: number): JourneySceneSide {
  return ordinal % 2 === 0 ? "left" : "right";
}

export function regionForPhase(phaseId: string): JourneyStoryRegion {
  return JOURNEY_PHASE_REGION[phaseId] ?? "EVERYDAY";
}

function sequenceForUnit(unitId: string, region: JourneyStoryRegion): readonly JourneySceneId[] {
  const authored = JOURNEY_UNIT_SCENES[unitId];
  return authored && authored.length > 0 ? authored : JOURNEY_REGION_SCENES[region];
}

/** FNV-1a — tiny, dependency-free, identical in browser and Node. */
function digestOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function planJourneyScenes(
  units: readonly JourneyPlanUnit[],
  stopsFor: (lessonId: string) => JourneyLessonStops,
): JourneyScenePlan {
  const scenes: JourneySceneSlot[] = [];
  const ornaments: JourneyOrnamentSlot[] = [];
  let previousScene: JourneySceneId | undefined;

  for (const unit of units) {
    const region = regionForPhase(unit.phaseId);
    const sequence = sequenceForUnit(unit.id, region);
    const unitScenes: JourneySceneSlot[] = [];
    let stop = 0;
    let lastStop = Number.NEGATIVE_INFINITY;
    let lastLesson = Number.NEGATIVE_INFINITY;

    unit.lessonIds.forEach((lessonId, lessonIndex) => {
      const stops = stopsFor(lessonId);
      stop += Math.max(0, stops.before) + 1;
      const due =
        unitScenes.length === 0
          ? stop >= JOURNEY_SCENE_CADENCE.firstAtStop
          : stop - lastStop >= JOURNEY_SCENE_CADENCE.minStopsBetween &&
            lessonIndex - lastLesson >= JOURNEY_SCENE_CADENCE.minLessonsBetween;
      if (due) {
        let pick = unitScenes.length;
        let sceneId = sequence[pick % sequence.length];
        // Never the same scene twice in a row across the Journey.
        if (sceneId === previousScene) {
          const pool = sequence.length > 1 ? sequence : JOURNEY_REGION_SCENES[region];
          pick += 1;
          sceneId = pool[pick % pool.length];
          if (sceneId === previousScene) sceneId = pool[(pick + 1) % pool.length];
        }
        const ordinal = scenes.length;
        const slot: JourneySceneSlot = {
          kind: "scene",
          ordinal,
          unitId: unit.id,
          phaseId: unit.phaseId,
          region,
          lessonId,
          lessonIndex,
          stop,
          side: sideForOrdinal(ordinal),
          sceneId,
        };
        scenes.push(slot);
        unitScenes.push(slot);
        previousScene = sceneId;
        lastStop = stop;
        lastLesson = lessonIndex;
      }
      stop += Math.max(0, stops.after);
    });

    // Small ornaments: kept, but only where no scene shares the cluster, and
    // on the lane opposite the scene they follow (hierarchy: scene > ornament).
    let lastOrnament = Number.NEGATIVE_INFINITY;
    unit.lessonIds.forEach((lessonId, lessonIndex) => {
      if (lessonIndex < 2) return;
      const nearest = unitScenes.reduce(
        (min, slot) => Math.min(min, Math.abs(slot.lessonIndex - lessonIndex)),
        Number.POSITIVE_INFINITY,
      );
      if (nearest < JOURNEY_ORNAMENT_SCENE_CLEARANCE) return;
      if (lessonIndex - lastOrnament < JOURNEY_ORNAMENT_MIN_GAP) return;
      const before = [...unitScenes].reverse().find((slot) => slot.lessonIndex < lessonIndex);
      const after = unitScenes.find((slot) => slot.lessonIndex > lessonIndex);
      const anchor = before ?? after;
      const side: JourneySceneSide = anchor
        ? anchor.side === "left"
          ? "right"
          : "left"
        : sideForOrdinal(ornaments.length);
      ornaments.push({
        kind: "ornament",
        ordinal: ornaments.length,
        unitId: unit.id,
        lessonId,
        lessonIndex,
        side,
        motifIndex: ornaments.length,
      });
      lastOrnament = lessonIndex;
    });
  }

  const byLesson = new Map<string, JourneyLaneDecor>();
  for (const slot of scenes) byLesson.set(slot.lessonId, { ...byLesson.get(slot.lessonId), scene: slot });
  for (const slot of ornaments) byLesson.set(slot.lessonId, { ...byLesson.get(slot.lessonId), ornament: slot });

  const digest = digestOf(
    [
      `v${JOURNEY_SCENE_PACK_VERSION}`,
      ...scenes.map((s) => `${s.unitId}:${s.lessonId}:${s.side}:${s.sceneId}`),
      ...ornaments.map((o) => `${o.unitId}:${o.lessonId}:${o.side}:${o.motifIndex}`),
    ].join("|"),
  );

  return { version: JOURNEY_SCENE_PACK_VERSION, scenes, ornaments, byLesson, digest };
}

/** Canonical Journey order (tiers → phases → modules → lessons). */
export function journeyPlanUnits(): JourneyPlanUnit[] {
  return JOURNEY.flatMap((phase) =>
    phase.units.map((unit) => ({
      id: unit.id,
      phaseId: phase.id,
      lessonIds: unit.lessons.map((lesson) => lesson.id),
    })),
  );
}

/**
 * Static inline stops only. Published capsule nodes (async catalog) and
 * learner-dependent markers (Culture gate, recall) are excluded on purpose:
 * counting them would let the arrangement change after load.
 */
export function canonicalLessonStops(lessonId: string): JourneyLessonStops {
  return {
    before: instructionNodesBeforeTopic(lessonId).length,
    after:
      instructionNodesWithinTopic(lessonId).length +
      auxiliaryJourneyNodesAfterTopic(lessonId).length +
      cultureMomentsAfterTopic(lessonId).length,
  };
}

let cached: JourneyScenePlan | null = null;

export function getJourneyScenePlan(): JourneyScenePlan {
  if (!cached) cached = planJourneyScenes(journeyPlanUnits(), canonicalLessonStops);
  return cached;
}

export function journeyLaneDecorFor(lessonId: string): JourneyLaneDecor | undefined {
  return getJourneyScenePlan().byLesson.get(lessonId);
}

/** Every scene the plan uses must exist in the registry (defensive). */
export function planUsesOnlyRegisteredScenes(plan: JourneyScenePlan): boolean {
  return plan.scenes.every((slot) => JOURNEY_SCENE_BY_ID.has(slot.sceneId));
}
