/**
 * Teaching-topic slices for pedagogical localization.
 *
 * Identity is programmatic:
 *   ALL_LESSONS.filter(isTopicMasteryLesson).slice(start, end)
 *
 * Const arrays below MUST match that slice. Validators fail on drift.
 * One topic = one lesson.id. M1–M4 are mastery passes of that id.
 *
 * First 20 keep PT-text overlay as the compatibility resolver (V4.8.2).
 * Topics 21–80 also have stable loc ids (V4.8.3 / V4.8.5). Topic 81+ may still fall back.
 */

import {
  FIRST_20_TEACHING_TOPIC_IDS,
  isFirst20TeachingTopic,
} from "./first20";

export {
  FIRST_20_TEACHING_TOPIC_IDS,
  isFirst20TeachingTopic,
  FIRST_20_PHASE_IDS,
  FIRST_20_UNIT_IDS,
} from "./first20";
export type { First20TeachingTopicId } from "./first20";

/** ALL_LESSONS.filter(isTopicMasteryLesson).slice(20, 50) */
export const TOPICS_21_50_TEACHING_TOPIC_IDS = [
  "p2-comparar-tom-2-3",
  "p2-tons-xiexie",
  "l5",
  "l6",
  "l7",
  "l8",
  "l8-compare",
  "l8-shi",
  "p2-sons-brasileiros",
  "p2-numeros-1-5",
  "l9",
  "l9-tudo-bem",
  "l9-qual-nome",
  "l10",
  "p3-wobuhui-shuo-zhongwen",
  "p3-qing-zai-shuo-yibian",
  "l11",
  "l11-falo-pouco",
  "l12",
  "l13",
  "l13-dialogo-ola",
  "l13-dialogo-nome",
  "p3-ordem-das-palavras",
  "p3-nomes-da-frase",
  "l14",
  "p4-num-123",
  "p4-num-45",
  "p4-num-678",
  "p4-num-910",
  "p4-char-mu",
] as const;

export type Topics2150TeachingTopicId = (typeof TOPICS_21_50_TEACHING_TOPIC_IDS)[number];

const TOPICS_21_50_SET = new Set<string>(TOPICS_21_50_TEACHING_TOPIC_IDS);

export function isTopics2150TeachingTopic(lessonId: string | null | undefined): boolean {
  return Boolean(lessonId && TOPICS_21_50_SET.has(lessonId));
}

/** ALL_LESSONS.filter(isTopicMasteryLesson).slice(50, 80) */
export const TOPICS_51_80_TEACHING_TOPIC_IDS = [
  "p4-char-ren",
  "p4-char-kou",
  "p4-char-ri",
  "p4-char-yue",
  "p4-char-shan",
  "p4-char-shui",
  "p4-char-tian",
  "p4-char-huo",
  "p4-char-da",
  "p4-char-xiao",
  "p4-char-zhong",
  "p4-char-bu",
  "p4-char-shi",
  "p4-char-wo",
  "p4-char-ni",
  "l14-numeros-visuais",
  "l14-pecas-natureza",
  "l14-frase-minima",
  "l15",
  "l16",
  "l17",
  "l18",
  "p5-mu-mu-lin",
  "p5-mu-mu-mu-sen",
  "p5-ri-yue-ming",
  "p5-ren-mu-xiu",
  "p5-nv-zi-hao",
  "p5-ren-ren-cong",
  "p5-ren-ren-ren-zhong",
  "p5-nv-ma-mae",
] as const;

export type Topics5180TeachingTopicId = (typeof TOPICS_51_80_TEACHING_TOPIC_IDS)[number];

const TOPICS_51_80_SET = new Set<string>(TOPICS_51_80_TEACHING_TOPIC_IDS);

export function isTopics5180TeachingTopic(lessonId: string | null | undefined): boolean {
  return Boolean(lessonId && TOPICS_51_80_SET.has(lessonId));
}

export const TOPICS_21_80_TEACHING_TOPIC_IDS = [
  ...TOPICS_21_50_TEACHING_TOPIC_IDS,
  ...TOPICS_51_80_TEACHING_TOPIC_IDS,
] as const;

/** Fail-closed English overlay applies to teaching topics 1–80. */
export const FAIL_CLOSED_TEACHING_TOPIC_COUNT = 80;

export const TOPICS_1_50_TEACHING_TOPIC_IDS = [
  ...FIRST_20_TEACHING_TOPIC_IDS,
  ...TOPICS_21_50_TEACHING_TOPIC_IDS,
] as const;

export const TOPICS_1_80_TEACHING_TOPIC_IDS = [
  ...TOPICS_1_50_TEACHING_TOPIC_IDS,
  ...TOPICS_51_80_TEACHING_TOPIC_IDS,
] as const;

export function isTopics150TeachingTopic(lessonId: string | null | undefined): boolean {
  return isFirst20TeachingTopic(lessonId) || isTopics2150TeachingTopic(lessonId);
}

export function isTopics180TeachingTopic(lessonId: string | null | undefined): boolean {
  return isTopics150TeachingTopic(lessonId) || isTopics5180TeachingTopic(lessonId);
}

/**
 * Stable loc id for a localizable field on a planned pass step.
 * Canonical Chinese fields are never given loc ids.
 *
 * Example: p.l9.m1.s03.instruction
 */
export function pedagogyLocId(
  topicId: string,
  pass: number,
  stepIndex: number,
  field: string
): string {
  const nn = String(stepIndex + 1).padStart(2, "0");
  return `p.${topicId}.m${pass}.s${nn}.${field}`;
}

export function pedagogyMetaLocId(topicId: string, field: string): string {
  return `p.${topicId}.meta.${field}`;
}
