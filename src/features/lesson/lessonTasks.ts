import {
  ALL_LESSONS,
  FOUNDATION_LESSON_IDS,
  JOURNEY,
  type FlatLesson,
  type Lesson,
  type LessonStage,
  type LessonStageId,
  type LessonStep,
  type Skill,
  type StepKind,
} from "../../data/journey";
import { CHARACTERS, charById } from "../../data/characters";
import { CHUNKS, chunkById } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import {
  buildersForCharacter,
  builderPrerequisitesMet,
  selectHanziBuilderForStudent,
  type HanziBuilder,
  type HanziBuilderProgressMap,
} from "../../data/hanziBuilder";
import { numericPinyinToDiacritics, normalizePinyinBase, isNearDuplicatePinyinSet } from "../../lib/pinyin";
import {
  buildWeightedModuleReviewFocus,
  resolveModuleFocusItems,
  validateModuleReviewCoverage,
  type ModuleReviewCoverageIssue,
} from "../../lib/moduleReview";

export { validateModuleReviewCoverage, type ModuleReviewCoverageIssue };

export type LessonMotor = "som" | "fala" | "hanzi" | "leitura" | "revisao";

export const LESSON_STAGE_COUNT = 5;

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
  "hanzi_build",
  "tone_pair",
  "image_choice",
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
    stepKinds: ["write", "comprehend", "dialogue_choice", "match_pairs"],
    when: (steps) => hasAny(steps, ["write", "comprehend", "dialogue_choice", "match_pairs"]),
  },
  {
    id: "review",
    motor: "revisao",
    name: "Revisão rápida",
    description: "Feche a lição reforçando o que acabou de ganhar forma.",
    rewardQi: 3,
    stepKinds: ["write", "comprehend", "produce", "sentence_build", "translation_build", "fill_blank", "dialogue_choice"],
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

const LESSON_STAGE_ORDER: LessonStageId[] = ["intro", "recognition", "assembly", "usage", "consolidation"];

const STAGE_KIND_HINTS: Record<LessonStageId, StepKind[]> = {
  intro: ["intro", "flashcard", "listen", "hanzi_evolution", "decompose"],
  recognition: ["listen_select", "comprehend", "recognize", "tone", "match_pairs", "tone_pair", "image_choice"],
  assembly: ["produce", "sentence_build", "translation_build", "hanzi_build", "fill_blank", "decompose"],
  usage: ["dialogue_choice", "write", "fill_blank", "microread", "produce", "comprehend"],
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
    "hanzi_build",
    "tone_pair",
    "image_choice",
    "microread",
  ],
};

export interface LessonRoundStep extends LessonStep {
  lessonStageId?: LessonStageId;
  lessonStageQuestion?: number;
  lessonStageQuestionCount?: number;
  sourceStepIndex?: number;
  generated?: boolean;
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
}

export interface LessonPracticePlanContext {
  completedLessons?: string[];
  learnedChunks?: string[];
  learnedChars?: string[];
  recentErrors?: LessonPracticeRecentError[];
  /** Domínio do HanziBuilder por caractere: escolhe a variação certa (guia → desafio). */
  hanziBuilderProgress?: HanziBuilderProgressMap;
  srs?: Record<string, import("../../lib/srs").SRSItem>;
  silent?: boolean;
}

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
  hanzi_evolution: ["intro", "hanzi"],
  hanzi_build: ["hanzi", "assembly"],
  tone_pair: ["pinyin", "audio", "matching"],
  image_choice: ["recognition", "hanzi", "meaning", "audio"],
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

function hasBuilderForFocusItem(item: FocusItem): boolean {
  return [...cleanHanzi(item.hanzi)].some((glyph) => buildersForCharacter(glyph).length > 0);
}

function isHanziFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  return lesson.skill === "hanzi" || id.includes("char-") || id.includes("hanzi") || id.startsWith("p5-");
}

function isPinyinFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  return lesson.skill === "som" || id.includes("tons-") || id.includes("pinyin") || id.includes("tom");
}

function coreReviewFocusItems(): FocusItem[] {
  return CORE_REVIEW_REFS.map(focusFromRef).filter((item): item is FocusItem => Boolean(item));
}

function oldPhraseFocus(currentFocus: readonly FocusItem[]): FocusItem[] {
  const current = new Set(currentFocus.map((item) => cleanHanzi(item.hanzi)));
  return coreReviewFocusItems().filter((item) => !current.has(cleanHanzi(item.hanzi)));
}

function makeOldPhraseReuseStep(currentFocus: FocusItem[]): LessonStep | null {
  const oldItems = oldPhraseFocus(currentFocus);
  if (oldItems.length === 0) return null;
  const pool = [...currentFocus, ...oldItems];
  for (const item of oldItems) {
    const fill = makeFillBlankStep(item, pool);
    if (fill) return fill;
    const dialogue = makeDialogueChoiceStep(item, pool);
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
      stageTargets: { intro: 1, recognition: 1, assembly: maxBuilds, usage: 1, consolidation: Math.max(2, targetCount - maxBuilds - 3) },
      minHanziBuilds: Math.min(5, builds),
      maxHanziBuilds: maxBuilds,
      perCharBuildCap: 3,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
    };
  }

  if (lesson.isReview || (lesson.skill === "sistema" && lesson.title.toLocaleLowerCase("pt-BR").includes("revis"))) {
    const targetCount = Math.max(12, Math.min(20, Math.max(authoredCount, focus.length >= 8 ? 14 : 12)));
    // Revisão de módulo: pelo menos 2 builders quando há hànzì relevante.
    return {
      targetCount,
      stageTargets: { intro: 2, recognition: 3, assembly: 3, usage: 2, consolidation: targetCount - 10 },
      minHanziBuilds: relevantHanzi ? 2 : 0,
      maxHanziBuilds: relevantHanzi ? (lesson.skill === "hanzi" ? 3 : 2) : 0,
      perCharBuildCap: 2,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
    };
  }

  if (isFoundation || lesson.skill === "sistema") {
    const targetCount = Math.max(8, Math.min(12, Math.max(authoredCount, 10)));
    // Lições-conceito de fundação que não são de hànzì (mandarim/pinyin/tom) não
    // montam nada — evita composição solta numa aula puramente conceitual.
    const conceptNonHanzi = isFoundation && lesson.skill !== "hanzi";
    return {
      targetCount,
      stageTargets: { intro: 1, recognition: 2, assembly: 2, usage: 2, consolidation: targetCount - 7 },
      minHanziBuilds: 0,
      maxHanziBuilds: conceptNonHanzi ? 0 : relevantHanzi ? 1 : 0,
      perCharBuildCap: 2,
      maxPinyinTasks,
      needsPinyinTask: pinyinRich,
    };
  }

  const targetCount = Math.max(6, Math.min(10, Math.max(authoredCount, commonTarget)));
  const hanziLesson = isHanziFocusedLesson(lesson);
  // Lição de hànzì: 2–4 builders; lição comum: no máximo 1.
  const maxBuilds = relevantHanzi ? (hanziLesson ? 4 : 1) : 0;
  const minBuilds = relevantHanzi && hanziLesson ? 2 : 0;
  const pinyinCap = isPinyinFocusedLesson(lesson)
    ? maxPinyinTasksForLesson(lesson, pinyinRich)
    : Math.min(1, maxPinyinTasksForLesson(lesson, pinyinRich));
  return {
    targetCount,
    stageTargets: { intro: 1, recognition: 2, assembly: 2, usage: 1, consolidation: Math.max(1, targetCount - 6) },
    minHanziBuilds: minBuilds,
    maxHanziBuilds: maxBuilds,
    perCharBuildCap: 2,
    maxPinyinTasks: pinyinCap,
    needsPinyinTask: pinyinRich && (phaseOrder <= 4 || isPinyinFocusedLesson(lesson) || Boolean(lesson.isReview)),
  };
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

function optionMeanings(target: FocusItem, focus: FocusItem[]): string[] {
  return uniqueValues([
    target.meaningPt,
    ...focus.filter((item) => item.key !== target.key).map((item) => item.meaningPt),
    ...CHUNKS.filter((chunk) => cleanHanzi(chunk.hanzi) !== cleanHanzi(target.hanzi)).map((chunk) => chunk.meaningPt.replace(/\.$/, "")),
  ]).slice(0, 4);
}

function optionHanzi(target: FocusItem, focus: FocusItem[]): string[] {
  return uniqueValues([
    target.hanzi,
    ...focus.filter((item) => item.key !== target.key).map((item) => item.hanzi),
    ...CHUNKS.filter((chunk) => cleanHanzi(chunk.hanzi) !== cleanHanzi(target.hanzi)).map((chunk) => chunk.hanzi),
    ...CHARACTERS.filter((char) => cleanHanzi(char.hanzi) !== cleanHanzi(target.hanzi)).map((char) => char.hanzi),
  ]).slice(0, 4);
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
  return uniqueByPinyinBase([
    target.pinyin,
    ...focus.filter((item) => item.key !== target.key).map((item) => item.pinyin),
    ...CHUNKS.filter((chunk) => cleanHanzi(chunk.hanzi) !== cleanHanzi(target.hanzi)).map((chunk) => chunk.pinyin),
    ...CHARACTERS.filter((char) => cleanHanzi(char.hanzi) !== cleanHanzi(target.hanzi)).map((char) => char.pinyin),
  ]).slice(0, 4);
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
  return {
    kind: "dialogue_choice",
    title: "Escolha o pinyin",
    speaker: "Pinyin",
    dialoguePrompt: `Qual pinyin combina com ${item.hanzi}?`,
    sourceText: item.hanzi,
    sourcePinyin: item.pinyin,
    options,
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

function makeSentenceBuildStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const clean = cleanHanzi(item.hanzi);
  if (!CJK_ONLY_RE.test(clean)) return null;
  const parts = [...clean];
  if (parts.length < 2 || parts.length > 8) return null;
  const extras = focus
    .filter((candidate) => candidate.key !== item.key)
    .flatMap((candidate) => [...cleanHanzi(candidate.hanzi)])
    .filter(Boolean);
  const bank = uniqueValues([...parts, ...extras]).slice(0, Math.max(parts.length + 2, 4));
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

function makeAssemblyChoiceStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
  const options = optionHanzi(item, focus);
  if (options.length < 2) return null;
  return {
    kind: "dialogue_choice",
    title: "Monte a ideia",
    speaker: "Montagem",
    dialoguePrompt: `Qual peça representa: ${item.meaningPt}?`,
    options,
    correctAnswer: item.hanzi,
    explanation: `${item.hanzi} carrega a ideia de ${item.meaningPt}.`,
  };
}

function makeDialogueChoiceStep(item: FocusItem, focus: FocusItem[]): LessonStep | null {
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

function stepSignature(step: LessonStep): string {
  return [
    step.kind,
    step.title,
    step.text,
    step.hanzi,
    step.answer,
    step.audioText,
    step.correctAnswer,
    step.charId,
    step.chunkId,
    step.target?.join("|"),
    step.targetParts?.join("|"),
    step.pairs?.map((pair) => `${pair.left}=${pair.right}`).join("|"),
  ].filter(Boolean).join("::");
}

interface SupplementalStepOptions {
  phaseOrder?: number;
  reviewFocus?: FocusItem[];
  hanziBuilderProgress?: HanziBuilderProgressMap;
  seenGlyphs?: ReadonlySet<string>;
  ownFocusGlyphs?: ReadonlySet<string>;
  allowComposedFiller?: boolean;
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
  const push = (step: LessonStep | null) => {
    if (!step || result.length >= targetCount) return;
    if (result.some((candidate) => stepSignature(candidate) === stepSignature(step))) return;
    result.push(step);
  };

  if (stageId === "intro") {
    push(makeIntroListenStep(focus[0]));
    if (focus[1]) push(makeIntroListenStep(focus[1]));
    push(makeComprehendStep(focus[0], focus));
  } else if (stageId === "recognition") {
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
    for (const item of focus) {
      push(makeHanziBuilderStep(item, phaseOrder, builderProgress, builderSelection));
      push(makeSentenceBuildStep(item, focus));
      push(makeAssemblyChoiceStep(item, focus));
      if (result.length >= targetCount) break;
    }
  } else if (stageId === "usage") {
    for (const item of focus) {
      push(makeDialogueChoiceStep(item, focus));
      push(makeFillBlankStep(item, focus));
      if (result.length >= targetCount) break;
    }
    push(makeOldPhraseReuseStep(focus));
  } else {
    push(makeMatchPairsStep([...reviewFocus, ...focus]));
    push(makeTonePairStep([...reviewFocus, ...focus]));
    for (const item of [...reviewFocus, ...focus]) {
      push(makeComprehendStep(item, [...reviewFocus, ...focus]));
      push(makeHanziBuilderStep(item, phaseOrder, builderProgress, builderSelection));
      push(makeFillBlankStep(item, [...reviewFocus, ...focus]));
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

  for (const item of hanziFocus) {
    push(makeRecognizeStep(item));
    push(makeDecomposeStep(item));
    push(makeHanziBuilderStep(item, phaseOrder));
    push(makeToneMicroStep(item));
  }
  for (const item of phraseFocus) {
    push(makeComprehendStep(item, focus));
    push(makeFillBlankStep(item, focus));
    push(makeSentenceBuildStep(item, focus));
    push(makeDialogueChoiceStep(item, focus));
  }
  for (const item of reviewFocus.slice(0, 6)) {
    push(makeComprehendStep(item, [...reviewFocus, ...focus]));
    push(makeFillBlankStep(item, [...reviewFocus, ...focus]));
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
    step.slowAudioText,
    step.prompt,
    step.sourceText,
    step.sourcePinyin,
    step.sourceMeaning,
    step.correctAnswer,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    step.dialoguePrompt,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
    ...(step.lines ?? []).flatMap((line) => [line.hanzi, line.pinyin, line.pt]),
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
  const reviewBonus = stageId === "consolidation" || stepUsesFocus(step, reviewFocus) ? 12 : 0;
  const gradedBonus = isGradedStep(step) ? 6 : 0;
  const stageBonus = STAGE_KIND_HINTS[stageId].includes(step.kind) ? 4 : 0;
  return familyScore + authoredBonus + reviewBonus + gradedBonus + stageBonus;
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
  ownFocusGlyphs?: ReadonlySet<string>
): PracticeCandidate[] {
  const phaseOrder = lessonPhaseOrder(lesson);
  const allowComposedFiller = Boolean(lesson.isReview);
  const candidates: PracticeCandidate[] = [];
  for (const stageId of LESSON_STAGE_ORDER) {
    const target = Math.max(4, profile.stageTargets[stageId] * 3);
    const generated = supplementalStepsForStage(stageId, focus, target, { phaseOrder, reviewFocus, hanziBuilderProgress, seenGlyphs, ownFocusGlyphs, allowComposedFiller });
    for (const step of generated) {
      candidates.push({
        step,
        stageId,
        sourceStepIndex: -1,
        generated: true,
        families: exerciseFamiliesFor(step, stageId),
        score: candidateScore(lesson, step, stageId, true, reviewFocus),
      });
    }
  }
  return candidates;
}

function wouldMakeTriplet(sequence: readonly PracticeCandidate[], candidate: PracticeCandidate): boolean {
  const lastTwo = sequence.slice(-2);
  if (lastTwo.length < 2) return false;
  if (lastTwo.every((item) => item.step.kind === candidate.step.kind)) return true;
  return candidate.families.some((family) => lastTwo.every((item) => item.families.includes(family)));
}

function countKind(candidates: readonly PracticeCandidate[], kind: StepKind): number {
  return candidates.filter((candidate) => candidate.step.kind === kind).length;
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
    .filter((candidate) => !isPinyinPracticeStep(candidate.step) || pinyinTaskCount < profile.maxPinyinTasks)
    .sort((a, b) => b.score - a.score);
  return eligible.find((candidate) => !wouldMakeTriplet(selected, candidate)) ?? eligible[0];
}

function replaceLowestIfNeeded(
  selected: PracticeCandidate[],
  candidate: PracticeCandidate,
  profile: LessonPracticeProfile,
  usedSignatures: Set<string>
) {
  const signature = stepSignature(candidate.step);
  if (usedSignatures.has(signature)) return;
  if (candidate.step.kind === "hanzi_build" && countKind(selected, "hanzi_build") >= profile.maxHanziBuilds) return;
  if (!underPerCharCap(selected, candidate, profile)) return;
  if (isPinyinPracticeStep(candidate.step) && countPinyinTasks(selected) >= profile.maxPinyinTasks) return;

  if (selected.length < profile.targetCount) {
    selected.push(candidate);
    usedSignatures.add(signature);
    return;
  }

  const replaceIndex = selected
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.stageId === candidate.stageId || item.generated)
    .sort((a, b) => a.item.score - b.item.score)[0]?.index;
  if (replaceIndex === undefined) return;
  usedSignatures.delete(stepSignature(selected[replaceIndex].step));
  selected[replaceIndex] = candidate;
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
  usedSignatures: Set<string>
) {
  const ensure = (predicate: (candidate: PracticeCandidate) => boolean) => {
    if (selected.some(predicate)) return;
    const candidate = candidates
      .filter(predicate)
      .filter((item) => !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score)[0];
    if (candidate) replaceLowestIfNeeded(selected, candidate, profile, usedSignatures);
  };

  // Garante ao menos `count` candidatos que casam com o predicado (respeitando
  // os tetos por tipo dentro de replaceLowestIfNeeded).
  const ensureCount = (predicate: (candidate: PracticeCandidate) => boolean, count: number) => {
    const pool = candidates
      .filter(predicate)
      .filter((item) => !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score);
    for (const candidate of pool) {
      if (selected.filter(predicate).length >= count) break;
      replaceLowestIfNeeded(selected, candidate, profile, usedSignatures);
    }
  };

  const ensureFocus = (items: FocusItem[]) => {
    if (!items.length || selected.some((candidate) => stepUsesFocus(candidate.step, items))) return;
    const candidate = candidates
      .filter((item) => stepUsesFocus(item.step, items) && !usedSignatures.has(stepSignature(item.step)))
      .sort((a, b) => b.score - a.score)[0];
    if (candidate) replaceLowestIfNeeded(selected, candidate, profile, usedSignatures);
  };

  ensure((candidate) => candidate.stageId === "recognition" || candidate.families.includes("recognition"));
  ensure((candidate) => candidate.stageId === "assembly" || candidate.families.includes("assembly"));
  ensure((candidate) => candidate.stageId === "usage" || candidate.families.includes("usage"));
  ensure((candidate) => candidate.stageId === "consolidation" || candidate.families.includes("review"));
  if (profile.needsPinyinTask && profile.maxPinyinTasks > 0) ensure((candidate) => candidate.families.includes("pinyin"));
  // Mínimo de HanziBuilders da lição (hànzì: 2; revisão: 2; montagem: 4).
  const minBuilds = Math.max(profile.maxHanziBuilds > 0 ? 1 : 0, profile.minHanziBuilds);
  if (minBuilds > 0) ensureCount((candidate) => candidate.step.kind === "hanzi_build", minBuilds);
  if (reviewFocus.length > 0) {
    ensure((candidate) => stepUsesFocus(candidate.step, reviewFocus) || candidate.stageId === "consolidation");
    if (oldPhraseFocus(lessonFocus).length > 0) {
      ensure((candidate) => {
        const blob = cleanHanzi(stepTextBlob(candidate.step));
        return coreReviewFocusItems().some((item) => {
          const hanzi = cleanHanzi(item.hanzi);
          if (!hanzi || !blob.includes(hanzi)) return false;
          return !lessonFocus.some((focusItem) => cleanHanzi(focusItem.hanzi) === hanzi);
        });
      });
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
  if (selected.length <= profile.targetCount) return selected;
  const keep = new Set<number>();
  for (const stageId of LESSON_STAGE_ORDER) {
    const first = selected.findIndex((candidate) => candidate.stageId === stageId);
    if (first >= 0) keep.add(first);
  }
  const ranked = selected
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => {
      const aRequired = keep.has(a.index) ? 1 : 0;
      const bRequired = keep.has(b.index) ? 1 : 0;
      return bRequired - aRequired || b.candidate.score - a.candidate.score;
    })
    .slice(0, profile.targetCount)
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
    if (index < 0) index = 0;
    const [candidate] = remaining.splice(index, 1);
    result.push(candidate);
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

export function buildLessonPracticePlan(lesson: Lesson, context: LessonPracticePlanContext = {}): LessonRoundStep[] {
  if (lesson.steps.length === 0) return [];
  const focus = focusForPlanning(lesson, context);
  const reviewFocus = combinedReviewFocus(lesson, context);
  const errorFocus = recentErrorFocusItems(context.recentErrors);
  const profile = profileForLesson(lesson, focus);
  const seenGlyphs = seenGlyphsForPlanning(focus, reviewFocus, context);
  // Glifos que ESTA lição ensina (só o próprio foco, sem a revisão): composição
  // só é montada aqui se for do próprio conteúdo, ou em revisões.
  const ownFocusGlyphs = new Set<string>();
  for (const item of focus) for (const glyph of cleanHanzi(item.hanzi)) ownFocusGlyphs.add(glyph);
  const candidates = [
    ...authoredCandidatesFor(lesson, reviewFocus),
    ...generatedCandidatesFor(lesson, focus, reviewFocus, profile, context.hanziBuilderProgress, seenGlyphs, ownFocusGlyphs),
  ];
  const usedSignatures = new Set<string>();
  const selected: PracticeCandidate[] = [];

  for (const stageId of LESSON_STAGE_ORDER) {
    const target = Math.max(1, profile.stageTargets[stageId]);
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

  ensureCoverage(lesson, selected, candidates, profile, reviewFocus, focus, errorFocus, usedSignatures);
  const trimmed = trimToTarget(selected, profile);

  for (const gap of moduleReviewGapCandidates(lesson, focus, reviewFocus, trimmed)) {
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

  if (!context.silent) logPracticePlanInDev(lesson, plan, profile, reviewFocus);
  return plan;
}

export function lessonRoundStepsFor(lesson: Lesson, context: LessonPracticePlanContext = {}): LessonRoundStep[] {
  return buildLessonPracticePlan(lesson, context);
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
  hanzi_evolution: "evolução visual",
  hanzi_build: "montar hànzì",
  tone_pair: "pares de tom",
  image_choice: "imagem e associação",
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
