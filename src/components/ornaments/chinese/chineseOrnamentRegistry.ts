/**
 * RC2.3.13R.3.2.4 — Chinese ornamental "embroidery" family.
 *
 * Inspired motifs (not historical reproductions): xiangyun clouds, huiwen
 * meander, ruyi heads, window lattice, plum blossom, Chinese knot, seal
 * medallion, roof eave and bamboo. Every asset is a local, text-free,
 * transparent `.svg` drawn with role classes (`lyo-*`) that resolve to the
 * real Longyu tokens — Longyu first, Chinese second.
 *
 * Ornaments are reserved for meaningful surfaces (milestones, Victory,
 * Culture hero, one Home card) — never every card, button or list row.
 */

export const CHINESE_ORNAMENT_PACK_VERSION = 1;
export const CHINESE_ORNAMENT_DIR = "src/assets/ornaments/chinese";
export const CHINESE_ORNAMENT_MAX_BYTES = 8 * 1024;

export const CHINESE_ORNAMENT_IDS = [
  "xiangyun-corner",
  "xiangyun-divider",
  "huiwen-frame",
  "huiwen-strip",
  "ruyi-corner",
  "lattice-frame",
  "lattice-divider",
  "plum-corner",
  "plum-blossom",
  "knot-divider",
  "seal-medallion",
  "roof-eave",
  "bamboo-corner",
] as const;

export type ChineseOrnamentId = (typeof CHINESE_ORNAMENT_IDS)[number];

export type ChineseOrnamentMotif =
  | "xiangyun"
  | "huiwen"
  | "ruyi"
  | "lattice"
  | "plum"
  | "knot"
  | "seal"
  | "eave"
  | "bamboo";

/** How an asset is placed: corners are mirrored per corner, never stretched. */
export type ChineseOrnamentKind = "corner" | "divider" | "strip" | "medallion" | "particle" | "accent";

export type ChineseOrnamentIntensity = "subtle" | "medium" | "milestone";

/** The closed list of surfaces that may carry an ornament. */
export const ORNAMENT_SURFACES = [
  "journey-milestone",
  "review-milestone",
  "victory",
  "culture-topic-hero",
  "culture-root-header",
  "home-continue",
  "review-summary",
  "review-header",
  "qa-gallery",
] as const;

export type OrnamentSurface = (typeof ORNAMENT_SURFACES)[number];

/** Surfaces that must never be ornamented (validated against the source). */
export const ORNAMENT_FORBIDDEN_SURFACES = [
  "answer-option",
  "settings",
  "form-field",
  "account",
  "list-row",
  "button",
  "modal",
] as const;

/** At most this many ornament placements render per surface instance. */
export const ORNAMENT_DENSITY: Record<OrnamentSurface, number> = {
  "journey-milestone": 1,
  "review-milestone": 1,
  victory: 2,
  "culture-topic-hero": 2,
  "culture-root-header": 1,
  "home-continue": 1,
  "review-summary": 1,
  "review-header": 1,
  "qa-gallery": 13,
};

/** Opacity bands per intensity (background / surface / milestone). */
export const ORNAMENT_OPACITY: Record<ChineseOrnamentIntensity, number> = {
  subtle: 0.16,
  medium: 0.28,
  milestone: 0.55,
};

export type ChineseOrnamentEntry = {
  id: ChineseOrnamentId;
  file: `ornament-${ChineseOrnamentId}.svg`;
  motif: ChineseOrnamentMotif;
  kind: ChineseOrnamentKind;
  /** viewBox width / height — rendering keeps this ratio (no deformation). */
  aspect: number;
  surfaces: readonly OrnamentSurface[];
  intensities: readonly ChineseOrnamentIntensity[];
};

function ornament(
  id: ChineseOrnamentId,
  motif: ChineseOrnamentMotif,
  kind: ChineseOrnamentKind,
  aspect: number,
  surfaces: readonly OrnamentSurface[],
  intensities: readonly ChineseOrnamentIntensity[],
): ChineseOrnamentEntry {
  return { id, file: `ornament-${id}.svg`, motif, kind, aspect, surfaces, intensities };
}

const ALL: readonly ChineseOrnamentIntensity[] = ["subtle", "medium", "milestone"];

export const CHINESE_ORNAMENTS: readonly ChineseOrnamentEntry[] = [
  ornament("xiangyun-corner", "xiangyun", "corner", 1, ["culture-topic-hero", "victory", "qa-gallery"], ALL),
  ornament("xiangyun-divider", "xiangyun", "divider", 10, ["culture-topic-hero", "victory", "review-summary", "qa-gallery"], ALL),
  ornament("huiwen-frame", "huiwen", "corner", 1, ["journey-milestone", "qa-gallery"], ALL),
  ornament("huiwen-strip", "huiwen", "strip", 9.6, ["journey-milestone", "qa-gallery"], ["subtle", "medium"]),
  ornament("ruyi-corner", "ruyi", "corner", 1, ["review-header", "victory", "qa-gallery"], ALL),
  ornament("lattice-frame", "lattice", "corner", 1, ["journey-milestone", "qa-gallery"], ALL),
  ornament("lattice-divider", "lattice", "divider", 12, ["culture-root-header", "qa-gallery"], ["subtle", "medium"]),
  ornament("plum-corner", "plum", "corner", 1, ["home-continue", "culture-topic-hero", "qa-gallery"], ["subtle", "medium"]),
  ornament("plum-blossom", "plum", "particle", 1, ["victory", "qa-gallery"], ["medium", "milestone"]),
  ornament("knot-divider", "knot", "divider", 7.5, ["review-summary", "review-milestone", "victory", "qa-gallery"], ALL),
  ornament("seal-medallion", "seal", "medallion", 1, ["victory", "review-milestone", "qa-gallery"], ALL),
  ornament("roof-eave", "eave", "accent", 4, ["culture-topic-hero", "qa-gallery"], ["subtle", "medium"]),
  ornament("bamboo-corner", "bamboo", "corner", 0.5, ["culture-topic-hero", "qa-gallery"], ["subtle", "medium"]),
];

export const CHINESE_ORNAMENT_BY_ID: ReadonlyMap<ChineseOrnamentId, ChineseOrnamentEntry> = new Map(
  CHINESE_ORNAMENTS.map((entry) => [entry.id, entry]),
);

/** Frame motifs map to the corner asset drawn for them. */
export const FRAME_CORNER: Record<"xiangyun" | "huiwen" | "lattice" | "ruyi" | "plum" | "seal", ChineseOrnamentId> = {
  xiangyun: "xiangyun-corner",
  huiwen: "huiwen-frame",
  lattice: "lattice-frame",
  ruyi: "ruyi-corner",
  plum: "plum-corner",
  seal: "seal-medallion",
};
