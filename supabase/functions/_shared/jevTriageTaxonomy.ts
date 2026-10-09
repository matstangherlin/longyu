/**
 * JEV Wave 2 — canonical beta feedback taxonomy (advisory only).
 * Pure: no Deno / network. Learner runtime must stay OFF.
 */

export const AI_POLICY_VERSION = "feedback-v2" as const;

export const BETA_KINDS = ["bug", "content_error", "confusion", "suggestion", "praise"] as const;
export type BetaKind = (typeof BETA_KINDS)[number];

export const BETA_AREAS = [
  "lesson",
  "audio_speech",
  "hanzi",
  "culture",
  "mastery",
  "review",
  "journey",
  "sync",
  "auth_account",
  "ui_navigation",
  "performance",
  "payments",
  "social",
  "other",
] as const;
export type BetaArea = (typeof BETA_AREAS)[number];

/** Map legacy v1 area labels onto v2. */
export function normalizeArea(raw: string | null | undefined): BetaArea {
  const v = String(raw ?? "").trim().toLowerCase();
  if ((BETA_AREAS as readonly string[]).includes(v)) return v as BetaArea;
  if (v === "ui") return "ui_navigation";
  if (v === "account") return "auth_account";
  if (v === "audio" || v === "speech") return "audio_speech";
  return "other";
}

export function normalizeKind(raw: string | null | undefined): BetaKind | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if ((BETA_KINDS as readonly string[]).includes(v)) return v as BetaKind;
  return null;
}

export const KIND_CRITERIA: Record<BetaKind, string> = {
  bug: "Something in the app is broken or behaves incorrectly",
  content_error: "Wrong translation, pinyin, tone, audio, Hànzì, Culture or lesson content",
  confusion: "Learner did not understand an exercise, Mastery, Journey or how the app works",
  suggestion: "Idea or request for a new feature or improvement",
  praise: "Positive feedback with no problem reported",
};

export const AREA_CRITERIA: Record<BetaArea, string> = {
  lesson: "Lessons, exercises, teaching steps",
  audio_speech: "Audio playback, TTS or speech recognition",
  hanzi: "Hànzì writing, stroke practice or character memory",
  culture: "Culture moments, native lessons, history",
  mastery: "Seu Domínio / Personal Mastery, practice recommendations",
  review: "Review rounds or spaced practice",
  journey: "Journey map, path, unlocks",
  sync: "Cloud sync, progress save/load, multi-device",
  auth_account: "Login, signup, OAuth, profile, delete account",
  ui_navigation: "Layout, navigation, buttons, visual problems",
  performance: "Slowness, freezing, crashes, memory, loading",
  payments: "Subscription, Pro, checkout or billing",
  social: "Leagues, friends, ranking or referrals",
  other: "Does not fit the other areas",
};

export const SEVERITY_SCORE_CRITERIA = [
  "No problem or purely cosmetic / praise",
  "Annoying but the learner can continue",
  "Blocks an exercise, lesson or core flow with a workaround",
  "Blocks using the app, or loses progress, data, money, or exposes another account",
] as const;
