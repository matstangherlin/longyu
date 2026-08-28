/**
 * First 20 teaching topics (Topic Mastery nodes, not 20 sessions).
 * Identity: ALL_LESSONS.filter(isTopicMasteryLesson).slice(0, 20)
 */

export const FIRST_20_TEACHING_TOPIC_IDS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
  "p1-engine-2-lab",
  "l1",
  "l2",
  "l3",
  "l4",
  "p1-ate-logo",
  "p1-primeira-conversa",
  "p1-qingwen-cortesia",
  "p2-ma-primeiro-tom",
  "p2-ma-segundo-tom",
  "p3-wohenhao",
  "p2-ma-terceiro-tom",
  "p2-ma-quarto-tom",
  "p2-tons-nihao",
  "p2-comparar-tom-1-4",
] as const;

export type First20TeachingTopicId = (typeof FIRST_20_TEACHING_TOPIC_IDS)[number];

const FIRST_20_SET = new Set<string>(FIRST_20_TEACHING_TOPIC_IDS);

export function isFirst20TeachingTopic(lessonId: string | null | undefined): boolean {
  return Boolean(lessonId && FIRST_20_SET.has(lessonId));
}

export const FIRST_20_PHASE_IDS = ["p1"] as const;
export const FIRST_20_UNIT_IDS = ["u1-1", "u1-2", "u2-1"] as const;
