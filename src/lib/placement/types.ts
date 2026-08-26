export const PLACEMENT_VERSION = 2;
export const PLACEMENT_CONFIDENCE_THRESHOLD = 0.85;
export const PENDING_PLACEMENT_TTL_MS = 24 * 60 * 60 * 1000;

export type Experience = "zero" | "words" | "studied" | "phrases" | "advanced";
export type QuizDifficulty = 1 | 2 | 3 | 4;
export type QuizLayer =
  | "supported"
  | "reduced"
  | "noHelp"
  | "sentenceReasoning"
  | "soundSpeech"
  | "production";
export type AssessmentTier = "A" | "B" | "C" | "D" | "E";
export type QuizCategory = "meaning" | "sound" | "tone" | "hanzi" | "sentence" | "context" | "speaking";
export type PlacementDimension =
  | "meaning"
  | "listening"
  | "pinyin"
  | "tone"
  | "hanzi"
  | "sentence"
  | "context"
  | "production";
export type ResponseMode = "choice" | "self_report";
export type PlacementLevel = "inicio" | "sobrevivencia" | "tons" | "frases" | "hanzi";

export type EssentialPlacementItem =
  | "mandarim"
  | "pinyin"
  | "tom"
  | "hanzi"
  | "你好"
  | "谢谢"
  | "我"
  | "你"
  | "好"
  | "再见";

export interface QuizQuestion {
  id: string;
  skill: QuizCategory;
  category: QuizCategory;
  layer: QuizLayer;
  prompt: string;
  stimulus?: string;
  detail?: string;
  audioText?: string;
  allowHints?: boolean;
  hasHint: boolean;
  noHint: boolean;
  essential?: boolean;
  essentialItem?: EssentialPlacementItem;
  withClue?: boolean;
  tier?: AssessmentTier;
  difficulty?: QuizDifficulty;
  unlockWeight: number;
  answer: string;
  options: string[];
}

export interface PlacementCompetencyState {
  estimate: number;
  evidenceCount: number;
  confidence: number;
  highestProvenDifficulty: number;
  hintDependency: number;
  contradictionCount: number;
}

export type PlacementCompetencyMap = Record<PlacementDimension, PlacementCompetencyState>;

export interface PlacementAnswerEvidence {
  questionId: string;
  answer: string;
  hintUsed: boolean;
  responseMode: ResponseMode;
  at?: number;
}

export interface QuizCategoryStat {
  total: number;
  correct: number;
  correctWithoutHint: number;
  correctWithHint: number;
  hints: number;
  score: number;
}

export interface QuizTierStat {
  total: number;
  correct: number;
  correctWithoutHint: number;
  hints: number;
}

export interface FoundationProof {
  lessonId: string;
  label: string;
  proven: boolean;
}

export interface PlacementDecision {
  level: PlacementLevel;
  label: string;
  targetLessonId: string;
  skippedLessonIds: string[];
  foundationLessonIdsRequired: string[];
  masteredByPlacement: string[];
}

export interface PlacementAnalysis {
  placement: PlacementDecision;
  score: number;
  questionsAnswered: number;
  correctWithoutHint: number;
  correctWithHint: number;
  wrong: number;
  weightedScore: number;
  weightedPossible: number;
  weightedAccuracy: number;
  noHintAccuracy: number;
  adjustedCorrect: number;
  decisiveQuestions: number;
  decisiveCorrect: number;
  decisiveAccuracy: number;
  tierSummary: Record<AssessmentTier, QuizTierStat>;
  hintCount: number;
  categoriesCorrect: string[];
  categoriesWeak: string[];
  essentialMissed: string[];
  essentialHinted: string[];
  advancedProbes: number;
  advancedMisses: number;
  advancedCorrect: number;
  resultMessage: string;
  skippedLessonIds: string[];
  foundationLessonIdsRequired: string[];
  foundationProofs: FoundationProof[];
  decisionReasons: string[];
  consistency: "Alta" | "Média" | "Baixa";
  strengths: string[];
  reinforcements: string[];
  placementConfidence: number;
  competency: PlacementCompetencyMap;
  placementVersion: typeof PLACEMENT_VERSION;
}

export interface PendingPlacementV2 {
  version: typeof PLACEMENT_VERSION;
  startedAt: number;
  expiresAt: number;
  answers: PlacementAnswerEvidence[];
  declaredExperience: Experience;
  goal: string | null;
  askedQuestionIds: string[];
}

export interface PlacementCommitPayload {
  placementVersion: typeof PLACEMENT_VERSION;
  declaredExperience: Experience;
  goal: string | null;
  answers: PlacementAnswerEvidence[];
  idempotencyKey?: string;
}

export const PLACEMENT_DIMENSIONS: PlacementDimension[] = [
  "meaning",
  "listening",
  "pinyin",
  "tone",
  "hanzi",
  "sentence",
  "context",
  "production",
];

export const CATEGORY_LABEL: Record<QuizCategory, string> = {
  meaning: "Significado",
  sound: "Som e pinyin",
  tone: "Tons",
  hanzi: "Hànzì",
  sentence: "Frases",
  context: "Uso em contexto",
  speaking: "Som e fala",
};

export const DIMENSION_LABEL: Record<PlacementDimension, string> = {
  meaning: "Significado",
  listening: "Escuta",
  pinyin: "Pinyin",
  tone: "Tons",
  hanzi: "Hànzì",
  sentence: "Frases",
  context: "Uso em contexto",
  production: "Produção",
};

export const BASE_QUIZ_LENGTH: Record<Experience, number> = {
  zero: 5,
  words: 7,
  studied: 9,
  phrases: 11,
  advanced: 13,
};

export const MAX_QUIZ_LENGTH: Record<Experience, number> = {
  zero: 9,
  words: 12,
  studied: 16,
  phrases: 18,
  advanced: 22,
};

export const FOUNDATION_LESSON_IDS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
  "p1-engine-2-lab",
] as const;

export const FOUNDATION_PROOF_LABELS: Record<string, string> = {
  "p1-o-que-e-mandarim": "mandarim como língua",
  "p1-o-que-e-pinyin": "pinyin como guia de som",
  "p1-o-que-e-tom": "tom como parte do significado",
  "p1-o-que-e-hanzi": "hànzì como escrita chinesa",
  "p1-primeiros-hanzi": "primeiros hànzì por fragmentos",
  "p1-engine-2-lab": "laboratório inicial de exercícios",
};

/** Ordem curricular usada para skips autorizados (subset estável da Jornada). */
export const PLACEMENT_LESSON_ORDER: Array<{ id: string; premium: boolean }> = [
  { id: "p1-o-que-e-mandarim", premium: false },
  { id: "p1-o-que-e-pinyin", premium: false },
  { id: "p1-o-que-e-tom", premium: false },
  { id: "p1-o-que-e-hanzi", premium: false },
  { id: "p1-primeiros-hanzi", premium: false },
  { id: "p1-engine-2-lab", premium: false },
  { id: "l1", premium: false },
  { id: "p2-ma-primeiro-tom", premium: false },
  { id: "p2-ma-segundo-tom", premium: false },
  { id: "p2-ma-terceiro-tom", premium: false },
  { id: "p2-ma-quarto-tom", premium: false },
  { id: "l5", premium: false },
  { id: "p2-comparar-tom-1-4", premium: false },
  { id: "p2-comparar-tom-2-3", premium: false },
  { id: "p2-tons-nihao", premium: false },
  { id: "p2-tons-xiexie", premium: false },
  { id: "l14", premium: false },
  { id: "p3-wohenhao", premium: false },
  { id: "p3-wobuhui-shuo-zhongwen", premium: false },
  { id: "p3-qing-zai-shuo-yibian", premium: false },
  { id: "l19", premium: false },
];
