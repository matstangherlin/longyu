/**
 * Curriculum identity is the Journey fingerprint, not a feature-branch SHA.
 *
 * V4.11A.3 (China History Essentials) closed the Culture Atlas:
 * CultureItems 24 → 30, Culture Native Lessons 24 → 30, History 0 → 6.
 * Journey Culture nodes stay at 20 (history wave is hub-only).
 * Core Mandarin lesson count (134) and teaching topics (113) unchanged.
 *
 * Fingerprint advanced: 943a8f9fb720 → 516692632525 because
 * `cultureNative.ts` + `cultureLessons.ts` are CURRICULUM_SOURCES.
 * Do not restore the prior fingerprint.
 *
 * CURRICULUM_FREEZE = RC2_CONTENT_FREEZE marks content closed for RC2.
 * CONTENT_FREEZE_SHA ≠ RELEASE_CANDIDATE_SHA — the latter stays empty
 * until a real deploy candidate exists.
 *
 * Supersedes any older doc that treated 40be45d as a current RC2 candidate.
 */
export const CURRICULUM_FREEZE = "RC2_CONTENT_FREEZE" as const;
/**
 * After RC2.1.2: no new product features until public beta GO/NO-GO.
 * Allowed: P0/P1 blockers, security, a11y, auth/sync, devices, release tooling, QA fixes.
 * Forbidden: new lessons, CultureItems, exercise modes, AI, gamification, commercial launches.
 */
export const FEATURE_FREEZE = "PUBLIC_BETA" as const;
export const RC_BASE_FINGERPRINT = "516692632525";
export const RC1_EXPECTED_LESSON_COUNT = 134;
export const RC1_EXPECTED_TEACHING_TOPIC_COUNT = 113;
export const RC1_MERGE_SHA = "c4441b68ae2388027d72e3af748417ef7caf2bb6";

/** Culture Atlas counts frozen at V4.11A.3 closure. */
export const RC2_EXPECTED_CULTURE_ITEMS = 30;
export const RC2_EXPECTED_CULTURE_NATIVE_LESSONS = 30;
export const RC2_EXPECTED_JOURNEY_CULTURE_NODES = 20;
export const RC2_EXPECTED_HISTORY_ITEMS = 6;

/**
 * Tip SHA of the V4.11A.3 content freeze. Stamped after the freeze commit lands.
 * Distinct from RELEASE_CANDIDATE_SHA (deploy candidate — still empty).
 */
export const RC2_CONTENT_FREEZE_SHA = "24ba129d79e61124c7d6dd3aaa3756eb9a6adf40";

/** Intentionally empty until a real public-beta deploy candidate exists. */
export const RELEASE_CANDIDATE_SHA = "";
