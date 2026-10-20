import type { ScenicMotionProfile } from "../../../lib/motion/visualMotionProfiles";
import type { JourneySceneId } from "./journeySceneRegistry";

export { SCENIC_MOTION_PROFILES, type ScenicMotionProfile } from "../../../lib/motion/visualMotionProfiles";

/**
 * RC2.3.13R.3.2.6 — Chinese Living Canvas: what moves in each scene, and why.
 *
 * A scene never bobs as a whole. Each one names a semantic profile (the
 * subject that is alive: lanterns sway, steam rises, the train passes) and the
 * parts that carry it. Parts are `<g class="scene-…">` wrappers inside the
 * bundled SVG; app CSS animates them only while the scene owns an ambient
 * slot, so offscreen, hidden-tab and reduced-motion scenes stay the authored
 * drawing. Deterministic: the phase comes from the scene's ordinal.
 */

/** Part classes an SVG may carry (`<g class="scene-<part>">`). */
export const SCENE_PARTS = [
  "cloud",
  "leaf",
  "lantern",
  "steam",
  "water",
  "light",
  "accent",
  "flag",
  "bird",
  "train",
  "boat",
  "paw",
  "ink",
  "cloth",
  "float",
  "star",
  "blossom",
] as const;

export type ScenePart = (typeof SCENE_PARTS)[number];

/**
 * The valid still frame of every part — what the learner sees whenever the
 * part is not moving (no slot, offscreen, hidden tab, reduced motion, or a
 * slot lost mid-loop). Every loop starts and ends here.
 */
export const SCENE_PART_NEUTRAL: Readonly<Record<ScenePart, string>> = {
  cloud: "authored position, full opacity",
  leaf: "authored stem, upright",
  lantern: "hangs vertical from its cord",
  steam: "authored wisps, soft opacity",
  water: "authored ripples",
  light: "authored glow",
  accent: "authored position",
  flag: "authored flag, unfurled",
  bird: "authored position",
  train: "authored position on the rails",
  boat: "authored position on the water",
  paw: "authored raised paw",
  ink: "stroke fully drawn",
  cloth: "authored tassel, hanging",
  float: "authored figure on the cloud",
  star: "authored star",
  blossom: "authored blossoms",
};

export type SceneMotionIntensity = "subtle" | "normal" | "hero";

export type SceneMotionSpec = {
  profile: ScenicMotionProfile;
  intensity: SceneMotionIntensity;
  /** Looping parts; they run only while the scene owns an ambient slot. */
  loops: readonly ScenePart[];
  /** One-shot parts, played once when the scene first enters the screen. */
  oneShot: readonly ScenePart[];
};

/** One subject per scene, chosen from what the drawing shows. */
export const SCENE_MOTION: Readonly<Record<JourneySceneId, SceneMotionSpec>> = {
  "lantern-street": { profile: "lantern-sway", intensity: "subtle", loops: ["lantern", "cloud"], oneShot: [] },
  "tea-table": { profile: "steam", intensity: "subtle", loops: ["steam", "blossom", "cloud"], oneShot: [] },
  "bamboo-mountains": { profile: "sway", intensity: "subtle", loops: ["leaf", "water", "cloud"], oneShot: [] },
  "high-speed-rail": { profile: "train-pass", intensity: "subtle", loops: ["train", "light", "cloud"], oneShot: [] },
  "market": { profile: "lantern-sway", intensity: "subtle", loops: ["lantern", "cloud"], oneShot: [] },
  "moon-gate": { profile: "sway", intensity: "subtle", loops: ["leaf", "cloud"], oneShot: [] },
  "modern-city": { profile: "city-glow", intensity: "subtle", loops: ["light", "train", "cloud"], oneShot: [] },
  "courtyard": { profile: "lantern-sway", intensity: "subtle", loops: ["lantern", "leaf", "cloud"], oneShot: [] },
  "river-bridge": { profile: "water", intensity: "subtle", loops: ["water", "light", "boat", "cloud"], oneShot: [] },
  "brush-seal": { profile: "ink-reveal", intensity: "subtle", loops: ["cloth", "cloud"], oneShot: ["ink"] },
  "night-street": { profile: "city-glow", intensity: "subtle", loops: ["star", "lantern"], oneShot: [] },
  "digital-life": { profile: "city-glow", intensity: "subtle", loops: ["light", "accent"], oneShot: [] },
  "buddhist-temple": { profile: "steam", intensity: "subtle", loops: ["steam", "light", "cloud"], oneShot: [] },
  "sun-wukong": { profile: "float", intensity: "subtle", loops: ["float", "light", "cloud"], oneShot: [] },
  "lucky-cat": { profile: "sway", intensity: "subtle", loops: ["paw", "lantern", "cloud"], oneShot: [] },
  "great-wall": { profile: "cloud-drift", intensity: "subtle", loops: ["cloud", "flag", "bird"], oneShot: [] },
};

export function sceneMotionFor(id: JourneySceneId): SceneMotionSpec {
  return SCENE_MOTION[id];
}
