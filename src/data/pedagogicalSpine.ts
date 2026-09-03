import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { ALL_LESSONS, type LessonStep } from "./journey";

export type KnowledgeStage =
  | "UNSEEN"
  | "EXPOSED"
  | "NOTICED"
  | "GUIDED"
  | "RECOGNIZED"
  | "RECALLED"
  | "PRODUCED"
  | "TRANSFERRED"
  | "MASTERED";

export type KnowledgeTargetType =
  | "CHARACTER"
  | "WORD"
  | "CHUNK"
  | "PATTERN"
  | "PHONETIC_CONCEPT"
  | "TONE_CONCEPT"
  | "HANZI_CONCEPT"
  | "GRAMMAR_PATTERN"
  | "COMMUNICATIVE_INTENT";

export type PedagogicalRung =
  | "ORIENT"
  | "EXPOSE"
  | "NOTICE"
  | "GUIDED_RECOGNITION"
  | "DISCRIMINATION"
  | "RECALL"
  | "ASSEMBLY"
  | "PRODUCTION"
  | "TRANSFER";

export type ExposureStrength = "ORIENTATION" | "SINGLE_MODALITY" | "MULTIMODAL" | "GUIDED_PRACTICE";
export type DistractorSafety = "KNOWN_TARGET" | "CONTROLLED_UNKNOWN" | "NOT_APPLICABLE";

export interface PedagogicalStepEvidence {
  rung: PedagogicalRung;
  knowledgeTargetIds: string[];
  exposureStrength?: ExposureStrength;
  primaryDifficulty?: "MEANING" | "SOUND" | "FORM" | "STRUCTURE" | "PRODUCTION" | "CONTEXT";
  hiddenSkillRequirements?: string[];
  distractorSafety?: DistractorSafety;
  graded?: boolean;
}

export interface KnowledgeTarget {
  id: string;
  type: KnowledgeTargetType;
  hanzi?: string;
  pinyin?: string;
  /** Canonical concept meaning; lexical EN display remains owned by the i18n overlay. */
  meaning: { "pt-BR": string; en?: string };
  firstIntroducedLessonId: string;
  prerequisites: string[];
  sourceLanguageNotes?: { "pt-BR"?: string; en?: string };
  recognitionReadiness: KnowledgeStage;
  productionReadiness: KnowledgeStage;
  canonicalRef?: `char:${string}` | `chunk:${string}`;
}

export const FOUNDATION_TARGET_IDS = {
  mandarin: "concept:mandarin-language",
  pinyin: "concept:pinyin-map",
  tone: "concept:tone-contour",
  hanzi: "concept:hanzi-writing",
  components: "concept:hanzi-components",
  greetingIntent: "intent:greeting",
  nihao: "chunk:nihao",
  ni: "char:ni",
  hao: "char:hao",
} as const;

const explicitTargets: KnowledgeTarget[] = [
  {
    id: FOUNDATION_TARGET_IDS.mandarin,
    type: "COMMUNICATIVE_INTENT",
    meaning: { "pt-BR": "mandarim como língua falada", en: "Mandarin as a spoken language" },
    firstIntroducedLessonId: "p1-o-que-e-mandarim",
    prerequisites: [],
    recognitionReadiness: "NOTICED",
    productionReadiness: "TRANSFERRED",
  },
  {
    id: FOUNDATION_TARGET_IDS.pinyin,
    type: "PHONETIC_CONCEPT",
    meaning: { "pt-BR": "pinyin representa a pronúncia", en: "pinyin represents pronunciation" },
    firstIntroducedLessonId: "p1-o-que-e-pinyin",
    prerequisites: [FOUNDATION_TARGET_IDS.mandarin, FOUNDATION_TARGET_IDS.nihao],
    sourceLanguageNotes: {
      "pt-BR": "Contrastar com a leitura intuitiva do português somente na interface pt-BR.",
      en: "Use English-friendly sound references; never translate Portuguese phonetic analogies literally.",
    },
    recognitionReadiness: "GUIDED",
    productionReadiness: "RECALLED",
  },
  {
    id: FOUNDATION_TARGET_IDS.tone,
    type: "TONE_CONCEPT",
    meaning: { "pt-BR": "o contorno da voz faz parte da palavra", en: "voice contour is part of the word" },
    firstIntroducedLessonId: "p1-o-que-e-tom",
    prerequisites: [FOUNDATION_TARGET_IDS.pinyin],
    recognitionReadiness: "GUIDED",
    productionReadiness: "PRODUCED",
  },
  {
    id: FOUNDATION_TARGET_IDS.hanzi,
    type: "HANZI_CONCEPT",
    meaning: { "pt-BR": "hànzì é o sistema de escrita", en: "hànzì is the writing system" },
    firstIntroducedLessonId: "p1-o-que-e-hanzi",
    prerequisites: [FOUNDATION_TARGET_IDS.mandarin, FOUNDATION_TARGET_IDS.pinyin],
    recognitionReadiness: "GUIDED",
    productionReadiness: "PRODUCED",
  },
  {
    id: FOUNDATION_TARGET_IDS.components,
    type: "HANZI_CONCEPT",
    meaning: { "pt-BR": "caracteres podem ser montados com componentes", en: "characters can be built from components" },
    firstIntroducedLessonId: "p1-primeiros-hanzi",
    prerequisites: [FOUNDATION_TARGET_IDS.hanzi, FOUNDATION_TARGET_IDS.ni, FOUNDATION_TARGET_IDS.hao],
    recognitionReadiness: "GUIDED",
    productionReadiness: "PRODUCED",
  },
  {
    id: FOUNDATION_TARGET_IDS.greetingIntent,
    type: "COMMUNICATIVE_INTENT",
    meaning: { "pt-BR": "cumprimentar alguém", en: "greet someone" },
    firstIntroducedLessonId: "p1-o-que-e-mandarim",
    prerequisites: [FOUNDATION_TARGET_IDS.nihao],
    recognitionReadiness: "GUIDED",
    productionReadiness: "PRODUCED",
  },
];

function firstLessonFor(ref: string): string {
  return ALL_LESSONS.find((lesson) =>
    [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? []), ...(lesson.previewItems ?? [])].includes(ref)
  )?.id ?? "CATALOG_ONLY";
}

function lexicalTargets(): KnowledgeTarget[] {
  const chunks: KnowledgeTarget[] = CHUNKS.map((chunk) => ({
    id: `chunk:${chunk.id}`,
    type: chunk.hanzi.length <= 2 ? "WORD" : "CHUNK",
    hanzi: chunk.hanzi,
    pinyin: chunk.pinyin,
    meaning: { "pt-BR": chunk.meaningPt },
    firstIntroducedLessonId: firstLessonFor(`chunk:${chunk.id}`),
    prerequisites: [],
    recognitionReadiness: "EXPOSED",
    productionReadiness: "RECALLED",
    canonicalRef: `chunk:${chunk.id}`,
  }));
  const characters: KnowledgeTarget[] = CHARACTERS.map((character) => ({
    id: `char:${character.id}`,
    type: "CHARACTER",
    hanzi: character.hanzi,
    pinyin: character.pinyin,
    meaning: { "pt-BR": character.meaningPt },
    firstIntroducedLessonId: firstLessonFor(`char:${character.id}`),
    prerequisites: character.components.map((id) => `char:${id}`),
    recognitionReadiness: "EXPOSED",
    productionReadiness: "PRODUCED",
    canonicalRef: `char:${character.id}`,
  }));
  return [...chunks, ...characters];
}

/** Metadata overlay only: canonical character/chunk identities remain in their original catalogs. */
export const KNOWLEDGE_TARGET_MANIFEST: KnowledgeTarget[] = [...explicitTargets, ...lexicalTargets()];

export function getKnowledgeTarget(id: string): KnowledgeTarget | undefined {
  return KNOWLEDGE_TARGET_MANIFEST.find((target) => target.id === id);
}

export function withPedagogicalEvidence(
  step: LessonStep,
  evidence: PedagogicalStepEvidence
): LessonStep {
  return { ...step, pedagogicalEvidence: evidence };
}

export const PEDAGOGICAL_STAGE_ORDER: Record<KnowledgeStage, number> = {
  UNSEEN: 0,
  EXPOSED: 1,
  NOTICED: 2,
  GUIDED: 3,
  RECOGNIZED: 4,
  RECALLED: 5,
  PRODUCED: 6,
  TRANSFERRED: 7,
  MASTERED: 8,
};

export const MAX_PRIMARY_NEW_DIFFICULTIES_PER_BEGINNER_STEP = 1;

export const SUPPORT_FADING_POLICY: Record<
  "EXPOSE" | "GUIDED" | "RECOGNITION" | "RECALL" | "PRODUCTION" | "TRANSFER",
  { visibleSupport: string[]; answerVisible: boolean }
> = {
  EXPOSE: { visibleSupport: ["hanzi", "pinyin", "meaning", "audio"], answerVisible: true },
  GUIDED: { visibleSupport: ["audio", "pinyin", "meaning", "limited choices"], answerVisible: false },
  RECOGNITION: { visibleSupport: ["audio", "controlled choices"], answerVisible: false },
  RECALL: { visibleSupport: ["communicative cue"], answerVisible: false },
  PRODUCTION: { visibleSupport: ["situation", "optional progressive help"], answerVisible: false },
  TRANSFER: { visibleSupport: ["new context", "known structural frame"], answerVisible: false },
};

export function stageReached(current: KnowledgeStage, required: KnowledgeStage): boolean {
  return PEDAGOGICAL_STAGE_ORDER[current] >= PEDAGOGICAL_STAGE_ORDER[required];
}

const lexicalBySurface = new Map<string, string>();
for (const chunk of CHUNKS) {
  lexicalBySurface.set(chunk.hanzi, `chunk:${chunk.id}`);
  lexicalBySurface.set(chunk.pinyin, `chunk:${chunk.id}`);
}
for (const character of CHARACTERS) {
  lexicalBySurface.set(character.hanzi, `char:${character.id}`);
  lexicalBySurface.set(character.pinyin, `char:${character.id}`);
}

export function knowledgeTargetIdsForSurface(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const direct = lexicalBySurface.get(value.trim());
  const ids: string[] = direct ? [direct] : [];
  for (const [surface, id] of lexicalBySurface) {
    if (/[\u3400-\u9fff]/u.test(surface) && value.includes(surface)) ids.push(id);
  }
  return [...new Set(ids)];
}

/** Extracts canonical targets from the task itself, never from its distractors. */
export function knowledgeTargetIdsForStep(step: LessonStep, declared: string[] = []): string[] {
  const values = [
    step.title, step.body, step.prompt, step.dialoguePrompt, step.text, step.hanzi, step.pinyin,
    step.audioText, step.slowAudioText, step.correctAnswer, step.answer,
    step.targetHanzi, step.targetPinyin, step.sourceText, step.sourcePinyin, step.blankAnswer,
    ...(step.target ?? []), ...(step.targetParts ?? []), ...(step.requiredTerms ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ];
  return [...new Set([...declared, ...values.flatMap(knowledgeTargetIdsForSurface)])];
}
