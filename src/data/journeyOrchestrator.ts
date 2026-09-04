import { ALL_LESSONS } from "./journey";
import { PINYIN_FOUNDATION_CAPSULE } from "./lessonCapsules";
import { FOUNDATION_TARGET_IDS, type KnowledgeStage } from "./pedagogicalSpine";
import type { MandarinTone } from "./toneTrainer";
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
export type JourneyBoosterMode = "CONTOUR_INTRO" | "TONE_NUMBER" | "GUIDED" | "CURRENT_QUEUE" | "SHORT_KNOWN_INPUT";
export type JourneyRewardPolicy = "ENGINE_DEFAULT" | "NO_CORE_MASTERY" | "NO_SPEED_MASTERY";

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
  requiredKnowledgeTargetIds?: string[];
  /** Grupos OR: cada grupo precisa de pelo menos um alvo satisfeito. */
  anyOfKnowledgeTargetIds?: string[][];
  /** Nodes auxiliares que precisam estar concluídos antes deste. */
  requiresNodeIds?: string[];
  /**
   * Estar neste tópico dispensa os requisitos de ESTÁGIO do node — não o node
   * inteiro. Repertório, grupos OR e pré-requisitos continuam valendo.
   */
  stagesWaivedWhenCurrentTopicId?: string;
  minimumKnowledgeStages?: Partial<Record<string, KnowledgeStage>>;
  mode?: JourneyBoosterMode;
  allowedTones?: MandarinTone[];
  rewardPolicy?: JourneyRewardPolicy;
  returnToJourney?: boolean;
  minimumKnownChunks?: number;
  minimumKnownPatterns?: number;
  minimumRecognitionRate?: number;
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
  // Era `firstTopicMastery >= 4 || currentId === "p1-o-que-e-pinyin"`.
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.mandarin],
  minimumKnowledgeStages: { [FOUNDATION_TARGET_IDS.mandarin]: "PRODUCED" },
  stagesWaivedWhenCurrentTopicId: "p1-o-que-e-pinyin",
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
  // Era `foundationReady && blitzReady`: base do primeiro tópico, 你好 no
  // repertório e ao menos um dos dois caracteres. O hatch cobre só a base.
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.mandarin, FOUNDATION_TARGET_IDS.nihao],
  anyOfKnowledgeTargetIds: [[FOUNDATION_TARGET_IDS.ni, FOUNDATION_TARGET_IDS.hao]],
  minimumKnowledgeStages: {
    [FOUNDATION_TARGET_IDS.mandarin]: "PRODUCED",
    [FOUNDATION_TARGET_IDS.nihao]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.ni]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.hao]: "RECOGNIZED",
  },
  stagesWaivedWhenCurrentTopicId: "p1-o-que-e-pinyin",
  affectsCoreMastery: false,
};

export const TONE_CONTOUR_INTRO_NODE: JourneyNode = {
  id: "booster:tone-contour-1-3:v1",
  type: "TONE_TRAINER",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "tone-all-isolated",
  afterTopicId: "p1-o-que-e-tom",
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.tone1, FOUNDATION_TARGET_IDS.tone3],
  // Era `toneMastery >= 1` no painel: M1 = GUIDED. A V4.9.1 declarava NOTICED,
  // mais frouxo do que o código realmente aplicava.
  minimumKnowledgeStages: {
    [FOUNDATION_TARGET_IDS.tone1]: "GUIDED",
    [FOUNDATION_TARGET_IDS.tone3]: "GUIDED",
  },
  allowedKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.tone1, FOUNDATION_TARGET_IDS.tone3],
  mode: "CONTOUR_INTRO",
  allowedTones: [1, 3],
  maxQuestions: 6,
  rewardPolicy: "NO_CORE_MASTERY",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const TONE_NUMBER_NODE: JourneyNode = {
  id: "booster:tone-number-1-4:v1",
  type: "TONE_TRAINER",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "tone-all-isolated",
  afterTopicId: "p1-o-que-e-tom",
  requiredKnowledgeTargetIds: [
    FOUNDATION_TARGET_IDS.tone1,
    FOUNDATION_TARGET_IDS.tone2,
    FOUNDATION_TARGET_IDS.tone3,
    FOUNDATION_TARGET_IDS.tone4,
  ],
  // Era `toneMastery >= 2` no painel: M2 = RECOGNIZED.
  minimumKnowledgeStages: {
    [FOUNDATION_TARGET_IDS.tone1]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.tone2]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.tone3]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.tone4]: "RECOGNIZED",
  },
  allowedKnowledgeTargetIds: [
    FOUNDATION_TARGET_IDS.tone1,
    FOUNDATION_TARGET_IDS.tone2,
    FOUNDATION_TARGET_IDS.tone3,
    FOUNDATION_TARGET_IDS.tone4,
  ],
  mode: "TONE_NUMBER",
  allowedTones: [1, 2, 3, 4],
  maxQuestions: 8,
  rewardPolicy: "NO_CORE_MASTERY",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const PINYIN_PRACTICE_NODE: JourneyNode = {
  id: "booster:pinyin-practice:v1",
  type: "PINYIN_PRACTICE",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "pinyin-lab",
  afterTopicId: "p1-o-que-e-pinyin",
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.pinyin],
  minimumKnowledgeStages: { [FOUNDATION_TARGET_IDS.pinyin]: "GUIDED" },
  // Era `capsuleComplete && pinyinMastery >= 1`.
  requiresNodeIds: [PINYIN_CAPSULE_NODE.id],
  mode: "GUIDED",
  rewardPolicy: "ENGINE_DEFAULT",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const HANZI_BUILDER_NODE: JourneyNode = {
  id: "booster:hanzi-builder-foundations:v1",
  type: "HANZI_BUILDER",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "hanzi-builder",
  afterTopicId: "p1-primeiros-hanzi",
  // Era `hanziMastery >= 1 && learnedChars.includes("mu")`. `components` sai de
  // p1-primeiros-hanzi (o mastery que o painel lia) e `char:mu` do repertório.
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.hanzi, FOUNDATION_TARGET_IDS.components, "char:mu"],
  minimumKnowledgeStages: {
    [FOUNDATION_TARGET_IDS.hanzi]: "GUIDED",
    [FOUNDATION_TARGET_IDS.components]: "GUIDED",
    "char:mu": "RECOGNIZED",
  },
  allowedKnowledgeTargetIds: ["char:mu", "char:ren"],
  mode: "GUIDED",
  rewardPolicy: "ENGINE_DEFAULT",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const FIRST_CONVERSATION_NODE: JourneyNode = {
  id: "booster:first-conversation:v1",
  type: "CONVERSATION",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "primeiro-cumprimento",
  afterTopicId: "p1-o-que-e-mandarim",
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.nihao, FOUNDATION_TARGET_IDS.greetingIntent],
  // Era `firstTopicMastery >= 2 && learnedChunks.includes("nihao")`: M2 =
  // RECOGNIZED para a intenção, e 你好 no repertório = RECOGNIZED.
  minimumKnowledgeStages: {
    [FOUNDATION_TARGET_IDS.nihao]: "RECOGNIZED",
    [FOUNDATION_TARGET_IDS.greetingIntent]: "RECOGNIZED",
  },
  allowedKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.nihao],
  mode: "GUIDED",
  rewardPolicy: "ENGINE_DEFAULT",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const JOURNEY_REVIEW_NODE: JourneyNode = {
  id: "booster:shared-srs-review:v1",
  type: "REVIEW",
  priority: "RECOMMENDED",
  sourceThemeId: "theme:u1-1",
  sourceId: "current-srs-queue",
  mode: "CURRENT_QUEUE",
  rewardPolicy: "ENGINE_DEFAULT",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const IMMERSION_READINESS_NODE: JourneyNode = {
  id: "booster:short-immersion:v1",
  type: "PRACTICE",
  priority: "OPTIONAL",
  sourceThemeId: "theme:u1-1",
  sourceId: "immersion",
  mode: "SHORT_KNOWN_INPUT",
  // Era `chunks >= 8 && patterns >= 2 && firstTopicMastery >= 4`.
  requiredKnowledgeTargetIds: [FOUNDATION_TARGET_IDS.mandarin],
  minimumKnowledgeStages: { [FOUNDATION_TARGET_IDS.mandarin]: "PRODUCED" },
  minimumKnownChunks: 8,
  minimumKnownPatterns: 2,
  minimumRecognitionRate: 0.7,
  rewardPolicy: "ENGINE_DEFAULT",
  returnToJourney: true,
  affectsCoreMastery: false,
};

export const JOURNEY_NODES: JourneyNode[] = [
  ...coreLessonNodes,
  PINYIN_CAPSULE_NODE,
  FOUNDATION_BLITZ_NODE,
  TONE_CONTOUR_INTRO_NODE,
  TONE_NUMBER_NODE,
  PINYIN_PRACTICE_NODE,
  HANZI_BUILDER_NODE,
  FIRST_CONVERSATION_NODE,
  JOURNEY_REVIEW_NODE,
  IMMERSION_READINESS_NODE,
];

/**
 * Rota canônica de um node auxiliar.
 *
 * O painel da V4.9.1 tinha estas URLs escritas à mão em nove lugares. Com os
 * nodes agora aparecendo também inline ao longo da Jornada, duas listas de
 * rotas divergiriam na primeira mudança — então a rota passa a sair do node.
 */
export function routeForJourneyNode(node: JourneyNode): string {
  const query = `journeyNode=${encodeURIComponent(node.id)}`;
  switch (node.type) {
    case "LESSON_CAPSULE":
      return `/jornada/capsula/${encodeURIComponent(node.sourceId ?? "")}`;
    case "BLITZ":
      return `/arcade/blitz?${query}`;
    case "TONE_TRAINER":
      return `/som?${query}`;
    case "PINYIN_PRACTICE":
      return `/pinyin?${query}`;
    case "HANZI_BUILDER":
      return `/hanzi?char=mu&${query}`;
    case "CONVERSATION":
      return `/jornada/reforco/${encodeURIComponent(node.id)}`;
    case "REVIEW":
      return `/revisao?${query}`;
    case "PRACTICE":
      return `/imersao?${query}`;
    default:
      return `/jornada`;
  }
}

/**
 * Nodes auxiliares ancorados logo depois de um tópico, na ordem declarada.
 * É o que permite intercalá-los na trilha em vez de concentrá-los num painel.
 */
export function auxiliaryJourneyNodesAfterTopic(topicId: string): JourneyNode[] {
  return JOURNEY_NODES.filter((node) => node.type !== "CORE_LESSON" && node.afterTopicId === topicId);
}

export function getJourneyNode(id: string | null | undefined): JourneyNode | undefined {
  return id ? JOURNEY_NODES.find((node) => node.id === id) : undefined;
}

export function auxiliaryJourneyNodesForTheme(themeId: string): JourneyNode[] {
  return JOURNEY_NODES.filter((node) => node.sourceThemeId === themeId && node.type !== "CORE_LESSON");
}

export function topicsWithoutTheme(): string[] {
  const themed = new Set(JOURNEY_THEMES.flatMap((theme) => theme.topicIds));
  return ALL_LESSONS.filter((lesson) => isTopicMasteryLesson(lesson) && !themed.has(lesson.id)).map((lesson) => lesson.id);
}
