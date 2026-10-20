/**
 * RC2.3.13R.3.2.6 — the one typed vocabulary of ambient motion profiles,
 * shared by Journey scenes (sceneMotionProfiles.ts) and the Culture / lane
 * ornaments (symbolicOrnaments.tsx). A profile names what is alive in a
 * drawing; "still" means the drawing never loops (an entrance at most).
 */
export const SCENIC_MOTION_PROFILES = [
  "float",
  "sway",
  "cloud-drift",
  "lantern-sway",
  "steam",
  "water",
  "train-pass",
  "city-glow",
  "blossom-breathe",
  "ink-reveal",
  "still",
] as const;

export type ScenicMotionProfile = (typeof SCENIC_MOTION_PROFILES)[number];
