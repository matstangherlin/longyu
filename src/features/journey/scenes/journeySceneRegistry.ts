/**
 * RC2.3.13R.3.2.3 — Journey scene library (atmosphere layer).
 *
 * Sixteen hand-authored `.svg` scenes (12 core + 4 owner-requested landmarks) live in `src/assets/journey/scenes/`.
 * This registry is the only door into them: the renderer refuses any file
 * that is not listed here, and `validate:journey-scene-registry` refuses any
 * production scene file that is not registered.
 *
 * Presentation only — nothing here knows lessons, unlock, mastery or XP.
 * Learning > Progression > Atmosphere; scenes are always decorative.
 */

export const JOURNEY_SCENE_PACK_VERSION = 1;

/** Directory every registered scene file lives in (repo-relative). */
export const JOURNEY_SCENE_DIR = "src/assets/journey/scenes";

/** Every scene shares one canvas so lanes can reserve a fixed 4:3 box. */
export const JOURNEY_SCENE_VIEWBOX = "0 0 320 240";

/** Per-file budget after authoring (bytes). Target 8–25 KB; hard cap 35 KB. */
export const JOURNEY_SCENE_MAX_BYTES = 35 * 1024;

export const JOURNEY_SCENE_IDS = [
  "moon-gate",
  "lantern-street",
  "bamboo-mountains",
  "tea-table",
  "market",
  "high-speed-rail",
  "modern-city",
  "courtyard",
  "river-bridge",
  "brush-seal",
  "night-street",
  "digital-life",
  // Owner-requested cultural landmarks (optional slots 13–16; library max 16).
  "buddhist-temple",
  "sun-wukong",
  "lucky-cat",
  "great-wall",
] as const;

export type JourneySceneId = (typeof JOURNEY_SCENE_IDS)[number];

/**
 * Visual mood of a stretch of the Journey. It evolves with progression but
 * never names a level (no "Beginner", no "HSK") — pedagogy stays authoritative.
 */
export const JOURNEY_STORY_REGIONS = ["FOUNDATION", "EVERYDAY", "REAL_LIFE", "MODERN"] as const;
export type JourneyStoryRegion = (typeof JOURNEY_STORY_REGIONS)[number];

export type JourneySceneSide = "left" | "right";

export type JourneyScene = {
  id: JourneySceneId;
  /** File name inside JOURNEY_SCENE_DIR. */
  file: string;
  /** Repo-relative path of the asset. */
  src: string;
  /** What the scene stands for (docs + inventory; never rendered as text). */
  semanticTheme: string;
  /** Story regions where the scene may appear (storytelling contract). */
  regions: readonly JourneyStoryRegion[];
  preferredSide?: JourneySceneSide;
  /** Visual weight of the drawing: sparse scenes carry fewer filled shapes. */
  density: "sparse" | "normal";
};

function scene(
  id: JourneySceneId,
  semanticTheme: string,
  regions: readonly JourneyStoryRegion[],
  density: JourneyScene["density"],
): JourneyScene {
  const file = `journey-${id}.svg`;
  return { id, file, src: `${JOURNEY_SCENE_DIR}/${file}`, semanticTheme, regions, density };
}

export const JOURNEY_SCENES: readonly JourneyScene[] = [
  scene("moon-gate", "entering a new world", ["FOUNDATION", "EVERYDAY"], "normal"),
  scene("lantern-street", "everyday social Mandarin", ["EVERYDAY", "REAL_LIFE", "MODERN"], "normal"),
  scene("bamboo-mountains", "progress, calm, continued learning (Guilin karst, bamboo)", ["FOUNDATION", "EVERYDAY", "REAL_LIFE"], "normal"),
  scene("tea-table", "hospitality and everyday communication", ["FOUNDATION", "EVERYDAY", "REAL_LIFE"], "normal"),
  scene("market", "shopping, asking, practical language", ["REAL_LIFE"], "normal"),
  scene("high-speed-rail", "travel and modern China", ["REAL_LIFE", "MODERN"], "sparse"),
  scene("modern-city", "modern and advanced Mandarin use", ["MODERN"], "normal"),
  scene("courtyard", "family, home, relationships", ["FOUNDATION", "EVERYDAY", "REAL_LIFE"], "normal"),
  scene("river-bridge", "journey continuity and movement", ["FOUNDATION", "EVERYDAY", "REAL_LIFE"], "sparse"),
  scene("brush-seal", "Hanzi and written Mandarin", ["FOUNDATION", "EVERYDAY"], "sparse"),
  scene("night-street", "social situations, real-world Mandarin", ["REAL_LIFE", "MODERN"], "normal"),
  scene("digital-life", "digital, real modern use", ["REAL_LIFE", "MODERN"], "normal"),
  scene("buddhist-temple", "Buddhist temple and pagoda: heritage, calm practice", ["FOUNDATION", "EVERYDAY", "REAL_LIFE"], "normal"),
  scene("sun-wukong", "Sun Wukong, the Monkey King of Journey to the West", ["EVERYDAY", "REAL_LIFE", "MODERN"], "normal"),
  scene("lucky-cat", "zhaocai mao lucky cat with a Chinese cash coin: shops, money, numbers", ["REAL_LIFE", "MODERN"], "normal"),
  scene("great-wall", "the Great Wall over mountain ridges: building, history, travel", ["REAL_LIFE", "MODERN"], "sparse"),
];

export const JOURNEY_SCENE_BY_ID: ReadonlyMap<JourneySceneId, JourneyScene> = new Map(
  JOURNEY_SCENES.map((entry) => [entry.id, entry]),
);

export function isJourneySceneId(value: string): value is JourneySceneId {
  return (JOURNEY_SCENE_IDS as readonly string[]).includes(value);
}

export function journeySceneFileFor(id: JourneySceneId): string {
  return JOURNEY_SCENE_BY_ID.get(id)?.file ?? `journey-${id}.svg`;
}
