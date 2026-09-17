/**
 * RC1 launch freeze. Curriculum identity is the Journey fingerprint, not a
 * feature-branch SHA.
 *
 * V4.11A.2 (Culture Atlas flagship wave) updated `cultureNative.ts` +
 * `cultureLessons.ts` (CURRICULUM_SOURCES) with hub-only culture lessons.
 * Core Mandarin lesson count (134) and teaching topics (113) unchanged.
 * Fingerprint advanced: 7c054f2255e7 → 943a8f9fb720.
 */
export const CURRICULUM_FREEZE = "RC1" as const;
export const RC_BASE_FINGERPRINT = "943a8f9fb720";
export const RC1_EXPECTED_LESSON_COUNT = 134;
export const RC1_EXPECTED_TEACHING_TOPIC_COUNT = 113;
export const RC1_MERGE_SHA = "c4441b68ae2388027d72e3af748417ef7caf2bb6";
