import { ALL_LESSONS } from "./journey";
import { PINYIN_FOUNDATION_CAPSULE } from "./lessonCapsules";
import { FOUNDATION_TARGET_IDS } from "./pedagogicalSpine";
import { JOURNEY_THEMES, themeForTopic } from "./journeyThemes";
import { isTopicMasteryLesson } from "./topicMastery";

export type JourneyNodeType =
  | "CORE_LESSON"
  | "LESSON_CAPSULE"
  | "PRACTICE"
  | "REVIEW"
  | "BLITZ"
  | "TONE_TRAINER"
  | "PINYIN_PRACTICE"
  | "HANZI_BUILDER"
  | "CONVERSATION"
  | "CHECKPOINT";

export type JourneyNodePriority = "CORE" | "RECOMMENDED" | "OPTIONAL";

export interface JourneyNode {
  id: string;
  type: JourneyNodeType;
  priority: JourneyNodePriority;
  sourceThemeId: string;
  sourceId?: string;
  afterTopicId?: string;
  maxQuestions?: number;
  timeLimitSeconds?: number;
  allowedKnowledgeTargetIds?: string[];
  affectsCoreMastery: boolean;
}

const coreLessonNodes: JourneyNode[] = ALL_LESSONS.map((lesson) => ({
  id: `core:${lesson.id}`,
  type: "CORE_LESSON",
  priority: "CORE",
  sourceThemeId: themeForTopic(lesson.id)?.id ?? `theme:${lesson.unitId}`,
  sourceId: lesson.id,
  affectsCoreMastery: true,
}));

export const PINYIN_CAPSULE_NODE: JourneyNode = {
  id: "node:capsule:pinyin-foundation:v1",
  type: "LESSON_CAPSULE",
  priority: "CORE",
  sourceThemeId: "theme:u1-1",
  sourceId: PINYIN_FOUNDATION_CAPSULE.id,
  afterTopicId: "p1-o-que-e-mandarim",
  allowedKnowledgeTargetIds: PINYIN_FOUNDATION_CAPSULE.knowledgeTargets,
  affectsCoreMastery: false,
};

export const FOUNDATION_BLITZ_NODE: JourneyNode = {
  id: "booster:foundations-blitz:v1",
  type: "BLITZ",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "mandarin-blitz",
  afterTopicId: "p1-o-que-e-mandarim",
  timeLimitSeconds: 45,
  maxQuestions: 8,
  allowedKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.nihao, FOUNDATION_TARGET_IDS.ni, FOUNDATION_TARGET_IDS.hao],
  affectsCoreMastery: false,
};

export const JOURNEY_NODES: JourneyNode[] = [
  ...coreLessonNodes,
  PINYIN_CAPSULE_NODE,
  FOUNDATION_BLITZ_NODE,
];

export function auxiliaryJourneyNodesForTheme(themeId: string): JourneyNode[] {
  return JOURNEY_NODES.filter((node) => node.sourceThemeId === themeId && node.type !== "CORE_LESSON");
}

export function topicsWithoutTheme(): string[] {
  const themed = new Set(JOURNEY_THEMES.flatMap((theme) => theme.topicIds));
  return ALL_LESSONS.filter((lesson) => isTopicMasteryLesson(lesson) && !themed.has(lesson.id)).map((lesson) => lesson.id);
}
