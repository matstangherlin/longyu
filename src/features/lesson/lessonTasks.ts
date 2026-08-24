import {
  ALL_LESSONS,
  FOUNDATION_LESSON_IDS,
  JOURNEY,
  type FlatLesson,
  type Lesson,
  type LessonStage,
  type LessonStageId,
  type LessonStep,
  type ConversationRepairBeat,
  type PedagogyVariant,
  type PostConversationTaskType,
  POST_CONVERSATION_TASK_LABELS,
  type Skill,
  type StepKind,
} from "../../data/journey";
import {
  applyScaffoldToStep,
  isProductionOrTransferKind,
  masteryKindPriority,
  MASTERY_PASS_GRADED_BUDGET,
  nextMasteryPass,
  type ItemDimensionScores,
  type MasteryLevel,
  type MasteryPass,
  weakestDimension,
  dimensionForStepKind,
} from "../../data/masteryLoop";
import {
  isMasteryPilotLesson,
  masteryBonusStepsFor,
} from "../../data/masteryPilot";
import {
  isReviewMasteryLesson,
  reviewMasteryStepsFor,
  REVIEW_MASTERY_LABELS,
  type ReviewMasteryLevel,
} from "../../data/reviewMastery";
import type { ActivityMemoryEntry } from "../../lib/activityVariety";
import { PRECOMPUTED_STRUCTURE_EXPOSURE } from "../../data/generated/structureExposureIndex";
import { timeLessonPlannerPhase } from "../../lib/plannerTiming";
import { CHARACTERS, charById } from "../../data/characters";
import { CHUNKS, chunkById } from "../../data/chunks";
import {
  CONVERSATION_SCENES,
  conversationSceneById,
  conversationSelectionContextFromHistory,
  conversationVariantLevelFor,
  isConversationSceneEligible,
  normalizeConversationAnswer,
  pickBestConversationScene,
  resolveConversationScene,
  scoreConversationScene,
  type ConversationHistoryEntry,
  type ConversationInteraction,
  type ConversationSceneLessonInfo,
  type ConversationSceneResolveContext,
  type ConversationSceneSelectionContext,
  type ConversationSceneStep as ConversationSceneDefinition,
  type ConversationSceneVariantStage,
} from "../../data/conversationScenes";
import {
  buildPacketPhraseExchangeCandidates,
  preferredSceneIntentsForRefs,
} from "../../data/vocabularyPacketConversation";
import {
  buildManifestForResolvedVariant,
  type ConversationVocabularyItem,
  type ConversationVocabularyManifest,
} from "../../data/conversationVocabulary";

export { scoreConversationScene, type ConversationSceneLessonInfo, type ConversationSceneSelectionContext };
import {
  cognitiveProfile,
  cognitiveTransformation,
  semanticCapForKey,
  semanticContextKey,
  semanticHardCeilingForKey,
  semanticTargetKeys,
} from "./lessonNovelty";

export { cognitiveProfile, cognitiveTransformation, semanticTargetKeys } from "./lessonNovelty";
import type { ItemType } from "../../data/types";
import {
  buildersForCharacter,
  builderPrerequisitesMet,
  selectHanziBuilderForStudent,
  type HanziBuilder,
  type HanziBuilderProgressMap,
} from "../../data/hanziBuilder";
import { numericPinyinToDiacritics, normalizePinyinBase, isNearDuplicatePinyinSet } from "../../lib/pinyin";
import type { ErrorCause } from "../../data/errorDiagnosis";
import {
  practiceVariantForAttempt,
  variantSeedOffsetForAttempt,
  weaknessProfile,
  type WeaknessProfile,
} from "../../lib/weaknessProfile";
import {
  dictationModeForPhase,
  minimalPairsFor,
  oddOneOutSetsFor,
  oddOneOutLevelForPhase,
  oddOneOutPromptForLevel,
  oddOneOutExplanation,
  spotErrorDrillsFor,
} from "../../data/perceptionDrills";
import { seededShuffleAvoidingOrder } from "../../lib/seededShuffle";
import {
  FRAME_TASKS,
  SENTENCE_FRAMES,
  cloneStructureExposure,
  creditStructureAnchorChunk,
  creditStructureText,
  ensureStructureRungs,
  framesMatchingSentence,
  inferCommunicativeDomain,
  maxTransferAssistForAttempt,
  mergeStructureExposure,
  openProductionTasksFor,
  pickFrameTask,
  pickOpenProductionTask,
  PRODUCTION_ASSIST_RANK,
  productionHelpBuildBank,
  productionHelpVocabForTask,
  productionTasksFor,
  repairTasksFor,
  transferTasksFor,
  type FramePickOptions,
  type FrameTask,
  type ProductionAssist,
  type StructureExposureMap,
  type StructurePracticeRungs,
} from "../../data/productionTasks";
import {
  isProductiveChallengeStep,
  keepMasteryPassSteps,
  planHasFloorKind,
  type ScoredBudgetItem,
} from "../../data/cognitiveBudget";
import { resolveProductionHelpPlan } from "../../data/productionHelp";
import {
  defaultVisualDistractors,
  visualByCharId,
  visualConceptsInHanziText,
  isVisualConceptAllowed,
  type ImageChoiceMode,
  type VisualCategory,
  type VisualConcept,
} from "../../data/visualVocabulary";
import {
  buildWeightedModuleReviewFocus,
  resolveModuleFocusItems,
  validateModuleReviewCoverage,
  type ModuleReviewCoverageIssue,
} from "../../lib/moduleReview";

export { validateModuleReviewCoverage, type ModuleReviewCoverageIssue };

export type LessonMotor = "som" | "fala" | "hanzi" | "leitura" | "revisao";

export const LESSON_STAGE_COUNT = 6;

export interface LessonTask {
  stageId?: LessonStageId;
  id: string;
  motor: LessonMotor;
  name: string;
  objective?: string;
  description: string;
  actionLabel?: string;
  rewardQi: number;
  stepKinds: StepKind[];
  exercises?: StepKind[];
  reusesPreviousVocabulary?: string[];
  introducesNewVocabulary?: string[];
}

interface TaskTemplate {
  id: string;
  motor: LessonMotor;
  name: string;
  description: string;
  rewardQi?: number;
  when?: (steps: LessonStep[]) => boolean;
  stepKinds: StepKind[];
}

const hasAny = (steps: LessonStep[], kinds: StepKind[]) => steps.some((step) => kinds.includes(step.kind));
const count = (steps: LessonStep[], kind: StepKind) => steps.filter((step) => step.kind === kind).length;
const GRADED_STEP_KINDS: StepKind[] = [
  "tone",
  "comprehend",
  "produce",
  "recognize",
  "write",
  "match_pairs",
  "listen_select",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "conversation_scene",
  "hanzi_build",
  "tone_pair",
  "image_choice",
  "compare_with_image",
  "audio_discrimination",
  "dictation",
  "odd_one_out",
  "spot_error",
  "free_production",
  "transfer_task",
  "conversation_repair",
  "contextual_choice",
  "audio_to_action",
  "sentence_transform",
  "substitution_drill",
  "dialogue_completion",
  "reverse_recall",
  "map_direction",
  "place_label",
  "address_build",
  "city_context",
  "sign_reading",
  "menu_reading",
  "price_task",
  "route_sequence",
  "schedule_reading",
];

function isGradedStep(step: LessonStep): boolean {
  return GRADED_STEP_KINDS.includes(step.kind) && !(step.kind === "write" && step.mode === "free_reflection");
}

const FALA_TASKS: TaskTemplate[] = [
  {
    id: "listen",
    motor: "som",
    name: "Ouça o chunk",
    description: "Pegue o ritmo da frase antes de tentar produzir.",
    stepKinds: ["listen", "tone"],
    when: (steps) => hasAny(steps, ["listen", "tone"]),
  },
  {
    id: "meaning",
    motor: "fala",
    name: "Entenda o significado",
    description: "Conecte mandarim, pinyin e português sem decorar no escuro.",
    stepKinds: ["intro", "flashcard", "comprehend"],
    when: (steps) => hasAny(steps, ["intro", "flashcard", "comprehend"]),
  },
  {
    id: "repeat",
    motor: "fala",
    name: "Repita em voz alta",
    description: "Transforme reconhecimento em memória de fala.",
    stepKinds: ["listen", "tone"],
    when: (steps) => hasAny(steps, ["listen", "tone"]),
  },
  {
    id: "assemble",
    motor: "fala",
    name: "Monte a frase",
    description: "Organize as peças na ordem certa.",
    stepKinds: ["produce", "sentence_build", "translation_build", "fill_blank"],
    when: (steps) => hasAny(steps, ["produce", "sentence_build", "translation_build", "fill_blank"]),
  },
  {
    id: "context",
    motor: "fala",
    name: "Use em contexto",
    description: "Leve a frase para uma situação real.",
    stepKinds: ["write", "comprehend", "dialogue_choice", "conversation_scene", "match_pairs"],
    when: (steps) => hasAny(steps, ["write", "comprehend", "dialogue_choice", "conversation_scene", "match_pairs"]),
  },
  {
    id: "review",
    motor: "revisao",
    name: "Revisão rápida",
    description: "Feche a lição reforçando o que acabou de ganhar forma.",
    rewardQi: 3,
    stepKinds: ["write", "comprehend", "produce", "sentence_build", "translation_build", "fill_blank", "dialogue_choice", "conversation_scene"],
  },
];

const SOM_TASKS: TaskTemplate[] = [
  {
    id: "listen",
    motor: "som",
    name: "Ouça o som",
    description: "Treine o ouvido antes de escolher respostas.",
    stepKinds: ["listen", "tone", "listen_select", "tone_pair"],
    when: (steps) => hasAny(steps, ["listen", "tone", "listen_select", "tone_pair"]),
  },
  {
    id: "pinyin",
    motor: "som",
    name: "Veja o pinyin",
    description: "Associe a sílaba ao contorno que você ouviu.",
    stepKinds: ["listen", "tone"],
    when: (steps) => hasAny(steps, ["listen", "tone"]),
  },
  {
    id: "compare",
    motor: "som",
    name: "Compare tons",
    description: "Perceba pequenas diferenças que mudam sentido.",
    stepKinds: ["tone", "tone_pair"],
    when: (steps) => count(steps, "tone") >= 2 || count(steps, "listen") >= 2 || hasAny(steps, ["tone_pair"]),
  },
  {
    id: "choose",
    motor: "som",
    name: "Escolha o tom",
    description: "Teste sua leitura auditiva com feedback imediato.",
    stepKinds: ["tone", "comprehend", "listen_select"],
    when: (steps) => hasAny(steps, ["tone", "comprehend", "listen_select"]),
  },
  {
    id: "repeat",
    motor: "fala",
    name: "Repita em voz alta",
    description: "Faça a boca acompanhar o ouvido.",
    stepKinds: ["listen", "tone"],
    when: (steps) => hasAny(steps, ["listen", "tone"]),
  },
  {
    id: "test",
    motor: "revisao",
    name: "Mini teste",
    description: "Confirme que o som ficou claro antes de seguir.",
    rewardQi: 3,
    stepKinds: ["write", "comprehend", "tone", "listen_select", "tone_pair"],
  },
];

const HANZI_TASKS: TaskTemplate[] = [
  {
    id: "see",
    motor: "hanzi",
    name: "Veja o caractere",
    description: "Observe forma, som e sentido como uma unidade.",
    stepKinds: ["listen", "recognize", "decompose"],
    when: (steps) => hasAny(steps, ["listen", "recognize", "decompose"]),
  },
  {
    id: "pieces",
    motor: "hanzi",
    name: "Entenda as peças",
    description: "Separe componentes de sentido e pistas visuais.",
    stepKinds: ["intro", "decompose", "hanzi_build"],
    when: (steps) => hasAny(steps, ["intro", "decompose", "hanzi_build"]),
  },
  {
    id: "meaning",
    motor: "hanzi",
    name: "Reconheça o significado",
    description: "Leia o caractere como parte de uma palavra real.",
    stepKinds: ["recognize", "comprehend", "flashcard"],
    when: (steps) => hasAny(steps, ["recognize", "comprehend", "flashcard"]),
  },
  {
    id: "decompose",
    motor: "hanzi",
    name: "Desmonte o hànzì",
    description: "Transforme o caractere em peças lembráveis.",
    stepKinds: ["decompose"],
    when: (steps) => hasAny(steps, ["decompose"]),
  },
  {
    id: "use",
    motor: "fala",
    name: "Use em palavra/frase",
    description: "Conecte forma visual com uso vivo.",
    stepKinds: ["flashcard", "comprehend", "produce", "write", "sentence_build", "translation_build"],
    when: (steps) => hasAny(steps, ["flashcard", "comprehend", "produce", "write", "sentence_build", "translation_build"]),
  },
  {
    id: "review",
    motor: "revisao",
    name: "Revisão rápida",
    description: "Fixe o caractere antes da próxima etapa.",
    rewardQi: 3,
    stepKinds: ["write", "recognize", "decompose", "hanzi_build", "match_pairs"],
  },
];

const LEITURA_TASKS: TaskTemplate[] = [
  {
    id: "pinyin",
    motor: "leitura",
    name: "Leia com pinyin",
    description: "Entre no texto com suporte de pronúncia.",
    stepKinds: ["microread"],
    when: (steps) => hasAny(steps, ["microread"]),
  },
  {
    id: "listen-line",
    motor: "som",
    name: "Ouça por linha",
    description: "Ouça o texto em blocos curtos e naturais.",
    stepKinds: ["microread", "listen"],
    when: (steps) => hasAny(steps, ["microread", "listen"]),
  },
  {
    id: "translate",
    motor: "leitura",
    name: "Toque para traduzir",
    description: "Confira o sentido sem sair do fluxo de leitura.",
    stepKinds: ["microread", "comprehend"],
    when: (steps) => hasAny(steps, ["microread", "comprehend"]),
  },
  {
    id: "comprehension",
    motor: "leitura",
    name: "Responda compreensão",
    description: "Mostre que a ideia principal ficou clara.",
    stepKinds: ["comprehend", "write", "fill_blank", "dialogue_choice"],
    when: (steps) => hasAny(steps, ["comprehend", "write", "fill_blank", "dialogue_choice"]),
  },
  {
    id: "no-pinyin",
    motor: "leitura",
    name: "Leia sem pinyin",
    description: "Dê um passo rumo à leitura autônoma.",
    stepKinds: ["microread"],
    when: (steps) => hasAny(steps, ["microread"]),
  },
  {
    id: "review",
    motor: "revisao",
    name: "Revisão rápida",
    description: "Guarde as linhas úteis para rever depois.",
    rewardQi: 3,
    stepKinds: ["write", "comprehend", "microread", "fill_blank"],
  },
];

const REVISAO_TASKS: TaskTemplate[] = [
  {
    id: "sound",
    motor: "som",
    name: "Ouça e reconheça",
    description: "Reative o som antes das respostas.",
    stepKinds: ["listen", "tone", "listen_select", "tone_pair"],
    when: (steps) => hasAny(steps, ["listen", "tone", "listen_select", "tone_pair"]),
  },
  {
    id: "meaning",
    motor: "fala",
    name: "Reforce significado",
    description: "Revise chunks e escolhas de sentido.",
    stepKinds: ["flashcard", "comprehend", "match_pairs", "dialogue_choice"],
    when: (steps) => hasAny(steps, ["flashcard", "comprehend", "match_pairs", "dialogue_choice"]),
  },
  {
    id: "use",
    motor: "fala",
    name: "Monte ou use",
    description: "Produza com as peças mais importantes do módulo.",
    stepKinds: ["produce", "write", "sentence_build", "translation_build", "fill_blank"],
    when: (steps) => hasAny(steps, ["produce", "write", "sentence_build", "translation_build", "fill_blank"]),
  },
  {
    id: "hanzi",
    motor: "hanzi",
    name: "Hànzì em foco",
    description: "Reconheça forma, significado e peças.",
    stepKinds: ["recognize", "decompose", "hanzi_build"],
    when: (steps) => hasAny(steps, ["recognize", "decompose", "hanzi_build"]),
  },
  {
    id: "reading",
    motor: "leitura",
    name: "Leitura rápida",
    description: "Releia em blocos curtos e revise o contexto.",
    stepKinds: ["microread"],
    when: (steps) => hasAny(steps, ["microread"]),
  },
  {
    id: "close",
    motor: "revisao",
    name: "Fechamento",
    description: "Consolide o módulo e libere o próximo passo.",
    rewardQi: 3,
    stepKinds: ["write", "comprehend", "produce", "recognize", "match_pairs", "listen_select", "sentence_build", "translation_build", "fill_blank", "dialogue_choice", "hanzi_build", "tone_pair"],
  },
];

function templatesFor(lesson: Lesson): TaskTemplate[] {
  if (lesson.isReview || lesson.skill === "sistema") return REVISAO_TASKS;
  if (lesson.skill === "som") return SOM_TASKS;
  if (lesson.skill === "hanzi") return HANZI_TASKS;
  if (lesson.skill === "leitura") return LEITURA_TASKS;
  return FALA_TASKS;
}

function legacyTaskCandidatesFor(lesson: Lesson): LessonTask[] {
  const steps = lesson.steps;
  const tasks = templatesFor(lesson)
    .filter((task) => !task.when || task.when(steps))
    .map((task) => ({
      id: `${lesson.id}:${task.id}`,
      motor: task.motor,
      name: task.name,
      description: task.description,
      rewardQi: task.rewardQi ?? lesson.rewardQi ?? 2,
      stepKinds: task.stepKinds,
    }));

  return tasks.length > 0
    ? tasks
    : [
        {
          id: `${lesson.id}:start`,
          motor: lessonMotor(lesson),
          name: "Comece a prática",
          description: "Abra a lição e avance pelas atividades principais.",
          rewardQi: 2,
          stepKinds: steps.map((step) => step.kind),
        },
      ];
}

const LESSON_STAGE_ORDER: LessonStageId[] = ["intro", "recognition", "assembly", "usage", "post_conversation", "consolidation"];

const STAGE_KIND_HINTS: Record<LessonStageId, StepKind[]> = {
  intro: ["intro", "flashcard", "listen", "hanzi_evolution", "decompose"],
  recognition: [
    "listen_select",
    "comprehend",
    "recognize",
    "tone",
    "match_pairs",
    "tone_pair",
    "image_choice",
    "compare_with_image",
    "audio_discrimination",
    "odd_one_out",
  ],
  assembly: ["produce", "sentence_build", "translation_build", "hanzi_build", "fill_blank", "decompose", "dictation"],
  usage: [
    "dialogue_choice",
    "conversation_scene",
    "write",
    "fill_blank",
    "microread",
    "produce",
    "comprehend",
    "spot_error",
    "free_production",
    "transfer_task",
    "conversation_repair",
  ],
  post_conversation: [
    "comprehend",
    "dialogue_choice",
    "sentence_build",
    "fill_blank",
    "listen_select",
    "image_choice",
    "compare_with_image",
    "recognize",
    "hanzi_build",
    "translation_build",
    "produce",
    "free_production",
    "conversation_repair",
  ],
  consolidation: [
    "listen",
    "flashcard",
    "tone",
    "comprehend",
    "produce",
    "recognize",
    "write",
    "match_pairs",
    "listen_select",
    "sentence_build",
    "translation_build",
    "fill_blank",
    "dialogue_choice",
    "conversation_scene",
    "hanzi_build",
    "tone_pair",
    "image_choice",
    "compare_with_image",
    "microread",
    "audio_discrimination",
    "dictation",
    "odd_one_out",
    "spot_error",
    "free_production",
    "transfer_task",
  ],
};

export interface LessonRoundStep extends LessonStep {
  lessonStageId?: LessonStageId;
  lessonStageQuestion?: number;
  lessonStageQuestionCount?: number;
  sourceStepIndex?: number;
  generated?: boolean;
  /** Pedagogia V3 — pass de domínio desta bateria (1–4). */
  masteryPass?: MasteryPass;
}

export interface LessonRoundProgress {
  stageId: LessonStageId;
  stageIndex: number;
  questionIndex: number;
  questionCount: number;
}

export interface LessonPracticeRecentError {
  correctAnswer?: string;
  hanzi?: string;
  pinyin?: string;
  meaningPt?: string;
  tokens?: string[];
  targets?: { type: ItemType; itemId: string }[];
  skill?: string;
  timestamp?: number;
  /** Causa linguística diagnosticada — alimenta o perfil de fraqueza. */
  diagnosis?: ErrorCause;
  /** Confiança da causa: palpite fraco não pode desviar o currículo. */
  diagnosisConfidence?: "high" | "medium" | "low";
  wrongCount?: number;
  correctedAt?: number;
}

export interface LessonPracticePlanContext {
  completedLessons?: string[];
  learnedChunks?: string[];
  learnedChars?: string[];
  recentErrors?: LessonPracticeRecentError[];
  /** Domínio do HanziBuilder por caractere: escolhe a variação certa (guia → desafio). */
  hanziBuilderProgress?: HanziBuilderProgressMap;
  srs?: Record<string, import("../../lib/srs").SRSItem>;
  /**
   * VAR-015 — atividades recentes em QUALQUER modo (lição, mastery, revisão,
   * prática), mais recente primeiro. Semeia a janela de variedade para que a
   * repetição percebida entre modos também seja evitada.
   */
  recentActivities?: readonly ActivityMemoryEntry[];
  /** Últimas cenas de conversa vistas (mais recente primeiro) — persistido. */
  recentConversationSceneIds?: string[];
  /** Últimas intenções de conversa vistas (mais recente primeiro) — persistido. */
  recentConversationIntentIds?: string[];
  /** Histórico de conversas do aluno — personaliza a rotação e o nível da variante. */
  conversationHistory?: readonly ConversationHistoryEntry[];
  /** Número de tentativas já registradas; gira automaticamente as variantes A/B/C. */
  attemptNumber?: number;
  /**
   * Perfil de fraqueza já calculado. Normalmente omitido — o plano o deriva de
   * `recentErrors`. Existe para o validador e para testes poderem fixar um
   * perfil sem ter de forjar um histórico de erros inteiro.
   */
  weaknessProfile?: WeaknessProfile;
  silent?: boolean;
  /**
   * Exposição acumulada de estruturas ANTES desta lição (e currículo desta).
   * Omitido = calculado pelo índice lazy. Usado pelo builder do índice e testes.
   */
  structureExposure?: StructureExposureMap;
  /** Exposição só do histórico anterior — gate de transferência (sem a lição atual). */
  structureExposureForTransfer?: StructureExposureMap;
  /** Frames com transfer em lição anterior — define scaffold inicial. */
  priorTransferredFrames?: ReadonlySet<string>;
  /** Evita reentrada ao montar o índice de exposição. */
  skipStructureExposureIndex?: boolean;
  /**
   * Pedagogia V3 — nível de domínio já alcançado (0–4).
   * O planner gera a *próxima* pass (ou recovery) a partir deste valor.
   */
  masteryLevel?: MasteryLevel;
  /** Força uma pass específica (testes / recovery). */
  masteryPass?: MasteryPass;
  recoveryPending?: boolean;
  /** Domínio por dimensão por item (`chunk:…` / `char:…`). */
  itemDimensionsByRef?: Record<string, ItemDimensionScores>;
}

/**
 * Reexportado de lib/weaknessProfile: a escolha da variante virou decisão
 * pedagógica (rota pela fraqueza) e não pertence mais ao módulo de montagem de
 * plano. Chamado sem perfil, devolve o rodízio A/B/C original — é isto que
 * mantém compatível quem já dependia da assinatura de um argumento só.
 */
export { practiceVariantForAttempt, variantSeedOffsetForAttempt } from "../../lib/weaknessProfile";

interface FocusItem {
  key: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  type?: ItemType;
  itemId?: string;
}

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const CJK_ONLY_RE = /^[\u3400-\u9fff\uf900-\ufaff]+$/u;
const HANZI_PUNCTUATION_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()]/g;
const CORE_REVIEW_REFS = [
  "chunk:nihao",
  "chunk:xiexie",
  "chunk:zaijian",
  "chunk:bukeqi",
  "chunk:wohenhao",
  "chunk:wojiao",
  "chunk:wature",
  "chunk:wobuhui",
  "chunk:nijiaoshenme",
  "chunk:woxianghe",
  "chunk:mingtianjian",
  "chunk:nihaoma",
  "chunk:jintianhenhao",
  "chunk:zheshishui",
  "chunk:nashirenm",
  "char:wo",
  "char:ni",
  "char:ren",
  "char:mu",
];
const charByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const JOURNEY_UNITS = JOURNEY.flatMap((phase) => phase.units);
const unitIndexById = new Map(JOURNEY_UNITS.map((unit, index) => [unit.id, index]));

function lessonUnitIndex(lesson: Lesson): number {
  const unitId = lessonUnitId(lesson);
  if (!unitId) return -1;
  return unitIndexById.get(unitId) ?? -1;
}

type ExerciseFamily =
  | "intro"
  | "recognition"
  | "meaning"
  | "audio"
  | "matching"
  | "assembly"
  | "usage"
  | "review"
  | "consolidation"
  | "hanzi"
  | "pinyin"
  | "reading";

interface PracticeCandidate {
  step: LessonStep;
  stageId: LessonStageId;
  sourceStepIndex: number;
  generated: boolean;
  families: ExerciseFamily[];
  score: number;
  /**
   * Entrou por ensureCoverage (visual obrigatório, HanziBuilder mínimo,
   * variante pedagógica...). O corte final não pode derrubá-lo: a garantia
   * de cobertura existia justamente para ele estar no plano.
   */
  ensured?: boolean;
}

interface LessonPracticeProfile {
  targetCount: number;
  stageTargets: Record<LessonStageId, number>;
  minHanziBuilds: number;
  maxHanziBuilds: number;
  /** Máximo de builders do MESMO caractere na lição (aula dedicada permite mais). */
  perCharBuildCap: number;
  maxPinyinTasks: number;
  needsPinyinTask: boolean;
  /** Máximo de cenas de conversa: 1 comum, 2 revisão, várias em imersão. */
  maxConversationScenes: number;
  /** Máximo de exercícios visuais GERADOS (image_choice). Autoral não conta. */
  maxImageChoices: number;
  /** Revisões podem repetir mais um pouco, desde que com transformação cognitiva. */
  isReview: boolean;
}

const FAMILY_BY_KIND: Record<StepKind, ExerciseFamily[]> = {
  intro: ["intro"],
  listen: ["intro", "audio"],
  tone: ["pinyin", "audio", "recognition"],
  comprehend: ["recognition", "meaning"],
  produce: ["assembly", "usage"],
  write: ["usage"],
  recognize: ["recognition", "hanzi", "meaning"],
  decompose: ["intro", "hanzi"],
  flashcard: ["intro", "meaning"],
  microread: ["reading", "usage"],
  match_pairs: ["matching", "recognition", "review"],
  listen_select: ["audio", "recognition"],
  sentence_build: ["assembly"],
  translation_build: ["assembly"],
  fill_blank: ["assembly", "usage"],
  dialogue_choice: ["usage", "recognition"],
  conversation_scene: ["usage", "recognition", "review"],
  hanzi_evolution: ["intro", "hanzi"],
  hanzi_build: ["hanzi", "assembly"],
  tone_pair: ["pinyin", "audio", "matching"],
  image_choice: ["recognition", "hanzi", "meaning", "audio"],
  compare_with_image: ["recognition", "meaning", "review"],
  audio_discrimination: ["audio", "pinyin"],
  dictation: ["audio", "assembly", "hanzi"],
  odd_one_out: ["meaning", "recognition"],
  spot_error: ["usage", "assembly"],
  // Produção sem apoio é montagem + uso, mas sem banco: pesa como as duas.
  free_production: ["assembly", "usage"],
  transfer_task: ["assembly", "usage", "review"],
  conversation_repair: ["usage", "review"],
  contextual_choice: ["usage", "recognition", "meaning"],
  audio_to_action: ["audio", "recognition", "meaning"],
  sentence_transform: ["assembly", "usage"],
  substitution_drill: ["assembly", "usage"],
  dialogue_completion: ["usage", "recognition"],
  reverse_recall: ["assembly", "usage"],
  map_direction: ["recognition", "meaning", "usage"],
  place_label: ["recognition", "meaning", "hanzi"],
  address_build: ["assembly", "usage"],
  city_context: ["usage", "recognition", "meaning"],
  sign_reading: ["recognition", "meaning", "hanzi"],
  menu_reading: ["recognition", "meaning", "usage"],
  price_task: ["recognition", "meaning"],
  route_sequence: ["assembly", "usage"],
  schedule_reading: ["recognition", "meaning", "usage"],
};

const WEIGHTS_BY_SKILL: Record<Skill | "review", Partial<Record<ExerciseFamily, number>>> = {
  fala: {
    meaning: 25,
    audio: 20,
    assembly: 20,
    matching: 15,
    pinyin: 10,
    hanzi: 10,
    usage: 18,
    review: 16,
  },
  som: {
    audio: 25,
    pinyin: 25,
    recognition: 18,
    usage: 12,
    review: 10,
    matching: 10,
  },
  hanzi: {
    hanzi: 30,
    recognition: 20,
    assembly: 20,
    usage: 15,
    pinyin: 15,
    review: 14,
  },
  leitura: {
    reading: 25,
    audio: 15,
    meaning: 15,
    usage: 20,
    assembly: 10,
    pinyin: 10,
    review: 15,
  },
  sistema: {
    intro: 18,
    recognition: 22,
    audio: 20,
    assembly: 18,
    usage: 10,
    pinyin: 12,
    hanzi: 10,
    review: 10,
  },
  review: {
    review: 24,
    consolidation: 22,
    audio: 14,
    assembly: 18,
    usage: 18,
    hanzi: 14,
    pinyin: 14,
    reading: 12,
    matching: 14,
  },
};

function cleanHanzi(value: string | undefined): string {
  return (value ?? "").replace(HANZI_PUNCTUATION_RE, "").trim();
}

function containsCjk(value: string | undefined): boolean {
  return Boolean(value && CJK_RE.test(value));
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function uniqueValues(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value?.trim();
    const key = normalizeText(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function chunkForText(text: string | undefined) {
  const normalized = cleanHanzi(text);
  if (!normalized) return undefined;
  return CHUNKS.find((chunk) => cleanHanzi(chunk.hanzi) === normalized);
}

// ————————————————————————————————————————————————————————————————
// Segurança de conteúdo para pares e opções.
//
// Uma explicação pós-resposta (frase longa, muitas vezes com hànzì no meio,
// ex.: "Três árvores formam 森, floresta densa...") NUNCA pode virar gloss de
// significado nem item de par/opção. Um gloss é curto, em português e sem
// hànzì. Estas funções garantem isso na origem (geração) e são reaproveitadas
// pela validação de build.
// ————————————————————————————————————————————————————————————————
const CLEAN_GLOSS_MAX = 32;
const PAIR_MEANING_MAX = 32;

function isCleanMeaningGloss(value: string | undefined): boolean {
  const text = (value ?? "").trim();
  if (!text) return false;
  if (containsCjk(text)) return false; // gloss não tem hànzì
  if (text.length > CLEAN_GLOSS_MAX) return false; // explicação longa
  if (/[.!?](\s+)\S/.test(text)) return false; // mais de uma frase = explicação
  return true;
}

// Usa o significado passado apenas se for um gloss limpo; caso contrário mantém
// o significado canônico (do char/chunk). Impede que uma explicação sobrescreva
// o gloss curto de um caractere ou frase conhecida.
function sanitizeMeaning(passed: string | undefined, fallback: string): string {
  return isCleanMeaningGloss(passed) ? passed!.trim().replace(/\.$/, "") : fallback;
}

// Chave de comparação de pinyin para unicidade: numérico → diacrítico, minúsculo,
// espaços normalizados. Assim a forma numérica e a com acento da mesma sílaba
// contam como iguais, mas os acentos são preservados no texto exibido (só a
// chave de comparação é normalizada).
export function normalizePinyinOptionForUniqueness(value: string | undefined): string {
  return numericPinyinToDiacritics(String(value ?? ""))
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

// Dedup por BASE sem tom: o primeiro de cada base entra e os demais (que só
// diferem no tom) são descartados. Assim os distractores de uma escolha de
// pinyin têm sempre bases diferentes (nǐ hǎo vs xièxie vs zàijiàn), nunca
// mā/má/mǎ/mà lado a lado — que parecem iguais para o iniciante.
function uniqueByPinyinBase(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value?.trim();
    if (!clean) continue;
    const key = normalizePinyinBase(clean);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

// Um FocusItem só pode virar par (hànzì ⇆ significado) se o lado esquerdo for
// hànzì puro e curto (1 char, ou até 4 num chunk) e o lado direito um gloss
// curto em português. Rejeita explicações, texto misto PT+hànzì e frases longas.
export function isSafePairFocusItem(item: FocusItem): boolean {
  const hanzi = cleanHanzi(item.hanzi);
  if (!hanzi || !CJK_ONLY_RE.test(hanzi)) return false; // esquerda deve ser hànzì puro
  if (item.type === "char") {
    if (hanzi.length !== 1) return false;
  } else if (item.type === "chunk") {
    if (hanzi.length > 4) return false;
  } else if (hanzi.length > 4) {
    // text: sem tipo conhecido — aceita só sequência curtíssima de hànzì.
    return false;
  }
  const meaning = (item.meaningPt ?? "").trim();
  if (!meaning || containsCjk(meaning)) return false; // direita = gloss PT, sem hànzì
  if (meaning.length > PAIR_MEANING_MAX) return false;
  if (meaning.split(/\s+/).filter(Boolean).length > 5) return false;
  return true;
}

function focusFromRef(ref: string): FocusItem | null {
  const [type, itemId] = ref.split(":");
  if (type === "chunk") {
    const chunk = chunkById[itemId];
    if (!chunk) return null;
    return {
      key: `chunk:${chunk.id}`,
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt.replace(/\.$/, ""),
      type: "chunk",
      itemId: chunk.id,
    };
  }
  if (type === "char") {
    const char = charById[itemId];
    if (!char) return null;
    return {
      key: `char:${char.id}`,
      hanzi: char.hanzi,
      pinyin: char.pinyin,
      meaningPt: char.meaningPt,
      type: "char",
      itemId: char.id,
    };
  }
  return null;
}

function focusFromText(text: string | undefined, pinyin?: string, meaningPt?: string): FocusItem | null {
  if (!containsCjk(text)) return null;
  const chunk = chunkForText(text);
  if (chunk) {
    return {
      key: `chunk:${chunk.id}`,
      hanzi: chunk.hanzi,
      pinyin: pinyin ?? chunk.pinyin,
      meaningPt: sanitizeMeaning(meaningPt, chunk.meaningPt.replace(/\.$/, "")),
      type: "chunk",
      itemId: chunk.id,
    };
  }

  const clean = cleanHanzi(text);
  if (clean.length === 1) {
    const char = charByHanzi.get(clean);
    if (char) {
      return {
        key: `char:${char.id}`,
        hanzi: char.hanzi,
        pinyin: pinyin ?? char.pinyin,
        meaningPt: sanitizeMeaning(meaningPt, char.meaningPt),
        type: "char",
        itemId: char.id,
      };
    }
  }

  // Fallback text:: só cria item para uma sequência curta de hànzì com gloss
  // limpo. Assim uma explicação ("木木木森" ⇒ "Três árvores formam 森...") nunca
  // vira FocusItem — e portanto nunca vira par, opção ou gloss.
  if (isCleanMeaningGloss(meaningPt) && CJK_ONLY_RE.test(clean) && clean.length <= 6) {
    return {
      key: `text:${clean}`,
      hanzi: clean,
      pinyin,
      meaningPt: meaningPt!.trim().replace(/\.$/, ""),
    };
  }

  return null;
}

function addFocusItem(items: FocusItem[], item: FocusItem | null) {
  if (!item?.hanzi?.trim() || !item.meaningPt?.trim()) return;
  const key = cleanHanzi(item.hanzi) || item.key;
  if (items.some((existing) => (cleanHanzi(existing.hanzi) || existing.key) === key)) return;
  items.push(item);
}

function focusLabel(item: FocusItem): string {
  return uniqueValues([item.hanzi, item.pinyin, item.meaningPt]).join(" · ");
}

function flatLessonMeta(lesson: Lesson): Partial<FlatLesson> {
  return lesson as Partial<FlatLesson>;
}

function lessonOrderIndex(lesson: Lesson): number {
  return ALL_LESSONS.findIndex((candidate) => candidate.id === lesson.id);
}

function lessonUnitId(lesson: Lesson): string | undefined {
  return flatLessonMeta(lesson).unitId;
}

function lessonPhaseOrder(lesson: Lesson): number {
  return flatLessonMeta(lesson).phaseOrder ?? 1;
}

function priorLessonsFor(lesson: Lesson, context: LessonPracticePlanContext): FlatLesson[] {
  const index = lessonOrderIndex(lesson);
  const prior = index >= 0 ? ALL_LESSONS.slice(0, index) : [];
  const completed = new Set(context.completedLessons ?? []);
  const completedPrior = completed.size > 0 ? prior.filter((candidate) => completed.has(candidate.id)) : prior;
  return completedPrior.slice(-10);
}

function moduleLessonsFor(lesson: Lesson): FlatLesson[] {
  const unitId = lessonUnitId(lesson);
  if (!unitId) return [];
  return ALL_LESSONS.filter((candidate) => candidate.unitId === unitId);
}

function itemsFromLessons(lessons: readonly Lesson[]): FocusItem[] {
  const items: FocusItem[] = [];
  for (const sourceLesson of lessons) {
    for (const ref of [...(sourceLesson.libraryItems ?? []), ...(sourceLesson.reviewItems ?? [])]) {
      addFocusItem(items, focusFromRef(ref));
    }
    for (const item of lessonFocusItems(sourceLesson)) addFocusItem(items, item);
  }
  return items;
}

function recentErrorFocusItems(errors: readonly LessonPracticeRecentError[] | undefined): FocusItem[] {
  const items: FocusItem[] = [];
  const sorted = [...(errors ?? [])]
    .filter((error) => !error.timestamp || error.timestamp > Date.now() - 1000 * 60 * 60 * 24 * 14)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  for (const error of sorted) {
    for (const target of error.targets ?? []) {
      addFocusItem(items, focusFromRef(`${target.type}:${target.itemId}`));
    }
    addFocusItem(items, focusFromText(error.hanzi ?? error.correctAnswer, error.pinyin, error.meaningPt));
    for (const token of error.tokens ?? []) addFocusItem(items, focusFromText(token, error.pinyin, error.meaningPt));
    if (items.length >= 8) break;
  }
  return items;
}

function moduleReviewContext(context: LessonPracticePlanContext) {
  return {
    completedLessons: context.completedLessons,
    recentErrors: context.recentErrors,
    srs: context.srs,
  };
}

function combinedReviewFocus(lesson: Lesson, context: LessonPracticePlanContext): FocusItem[] {
  const unitId = lessonUnitId(lesson);
  if (lesson.isReview && unitId) {
    return buildWeightedModuleReviewFocus(unitId, moduleReviewContext(context)).map((item) => ({
      key: item.key,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaningPt: item.meaningPt,
      type: item.type,
      itemId: item.itemId,
    }));
  }

  const items: FocusItem[] = [];
  for (const item of recentErrorFocusItems(context.recentErrors)) addFocusItem(items, item);
  for (const item of itemsFromLessons(priorLessonsFor(lesson, context)).reverse()) addFocusItem(items, item);
  for (const ref of CORE_REVIEW_REFS) addFocusItem(items, focusFromRef(ref));
  return items;
}

/**
 * Foco de revisão restrito ao que o aluno REALMENTE já encontrou — usado só
 * para montar `seenGlyphs`, nunca para montar a lição.
 *
 * `CORE_REVIEW_REFS` é uma lista fixa de frases-âncora que entra no foco de
 * revisão de toda lição, inclusive a primeira. Isso é bom para a conversa: uma
 * cena APRESENTA vocabulário, e conhecer 你好 basta para jogá-la. Mas o mesmo
 * foco de revisão também vira `seenGlyphs`, e `seenGlyphs` é a porta que libera
 * produção livre, transferência e pares mínimos — motores que EXIGEM produzir.
 *
 * Misturados, o resultado era cobrar 喝/水 (via chunk:woxianghe no núcleo) em
 * transferências muito antes do currículo ensinar 要/喝. Apresentar cedo é
 * ensinar; cobrar cedo é reprovar de véspera.
 *
 * A porta da produção conta só refs que o currículo já apresentou até aqui
 * (em qualquer fase). Conversas/revisão visual continuam vendo o núcleo inteiro.
 */
function seenFocusForProduction(lesson: Lesson, reviewFocus: readonly FocusItem[]): FocusItem[] {
  const introduced = curriculumRefsThroughLesson(lesson.id);
  return reviewFocus.filter((item) => {
    // Item sem ref veio do texto da própria lição — já está na tela do aluno.
    if (!item.type || !item.itemId) return true;
    return introduced.has(`${item.type}:${item.itemId}`);
  });
}

function hasBuilderForFocusItem(item: FocusItem): boolean {
  return [...cleanHanzi(item.hanzi)].some((glyph) => buildersForCharacter(glyph).length > 0);
}

/** Glifos `char:` da biblioteca/revisão — o mesmo conjunto que o portão de HanziBuilder usa. */
function lessonLibraryCharGlyphs(lesson: Lesson): string[] {
  const glyphs = new Set<string>();
  for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
    const [type, id] = String(ref).split(":");
    const hanzi = type === "char" ? charById[id]?.hanzi : undefined;
    if (hanzi) glyphs.add(hanzi);
  }
  return [...glyphs];
}

function isSimplyBuildableGlyph(glyph: string): boolean {
  return buildersForCharacter(glyph).some(
    (builder) =>
      (builder.mode === "fragments" || builder.mode === "complete") && !(builder.prerequisites?.length)
  );
}

/**
 * Mesma regra do validate:hanzi-builder-coverage: revisão com 2+ montáveis
 * exige 2 builders se for skill hànzì ou se houver 2+ montagens simples.
 */
function reviewRequiresTwoHanziBuilders(lesson: Lesson): boolean {
  if (!lesson.isReview) return false;
  const glyphs = lessonLibraryCharGlyphs(lesson);
  const buildable = glyphs.filter((glyph) => buildersForCharacter(glyph).length > 0);
  if (buildable.length < 2) return false;
  return lesson.skill === "hanzi" || glyphs.filter(isSimplyBuildableGlyph).length >= 2;
}

function isHanziFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  return lesson.skill === "hanzi" || id.includes("char-") || id.includes("hanzi") || id.startsWith("p5-");
}

function isPinyinFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  return lesson.skill === "som" || id.includes("tons-") || id.includes("pinyin") || id.includes("tom");
}

// Lições abstratas (pinyin, tom, gramática) não recebem imagem artificialmente;
// nas demais, o gerador só cria exercício visual se o foco tiver conceito concreto.
function lessonAllowsGeneratedImages(lesson: Lesson): boolean {
  return !isPinyinFocusedLesson(lesson);
}

export interface LessonImageCoverageInfo {
  /** Lição abstrata de pinyin/tom: nunca recebe imagem artificial. */
  abstract: boolean;
  /** Conceitos visuais concretos do foco, já liberados na unidade da lição. */
  conceptIds: string[];
  /** Lição concreta elegível: não abstrata e com pelo menos 1 conceito concreto. */
  eligible: boolean;
  /** Lição dedicada de hànzì concreto (skill hanzi, não revisão). */
  dedicatedConcreteHanzi: boolean;
}

/** Elegibilidade visual de uma lição — compartilhada com validate:image-exercises. */
export function lessonImageCoverageInfo(lesson: Lesson): LessonImageCoverageInfo {
  const unitIndex = lessonUnitIndex(lesson);
  const abstract = !lessonAllowsGeneratedImages(lesson);
  const focus = focusForPlanning(lesson, {});
  const conceptIds = uniqueValues(focus.map((item) => visualConceptForFocusItem(item, unitIndex)?.id));
  const eligible = !abstract && unitIndex >= 0 && conceptIds.length > 0;
  return {
    abstract,
    conceptIds,
    eligible,
    dedicatedConcreteHanzi: eligible && lesson.skill === "hanzi" && !lesson.isReview,
  };
}

function coreReviewFocusItems(): FocusItem[] {
  return CORE_REVIEW_REFS.map(focusFromRef).filter((item): item is FocusItem => Boolean(item));
}

function oldPhraseFocus(currentFocus: readonly FocusItem[], lesson?: Lesson): FocusItem[] {
  const current = new Set(currentFocus.map((item) => cleanHanzi(item.hanzi)));
  const introduced = lesson ? curriculumRefsThroughLesson(lesson.id) : null;
  return coreReviewFocusItems().filter((item) => {
    if (current.has(cleanHanzi(item.hanzi))) return false;
    // Só reusa frases do núcleo que o currículo já apresentou — senão 明天/这
    // vazam para fill_blank antes de existir no curso.
    if (!introduced) return true;
    if (!item.type || !item.itemId) return true;
    return introduced.has(`${item.type}:${item.itemId}`);
  });
}

/** Itens de revisão seguros para drills que COBRAM produção (fill/ditado). */
function focusSafeForProductionDrills(items: readonly FocusItem[], lessonId?: string): FocusItem[] {
  if (!lessonId) return [...items];
  const introduced = curriculumRefsThroughLesson(lessonId);
  return items.filter((item) => {
    if (!item.type || !item.itemId) return true;
    return introduced.has(`${item.type}:${item.itemId}`);
  });
}

function makeOldPhraseReuseStep(currentFocus: FocusItem[], lesson?: Lesson): LessonStep | null {
  const oldItems = oldPhraseFocus(currentFocus, lesson);
  if (oldItems.length === 0) return null;
  const pool = [...currentFocus, ...oldItems];
  for (const item of oldItems) {
    const fill = makeFillBlankStep(item, pool);
    if (fill) return fill;
    const dialogue = makeDialogueChoiceStep(
      item,
      pool,
      // Inclui a própria lição: o distrator pode reusar os mesmos caracteres do
      // alvo (我叫 vem de 你叫什么？ na mesma aula), sem introduzir nada novo.
      lesson ? curriculumGlyphsThroughLesson(lesson.id) : undefined
    );
    if (dialogue) return dialogue;
    const comprehend = makeComprehendStep(item, pool);
    if (comprehend) return comprehend;
    const listen = makeListenSelectStep(item, pool);
    if (listen) return listen;
  }
  return null;
}

function maxPinyinTasksForLesson(lesson: Lesson, pinyinRich: boolean): number {
  if (!pinyinRich) return 0;
  if (lesson.isReview) return 3;
  if (lesson.skill === "som") return 3;
  if (lesson.skill === "hanzi") return 2;
  if (lesson.skill === "sistema") return 2;
  return 1;
}

// Uma lição é "dedicada de montagem" quando a maior parte do que ela ensina
// são HanziBuilders (ex.: p1-primeiros-hanzi). Aí ela pode ter vários builders.
function authoredBuilderCount(lesson: Lesson): number {
  return lesson.steps.filter((step) => step.kind === "hanzi_build").length;
}

function withAuthoredVisualRoom(profile: LessonPracticeProfile, lesson: Lesson): LessonPracticeProfile {
  const authoredImages = lesson.steps.filter((step) => step.kind === "image_choice").length;
  if (authoredImages <= profile.maxImageChoices) return profile;
  const extra = authoredImages - profile.maxImageChoices;
  return { ...profile, targetCount: Math.min(18, profile.targetCount + extra) };
}

function isDedicatedBuilderLesson(lesson: Lesson): boolean {
  return authoredBuilderCount(lesson) >= 4;
}

function profileForLesson(lesson: Lesson, focus: FocusItem[]): LessonPracticeProfile {
  const phaseOrder = lessonPhaseOrder(lesson);
  const isFoundation = FOUNDATION_LESSON_IDS.includes(lesson.id);
  const authoredCount = lesson.steps.length;
  const relevantHanzi = focus.some(hasBuilderForFocusItem);
  const pinyinRich = focus.some((item) => Boolean(item.pinyin));
  const commonTarget = phaseOrder <= 2 ? 8 : phaseOrder <= 5 ? 9 : 10;
  const maxPinyinTasks = maxPinyinTasksForLesson(lesson, pinyinRich);

  // Aula dedicada de montagem: muitos builders, dificuldade misturada.
  if (isDedicatedBuilderLesson(lesson)) {
    const builds = authoredBuilderCount(lesson);
    const maxBuilds = Math.min(6, builds);
    const targetCount = Math.max(10, Math.min(14, Math.max(authoredCount, maxBuilds + 5)));
    return {
      targetCount,
      // Montagem entra em assembly e também na consolidação, para caber a
      // sequência sem virar uma parede de builders iguais em fila.
      stageTargets: { intro: 1, recognition: 1, assembly: maxBuilds, usage: 1, post_conversation: 0, consolidation: Math.max(2, targetCount - maxBuilds - 3) },
      minHanziBuilds: Math.min(5, builds),
      maxHanziBuilds: maxBuilds,
      perCharBuildCap: 3,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
      maxConversationScenes: maxConversationScenesForLesson(lesson),
      maxImageChoices: 2,
      isReview: Boolean(lesson.isReview),
    };
  }

  if (lesson.isReview || (lesson.skill === "sistema" && lesson.title.toLocaleLowerCase("pt-BR").includes("revis"))) {
    // V4.1.1: revisão compacta. 20+ passos no onboarding virava fadiga, não consolidação.
    const targetCount = Math.max(10, Math.min(12, Math.max(authoredCount, focus.length >= 8 ? 12 : 10)));
    // Revisão de módulo: 2 builders quando o portão de cobertura exige (hànzì
    // relevante OU 2+ montáveis simples na biblioteca — ex.: l5-rev em fala).
    const needsTwoBuilders = relevantHanzi || reviewRequiresTwoHanziBuilders(lesson);
    return {
      targetCount,
      stageTargets: { intro: 2, recognition: 3, assembly: 3, usage: 2, post_conversation: 0, consolidation: targetCount - 10 },
      minHanziBuilds: needsTwoBuilders ? 2 : 0,
      maxHanziBuilds: needsTwoBuilders ? (lesson.skill === "hanzi" ? 3 : 2) : 0,
      perCharBuildCap: 2,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
      maxConversationScenes: maxConversationScenesForLesson(lesson),
      maxImageChoices: 3,
      isReview: Boolean(lesson.isReview),
    };
  }

  if (isFoundation || lesson.skill === "sistema") {
    const authoredCount = lesson.steps.length;
    // Lições-conceito: sem conversa/ditado gerados (R9). Para passar
    // validate:exercise-depth, sobra reconhecimento + consolidação com
    // kinds permitidos (comprehend, dialogue_choice, match_pairs…).
    const conceptNonHanzi = isFoundation && lesson.skill !== "hanzi" && lesson.id !== "p1-engine-2-lab";
    const recognition = conceptNonHanzi ? 2 : 2;
    // assembly 1: preserva sentence_build autoral (profundidade / frase real).
    // usage 1: dialogue/fill permitidos; cena só entra se for autorada
    // (maxConversationScenesForLesson conta cenas escritas, não gera extras).
    const assembly = conceptNonHanzi ? 1 : lesson.skill === "hanzi" ? 2 : 1;
    const usage = lesson.id === "p1-primeiros-hanzi" ? 0 : 1;
    // V4.1.1: comunicação substitui padding. Não somar 4–5 drills gerados
    // em cima do conteúdo autoral da fundação.
    const targetCount = authoredCount;
    const consolidation = Math.max(2, targetCount - 1 - recognition - assembly - usage);
    return {
      targetCount,
      stageTargets: {
        intro: 1,
        recognition,
        assembly,
        usage,
        post_conversation: 0,
        consolidation,
      },
      minHanziBuilds: 0,
      maxHanziBuilds: conceptNonHanzi ? 0 : relevantHanzi ? 1 : 0,
      perCharBuildCap: 2,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
      maxConversationScenes: maxConversationScenesForLesson(lesson),
      maxImageChoices: conceptNonHanzi ? 0 : 2,
      isReview: Boolean(lesson.isReview),
    };
  }

  if (lesson.curriculumRole === "perception_lab") {
    // Lab de percepção: o plano segue o autoral. Padding gerado transformava
    // 5 passos de tom em 12 e reabria a parede fonética no onboarding.
    const targetCount = authoredCount;
    return {
      targetCount,
      stageTargets: {
        intro: 1,
        recognition: Math.min(2, targetCount - 2),
        assembly: 1,
        usage: 1,
        post_conversation: 0,
        consolidation: Math.max(0, targetCount - 5),
      },
      minHanziBuilds: 0,
      maxHanziBuilds: 0,
      perCharBuildCap: 1,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
      maxConversationScenes: 0,
      maxImageChoices: 1,
      isReview: false,
    };
  }

  const targetCount = Math.max(6, Math.min(12, Math.max(authoredCount, commonTarget)));
  const hanziLesson = isHanziFocusedLesson(lesson);
  // Lição de hànzì: 2–4 builders quando há 2+ caracteres; um único caractere → 1.
  const focusCharCount = focus.filter((item) => item.type === "char" || cleanHanzi(item.hanzi).length === 1).length;
  const maxBuilds = relevantHanzi ? (hanziLesson ? Math.min(4, Math.max(1, focusCharCount)) : 1) : 0;
  const minBuilds = relevantHanzi && hanziLesson ? Math.min(2, Math.max(1, focusCharCount)) : 0;
  const pinyinCap = isPinyinFocusedLesson(lesson)
    ? maxPinyinTasksForLesson(lesson, pinyinRich)
    : Math.min(1, maxPinyinTasksForLesson(lesson, pinyinRich));
  const maxConversationScenes = maxConversationScenesForLesson(lesson);
  const authoredUnaided = lesson.steps.filter(
    (step) => step.kind === "free_production" || step.kind === "transfer_task"
  ).length;
  // Com 2 conversas, usage precisa de vaga extra — senão a segunda cena nunca entra.
  // Produção independente autorada também precisa de vaga em usage (V4.2).
  const usageSlots = Math.max(1, Math.min(2, maxConversationScenes) + authoredUnaided);
  return {
    targetCount: Math.max(targetCount, targetCount + Math.max(0, maxConversationScenes - 1)),
    stageTargets: {
      intro: 1,
      recognition: 2,
      assembly: 2,
      usage: usageSlots,
      post_conversation: 0,
      consolidation: Math.max(1, targetCount - 5 - usageSlots),
    },
    minHanziBuilds: minBuilds,
    maxHanziBuilds: maxBuilds,
    perCharBuildCap: 2,
    maxPinyinTasks: pinyinCap,
    needsPinyinTask: pinyinRich && (phaseOrder <= 4 || isPinyinFocusedLesson(lesson) || Boolean(lesson.isReview)),
    maxConversationScenes,
    maxImageChoices: 2,
    isReview: Boolean(lesson.isReview),
  };
}

function isGreetingFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  if (id.includes("nihao") || id.includes("cumpriment") || id.includes("conversa") || id.includes("cortesia") || id.includes("ate-logo") || id.includes("qingwen")) {
    return true;
  }
  const refs = [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])];
  const seedRefs = refs.filter((ref) =>
    /chunk:(nihao|xiexie|zaijian|bukeqi|nihaoma)\b/.test(String(ref))
  );
  // Explicit greeting teaching: seed chunks dominate library (not just a review bridge).
  const librarySeeds = (lesson.libraryItems ?? []).filter((ref) =>
    /chunk:(nihao|xiexie|zaijian|bukeqi|nihaoma)\b/.test(String(ref))
  );
  if (librarySeeds.length > 0 && librarySeeds.length >= Math.ceil((lesson.libraryItems?.length ?? 1) / 2)) {
    return true;
  }
  // Engine lab / early greeting module
  if (lesson.id === "p1-engine-2-lab" || lesson.id === "l1" || lesson.id === "l2" || lesson.id === "l3" || lesson.id === "l4") {
    return seedRefs.length > 0;
  }
  return false;
}

/**
 * PED-021/027: after greetings are introduced, tone/hanzi lessons must not keep
 * treating 你好/谢谢 as the practice target. Keep them only when the lesson
 * explicitly teaches greetings (or is a review of that module).
 */
function practiceFocusForLesson(lesson: Lesson, focus: FocusItem[]): FocusItem[] {
  if (lesson.isReview || isGreetingFocusedLesson(lesson)) return focus;
  const filtered = focus.filter((item) => {
    const h = cleanHanzi(item.hanzi);
    if (isSeedFillerHanzi(h)) {
      // Allow single-glyph parts of greetings when the lesson teaches those chars.
      if (h.length === 1) return true;
      return false;
    }
    return true;
  });
  return filtered.length > 0 ? filtered : focus;
}

function focusForPlanning(lesson: Lesson, context: LessonPracticePlanContext): FocusItem[] {
  const focus = lessonFocusItems(lesson);
  if (lesson.isReview) {
    const unitId = lessonUnitId(lesson);
    const unit = unitId ? JOURNEY.flatMap((phase) => phase.units).find((entry) => entry.id === unitId) : undefined;
    if (unit) {
      for (const item of resolveModuleFocusItems(unit)) {
        addFocusItem(focus, {
          key: item.key,
          hanzi: item.hanzi,
          pinyin: item.pinyin,
          meaningPt: item.meaningPt,
          type: item.type,
          itemId: item.itemId,
        });
      }
    }
    for (const item of itemsFromLessons(moduleLessonsFor(lesson))) addFocusItem(focus, item);
  }
  for (const item of recentErrorFocusItems(context.recentErrors)) addFocusItem(focus, item);
  return focus;
}

function stageVocabulary(
  stageId: LessonStageId,
  focus: FocusItem[]
): Pick<LessonStep, "introducesNewVocabulary" | "reusesPreviousVocabulary"> {
  const labels = focus.slice(0, stageId === "consolidation" ? 4 : 3).map(focusLabel);
  if (stageId === "intro") {
    return {
      introducesNewVocabulary: labels,
      reusesPreviousVocabulary: [],
    };
  }
  return {
    introducesNewVocabulary: [],
    reusesPreviousVocabulary: labels,
  };
}

function stageObjectiveFor(stageId: LessonStageId): string {
  return STAGE_DETAILS[stageId].objective;
}

export function lessonExerciseLabels(kinds: readonly StepKind[] | undefined): string[] {
  if (!kinds?.length) return [];
  return uniqueValues(kinds.map((kind) => STEP_KIND_LABELS[kind] ?? kind));
}

function lessonFocusItems(lesson: Lesson): FocusItem[] {
  const items: FocusItem[] = [];
  for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
    addFocusItem(items, focusFromRef(ref));
  }

  for (const step of lesson.steps) {
    if (step.kind === "flashcard" && step.chunkId) addFocusItem(items, focusFromRef(`chunk:${step.chunkId}`));
    if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) {
      addFocusItem(items, focusFromRef(`char:${step.charId}`));
    }
    if (step.kind === "listen") addFocusItem(items, focusFromText(step.text, step.pinyin, step.pt));
    if (step.kind === "tone") addFocusItem(items, focusFromText(step.hanzi, step.pinyin));
    if (step.kind === "comprehend") addFocusItem(items, focusFromText(step.hanzi, step.pinyin, step.answer));
    if (step.kind === "listen_select") addFocusItem(items, focusFromText(step.audioText ?? step.correctAnswer, undefined, step.explanation));
    if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "hanzi_build") {
      addFocusItem(items, focusFromText(step.correctAnswer ?? step.targetParts?.join(""), step.sourcePinyin, step.explanation));
    }
    if (step.kind === "fill_blank") {
      addFocusItem(items, focusFromText(step.correctAnswer ?? `${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`, undefined, step.explanation));
    }
    if (step.kind === "dialogue_choice") addFocusItem(items, focusFromText(step.correctAnswer ?? step.answer, undefined, step.explanation));
    if (step.kind === "conversation_scene") {
      for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? [])]) {
        addFocusItem(items, focusFromRef(ref));
      }
      addFocusItem(items, focusFromText(step.correctAnswer ?? step.checkpoint?.correctAnswer, undefined, step.explanation));
    }
    if (step.kind === "image_choice") {
      addFocusItem(items, focusFromText(step.targetHanzi, step.targetPinyin, step.targetMeaningPt));
      if (step.imageId) addFocusItem(items, focusFromText(step.targetHanzi, step.targetPinyin, step.targetMeaningPt));
    }
    for (const line of step.lines ?? []) addFocusItem(items, focusFromText(line.hanzi, line.pinyin, line.pt));
    for (const pair of step.pairs ?? []) {
      const hanziSide = containsCjk(pair.left) ? pair.left : containsCjk(pair.right) ? pair.right : undefined;
      const meaningSide = containsCjk(pair.left) ? pair.right : containsCjk(pair.right) ? pair.left : undefined;
      addFocusItem(items, focusFromText(hanziSide, undefined, meaningSide));
    }
  }

  return items;
}

/** PED-021: greeting seeds must not pad every MCQ when the lesson is not about them. */
const SEED_FILLER_HANZI = new Set([
  "你好",
  "谢谢",
  "再见",
  "不客气",
  "早上好",
  "晚上好",
  "你好吗",
]);

function isSeedFillerHanzi(hanzi: string): boolean {
  const cleaned = cleanHanzi(hanzi);
  if (SEED_FILLER_HANZI.has(cleaned)) return true;
  // Frases ancoradas no seed (ex.: 请问，你好吗？) contam como filler de cumprimento.
  for (const seed of SEED_FILLER_HANZI) {
    if (seed.length >= 2 && cleaned.includes(seed)) return true;
  }
  return false;
}

function focusAllowsSeedDistractor(focus: FocusItem[], seedHanzi: string): boolean {
  const needle = cleanHanzi(seedHanzi);
  return focus.some((item) => {
    const h = cleanHanzi(item.hanzi);
    return h === needle || h.includes(needle) || needle.includes(h);
  });
}

/**
 * Prefer lesson focus distractors; demote global greeting seeds used as filler
 * (PED-021 / PED-026). Seeds remain valid when the target or focus is about them.
 */
function rankedDistractorHanzi(target: FocusItem, focus: FocusItem[]): string[] {
  const targetHanzi = cleanHanzi(target.hanzi);
  const fromFocus = focus
    .filter((item) => item.key !== target.key && cleanHanzi(item.hanzi) !== targetHanzi)
    .map((item) => item.hanzi);
  const fromChunks = CHUNKS.filter((chunk) => cleanHanzi(chunk.hanzi) !== targetHanzi).map(
    (chunk) => chunk.hanzi
  );
  const fromChars = CHARACTERS.filter((char) => cleanHanzi(char.hanzi) !== targetHanzi).map(
    (char) => char.hanzi
  );
  const allowSeed = isSeedFillerHanzi(target.hanzi);
  const preferred: string[] = [];
  const demoted: string[] = [];
  for (const hanzi of [...fromFocus, ...fromChunks, ...fromChars]) {
    if (
      !allowSeed &&
      isSeedFillerHanzi(hanzi) &&
      !focusAllowsSeedDistractor(focus, hanzi)
    ) {
      demoted.push(hanzi);
      continue;
    }
    preferred.push(hanzi);
  }
  return uniqueValues([target.hanzi, ...preferred, ...demoted]);
}

function optionMeanings(target: FocusItem, focus: FocusItem[]): string[] {
  const targetHanzi = cleanHanzi(target.hanzi);
  const allowSeed = isSeedFillerHanzi(target.hanzi);
  const fromFocus = focus
    .filter((item) => item.key !== target.key)
    .map((item) => item.meaningPt);
  const preferred: string[] = [];
  const demoted: string[] = [];
  for (const chunk of CHUNKS) {
    if (cleanHanzi(chunk.hanzi) === targetHanzi) continue;
    const meaning = chunk.meaningPt.replace(/\.$/, "");
    if (
      !allowSeed &&
      isSeedFillerHanzi(chunk.hanzi) &&
      !focusAllowsSeedDistractor(focus, chunk.hanzi)
    ) {
      demoted.push(meaning);
      continue;
    }
    preferred.push(meaning);
  }
  return uniqueValues([target.meaningPt, ...fromFocus, ...preferred, ...demoted]).slice(0, 4);
}

function optionHanzi(target: FocusItem, focus: FocusItem[]): string[] {
  return rankedDistractorHanzi(target, focus).slice(0, 4);
}

function makeComprehendStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const options = optionMeanings(item, focus);
  if (options.length < 2) return null;
  return {
    kind: "comprehend",
    title: "Reconheça o sentido",
    hanzi: item.hanzi,
    pinyin: item.pinyin,
    answer: item.meaningPt,
    options,
  };
}

function makeListenSelectStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const options = optionHanzi(item, focus);
  if (options.length < 2) return null;
  return {
    kind: "listen_select",
    title: "Ouça e escolha",
    prompt: "Toque no que você ouviu.",
    audioText: item.hanzi,
    slowAudioText: item.hanzi,
    options,
    correctAnswer: item.hanzi,
    explanation: `${item.hanzi} = ${item.meaningPt}`,
  };
}

function optionPinyin(target: FocusItem, focus: FocusItem[]): string[] {
  // Dedup por BASE sem tom (não por forma exibida): distractores que só diferem
  // do alvo no tom (妈 mā vs 麻 má vs 马 mǎ vs 骂 mà, todos base "ma") são
  // descartados, e a busca segue nos chunks/caracteres até achar bases DE FATO
  // diferentes. Assim a escolha de pinyin nunca mostra 4 opções que parecem
  // iguais — cada alternativa tem uma sílaba/base distinta.
  const allowSeed = isSeedFillerHanzi(target.hanzi);
  const fromFocus = focus.filter((item) => item.key !== target.key).map((item) => item.pinyin);
  const preferred: string[] = [];
  const demoted: string[] = [];
  for (const chunk of CHUNKS) {
    if (cleanHanzi(chunk.hanzi) === cleanHanzi(target.hanzi)) continue;
    if (
      !allowSeed &&
      isSeedFillerHanzi(chunk.hanzi) &&
      !focusAllowsSeedDistractor(focus, chunk.hanzi)
    ) {
      demoted.push(chunk.pinyin);
      continue;
    }
    preferred.push(chunk.pinyin);
  }
  for (const char of CHARACTERS) {
    if (cleanHanzi(char.hanzi) === cleanHanzi(target.hanzi)) continue;
    preferred.push(char.pinyin);
  }
  return uniqueByPinyinBase([target.pinyin, ...fromFocus, ...preferred, ...demoted]).slice(0, 4);
}

function makeRecognizeStep(item: FocusItem): LessonStep | null {
  if (item.type === "char" && item.itemId) return { kind: "recognize", charId: item.itemId };
  const char = firstKnownChar(item);
  return char ? { kind: "recognize", charId: char.id } : null;
}

function makeDecomposeStep(item: FocusItem): LessonStep | null {
  if (item.type === "char" && item.itemId) return { kind: "decompose", charId: item.itemId };
  const char = firstKnownChar(item);
  return char ? { kind: "decompose", charId: char.id } : null;
}

function makePinyinChoiceStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  if (!item.pinyin?.trim()) return null;
  const options = optionPinyin(item, focus);
  // Só gera a pergunta se houver 3+ opções de bases diferentes; caso contrário
  // vira pegadinha inválida (todas iguais). Quem chama tenta outra microtarefa
  // (listen_select, tom, comprehend, par curto).
  if (options.length < 3) return null;
  // Rede de segurança: mesmo já deduplicando por base, nunca deixa passar um
  // conjunto que "parece repetido" (diferenças só de tom). "Escolha o pinyin"
  // testa a leitura da sílaba, não o tom — treino de tom tem passo próprio.
  if (isNearDuplicatePinyinSet(options)) return null;
  const answerKey = normalizePinyinOptionForUniqueness(item.pinyin);
  if (!options.some((option) => normalizePinyinOptionForUniqueness(option) === answerKey)) return null;
  // O enunciado mostra 我叫<Nome>: se só a resposta trouxer o nome, basta casar
  // as letras latinas. As variantes em pinyin tiram essa pista.
  const namedPinyin = item.pinyin ? nameCarryingOptions(item.pinyin, undefined) : null;
  return {
    kind: "dialogue_choice",
    title: "Escolha o pinyin",
    speaker: "Pinyin",
    dialoguePrompt: `Qual pinyin combina com ${item.hanzi}?`,
    sourceText: item.hanzi,
    sourcePinyin: item.pinyin,
    options: namedPinyin ?? options,
    correctAnswer: item.pinyin,
    explanation: `${item.hanzi} se lê ${item.pinyin}.`,
  };
}

function firstKnownChar(item: FocusItem) {
  for (const glyph of cleanHanzi(item.hanzi)) {
    const char = charByHanzi.get(glyph);
    if (char) return char;
  }
  return undefined;
}

function makeToneMicroStep(item: FocusItem): LessonStep | null {
  const char = firstKnownChar(item);
  if (!char || char.tone < 1 || char.tone > 4) return null;
  const tone = char.tone as 1 | 2 | 3 | 4;
  return {
    kind: "tone",
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    tone,
    assist: "guided",
  };
}

function makeTonePairStep(focus: FocusItem[]): LessonStep | null {
  const seen = new Set<string>();
  const pairs: NonNullable<LessonStep["pairs"]> = [];
  for (const item of focus) {
    const char = firstKnownChar(item);
    if (!char || char.tone < 1 || char.tone > 4 || seen.has(char.hanzi)) continue;
    seen.add(char.hanzi);
    pairs.push({
      left: char.hanzi,
      right: `${char.tone}º tom · ${char.pinyin}`,
      leftType: "hanzi",
      rightType: "pinyin",
      reinforcement: true,
      reviewType: "char",
      reviewItemId: char.id,
    });
    if (pairs.length >= 4) break;
  }
  if (pairs.length < 2) return null;
  return {
    kind: "tone_pair",
    title: "Tons em pares",
    body: "Combine hànzì, tom e pinyin sem usar pinyin numérico.",
    pairs,
    explanation: "Tons voltam em blocos curtos para fortalecer ouvido e leitura.",
  };
}

// ————————————————————————————————————————————————————————————————
// Motores de percepção e sentido
//
// Estes quatro geradores fazem o vocabulário da lição voltar por caminhos
// que a jornada não cobria: discriminar dois sons, escrever o que ouviu,
// agrupar por sentido e julgar estrutura. Conteúdo em perceptionDrills.ts —
// aqui só entra a decisão pedagógica de QUANDO cada um cabe.
// ————————————————————————————————————————————————————————————————

/**
 * Glifos que o currículo já apresentou até esta lição (inclusive). Serve de
 * piso para liberar os drills mesmo quando o estado do aluno ainda não foi
 * carregado — a progressão é a mesma da jornada, não uma lista paralela.
 */
let curriculumGlyphsCache: Map<string, Set<string>> | null = null;
export function curriculumGlyphsThroughLesson(lessonId: string | undefined): ReadonlySet<string> {
  if (!lessonId) return new Set<string>();
  if (!curriculumGlyphsCache) {
    curriculumGlyphsCache = new Map();
    const cumulative = new Set<string>();
    for (const lesson of ALL_LESSONS) {
      for (const item of lessonFocusItems(lesson)) {
        for (const glyph of cleanHanzi(item.hanzi)) cumulative.add(glyph);
      }
      curriculumGlyphsCache.set(lesson.id, new Set(cumulative));
    }
  }
  return curriculumGlyphsCache.get(lessonId) ?? new Set<string>();
}

function curriculumGlyphsBeforeLesson(lessonId: string | undefined): ReadonlySet<string> {
  if (!lessonId) return new Set<string>();
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index <= 0) return new Set<string>();
  return curriculumGlyphsThroughLesson(ALL_LESSONS[index - 1]?.id);
}

function allCjkGlyphsKnown(hanzi: string, known: ReadonlySet<string> | undefined): boolean {
  if (!known) return false;
  const glyphs = [...cleanHanzi(hanzi)].filter((glyph) => CJK_RE.test(glyph));
  return glyphs.length > 0 && glyphs.every((glyph) => known.has(glyph));
}

/** Semente estável por lição+estágio: gira os drills sem virar sorteio. */
function drillSeedFor(lessonId: string | undefined, stageId: LessonStageId): number {
  let hash = 0;
  for (const char of `${lessonId ?? ""}|${stageId}`) hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  return hash;
}

function knownGlyphsFor(options: SupplementalStepOptions): ReadonlySet<string> {
  const glyphs = new Set<string>(curriculumGlyphsThroughLesson(options.lessonId));
  for (const glyph of options.seenGlyphs ?? []) glyphs.add(glyph);
  return glyphs;
}

// ————————————————————————————————————————————————————————————————
// Índice de exposição de estruturas
//
// Política: transfer_task só depois de exposição + completion/build +
// free_production guiada da MESMA estrutura. Vocabulário sozinho não basta.
// ————————————————————————————————————————————————————————————————

const COMPLETION_KINDS = new Set<string>(["fill_blank"]);
const BUILD_KINDS = new Set<string>([
  "sentence_build",
  "translation_build",
  "sentence_lab_distractors",
  "sentence_lab_audio",
  "sentence_lab_no_translation",
  "sentence_lab_repair",
  "produce",
]);
const EXPOSURE_KINDS = new Set<string>([
  "recognize",
  "comprehend",
  "listen_select",
  "listen",
  "flash",
  "read",
  "dialogue_choice",
]);

function stepHanziBlob(step: {
  hanzi?: string;
  text?: string;
  answer?: string;
  correctAnswer?: string;
  targetParts?: string[];
  target?: string[];
  productionFrameId?: string;
}): string {
  return cleanHanzi(
    step.hanzi ||
      step.text ||
      step.correctAnswer ||
      step.answer ||
      step.targetParts?.join("") ||
      step.target?.join("") ||
      ""
  );
}

/** Credita rungs a partir de um passo (autoral ou gerado). */
/** Credita rungs a partir de um passo (autoral ou gerado). */
export function creditStructureFromStep(map: StructureExposureMap, step: LessonStep): void {
  if (step.productionFrameId) {
    const rungs = ensureStructureRungs(map, step.productionFrameId);
    rungs.exposed = true;
    if (step.kind === "free_production" && !step.productionOpen) {
      rungs.guidedProduction = true;
      rungs.completion = true;
      rungs.build = true;
    }
    if (step.kind === "transfer_task") {
      rungs.guidedProduction = true;
    }
  }

  const blobs = [
    stepHanziBlob(step),
    ...(step.lines ?? []).map((line) => cleanHanzi(line.hanzi)),
    ...(step.nodes ?? []).map((node) => cleanHanzi(node.hanzi)),
  ].filter(Boolean);

  for (const blob of blobs) {
    if (EXPOSURE_KINDS.has(step.kind) || step.kind === "conversation_scene") {
      creditStructureText(map, blob, "exposed");
    }
    if (COMPLETION_KINDS.has(step.kind)) creditStructureText(map, blob, "completion");
    if (BUILD_KINDS.has(step.kind)) creditStructureText(map, blob, "build");
    if (step.kind === "free_production" && !step.productionOpen) {
      creditStructureText(map, blob, "guidedProduction");
      creditStructureText(map, blob, "completion");
      creditStructureText(map, blob, "build");
    }
  }
}

/** Exposição só do currículo autoral + foco (sem planos gerados). */
function curriculumStructureExposureForLesson(lesson: Lesson): StructureExposureMap {
  const map: StructureExposureMap = new Map();
  for (const item of lessonFocusItems(lesson)) {
    creditStructureText(map, item.hanzi, "exposed");
    if (item.type === "chunk" && item.itemId) creditStructureAnchorChunk(map, item.itemId);
    // Foco da lição: assembly vai oferecer sentence_build → build prospectivo.
    for (const frame of framesMatchingSentence(item.hanzi)) {
      const rungs = ensureStructureRungs(map, frame.id);
      rungs.exposed = true;
      rungs.build = true;
      rungs.completion = true;
    }
  }
  for (const step of lesson.steps) {
    creditStructureFromStep(map, step);
  }
  return map;
}

interface StructureExposureBundle {
  /** Prior + currículo desta lição (gate de free/open). */
  forFree: StructureExposureMap;
  /** Só histórico anterior, incluindo planos gerados (gate de transfer). */
  forTransfer: StructureExposureMap;
}

/**
 * PERF-012/013 — o índice é construído INCREMENTALMENTE, lição a lição.
 *
 * Antes, qualquer acesso disparava a construção do índice inteiro: montar o
 * plano de prática das 127 lições para abrir uma. Medido em ~12 s de CPU
 * síncrona em máquina de servidor — no Android real é o congelamento relatado.
 * `startTransition` não ajudava porque só muda prioridade de render; o trabalho
 * continuava na main thread.
 *
 * Abrir a lição N só depende do histórico até N. O estado abaixo mantém o
 * progresso da varredura para que cada lição pague apenas o próprio custo, uma
 * única vez. Relatórios e validators seguem pedindo o índice completo.
 */
const structureExposureIndex = new Map<string, StructureExposureBundle>();
/** Frames que já tiveram transfer_task em lição ANTERIOR (por lessonId). */
const priorTransferredFramesIndex = new Map<string, ReadonlySet<string>>();
let structureExposureIndexBuilding = false;
/** Quantas lições da jornada já foram incorporadas ao índice. */
let structureExposureBuiltCount = 0;
/** Exposição acumulada das lições já varridas (entrada da próxima). */
let structureExposureRunningPrior: StructureExposureMap = new Map();
/** Frames já transferidos até `structureExposureBuiltCount`. */
const structureExposureRunningTransferred = new Set<string>();

const lessonOrderById = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));

function emptyExposureBundle(): StructureExposureBundle {
  return { forFree: new Map(), forTransfer: new Map() };
}

/**
 * Monta o índice lição a lição. Transferência exige produção guiada em lição
 * ANTERIOR; free na lição atual pode usar foco/autoral da própria lição.
 */
/**
 * Varre a jornada até `throughIndex` (inclusive), aproveitando o que já foi
 * construído antes. Chamar com a última lição equivale ao índice completo.
 */
function buildStructureExposureThrough(throughIndex: number): void {
  const target = Math.min(throughIndex, ALL_LESSONS.length - 1);
  if (structureExposureIndexBuilding || structureExposureBuiltCount > target) return;
  structureExposureIndexBuilding = true;
  // PERF-010 — mede quanto a construção do índice custa nesta abertura.
  timeLessonPlannerPhase("structure_exposure_index", () => {
  try {
    for (let index = structureExposureBuiltCount; index <= target; index += 1) {
      const lesson = ALL_LESSONS[index];
      priorTransferredFramesIndex.set(lesson.id, new Set(structureExposureRunningTransferred));
      const forTransfer = cloneStructureExposure(structureExposureRunningPrior);
      const forFree = cloneStructureExposure(structureExposureRunningPrior);
      mergeStructureExposure(forFree, curriculumStructureExposureForLesson(lesson));
      structureExposureIndex.set(lesson.id, {
        forFree: cloneStructureExposure(forFree),
        forTransfer: cloneStructureExposure(forTransfer),
      });
      const plan = buildLessonPracticePlan(lesson, {
        silent: true,
        skipStructureExposureIndex: true,
        structureExposure: forFree,
        structureExposureForTransfer: forTransfer,
        priorTransferredFrames: priorTransferredFramesIndex.get(lesson.id),
      });
      const fromPlan: StructureExposureMap = new Map();
      for (const step of plan) {
        creditStructureFromStep(fromPlan, step);
        if (step.kind === "transfer_task" && step.productionFrameId) {
          structureExposureRunningTransferred.add(step.productionFrameId);
        }
      }
      mergeStructureExposure(structureExposureRunningPrior, fromPlan);
      // Currículo desta lição também alimenta o histórico da próxima.
      mergeStructureExposure(
        structureExposureRunningPrior,
        curriculumStructureExposureForLesson(lesson)
      );
      structureExposureBuiltCount = index + 1;
    }
  } finally {
    structureExposureIndexBuilding = false;
  }
  });
}

/** Índice completo — usado por relatórios e validators, não pelo player. */
function ensureStructureExposureIndex(): void {
  buildStructureExposureThrough(ALL_LESSONS.length - 1);
}

/**
 * Índice apenas até a lição pedida. É o caminho do player: abrir a lição 1
 * deixou de custar as 127 lições da jornada.
 */
function ensureStructureExposureIndexFor(lessonId: string | undefined): void {
  const index = lessonId === undefined ? undefined : lessonOrderById.get(lessonId);
  if (index === undefined) {
    // Lição fora da jornada (mastery, avulsa): só o histórico completo responde.
    ensureStructureExposureIndex();
    return;
  }
  buildStructureExposureThrough(index);
}

/**
 * PERF-012 — decodifica o índice pré-computado no build.
 *
 * Quem abre uma lição não paga mais NADA por este índice: a varredura das 127
 * lições foi resolvida em build (ver scripts/build-structure-exposure-index.mjs)
 * e `validate:structure-index` garante que o artefato não diverge da jornada.
 * A construção incremental continua como fallback — lição fora do artefato
 * (mastery, avulsa) ou artefato ausente em algum ambiente.
 */
function decodeRungs(mask: number): StructurePracticeRungs {
  return {
    exposed: (mask & 1) !== 0,
    completion: (mask & 2) !== 0,
    build: (mask & 4) !== 0,
    guidedProduction: (mask & 8) !== 0,
  };
}

function decodeExposureMap(encoded: Record<string, number>): StructureExposureMap {
  const map: StructureExposureMap = new Map();
  for (const [frameId, mask] of Object.entries(encoded)) map.set(frameId, decodeRungs(mask));
  return map;
}

/**
 * O gerador e o `validate:structure-index` precisam recalcular do zero. Sem
 * isto o validador leria de volta o próprio artefato e aprovaria qualquer
 * corrupção — a checagem seria circular e inútil.
 */
let ignorePrecomputedExposure = false;

export function setIgnorePrecomputedStructureExposure(value: boolean): void {
  ignorePrecomputedExposure = value;
}

function precomputedExposureFor(lessonId: string): StructureExposureBundle | null {
  if (ignorePrecomputedExposure) return null;
  const entry = PRECOMPUTED_STRUCTURE_EXPOSURE[lessonId];
  if (!entry) return null;
  return { forFree: decodeExposureMap(entry.free), forTransfer: decodeExposureMap(entry.transfer) };
}

function priorTransferredFramesForLesson(lessonId: string | undefined): ReadonlySet<string> {
  if (!lessonId) return new Set();
  const precomputed = ignorePrecomputedExposure ? undefined : PRECOMPUTED_STRUCTURE_EXPOSURE[lessonId];
  if (precomputed) return new Set(precomputed.priorTransferred);
  ensureStructureExposureIndexFor(lessonId);
  return priorTransferredFramesIndex.get(lessonId) ?? new Set();
}

function structureExposureForLesson(lessonId: string | undefined): StructureExposureBundle {
  if (!lessonId) return emptyExposureBundle();
  const precomputed = precomputedExposureFor(lessonId);
  if (precomputed) return precomputed;
  ensureStructureExposureIndexFor(lessonId);
  return structureExposureIndex.get(lessonId) ?? emptyExposureBundle();
}

/** Snapshot público para validators / auditoria. */
export function structureExposureSnapshotForLesson(lessonId: string): StructureExposureBundle {
  return structureExposureForLesson(lessonId);
}

/** Snapshot público dos frames já transferidos — usado pelo gerador do índice. */
export function priorTransferredFramesSnapshotForLesson(lessonId: string): ReadonlySet<string> {
  return priorTransferredFramesForLesson(lessonId);
}

/**
 * PERF-011 — preaquece o índice O(n²) de exposição estrutural antes do player.
 * Idempotente; seguro em idle callback na página de detalhe.
 */
export function prewarmLessonPlanner(lessonId: string): void {
  void structureExposureForLesson(lessonId);
}

export function structureFirstOccurrenceReport(): Array<{
  frameId: string;
  patternPt: string;
  firstExposedLessonId: string | null;
  firstGuidedProductionLessonId: string | null;
  firstTransferLessonId: string | null;
}> {
  ensureStructureExposureIndex();
  const firstExposed = new Map<string, string>();
  const firstGuided = new Map<string, string>();
  const firstTransfer = new Map<string, string>();
  let prior: StructureExposureMap = new Map();
  for (const lesson of ALL_LESSONS) {
    const curriculum = curriculumStructureExposureForLesson(lesson);
    for (const [frameId, rungs] of curriculum) {
      if (rungs.exposed && !firstExposed.has(frameId)) firstExposed.set(frameId, lesson.id);
    }
    const bundle = structureExposureIndex.get(lesson.id);
    const plan = buildLessonPracticePlan(lesson, {
      silent: true,
      skipStructureExposureIndex: true,
      structureExposure: bundle?.forFree ?? curriculum,
      structureExposureForTransfer: bundle?.forTransfer ?? prior,
    });
    for (const step of plan) {
      if (step.kind === "free_production" && !step.productionOpen && step.productionFrameId) {
        if (!firstGuided.has(step.productionFrameId)) firstGuided.set(step.productionFrameId, lesson.id);
      }
      if (step.kind === "transfer_task" && step.productionFrameId) {
        if (!firstTransfer.has(step.productionFrameId)) firstTransfer.set(step.productionFrameId, lesson.id);
      }
    }
    const fromPlan: StructureExposureMap = new Map();
    for (const step of plan) creditStructureFromStep(fromPlan, step);
    mergeStructureExposure(prior, fromPlan);
    mergeStructureExposure(prior, curriculum);
  }
  return SENTENCE_FRAMES.map((frame) => ({
    frameId: frame.id,
    patternPt: frame.patternPt,
    firstExposedLessonId: firstExposed.get(frame.id) ?? null,
    firstGuidedProductionLessonId: firstGuided.get(frame.id) ?? null,
    firstTransferLessonId: firstTransfer.get(frame.id) ?? null,
  }));
}

/**
 * Par mínimo "iguais ou diferentes?". Metade das rodadas repete o MESMO som
 * dos dois lados — sem isso o aluno aprende a responder "diferentes" sempre e
 * o exercício deixa de medir ouvido.
 */
function makeAudioDiscriminationStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number
): LessonStep | null {
  const drills = minimalPairsFor(knownGlyphs, { limit: 12 });
  if (drills.length === 0) return null;
  const drill = drills[seed % drills.length];
  const identical = seed % 2 === 0;
  const first = drill.a;
  const second = identical ? drill.a : drill.b;
  return {
    kind: "audio_discrimination",
    title: "Iguais ou diferentes?",
    prompt: "Ouça os dois sons e decida. Sem escrita nesta pergunta — só ouvido.",
    audioText: first.hanzi,
    audioTextB: second.hanzi,
    correctAnswer: identical ? "same" : "different",
    contrastLabel: drill.contrastLabelPt,
    minimalPairId: drill.id,
    pairReveal: [
      { hanzi: first.hanzi, pinyin: first.pinyin, meaningPt: first.meaningPt },
      { hanzi: second.hanzi, pinyin: second.pinyin, meaningPt: second.meaningPt },
    ],
    explanation: identical
      ? `Era o mesmo som duas vezes: ${first.pinyin}. ${drill.notePt}`
      : `${first.pinyin} × ${second.pinyin} — ${drill.contrastLabelPt}. ${drill.notePt}`,
    isNoHint: true,
  };
}

/** Ditado: o mesmo áudio da lição cobrado por montagem, pinyin ou hànzì. */
function makeDictationStep(
  item: FocusItem,
  focus: FocusItem[],
  phaseOrder: number,
  options: { immersion?: boolean } = {}
): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean) || clean.length < 2 || clean.length > 8) return null;
  const mode = dictationModeForPhase(phaseOrder);
  if (mode === "pinyin" && !item.pinyin?.trim()) return null;

  // As peças de montagem acompanham TODOS os níveis: no modo hànzì elas são a
  // saída para quem não tem teclado chinês, e a tela oferece a troca.
  const parts = [...clean];
  const extras = focus
    .filter((candidate) => candidate.key !== item.key)
    .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
    .filter(Boolean);
  const bank = uniqueValues([...parts, ...extras]).slice(0, Math.max(parts.length + 2, 4));

  if (mode === "blocks") {
    return {
      kind: "dictation",
      title: "Ouça e monte",
      dictationMode: "blocks",
      audioText: clean,
      hanzi: clean,
      targetParts: parts,
      bank,
      correctAnswer: clean,
      singlePlayback: options.immersion,
      explanation: `${clean} — ${item.meaningPt}.`,
      isNoHint: true,
    };
  }

  const answer = mode === "pinyin" ? item.pinyin!.trim() : clean;
  return {
    kind: "dictation",
    title: mode === "pinyin" ? "Ouça e escreva o pinyin" : "Ouça e escreva o hànzì",
    dictationMode: mode,
    audioText: clean,
    hanzi: clean,
    correctAnswer: answer,
    // Pinyin sem acento é aceito: aqui se cobra o que o ouvido pegou, não
    // a digitação de diacríticos.
    accepts: mode === "pinyin" ? uniqueValues([answer, answer.replace(/\s+/g, "")]) : undefined,
    targetParts: mode === "hanzi" ? parts : undefined,
    bank: mode === "hanzi" ? bank : undefined,
    singlePlayback: options.immersion,
    explanation: `${clean} · ${item.pinyin ?? ""} — ${item.meaningPt}.`,
    isNoHint: true,
  };
}

/** "Qual não pertence?" — sets curados (PED-012) + níveis graduais (PED-013). */
function makeOddOneOutStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  phaseOrder = 1
): LessonStep | null {
  const level = oddOneOutLevelForPhase(phaseOrder);
  const sets = oddOneOutSetsFor(knownGlyphs, { limit: 12, level });
  if (sets.length === 0) return null;
  const set = sets[seed % sets.length];
  const rawOptions = uniqueValues([...set.members.map((member) => member.hanzi), set.intruder.hanzi]);
  const canonical = [...set.members.map((m) => m.hanzi), set.intruder.hanzi];
  const shuffled = seededShuffleAvoidingOrder(rawOptions, `ooo:${set.id}:${seed}:bank`, canonical);
  if (shuffled.length < 4) return null;
  const optionMeta: Record<string, { pinyin?: string; meaningPt?: string }> = {};
  for (const item of [...set.members, set.intruder]) {
    optionMeta[item.hanzi] = { pinyin: item.pinyin, meaningPt: item.meaningPt };
  }
  return {
    kind: "odd_one_out",
    title: "Qual não pertence?",
    prompt: oddOneOutPromptForLevel(level, set.groupLabelPt),
    options: shuffled,
    correctAnswer: set.intruder.hanzi,
    explanation: oddOneOutExplanation(set),
    oddOneOutLevel: level,
    groupLabelPt: set.groupLabelPt,
    optionMeta: level <= 2 ? optionMeta : undefined,
    isNoHint: true,
  };
}

/** "Qual frase faz isso?" — duas frases plausíveis, uma regra por trás. */
function makeSpotErrorStep(knownGlyphs: ReadonlySet<string>, seed: number): LessonStep | null {
  const drills = spotErrorDrillsFor(knownGlyphs);
  if (drills.length === 0) return null;
  const drill = drills[seed % drills.length];
  return {
    kind: "spot_error",
    title: "Qual frase faz isso?",
    prompt: drill.intentPt,
    options: [drill.right.hanzi, drill.wrong.hanzi],
    correctAnswer: drill.right.hanzi,
    explanation: `${drill.right.hanzi} (${drill.right.pinyin}) — ${drill.whyPt}`,
    isNoHint: true,
  };
}

// ————————————————————————————————————————————————————————————————
// Produção sem apoio, transferência e reparo (src/data/productionTasks.ts).
//
// Os três motores da onda 2. O que eles têm em comum é o que foi TIRADO:
// não há banco de peças, não há alternativas e o enunciado não mostra hànzì.
// O aluno tem que trazer a frase de dentro.
// ————————————————————————————————————————————————————————————————

/**
 * Frases que o currículo autoral já mostra ao aluno. A transferência precisa
 * disso para provar o que promete: se a frase alvo aparece em qualquer passo
 * escrito à mão, ela não é combinação inédita — é memória.
 */
let authoredSentencesCache: Set<string> | null = null;
function authoredCurriculumSentences(): ReadonlySet<string> {
  if (authoredSentencesCache) return authoredSentencesCache;
  const sentences = new Set<string>();
  const add = (value: string | undefined) => {
    const clean = cleanHanzi(value);
    if (clean && CJK_RE.test(clean)) sentences.add(clean);
  };
  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps) {
      add(step.hanzi);
      add(step.text);
      add(step.answer);
      add(step.correctAnswer);
      add(step.audioText);
      add(step.sourceText);
      add(step.target?.join(""));
      add(step.targetParts?.join(""));
      for (const option of step.options ?? []) add(option);
      for (const line of step.lines ?? []) add(line.hanzi);
      for (const node of step.nodes ?? []) {
        add(node.hanzi);
        add(node.interaction?.correctAnswer);
        for (const option of node.interaction?.options ?? []) add(option);
      }
      add(step.checkpoint?.correctAnswer);
      for (const option of step.checkpoint?.options ?? []) add(option);
    }
  }
  authoredSentencesCache = sentences;
  return sentences;
}

function frameTaskStepBase(task: FrameTask) {
  return {
    situationPt: task.situationPt,
    productionFrameId: task.frameId,
    productionGoal: task.goal,
    patternSlots: task.slots,
    correctAnswer: task.targetHanzi,
    answer: task.targetHanzi,
    pinyin: task.targetPinyin,
    accepts: uniqueValues([task.targetHanzi, ...task.accepts]),
    // As frases irmãs aparecem só na correção: "isto também valia". Mostrar
    // antes entregaria a resposta; não mostrar nunca esconde do aluno que
    // existe mais de um jeito certo de dizer a mesma coisa.
    productionExamples: task.siblingAnswers.map((hanzi) => ({ hanzi, pinyin: "" })),
    isNoHint: true,
    helpMode: "disabled" as const,
  };
}

function framePickOptionsFor(options: {
  lessonId?: string;
  structureExposure?: StructureExposureMap;
  priorTransferredFrames?: ReadonlySet<string>;
  usedFrameIds?: ReadonlySet<string>;
  usedTargetHanzi?: ReadonlySet<string>;
}): FramePickOptions {
  const needsGuidedProduction = new Set<string>();
  const usedFrameIds = new Set<string>(options.usedFrameIds ?? []);
  if (options.structureExposure) {
    for (const [frameId, rungs] of options.structureExposure) {
      if (rungs.exposed && (rungs.completion || rungs.build) && !rungs.guidedProduction) {
        needsGuidedProduction.add(frameId);
      }
      if (rungs.guidedProduction) usedFrameIds.add(frameId);
    }
  }
  const lesson = options.lessonId ? ALL_LESSONS.find((item) => item.id === options.lessonId) : undefined;
  return {
    priorTransferredFrameIds: options.priorTransferredFrames,
    usedFrameIds,
    usedTargetHanzi: options.usedTargetHanzi,
    needsGuidedProduction,
    lessonSalt: options.lessonId ? (lessonOrderById.get(options.lessonId) ?? 0) : 0,
    domain: inferCommunicativeDomain(options.lessonId ?? "", lesson?.title ?? ""),
  };
}

/**
 * Produção ABERTA: o enunciado dá o objetivo e a situação, e o aluno escolhe o
 * conteúdo. É o degrau que faltava — as outras produções ainda combinavam a
 * frase de antemão, o que treina montar mas não treina escolher o que dizer.
 */
function makeOpenProductionStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  structureExposure?: StructureExposureMap,
  pickOptions: FramePickOptions = {}
): LessonStep | null {
  const tasks = openProductionTasksFor(knownGlyphs, { structureExposure });
  if (tasks.length === 0) return null;
  const task =
    pickOpenProductionTask(tasks, { lessonSalt: pickOptions.lessonSalt ?? seed }) ?? tasks[0];
  const [model] = task.examples;
  if (!model) return null;
  return {
    kind: "free_production",
    title: "Diga do seu jeito",
    situationPt: task.situationPt,
    productionGoal: task.goal,
    productionOpen: true,
    productionAssist: "open",
    productionHintPt: task.hintPt,
    productionExamples: task.examples,
    correctAnswer: model.hanzi,
    answer: model.hanzi,
    pinyin: model.pinyin,
    accepts: uniqueValues(task.accepts),
    explanation: `Qualquer uma destas cumpre a situação. ${task.hintPt}`,
    productionHelpInitial: 0,
    productionHelpCeiling: 1,
    productionHelpFirstOfStructure: false,
    isNoHint: true,
    helpMode: "disabled",
  };
}

/**
 * Filtra tarefas que usam uma palavra específica. É assim que a produção e a
 * transferência entram no loop pós-conversa: a palavra que acabou de aparecer
 * volta dentro de uma frase que o aluno precisa produzir inteira.
 */
function frameTasksUsing(tasks: readonly FrameTask[], item: FocusItem | undefined): FrameTask[] {
  const needle = cleanHanzi(item?.hanzi);
  if (!needle) return [...tasks];
  const matching = tasks.filter((task) => cleanHanzi(task.targetHanzi).includes(needle));
  return matching.length > 0 ? matching : [];
}

/**
 * Produção livre: só a situação em português. Sem peças, sem alternativas,
 * sem a frase na tela. É o único formato em que o app não pode ser resolvido
 * por eliminação.
 */
function attachProductionHelpFields(
  task: FrameTask,
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  plan: ReturnType<typeof resolveProductionHelpPlan>
): Pick<
  LessonStep,
  | "productionHelpInitial"
  | "productionHelpCeiling"
  | "productionHelpFirstOfStructure"
  | "productionHelpVocab"
  | "productionHelpBuildBank"
> {
  return {
    productionHelpInitial: plan.initial,
    productionHelpCeiling: plan.softCeiling,
    productionHelpFirstOfStructure: plan.firstOfStructure,
    productionHelpVocab: productionHelpVocabForTask(task, knownGlyphs, 4),
    productionHelpBuildBank: productionHelpBuildBank(task, seed),
  };
}

function makeFreeProductionStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  usingItem?: FocusItem,
  structureExposure?: StructureExposureMap,
  pickOptions: FramePickOptions = {}
): LessonStep | null {
  const pool = productionTasksFor(knownGlyphs, { structureExposure });
  const tasks = usingItem ? frameTasksUsing(pool, usingItem) : pool;
  if (tasks.length === 0) return null;
  const task = pickFrameTask(tasks, pickOptions) ?? tasks[seed % tasks.length];
  const help = resolveProductionHelpPlan({
    kind: "free_production",
    firstOfStructure: false,
  });
  return {
    kind: "free_production",
    title: "Sua vez de produzir",
    patternPt: task.patternPt,
    productionAssist: "guided",
    assist: "guided",
    ...frameTaskStepBase(task),
    ...attachProductionHelpFields(task, knownGlyphs, seed, help),
    explanation: `${task.targetHanzi} (${task.targetPinyin}) — ${task.grammarNotePt}`,
  };
}

function pickTransferCandidates(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  usingItem: FocusItem | undefined,
  attemptNumber: number,
  structureExposure?: StructureExposureMap
): FrameTask[] {
  const taught = authoredCurriculumSentences();
  const maxAssist = maxTransferAssistForAttempt(attemptNumber);
  const preferLowestRung = attemptNumber <= 0;

  const select = (preferLowest: boolean) => {
    const pool = transferTasksFor(knownGlyphs, {
      extraTaughtSentences: taught,
      maxAssist,
      preferLowestRung: preferLowest,
      structureExposure,
    });
    return usingItem ? frameTasksUsing(pool, usingItem) : pool;
  };

  let tasks = select(preferLowestRung);
  // Pós-conversa pode filtrar demais: relaxa o "só o degrau mais baixo".
  if (tasks.length === 0 && usingItem) {
    tasks = select(false);
  }
  if (tasks.length === 0) {
    tasks = transferTasksFor(knownGlyphs, {
      extraTaughtSentences: taught,
      maxAssist,
      preferLowestRung: true,
      structureExposure,
    });
  }
  if (tasks.length === 0) return [];

  // Em tentativas seguintes, sobe para o degrau mais alto permitido e elegível.
  if (!preferLowestRung) {
    const maxRank = Math.max(...tasks.map((task) => PRODUCTION_ASSIST_RANK[task.transferAssist]));
    tasks = tasks.filter((task) => PRODUCTION_ASSIST_RANK[task.transferAssist] === maxRank);
  }

  // Estável: seed escolhe dentro do degrau, não mistura rungs.
  void seed;
  return tasks;
}

/**
 * Transferência com scaffold progressivo:
 * guided (1 slot) → supported (dica de transformação) → question (吗).
 * Só depois de produção guiada da mesma estrutura.
 */
function makeTransferStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  usingItem?: FocusItem,
  attemptNumber = 0,
  structureExposure?: StructureExposureMap,
  priorTransferredFrames?: ReadonlySet<string>,
  pickOptions: FramePickOptions = {}
): LessonStep | null {
  const tasks = pickTransferCandidates(knownGlyphs, seed, usingItem, attemptNumber, structureExposure);
  if (tasks.length === 0) return null;
  const task =
    pickFrameTask(tasks, {
      ...pickOptions,
      priorTransferredFrameIds: pickOptions.priorTransferredFrameIds ?? priorTransferredFrames,
      lessonSalt: pickOptions.lessonSalt ?? seed,
    }) ?? tasks[seed % tasks.length];
  const productionAssist: ProductionAssist = task.transferAssist;
  const firstOfStructure = !priorTransferredFrames?.has(task.frameId);
  const help = resolveProductionHelpPlan({
    kind: "transfer_task",
    firstOfStructure,
    attemptNumber,
  });
  return {
    kind: "transfer_task",
    title:
      productionAssist === "guided"
        ? "Troque só uma parte"
        : productionAssist === "supported"
          ? "Aplique a transformação"
          : productionAssist === "question"
            ? "Transforme em pergunta"
            : "Use o que já sabe",
    patternPt: task.patternPt,
    transferAnchorHanzi: task.anchor.hanzi,
    transferAnchorPinyin: task.anchor.pinyin,
    transferAnchorPt: task.anchor.meaningPt,
    isNovelCombination: true,
    productionAssist,
    assist: productionAssist === "guided" ? "guided" : undefined,
    transferTransformHint: task.transferTransformHint,
    ...frameTaskStepBase(task),
    ...attachProductionHelpFields(task, knownGlyphs, seed, help),
    explanation: `${task.targetHanzi} (${task.targetPinyin}) — ${task.grammarNotePt} Combinação nova: você montou pela estrutura.`,
  };
}

/**
 * Reparo conversacional: o personagem não entendeu (ou o aluno não entendeu).
 * Primeiro o aluno escolhe o MOVIMENTO (repetir, simplificar, pedir de novo,
 * assumir que não entendeu); depois produz a fala. Saber continuar quando a
 * comunicação falha é parte de falar a língua.
 */
function makeConversationRepairStep(
  knownGlyphs: ReadonlySet<string>,
  seed: number,
  utterance?: FocusItem
): LessonStep | null {
  const clean = cleanHanzi(utterance?.hanzi);
  const cjkOnly = [...clean].filter((glyph) => CJK_RE.test(glyph)).join("");
  // V4.1.1: não cortar os 2 últimos caracteres (英语吗 → 语吗, 巴西人 → 西人).
  const tasks = repairTasksFor(knownGlyphs, {
    utterance: cjkOnly && utterance?.pinyin ? { hanzi: `${cjkOnly}。`, pinyin: utterance.pinyin } : undefined,
  });
  if (tasks.length === 0) return null;
  const task = tasks[seed % tasks.length];
  if (!CJK_RE.test(task.targetHanzi ?? "")) return null;
  return {
    kind: "conversation_repair",
    title: "A conversa travou",
    prompt: task.promptPt,
    repairNpcHanzi: task.npc.hanzi,
    repairNpcPinyin: task.npc.pinyin,
    repairNpcPt: task.npc.meaningPt,
    repairDirection: task.direction,
    repairStrategy: task.strategy,
    repairStrategyOptions: task.strategyOptions,
    correctAnswer: task.targetHanzi,
    answer: task.targetHanzi,
    pinyin: task.targetPinyin,
    accepts: uniqueValues([task.targetHanzi, ...task.accepts]),
    explanation: task.whyPt,
    isNoHint: true,
    helpMode: "disabled",
  };
}

function makeSentenceBuildStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean)) return null;
  const parts = [...clean];
  if (parts.length < 2 || parts.length > 8) return null;
  const extras = focus
    .filter((candidate) => candidate.key !== item.key)
    .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
    .filter(Boolean);
  const ordered = uniqueValues([...parts, ...extras]).slice(0, Math.max(parts.length + 2, 4));
  const bank = seededShuffleAvoidingOrder(ordered, `sb:${item.key}:${clean}`, parts);
  return {
    kind: "sentence_build",
    title: "Monte de outro jeito",
    prompt: `Monte: ${item.meaningPt}.`,
    targetParts: parts,
    bank,
    correctAnswer: clean,
    explanation: `${item.hanzi} significa ${item.meaningPt}.`,
  };
}

function makeFillBlankStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean) || clean.length < 2 || clean.length > 8) return null;
  const index = clean.length > 2 ? 1 : clean.length - 1;
  const blank = clean[index];
  const before = clean.slice(0, index);
  const after = clean.slice(index + 1);
  const bank = uniqueValues([
    blank,
    ...focus
      .filter((candidate) => candidate.key !== item.key)
      .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)]),
    ...CHARACTERS.map((char) => char.hanzi),
  ]).slice(0, 5);
  if (bank.length < 2) return null;
  return {
    kind: "fill_blank",
    title: "Complete a frase",
    prompt: `Complete: ${item.meaningPt}.`,
    sentenceBefore: before,
    blankAnswer: blank,
    sentenceAfter: after,
    bank,
    correctAnswer: clean,
    explanation: `${item.hanzi} = ${item.meaningPt}.`,
  };
}

interface BuilderSelectionContext {
  seenGlyphs?: ReadonlySet<string>;
  /** Glifos que ESTA lição ensina (não a revisão). */
  ownFocusGlyphs?: ReadonlySet<string>;
  /** Revisões podem remontar composições antigas; lições básicas não. */
  allowComposedFiller?: boolean;
}

function isComposedBuilder(builder: HanziBuilder): boolean {
  return builder.mode === "components" || (builder.prerequisites?.length ?? 0) > 0;
}

function builderForItem(
  item: FocusItem,
  phaseOrder: number,
  progress?: HanziBuilderProgressMap,
  selection: BuilderSelectionContext = {}
): HanziBuilder | undefined {
  const { seenGlyphs, ownFocusGlyphs, allowComposedFiller = false } = selection;
  const chars = [...cleanHanzi(item.hanzi)];
  for (const glyph of chars) {
    // Composição só entra na lição que ensina o caractere, ou em revisão —
    // nunca como "recheio" numa lição básica (nada de 明 numa aula de 木/人).
    const composedFiller = (b: HanziBuilder) =>
      isComposedBuilder(b) && !(ownFocusGlyphs?.has(glyph) ?? false) && !allowComposedFiller;
    // Não pular bases: builder composto só entra se as bases já foram vistas.
    const builders = buildersForCharacter(glyph)
      .filter((b) => builderPrerequisitesMet(b, seenGlyphs))
      .filter((b) => !composedFiller(b));
    if (builders.length === 0) continue;
    const allowed = new Set(builders.map((b) => b.id));
    // Com domínio registrado, a variação segue o aluno (novo→guia, dominado→
    // desafio sem molde). Sem domínio, mantém a escolha por fase (como antes),
    // para não facilitar demais conteúdo avançado que o aluno ainda não montou.
    const charProgress = progress?.[glyph];
    if (charProgress) {
      const selected = selectHanziBuilderForStudent(glyph, charProgress, seenGlyphs);
      if (selected && allowed.has(selected.id)) return selected;
    }
    const preferred = [...builders].sort((a, b) => {
      const phaseTarget = phaseOrder <= 2 ? 1 : phaseOrder <= 5 ? 3 : 5;
      const aDistance = Math.abs(a.level - phaseTarget);
      const bDistance = Math.abs(b.level - phaseTarget);
      const aContextBonus = a.context && phaseOrder >= 5 ? -1 : 0;
      const bContextBonus = b.context && phaseOrder >= 5 ? -1 : 0;
      return aDistance - bDistance || aContextBonus - bContextBonus || a.level - b.level;
    })[0];
    if (preferred) return preferred;
  }
  return undefined;
}

function makeHanziBuilderStep(
  item: FocusItem,
  phaseOrder: number,
  progress?: HanziBuilderProgressMap,
  selection: BuilderSelectionContext = {}
): LessonStep | null {
  const builder = builderForItem(item, phaseOrder, progress, selection);
  if (!builder) return null;
  return {
    kind: "hanzi_build",
    title: "Monte o hànzì",
    prompt: builder.promptPt,
    builderId: builder.id,
    targetParts: [builder.character],
    bank: [builder.character],
    correctAnswer: builder.character,
    explanation: builder.explanationPt,
    sourceText: builder.character,
    sourcePinyin: builder.pinyin,
    sourceMeaning: builder.meaningPt,
  };
}

function makeAssemblyChoiceStep(
  item: FocusItem,
  focus: FocusItem[],
  knownGlyphs?: ReadonlySet<string>
): LessonStep | null {
  const options = optionHanzi(item, focus);
  if (options.length < 2) return null;
  // Mesma pista do card de apresentação: aqui as opções chegavam a ser a frase
  // inteira contra glifos soltos (我叫<Nome> | 你 | 好 | 我).
  const named = item.hanzi ? nameCarryingOptions(item.hanzi, knownGlyphs) : null;
  return {
    kind: "dialogue_choice",
    title: "Monte a ideia",
    speaker: "Montagem",
    dialoguePrompt: `Qual peça representa: ${item.meaningPt}?`,
    options: named ?? options,
    correctAnswer: item.hanzi,
    explanation: `${item.hanzi} carrega a ideia de ${item.meaningPt}.`,
  };
}

/**
 * Alternativas que TAMBÉM carregam o nome do aluno.
 *
 * Quando o alvo é a apresentação (我叫<Nome>) e os distratores são frases sem
 * nome, a resposta se entrega sozinha: basta procurar a única opção com o nome
 * em latim. Aqui os distratores passam a ser outras frases com o MESMO nome,
 * então o exercício volta a testar a estrutura (叫 vs 是, 我 vs 他/你).
 *
 * Só usa glifos já ensinados — se o aluno ainda não viu 是/他/吗, a variante
 * correspondente é descartada em vez de introduzir caractere novo à força.
 */
function nameCarryingOptions(
  targetHanzi: string,
  known: ReadonlySet<string> | undefined
): string[] | null {
  const clean = cleanHanzi(targetHanzi).trim();
  // `cleanHanzi` remove espaços — bom para hànzì, fatal para pinyin
  // ("wǒ jiào Matheus" virava "wǒjiàoMatheus" e o padrão nunca casava).
  const raw = targetHanzi.trim();
  // O mesmo alvo aparece em hànzì (我叫Matheus) e em pinyin (wǒ jiào Matheus);
  // sem cobrir as duas formas, metade dos cards continuava entregando a resposta.
  const hanziMatch = /^我叫\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*)$/.exec(clean);
  const pinyinMatch = /^wǒ\s*jiào\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*)$/i.exec(raw);
  const name = (hanziMatch?.[1] ?? pinyinMatch?.[1])?.trim();
  if (!name) return null;
  if (pinyinMatch) {
    // Em pinyin não há glifo para gatear: as variantes usam só sílabas que o
    // próprio alvo e o vocabulário inicial já apresentam.
    return [targetHanzi, `nǐ jiào ${name}`, `tā jiào ${name}`, `wǒ shì ${name}`];
  }
  // Ordem do mais elementar para o mais avançado: 你叫 já é conhecido junto com
  // 我叫 (vem de 你叫什么？), então funciona desde a primeira lição. As demais
  // dependem de 是/他/吗 e entram quando esses caracteres já foram ensinados.
  const variants = [`你叫${name}`, `我是${name}`, `他叫${name}`, `你叫${name}吗`];
  // O distrator pode reusar os glifos do PRÓPRIO alvo além dos já ensinados:
  // eles estão na mesma tela, então nada novo é introduzido. Sem isso 你叫<Nome>
  // seria barrado por causa de 叫 — o mesmo caractere que a resposta exibe.
  const allowed = new Set<string>([
    ...(known ?? []),
    ...[...cleanHanzi(targetHanzi)].filter((glyph) => CJK_RE.test(glyph)),
  ]);
  const usable = variants.filter((variant) => allCjkGlyphsKnown(variant, allowed));
  if (usable.length === 0) return null;
  return [targetHanzi, ...usable.slice(0, 3)];
}

function makeDialogueChoiceStep(
  item: FocusItem,
  focus: FocusItem[],
  knownGlyphs?: ReadonlySet<string>
): LessonStep | null {
  const named = item.hanzi ? nameCarryingOptions(item.hanzi, knownGlyphs) : null;
  if (named) {
    // Completa até 4 alternativas com os distratores comuns quando faltam
    // variantes com nome — melhor uma pista parcial do que uma pergunta de
    // duas opções.
    const filler = optionHanzi(item, focus).filter((option) => !named.includes(option));
    const namedOptions = [...named, ...filler].slice(0, 4);
    return {
      kind: "dialogue_choice",
      title: "Use em contexto",
      speaker: "Situação",
      dialoguePrompt: `Você quer dizer: ${item.meaningPt}.`,
      options: namedOptions,
      correctAnswer: item.hanzi,
      explanation: `${item.hanzi} usa 我叫 + nome. As outras trocam a pessoa ou o verbo.`,
    };
  }
  const options = optionHanzi(item, focus);
  if (options.length < 2) return null;
  return {
    kind: "dialogue_choice",
    title: "Use em contexto",
    speaker: "Situação",
    dialoguePrompt: `Você quer dizer: ${item.meaningPt}.`,
    options,
    correctAnswer: item.hanzi,
    explanation: `${item.hanzi} é a opção que comunica ${item.meaningPt}.`,
  };
}

function makeVariantAudioSameDifferentStep(
  item: FocusItem,
  focus: FocusItem[],
  same: boolean
): LessonStep | null {
  if (!item.hanzi || !item.pinyin) return null;
  const contrast = focus
    .filter((candidate) => candidate.key !== item.key && Boolean(candidate.hanzi && candidate.pinyin))
    .sort((a, b) => {
      const aNear = normalizePinyinBase(a.pinyin ?? "") === normalizePinyinBase(item.pinyin ?? "") ? 0 : 1;
      const bNear = normalizePinyinBase(b.pinyin ?? "") === normalizePinyinBase(item.pinyin ?? "") ? 0 : 1;
      return aNear - bNear || a.key.localeCompare(b.key);
    })[0];
  if (!same && !contrast) return null;
  const second = same ? item : contrast!;
  return {
    kind: "listen_select",
    pedagogyVariant: "audio_same_different",
    title: "Os dois áudios são iguais?",
    prompt: "Compare a pronúncia completa, incluindo os tons.",
    audioSequence: [item.hanzi, second.hanzi],
    options: ["Iguais", "Diferentes"],
    correctAnswer: same ? "Iguais" : "Diferentes",
    explanation: same
      ? `Os dois áudios eram ${item.hanzi} (${item.pinyin}).`
      : `A era ${item.hanzi} (${item.pinyin}); B era ${second.hanzi} (${second.pinyin}).`,
    isNoHint: true,
    helpMode: "disabled",
  };
}

function sentenceAlternatives(clean: string): string[][] {
  const curated: Record<string, string[][]> = {
    "我想喝茶": [["我", "想", "喝", "茶"], ["我", "要", "喝", "茶"]],
    "我想喝水": [["我", "想", "喝", "水"], ["我", "要", "喝", "水"]],
    "这是水": [["这", "是", "水"], ["这个", "是", "水"]],
    "这是书": [["这", "是", "书"], ["这个", "是", "书"]],
  };
  return curated[clean] ?? [[...clean]];
}

function makeDragonDictationStep(
  item: FocusItem,
  focus: FocusItem[],
  mode: NonNullable<LessonStep["dictationMode"]>
): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!clean || !item.pinyin || !CJK_ONLY_RE.test(clean)) return null;
  if (mode === "blocks") {
    if (clean.length < 2 || clean.length > 10) return null;
    const sequences = sentenceAlternatives(clean);
    const distractors = uniqueValues(
      focus
        .filter((candidate) => candidate.key !== item.key)
        .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
        .filter((piece) => !clean.includes(piece))
    ).slice(0, 2);
    return {
      kind: "sentence_build",
      pedagogyVariant: "dragon_dictation",
      dictationMode: "blocks",
      title: "Ouça e monte a fala",
      prompt: "Sem tradução: use apenas o áudio.",
      audioText: item.hanzi,
      targetParts: sequences[0],
      acceptedTargetParts: sequences.slice(1),
      accepts: sequences.map((parts) => parts.join("")),
      bank: uniqueValues(sequences.flat()),
      distractors,
      correctAnswer: clean,
      explanation: `${item.hanzi} = ${item.meaningPt}.`,
      isNoHint: true,
      helpMode: "disabled",
    };
  }
  const answer = mode === "pinyin" ? numericPinyinToDiacritics(item.pinyin) : clean;
  return {
    kind: "write",
    mode: "translation_fill",
    pedagogyVariant: "dragon_dictation",
    dictationMode: mode,
    title: mode === "pinyin" ? "Escreva o que ouviu em pinyin" : "Escreva o que ouviu em hànzì",
    audioText: item.hanzi,
    answer,
    accepts: mode === "pinyin" ? [item.pinyin] : uniqueValues([clean, item.hanzi]),
    playbackLimit: mode === "immersion" ? 1 : undefined,
    explanation: `${item.hanzi} · ${item.pinyin} · ${item.meaningPt}`,
    isNoHint: true,
    helpMode: "disabled",
  };
}

function makeVariantOddOneOutStep(focus: FocusItem[]): LessonStep | null {
  const chunks = focus
    .map((item) => ({ item, chunk: item.type === "chunk" && item.itemId ? chunkById[item.itemId] : undefined }))
    .filter((entry): entry is { item: FocusItem; chunk: NonNullable<typeof entry.chunk> } => Boolean(entry.chunk?.domain));
  const byDomain = new Map<string, typeof chunks>();
  for (const entry of chunks) {
    const current = byDomain.get(entry.chunk.domain!) ?? [];
    if (!current.some((candidate) => cleanHanzi(candidate.item.hanzi) === cleanHanzi(entry.item.hanzi))) {
      byDomain.set(entry.chunk.domain!, [...current, entry]);
    }
  }
  const related = [...byDomain.values()].filter((entries) => entries.length >= 3).sort((a, b) => b.length - a.length)[0];
  if (!related) return null;
  const relatedHanzi = new Set(related.map((entry) => cleanHanzi(entry.item.hanzi)));
  const outsider = chunks.find(
    (entry) => entry.chunk.domain !== related[0].chunk.domain && !relatedHanzi.has(cleanHanzi(entry.item.hanzi))
  );
  if (!outsider) return null;
  const options = uniqueValues([...related.slice(0, 3).map((entry) => entry.item.hanzi), outsider.item.hanzi]);
  if (options.length !== 4) return null;
  return {
    kind: "dialogue_choice",
    pedagogyVariant: "meaning_odd_one_out",
    title: "Qual não pertence ao grupo?",
    speaker: "Jogo de significado",
    dialoguePrompt: `Três opções pertencem a “${related[0].chunk.domain}”. Qual é a intrusa?`,
    options,
    correctAnswer: outsider.item.hanzi,
    explanation: `${outsider.item.hanzi} significa ${outsider.item.meaningPt}; as outras compartilham o mesmo contexto.`,
  };
}

function makeVariantSpotErrorStep(item: FocusItem): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  const replacements: [string, string][] = [
    ["喝", "吃"], ["吃", "喝"], ["水", "茶"], ["茶", "水"],
    ["是", "在"], ["在", "是"], ["要", "想"], ["想", "要"],
  ];
  const pair = replacements.find(([from]) => clean.includes(from));
  if (!pair || clean.length < 2) return null;
  const changed = clean.replace(pair[0], pair[1]);
  if (changed === clean) return null;
  return {
    kind: "dialogue_choice",
    pedagogyVariant: "meaning_spot_error",
    title: "Encontre a frase certa",
    speaker: "Detector de erro",
    dialoguePrompt: `Qual opção preserva a intenção “${item.meaningPt}”?`,
    options: [changed, clean],
    correctAnswer: clean,
    explanation: `${pair[0]} é a peça necessária em ${item.hanzi}; trocar por ${pair[1]} muda a mensagem.`,
  };
}

function makeSentenceLabStep(
  item: FocusItem,
  focus: FocusItem[],
  variant: Extract<NonNullable<LessonStep["pedagogyVariant"]>, `sentence_lab_${string}`>
): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean) || clean.length < 2 || clean.length > 10) return null;
  const sequences = sentenceAlternatives(clean);
  const distractors = uniqueValues(
    focus
      .filter((candidate) => candidate.key !== item.key)
      .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
      .filter((piece) => !clean.includes(piece))
  ).slice(0, variant === "sentence_lab_distractors" ? 3 : 1);
  const repairText = [...sequences[0]].reverse().join("");
  return {
    kind: "sentence_build",
    pedagogyVariant: variant,
    title: variant === "sentence_lab_repair" ? "Conserte a frase" : "Sentence Lab",
    prompt:
      variant === "sentence_lab_no_translation"
        ? "Recupere de memória o chunk praticado nesta lição."
        : variant === "sentence_lab_audio"
          ? "Ouça e monte uma frase natural."
          : variant === "sentence_lab_repair"
            ? "Reorganize as peças da frase quebrada."
            : `Monte “${item.meaningPt}” e ignore os intrusos.`,
    sourceText: variant === "sentence_lab_repair" ? repairText : undefined,
    sourceMeaning: variant === "sentence_lab_distractors" ? item.meaningPt : undefined,
    audioText: variant === "sentence_lab_audio" ? item.hanzi : undefined,
    targetParts: sequences[0],
    acceptedTargetParts: sequences.slice(1),
    accepts: sequences.map((parts) => parts.join("")),
    bank: uniqueValues([...(variant === "sentence_lab_repair" ? [...sequences[0]].reverse() : sequences.flat())]),
    distractors,
    correctAnswer: clean,
    explanation: `${item.hanzi} · ${item.pinyin ?? ""} · ${item.meaningPt}`,
    isNoHint: variant === "sentence_lab_audio" || variant === "sentence_lab_no_translation",
    helpMode: variant === "sentence_lab_audio" || variant === "sentence_lab_no_translation" ? "disabled" : undefined,
  };
}

function focusRefs(focus: FocusItem[]): string[] {
  return uniqueValues(focus.map((item) => `${item.type}:${item.itemId}`));
}

function lessonAllowsImmersionScenes(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  const title = lesson.title.toLocaleLowerCase("pt-BR");
  return id.includes("immersion") || id.includes("imers") || title.includes("imersão") || title.includes("immersion");
}

function maxConversationScenesForLesson(lesson: Lesson): number {
  // Lições-conceito de fundação: R9 / audit pedem só autoral leve — sem cena gerada.
  // Cena AUTORADA (ex.: microconversa de 你好 na lição de pinyin) pode entrar: o
  // aluno precisa usar mandarim nos primeiros minutos, não só ouvir teoria.
  if (FOUNDATION_LESSON_IDS.includes(lesson.id) && lesson.id !== "p1-engine-2-lab") {
    const authoredScenes = lesson.steps.filter((step) => step.kind === "conversation_scene").length;
    return Math.min(1, authoredScenes);
  }
  if (lessonAllowsImmersionScenes(lesson)) return 99;
  if (lesson.isReview) return 1;
  // A partir da fase 3 a conversa deixa de ser "uma por lição": 2 diálogos
  // com intenções diferentes. Antes disso, 1 basta (e o loop pós-conversa
  // ainda consegue cobrir o vocabulário novo da cena).
  if (lessonPhaseOrder(lesson) >= 3) return 2;
  return 1;
}

/** Troca do packet: fase ≥ 3 e fora da fundação (evita explodir l1-rev / R9). */
function lessonAllowsPacketExchange(lessonId: string | undefined, phaseOrder: number): boolean {
  if (!lessonId) return false;
  if (FOUNDATION_LESSON_IDS.includes(lessonId)) return false;
  return phaseOrder >= 3;
}

function conversationSceneToLessonStep(
  scene: ConversationSceneDefinition,
  resolveContext?: ConversationSceneResolveContext
): LessonStep {
  // Resolve a variante por estágio: renderiza a versão mais rica cujo
  // vocabulário já está disponível (a iniciante quando nada mais foi aprendido).
  const resolved = resolveConversationScene(scene, resolveContext ?? {});
  const nodes = resolved.nodes;
  const firstInteraction = nodes?.map((node) => node.interaction).find(Boolean);
  return {
    kind: "conversation_scene",
    title: scene.title,
    sceneId: scene.sceneId,
    setting: scene.setting,
    characters: scene.characters,
    lines: resolved.lines,
    checkpoint: scene.checkpoint,
    nodes,
    entryNodeId: resolved.entryNodeId,
    sceneIntent: scene.intent,
    learnedRefs: resolved.learnedRefs,
    newRefs: resolved.newRefs,
    dedicatedLesson: scene.dedicatedLesson,
    prompt: scene.checkpoint?.prompt ?? firstInteraction?.prompt,
    options: scene.checkpoint?.options ?? firstInteraction?.options,
    correctAnswer: scene.checkpoint?.correctAnswer ?? firstInteraction?.correctAnswer,
    explanation: scene.checkpoint?.explanation ?? firstInteraction?.explanation,
    bank:
      scene.checkpoint?.type === "order_reply" || scene.checkpoint?.type === "fill_reply"
        ? scene.checkpoint.options
        : undefined,
  };
}

/**
 * Conversa sem apoio.
 *
 * A escada de variantes (guided → assisted → independent → audio_first) já
 * existia, mas no topo dela a cena continuava entregando alternativas para
 * escolher. Ou seja: o aluno "avançava" e continuava reconhecendo. Aqui, nos
 * dois níveis mais altos, a interação perde as opções e vira produção — o
 * aluno escreve a própria fala no meio da conversa.
 *
 * Só converte o que é justo cobrar: resposta curta, em hànzì, e com o ramo de
 * erro presente (se errar, o personagem reage e a conversa continua em vez de
 * travar). O resto fica como está.
 */
const UNAIDED_CONVERSATION_LEVELS = new Set(["independent", "audio_first"]);
const UNAIDED_REPLY_MAX_GLYPHS = 6;

function unaidedInteraction(interaction: ConversationInteraction): ConversationInteraction | null {
  if (interaction.type !== "choose_reply") return null;
  const answer = cleanHanzi(interaction.correctAnswer);
  if (!answer || !CJK_ONLY_RE.test(answer)) return null;
  if ([...answer].length > UNAIDED_REPLY_MAX_GLYPHS) return null;
  // Sem ramo de erro a conversa trava numa produção falha; ali o apoio fica.
  if (!interaction.wrongNextNodeId) return null;

  // As outras formas certas de dizer a mesma coisa entram como aceitas: o
  // aluno não pode perder a conversa por escolher outra frase correta.
  const siblings = FRAME_TASKS.filter(
    (task) => cleanHanzi(task.targetHanzi) === answer
  ).flatMap((task) => task.siblingAnswers);

  return {
    ...interaction,
    type: "produce_reply",
    options: undefined,
    removedOptions: interaction.options,
    accepts: uniqueValues([interaction.correctAnswer, answer, ...siblings]),
  };
}

function withUnaidedReplies(
  step: LessonStep,
  level: import("../../data/conversationScenes").ConversationVariantLevel
): LessonStep {
  if (!UNAIDED_CONVERSATION_LEVELS.has(level) || !step.nodes?.length) return step;
  let converted = 0;
  const nodes = step.nodes.map((node) => {
    if (!node.interaction) return node;
    const unaided = unaidedInteraction(node.interaction);
    if (!unaided) return node;
    converted += 1;
    return { ...node, interaction: unaided };
  });
  if (converted === 0) return step;
  // O passo espelha prompt/opções da primeira interação para relatórios e para
  // o motor de novidade. Se essa interação perdeu as alternativas, o espelho
  // não pode continuar mostrando as antigas.
  const firstInteraction = nodes.map((node) => node.interaction).find(Boolean);
  const mirrorsFirstInteraction = !step.checkpoint;
  return {
    ...step,
    nodes,
    options: mirrorsFirstInteraction ? firstInteraction?.options : step.options,
  };
}

interface ConversationSceneSelection {
  lessonInfo: ConversationSceneLessonInfo;
  context: ConversationSceneSelectionContext;
  /** Vocabulário já ensinado pelo currículo até a lição (refs type:id). */
  knownRefs?: ReadonlySet<string>;
  /** Revisão de módulo pode receber cenas de papel module_review. */
  isReviewLesson?: boolean;
  /** Lições de imersão liberam as cenas longas e ramificadas. */
  allowImmersion?: boolean;
  /** Histórico do aluno — define o nível da variante da cena escolhida. */
  history?: readonly ConversationHistoryEntry[];
}

// Refs (chunk:/char:) ensinados pelo currículo até cada lição, acumulados na
// ordem da jornada. Uma cena pode usar QUALQUER vocabulário já ensinado — não
// apenas o foco da lição atual — desde que toque o foco em pelo menos 1 ref.
let curriculumRefsCache: Map<string, ReadonlySet<string>> | null = null;
export function curriculumRefsThroughLesson(lessonId: string): ReadonlySet<string> {
  if (!curriculumRefsCache) {
    curriculumRefsCache = new Map();
    const cumulative = new Set<string>();
    for (const lesson of ALL_LESSONS) {
      for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) cumulative.add(ref);
      for (const item of lessonFocusItems(lesson)) {
        if (item.type && item.itemId) cumulative.add(`${item.type}:${item.itemId}`);
      }
      curriculumRefsCache.set(lesson.id, new Set(cumulative));
    }
  }
  return curriculumRefsCache.get(lessonId) ?? new Set<string>();
}

// Info da lição usada pela pontuação de cena: intenções/respostas/cenas já
// presentes nos passos autorais + fase para calibrar dificuldade.
function conversationSceneLessonInfo(
  lesson: Lesson,
  focus: readonly FocusItem[],
  reviewFocus: readonly FocusItem[]
): ConversationSceneLessonInfo {
  const usedSceneIds = new Set<string>();
  const usedIntents = new Set<string>();
  const usedAnswers = new Set<string>();
  for (const step of lesson.steps) {
    if (step.kind === "conversation_scene") {
      if (step.sceneId) usedSceneIds.add(step.sceneId);
      const intent = step.sceneIntent ?? (step.sceneId ? conversationSceneById[step.sceneId]?.intent : undefined);
      if (intent) usedIntents.add(intent);
    }
    const answer = normalizeConversationAnswer(step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer);
    if (answer) usedAnswers.add(answer);
  }
  return {
    phaseOrder: lessonPhaseOrder(lesson),
    focusRefs: new Set(focusRefs([...focus])),
    reviewRefs: new Set(focusRefs([...reviewFocus])),
    usedSceneIds,
    usedIntents,
    usedAnswers,
  };
}

/**
 * A batida de reparo da cena: o que o personagem faz quando o aluno erra de
 * novo. O primeiro erro já tem ramo autoral (ele repete, corrige, demonstra
 * confusão); a partir do segundo a comunicação quebra de verdade e o aluno
 * precisa se recuperar antes de a conversa continuar.
 *
 * Só existe quando o aluno já tem como reparar — 请再说一遍 / 我听不懂 entram
 * no currículo depois da metade do curso, e cobrar reparo antes disso seria
 * pedir uma frase que ele não viu.
 */
function conversationRepairBeatFor(knownGlyphs: ReadonlySet<string>): ConversationRepairBeat | undefined {
  const [task] = repairTasksFor(knownGlyphs, { limit: 1 });
  if (!task) return undefined;
  return {
    npcHanzi: task.npc.hanzi,
    npcPinyin: task.npc.pinyin,
    npcPt: task.npc.meaningPt,
    promptPt: task.promptPt,
    strategy: task.strategy,
    strategyOptions: task.strategyOptions,
    targetHanzi: task.targetHanzi,
    targetPinyin: task.targetPinyin,
    accepts: uniqueValues([task.targetHanzi, ...task.accepts]),
    whyPt: task.whyPt,
  };
}

function makeConversationSceneStep(
  focus: FocusItem[],
  reviewFocus: FocusItem[] = [],
  selection?: ConversationSceneSelection,
  knownGlyphs?: ReadonlySet<string>
): LessonStep | null {
  const focusOnly = new Set(focusRefs(focus));
  const reviewOnly = new Set(focusRefs(reviewFocus));
  const refs = new Set([...focusOnly, ...reviewOnly]);
  const knownRefs = selection?.knownRefs;
  const phaseOrder = selection?.lessonInfo?.phaseOrder;
  const candidates = CONVERSATION_SCENES.filter((scene) =>
    isConversationSceneEligible(scene, {
      lessonRefs: refs,
      knownRefs,
      isReviewLesson: selection?.isReviewLesson,
      allowImmersion: selection?.allowImmersion,
      generatedContext: true,
      phaseOrder,
    })
  );
  const preferredPacketIntents = preferredSceneIntentsForRefs(focusOnly, reviewOnly);
  const lessonInfo: ConversationSceneLessonInfo = {
    ...(selection?.lessonInfo ?? { focusRefs: focusOnly, reviewRefs: reviewOnly }),
    focusRefs: selection?.lessonInfo?.focusRefs ?? focusOnly,
    reviewRefs: selection?.lessonInfo?.reviewRefs ?? reviewOnly,
    preferredPacketIntents:
      selection?.lessonInfo?.preferredPacketIntents ?? preferredPacketIntents,
  };
  // A pontuação já penaliza a cena da lição anterior (−100), mas penalidade não
  // resolve pool de um candidato só: no começo do curso o aluno conhece três
  // cumprimentos, e a mesma cena voltava em lições seguidas. Sem alternativa, a
  // lição fica sem conversa — repetir a mesma cena três vezes seguidas ensina
  // menos que não ter conversa nenhuma, e a abertura já é leve de propósito.
  const selectionContext = selection?.context ?? {};
  // `lastLessonSceneIds` vem SEMPRE preenchido (vazio quando não há histórico),
  // então `??` não serve de fallback aqui — só o vazio decide usar a recência.
  const previousSceneIds = selectionContext.lastLessonSceneIds?.length
    ? selectionContext.lastLessonSceneIds
    : (selectionContext.recentConversationSceneIds ?? []).slice(0, 1);
  // LEX-036/037 — troca do packet é candidata dedicada. Pool aqui = catálogo;
  // fallback packet só a partir da fase 3.
  const packetFallback =
    (phaseOrder ?? 1) >= 3
      ? buildPacketPhraseExchangeCandidates(focusOnly, reviewOnly, {
          knownRefs,
          usedSceneIds: lessonInfo.usedSceneIds,
          variantIndex: (phaseOrder ?? 1) + (selectionContext.recentConversationSceneIds?.length ?? 0),
          limit: 2,
        }).filter((scene) =>
          isConversationSceneEligible(scene, {
            lessonRefs: refs,
            knownRefs,
            isReviewLesson: selection?.isReviewLesson,
            allowImmersion: selection?.allowImmersion,
            generatedContext: true,
            phaseOrder,
          })
        )
      : [];
  const pool = candidates.length > 0 ? candidates : packetFallback;
  const fresh = pool.filter((candidate) => !previousSceneIds.includes(candidate.sceneId));
  const scene = pickBestConversationScene(fresh.length > 0 ? fresh : pool, lessonInfo, selectionContext);
  if (!scene) return null;
  // Renderiza a variante certa: refs disponíveis = foco/revisão + currículo.
  const availableRefs = new Set(refs);
  if (knownRefs) for (const ref of knownRefs) availableRefs.add(ref);
  const resolveContext: ConversationSceneResolveContext = { availableRefs, phaseOrder: lessonInfo.phaseOrder };
  const baseStep = conversationSceneToLessonStep(scene, resolveContext);
  // Nível de apresentação pelo histórico: uma cena que reaparece sobe de nível.
  const level = conversationVariantLevelFor(scene, selection?.history);
  const step = withUnaidedReplies(baseStep, level);
  step.conversationVariantLevel = level;
  if (knownGlyphs) step.conversationRepairBeat = conversationRepairBeatFor(knownGlyphs);
  return step;
}

/**
 * Candidata dedicada: troca de frases a partir de questions/answers do packet.
 * Entra no pool junto com a cena autoral para preencher o 2º slot de diálogo.
 */
function makePacketExchangeConversationStep(
  focus: FocusItem[],
  reviewFocus: FocusItem[] = [],
  selection?: ConversationSceneSelection,
  knownGlyphs?: ReadonlySet<string>
): LessonStep | null {
  const focusOnly = new Set(focusRefs(focus));
  const reviewOnly = new Set(focusRefs(reviewFocus));
  const refs = new Set([...focusOnly, ...reviewOnly]);
  const knownRefs = selection?.knownRefs;
  const phaseOrder = selection?.lessonInfo?.phaseOrder;
  const preferredPacketIntents = preferredSceneIntentsForRefs(focusOnly, reviewOnly);
  const lessonInfo: ConversationSceneLessonInfo = {
    ...(selection?.lessonInfo ?? { focusRefs: focusOnly, reviewRefs: reviewOnly }),
    focusRefs: selection?.lessonInfo?.focusRefs ?? focusOnly,
    reviewRefs: selection?.lessonInfo?.reviewRefs ?? reviewOnly,
    preferredPacketIntents:
      selection?.lessonInfo?.preferredPacketIntents ?? preferredPacketIntents,
  };
  const selectionContext = selection?.context ?? {};
  const packetScenes = buildPacketPhraseExchangeCandidates(focusOnly, reviewOnly, {
    knownRefs,
    usedSceneIds: lessonInfo.usedSceneIds,
    variantIndex: (phaseOrder ?? 1) + 3 + (selectionContext.recentConversationSceneIds?.length ?? 0),
    limit: 4,
  }).filter((scene) =>
    isConversationSceneEligible(scene, {
      lessonRefs: refs,
      knownRefs,
      isReviewLesson: selection?.isReviewLesson,
      allowImmersion: selection?.allowImmersion,
      generatedContext: true,
      phaseOrder,
    })
  );
  if (packetScenes.length === 0) return null;
  const previousSceneIds = selectionContext.lastLessonSceneIds?.length
    ? selectionContext.lastLessonSceneIds
    : (selectionContext.recentConversationSceneIds ?? []).slice(0, 1);
  const fresh = packetScenes.filter((scene) => !previousSceneIds.includes(scene.sceneId));
  const scene = pickBestConversationScene(fresh.length > 0 ? fresh : packetScenes, lessonInfo, selectionContext);
  if (!scene) return null;
  const availableRefs = new Set(refs);
  if (knownRefs) for (const ref of knownRefs) availableRefs.add(ref);
  const resolveContext: ConversationSceneResolveContext = { availableRefs, phaseOrder: lessonInfo.phaseOrder };
  const baseStep = conversationSceneToLessonStep(scene, resolveContext);
  const level = conversationVariantLevelFor(scene, selection?.history);
  const step = withUnaidedReplies(baseStep, level);
  step.conversationVariantLevel = level;
  if (knownGlyphs) step.conversationRepairBeat = conversationRepairBeatFor(knownGlyphs);
  return step;
}

// ————————————————————————————————————————————————————————————————
// Análise de cobertura de cenas (fonte única para o relatório e para o
// validador). Percorre a jornada como um aluno real percorreria — com rotação
// (recentConversationSceneIds/Intents encadeados) — para medir dominância de
// forma honesta, e calcula a primeira lição elegível de cada cena.
// ————————————————————————————————————————————————————————————————

export interface ConversationSceneCoverageRow {
  sceneId: string;
  intent: string;
  role: ConversationSceneRoleName;
  requiredRefs: string[];
  optionalRefs: string[];
  newRefs: string[];
  firstEligibleLessonId: string | null;
  firstEligiblePhaseOrder: number | null;
  eligibleCommon: boolean;
  authoredUses: number;
  generatedUses: number;
  generatedLessonIds: string[];
  blockReason: string;
  recommendedAction: string;
}

type ConversationSceneRoleName = "legacy" | "common" | "module_review" | "immersion";

export interface ConversationSceneCoverage {
  lessonCount: number;
  lessonsWithGeneratedScene: number;
  totalGenerated: number;
  distinctUsed: number;
  distinctScenes: number;
  generatedByIntent: Map<string, number>;
  authoredUseBySceneId: Map<string, number>;
  generatedUseBySceneId: Map<string, number>;
  rows: ConversationSceneCoverageRow[];
}

function conversationSceneRoleName(scene: ConversationSceneDefinition): ConversationSceneRoleName {
  return (scene.sceneRole ?? (scene.nodes?.length ? "common" : "legacy")) as ConversationSceneRoleName;
}

/** Refs disponíveis para a cena numa lição: foco + revisão + currículo até aqui. */
function planningRefsForLesson(lesson: Lesson): { lessonRefs: Set<string>; knownRefs: ReadonlySet<string> } {
  const focus = focusForPlanning(lesson, {});
  const reviewFocus = combinedReviewFocus(lesson, {});
  const lessonRefs = new Set([...focusRefs(focus), ...focusRefs(reviewFocus)]);
  return { lessonRefs, knownRefs: curriculumRefsThroughLesson(lesson.id) };
}

export function analyzeConversationSceneCoverage(): ConversationSceneCoverage {
  const authoredUseBySceneId = new Map<string, number>();
  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps) {
      if (step.kind === "conversation_scene" && step.sceneId) {
        authoredUseBySceneId.set(step.sceneId, (authoredUseBySceneId.get(step.sceneId) ?? 0) + 1);
      }
    }
  }

  // Passo gerado com rotação encadeada (como um aluno real percorreria).
  const generatedUseBySceneId = new Map<string, number>();
  const generatedLessonIds = new Map<string, string[]>();
  const generatedByIntent = new Map<string, number>();
  let lessonsWithGeneratedScene = 0;
  let totalGenerated = 0;
  let recentSceneIds: string[] = [];
  let recentIntentIds: string[] = [];
  for (const lesson of ALL_LESSONS) {
    const plan = buildLessonPracticePlan(lesson, {
      silent: true,
      recentConversationSceneIds: recentSceneIds,
      recentConversationIntentIds: recentIntentIds,
    });
    const scenes = plan.filter((step) => step.kind === "conversation_scene" && step.generated && step.sceneId);
    if (scenes.length > 0) lessonsWithGeneratedScene += 1;
    for (const step of scenes) {
      const sceneId = step.sceneId as string;
      const intent = step.sceneIntent ?? conversationSceneById[sceneId]?.intent ?? "(sem intent)";
      generatedUseBySceneId.set(sceneId, (generatedUseBySceneId.get(sceneId) ?? 0) + 1);
      generatedByIntent.set(intent, (generatedByIntent.get(intent) ?? 0) + 1);
      generatedLessonIds.set(sceneId, [...(generatedLessonIds.get(sceneId) ?? []), lesson.id]);
      totalGenerated += 1;
      recentSceneIds = [sceneId, ...recentSceneIds.filter((id) => id !== sceneId)].slice(0, 10);
      recentIntentIds = [intent, ...recentIntentIds.filter((id) => id !== intent)].slice(0, 10);
    }
  }

  // Elegibilidade por lição (primeira lição elegível de cada cena).
  const firstEligible = new Map<string, { lessonId: string; phaseOrder: number }>();
  const eligibleCommon = new Set<string>();
  for (const lesson of ALL_LESSONS) {
    const { lessonRefs, knownRefs } = planningRefsForLesson(lesson);
    const isReviewLesson = Boolean(lesson.isReview);
    const allowImmersion = lessonAllowsImmersionScenes(lesson);
    const phaseOrder = lessonPhaseOrder(lesson);
    for (const scene of CONVERSATION_SCENES) {
      if (
        !isConversationSceneEligible(scene, {
          lessonRefs,
          knownRefs,
          isReviewLesson,
          allowImmersion,
          generatedContext: true,
          phaseOrder,
        })
      ) {
        continue;
      }
      if (!firstEligible.has(scene.sceneId)) {
        firstEligible.set(scene.sceneId, { lessonId: lesson.id, phaseOrder });
      }
      if (!isReviewLesson && !allowImmersion) eligibleCommon.add(scene.sceneId);
    }
  }

  const rows: ConversationSceneCoverageRow[] = CONVERSATION_SCENES.map((scene) => {
    const role = conversationSceneRoleName(scene);
    const authoredUses = authoredUseBySceneId.get(scene.sceneId) ?? 0;
    const generatedUses = generatedUseBySceneId.get(scene.sceneId) ?? 0;
    const elig = firstEligible.get(scene.sceneId) ?? null;
    const requiredRefs = scene.learnedRefs;
    const newRefs = scene.newRefs ?? [];
    const optionalRefs = scene.optionalRefs ?? [];
    const { blockReason, recommendedAction } = conversationBlockDiagnosis({
      scene,
      role,
      authoredUses,
      generatedUses,
      firstEligibleLessonId: elig?.lessonId ?? null,
      eligibleCommon: eligibleCommon.has(scene.sceneId),
    });
    return {
      sceneId: scene.sceneId,
      intent: scene.intent,
      role,
      requiredRefs,
      optionalRefs,
      newRefs,
      firstEligibleLessonId: elig?.lessonId ?? null,
      firstEligiblePhaseOrder: elig?.phaseOrder ?? null,
      eligibleCommon: eligibleCommon.has(scene.sceneId),
      authoredUses,
      generatedUses,
      generatedLessonIds: generatedLessonIds.get(scene.sceneId) ?? [],
      blockReason,
      recommendedAction,
    };
  });

  const distinctUsed = rows.filter((row) => row.authoredUses > 0 || row.generatedUses > 0).length;

  return {
    lessonCount: ALL_LESSONS.length,
    lessonsWithGeneratedScene,
    totalGenerated,
    distinctUsed,
    distinctScenes: CONVERSATION_SCENES.length,
    generatedByIntent,
    authoredUseBySceneId,
    generatedUseBySceneId,
    rows,
  };
}

/** Nunca ensinado no currículo: o requiredRef não aparece em nenhuma lição. */
function conversationRefEverAvailable(ref: string): boolean {
  const last = ALL_LESSONS[ALL_LESSONS.length - 1];
  if (!last) return false;
  return curriculumRefsThroughLesson(last.id).has(ref) || CORE_REVIEW_REFS.includes(ref);
}

function conversationBlockDiagnosis(input: {
  scene: ConversationSceneDefinition;
  role: ConversationSceneRoleName;
  authoredUses: number;
  generatedUses: number;
  firstEligibleLessonId: string | null;
  eligibleCommon: boolean;
}): { blockReason: string; recommendedAction: string } {
  const { scene, role, authoredUses, generatedUses, firstEligibleLessonId, eligibleCommon } = input;
  if (authoredUses > 0 || generatedUses > 0) {
    return { blockReason: "—", recommendedAction: "nenhuma (já aparece nos planos)" };
  }
  // newRefs são a novidade que a própria cena apresenta — não precisam ter sido
  // ensinados antes; só os learnedRefs (pré-requisitos) contam como bloqueio.
  const neverTaught = scene.learnedRefs.filter((ref) => !conversationRefEverAvailable(ref));
  if (neverTaught.length > 0) {
    return {
      blockReason: `requiredRef nunca disponível no currículo: ${neverTaught.join(", ")}`,
      recommendedAction: "corrigir refs (usar átomos ensinados), ensinar o vocabulário ou inserir à mão",
    };
  }
  if (role === "immersion") {
    return {
      blockReason: "papel immersion: nunca entra na geração comum (só em lição de imersão)",
      recommendedAction: "inserir à mão numa lição de imersão dedicada",
    };
  }
  if (role === "module_review") {
    return {
      blockReason: "papel module_review: só entra em revisão de módulo",
      recommendedAction: "inserir à mão numa lição de revisão de módulo",
    };
  }
  if (Boolean(scene.dedicatedLesson) || (scene.newRefs?.length ?? 0) > 1) {
    return {
      blockReason: "cena dedicada: excluída da geração comum",
      recommendedAction: "inserir à mão na lição dedicada correspondente",
    };
  }
  if (firstEligibleLessonId === null) {
    return {
      blockReason: "nunca elegível: nenhum requiredRef toca o foco quando todos já estão disponíveis",
      recommendedAction: "reduzir requiredRefs ao essencial da intenção ou inserir à mão",
    };
  }
  if (!eligibleCommon) {
    return {
      blockReason: `só elegível fora de lição comum (a partir de ${firstEligibleLessonId})`,
      recommendedAction: "reduzir requiredRefs ao essencial ou inserir à mão",
    };
  }
  return {
    blockReason: `elegível a partir de ${firstEligibleLessonId}, mas perde na pontuação para cenas dominantes`,
    recommendedAction: "inserção autoral no momento certo e/ou reduzir dominância das cenas comuns",
  };
}

function makeMatchPairsStep(focus: FocusItem[]): LessonStep | null {
  const reviewItems = CORE_REVIEW_REFS
    .map(focusFromRef)
    .filter((item): item is FocusItem => Boolean(item));
  const items: FocusItem[] = [];
  // Só itens seguros viram par: hànzì curto à esquerda, gloss curto à direita.
  // Frases/explicações e texto misto PT+hànzì são descartados. Mantém a mesma
  // mistura de antes (até 3 do conteúdo novo + revisão do núcleo), garantindo
  // que uma frase antiga do núcleo entre nos pares como revisão leve.
  const safeFocus = focus.filter(isSafePairFocusItem).slice(0, 3);
  const safeReview = reviewItems.filter(isSafePairFocusItem);
  for (const item of [...safeFocus, ...safeReview]) {
    addFocusItem(items, item);
    if (items.length >= 4) break;
  }
  if (items.length < 2) return null;
  return {
    kind: "match_pairs",
    title: "Fixe com pares",
    body: "Combine o conteúdo novo com sentido, junto com revisão leve.",
    pairs: items.map((item) => ({
      left: item.hanzi,
      right: item.meaningPt,
      leftType: "hanzi",
      rightType: "pt",
      reinforcement: true,
      reviewType: item.type,
      reviewItemId: item.itemId,
    })),
    explanation: "Os pares reforçam o que acabou de aparecer e contam como revisão leve.",
  };
}

function makeIntroListenStep(item: FocusItem): LessonStep {
  return {
    kind: "listen",
    text: item.hanzi,
    pinyin: item.pinyin,
    pt: item.meaningPt,
  };
}

// ————————————————————————————————————————————————————————————————
// Geração automática de exercícios visuais (image_choice).
//
// Um item de foco só gera exercício visual quando resolve para um conceito
// CONCRETO do catálogo (visualVocabulary) já liberado na unidade atual
// (afterUnitIndex). Conceitos abstratos (partículas, pronomes, gramática)
// retornam null — nunca inserimos imagem artificialmente.
// ————————————————————————————————————————————————————————————————

// Ao escolher o conceito dentro de um chunk, substantivos concretos vêm antes
// de quantidades e ações ("我想喝茶" ilustra 茶, não 喝).
const VISUAL_CATEGORY_PRIORITY: Record<VisualCategory, number> = {
  people: 0,
  nature: 0,
  animals: 0,
  food: 0,
  objects: 0,
  places: 0,
  quantity: 1,
  actions: 2,
};

/** Resolve o conceito visual concreto de um item de foco (ou undefined se abstrato). */
function visualConceptForFocusItem(item: FocusItem, unitIndex: number): VisualConcept | undefined {
  if (unitIndex < 0) return undefined;
  if (item.type === "char" && item.itemId) {
    const direct = visualByCharId[item.itemId];
    return direct && isVisualConceptAllowed(direct.id, unitIndex) ? direct : undefined;
  }
  const matches: { concept: VisualConcept; index: number }[] = [];
  const hanziText = cleanHanzi(item.hanzi);
  for (const concept of visualConceptsInHanziText(hanziText)) {
    if (!concept || !isVisualConceptAllowed(concept.id, unitIndex)) continue;
    if (matches.some((entry) => entry.concept.id === concept.id)) continue;
    matches.push({ concept, index: hanziText.indexOf(concept.hanzi) });
  }
  matches.sort(
    (a, b) =>
      VISUAL_CATEGORY_PRIORITY[a.concept.category] - VISUAL_CATEGORY_PRIORITY[b.concept.category] ||
      a.index - b.index ||
      b.concept.hanzi.length - a.concept.hanzi.length
  );
  return matches[0]?.concept;
}

// Quantos "contatos" o aluno já teve com o conceito: distância entre a unidade
// atual e a unidade em que ele foi ensinado. Guia a progressão visual:
// 1º contato imagem→significado, 2º imagem→hànzì, 3º áudio→imagem,
// 4º em diante hànzì→imagem (e pinyin em reconhecimento avançado).
function visualContactLevel(concept: VisualConcept, unitIndex: number): number {
  return Math.max(0, unitIndex - concept.afterUnitIndex);
}

function imageModeForStage(stageId: LessonStageId, contact: number): ImageChoiceMode {
  if (stageId === "usage") {
    return contact >= 3 ? "choose_image" : "listen_and_choose_image";
  }
  if (stageId === "consolidation") {
    // Revisão retoma o conceito num modo DIFERENTE do usado no primeiro contato.
    const rotation: ImageChoiceMode[] = [
      "choose_image",
      "choose_pinyin",
      "listen_and_choose_image",
      "choose_hanzi",
      "choose_meaning",
    ];
    return rotation[contact % rotation.length];
  }
  if (contact <= 0) return "choose_meaning";
  if (contact === 1) return "choose_hanzi";
  return "choose_pinyin";
}

const IMAGE_MODE_FALLBACK_ORDER: ImageChoiceMode[] = [
  "choose_meaning",
  "choose_hanzi",
  "listen_and_choose_image",
  "choose_image",
  "choose_pinyin",
];

const visualConceptIndex = new Map<string, VisualConcept>();
for (const concept of Object.values(visualByCharId)) {
  if (concept) visualConceptIndex.set(concept.id, concept);
}

function visualDistractorConcepts(concept: VisualConcept, count: number, imageOnly = false): VisualConcept[] {
  return defaultVisualDistractors(concept.id, count)
    .map((id) => visualConceptIndex.get(id))
    .filter(
      (candidate): candidate is VisualConcept =>
        Boolean(candidate) && (!imageOnly || candidate?.imageOnlySafe !== false)
    );
}

function imageChoiceStepForConcept(concept: VisualConcept, mode: ImageChoiceMode): LessonStep | null {
  const base: LessonStep = {
    kind: "image_choice",
    imageChoiceMode: mode,
    imageId: concept.id,
    targetHanzi: concept.hanzi,
    targetPinyin: concept.pinyin,
    targetMeaningPt: concept.meaningPt,
    explanation: `${concept.hanzi} (${concept.pinyin}) = ${concept.meaningPt}.`,
  };

  if (mode === "choose_image" || mode === "listen_and_choose_image") {
    if (concept.imageOnlySafe === false) return null;
    const optionIds = uniqueValues([concept.id, ...visualDistractorConcepts(concept, 3, true).map((c) => c.id)]).slice(0, 4);
    if (optionIds.length < 3) return null;
    return {
      ...base,
      promptPt:
        mode === "choose_image"
          ? `Qual imagem combina com ${concept.hanzi}?`
          : "Ouça e escolha a imagem certa.",
      imageOptions: optionIds,
      correctImageId: concept.id,
    };
  }

  if (mode === "choose_hanzi") {
    const options = uniqueValues([concept.hanzi, ...visualDistractorConcepts(concept, 5).map((c) => c.hanzi)]).slice(0, 4);
    if (options.length < 3) return null;
    return { ...base, promptPt: "Qual hànzì combina com a imagem?", options, correctAnswer: concept.hanzi };
  }

  if (mode === "choose_meaning") {
    const options = uniqueValues([concept.meaningPt, ...visualDistractorConcepts(concept, 5).map((c) => c.meaningPt)]).slice(0, 4);
    if (options.length < 3) return null;
    return { ...base, promptPt: "O que a imagem mostra?", options, correctAnswer: concept.meaningPt };
  }

  // choose_pinyin: bases todas diferentes (妈 mā e 马 mǎ nunca lado a lado).
  const options = uniqueByPinyinBase([
    concept.pinyin,
    ...visualDistractorConcepts(concept, 8).map((c) => c.pinyin),
  ]).slice(0, 4);
  if (options.length < 3) return null;
  if (isNearDuplicatePinyinSet(options)) return null;
  return { ...base, promptPt: "Qual é o pinyin do que a imagem mostra?", options, correctAnswer: concept.pinyin };
}

/**
 * Gera um exercício visual para o item de foco, respeitando a unidade atual
 * (afterUnitIndex), a progressão de modos por estágio e a regra de não repetir
 * a mesma imagem na lição. Retorna null para conceitos abstratos.
 */
export function makeImageChoiceStepForFocus(
  item: FocusItem,
  unitIndex: number,
  stageId: LessonStageId = "recognition",
  usedConceptIds?: ReadonlySet<string>
): LessonStep | null {
  const concept = visualConceptForFocusItem(item, unitIndex);
  if (!concept) return null;
  if (usedConceptIds?.has(concept.id)) return null;
  const contact = visualContactLevel(concept, unitIndex);
  const preferred = imageModeForStage(stageId, contact);
  for (const mode of [preferred, ...IMAGE_MODE_FALLBACK_ORDER.filter((candidate) => candidate !== preferred)]) {
    const step = imageChoiceStepForConcept(concept, mode);
    if (step) return step;
  }
  return null;
}

function imageConceptIdOfStep(step: LessonStep): string | undefined {
  if (step.kind !== "image_choice" && step.kind !== "compare_with_image") return undefined;
  const id = String(step.imageId ?? step.iconId ?? "").trim();
  return id || undefined;
}

// Conceito visual ensinado em unidade ANTERIOR à atual — usado para garantir
// que revisões de módulo revisitem uma imagem antiga.
function isPriorUnitImageStep(step: LessonStep, unitIndex: number): boolean {
  const conceptId = imageConceptIdOfStep(step);
  const concept = conceptId ? visualConceptIndex.get(conceptId) : undefined;
  return Boolean(concept && unitIndex >= 0 && concept.afterUnitIndex < unitIndex);
}

function stepSignature(step: LessonStep): string {
  return [
    step.kind,
    step.pedagogyVariant,
    step.dictationMode,
    step.title,
    step.text,
    step.hanzi,
    step.answer,
    step.audioText,
    step.correctAnswer,
    step.charId,
    step.chunkId,
    step.sceneId,
    step.imageChoiceMode,
    step.compareWithImageMode,
    step.compareWithImageLevel,
    step.imageId,
    step.correctImageId,
    step.target?.join("|"),
    step.targetParts?.join("|"),
    step.acceptedTargetParts?.map((parts) => parts.join("+")).join("|"),
    step.audioSequence?.join("|"),
    step.pairs?.map((pair) => `${pair.left}=${pair.right}`).join("|"),
    step.learnedRefs?.join("|"),
  ].filter(Boolean).join("::");
}

interface SupplementalStepOptions {
  phaseOrder?: number;
  reviewFocus?: FocusItem[];
  hanziBuilderProgress?: HanziBuilderProgressMap;
  seenGlyphs?: ReadonlySet<string>;
  ownFocusGlyphs?: ReadonlySet<string>;
  allowComposedFiller?: boolean;
  /** Índice da unidade atual na jornada; necessário para exercícios visuais. */
  unitIndex?: number;
  /** Lições abstratas (pinyin/tom/gramática) não recebem imagem artificialmente. */
  allowImageSteps?: boolean;
  /** Seleção de cena de conversa por pontuação (foco, intenções, recência). */
  sceneSelection?: ConversationSceneSelection;
  /** Lição atual: libera os motores de percepção pelo currículo já percorrido. */
  lessonId?: string;
  practiceVariant?: "A" | "B" | "C";
  /**
   * Deslocamento de novidade da tentativa. Vem da CONTAGEM de tentativas, não
   * da variante: com a rota dirigida pela fraqueza, a variante pode repetir
   * legitimamente, e se a semente ainda saísse dela a mesma frase inédita
   * voltaria — frase inédita repetida vira frase decorada.
   */
  variantSeedOffset?: number;
  /** Revisões de módulo preservam a matriz de cobertura autoral completa. */
  enablePedagogyVariants?: boolean;
  /** Tentativa da lição (0 = primeira): controla o degrau máximo de transferência. */
  attemptNumber?: number;
  /** Exposição de estruturas para gate de free/open (inclui foco da lição). */
  structureExposure?: StructureExposureMap;
  /** Exposição só do histórico anterior — gate de transferência. */
  structureExposureForTransfer?: StructureExposureMap;
  /** Frames com transfer em lição anterior — scaffold inicial mais/menos guiado. */
  priorTransferredFrames?: ReadonlySet<string>;
}

function supplementalStepsForStage(
  stageId: LessonStageId,
  focus: FocusItem[],
  targetCount: number,
  options: SupplementalStepOptions = {}
): LessonStep[] {
  if (focus.length === 0 || targetCount <= 0) return [];
  const result: LessonStep[] = [];
  const phaseOrder = options.phaseOrder ?? 1;
  const builderProgress = options.hanziBuilderProgress;
  const builderSelection: BuilderSelectionContext = {
    seenGlyphs: options.seenGlyphs,
    ownFocusGlyphs: options.ownFocusGlyphs,
    allowComposedFiller: options.allowComposedFiller,
  };
  const reviewFocus = options.reviewFocus?.length ? options.reviewFocus : focus;
  const picks = framePickOptionsFor({
    lessonId: options.lessonId,
    structureExposure: options.structureExposure,
    priorTransferredFrames: options.priorTransferredFrames,
  });
  // Na fundação / fases 1–2, CORE_REVIEW (再见/谢谢/明天…) não pode virar
  // fill/build/ditado — o aluno ainda não aprendeu esses chunks.
  const foundationLite =
    phaseOrder <= 2 || FOUNDATION_LESSON_IDS.includes(options.lessonId ?? "");
  const practiceFocus = foundationLite ? focus : reviewFocus;
  const allowDictation = !foundationLite && phaseOrder >= 3;
  // Conversa permanece em todas as lições (como na main): sem ela as
  // lições-conceito caem no portão validate:exercise-depth e o rodízio
  // precoce de cenas fica pobre. foundationLite só segura fill/ditado.
  const allowConversation = true;
  const allowSpotError = phaseOrder >= 3;
  // Motores de percepção: um "seed" estável por lição faz o par mínimo, o
  // grupo semântico e a frase certa girarem entre lições em vez de repetir
  // sempre o primeiro item do banco.
  const knownGlyphs = knownGlyphsFor(options);
  const drillSeed = drillSeedFor(options.lessonId, stageId);
  const practiceVariant = options.practiceVariant ?? "A";
  // Base numérica da novidade. Mantém o mesmo passo do esquema anterior
  // (65/66/67 de "A"/"B"/"C") para que a 1ª tentativa gere exatamente o mesmo
  // plano de antes; o que muda é de ONDE o número vem.
  const variantSeedBase = 65 + (options.variantSeedOffset ?? 0);
  const enablePedagogyVariants = options.enablePedagogyVariants ?? true;
  const push = (step: LessonStep | null) => {
    if (!step || result.length >= targetCount) return;
    if (result.some((candidate) => stepSignature(candidate) === stepSignature(step))) return;
    result.push(step);
  };

  // Exercícios visuais gerados: só em lições concretas (allowImageSteps), sem
  // repetir o mesmo conceito dentro do estágio.
  const unitIndex = options.unitIndex ?? -1;
  const allowImages = Boolean(options.allowImageSteps) && unitIndex >= 0;
  const usedImageConcepts = new Set<string>();
  const pushImage = (item: FocusItem, cap: number) => {
    if (!allowImages || usedImageConcepts.size >= cap) return;
    const step = makeImageChoiceStepForFocus(item, unitIndex, stageId, usedImageConcepts);
    if (!step) return;
    const before = result.length;
    push(step);
    const conceptId = imageConceptIdOfStep(step);
    if (result.length > before && conceptId) usedImageConcepts.add(conceptId);
  };

  if (stageId === "intro") {
    push(makeIntroListenStep(focus[0]));
    if (focus[1]) push(makeIntroListenStep(focus[1]));
    push(makeComprehendStep(focus[0], focus));
  } else if (stageId === "recognition") {
    // A primeira tentativa preserva o percurso autoral. As tentativas B/C
    // introduzem a discriminação auditiva sem alterar o ciclo pós-conversa.
    if (enablePedagogyVariants && practiceVariant !== "A") {
      for (const [index, item] of focus.entries()) {
        push(
          makeVariantAudioSameDifferentStep(
            item,
            focus,
            (index + variantSeedBase + (practiceVariant === "C" ? 1 : 0)) % 2 === 0
          )
        );
        if (result.length >= Math.min(2, targetCount)) break;
      }
    }
    // Imagem → hànzì/significado/pinyin: reconhecer o conceito concreto pela imagem.
    for (const item of focus) pushImage(item, 2);
    // Ouvido e sentido entram ANTES da bateria de reconhecimento: se ficassem
    // no fim, o orçamento do estágio já teria acabado e a lição voltaria a ser
    // só múltipla escolha.
    push(makeAudioDiscriminationStep(knownGlyphs, drillSeed));
    push(makeOddOneOutStep(knownGlyphs, drillSeed, phaseOrder));
    for (const item of focus) {
      push(makeRecognizeStep(item));
      push(makeDecomposeStep(item));
      push(makeListenSelectStep(item, focus));
      push(makeComprehendStep(item, focus));
      push(makePinyinChoiceStep(item, focus));
      push(makeToneMicroStep(item));
      if (result.length >= targetCount) break;
    }
    push(makeTonePairStep(focus));
  } else if (stageId === "assembly") {
    // O ditado do primeiro item abre o estágio: escrever o que se ouviu é a
    // ponte entre som e forma, e precisa vir antes de a montagem visual
    // consumir o orçamento — mas não nas lições-conceito de fundação.
    const priorGlyphs = curriculumGlyphsBeforeLesson(options.lessonId);
    const productionReady = (item: FocusItem) => allCjkGlyphsKnown(item.hanzi, priorGlyphs);
    if (allowDictation) {
      const dictationSource = [...focus, ...practiceFocus].find(
        (item) => productionReady(item) && Boolean(item.pinyin)
      );
      if (dictationSource) push(makeDictationStep(dictationSource, focus, phaseOrder));
    }
    const labPool = [...focus, ...practiceFocus];
    const labItem =
      labPool.find(
        (item) => productionReady(item) && sentenceAlternatives(cleanHanzi(item.hanzi)).length > 1
      ) ?? labPool.find((item) => productionReady(item) && cleanHanzi(item.hanzi).length >= 2);
    if (enablePedagogyVariants && !foundationLite) {
      const labDistractors = labItem ? makeSentenceLabStep(labItem, focus, "sentence_lab_distractors") : null;
      const labAudio = labItem ? makeSentenceLabStep(labItem, focus, "sentence_lab_audio") : null;
      if (practiceVariant === "B") {
        if (labItem && labDistractors) {
          push(labDistractors);
          push(makeDragonDictationStep(labItem, focus, "blocks"));
        } else {
          const intentionItem = focus[0] ?? practiceFocus[0];
          const intention = intentionItem
            ? makeDialogueChoiceStep(intentionItem, [...focus, ...practiceFocus], knownGlyphs)
            : null;
          push(intention ? { ...intention, pedagogyVariant: "meaning_intention_match" } : null);
        }
      }
      if (practiceVariant === "C") {
        if (labAudio) push(labAudio);
        push(makeVariantOddOneOutStep([...focus, ...practiceFocus]));
      }
    }
    for (const item of focus) {
      push(makeHanziBuilderStep(item, phaseOrder, builderProgress, builderSelection));
      if (productionReady(item)) {
        push(makeSentenceBuildStep(item, focus));
        if (allowDictation) push(makeDictationStep(item, focus, phaseOrder));
      }
      push(makeAssemblyChoiceStep(item, focus, knownGlyphs));
      if (result.length >= targetCount) break;
    }
  } else if (stageId === "usage") {
    const primary = focus.find((item) => cleanHanzi(item.hanzi).length >= 2) ?? focus[0];
    if (enablePedagogyVariants && !foundationLite && practiceVariant === "B") {
      const intention = makeDialogueChoiceStep(primary, focus, knownGlyphs);
      push(intention ? { ...intention, pedagogyVariant: "meaning_intention_match" } : null);
      if (allowSpotError) push(makeVariantSpotErrorStep(primary));
    }
    if (enablePedagogyVariants && !foundationLite && practiceVariant === "C") {
      if (allowSpotError) push(makeVariantSpotErrorStep(primary));
    }
    // Hànzì → imagem e áudio → imagem: usar o que já foi reconhecido.
    for (const item of focus) pushImage(item, 1);
    // Ditado também no uso: o rodízio de percepção precisa de candidato
    // nesta fase, senão o cap/reserva deixa a jornada com < 8 ditados.
    if (allowDictation) {
      const priorGlyphs = curriculumGlyphsBeforeLesson(options.lessonId);
      const dictationItem = [...focus, ...practiceFocus].find(
        (item) =>
          allCjkGlyphsKnown(item.hanzi, priorGlyphs) &&
          Boolean(item.pinyin?.trim()) &&
          cleanHanzi(item.hanzi).length >= 2
      );
      if (dictationItem) push(makeDictationStep(dictationItem, focus, phaseOrder));
    }
    // A cena de conversa entra cedo: é o exercício de uso mais rico.
    // Em lições-conceito de fundação, não misturar CORE_REVIEW no pool da cena.
    // Em microtarefas de tom, a cena pode ancorar o som em frase conhecida, mas
    // o loop pós-conversa (abaixo) não vira bateria de seed (PED-021/027).
    if (allowConversation) {
      const conversationReview = FOUNDATION_LESSON_IDS.includes(options.lessonId ?? "") &&
        options.lessonId !== "p1-engine-2-lab"
        ? focus
        : reviewFocus;
      push(makeConversationSceneStep(focus, conversationReview, options.sceneSelection, knownGlyphs));
      if (lessonAllowsPacketExchange(options.lessonId, phaseOrder)) {
        push(makePacketExchangeConversationStep(focus, conversationReview, options.sceneSelection, knownGlyphs));
      }
    }
    // Escada: julgar → completar → produzir com apoio.
    // Transferência e produção aberta ficam para consolidação / lições seguintes.
    if (allowSpotError) push(makeSpotErrorStep(knownGlyphs, drillSeed));
    const priorForBlank = curriculumGlyphsBeforeLesson(options.lessonId);
    for (const item of focus) {
      push(makeDialogueChoiceStep(item, focus, knownGlyphs));
      // R10: fill_blank gerado só com glifos já disponíveis no currículo anterior.
      if (allCjkGlyphsKnown(item.hanzi, priorForBlank)) {
        push(makeFillBlankStep(item, focus));
      }
      if (result.length >= targetCount) break;
    }
    if (!foundationLite) {
      push(
        makeFreeProductionStep(
          knownGlyphs,
          drillSeed + variantSeedBase * 5,
          undefined,
          options.structureExposure,
          picks
        )
      );
      push(makeConversationRepairStep(knownGlyphs, drillSeed + variantSeedBase, primary));
      push(makeOldPhraseReuseStep(focus, options.lessonId ? ALL_LESSONS.find((item) => item.id === options.lessonId) : undefined));
    }
  } else {
    const combined = [...practiceFocus, ...focus];
    const primary = combined.find((item) => cleanHanzi(item.hanzi).length >= 2) ?? combined[0];
    if (enablePedagogyVariants && !foundationLite && practiceVariant === "B") {
      push(makeDragonDictationStep(primary, combined, "pinyin"));
      push(makeSentenceLabStep(primary, combined, "sentence_lab_no_translation"));
    }
    if (enablePedagogyVariants && !foundationLite && practiceVariant === "C") {
      push(makeDragonDictationStep(primary, combined, phaseOrder >= 6 ? "immersion" : "hanzi"));
      push(makeSentenceLabStep(primary, combined, "sentence_lab_repair"));
    }
    // Consolidação revisita imagens ANTIGAS (practiceFocus e núcleo) num modo diferente.
    for (const item of practiceFocus) pushImage(item, 2);
    for (const item of oldPhraseFocus(
      [...focus, ...practiceFocus],
      options.lessonId ? ALL_LESSONS.find((entry) => entry.id === options.lessonId) : undefined
    ))
      pushImage(item, 3);
    for (const item of focus) pushImage(item, 3);
    push(makeMatchPairsStep([...practiceFocus, ...focus]));
    push(makeTonePairStep([...practiceFocus, ...focus]));
    push(makeAudioDiscriminationStep(knownGlyphs, drillSeed + 1));
    push(makeOddOneOutStep(knownGlyphs, drillSeed + 1, phaseOrder));
    if (allowSpotError) push(makeSpotErrorStep(knownGlyphs, drillSeed + 1));
    // Consolidar: transferência só se a estrutura já teve produção guiada antes.
    const variantSeed = drillSeed + 1 + variantSeedBase * 7;
    if (!foundationLite) {
      push(
        makeTransferStep(
          knownGlyphs,
          variantSeed,
          undefined,
          options.attemptNumber ?? 0,
          options.structureExposureForTransfer ?? options.structureExposure,
          options.priorTransferredFrames,
          picks
        )
      );
      push(makeFreeProductionStep(knownGlyphs, variantSeed, undefined, options.structureExposure, picks));
      push(makeOpenProductionStep(knownGlyphs, variantSeed, options.structureExposureForTransfer ?? options.structureExposure, picks));
      push(makeConversationRepairStep(knownGlyphs, variantSeed, primary));
    }
    if (allowConversation) {
      const conversationReview = FOUNDATION_LESSON_IDS.includes(options.lessonId ?? "") &&
        options.lessonId !== "p1-engine-2-lab"
        ? focus
        : reviewFocus;
      push(makeConversationSceneStep(focus, conversationReview, options.sceneSelection, knownGlyphs));
      if (lessonAllowsPacketExchange(options.lessonId, phaseOrder)) {
        push(makePacketExchangeConversationStep(focus, conversationReview, options.sceneSelection, knownGlyphs));
      }
    }
    const reviewForDrills = focusSafeForProductionDrills(practiceFocus, options.lessonId);
    const priorGlyphs = curriculumGlyphsBeforeLesson(options.lessonId);
    for (const item of [...reviewForDrills, ...focus]) {
      push(makeComprehendStep(item, [...reviewForDrills, ...focus]));
      push(makeHanziBuilderStep(item, phaseOrder, builderProgress, builderSelection));
      if (allCjkGlyphsKnown(item.hanzi, priorGlyphs)) {
        push(makeFillBlankStep(item, [...reviewForDrills, ...focus]));
        if (allowDictation) {
          push(makeDictationStep(item, [...reviewForDrills, ...focus], phaseOrder, { immersion: phaseOrder >= 4 }));
        }
      }
      if (result.length >= targetCount) break;
    }
  }

  return result;
}

function moduleReviewGapCandidates(
  lesson: Lesson,
  focus: FocusItem[],
  reviewFocus: FocusItem[],
  selected: readonly PracticeCandidate[]
): PracticeCandidate[] {
  if (!lesson.isReview) return [];
  const unitId = lessonUnitId(lesson);
  if (!unitId) return [];
  const plan = selected.map((candidate) => candidate.step);
  const issues = validateModuleReviewCoverage(unitId, plan, {});
  if (issues.length === 0) return [];

  const phaseOrder = lessonPhaseOrder(lesson);
  const gapSteps: LessonStep[] = [];
  const push = (step: LessonStep | null) => {
    if (!step) return;
    if (gapSteps.some((candidate) => stepSignature(candidate) === stepSignature(step))) return;
    gapSteps.push(step);
  };

  const hanziFocus = focus.filter((item) => item.type === "char" || cleanHanzi(item.hanzi).length === 1);
  const phraseFocus = focus.filter((item) => cleanHanzi(item.hanzi).length > 1);
  const priorGlyphs = curriculumGlyphsBeforeLesson(lesson.id);

  for (const item of hanziFocus) {
    push(makeRecognizeStep(item));
    push(makeDecomposeStep(item));
    push(makeHanziBuilderStep(item, phaseOrder));
    push(makeToneMicroStep(item));
  }
  for (const item of phraseFocus) {
    push(makeComprehendStep(item, focus));
    if (allCjkGlyphsKnown(item.hanzi, priorGlyphs)) {
      push(makeFillBlankStep(item, focus));
      push(makeSentenceBuildStep(item, focus));
    }
    push(makeDialogueChoiceStep(item, focus, curriculumGlyphsThroughLesson(lesson.id)));
  }
  for (const item of reviewFocus.slice(0, 6)) {
    push(makeComprehendStep(item, [...reviewFocus, ...focus]));
    if (allCjkGlyphsKnown(item.hanzi, priorGlyphs)) {
      push(makeFillBlankStep(item, [...reviewFocus, ...focus]));
    }
  }
  push(makeMatchPairsStep([...reviewFocus, ...focus]));
  push(makeTonePairStep([...reviewFocus, ...focus]));
  const listenFocus = focus[0] ?? reviewFocus[0];
  if (listenFocus) push(makeIntroListenStep(listenFocus));

  return gapSteps.map((step) => {
    const stageId = stageForStep(step);
    return {
      step,
      stageId,
      sourceStepIndex: -1,
      generated: true,
      families: exerciseFamiliesFor(step, stageId),
      score: candidateScore(lesson, step, stageId, true, reviewFocus) + 100,
    };
  });
}

function selectRoundSteps(
  lesson: Lesson,
  stageId: LessonStageId,
  focus: FocusItem[],
  usedSignatures: Set<string>
): LessonStep[] {
  const hints = STAGE_KIND_HINTS[stageId];
  const primary = lesson.steps.filter((step) => hints.includes(step.kind));
  const preferred = primary.filter((step) => !usedSignatures.has(stepSignature(step)));
  const contentIsSufficient = lesson.steps.length >= LESSON_STAGE_COUNT * 2 || focus.length >= 2;
  const minCount = contentIsSufficient ? 2 : 1;
  const maxCount = 4;
  const selected = [...preferred, ...primary.filter((step) => preferred.indexOf(step) < 0)].slice(0, maxCount);
  const seen = new Set(selected.map(stepSignature));

  if (selected.length < minCount) {
    for (const supplement of supplementalStepsForStage(stageId, focus, minCount - selected.length)) {
      const signature = stepSignature(supplement);
      if (seen.has(signature)) continue;
      selected.push(supplement);
      seen.add(signature);
    }
  }

  if (stageId === "intro" && !selected.some(isGradedStep)) {
    for (const supplement of supplementalStepsForStage(stageId, focus, 3)) {
      const signature = stepSignature(supplement);
      if (seen.has(signature) || !isGradedStep(supplement)) continue;
      selected.push(supplement);
      seen.add(signature);
      break;
    }
  }

  if (selected.length === 0) {
    const fallback = lesson.steps.find((step) => !usedSignatures.has(stepSignature(step))) ?? lesson.steps[0];
    if (fallback) selected.push(fallback);
  }

  return selected.slice(0, maxCount);
}

function isPinyinPracticeStep(step: LessonStep): boolean {
  const text = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""}`.toLocaleLowerCase("pt-BR");
  return step.kind === "tone" || step.kind === "tone_pair" || text.includes("pinyin") || text.includes("tom");
}

/** Família cognitiva principal do passo — usada pela memória de variedade. */
export function primaryExerciseFamilyFor(step: LessonStep): string {
  return exerciseFamiliesFor(step)[0] ?? "other";
}

function exerciseFamiliesFor(step: LessonStep, stageId?: LessonStageId): ExerciseFamily[] {
  const families = new Set<ExerciseFamily>(FAMILY_BY_KIND[step.kind]);
  if (isPinyinPracticeStep(step)) families.add("pinyin");
  if (stageId === "consolidation") families.add("consolidation");
  return [...families];
}

function stageForStep(step: LessonStep): LessonStageId {
  if (step.kind === "dialogue_choice" && isPinyinPracticeStep(step)) return "recognition";
  if (step.kind === "hanzi_build") return "assembly";
  return LESSON_STAGE_ORDER.find((stageId) => STAGE_KIND_HINTS[stageId].includes(step.kind)) ?? "consolidation";
}

function stepTextBlob(step: LessonStep): string {
  return [
    step.title,
    step.body,
    step.text,
    step.hanzi,
    step.answer,
    step.audioText,
    ...(step.audioSequence ?? []),
    step.slowAudioText,
    step.prompt,
    step.sourceText,
    step.sourcePinyin,
    step.sourceMeaning,
    step.promptPt,
    step.targetHanzi,
    step.targetMeaningPt,
    step.correctAnswer,
    step.correctImageId,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    step.dialoguePrompt,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.acceptedTargetParts ?? []).map((parts) => parts.join("")),
    ...(step.options ?? []),
    ...(step.imageOptions ?? []),
    ...(step.bank ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
    ...(step.lines ?? []).flatMap((line) => [line.hanzi, line.pinyin, line.pt]),
    ...(step.nodes ?? []).flatMap((node) => [node.hanzi, node.pinyin, node.pt, node.interaction?.correctAnswer]),
    ...(step.learnedRefs ?? []),
    ...(step.newRefs ?? []),
    step.checkpoint?.prompt,
    step.checkpoint?.correctAnswer,
    ...(step.checkpoint?.options ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function stepUsesFocus(step: LessonStep, focus: readonly FocusItem[]): boolean {
  const blob = cleanHanzi(stepTextBlob(step));
  if (!blob) return false;
  return focus.some((item) => {
    const hanzi = cleanHanzi(item.hanzi);
    return Boolean(hanzi && blob.includes(hanzi));
  });
}

// Kinds que exigem PRODUZIR (montar/escrever) em vez de só reconhecer.
const PRODUCTION_BONUS_KINDS: ReadonlySet<StepKind> = new Set([
  "produce",
  "sentence_build",
  "translation_build",
  "hanzi_build",
  "fill_blank",
  "write",
  // Sem banco e sem alternativas: é a forma mais exigente de produção que o
  // app tem. Se não pontuasse como produção, perderia o slot justamente para
  // os exercícios que ela veio substituir.
  "free_production",
  "transfer_task",
  "conversation_repair",
]);
const REAL_SENTENCE_KINDS: ReadonlySet<StepKind> = new Set([
  "produce",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "conversation_scene",
]);

function isRealSentenceStepAnswer(step: LessonStep): boolean {
  if (!REAL_SENTENCE_KINDS.has(step.kind)) return false;
  const target = cleanHanzi(
    step.correctAnswer ?? step.answer ?? step.target?.join("") ?? step.targetParts?.join("") ?? step.checkpoint?.correctAnswer
  );
  return [...target].filter((glyph) => CJK_RE.test(glyph)).length >= 2;
}

const ownGlyphsCache = new Map<string, ReadonlySet<string>>();
function lessonOwnGlyphs(lesson: Lesson): ReadonlySet<string> {
  const cached = ownGlyphsCache.get(lesson.id);
  if (cached) return cached;
  const set = new Set<string>();
  for (const item of lessonFocusItems(lesson)) {
    for (const glyph of cleanHanzi(item.hanzi)) set.add(glyph);
  }
  ownGlyphsCache.set(lesson.id, set);
  return set;
}

// Bônus de novidade cognitiva: produção, frase real, conversa, conteúdo
// antigo em contexto novo, visual relevante ao foco e áudio sem texto.
function noveltyScoreBonus(lesson: Lesson, step: LessonStep, reviewFocus: FocusItem[]): number {
  let bonus = 0;
  if (PRODUCTION_BONUS_KINDS.has(step.kind)) bonus += 30;
  if (step.kind === "free_production" && step.productionOpen) bonus += 18;
  if (isRealSentenceStepAnswer(step)) bonus += 25;
  if (step.kind === "conversation_scene") bonus += 25;
  if (cognitiveProfile(step).familyRank >= 2 && stepUsesFocus(step, reviewFocus)) bonus += 20;
  if (
    (step.kind === "image_choice" || step.kind === "compare_with_image") &&
    lessonOwnGlyphs(lesson).has(cleanHanzi(step.targetHanzi ?? ""))
  ) bonus += 20;
  if (step.kind === "listen_select" || (step.kind === "image_choice" && step.imageChoiceMode === "listen_and_choose_image")) {
    bonus += 15;
  }
  if (step.pedagogyVariant) bonus += 28;
  return bonus;
}

function candidateScore(
  lesson: Lesson,
  step: LessonStep,
  stageId: LessonStageId,
  generated: boolean,
  reviewFocus: FocusItem[]
): number {
  const weights = WEIGHTS_BY_SKILL[lesson.isReview ? "review" : lesson.skill];
  const families = exerciseFamiliesFor(step, stageId);
  const familyScore = families.reduce((sum, family) => sum + (weights[family] ?? 0), 0);
  const authoredBonus = generated ? 0 : 12;
  // A apresentação autoral abre a lição: sem isto, um passo GERADO de maior
  // score ocupa o slot de intro e depois é canibalizado pelos ensures — a
  // lição começa cobrando sem apresentar.
  const introBonus = step.kind === "intro" && !generated ? 40 : 0;
  const reviewBonus = stageId === "consolidation" || stepUsesFocus(step, reviewFocus) ? 12 : 0;
  const gradedBonus = isGradedStep(step) ? 6 : 0;
  const stageBonus = STAGE_KIND_HINTS[stageId].includes(step.kind) ? 4 : 0;
  return familyScore + authoredBonus + introBonus + reviewBonus + gradedBonus + stageBonus + noveltyScoreBonus(lesson, step, reviewFocus);
}

function authoredCandidatesFor(lesson: Lesson, reviewFocus: FocusItem[]): PracticeCandidate[] {
  return lesson.steps.map((step, index) => {
    const stageId = stageForStep(step);
    return {
      step,
      stageId,
      sourceStepIndex: index,
      generated: false,
      families: exerciseFamiliesFor(step, stageId),
      score: candidateScore(lesson, step, stageId, false, reviewFocus) - index * 0.15,
    };
  });
}

function generatedCandidatesFor(
  lesson: Lesson,
  focus: FocusItem[],
  reviewFocus: FocusItem[],
  profile: LessonPracticeProfile,
  hanziBuilderProgress?: HanziBuilderProgressMap,
  seenGlyphs?: ReadonlySet<string>,
  ownFocusGlyphs?: ReadonlySet<string>,
  sceneContext: ConversationSceneSelectionContext = {},
  history?: readonly ConversationHistoryEntry[],
  practiceVariant: "A" | "B" | "C" = "A",
  variantSeedOffset = 0,
  attemptNumber = 0,
  structureExposure?: StructureExposureMap,
  structureExposureForTransfer?: StructureExposureMap,
  priorTransferredFrames?: ReadonlySet<string>
): PracticeCandidate[] {
  if (lesson.curriculumRole === "perception_lab") return [];
  const phaseOrder = lessonPhaseOrder(lesson);
  const allowComposedFiller = Boolean(lesson.isReview);
  const unitIndex = lessonUnitIndex(lesson);
  const authoredImageCount = lesson.steps.filter((step) => step.kind === "image_choice").length;
  // Se a lição já tem o teto de visuais autorais, não gerar mais do mesmo
  // subset (chá/arroz/água) — senão os conceitos da China visual nunca entram.
  const allowImageSteps =
    lessonAllowsGeneratedImages(lesson) && authoredImageCount < profile.maxImageChoices;
  // Lições-conceito de fundação: o catálogo inteiro do currículo precoce
  // liberava cenas com 再见/明天见 e o loop pós-conversa gerava high no
  // audit:early-lessons. Restringe knownRefs ao foco da própria lição.
  const foundationConcept =
    FOUNDATION_LESSON_IDS.includes(lesson.id) && lesson.id !== "p1-engine-2-lab";
  const practiceFocus = practiceFocusForLesson(lesson, focus);
  const sceneSelection: ConversationSceneSelection = {
    lessonInfo: conversationSceneLessonInfo(lesson, focus, foundationConcept ? focus : reviewFocus),
    context: sceneContext,
    knownRefs: foundationConcept ? new Set(focusRefs(focus)) : curriculumRefsThroughLesson(lesson.id),
    isReviewLesson: Boolean(lesson.isReview),
    allowImmersion: lessonAllowsImmersionScenes(lesson),
    history,
  };
  const candidates: PracticeCandidate[] = [];
  for (const stageId of LESSON_STAGE_ORDER) {
    // Pool de candidatos, não tamanho do plano: quanto maior, mais escolha o
    // seletor tem. Com os motores da onda 2 disputando as mesmas vagas, um
    // teto apertado deixava o gerador parar antes de produzir HanziBuilder e
    // exercício visual — e a garantia de cobertura não tinha o que garantir.
    const target = Math.max(8, profile.stageTargets[stageId] * 4);
    const generated = supplementalStepsForStage(stageId, practiceFocus, target, {
      phaseOrder,
      reviewFocus,
      hanziBuilderProgress,
      seenGlyphs,
      ownFocusGlyphs,
      allowComposedFiller,
      unitIndex,
      allowImageSteps,
      sceneSelection,
      lessonId: lesson.id,
      practiceVariant,
      variantSeedOffset,
      enablePedagogyVariants: !lesson.isReview,
      attemptNumber,
      structureExposure,
      structureExposureForTransfer,
      priorTransferredFrames,
    });
    for (const step of generated) {
      const packetExchange = String(step.sceneId ?? "").startsWith("packet-exchange-");
      const hasAuthoredConversation = lesson.steps.some((item) => item.kind === "conversation_scene");
      // Com cena autoral na lição, a troca do packet disputa o 2º slot.
      // Sem autoral, fica um pouco atrás do catálogo no 1º slot.
      const packetBias = packetExchange ? (hasAuthoredConversation ? 15 : -8) : 0;
      candidates.push({
        step,
        stageId,
        sourceStepIndex: -1,
        generated: true,
        families: exerciseFamiliesFor(step, stageId),
        score: candidateScore(lesson, step, stageId, true, reviewFocus) + packetBias,
      });
    }
  }
  return candidates;
}

/** P1-006/007 — max 1 same kind consecutive; family window caps. */
function wouldViolateVariety(sequence: readonly PracticeCandidate[], candidate: PracticeCandidate): boolean {
  const last = sequence[sequence.length - 1];
  if (last && last.step.kind === candidate.step.kind) return true;

  // Legacy triplet guard (same kind OR shared family ×3).
  const lastTwo = sequence.slice(-2);
  if (lastTwo.length === 2) {
    if (lastTwo.every((item) => item.step.kind === candidate.step.kind)) return true;
    if (candidate.families.some((family) => lastTwo.every((item) => item.families.includes(family)))) {
      return true;
    }
  }

  // Hanzi family: max 2 in a window of 5 graded steps.
  if (candidate.families.includes("hanzi")) {
    const window = sequence.slice(-4);
    const hanziCount = window.filter((item) => item.families.includes("hanzi")).length;
    if (hanziCount >= 2) return true;
  }

  // Tone: after a tone step, prefer another family before another tone.
  const isTone =
    candidate.step.kind === "tone" ||
    candidate.step.kind === "tone_pair" ||
    candidate.families.includes("pinyin");
  if (isTone && (candidate.step.kind === "tone" || candidate.step.kind === "tone_pair")) {
    const window = sequence.slice(-4);
    const toneCount = window.filter(
      (item) => item.step.kind === "tone" || item.step.kind === "tone_pair"
    ).length;
    if (toneCount >= 1) return true;
  }

  return false;
}

/** @deprecated use wouldViolateVariety — kept name for call-site clarity during hotfix. */
function wouldMakeTriplet(sequence: readonly PracticeCandidate[], candidate: PracticeCandidate): boolean {
  return wouldViolateVariety(sequence, candidate);
}

function countKind(candidates: readonly PracticeCandidate[], kind: StepKind): number {
  return candidates.filter((candidate) => candidate.step.kind === kind).length;
}

function generatedImageCount(candidates: readonly PracticeCandidate[]): number {
  return candidates.filter((candidate) => candidate.step.kind === "image_choice" && candidate.generated).length;
}

/** Resposta avaliada normalizada (mesma métrica do validate:exercise-depth). */
function gradedAnswerKey(step: LessonStep): string {
  const raw = step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer ?? "";
  return cleanHanzi(String(raw)).toLocaleLowerCase("pt-BR");
}

function answerOccurrenceCount(candidates: readonly PracticeCandidate[], answerKey: string): number {
  if (!answerKey) return 0;
  return candidates.filter((candidate) => gradedAnswerKey(candidate.step) === answerKey).length;
}

/** Nenhuma resposta correta mais de 2 vezes no plano real. */
function underAnswerRepeatCap(selected: readonly PracticeCandidate[], candidate: PracticeCandidate): boolean {
  // Conversa não compete no teto de resposta idêntica: o valor pedagógico é o
  // diálogo, não a string da opção. Em lições de um único chunk (你好) o teto
  // matava conversation_scene depois de listen/build.
  if (candidate.step.kind === "conversation_scene") return true;
  // Produção autoral independente: o ponto é formular sozinho a frase já vista.
  if (candidate.step.kind === "free_production" && !candidate.generated) return true;
  // China visual autorada: peixe/hotel/passaporte não competem com listen da mesma palavra.
  if (candidate.step.kind === "image_choice" && !candidate.generated) return true;
  const key = gradedAnswerKey(candidate.step);
  if (!key) return true;
  return answerOccurrenceCount(selected, key) < 2;
}

// ————————————————————————————————————————————————————————————————
// Limites semânticos: além da resposta exata (underAnswerRepeatCap, acima),
// exercícios diferentes podem cobrar cognitivamente a mesma coisa. Cada
// passo carrega chaves semânticas (char:/chunk:/phrase:/intent:/visual:/
// scene:/meaning:) e repetir uma chave além do limite exige transformação
// cognitiva real — revisões ganham folga extra, mas nunca sem transformação.
// ————————————————————————————————————————————————————————————————

const semanticKeysCache = new WeakMap<LessonStep, string[]>();
function stepSemanticKeys(step: LessonStep): string[] {
  const cached = semanticKeysCache.get(step);
  if (cached) return cached;
  const keys = semanticTargetKeys(step);
  semanticKeysCache.set(step, keys);
  return keys;
}

function semanticHolders(selected: readonly PracticeCandidate[], key: string): LessonStep[] {
  const holders: LessonStep[] = [];
  for (const candidate of selected) {
    if (!isGradedStep(candidate.step)) continue;
    if (stepSemanticKeys(candidate.step).includes(key)) holders.push(candidate.step);
  }
  return holders;
}

function underSemanticCaps(
  selected: readonly PracticeCandidate[],
  candidate: PracticeCandidate,
  isReview: boolean
): boolean {
  // Conversa é outra modalidade cognitiva: se a cota de cenas ainda cabe,
  // não pode ser bloqueada só porque listen/build já tocaram o mesmo chunk
  // (ex.: p1-o-que-e-mandarim com 你好). Sem isto o ensure de conversation_scene
  // falha e validate:exercise-depth cai no portão.
  if (candidate.step.kind === "conversation_scene") return true;
  if (candidate.step.kind === "free_production" && !candidate.generated) return true;
  if (candidate.step.kind === "image_choice" && !candidate.generated) return true;
  if (!isGradedStep(candidate.step)) return true;
  for (const key of stepSemanticKeys(candidate.step)) {
    const cap = semanticCapForKey(key, isReview);
    if (cap == null) continue;
    const holders = semanticHolders(selected, key);
    if (holders.length < cap) continue;
    const ceiling = semanticHardCeilingForKey(key, isReview);
    if (ceiling != null && holders.length >= ceiling) return false;
    // Acima do limite: cada ocorrência extra precisa transformar a tarefa
    // em relação a TODAS as anteriores com a mesma chave.
    if (!holders.every((previous) => cognitiveTransformation(previous, candidate.step))) return false;
  }
  return true;
}

// Penalidades dinâmicas de repetição, aplicadas na ordenação da seleção:
// -100 acima do limite semântico; -60 intenção repetida; -50 frase repetida;
// -40 hànzì repetido — as três últimas apenas quando a repetição não traz
// transformação cognitiva; -30 mesma moldura/contexto.
function semanticSelectionPenalty(
  selected: readonly PracticeCandidate[],
  candidate: PracticeCandidate,
  isReview: boolean
): number {
  if (!isGradedStep(candidate.step)) return 0;
  let penalty = 0;
  for (const key of stepSemanticKeys(candidate.step)) {
    const holders = semanticHolders(selected, key);
    if (holders.length === 0) continue;
    const cap = semanticCapForKey(key, isReview);
    if (cap != null && holders.length >= cap) {
      penalty -= 100;
      continue;
    }
    const transformed = holders.every((previous) => cognitiveTransformation(previous, candidate.step));
    if (transformed) continue;
    if (key.startsWith("intent:")) penalty -= 60;
    else if (key.startsWith("chunk:") || key.startsWith("phrase:")) penalty -= 50;
    else if (key.startsWith("char:")) penalty -= 40;
  }
  const context = semanticContextKey(candidate.step);
  if (context && selected.some((item) => semanticContextKey(item.step) === context)) penalty -= 30;
  return penalty;
}

// Quantos builders do MESMO caractere já foram escolhidos (evita 明 3× etc.).
function charBuildCount(candidates: readonly PracticeCandidate[], char: string | undefined): number {
  if (!char) return 0;
  return candidates.filter((c) => c.step.kind === "hanzi_build" && c.step.correctAnswer === char).length;
}

function underPerCharCap(selected: readonly PracticeCandidate[], candidate: PracticeCandidate, profile: LessonPracticeProfile): boolean {
  if (candidate.step.kind !== "hanzi_build") return true;
  return charBuildCount(selected, candidate.step.correctAnswer) < profile.perCharBuildCap;
}

function countPinyinTasks(candidates: readonly PracticeCandidate[]): number {
  return candidates.filter((candidate) => isPinyinPracticeStep(candidate.step)).length;
}

function selectedImageConceptIds(selected: readonly PracticeCandidate[]): Set<string> {
  const ids = new Set<string>();
  for (const candidate of selected) {
    const conceptId = imageConceptIdOfStep(candidate.step);
    if (conceptId) ids.add(conceptId);
  }
  return ids;
}

// Passos visuais GERADOS nunca repetem uma imagem já usada na lição (autoral ou
// gerada). Passos autorais ficam como o autor escreveu.
function violatesImageRepeat(
  selected: readonly PracticeCandidate[],
  candidate: PracticeCandidate
): boolean {
  if (
    !candidate.generated ||
    (candidate.step.kind !== "image_choice" && candidate.step.kind !== "compare_with_image")
  ) return false;
  const conceptId = imageConceptIdOfStep(candidate.step);
  if (!conceptId) return false;
  return selectedImageConceptIds(selected).has(conceptId);
}

function selectBestCandidate(
  selected: readonly PracticeCandidate[],
  candidates: readonly PracticeCandidate[],
  stageId: LessonStageId,
  usedSignatures: ReadonlySet<string>,
  profile: LessonPracticeProfile
): PracticeCandidate | undefined {
  const hanziBuildCount = countKind(selected, "hanzi_build");
  const pinyinTaskCount = countPinyinTasks(selected);
  const eligible = candidates
    .filter((candidate) => candidate.stageId === stageId)
    .filter((candidate) => !usedSignatures.has(stepSignature(candidate.step)))
    .filter((candidate) => candidate.step.kind !== "hanzi_build" || hanziBuildCount < profile.maxHanziBuilds)
    .filter((candidate) => underPerCharCap(selected, candidate, profile))
    .filter((candidate) => underAnswerRepeatCap(selected, candidate))
    .filter((candidate) => !isPinyinPracticeStep(candidate.step) || pinyinTaskCount < profile.maxPinyinTasks)
    .filter(
      (candidate) =>
        candidate.step.kind !== "image_choice" ||
        !candidate.generated ||
        generatedImageCount(selected) < profile.maxImageChoices
    )
    .filter((candidate) => !violatesImageRepeat(selected, candidate))
    .filter((candidate) => underSemanticCaps(selected, candidate, profile.isReview))
    .filter(
      (candidate) =>
        candidate.step.kind !== "conversation_scene" ||
        countKind(selected, "conversation_scene") < profile.maxConversationScenes
    )
    // Penalidades de repetição semântica dependem do que JÁ foi selecionado,
    // por isso entram aqui e não no score estático do candidato.
    .map((candidate) => ({
      candidate,
      adjusted: candidate.score + semanticSelectionPenalty(selected, candidate, profile.isReview),
    }))
    .sort((a, b) => b.adjusted - a.adjusted)
    .map((entry) => entry.candidate);
  return eligible.find((candidate) => !wouldMakeTriplet(selected, candidate)) ?? eligible[0];
}

function replaceLowestIfNeeded(
  selected: PracticeCandidate[],
  candidate: PracticeCandidate,
  profile: LessonPracticeProfile,
  usedSignatures: Set<string>,
  protect = false
) {
  const signature = stepSignature(candidate.step);
  if (usedSignatures.has(signature)) return;
  if (candidate.step.kind === "hanzi_build" && countKind(selected, "hanzi_build") >= profile.maxHanziBuilds) return;
  if (!underPerCharCap(selected, candidate, profile)) return;
  if (!underAnswerRepeatCap(selected, candidate)) return;
  if (isPinyinPracticeStep(candidate.step) && countPinyinTasks(selected) >= profile.maxPinyinTasks) return;
  if (
    candidate.step.kind === "image_choice" &&
    candidate.generated &&
    generatedImageCount(selected) >= profile.maxImageChoices
  ) {
    return;
  }
  if (violatesImageRepeat(selected, candidate)) return;
  if (!underSemanticCaps(selected, candidate, profile.isReview)) return;
  if (
    candidate.step.kind === "conversation_scene" &&
    countKind(selected, "conversation_scene") >= profile.maxConversationScenes
  ) {
    return;
  }

  const authoredVisual = candidate.step.kind === "image_choice" && !candidate.generated;
  // Visuais autorais da China visual crescem o plano em vez de disputar vaga
  // com intro/conversa já protegidos — senão hotel/restaurante nunca entram.
  if (selected.length < profile.targetCount || (protect && authoredVisual)) {
    selected.push(protect ? { ...candidate, ensured: true } : candidate);
    usedSignatures.add(signature);
    return;
  }

  const replaceIndex = selected
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !item.ensured && (item.stageId === candidate.stageId || item.generated))
    .sort((a, b) => a.item.score - b.item.score)[0]?.index;
  if (replaceIndex === undefined) return;
  usedSignatures.delete(stepSignature(selected[replaceIndex].step));
  selected[replaceIndex] = protect ? { ...candidate, ensured: true } : candidate;
  usedSignatures.add(signature);
}

function ensureCoverage(
  lesson: Lesson,
  selected: PracticeCandidate[],
  candidates: readonly PracticeCandidate[],
  profile: LessonPracticeProfile,
  reviewFocus: FocusItem[],
  lessonFocus: FocusItem[],
  errorFocus: FocusItem[],
  usedSignatures: Set<string>,
  practiceVariant: "A" | "B" | "C" = "A"
) {
  // "Já está coberto" precisa também PROTEGER o passo que cobre. Sem isto, a
  // garantia valia só até a próxima chamada: um ensure posterior derrubava o
  // exercício visual (ou o HanziBuilder) que este acabara de confirmar, e a
  // lição terminava sem o eixo que a regra exigia.
  const protectExisting = (predicate: (candidate: PracticeCandidate) => boolean, count = 1) => {
    let protectedCount = 0;
    for (const [index, candidate] of selected.entries()) {
      if (protectedCount >= count) break;
      if (!predicate(candidate) || candidate.ensured) continue;
      selected[index] = { ...candidate, ensured: true };
      protectedCount += 1;
    }
  };

  // `protect` só é usado nas garantias ESTREITAS (um tipo de exercício
  // específico: visual, HanziBuilder, variante). As garantias largas de
  // estágio/família continuam substituíveis — protegê-las travaria o próprio
  // ensureCoverage, que precisa de alguém para trocar.
  const ensure = (predicate: (candidate: PracticeCandidate) => boolean, protect = false) => {
    if (selected.some(predicate)) {
      if (protect) protectExisting(predicate);
      return;
    }
    const candidate = candidates
      .filter(predicate)
      .filter((item) => !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score)[0];
    if (candidate) replaceLowestIfNeeded(selected, candidate, profile, usedSignatures, protect);
  };

  // Garante ao menos `count` candidatos que casam com o predicado (respeitando
  // os tetos por tipo dentro de replaceLowestIfNeeded).
  const ensureCount = (predicate: (candidate: PracticeCandidate) => boolean, count: number, protect = false) => {
    if (protect) protectExisting(predicate, count);
    const pool = candidates
      .filter(predicate)
      .filter((item) => !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score);
    for (const candidate of pool) {
      if (selected.filter(predicate).length >= count) break;
      replaceLowestIfNeeded(selected, candidate, profile, usedSignatures, protect);
    }
  };

  const ensureFocus = (items: FocusItem[]) => {
    if (!items.length || selected.some((candidate) => stepUsesFocus(candidate.step, items))) return;
    const candidate = candidates
      .filter((item) => stepUsesFocus(item.step, items) && !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score)[0];
    if (candidate) replaceLowestIfNeeded(selected, candidate, profile, usedSignatures);
  };

  if (!lesson.isReview) ensure((candidate) => Boolean(candidate.step.pedagogyVariant), true);
  // Quando o vocabulário permite, cada rodada inclui também um jogo semântico
  // (intenção, intruso ou detecção de erro), não apenas uma variação de áudio.
  if (!lesson.isReview) {
    // Os três jogos semânticos (intruso, intenção, estrutura) revezam por
    // lição. Só pedir "algum meaning_" fazia o de maior score vencer sempre e
    // um dos jogos praticamente sumia do curso — variedade declarada que não
    // acontecia no plano real.
    const MEANING_VARIANTS: PedagogyVariant[] = [
      "meaning_odd_one_out",
      "meaning_intention_match",
      "meaning_spot_error",
    ];
    const preferred = MEANING_VARIANTS[Math.abs(lessonOrderIndex(lesson)) % MEANING_VARIANTS.length];
    ensure((candidate) => candidate.step.pedagogyVariant === preferred, true);
    // PED-021: practiceFocus filtrado pode alterar a pontuação e o spot_error
    // autoral (sem pedagogyVariant) perde a vaga mesmo quando a rotação semântica
    // pede meaning_spot_error. Garante o kind no plano.
    if (preferred === "meaning_spot_error") {
      ensure((candidate) => candidate.step.kind === "spot_error", true);
    }
    ensure((candidate) => Boolean(candidate.step.pedagogyVariant?.startsWith("meaning_")));
  }
  // A cena de conversa é o exercício mais rico do plano e a origem do loop
  // pós-conversa. A PRIMEIRA cena é protegida. A segunda nunca pode expulsar
  // produção/transferência — entra depois, sem protect.
  if (profile.maxConversationScenes > 0) {
    ensure((candidate) => candidate.step.kind === "conversation_scene", true);
  }
  const AUDIO_STEP_KINDS: ReadonlySet<StepKind> = new Set([
    "listen",
    "listen_select",
    "tone",
    "tone_pair",
    "audio_discrimination",
  ]);
  if (lesson.steps.some((step) => AUDIO_STEP_KINDS.has(step.kind))) {
    ensure((candidate) => AUDIO_STEP_KINDS.has(candidate.step.kind), true);
  }
  // Cota rotativa dos motores de percepção — só depois da fundação/fase 2.
  // Antes disso, forçar dictation/spot_error injeta formatos e glifos prematuros.
  const phaseOrder = lessonPhaseOrder(lesson);
  const isFoundation = FOUNDATION_LESSON_IDS.includes(lesson.id);
  const earlyPedagogy = isFoundation || phaseOrder <= 2;

  if (!earlyPedagogy) {
    const PERCEPTION_ROTATION: StepKind[] = ["audio_discrimination", "dictation", "odd_one_out", "spot_error"];
    const perceptionSlot = PERCEPTION_ROTATION[Math.abs(lessonOrderIndex(lesson)) % PERCEPTION_ROTATION.length];
    ensure((candidate) => candidate.step.kind === perceptionSlot, true);
  }
  ensure((candidate) => candidate.stageId === "recognition" || candidate.families.includes("recognition"));
  if (!earlyPedagogy || profile.stageTargets.assembly > 0) {
    ensure((candidate) => candidate.stageId === "assembly" || candidate.families.includes("assembly"));
  }
  if (!earlyPedagogy || profile.stageTargets.usage > 0) {
    ensure((candidate) => candidate.stageId === "usage" || candidate.families.includes("usage"));
  }
  ensure((candidate) => candidate.stageId === "consolidation" || candidate.families.includes("review"));
  if (profile.needsPinyinTask && profile.maxPinyinTasks > 0) ensure((candidate) => candidate.families.includes("pinyin"));
  // Mínimo de HanziBuilders da lição (hànzì: 2; revisão: 2; montagem: 4).
  const minBuilds = Math.max(profile.maxHanziBuilds > 0 ? 1 : 0, profile.minHanziBuilds);
  if (minBuilds > 0) ensureCount((candidate) => candidate.step.kind === "hanzi_build", minBuilds, true);
  // Cobertura visual: lição concreta elegível tem pelo menos 1 image_choice;
  // revisão de módulo com itens concretos tem 2, sendo 1 de conteúdo anterior.
  const imageInfo = lessonImageCoverageInfo(lesson);
  // Mesmo fora da cobertura obrigatória: se o pool tem um visual válido, ele
  // entra. Autoral da China visual (peixe, hotel, passaporte…) precisa sobreviver
  // ao cap de gerados — protege todas as imagens escritas na jornada.
  const authoredVisuals = candidates.filter(
    (candidate) => candidate.step.kind === "image_choice" && !candidate.generated
  ).length;
  if (authoredVisuals > 0) {
    ensureCount(
      (candidate) => candidate.step.kind === "image_choice" && !candidate.generated,
      authoredVisuals,
      true
    );
  }
  ensure((candidate) => candidate.step.kind === "image_choice", true);
  if (imageInfo.eligible) {
    if (lesson.isReview) {
      ensureCount((candidate) => candidate.step.kind === "image_choice", 2, true);
      const unitIndex = lessonUnitIndex(lesson);
      ensure(
        (candidate) => candidate.step.kind === "image_choice" && isPriorUnitImageStep(candidate.step, unitIndex),
        true
      );
    }
  }
  // Comparações são autorais e curadas (contraste + dificuldade + feedback),
  // portanto uma lição que as declara precisa entregar pelo menos uma no plano
  // real. Não geramos comparações automaticamente para evitar pares ambíguos.
  if (candidates.some((candidate) => candidate.step.kind === "compare_with_image")) {
    ensure((candidate) => candidate.step.kind === "compare_with_image", true);
  }
  // Núcleo de revisão (再见/谢谢…) só depois que o aluno já saiu da fundação
  // E só com frases que o currículo já apresentou (senão vaza 明天/这 cedo).
  if (reviewFocus.length > 0 && !earlyPedagogy) {
    ensure((candidate) => stepUsesFocus(candidate.step, reviewFocus) || candidate.stageId === "consolidation");
    const safeOld = oldPhraseFocus(lessonFocus, lesson);
    if (safeOld.length > 0) {
      ensure((candidate) => {
        const blob = cleanHanzi(stepTextBlob(candidate.step));
        return safeOld.some((item) => {
          const hanzi = cleanHanzi(item.hanzi);
          if (!hanzi || !blob.includes(hanzi)) return false;
          return !lessonFocus.some((focusItem) => cleanHanzi(focusItem.hanzi) === hanzi);
        });
      });
    }
  }

  // Produção aberta e transferência: só entram no pool quando a estrutura já
  // foi praticada. Sem reserva, o score de outros motores as engolia e o
  // degrau final da escada sumia do plano real.
  ensure(
    (candidate) => candidate.step.kind === "free_production" && !candidate.generated,
    true
  );
  if (!earlyPedagogy) {
    ensure(
      (candidate) => candidate.step.kind === "free_production" && Boolean(candidate.step.productionOpen),
      true
    );
    ensure((candidate) => candidate.step.kind === "transfer_task", true);
    ensure(
      (candidate) => candidate.step.kind === "free_production" && !candidate.step.productionOpen,
      true
    );
    ensure((candidate) => candidate.step.kind === "conversation_repair", true);
    // Segunda conversa: variedade, não competência. Sem protect — o piso
    // cognitivo (produção/transferência) já reservou as vagas essenciais.
    if (profile.maxConversationScenes > 1) {
      ensureCount((candidate) => candidate.step.kind === "conversation_scene", 2, false);
    }
    // Ditado Dragão (modos blocks/pinyin/hanzi/immersion na rodada B/C): as
    // reservas acima de transfer/free engoliam o slot de consolidação e a
    // onda 1 perdia cobertura real de immersion. Reserva depois delas.
    ensure((candidate) => candidate.step.pedagogyVariant === "dragon_dictation", true);
    if (practiceVariant === "B") {
      ensure(
        (candidate) =>
          candidate.step.pedagogyVariant === "sentence_lab_distractors" ||
          candidate.step.pedagogyVariant === "meaning_intention_match",
        true
      );
    }
    if (practiceVariant === "C") {
      ensure(
        (candidate) =>
          candidate.step.pedagogyVariant === "sentence_lab_audio" ||
          candidate.step.pedagogyVariant === "meaning_odd_one_out",
        true
      );
    }
  }

  if (lesson.isReview) {
    const hanziFocus = lessonFocus.filter((item) => item.type === "char" || cleanHanzi(item.hanzi).length === 1);
    const phraseFocus = lessonFocus.filter((item) => cleanHanzi(item.hanzi).length > 1);
    ensure((candidate) => candidate.families.includes("audio"));
    ensure((candidate) => candidate.families.includes("pinyin") || isPinyinPracticeStep(candidate.step));
    ensure((candidate) => candidate.families.includes("meaning") || candidate.step.kind === "comprehend");
    if (hanziFocus.length > 0) {
      ensure(
        (candidate) =>
          candidate.step.kind === "hanzi_build" ||
          candidate.step.kind === "recognize" ||
          candidate.step.kind === "decompose"
      );
      ensureFocus(hanziFocus);
    }
    if (phraseFocus.length > 0) {
      ensure(
        (candidate) =>
          candidate.families.includes("usage") ||
          candidate.families.includes("assembly") ||
          candidate.step.kind === "dialogue_choice"
      );
      ensureFocus(phraseFocus);
    }
    if (errorFocus.length > 0) ensureFocus(errorFocus.slice(0, 4));
  }
}

function trimToTarget(selected: PracticeCandidate[], profile: LessonPracticeProfile): PracticeCandidate[] {
  const keep = new Set<number>();
  for (const stageId of LESSON_STAGE_ORDER) {
    const first = selected.findIndex((candidate) => candidate.stageId === stageId);
    if (first >= 0) keep.add(first);
  }
  // Cobertura garantida sobrevive ao corte. Sem isto, um passo de score alto
  // (produção, conversa) derruba o exercício visual ou o HanziBuilder que o
  // ensureCoverage tinha acabado de colocar — e a lição perde um eixo inteiro.
  selected.forEach((candidate, index) => {
    if (candidate.ensured) keep.add(index);
  });
  const requiredCount = keep.size;
  const budget = Math.min(22, Math.max(profile.targetCount, requiredCount));
  if (selected.length <= budget) return selected;
  const ranked = selected
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => {
      const aRequired = keep.has(a.index) ? 1 : 0;
      const bRequired = keep.has(b.index) ? 1 : 0;
      return bRequired - aRequired || b.candidate.score - a.candidate.score;
    })
    .slice(0, budget)
    .map(({ index }) => index);
  return selected.filter((_, index) => ranked.includes(index));
}

function balancePracticeSequence(selected: PracticeCandidate[]): PracticeCandidate[] {
  const remaining = [...selected].sort(
    (a, b) => LESSON_STAGE_ORDER.indexOf(a.stageId) - LESSON_STAGE_ORDER.indexOf(b.stageId) || b.score - a.score
  );
  const result: PracticeCandidate[] = [];
  while (remaining.length > 0) {
    let index = remaining.findIndex((candidate) => !wouldMakeTriplet(result, candidate));
    if (index < 0) {
      // Evita empilhar o mesmo kind no fim quando o pool restante é homogêneo.
      const lastKind = result[result.length - 1]?.step.kind;
      index = remaining.findIndex((candidate) => candidate.step.kind !== lastKind);
    }
    if (index < 0) index = 0;
    const [candidate] = remaining.splice(index, 1);
    result.push(candidate);
  }
  // Segundo passe: quebra trios residuais trocando com um kind diferente
  // (à frente ou atrás, desde que não forme outro trio no destino).
  for (let i = 2; i < result.length; i += 1) {
    const kind = result[i].step.kind;
    if (kind !== result[i - 1].step.kind || kind !== result[i - 2].step.kind) continue;
    let swapWith = -1;
    for (let j = i + 1; j < result.length; j += 1) {
      if (result[j].step.kind !== kind) {
        swapWith = j;
        break;
      }
    }
    if (swapWith < 0) {
      for (let j = 0; j < i - 2; j += 1) {
        if (result[j].step.kind === kind) continue;
        const before = j > 0 ? result[j - 1].step.kind : null;
        const after = result[j + 1]?.step.kind ?? null;
        // Evita criar trio no destino da troca.
        if (before === kind && after === kind) continue;
        if (before === kind && result[i].step.kind === kind) continue;
        swapWith = j;
        break;
      }
    }
    if (swapWith >= 0) {
      const tmp = result[i];
      result[i] = result[swapWith];
      result[swapWith] = tmp;
    }
  }
  return result;
}

function practicePlanWarnings(
  lesson: Lesson,
  plan: readonly LessonRoundStep[],
  profile: LessonPracticeProfile,
  reviewFocus: FocusItem[]
): string[] {
  const warnings: string[] = [];
  for (let index = 2; index < plan.length; index += 1) {
    const trio = plan.slice(index - 2, index + 1);
    if (trio.every((step) => step.kind === trio[0].kind)) warnings.push(`3 exercícios "${trio[0].kind}" seguidos`);
    const sharedFamilies = exerciseFamiliesFor(trio[0], trio[0].lessonStageId).filter((family) =>
      trio.every((step) => exerciseFamiliesFor(step, step.lessonStageId).includes(family))
    );
    if (sharedFamilies.length > 0) warnings.push(`3 exercícios da família "${sharedFamilies[0]}" seguidos`);
  }
  if (!plan.some((step) => step.lessonStageId === "consolidation" || step.exercises?.includes("match_pairs"))) {
    warnings.push("nenhum exercício de revisão/consolidação");
  }
  if (reviewFocus.length > 0 && !plan.some((step) => stepUsesFocus(step, reviewFocus))) {
    warnings.push("nenhum item antigo reaproveitado");
  }
  if (profile.maxHanziBuilds > 0 && !plan.some((step) => step.kind === "hanzi_build")) {
    warnings.push("módulo/lição com hànzì relevante sem HanziBuilder");
  }
  if (profile.needsPinyinTask && !plan.some(isPinyinPracticeStep)) {
    warnings.push("módulo/lição inicial sem microtarefa de pinyin/tom");
  }
  if (!lesson.isReview && !isHanziFocusedLesson(lesson)) {
    const hanziBuildCount = plan.filter((step) => step.kind === "hanzi_build").length;
    if (hanziBuildCount > 1) warnings.push(`mais de 1 HanziBuilder (${hanziBuildCount})`);
  }
  if (!lesson.isReview && !isPinyinFocusedLesson(lesson)) {
    const pinyinCount = plan.filter(isPinyinPracticeStep).length;
    if (pinyinCount > 1) warnings.push(`mais de 1 microtarefa pinyin/tom (${pinyinCount})`);
  }
  const kindCounts = new Map<StepKind, number>();
  for (const step of plan) kindCounts.set(step.kind, (kindCounts.get(step.kind) ?? 0) + 1);
  for (const [kind, count] of kindCounts) {
    if (plan.length >= 4 && count >= Math.ceil(plan.length * 0.45)) {
      warnings.push(`tipo "${kind}" domina o plano (${count}/${plan.length})`);
    }
  }
  const imageInfo = lessonImageCoverageInfo(lesson);
  if (
    imageInfo.eligible &&
    !plan.some((step) => step.kind === "image_choice" || step.kind === "compare_with_image")
  ) {
    warnings.push("lição concreta sem exercício visual");
  }
  if (lesson.steps.length > 0 && plan.length === 0) warnings.push("plano vazio");
  return uniqueValues(warnings);
}

function isDevRuntime(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== "production";
  }
  return false;
}

function logPracticePlanInDev(
  lesson: Lesson,
  plan: readonly LessonRoundStep[],
  profile: LessonPracticeProfile,
  reviewFocus: FocusItem[]
) {
  const isDev = isDevRuntime();
  if (!isDev) return;
  const outline = plan.map((step) => step.kind).join(" -> ");
  console.info(`[Longyu] Lesson plan ${lesson.id}: ${outline}`);
  const warnings = practicePlanWarnings(lesson, plan, profile, reviewFocus);
  if (warnings.length > 0) {
    console.warn(`[Longyu] Avisos de variedade em ${lesson.id}: ${warnings.join("; ")}`);
  }
}

// Glifos que o aluno já encontrou: aprendidos antes + os desta lição + revisão.
// Serve para liberar (ou não) builders compostos sem pular as bases.
function seenGlyphsForPlanning(
  focus: readonly FocusItem[],
  reviewFocus: readonly FocusItem[],
  context: LessonPracticePlanContext
): Set<string> {
  const set = new Set<string>();
  for (const id of context.learnedChars ?? []) {
    const glyph = charById[id]?.hanzi;
    if (glyph) set.add(glyph);
  }
  for (const item of [...focus, ...reviewFocus]) {
    for (const glyph of cleanHanzi(item.hanzi)) set.add(glyph);
  }
  return set;
}

// ————————————————————————————————————————————————————————————————
// Conversation Vocabulary Loop — reúso obrigatório do vocabulário de conversa.
//
// Depois de uma conversa, o aluno precisa PRATICAR o que acabou de encontrar.
// Este pós-processamento lê o manifesto da variante exibida (fonte única:
// src/data/conversationVocabulary.ts), calcula as obrigações pedagógicas e
// injeta tarefas derivadas DEPOIS da conversa — creditando primeiro o que já
// existe no plano (para não inchar), respeitando tetos de repetição, exigindo
// transformação cognitiva e marcando metadados. Altera o plano REAL entregue
// ao player.
// ————————————————————————————————————————————————————————————————

function focusItemFromRef(ref: string): FocusItem | null {
  const [type, id] = ref.split(":");
  if (type === "chunk") {
    const chunk = chunkById[id];
    return chunk ? { key: ref, hanzi: chunk.hanzi, pinyin: chunk.pinyin, meaningPt: chunk.meaningPt, type: "chunk", itemId: id } : null;
  }
  if (type === "char") {
    const char = charById[id];
    return char ? { key: ref, hanzi: char.hanzi, pinyin: char.pinyin, meaningPt: char.meaningPt, type: "char", itemId: id } : null;
  }
  return null;
}

/** Glifos do currículo anterior que não pertencem ao módulo atual (espelha validate:lesson-novelty). */
function priorOldGlyphsForLesson(lesson: Lesson): Set<string> {
  const cumulative = new Set<string>();
  const index = lessonOrderIndex(lesson);
  for (let i = 0; i < index; i += 1) {
    const prior = ALL_LESSONS[i];
    for (const ref of [...(prior.libraryItems ?? []), ...(prior.reviewItems ?? [])]) {
      const item = focusItemFromRef(ref);
      if (item) for (const glyph of cleanHanzi(item.hanzi)) cumulative.add(glyph);
    }
  }
  const own = new Set<string>();
  const unitId = lessonUnitId(lesson);
  const sources = lesson.isReview && unitId ? ALL_LESSONS.filter((candidate) => candidate.unitId === unitId) : [lesson];
  for (const source of sources) {
    for (const ref of [...(source.libraryItems ?? []), ...(source.reviewItems ?? [])]) {
      const item = focusItemFromRef(ref);
      if (item) for (const glyph of cleanHanzi(item.hanzi)) own.add(glyph);
    }
  }
  const old = new Set<string>();
  for (const glyph of cumulative) if (!own.has(glyph)) old.add(glyph);
  return old;
}

function refUsesOldCurriculum(ref: string, oldGlyphs: ReadonlySet<string>): boolean {
  const item = focusItemFromRef(ref);
  if (!item || oldGlyphs.size === 0) return false;
  return [...cleanHanzi(item.hanzi)].some((glyph) => oldGlyphs.has(glyph));
}

/**
 * Igual a refUsesOldCurriculum, mas exige TODOS os glifos já disponíveis no
 * currículo até esta lição (não só um glifo em comum). A lista de fallback
 * (OLD_CURRICULUM_RECOVERY_REFS) mistura refs que compartilham UM glifo antigo
 * com glifos ainda não apresentados (ex.: 叫 é antigo, mas 什么 em
 * "chunk:nijiaoshenme" pode não ter sido introduzido ainda) — usar overlap
 * parcial aqui vazava R10 (sentence_build cobrando glifo indisponível).
 */
function refFullyKnownForLesson(ref: string, lesson: Lesson): boolean {
  const item = focusItemFromRef(ref);
  if (!item) return false;
  const glyphs = [...cleanHanzi(item.hanzi)];
  if (glyphs.length === 0) return false;
  const known = curriculumGlyphsThroughLesson(lesson.id);
  return glyphs.every((glyph) => known.has(glyph));
}

const OLD_CURRICULUM_RECOVERY_REFS = [
  "chunk:nijiaoshenme",
  "chunk:zheshishenme",
  "char:shen",
  "char:me",
  "char:xie",
] as const;

/** Estágio da variante que o passo de conversa efetivamente carrega. */
function derivedStageForStep(scene: ConversationSceneDefinition, learnedRefs: readonly string[]): ConversationSceneVariantStage {
  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((ref) => b.includes(ref));
  if (!scene.variants?.length || same(learnedRefs, scene.learnedRefs)) return "advanced";
  const variant = scene.variants.find((candidate) => same(learnedRefs, candidate.learnedRefs));
  return variant?.stage ?? "beginner";
}

/** Manifesto da conversa exibida a partir do passo já resolvido no plano. */
export function manifestFromConversationStep(step: LessonStep): ConversationVocabularyManifest | null {
  if (step.kind !== "conversation_scene" || !step.sceneId) return null;
  const catalog = conversationSceneById[step.sceneId];
  // Cenas packet-exchange-* não estão no catálogo autoral: monta um stub a
  // partir do passo já resolvido para o loop pós-conversa continuar funcionando.
  const scene: ConversationSceneDefinition =
    catalog ??
    ({
      kind: "conversation_scene",
      sceneId: step.sceneId,
      title: step.title ?? "Troca de frases",
      intent: step.sceneIntent ?? "packet-exchange",
      setting: (step.setting as ConversationSceneDefinition["setting"]) ?? "street",
      characters: step.characters ?? [],
      lines: step.lines ?? [],
      learnedRefs: step.learnedRefs ?? [],
      newRefs: step.newRefs,
      nodes: step.nodes,
      entryNodeId: step.entryNodeId,
      checkpoint: step.checkpoint,
    } as ConversationSceneDefinition);
  const learnedRefs = step.learnedRefs ?? scene.learnedRefs;
  return buildManifestForResolvedVariant(scene, {
    nodes: step.nodes,
    entryNodeId: step.entryNodeId,
    lines: (step.lines ?? []).map((line) => ({ ...line, speakerId: line.speakerId ?? "" })),
    learnedRefs,
    newRefs: step.newRefs,
    stage: catalog ? derivedStageForStep(scene, learnedRefs) : "beginner",
    minPhaseOrder: 0,
  });
}

interface DerivedTaskDeps {
  focus: FocusItem[];
  phaseOrder: number;
  isReview: boolean;
  progress?: HanziBuilderProgressMap;
  seenGlyphs?: ReadonlySet<string>;
  ownFocusGlyphs?: ReadonlySet<string>;
  /** Glifos de lições anteriores — R10: build gerado não introduz hànzì novo. */
  priorGlyphs?: ReadonlySet<string>;
  structureExposure?: StructureExposureMap;
  structureExposureForTransfer?: StructureExposureMap;
  priorTransferredFrames?: ReadonlySet<string>;
  lessonId?: string;
}

/**
 * Glifos disponíveis para um drill derivado de conversa: o que o aluno já
 * viu, mais o vocabulário da própria conversa (que ele acabou de encontrar).
 */
/**
 * Um passo cobre um item de vocabulário? Espelha a regra de
 * validate:conversation-loop: vale pelo texto visível OU pela referência
 * (charId/chunkId/learnedRefs/newRefs) — assim um reconhecimento por id conta
 * do mesmo jeito que uma frase que mostra o hànzì.
 */
function stepCoversVocabularyRef(step: LessonStep, ref: string, text: string): boolean {
  const [type, id] = ref.split(":");
  if (type === "char" && (step.charId === id || (step.charIds ?? []).includes(id))) return true;
  if (type === "chunk" && step.chunkId === id) return true;
  if ((step.learnedRefs ?? []).includes(ref) || (step.newRefs ?? []).includes(ref)) return true;
  const needle = cleanHanzi(text);
  return Boolean(needle && cleanHanzi(stepTextBlob(step)).includes(needle));
}

function postConversationKnownGlyphs(
  item: FocusItem,
  focus: readonly FocusItem[],
  deps: DerivedTaskDeps
): ReadonlySet<string> {
  const glyphs = new Set<string>(deps.seenGlyphs ?? []);
  for (const candidate of [item, ...focus, ...deps.focus]) {
    for (const glyph of cleanHanzi(candidate.hanzi)) glyphs.add(glyph);
  }
  return glyphs;
}

function countSemanticOccurrences(steps: readonly LessonStep[], key: string): number {
  let total = 0;
  for (const step of steps) if (semanticTargetKeys(step).includes(key)) total += 1;
  return total;
}

/** Um passo pode entrar sem estourar nenhum teto de repetição semântica? */
function withinSemanticCeilings(step: LessonStep, planSoFar: readonly LessonStep[], isReview: boolean): boolean {
  for (const key of semanticTargetKeys(step)) {
    const ceiling = semanticHardCeilingForKey(key, isReview);
    if (ceiling == null) continue;
    if (countSemanticOccurrences(planSoFar, key) >= ceiling) return false;
  }
  return true;
}

/** Resposta normalizada de um passo (espelha validate:exercise-depth). */
function normalizedAnswerOf(step: LessonStep): string {
  const answer = step.correctAnswer ?? step.answer ?? step.checkpoint?.correctAnswer ?? "";
  return cleanHanzi(answer).toLocaleLowerCase("pt-BR");
}

/** Uma resposta correta não pode aparecer mais de 2 vezes no plano. */
function withinAnswerRepetitionCeiling(step: LessonStep, planSoFar: readonly LessonStep[]): boolean {
  const key = normalizedAnswerOf(step);
  if (!key) return true;
  let count = 0;
  for (const other of planSoFar) if (normalizedAnswerOf(other) === key) count += 1;
  return count < 2; // após adicionar ficaria <= 2
}

function wouldExceedIntentLimit(
  step: LessonStep,
  planSoFar: readonly LessonStep[],
  isReview: boolean
): boolean {
  for (const key of semanticTargetKeys(step)) {
    if (!key.startsWith("intent:")) continue;
    const limit = isReview ? 6 : 4;
    let count = 0;
    for (const other of planSoFar) {
      if (semanticTargetKeys(other).includes(key)) count += 1;
    }
    if (count >= limit) return true;
  }
  return false;
}

/** Tarefas pós-conversa que reforçam sem repetir intenção comunicativa do chunk. */
const LOW_INTENT_POST_TASKS: readonly PostConversationTaskType[] = [
  "order_dialogue",
  "recreate_no_translation",
  "alternate_scenario",
  "repair_repeat",
  "repair_recover",
  "polite_reply",
];

function newCoverageKindsForItem(
  itemIndex: number,
  usedModalities: ReadonlySet<StepKind>,
  planForCeilings: readonly LessonRoundStep[],
  isReview: boolean,
  focusItem: FocusItem,
  manifest: ConversationVocabularyManifest,
  conversationStep: LessonRoundStep,
  taskDeps: DerivedTaskDeps,
  unitIndex: number,
  usedImageConceptIds: ReadonlySet<string>
): PostConversationTaskType[] {
  const standardFirst: PostConversationTaskType[] =
    itemIndex === 0
      ? ["meaning_check", "listen_choose", "build_used_answer", "fill_missing", "situation_reply"]
      : itemIndex === 1
        ? ["listen_choose", "build_used_answer", "fill_missing", "situation_reply", "meaning_check"]
        : ["build_used_answer", "listen_choose", "situation_reply", "fill_missing", "meaning_check"];

  if (usedModalities.size === 0) return standardFirst;

  const intentSafe: PostConversationTaskType[] = [];
  for (const type of LOW_INTENT_POST_TASKS) {
    const probe = makePostConversationStep(
      type,
      focusItem,
      [],
      manifest,
      conversationStep,
      taskDeps,
      unitIndex,
      usedImageConceptIds
    );
    if (!probe) continue;
    if (!wouldExceedIntentLimit(probe, planForCeilings, isReview)) intentSafe.push(type);
  }
  const rest = standardFirst.filter((type) => !usedModalities.has(postConversationStepKind(type)));
  return [...intentSafe, ...rest];
}

/** Evita trio do mesmo alvo sem transformação cognitiva (validate:lesson-novelty). */
function wouldFormNonTransformativeTrio(step: LessonStep, planSoFar: readonly LessonStep[]): boolean {
  for (const key of semanticTargetKeys(step)) {
    if (key.startsWith("action:")) continue;
    const prior = planSoFar.filter((other) => semanticTargetKeys(other).includes(key));
    if (prior.length < 2) continue;
    // O portão (validate:lesson-novelty) varre TODOS os trios da chave, não só
    // os dois últimos. Olhar apenas o fim deixava passar quatro escolhas de
    // significado seguidas quando duas delas diferiam no escopo: o par do meio
    // "transformava", o trio inteiro não.
    for (let a = 0; a < prior.length - 1; a += 1) {
      for (let b = a + 1; b < prior.length; b += 1) {
        if (cognitiveTransformation(prior[a], prior[b])) continue;
        if (!cognitiveTransformation(prior[a], step) && !cognitiveTransformation(prior[b], step)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ————————————————————————————————————————————————————————————————
// Fase Pós-Conversa: 2–4 tarefas adaptativas após cada conversation_scene.
// ————————————————————————————————————————————————————————————————

const ALL_POST_CONVERSATION_TYPES: readonly PostConversationTaskType[] = [
  "meaning_check",
  "situation_reply",
  "build_used_answer",
  "fill_missing",
  "listen_choose",
  "image_match",
  "spot_hanzi",
  "alternate_scenario",
  "repair_repeat",
  "recreate_no_translation",
  "polite_reply",
  "order_dialogue",
  "sound_contrast",
  "write_heard",
  "group_meaning",
  "produce_free",
  "transfer_context",
  "repair_recover",
];

/** Tarefas típicas de cada nível de apresentação — evitadas quando a cena reaparece. */
const VARIANT_TYPICAL_TASKS: Record<import("../../data/conversationScenes").ConversationVariantLevel, PostConversationTaskType[]> = {
  guided: ["meaning_check", "situation_reply"],
  assisted: ["meaning_check", "fill_missing", "listen_choose"],
  independent: ["build_used_answer", "situation_reply", "recreate_no_translation", "produce_free"],
  audio_first: ["listen_choose", "recreate_no_translation", "alternate_scenario", "transfer_context"],
};

function postConversationBounds(lesson: Lesson, sceneCount = 1): { min: number; max: number } {
  const foundationAuthored =
    FOUNDATION_LESSON_IDS.includes(lesson.id) && lesson.id !== "p1-engine-2-lab";
  if (foundationAuthored) return { min: 2, max: 2 };
  if (lessonAllowsImmersionScenes(lesson)) return { min: 3, max: 8 };
  if (lesson.isReview) return { min: 3, max: 3 };
  // Duas conversas na mesma lição: follow-ups um pouco mais enxutos pra
  // não dobrar o tempo da sessão.
  if (sceneCount >= 2) return { min: 2, max: 3 };
  return { min: 2, max: 4 };
}

function postConversationStepKind(type: PostConversationTaskType): StepKind {
  switch (type) {
    case "meaning_check":
      return "comprehend";
    case "listen_choose":
      return "listen_select";
    case "image_match":
      return "image_choice";
    case "spot_hanzi":
      return "recognize";
    case "build_used_answer":
    case "order_dialogue":
    case "recreate_no_translation":
      return "sentence_build";
    case "fill_missing":
      return "fill_blank";
    case "sound_contrast":
      return "audio_discrimination";
    case "write_heard":
      return "dictation";
    case "group_meaning":
      return "odd_one_out";
    case "produce_free":
      return "free_production";
    case "transfer_context":
      return "transfer_task";
    case "repair_recover":
      return "conversation_repair";
    default:
      return "dialogue_choice";
  }
}

function makeAlternateScenarioStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const options = optionHanzi(item, focus);
  if (options.length < 2) return null;
  return {
    kind: "dialogue_choice",
    title: "Outro cenário",
    speaker: "Situação",
    dialoguePrompt: `Em outro momento do dia, você quer dizer: ${item.meaningPt}.`,
    options,
    correctAnswer: item.hanzi,
    explanation: `${item.hanzi} continua sendo a resposta certa, mesmo em outro contexto.`,
  };
}

function makeRecreateNoTranslationStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean) || clean.length < 2) return null;
  const parts = [...clean];
  const extras = focus
    .filter((candidate) => candidate.key !== item.key)
    .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
    .filter(Boolean);
  const bank = uniqueValues([...parts, ...extras]).slice(0, Math.max(parts.length + 2, 4));
  return {
    kind: "sentence_build",
    title: "Sem tradução",
    prompt: `Monte a frase que você usou (${item.hanzi}).`,
    targetParts: parts,
    bank,
    correctAnswer: clean,
    explanation: `${item.hanzi} = ${item.meaningPt}.`,
    isNoHint: true,
  };
}

function makeRepairRepeatStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const repairChunk = CHUNKS.find((chunk) => /再说|重复|一遍/.test(chunk.hanzi));
  const repairHanzi = repairChunk?.hanzi ?? "请再说一遍";
  const repairMeaning = repairChunk?.meaningPt ?? "Por favor, repita.";
  const options = uniqueValues([
    repairHanzi,
    item.hanzi,
    ...focus.filter((f) => f.key !== item.key).map((f) => f.hanzi),
    ...CHUNKS.filter((c) => cleanHanzi(c.hanzi) !== cleanHanzi(repairHanzi)).slice(0, 2).map((c) => c.hanzi),
  ]).slice(0, 4);
  if (options.length < 2 || !options.includes(repairHanzi)) return null;
  return {
    kind: "dialogue_choice",
    title: "Peça para repetir",
    speaker: "Situação",
    dialoguePrompt: "O personagem não entendeu. Como pedir repetição?",
    options,
    correctAnswer: repairHanzi,
    explanation: `${repairHanzi} = ${repairMeaning}`,
  };
}

function makePoliteReplyStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const polite = CHUNKS.find((chunk) => /请|您|麻烦/.test(chunk.hanzi) && chunk.hanzi.length <= 6);
  const politeHanzi = polite?.hanzi ?? item.hanzi;
  const options = uniqueValues([politeHanzi, item.hanzi, ...optionHanzi(item, focus)]).slice(0, 4);
  if (options.length < 2) return null;
  return {
    kind: "dialogue_choice",
    title: "Tom educado",
    speaker: "Situação",
    dialoguePrompt: "Qual resposta soa mais educada nesta situação?",
    options,
    correctAnswer: politeHanzi,
    explanation: polite ? `${politeHanzi} soa mais formal.` : `${item.hanzi} é a opção mais adequada aqui.`,
  };
}

function makeOrderDialogueStep(lines: readonly { hanzi: string }[], focus: FocusItem[]): LessonStep | null {
  const parts = uniqueValues(lines.map((line) => cleanHanzi(line.hanzi)).filter((h) => h.length >= 1 && CJK_ONLY_RE.test(h))).slice(0, 4);
  if (parts.length < 2) return null;
  const bank = uniqueValues([...parts, ...focus.flatMap((f) => [...cleanHanzi(f.hanzi)])]).slice(0, parts.length + 2);
  const correctAnswer = parts.join("");
  return {
    kind: "sentence_build",
    title: "Ordem da conversa",
    prompt: "Organize as falas na ordem em que apareceram.",
    targetParts: parts,
    bank,
    correctAnswer,
    explanation: "A ordem ajuda a fixar o fluxo da conversa.",
  };
}

function makePostConversationStep(
  taskType: PostConversationTaskType,
  item: FocusItem,
  focus: FocusItem[],
  _manifest: ConversationVocabularyManifest,
  conversationStep: LessonRoundStep,
  _taskDeps: DerivedTaskDeps,
  unitIndex: number,
  usedImageConceptIds?: ReadonlySet<string>
): LessonStep | null {
  const f = focus.length >= 2 ? focus : [item, ...focus.filter((other) => other.key !== item.key)];
  const productionTypes = new Set<PostConversationTaskType>([
    "build_used_answer",
    "fill_missing",
    "recreate_no_translation",
    "write_heard",
    "produce_free",
    "transfer_context",
  ]);
  if (productionTypes.has(taskType) && !allCjkGlyphsKnown(item.hanzi, _taskDeps.priorGlyphs ?? _taskDeps.seenGlyphs)) {
    return null;
  }
  switch (taskType) {
    case "meaning_check":
      return makeComprehendStep(item, f);
    case "situation_reply":
      return makeDialogueChoiceStep(item, f, _taskDeps.priorGlyphs ?? _taskDeps.seenGlyphs);
    case "build_used_answer":
      return makeSentenceBuildStep(item, f);
    case "fill_missing":
      return makeFillBlankStep(item, f);
    case "listen_choose":
      return makeListenSelectStep(item, f);
    case "image_match":
      return makeImageChoiceStepForFocus(item, unitIndex, "post_conversation", usedImageConceptIds);
    case "spot_hanzi":
      return makeRecognizeStep(item);
    case "alternate_scenario":
      return makeAlternateScenarioStep(item, f);
    case "repair_repeat":
      return makeRepairRepeatStep(item, f);
    case "recreate_no_translation":
      return makeRecreateNoTranslationStep(item, f);
    case "polite_reply":
      return makePoliteReplyStep(item, f);
    case "order_dialogue": {
      const lines = conversationStep.lines ?? [];
      const prior = _taskDeps.priorGlyphs ?? _taskDeps.seenGlyphs;
      if (lines.some((line) => line.hanzi && !allCjkGlyphsKnown(line.hanzi, prior))) return null;
      return makeOrderDialogueStep(lines, f);
    }
    // A conversa acabou de expor estas palavras: cobrá-las pelo ouvido e pelo
    // sentido (não só por escolha de significado) é o que evita a fase virar
    // três múltiplas escolhas seguidas.
    case "sound_contrast": {
      const glyphs = postConversationKnownGlyphs(item, focus, _taskDeps);
      return makeAudioDiscriminationStep(glyphs, drillSeedFor(item.key, "post_conversation"));
    }
    case "write_heard":
      return makeDictationStep(item, f, _taskDeps.phaseOrder);
    case "group_meaning": {
      const glyphs = postConversationKnownGlyphs(item, focus, _taskDeps);
      return makeOddOneOutStep(glyphs, drillSeedFor(item.key, "post_conversation"), _taskDeps.phaseOrder);
    }
    // Fechar o loop produzindo: a palavra que acabou de aparecer volta
    // dentro de uma frase que o aluno escreve inteira, sem peças na tela.
    case "produce_free": {
      const glyphs = postConversationKnownGlyphs(item, focus, _taskDeps);
      return makeFreeProductionStep(
        glyphs,
        drillSeedFor(item.key, "post_conversation"),
        item,
        _taskDeps.structureExposure,
        framePickOptionsFor({
          lessonId: _taskDeps.lessonId,
          structureExposure: _taskDeps.structureExposure,
          priorTransferredFrames: _taskDeps.priorTransferredFrames,
        })
      );
    }
    case "transfer_context": {
      const glyphs = postConversationKnownGlyphs(item, focus, _taskDeps);
      return makeTransferStep(
        glyphs,
        drillSeedFor(item.key, "post_conversation"),
        item,
        0,
        _taskDeps.structureExposureForTransfer ?? _taskDeps.structureExposure,
        _taskDeps.priorTransferredFrames,
        framePickOptionsFor({
          lessonId: _taskDeps.lessonId,
          structureExposure: _taskDeps.structureExposureForTransfer ?? _taskDeps.structureExposure,
          priorTransferredFrames: _taskDeps.priorTransferredFrames,
        })
      );
    }
    case "repair_recover": {
      const glyphs = postConversationKnownGlyphs(item, focus, _taskDeps);
      return makeConversationRepairStep(glyphs, drillSeedFor(item.key, "post_conversation"), item);
    }
    default:
      return null;
  }
}

interface PostConversationBlueprint {
  type: PostConversationTaskType;
  item: ConversationVocabularyItem;
  focusItem: FocusItem;
  score: number;
}

function scorePostConversationTask(
  type: PostConversationTaskType,
  _item: ConversationVocabularyItem,
  ctx: {
    variantLevel: import("../../data/conversationScenes").ConversationVariantLevel;
    hadErrors: boolean;
    isRepeatScene: boolean;
    isNew: boolean;
    isAnswer: boolean;
    hasImage: boolean;
    hasBuilder: boolean;
    excludeTypes: ReadonlySet<PostConversationTaskType>;
  }
): number {
  if (ctx.excludeTypes.has(type)) return -1;
  let score = 1;
  const advanced = ctx.variantLevel === "independent" || ctx.variantLevel === "audio_first";
  const assisted = ctx.variantLevel === "guided" || ctx.variantLevel === "assisted";

  if (type === "meaning_check") score += ctx.isNew ? 4 : assisted ? 2 : 0;
  if (type === "listen_choose") score += advanced || ctx.variantLevel === "audio_first" ? 3 : ctx.isNew ? 2 : 1;
  if (type === "situation_reply" || type === "alternate_scenario") score += advanced ? 3 : 2;
  if (type === "build_used_answer" || type === "recreate_no_translation") score += advanced ? 4 : ctx.isAnswer ? 2 : 1;
  if (type === "fill_missing") score += ctx.hadErrors ? 3 : ctx.isNew ? 2 : 1;
      if (type === "image_match") score += ctx.hasImage ? 2 : -3;
  if (type === "spot_hanzi") score += ctx.hasBuilder ? 2 : ctx.isNew ? 1 : -1;
  if (type === "repair_repeat") score += ctx.hadErrors ? 3 : 0;
  // Ouvido e sentido: valem mais quando a cena foi apresentada por áudio ou
  // quando o aluno já viu a cena antes (aí a múltipla escolha cansa).
  if (type === "sound_contrast") score += ctx.variantLevel === "audio_first" ? 3 : ctx.isRepeatScene ? 2 : 1;
  if (type === "write_heard") score += advanced ? 3 : ctx.isNew ? 2 : 1;
  if (type === "group_meaning") score += ctx.isRepeatScene ? 3 : ctx.isNew ? 1 : 2;
  if (type === "polite_reply") score += ctx.isRepeatScene ? 2 : 1;
  if (type === "order_dialogue") score += ctx.isRepeatScene ? 2 : 0;
  // Produção e transferência são o degrau mais alto do loop: valem muito
  // quando a cena já foi apresentada sem apoio ou já foi vista antes, e quase
  // nada quando a palavra é NOVA (produzir sozinho o que acabou de conhecer
  // não ensina, só frustra).
  if (type === "produce_free") score += ctx.isNew ? -2 : advanced ? 4 : ctx.isRepeatScene ? 3 : 1;
  if (type === "transfer_context") score += ctx.isNew ? -3 : advanced ? 4 : ctx.isRepeatScene ? 3 : 0;
  if (type === "repair_recover") score += ctx.hadErrors ? 4 : advanced ? 3 : ctx.isRepeatScene ? 2 : 1;

  if (ctx.hadErrors) {
    if (type === "meaning_check" || type === "fill_missing" || type === "listen_choose") score += 2;
    if (type === "recreate_no_translation") score -= 2;
  } else if (advanced) {
    if (type === "recreate_no_translation" || type === "alternate_scenario") score += 2;
    if (type === "meaning_check") score -= 1;
  }

  if (ctx.isRepeatScene) {
    if (type === "meaning_check" || type === "spot_hanzi") score -= 2;
    if (type === "alternate_scenario" || type === "order_dialogue" || type === "polite_reply") score += 2;
  }

  if (ctx.isNew) {
    if (type === "meaning_check" || type === "listen_choose" || type === "situation_reply") score += 2;
  } else {
    if (type === "build_used_answer" || type === "fill_missing" || type === "recreate_no_translation") score += 2;
    if (type === "spot_hanzi") score -= 2;
  }

  if (ctx.isAnswer && (type === "build_used_answer" || type === "situation_reply" || type === "alternate_scenario")) score += 2;

  return score;
}

function selectPostConversationBlueprints(
  manifest: ConversationVocabularyManifest,
  conversationStep: LessonRoundStep,
  focusByRef: Map<string, FocusItem>,
  ctx: {
    variantLevel: import("../../data/conversationScenes").ConversationVariantLevel;
    hadErrors: boolean;
    isRepeatScene: boolean;
    unitIndex: number;
    taskDeps: DerivedTaskDeps;
    bounds: { min: number; max: number };
    excludeTypes: ReadonlySet<PostConversationTaskType>;
  }
): PostConversationBlueprint[] {
  const answerRefs = new Set(manifest.items.filter((i) => i.roles.includes("response")).map((i) => i.ref));
  const relevant = manifest.items.filter(
    (item) =>
      item.resolved &&
      item.roles.some((role) => role === "required" || role === "new" || role === "reused" || role === "response")
  );
  const hasNew = relevant.some((item) => item.roles.includes("new"));

  const candidates: PostConversationBlueprint[] = [];
  for (const type of ALL_POST_CONVERSATION_TYPES) {
    for (const item of relevant) {
      const focusItem = focusByRef.get(item.ref);
      if (!focusItem) continue;
      const hasImage = Boolean(makeImageChoiceStepForFocus(focusItem, ctx.unitIndex, "post_conversation"));
      const hasBuilder = Boolean(
        makeHanziBuilderStep(focusItem, ctx.taskDeps.phaseOrder, ctx.taskDeps.progress, {
          seenGlyphs: ctx.taskDeps.seenGlyphs,
          ownFocusGlyphs: ctx.taskDeps.ownFocusGlyphs,
          allowComposedFiller: ctx.taskDeps.isReview,
        })
      );
      const score = scorePostConversationTask(type, item, {
        variantLevel: ctx.variantLevel,
        hadErrors: ctx.hadErrors,
        isRepeatScene: ctx.isRepeatScene,
        isNew: item.roles.includes("new"),
        isAnswer: answerRefs.has(item.ref),
        hasImage,
        hasBuilder,
        excludeTypes: ctx.excludeTypes,
      });
      if (score < 0) continue;
      const step = makePostConversationStep(type, focusItem, [...focusByRef.values()], manifest, conversationStep, ctx.taskDeps, ctx.unitIndex);
      if (!step) continue;
      candidates.push({ type, item, focusItem, score });
    }
  }

  candidates.sort((a, b) => b.score - a.score || postConversationStepKind(a.type).localeCompare(postConversationStepKind(b.type)));

  const picked: PostConversationBlueprint[] = [];
  const usedTypes = new Set<PostConversationTaskType>();
  const usedKinds = new Set<StepKind>();
  const usedRefs = new Set<string>();

  // Uma modalidade por fase. Antes o mínimo podia ser atingido repetindo o
  // mesmo kind, e a fase virava três múltiplas escolhas seguidas — que é
  // exatamente o que "mesma palavra por caminhos diferentes" quer evitar.
  // Repetir kind agora só acontece no passe de relaxamento no fim, quando
  // não sobrou nenhuma modalidade nova.
  const tryPick = (bp: PostConversationBlueprint, allowRepeatKind = false) => {
    if (picked.length >= ctx.bounds.max) return false;
    if (usedTypes.has(bp.type)) return false;
    const kind = postConversationStepKind(bp.type);
    // A seleção principal deve variar a modalidade. Se não existir alternativa,
    // o fallback abaixo ainda pode repetir um kind para cumprir o mínimo.
    if (usedKinds.has(kind) && !allowRepeatKind) return false;
    picked.push(bp);
    usedTypes.add(bp.type);
    usedKinds.add(kind);
    usedRefs.add(bp.item.ref);
    return true;
  };

  // A resposta principal da cena volta obrigatoriamente numa tarefa em que o
  // aluno PRODUZ ou APLICA (montar, responder a situação, completar), nunca
  // só reconhecer. Antes isso saía por sorte da ordenação por score; agora é
  // garantido — é o núcleo do "usou na conversa, usa de novo".
  const CONTEXTUAL_ANSWER_TYPES: PostConversationTaskType[] = [
    "produce_free",
    "build_used_answer",
    "situation_reply",
    "fill_missing",
    "recreate_no_translation",
    "alternate_scenario",
    "write_heard",
  ];
  for (const ref of answerRefs) {
    if (picked.some((bp) => bp.item.ref === ref && CONTEXTUAL_ANSWER_TYPES.includes(bp.type))) break;
    let done = false;
    for (const type of CONTEXTUAL_ANSWER_TYPES) {
      const best = candidates.find((candidate) => candidate.type === type && candidate.item.ref === ref);
      if (best && tryPick(best)) {
        done = true;
        break;
      }
    }
    if (done) break;
  }

  // Novo: significado + som/forma + aplicação.
  if (hasNew) {
    for (const item of relevant.filter((i) => i.roles.includes("new"))) {
      for (const need of ["meaning_check", "listen_choose", "situation_reply"] as PostConversationTaskType[]) {
        const best = candidates.find((c) => c.type === need && c.item.ref === item.ref);
        if (best) tryPick(best);
      }
    }
  }

  // Antes de repetir palavra, cobrir palavra. A ordenação por score sozinha
  // gastava a fase inteira nos dois itens mais bem pontuados e deixava o
  // resto da conversa sem nenhuma tarefa — é a raiz da cobertura travada em
  // dois terços. Este passe dá a primeira tarefa a cada item ainda descoberto.
  for (const bp of candidates) {
    if (picked.length >= ctx.bounds.max) break;
    if (usedRefs.has(bp.item.ref)) continue;
    tryPick(bp);
  }

  for (const bp of candidates) {
    if (picked.length >= ctx.bounds.max) break;
    tryPick(bp);
  }

  // Garante mínimo com fallbacks — primeiro ainda exigindo modalidade nova,
  // e só depois relaxando o kind se não houver mais nenhuma disponível.
  for (const bp of candidates) {
    if (picked.length >= ctx.bounds.min) break;
    tryPick(bp);
  }
  for (const bp of candidates) {
    if (picked.length >= ctx.bounds.min) break;
    tryPick(bp, true);
  }

  return picked.slice(0, ctx.bounds.max);
}

// Orçamento de crescimento por tipo de lição: comum é enxuta; revisão e imersão
// mostram muito mais vocabulário na conversa e podem crescer mais para cobri-lo
// (req. 9: crescer só quando não há outra forma de cumprir a cobertura).
function conversationLoopBudget(lesson: Lesson): { perConversation: number; growth: number } {
  if (lessonAllowsImmersionScenes(lesson)) return { perConversation: 6, growth: 18 };
  if (lesson.curriculumRole === "perception_lab") return { perConversation: 2, growth: 2 };
  if (lesson.isReview) return { perConversation: 3, growth: 6 };
  return { perConversation: 4, growth: 10 };
}

/** Compressão V4.1.1: só entrada, labs e revisão. O resto da jornada
 *  precisa de folga gerada — senão o retry da mesma variante não renova. */
function shouldCompressPracticePlan(lesson: Lesson): boolean {
  return (
    FOUNDATION_LESSON_IDS.includes(lesson.id) ||
    lesson.curriculumRole === "perception_lab" ||
    Boolean(lesson.isReview)
  );
}

/** Quantos passos o loop pós-conversa ainda vai injetar — para reservar no target, não somar. */
function conversationLoopReserve(lesson: Lesson, profile: LessonPracticeProfile): number {
  const authored = lesson.steps.filter((step) => step.kind === "conversation_scene").length;
  const expectedScenes = Math.min(
    profile.maxConversationScenes,
    authored > 0 ? authored : profile.maxConversationScenes > 0 ? 1 : 0
  );
  if (expectedScenes <= 0) return 0;
  return postConversationBounds(lesson, expectedScenes).min * expectedScenes;
}

function withConversationLoopReserve(
  lesson: Lesson,
  profile: LessonPracticeProfile
): LessonPracticeProfile {
  const reserve = conversationLoopReserve(lesson, profile);
  if (reserve <= 0) return profile;
  return { ...profile, targetCount: Math.max(3, profile.targetCount - reserve) };
}

function capPlanToTarget(
  plan: LessonRoundStep[],
  targetCount: number,
  options: { protectHanziBuild?: boolean } = {}
): LessonRoundStep[] {
  if (plan.length <= targetCount) return plan;
  const next = [...plan];
  // Nunca cortar follow-up pós-conversa: o portão conversation-loop exige o mínimo.
  // Nem os motores de percepção que ensureCoverage acabou de garantir — o cap
  // não pode apagar dictation/spot_error da jornada e o portão de drills cair.
  // Em revisão, também não cortar HanziBuilder: o cap compacto derrubava os 2
  // builders do portão validate:hanzi-builder-coverage (l5-rev/l6-rev/checkpoint).
  // Fora da revisão o cap ainda pode soltar hanzi_build extra — senão a fundação
  // (p1-primeiros-hanzi) empilha 3× e o QA de runtime cai.
  const PERCEPTION_ENGINE_KINDS = new Set([
    "audio_discrimination",
    "dictation",
    "odd_one_out",
    "spot_error",
  ]);
  const droppable = (step: LessonRoundStep) =>
    Boolean(step.generated) &&
    step.kind !== "conversation_scene" &&
    step.kind !== "image_choice" &&
    !(options.protectHanziBuild && step.kind === "hanzi_build") &&
    !PERCEPTION_ENGINE_KINDS.has(step.kind) &&
    !step.conversationDerived &&
    !step.postConversationPhase;
  for (let i = next.length - 1; i >= 0 && next.length > targetCount; i -= 1) {
    if (droppable(next[i])) next.splice(i, 1);
  }
  return next;
}

/**
 * Fase Pós-Conversa: injeta 2–4 tarefas adaptativas DEPOIS de cada conversa.
 */
export function applyConversationVocabularyLoop(
  plan: LessonRoundStep[],
  lesson: Lesson,
  deps: {
    focus: FocusItem[];
    reviewFocus: FocusItem[];
    errorFocus: FocusItem[];
    phaseOrder: number;
    progress?: HanziBuilderProgressMap;
    seenGlyphs?: ReadonlySet<string>;
    ownFocusGlyphs?: ReadonlySet<string>;
    conversationHistory?: readonly ConversationHistoryEntry[];
    structureExposure?: StructureExposureMap;
    structureExposureForTransfer?: StructureExposureMap;
    priorTransferredFrames?: ReadonlySet<string>;
  }
): LessonRoundStep[] {
  const conversationIndexes = plan
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.kind === "conversation_scene");
  if (conversationIndexes.length === 0) return plan;

  const isReview = Boolean(lesson.isReview);
  const bounds = postConversationBounds(lesson, conversationIndexes.length);
  const budget = conversationLoopBudget(lesson);
  const errorRefs = new Set(focusRefs(deps.errorFocus));
  const unitIndex = lessonUnitIndex(lesson);
  const taskDeps: DerivedTaskDeps = {
    focus: [...deps.focus, ...deps.reviewFocus],
    phaseOrder: deps.phaseOrder,
    isReview,
    progress: deps.progress,
    seenGlyphs: deps.seenGlyphs,
    ownFocusGlyphs: deps.ownFocusGlyphs,
    priorGlyphs: curriculumGlyphsBeforeLesson(lesson.id),
    structureExposure: deps.structureExposure,
    structureExposureForTransfer: deps.structureExposureForTransfer,
    priorTransferredFrames: deps.priorTransferredFrames,
    lessonId: lesson.id,
  };

  const derivedByConversationIndex = new Map<number, LessonRoundStep[]>();
  let growthUsed = 0;
  const planForCeilings: LessonRoundStep[] = [...plan];

  for (const { step: conversationStep, index: ci } of conversationIndexes) {
    const manifest = manifestFromConversationStep(conversationStep);
    if (!manifest) continue;

    const relevant = manifest.items.filter(
      (item) =>
        item.resolved &&
        item.roles.some((role) => role === "required" || role === "new" || role === "reused" || role === "response")
    );
    const focusByRef = new Map<string, FocusItem>();
    // Só microtarefas de contorno ma/comparar: cumprimentos na cena são âncora,
    // não bateria. Outras lições de som (ex. p2-sons-brasileiros) precisam do
    // loop normal para o portão conversation-loop.
    const demoteSeedRecovery = /^p2-ma-/.test(lesson.id) || /^p2-comparar-tom-/.test(lesson.id);
    for (const item of relevant) {
      const focusItem = focusItemFromRef(item.ref);
      if (!focusItem) continue;
      // PED-021/027: microtarefas de tom/contorno não transformam seeds já
      // conhecidos em bateria pós-conversa. Itens NEW da cena ainda ganham
      // follow-up (portão conversation-loop).
      const isNewInScene = item.roles.includes("new");
      if (demoteSeedRecovery && isSeedFillerHanzi(focusItem.hanzi) && !isNewInScene) {
        continue;
      }
      focusByRef.set(item.ref, focusItem);
    }

    const variantLevel = conversationStep.conversationVariantLevel ?? "guided";
    const sceneId = conversationStep.sceneId ?? manifest.sceneId;
    const priorCompletions = (deps.conversationHistory ?? []).filter(
      (entry) => entry.sceneId === sceneId && entry.result === "completed"
    ).length;
    const isRepeatScene = priorCompletions > 0;
    const hadErrors = relevant.some((item) => errorRefs.has(item.ref));
    const levels = ["guided", "assisted", "independent", "audio_first"] as const;
    const prevLevelIndex = Math.max(0, levels.indexOf(variantLevel) - 1);
    const excludeTypes = new Set<PostConversationTaskType>(
      isRepeatScene ? VARIANT_TYPICAL_TASKS[levels[prevLevelIndex]] ?? [] : []
    );
    const foundationConcept =
      FOUNDATION_LESSON_IDS.includes(lesson.id) && lesson.id !== "p1-engine-2-lab";
    if (foundationConcept) {
      excludeTypes.add("produce_free");
      excludeTypes.add("transfer_context");
      excludeTypes.add("write_heard");
    }

    const blueprints = selectPostConversationBlueprints(manifest, conversationStep, focusByRef, {
      variantLevel,
      hadErrors,
      isRepeatScene,
      unitIndex,
      taskDeps,
      bounds,
      excludeTypes,
    });

    const addedForConversation: LessonRoundStep[] = [];
    const coveredNewRefs = new Set<string>();
    const usedImageConceptIds = new Set(
      planForCeilings.map((step) => imageConceptIdOfStep(step)).filter((id): id is string => Boolean(id))
    );

    const pushDerived = (bp: PostConversationBlueprint, opts: { force?: boolean; mandatoryNew?: boolean } = {}): boolean => {
      const force = opts.force ?? false;
      const mandatoryNew = opts.mandatoryNew ?? false;
      const atCap = addedForConversation.length >= bounds.max;
      if (atCap && !force) return false;
      if (atCap && force && addedForConversation.length >= bounds.max + 4) return false;
      if (growthUsed >= budget.growth && !mandatoryNew) return false;
      const rawStep = makePostConversationStep(
        bp.type,
        bp.focusItem,
        [...focusByRef.values()],
        manifest,
        conversationStep,
        taskDeps,
        unitIndex,
        usedImageConceptIds
      );
      if (!rawStep) return false;
      if (!withinSemanticCeilings(rawStep, planForCeilings, isReview) && !mandatoryNew) return false;
      if (!withinAnswerRepetitionCeiling(rawStep, planForCeilings) && !mandatoryNew) return false;
      if (wouldExceedIntentLimit(rawStep, planForCeilings, isReview)) return false;
      // Trio sem transformação nunca é contornado — cobertura obrigatória usa outras modalidades.
      if (wouldFormNonTransformativeTrio(rawStep, planForCeilings)) return false;

      const derived: LessonRoundStep = {
        ...rawStep,
        title: POST_CONVERSATION_TASK_LABELS[bp.type],
        lessonStageId: "post_conversation",
        generated: true,
        sourceStepIndex: -1,
        postConversationPhase: true,
        postConversationTaskType: bp.type,
        postConversationIndex: addedForConversation.length + 1,
        postConversationCount: bounds.max,
        conversationDerived: true,
        conversationSourceSceneId: manifest.sceneId,
        conversationCoveredRef: bp.item.ref,
        conversationModality: rawStep.kind,
        conversationExposureNumber: addedForConversation.length + 1,
        conversationDerivedReason: errorRefs.has(bp.item.ref) ? "error" : "rule",
      };
      addedForConversation.push(derived);
      planForCeilings.push(derived);
      const imageId = imageConceptIdOfStep(derived);
      if (imageId) usedImageConceptIds.add(imageId);
      growthUsed += 1;
      if (bp.item.roles.includes("new")) coveredNewRefs.add(bp.item.ref);
      return true;
    };

    for (const bp of blueprints) {
      pushDerived(bp);
    }

    // Palavra nova: significado + som/forma + aplicação (≥2 tarefas em ≥2 modalidades).
    const newItems = relevant.filter((item) => item.roles.includes("new"));
    newItems.forEach((item, itemIndex) => {
      const focusItem = focusByRef.get(item.ref);
      if (!focusItem) return;
      const usedModalities = new Set(
        addedForConversation.filter((s) => s.conversationCoveredRef === item.ref).map((s) => s.kind)
      );
      let count = addedForConversation.filter((s) => s.conversationCoveredRef === item.ref).length;
      const kinds = newCoverageKindsForItem(
        itemIndex,
        usedModalities,
        planForCeilings,
        isReview,
        focusItem,
        manifest,
        conversationStep,
        taskDeps,
        unitIndex,
        usedImageConceptIds
      );
      for (const taskType of kinds) {
        if (count >= 2 && usedModalities.size >= 2) break;
        const kind = postConversationStepKind(taskType);
        if (usedModalities.has(kind)) continue;
        if (addedForConversation.some((s) => s.conversationCoveredRef === item.ref && s.postConversationTaskType === taskType)) continue;
        const probe = makePostConversationStep(
          taskType,
          focusItem,
          [...focusByRef.values()],
          manifest,
          conversationStep,
          taskDeps,
          unitIndex,
          usedImageConceptIds
        );
        if (!probe) continue;
        if (wouldExceedIntentLimit(probe, planForCeilings, isReview) && taskType === "meaning_check") continue;
        if (pushDerived({ type: taskType, item, focusItem, score: 10 }, { force: true, mandatoryNew: true })) {
          count += 1;
          usedModalities.add(kind);
        }
      }
    });

    // ——— Fechamento prioritário do loop ———
    //
    // Mais modalidades não fecharam o loop sozinhas: a fase gastava as vagas
    // nos itens mais bem pontuados e deixava a resposta da cena (ou a palavra
    // que o aluno errou) sem nenhuma tarefa. A prioridade aqui é explícita e
    // curta — resposta principal, item errado, item novo — e de propósito não
    // inclui o núcleo de altíssima frequência: 你好/谢谢/再见 já estão no teto
    // de repetição, e insistir neles é o oposto de consolidar.
    const priorityRefs: string[] = [];
    for (const item of relevant) {
      const isPriority = item.roles.includes("response") || item.roles.includes("new") || errorRefs.has(item.ref);
      if (isPriority && !priorityRefs.includes(item.ref)) priorityRefs.push(item.ref);
    }
    for (const ref of priorityRefs) {
      const manifestItem = relevant.find((item) => item.ref === ref);
      const focusItem = focusByRef.get(ref);
      if (!manifestItem || !focusItem) continue;
      // A própria conversa não conta: o portão conversation-loop exige tarefa
      // DEPOIS/FORA da cena. Contar learnedRefs da conversation_scene aqui
      // pulava o fechamento e deixava V3.8 (falar-de-estudo, hotel, etc.)
      // sem drill dedicado.
      const alreadyCovered = [...planForCeilings, ...addedForConversation].some(
        (step) =>
          step.kind !== "conversation_scene" &&
          stepCoversVocabularyRef(step, ref, manifestItem.text ?? focusItem.hanzi)
      );
      if (alreadyCovered) continue;
      // A modalidade tem que ser nova na fase pós-conversa da lição inteira,
      // não só desta cena: numa revisão com várias conversas, contar por cena
      // deixava passar quatro "o que significa?" seguidos em cenas diferentes.
      // Se nenhuma modalidade nova serve, o item fica descoberto de propósito —
      // cobrir repetindo o mesmo formato não é cobrir.
      const usedKinds = new Set(
        [...planForCeilings, ...addedForConversation]
          .filter((step) => step.postConversationPhase)
          .map((step) => step.kind)
      );
      for (const type of ALL_POST_CONVERSATION_TYPES) {
        if (usedKinds.has(postConversationStepKind(type))) continue;
        if (addedForConversation.some((step) => step.postConversationTaskType === type && step.conversationCoveredRef === ref)) {
          continue;
        }
        if (pushDerived({ type, item: manifestItem, focusItem, score: 9 }, { force: true })) break;
      }
    }

    // Garante mínimo da fase (revisão/imersão ≥3, comum ≥2).
    //
    // Sempre preferindo uma modalidade que a fase ainda não usou: percorrer a
    // lista de tipos sempre do início fazia o mínimo ser preenchido com
    // meaning_check para um item atrás do outro — três múltiplas escolhas
    // seguidas sobre palavras diferentes. Só relaxa (2ª passada) quando não
    // sobrou nenhum kind novo que gere passo válido.
    while (addedForConversation.length < bounds.min) {
      let progressed = false;
      for (const requireNewKind of [true, false]) {
        for (const type of ALL_POST_CONVERSATION_TYPES) {
          const kind = postConversationStepKind(type);
          if (requireNewKind && addedForConversation.some((step) => step.kind === kind)) continue;
          for (const item of relevant) {
            const focusItem = focusByRef.get(item.ref);
            if (!focusItem) continue;
            if (addedForConversation.some((s) => s.postConversationTaskType === type && s.conversationCoveredRef === item.ref)) continue;
            if (pushDerived({ type, item, focusItem, score: 0 }, { force: true })) {
              progressed = true;
              break;
            }
          }
          if (progressed || addedForConversation.length >= bounds.min) break;
        }
        if (progressed || addedForConversation.length >= bounds.min) break;
      }
      if (!progressed) break;
    }

    if (isReview) {
      const reviewTarget =
        relevant.find((item) => item.roles.includes("reused")) ??
        relevant.find((item) => !item.roles.includes("new")) ??
        relevant[0];
      if (reviewTarget) {
        const focusItem = focusByRef.get(reviewTarget.ref);
        if (focusItem) {
          const hasTarget = addedForConversation.some((s) => s.conversationCoveredRef === reviewTarget.ref);
          if (!hasTarget) {
            for (const type of ["build_used_answer", "meaning_check", "fill_missing"] as PostConversationTaskType[]) {
              if (pushDerived({ type, item: reviewTarget, focusItem, score: 5 }, { force: true })) break;
            }
          }
        }
      }

      const oldGlyphs = priorOldGlyphsForLesson(lesson);
      if (oldGlyphs.size > 0) {
        const oldRef =
          relevant.find((item) => refUsesOldCurriculum(item.ref, oldGlyphs))?.ref ??
          OLD_CURRICULUM_RECOVERY_REFS.find(
            (ref) => refUsesOldCurriculum(ref, oldGlyphs) && refFullyKnownForLesson(ref, lesson)
          );
        if (oldRef) {
          const focusItem = focusByRef.get(oldRef) ?? focusItemFromRef(oldRef);
          if (focusItem) {
            const manifestItem: ConversationVocabularyItem =
              relevant.find((item) => item.ref === oldRef) ??
              ({
                ref: oldRef,
                resolved: true,
                roles: ["reused"],
                text: focusItem.hanzi,
              } as ConversationVocabularyItem);
            const hasOldTarget = addedForConversation.some((s) => s.conversationCoveredRef === oldRef);
            if (!hasOldTarget) {
              const oldRecoveryTypes: PostConversationTaskType[] =
                oldRef.startsWith("chunk:") || oldRef.startsWith("phrase:")
                  ? ["meaning_check", "build_used_answer", "listen_choose", "fill_missing"]
                  : ["meaning_check", "spot_hanzi", "fill_missing", "listen_choose"];
              for (const type of oldRecoveryTypes) {
                if (pushDerived({ type, item: manifestItem, focusItem, score: 8 }, { force: true })) break;
              }
            }
          }
        }
      }
    }

    const finalCount = addedForConversation.length;
    for (const step of addedForConversation) {
      step.postConversationCount = finalCount;
    }

    if (addedForConversation.length > 0) {
      addedForConversation.sort((a, b) => cognitiveProfile(a).familyRank - cognitiveProfile(b).familyRank);
      derivedByConversationIndex.set(ci, addedForConversation);
    }
  }

  if (derivedByConversationIndex.size === 0) return plan;

  const rebuilt: LessonRoundStep[] = [];
  plan.forEach((step, index) => {
    rebuilt.push(step);
    const derived = derivedByConversationIndex.get(index);
    if (derived) rebuilt.push(...derived);
  });

  const stageCounts = new Map<LessonStageId, number>();
  const stageTotals = new Map<LessonStageId, number>();
  for (const step of rebuilt) {
    const stageId = step.lessonStageId ?? "usage";
    stageTotals.set(stageId, (stageTotals.get(stageId) ?? 0) + 1);
  }
  return rebuilt.map((step) => {
    const stageId = step.lessonStageId ?? "usage";
    const index = stageCounts.get(stageId) ?? 0;
    stageCounts.set(stageId, index + 1);
    return { ...step, lessonStageQuestion: index + 1, lessonStageQuestionCount: stageTotals.get(stageId) ?? 1 };
  });
}

export function buildLessonPracticePlan(lesson: Lesson, context: LessonPracticePlanContext = {}): LessonRoundStep[] {
  if (lesson.steps.length === 0) return [];
  const focus = focusForPlanning(lesson, context);
  const reviewFocus = combinedReviewFocus(lesson, context);
  const errorFocus = recentErrorFocusItems(context.recentErrors);
  const declaredProfile = withAuthoredVisualRoom(profileForLesson(lesson, focus), lesson);
  const profile = shouldCompressPracticePlan(lesson)
    ? withConversationLoopReserve(lesson, declaredProfile)
    : declaredProfile;
  // Onda 4: a variante deixa de ser rodízio cego e passa a apontar para a causa
  // em que este aluno erra de verdade. Sem causa dominante — aluno novo, erros
  // espalhados, histórico curto — o rodízio A/B/C de sempre é preservado.
  const weakness = context.weaknessProfile ?? weaknessProfile(context.recentErrors);
  const practiceVariant = practiceVariantForAttempt(context.attemptNumber, weakness);
  const variantSeedOffset = variantSeedOffsetForAttempt(context.attemptNumber);
  // A lição enxerga o foco de revisão inteiro; a porta que libera os motores de
  // produzir enxerga só o que o currículo já apresentou. Ver ≠ ter de produzir.
  const seenGlyphs = seenGlyphsForPlanning(focus, seenFocusForProduction(lesson, reviewFocus), context);
  // Glifos que ESTA lição ensina (só o próprio foco, sem a revisão): composição
  // só é montada aqui se for do próprio conteúdo, ou em revisões.
  const ownFocusGlyphs = new Set<string>();
  for (const item of focus) for (const glyph of cleanHanzi(item.hanzi)) ownFocusGlyphs.add(glyph);
  // Contexto de seleção de conversa enriquecido com o histórico real do aluno
  // (cenas nunca vistas, intenção/cenário pouco praticados, erros recentes).
  const recentErrorRefs = new Set(focusRefs(errorFocus));
  const sceneContext = conversationSelectionContextFromHistory(context.conversationHistory, {
    recentConversationSceneIds: context.recentConversationSceneIds,
    recentConversationIntentIds: context.recentConversationIntentIds,
    recentErrorRefs,
  });
  const exposureBundle = context.skipStructureExposureIndex
    ? {
        forFree: context.structureExposure ?? new Map(),
        forTransfer: context.structureExposureForTransfer ?? context.structureExposure ?? new Map(),
      }
    : structureExposureForLesson(lesson.id);
  const structureExposure = context.structureExposure ?? exposureBundle.forFree;
  const structureExposureForTransfer =
    context.structureExposureForTransfer ?? exposureBundle.forTransfer;
  const priorTransferredFrames =
    context.priorTransferredFrames ?? priorTransferredFramesForLesson(lesson.id);
  const candidates = [
    ...authoredCandidatesFor(lesson, reviewFocus),
    ...generatedCandidatesFor(
      lesson,
      focus,
      reviewFocus,
      profile,
      context.hanziBuilderProgress,
      seenGlyphs,
      ownFocusGlyphs,
      sceneContext,
      context.conversationHistory,
      practiceVariant,
      variantSeedOffset,
      context.attemptNumber ?? 0,
      structureExposure,
      structureExposureForTransfer,
      priorTransferredFrames
    ),
  ];
  const usedSignatures = new Set<string>();
  const selected: PracticeCandidate[] = [];

  if (lesson.curriculumRole === "perception_lab") {
    for (const candidate of authoredCandidatesFor(lesson, reviewFocus)) {
      if (selected.length >= profile.targetCount) break;
      const signature = stepSignature(candidate.step);
      if (usedSignatures.has(signature)) continue;
      selected.push(candidate);
      usedSignatures.add(signature);
    }
  }

  for (const stageId of LESSON_STAGE_ORDER) {
    const target = profile.stageTargets[stageId];
    if (target <= 0) continue;
    let selectedInStage = 0;
    while (selectedInStage < target && selected.length < profile.targetCount) {
      const candidate = selectBestCandidate(selected, candidates, stageId, usedSignatures, profile);
      if (!candidate) break;
      selected.push(candidate);
      usedSignatures.add(stepSignature(candidate.step));
      selectedInStage += 1;
    }
  }

  if (selected.length === 0) {
    const fallbackUsed = new Set<string>();
    for (const stageId of LESSON_STAGE_ORDER) {
      for (const step of selectRoundSteps(lesson, stageId, focus, fallbackUsed)) {
        fallbackUsed.add(stepSignature(step));
        selected.push({
          step,
          stageId,
          sourceStepIndex: lesson.steps.findIndex((candidate) => stepSignature(candidate) === stepSignature(step)),
          generated: !lesson.steps.some((candidate) => stepSignature(candidate) === stepSignature(step)),
          families: exerciseFamiliesFor(step, stageId),
          score: 0,
        });
      }
    }
  }

  if (lesson.curriculumRole !== "perception_lab") {
    ensureCoverage(lesson, selected, candidates, profile, reviewFocus, focus, errorFocus, usedSignatures, practiceVariant);
  }
  const trimmed = trimToTarget(selected, profile);

  for (const gap of moduleReviewGapCandidates(lesson, focus, reviewFocus, trimmed)) {
    if (trimmed.length >= profile.targetCount) break;
    if (usedSignatures.has(stepSignature(gap.step))) continue;
    trimmed.push(gap);
    usedSignatures.add(stepSignature(gap.step));
    const unitId = lessonUnitId(lesson);
    if (unitId && validateModuleReviewCoverage(unitId, trimmed.map((candidate) => candidate.step), {}).length === 0) break;
  }

  const balanced = balancePracticeSequence(trimmed);

  const stageCounts = new Map<LessonStageId, number>();
  const plan = balanced.map((candidate) => {
      const stageId = candidate.stageId;
      const stageIndex = stageCounts.get(stageId) ?? 0;
      stageCounts.set(stageId, stageIndex + 1);
      const stepsInStage = balanced.filter((item) => item.stageId === stageId).length;
      const vocabulary = stageVocabulary(stageId, focus);
      const reviewLabels = reviewFocus.slice(0, stageId === "consolidation" ? 4 : 2).map(focusLabel);
      const reusesPreviousVocabulary =
        candidate.step.reusesPreviousVocabulary ??
        (stageId === "consolidation" || stepUsesFocus(candidate.step, reviewFocus)
          ? uniqueValues([...reviewLabels, ...(vocabulary.reusesPreviousVocabulary ?? [])])
          : vocabulary.reusesPreviousVocabulary);
      return {
        ...candidate.step,
        practiceVariant,
        objective: candidate.step.objective ?? stageObjectiveFor(stageId),
        exercises: candidate.step.exercises ?? [candidate.step.kind],
        introducesNewVocabulary: candidate.step.introducesNewVocabulary ?? vocabulary.introducesNewVocabulary,
        reusesPreviousVocabulary,
        lessonStageId: stageId,
        lessonStageQuestion: stageIndex + 1,
        lessonStageQuestionCount: stepsInStage,
        sourceStepIndex: candidate.sourceStepIndex,
        generated: candidate.generated,
      };
    });

  // Conversation Vocabulary Loop: garante que o vocabulário exibido na conversa
  // seja praticado DEPOIS dela, alterando o plano real entregue ao player.
  const foundationConcept =
    FOUNDATION_LESSON_IDS.includes(lesson.id) && lesson.id !== "p1-engine-2-lab";
  const withConversationLoop = applyConversationVocabularyLoop(plan, lesson, {
    focus,
    reviewFocus: foundationConcept ? focus : reviewFocus,
    errorFocus,
    phaseOrder: lessonPhaseOrder(lesson),
    progress: context.hanziBuilderProgress,
    seenGlyphs,
    ownFocusGlyphs,
    conversationHistory: context.conversationHistory,
    structureExposure,
    structureExposureForTransfer,
    priorTransferredFrames,
  });

  const capped = shouldCompressPracticePlan(lesson)
    ? capPlanToTarget(withConversationLoop, declaredProfile.targetCount, {
        protectHanziBuild: Boolean(lesson.isReview),
      })
    : withConversationLoop;
  if (!context.silent) logPracticePlanInDev(lesson, capped, declaredProfile, reviewFocus);
  return balanceLessonPlan(capped.map((step) => ({ ...step, practiceVariant })), {
    recentActivities: context.recentActivities,
    hanziDedicatedLesson: lesson.skill === "hanzi",
  });
}

function isPostConversationFollowUp(step: LessonRoundStep, sceneId: string | undefined): boolean {
  if (!(step.postConversationPhase || step.conversationDerived)) return false;
  if (!sceneId) return true;
  return !step.conversationSourceSceneId || step.conversationSourceSceneId === sceneId;
}

/**
 * Conversa + tarefas pós-conversa da mesma cena formam um bloco atômico.
 * Separá-las (ex.: duas conversation_scene consecutivas falham o teto de kind)
 * colocava derivadas ANTES da cena de origem e zerava a fase pós-conversa.
 */
function conversationLockedBlocks(plan: LessonRoundStep[]): LessonRoundStep[][] {
  const blocks: LessonRoundStep[][] = [];
  for (let index = 0; index < plan.length; index += 1) {
    const step = plan[index];
    if (step.kind !== "conversation_scene") {
      blocks.push([step]);
      continue;
    }
    const block = [step];
    const sceneId = step.sceneId;
    while (index + 1 < plan.length && isPostConversationFollowUp(plan[index + 1], sceneId)) {
      index += 1;
      block.push(plan[index]);
    }
    blocks.push(block);
  }
  return blocks;
}

/**
 * Converte o histórico entre modos em candidatos sintéticos, na ordem
 * cronológica que `wouldViolateVariety` espera (mais antigo primeiro).
 *
 * Atividades marcadas com `recoveryReason` são repetição DELIBERADA (o aluno
 * errou e está recuperando) e não entram na janela — senão a remediação seria
 * penalizada como se fosse repetição acidental (VAR-017).
 */
function varietySeedFromHistory(
  history: readonly ActivityMemoryEntry[] | undefined,
  options: { hanziDedicatedLesson?: boolean } = {}
): PracticeCandidate[] {
  if (!history || history.length === 0) return [];
  return history
    .slice(0, 4)
    .filter((entry) => !entry.recoveryReason)
    // VAR-016 — lição explicitamente dedicada a Hànzì é exceção: nela a família
    // Hànzì É o objetivo, então o histórico de Hànzì não pode empurrar o plano
    // para outra coisa. As demais famílias do histórico seguem valendo.
    .filter((entry) => !(options.hanziDedicatedLesson && entry.cognitiveFamily === "hanzi"))
    .reverse()
    .map((entry, index) => ({
      step: { kind: entry.stepKind as StepKind, hanzi: entry.hanziTarget } as LessonRoundStep,
      stageId: "usage" as LessonStageId,
      families: [entry.cognitiveFamily as ExerciseFamily],
      score: 0,
      generated: false,
      sourceStepIndex: -1 - index,
    }));
}

/**
 * PED-030 — pós-processamento de variedade do plano.
 * Evita kinds consecutivos e saturação de famílias (hanzi/tone),
 * sem reordenar agressivamente a ordem de estágios.
 * Nunca parte um bloco conversa → pós-conversa.
 */
export function balanceLessonPlan(
  plan: LessonRoundStep[],
  _options: {
    respectMasteryPass?: number;
    recentActivities?: readonly ActivityMemoryEntry[];
    hanziDedicatedLesson?: boolean;
  } = {}
): LessonRoundStep[] {
  if (plan.length <= 2) return plan;
  // VAR-015 — a janela de variedade começa com o que o aluno acabou de fazer em
  // QUALQUER modo (lição, mastery, revisão, prática). Sem isso cada plano passa
  // isolado e o aluno ainda vê Hànzì → Hànzì → Hànzì atravessando os modos.
  const carryOver = varietySeedFromHistory(_options.recentActivities, {
    hanziDedicatedLesson: _options.hanziDedicatedLesson,
  });
  const items = conversationLockedBlocks(plan).map((steps, index) => ({
    steps,
    step: steps[0],
    index,
    stageId: (steps[0].lessonStageId ?? "usage") as LessonStageId,
    families: exerciseFamiliesFor(steps[0], steps[0].lessonStageId),
    score: plan.length - index,
    generated: Boolean(steps[0].generated),
  }));
  const remaining = [...items];
  const result: typeof items = [];
  // A abertura autorada fica na frente: o aluno (e o E2E) entram na tese da
  // lição, não num hanzi_build gerado. Sem isto, p1-primeiros-hanzi e l1
  // começavam no meio do plano.
  const openingAt = remaining.findIndex((item) => item.step.kind === "intro" && !item.generated);
  if (openingAt >= 0) {
    result.push(remaining.splice(openingAt, 1)[0]!);
  }
  while (remaining.length > 0) {
    let pick = remaining.findIndex((candidate) => {
      const asCandidate: PracticeCandidate = {
        step: candidate.step,
        stageId: candidate.stageId,
        families: candidate.families,
        score: candidate.score,
        generated: candidate.generated,
        sourceStepIndex: candidate.index,
      };
      const seq: PracticeCandidate[] = [...carryOver, ...result.flatMap((item) =>
        item.steps.map((step, offset) => ({
          step,
          stageId: (step.lessonStageId ?? item.stageId) as LessonStageId,
          families: exerciseFamiliesFor(step, step.lessonStageId),
          score: item.score,
          generated: Boolean(step.generated),
          sourceStepIndex: item.index + offset,
        }))
      )];
      return !wouldViolateVariety(seq, asCandidate);
    });
    if (pick < 0) {
      // Sem candidato "limpo": encaixa o próximo bloco no meio do resultado
      // se isso evitar 3× o mesmo kind. Empilhar o resto no fim criava
      // p1-primeiros-hanzi@M1: 3× hanzi_build (os 3 builders autorais sobravam).
      const stuck = remaining[0];
      const wouldMakeKindRun = (blocks: typeof result, run = 3) => {
        const kinds = blocks.flatMap((block) => block.steps.map((step) => step.kind));
        let streak = 1;
        for (let i = 1; i < kinds.length; i += 1) {
          streak = kinds[i] === kinds[i - 1] ? streak + 1 : 1;
          if (streak >= run) return true;
        }
        return false;
      };
      let insertAt = -1;
      const minIdx = result.length > 0 ? 1 : 0;
      for (let idx = minIdx; idx <= result.length; idx += 1) {
        const trial = [...result.slice(0, idx), stuck, ...result.slice(idx)];
        if (!wouldMakeKindRun(trial)) {
          insertAt = idx;
          break;
        }
      }
      if (insertAt >= 0) {
        remaining.shift();
        result.splice(insertAt, 0, stuck);
        continue;
      }
      pick = 0;
    }
    const [chosen] = remaining.splice(pick, 1);
    result.push(chosen);
  }
  return result.flatMap((item) => item.steps);
}

/**
 * Pedagogia V3 — reaplica o plano base com política de mastery pass:
 * kinds preferidos, scaffold, bônus cognitivos do piloto e viés dimensional.
 */
export function applyMasteryPassToPlan(
  plan: LessonRoundStep[],
  lesson: Lesson,
  pass: MasteryPass,
  context: LessonPracticePlanContext = {}
): LessonRoundStep[] {
  const useMastery = Boolean(lesson.masteryLoop || isMasteryPilotLesson(lesson.id));
  if (!useMastery) return plan;

  const dimensions = context.itemDimensionsByRef ?? {};
  const weakDim = weakestDimension(
    Object.values(dimensions).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0]
  );

  const scored = plan.map((step, index) => {
    let score = masteryKindPriority(step.kind, pass);
    const dim = dimensionForStepKind(step.kind);
    if (dim && dim === weakDim) score += 1.5;
    // PED-038: se meaning já está alto e production baixo, preferir produção.
    const sample = Object.values(dimensions)[0];
    if (sample && sample.meaning >= 0.75 && sample.production < 0.55 && isProductionOrTransferKind(step.kind)) {
      score += 2;
    }
    if (pass >= 3 && isProductionOrTransferKind(step.kind)) score += 1;
    if (pass <= 1 && isProductionOrTransferKind(step.kind)) score -= 1;
    return { step, index, score };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const budget = MASTERY_PASS_GRADED_BUDGET[pass];
  const reserved = keepMasteryPassSteps(
    scored.map(
      (item): ScoredBudgetItem<LessonRoundStep> => ({
        step: item.step,
        score: item.score,
        index: item.index,
      })
    ),
    { pass, min: budget.min, max: budget.max }
  );
  const kept: LessonRoundStep[] = reserved.map((step) => applyScaffoldToStep(step, pass));

  // Injeta bônus do piloto (exigência cognitiva distinta por pass).
  const bonuses = masteryBonusStepsFor(lesson.id, pass).map((step, bonusIndex) =>
    applyScaffoldToStep(
      {
        ...step,
        lessonStageId: pass >= 3 ? ("usage" as LessonStageId) : ("recognition" as LessonStageId),
        lessonStageQuestion: bonusIndex + 1,
        lessonStageQuestionCount: 1,
        generated: true,
        objective: step.objective ?? `Mastery pass ${pass}`,
      },
      pass
    )
  );

  let merged = [...kept];
  for (const bonus of bonuses) {
    if (merged.some((step) => stepSignature(step) === stepSignature(bonus))) continue;
    // Pass 1: no início; passes altas: perto do fim (produção/transferência).
    if (pass <= 2) merged = [bonus, ...merged];
    else merged = [...merged, bonus];
  }

  // V4.0 — piso cognitivo: M3 produção, M4 transferência. Conversa extra
  // não substitui o desafio do pass (conversation_scene não conta como piso).
  if (pass === 4 && !planHasFloorKind(merged, "transfer")) {
    const transferFallback =
      plan.find((step) => step.kind === "transfer_task") ??
      masteryBonusStepsFor(lesson.id, 4).find((step) => step.kind === "transfer_task");
    if (transferFallback) {
      merged.push(
        applyScaffoldToStep(
          {
            ...transferFallback,
            lessonStageId: "usage",
            lessonStageQuestion: 1,
            lessonStageQuestionCount: 1,
            generated: true,
          },
          pass
        )
      );
    }
  }
  if (pass === 3 && !planHasFloorKind(merged, "production")) {
    const productionFallback =
      plan.find((step) => isProductiveChallengeStep(step)) ??
      masteryBonusStepsFor(lesson.id, 3).find((step) => isProductiveChallengeStep(step));
    if (productionFallback) {
      merged.push(
        applyScaffoldToStep(
          {
            ...productionFallback,
            lessonStageId: "usage",
            lessonStageQuestion: 1,
            lessonStageQuestionCount: 1,
            generated: true,
          },
          pass
        )
      );
    }
  }

  // Recalcula índices de estágio.
  const stageCounts = new Map<LessonStageId, number>();
  const stageTotals = new Map<LessonStageId, number>();
  for (const step of merged) {
    const stageId = step.lessonStageId ?? "usage";
    stageTotals.set(stageId, (stageTotals.get(stageId) ?? 0) + 1);
  }
  const withStages = merged.map((step) => {
    const stageId = step.lessonStageId ?? "usage";
    const index = stageCounts.get(stageId) ?? 0;
    stageCounts.set(stageId, index + 1);
    return {
      ...step,
      masteryPass: pass,
      lessonStageQuestion: index + 1,
      lessonStageQuestionCount: stageTotals.get(stageId) ?? 1,
    };
  });
  // PED-030 — pós-processo de variedade sem quebrar o viés da pass.
  return balanceLessonPlan(withStages, {
    respectMasteryPass: pass,
    recentActivities: context.recentActivities,
    hanziDedicatedLesson: lesson.skill === "hanzi",
  });
}

export function resolveMasteryPassForContext(
  lesson: Lesson,
  context: LessonPracticePlanContext = {}
): MasteryPass | null {
  if (!(lesson.masteryLoop || isMasteryPilotLesson(lesson.id))) return null;
  if (context.masteryPass) return context.masteryPass;
  // Sem contexto de aluno (validators/auditoria silent): plano base da #167.
  // O player sempre passa masteryLevel explicitamente.
  if (context.masteryLevel == null && !context.recoveryPending) return null;
  return nextMasteryPass(context.masteryLevel ?? 0, { recoveryPending: context.recoveryPending });
}

export function lessonRoundStepsFor(lesson: Lesson, context: LessonPracticePlanContext = {}): LessonRoundStep[] {
  // Pedagogia V3.4 — Review Mastery so entra com pass/level explicito (player).
  // Validators silenciosos sem masteryLevel continuam no plano classico (imagens etc.).
  const reviewLevelRequested =
    (lesson.reviewMasteryMode || isReviewMasteryLesson(lesson.id)) &&
    (context.masteryPass != null || context.masteryLevel != null);
  if (reviewLevelRequested) {
    const level = (context.masteryPass ??
      Math.min(4, Math.max(1, (context.masteryLevel ?? 0) + 1))) as ReviewMasteryLevel;
    const reviewSteps = reviewMasteryStepsFor(lesson.id, level);
    if (reviewSteps.length > 0) {
      return reviewSteps.map((step, index) => ({
        ...step,
        lessonStageId: "consolidation" as const,
        lessonStageQuestion: index + 1,
        lessonStageQuestionCount: reviewSteps.length,
        masteryPass: level as MasteryPass,
      }));
    }
  }

  const base = buildLessonPracticePlan(lesson, context);
  const pass = resolveMasteryPassForContext(lesson, context);
  if (!pass) return base;
  return applyMasteryPassToPlan(base, lesson, pass, context);
}

export function lessonMasteryPassMeta(pass: MasteryPass): { pass: MasteryPass; label: string } {
  const labels = { 1: "Descoberta", 2: "Consolidação", 3: "Produção", 4: "Domínio" } as const;
  return { pass, label: labels[pass] };
}

export function lessonReviewMasteryMeta(level: ReviewMasteryLevel): { level: ReviewMasteryLevel; label: string } {
  return { level, label: REVIEW_MASTERY_LABELS[level] };
}

export interface JourneyModuleCoverageIssue {
  unitId: string;
  unitTitle: string;
  warnings: string[];
}

let journeyModuleCoverageAudited = false;

function moduleCoverageIssues(context: LessonPracticePlanContext = {}): JourneyModuleCoverageIssue[] {
  const coreReviewFocus = coreReviewFocusItems();
  const modules = new Map<string, FlatLesson[]>();
  for (const lesson of ALL_LESSONS) {
    const key = lesson.unitId;
    modules.set(key, [...(modules.get(key) ?? []), lesson]);
  }

  const issues: JourneyModuleCoverageIssue[] = [];
  for (const [unitId, lessons] of modules) {
    const focus = itemsFromLessons(lessons);
    const plan = lessons.flatMap((lesson) => buildLessonPracticePlan(lesson, { ...context, silent: true }));
    const firstLessonIndex = Math.min(...lessons.map(lessonOrderIndex).filter((index) => index >= 0));
    const warnings: string[] = [];
    const hasRelevantHanzi = focus.some(hasBuilderForFocusItem);
    const isInitialModule = lessons.some((lesson) => lessonPhaseOrder(lesson) <= 4);
    const canReviewOldPhrases = Number.isFinite(firstLessonIndex) && firstLessonIndex > 0;

    if (hasRelevantHanzi && !plan.some((step) => step.kind === "hanzi_build")) {
      warnings.push("hànzì relevante sem HanziBuilder no plano real");
    }
    if (isInitialModule && !plan.some(isPinyinPracticeStep)) {
      warnings.push("módulo inicial sem microtarefa de pinyin/tom");
    }
    if (canReviewOldPhrases && !plan.some((step) => stepUsesFocus(step, coreReviewFocus))) {
      warnings.push("sem revisão de frase antiga do núcleo");
    }
    if (warnings.length > 0) {
      issues.push({
        unitId,
        unitTitle: lessons[0]?.unitTitle ?? unitId,
        warnings,
      });
    }
  }
  return issues;
}

export function validateModulePracticeCoverage(
  context: LessonPracticePlanContext = {}
): JourneyModuleCoverageIssue[] {
  return moduleCoverageIssues(context);
}

export function auditJourneyModuleCoverageInDev(context: LessonPracticePlanContext = {}): JourneyModuleCoverageIssue[] {
  if (!isDevRuntime()) return [];
  const issues = moduleCoverageIssues(context);
  if (!journeyModuleCoverageAudited) {
    journeyModuleCoverageAudited = true;
    for (const issue of issues) {
      console.warn(`[Longyu] QA Jornada módulo ${issue.unitId} (${issue.unitTitle}): ${issue.warnings.join("; ")}`);
    }
  }
  return issues;
}

export function lessonRoundProgressForStep(
  steps: readonly LessonRoundStep[],
  stepIndex: number,
  totalStages = LESSON_STAGE_COUNT
): LessonRoundProgress {
  const fallbackStageIndex = Math.min(totalStages - 1, Math.max(0, Math.floor((stepIndex / Math.max(1, steps.length)) * totalStages)));
  const step = steps[stepIndex];
  const stageId = step?.lessonStageId ?? LESSON_STAGE_ORDER[fallbackStageIndex];
  const stageIndex = Math.max(0, LESSON_STAGE_ORDER.indexOf(stageId));
  return {
    stageId,
    stageIndex: stageIndex >= 0 ? stageIndex : fallbackStageIndex,
    questionIndex: step?.lessonStageQuestion ?? 1,
    questionCount: step?.lessonStageQuestionCount ?? 1,
  };
}

export function completedLessonStagesFromRoundStep(
  steps: readonly LessonRoundStep[],
  completedSteps: number,
  totalStages = LESSON_STAGE_COUNT
): number {
  if (completedSteps <= 0 || steps.length === 0) return 0;
  const completed = new Set<LessonStageId>();
  for (const stageId of LESSON_STAGE_ORDER) {
    const stageSteps = steps.filter((step) => step.lessonStageId === stageId);
    if (stageSteps.length === 0) continue;
    const lastIndex = Math.max(...stageSteps.map((step) => steps.indexOf(step)));
    if (lastIndex < completedSteps) completed.add(stageId);
  }
  return Math.min(totalStages, completed.size);
}

const STAGE_DETAILS: Record<
  LessonStageId,
  {
    name: string;
    objective: string;
    actionLabel: string;
    description: string;
    motor: LessonMotor;
    rewardQi: number;
  }
> = {
  intro: {
    name: "Conceito",
    objective: "Entender o tema da lição com explicação curta, exemplos e uma checagem simples.",
    actionLabel: "Entenda o tema",
    description: "Veja uma explicação curta, exemplo, áudio e uma pergunta simples.",
    motor: "som",
    rewardQi: 2,
  },
  recognition: {
    name: "Reconhecimento",
    objective: "Reconhecer o mesmo conteúdo por som, forma, pinyin ou significado.",
    actionLabel: "Reconheça",
    description: "Ouça, compare significado e escolha pinyin ou hànzì.",
    motor: "som",
    rewardQi: 2,
  },
  assembly: {
    name: "Montagem",
    objective: "Reconstruir o item com peças, lacunas ou ordem correta para tirar a memória do modo passivo.",
    actionLabel: "Monte",
    description: "Organize peças, sílabas ou blocos para reconstruir o item.",
    motor: "fala",
    rewardQi: 3,
  },
  usage: {
    name: "Aplicação",
    objective: "Usar o conteúdo em frase, diálogo ou situação nova sem depender só de reconhecimento.",
    actionLabel: "Use em contexto",
    description: "Aplique o item em frase, diálogo ou microcontexto.",
    motor: "fala",
    rewardQi: 3,
  },
  post_conversation: {
    name: "Pós-Conversa",
    objective: "Consolidar vocabulário, respostas e intenção da conversa que você acabou de completar.",
    actionLabel: "Fixe a conversa",
    description: "Tarefas curtas e adaptativas sobre o que acabou de ouvir e responder.",
    motor: "fala",
    rewardQi: 2,
  },
  consolidation: {
    name: "Revisão",
    objective: "Misturar o conteúdo da rodada com vocabulário anterior e reforçar pontos frágeis.",
    actionLabel: "Fixe com revisão",
    description: "Misture o item novo com conteúdo anterior e corrija erros.",
    motor: "revisao",
    rewardQi: 3,
  },
};

const STEP_KIND_LABELS: Record<StepKind, string> = {
  intro: "conceito curto",
  listen: "áudio + exemplo",
  tone: "tom",
  comprehend: "múltipla escolha",
  produce: "produção guiada",
  write: "escrita guiada",
  recognize: "reconhecimento visual",
  decompose: "peças do hànzì",
  flashcard: "cartão de memória",
  microread: "microleitura",
  match_pairs: "combinar pares",
  listen_select: "ouvir e escolher",
  sentence_build: "montar frase",
  translation_build: "montar tradução",
  fill_blank: "completar lacuna",
  dialogue_choice: "diálogo",
  conversation_scene: "cena de conversa",
  hanzi_evolution: "evolução visual",
  hanzi_build: "montar hànzì",
  tone_pair: "pares de tom",
  image_choice: "imagem e associação",
  compare_with_image: "comparar com imagem",
  audio_discrimination: "par mínimo",
  dictation: "ditado",
  odd_one_out: "qual não pertence",
  spot_error: "qual frase funciona",
  free_production: "produzir sem apoio",
  transfer_task: "transferir a estrutura",
  conversation_repair: "reparar a conversa",
  contextual_choice: "escolha situacional",
  audio_to_action: "áudio → ação",
  sentence_transform: "transformar frase",
  substitution_drill: "substituição",
  dialogue_completion: "completar diálogo",
  reverse_recall: "produção sem alternativas",
  map_direction: "mapa e direção",
  place_label: "ler placa urbana",
  address_build: "montar endereço",
  city_context: "cidade em contexto",
  sign_reading: "ler placa",
  menu_reading: "ler cardápio",
  price_task: "preço",
  route_sequence: "sequência de rota",
  schedule_reading: "ler horário",
};

function uniqueStepKinds(kinds: StepKind[]): StepKind[] {
  const seen = new Set<StepKind>();
  return kinds.filter((kind) => {
    if (seen.has(kind)) return false;
    seen.add(kind);
    return true;
  });
}

function taskMatchesStage(task: LessonTask, stageId: LessonStageId): boolean {
  const hints = STAGE_KIND_HINTS[stageId];
  return task.stepKinds.some((kind) => hints.includes(kind));
}

function stageStepKinds(lesson: Lesson, candidates: LessonTask[], stageId: LessonStageId): StepKind[] {
  const lessonKinds = new Set(lesson.steps.map((step) => step.kind));
  const hintedKinds = STAGE_KIND_HINTS[stageId].filter((kind) => lessonKinds.has(kind));
  const candidateKinds = candidates.filter((task) => taskMatchesStage(task, stageId)).flatMap((task) => task.stepKinds);
  const kinds = uniqueStepKinds([...hintedKinds, ...candidateKinds]);
  if (kinds.length > 0) return kinds;

  const allLessonKinds = uniqueStepKinds(lesson.steps.map((step) => step.kind));
  return allLessonKinds.length > 0 ? allLessonKinds : STAGE_KIND_HINTS[stageId];
}

function stageMotor(lesson: Lesson, candidates: LessonTask[], stageId: LessonStageId): LessonMotor {
  const match = candidates.find((task) => taskMatchesStage(task, stageId));
  if (match) return match.motor;
  if (stageId === "assembly" && lesson.skill === "hanzi") return "hanzi";
  if (stageId === "usage" && lesson.skill === "leitura") return "leitura";
  return STAGE_DETAILS[stageId].motor;
}

function authoredStageFor(lesson: Lesson, stageId: LessonStageId): LessonStage | undefined {
  return lesson.lessonStages?.find((stage) => stage.id === stageId);
}

export function lessonStagesFor(lesson: Lesson): LessonTask[] {
  const candidates = legacyTaskCandidatesFor(lesson);

  return LESSON_STAGE_ORDER.map((stageId) => {
    const authored = authoredStageFor(lesson, stageId);
    const detail = STAGE_DETAILS[stageId];
    return {
      stageId,
      id: `${lesson.id}:stage:${stageId}`,
      motor: authored?.motor ?? stageMotor(lesson, candidates, stageId),
      name: authored?.name ?? detail.name,
      objective: authored?.objective ?? detail.objective,
      description: authored?.description ?? detail.description,
      actionLabel: authored?.actionLabel ?? detail.actionLabel,
      rewardQi: authored?.rewardQi ?? detail.rewardQi,
      stepKinds: authored?.stepKinds?.length ? authored.stepKinds : stageStepKinds(lesson, candidates, stageId),
      exercises: authored?.exercises?.length
        ? authored.exercises
        : authored?.stepKinds?.length ? authored.stepKinds : stageStepKinds(lesson, candidates, stageId),
      reusesPreviousVocabulary: authored?.reusesPreviousVocabulary,
      introducesNewVocabulary: authored?.introducesNewVocabulary,
    };
  });
}

export function lessonTasksFor(lesson: Lesson): LessonTask[] {
  return lessonStagesFor(lesson);
}

export function lessonStageProgressCopy(progress: number, total = LESSON_STAGE_COUNT): string {
  const safeProgress = Math.max(0, Math.min(total, progress));
  if (safeProgress >= total) return `${total}/${total} etapas concluídas`;
  if (safeProgress >= total - 1) return "Falta fixar este conteúdo";
  if (safeProgress > 0) return `${safeProgress}/${total} etapas concluídas`;
  return "Continue para memorizar melhor";
}

export function lessonMotor(lesson: Pick<Lesson, "skill" | "isReview">): LessonMotor {
  if (lesson.isReview || lesson.skill === "sistema") return "revisao";
  return lesson.skill;
}

export function lessonMotorLabel(skill: Skill, isReview?: boolean): string {
  if (isReview || skill === "sistema") return "Revisão";
  if (skill === "som") return "Som";
  if (skill === "fala") return "Fala";
  if (skill === "hanzi") return "Hànzì";
  return "Leitura";
}

export function lessonDifficulty(lesson: Lesson): string {
  const graded = lesson.steps.filter(isGradedStep).length;
  if (lesson.premium) return "Pro";
  if (graded <= 3) return "Leve";
  if (graded <= 6) return "Média";
  return "Intensa";
}

export function estimateLessonMinutes(lesson: Lesson): number {
  if (lesson.estimatedMinutes) return lesson.estimatedMinutes;
  return Math.max(3, Math.min(9, Math.ceil(lesson.steps.length * 0.85)));
}

export function lessonDescription(lesson: FlatLesson): string {
  if (lesson.skill === "som") return `Nesta lição, você vai ouvir, comparar e reconhecer sons de ${lesson.title} com atenção aos tons.`;
  if (lesson.skill === "hanzi") return `Nesta lição, você vai observar, desmontar e reconhecer hànzì em contexto.`;
  if (lesson.skill === "leitura") return `Nesta lição, você vai ler blocos curtos com apoio de pinyin, áudio e sentido.`;
  if (lesson.isReview) return `Nesta revisão, você vai consolidar os pontos centrais de ${lesson.unitTitle}.`;
  return `Nesta lição, você vai ouvir, repetir e reconhecer ${lesson.title} em contexto.`;
}

export function taskProgressFromStep(completedSteps: number, totalSteps: number, taskCount: number): number {
  if (taskCount <= 0 || totalSteps <= 0) return 0;
  return Math.min(taskCount, Math.ceil((completedSteps / totalSteps) * taskCount));
}
