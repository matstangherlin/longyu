/**
 * Catálogo pedagógico de conceitos estruturais.
 *
 * A UI do Longyu não pode pressupor jargão gramatical (sujeito, verbo,
 * partícula…) antes de o curso ensinar esses conceitos. Cada conceito tem:
 *
 *   introducedAt  — lição que apresenta o conceito formalmente (etapa 4)
 *   practicedAt   — lição em que o aluno pratica o termo de novo (etapa 5)
 *   masteryRequiredFor — frames/superfícies que podem usar o termo técnico sozinho
 *   usedByFrames  — estruturas que dependem deste conceito
 *
 * Progressão pedagógica (ver sentenceStructureIntro.ts):
 *   1–3 lógica visual em p3-ordem-das-palavras (sem nomes técnicos)
 *   4   nomes em p3-nomes-da-frase (= introducedAt)
 *   5   termos técnicos nas atividades a partir de practicedAt
 *
 * Estágios de rótulo na interface:
 *   intuitive → antes de introducedAt   (quem · ação · coisa)
 *   paired    → entre intro e prática   (quem (sujeito) · ação (verbo))
 *   technical → depois de practicedAt   (sujeito · verbo · objeto)
 */
import { ALL_LESSONS } from "./journey";
import type { PatternSlot, PatternSlotRole } from "./productionTasks";
import {
  STRUCTURE_NAMES_LESSON_ID,
  STRUCTURE_TECHNICAL_LESSON_ID,
} from "./sentenceStructureIntro";

export type StructuralConceptId =
  | "subject"
  | "verb"
  | "object"
  | "particle"
  | "basic_word_order"
  | "question_ma"
  | "negation_bu"
  | "aspect_zai"
  | "aspect_le"
  | "location"
  | "time"
  | "quantity"
  | "classifier"
  | "polite";

export type ConceptLabelStage = "intuitive" | "paired" | "technical";

export interface StructuralConcept {
  id: StructuralConceptId;
  /** Nome técnico em pt-BR (após domínio). */
  technicalLabelPt: string;
  /** Linguagem intuitiva antes da intro formal. */
  intuitiveLabelPt: string;
  /** Lição que introduz o conceito com o termo técnico. */
  introducedAt: string;
  /** Lição em que o termo é praticado de novo (ainda com apoio intuitivo). */
  practicedAt: string;
  /** Frames que podem exigir o termo técnico sozinho depois da prática. */
  masteryRequiredFor: string[];
  /** Frames cuja estrutura depende deste conceito. */
  usedByFrames: string[];
}

/**
 * Catálogo curado. Índices de lição são resolvidos em runtime via ALL_LESSONS —
 * assim o validator falha se um id sumir da jornada.
 */
export const STRUCTURAL_CONCEPTS: StructuralConcept[] = [
  {
    id: "basic_word_order",
    technicalLabelPt: "ordem básica",
    intuitiveLabelPt: "ordem da frase",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: STRUCTURE_TECHNICAL_LESSON_ID,
    masteryRequiredFor: ["frame_woyao", "frame_woxianghe", "frame_woqu"],
    usedByFrames: [
      "frame_woyao",
      "frame_woxianghe",
      "frame_woxiangchi",
      "frame_woyaomai",
      "frame_woqu",
      "frame_woxihuan",
    ],
  },
  {
    id: "subject",
    technicalLabelPt: "sujeito",
    intuitiveLabelPt: "quem",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: STRUCTURE_TECHNICAL_LESSON_ID,
    masteryRequiredFor: ["frame_woyao", "frame_niyao", "frame_niyaoma"],
    usedByFrames: [
      "frame_woyao",
      "frame_woxianghe",
      "frame_niyao",
      "frame_niyaoma",
      "frame_wobuhe",
      "frame_wozai",
      "frame_wo_le",
      "frame_woqu",
      "frame_woxihuan",
      "frame_woyouge",
    ],
  },
  {
    id: "verb",
    technicalLabelPt: "verbo",
    intuitiveLabelPt: "ação",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: STRUCTURE_TECHNICAL_LESSON_ID,
    masteryRequiredFor: ["frame_woyao", "frame_woxianghe", "frame_woqu"],
    usedByFrames: [
      "frame_woyao",
      "frame_woxianghe",
      "frame_woxiangchi",
      "frame_woyaomai",
      "frame_niyao",
      "frame_niyaoma",
      "frame_wobuhe",
      "frame_wobuchi",
      "frame_wozai",
      "frame_woqu",
    ],
  },
  {
    id: "object",
    technicalLabelPt: "objeto",
    intuitiveLabelPt: "coisa",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: STRUCTURE_TECHNICAL_LESSON_ID,
    masteryRequiredFor: ["frame_woyao", "frame_woxianghe"],
    usedByFrames: [
      "frame_woyao",
      "frame_woxianghe",
      "frame_woxiangchi",
      "frame_woyaomai",
      "frame_niyao",
      "frame_niyaoma",
      "frame_wobuhe",
      "frame_wobuchi",
      "frame_woxihuan",
    ],
  },
  {
    id: "particle",
    technicalLabelPt: "partícula",
    intuitiveLabelPt: "marca",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: "p5-kou-ma-pergunta",
    masteryRequiredFor: ["frame_niyaoma", "frame_wo_le", "frame_wozai"],
    usedByFrames: ["frame_niyaoma", "frame_wozai", "frame_wo_le", "frame_zainali"],
  },
  {
    id: "question_ma",
    technicalLabelPt: "pergunta com 吗",
    intuitiveLabelPt: "pergunta",
    introducedAt: STRUCTURE_NAMES_LESSON_ID,
    practicedAt: "p5-kou-ma-pergunta",
    masteryRequiredFor: ["frame_niyaoma"],
    usedByFrames: ["frame_niyaoma"],
  },
  {
    id: "negation_bu",
    technicalLabelPt: "negação com 不",
    intuitiveLabelPt: "não",
    introducedAt: "p4-char-bu",
    practicedAt: "l14-frase-minima",
    masteryRequiredFor: ["frame_wobuhe", "frame_wobuchi"],
    usedByFrames: ["frame_wobuhe", "frame_wobuchi"],
  },
  {
    id: "aspect_zai",
    technicalLabelPt: "aspecto (em progresso)",
    intuitiveLabelPt: "agora",
    introducedAt: "l11-falo-pouco",
    practicedAt: "l12",
    masteryRequiredFor: ["frame_wozai"],
    usedByFrames: ["frame_wozai"],
  },
  {
    id: "aspect_le",
    technicalLabelPt: "aspecto (mudança)",
    intuitiveLabelPt: "mudança",
    introducedAt: "l26",
    practicedAt: "p6-direcoes",
    masteryRequiredFor: ["frame_wo_le"],
    usedByFrames: ["frame_wo_le"],
  },
  {
    id: "location",
    technicalLabelPt: "localização",
    intuitiveLabelPt: "lugar",
    introducedAt: "p6-cidade-lugares",
    practicedAt: "p6-direcoes",
    masteryRequiredFor: ["frame_zainali", "frame_qingwenzainali"],
    usedByFrames: ["frame_zainali", "frame_qingwenzainali", "frame_woqu"],
  },
  {
    id: "time",
    technicalLabelPt: "tempo",
    intuitiveLabelPt: "quando",
    introducedAt: "p6-clima",
    practicedAt: "p6-direcoes",
    masteryRequiredFor: ["frame_woqu", "frame_huijia_action"],
    usedByFrames: ["frame_woqu", "frame_huijia_action", "frame_woyaomai"],
  },
  {
    id: "quantity",
    technicalLabelPt: "quantidade",
    intuitiveLabelPt: "quanto",
    introducedAt: "l22",
    practicedAt: "l23",
    masteryRequiredFor: ["frame_woyouge"],
    usedByFrames: ["frame_woyouge", "frame_duoshaoqian"],
  },
  {
    id: "classifier",
    technicalLabelPt: "classificador",
    intuitiveLabelPt: "medida",
    introducedAt: "l22",
    practicedAt: "l23",
    masteryRequiredFor: ["frame_woyouge"],
    usedByFrames: ["frame_woyouge"],
  },
  {
    id: "polite",
    technicalLabelPt: "cortesia",
    intuitiveLabelPt: "educado",
    introducedAt: "p1-qingwen-cortesia",
    practicedAt: "p6-cidade-lugares",
    masteryRequiredFor: ["frame_qingwenzainali"],
    usedByFrames: ["frame_qingwenzainali"],
  },
];

const conceptById = new Map(STRUCTURAL_CONCEPTS.map((concept) => [concept.id, concept]));

let lessonIndexCache: Map<string, number> | null = null;
function lessonIndex(lessonId: string | undefined): number {
  if (!lessonId) return -1;
  if (!lessonIndexCache) {
    lessonIndexCache = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));
  }
  return lessonIndexCache.get(lessonId) ?? -1;
}

export function structuralConceptById(id: StructuralConceptId): StructuralConcept | undefined {
  return conceptById.get(id);
}

/** Estágio do rótulo para um conceito nesta lição (ou antes de qualquer intro). */
export function conceptLabelStage(
  conceptId: StructuralConceptId,
  lessonId: string | undefined
): ConceptLabelStage {
  const concept = conceptById.get(conceptId);
  if (!concept) return "intuitive";
  const current = lessonIndex(lessonId);
  const introduced = lessonIndex(concept.introducedAt);
  const practiced = lessonIndex(concept.practicedAt);
  if (current < 0 || introduced < 0) return "intuitive";
  if (current < introduced) return "intuitive";
  // practicedAt pode ser uma lição ANTERIOR na jornada (ex.: 吗 praticada em
  // p3-ordem antes da intro formal em p5). Nesse caso, paired até a intro
  // “ganhar” e technical só depois do máximo(intro, practice).
  const masteryFrom = Math.max(introduced, practiced);
  if (current <= masteryFrom) return "paired";
  return "technical";
}

export function formatConceptLabel(
  conceptId: StructuralConceptId,
  lessonId: string | undefined
): string {
  const concept = conceptById.get(conceptId);
  if (!concept) return "peça";
  const stage = conceptLabelStage(conceptId, lessonId);
  if (stage === "intuitive") return concept.intuitiveLabelPt;
  if (stage === "paired") return `${concept.intuitiveLabelPt} (${concept.technicalLabelPt})`;
  return concept.technicalLabelPt;
}

/** Papel de slot → conceito estrutural padrão. */
export const SLOT_ROLE_CONCEPT: Record<PatternSlotRole, StructuralConceptId> = {
  subject: "subject",
  verb: "verb",
  object: "object",
  time: "time",
  place: "location",
  quantity: "quantity",
  classifier: "classifier",
  particle: "particle",
  polite: "polite",
  negation: "negation_bu",
  other: "object",
};

/**
 * Partícula é ambígua (吗 / 在 / 了). Desambigua pelo frame ou pelo padrão.
 */
export function conceptForSlot(
  slot: PatternSlot,
  context: { frameId?: string; patternPt?: string } = {}
): StructuralConceptId {
  if (slot.role === "particle") {
    const frameId = context.frameId ?? "";
    const pattern = context.patternPt ?? "";
    if (frameId.includes("niyaoma") || /吗/.test(pattern)) return "question_ma";
    if (frameId.includes("wozai") || /我在/.test(pattern)) return "aspect_zai";
    if (frameId.includes("wo_le") || /了/.test(pattern)) return "aspect_le";
    if (frameId.includes("zainali") || /在哪里/.test(pattern)) return "location";
    return "particle";
  }
  if (slot.role === "negation") return "negation_bu";
  return SLOT_ROLE_CONCEPT[slot.role] ?? "object";
}

/** Rótulo pronto para a UI do scaffold. */
export function resolveSlotLabel(
  slot: PatternSlot,
  context: { lessonId?: string; frameId?: string; patternPt?: string; hole?: boolean } = {}
): string {
  const conceptId = conceptForSlot(slot, context);
  const label = formatConceptLabel(conceptId, context.lessonId);
  if (slot.hole || context.hole) return `___ (${label})`;
  return label;
}

/** Conceitos que um frame assume na UI (todos os papéis do scaffold). */
export function conceptsAssumedByFrame(
  frameId: string,
  slots: readonly PatternSlot[],
  patternPt?: string
): StructuralConceptId[] {
  const ids = new Set<StructuralConceptId>();
  for (const slot of slots) {
    ids.add(conceptForSlot(slot, { frameId, patternPt }));
  }
  // Ordem básica entra sempre que há sujeito+verbo.
  if (slots.some((slot) => slot.role === "subject") && slots.some((slot) => slot.role === "verb")) {
    ids.add("basic_word_order");
  }
  return [...ids];
}

/**
 * A UI pode mostrar o termo técnico sozinho neste frame/lição?
 * Se o frame está em masteryRequiredFor e o estágio ainda não é technical,
 * a resposta é não — use paired/intuitive.
 */
export function canUseTechnicalLabelAlone(
  conceptId: StructuralConceptId,
  lessonId: string | undefined,
  frameId?: string
): boolean {
  if (conceptLabelStage(conceptId, lessonId) !== "technical") return false;
  const concept = conceptById.get(conceptId);
  if (!concept) return false;
  if (!frameId) return true;
  return concept.masteryRequiredFor.includes(frameId) || concept.usedByFrames.includes(frameId);
}

/** Termos tecnicos que NAO podem aparecer como pressuposto antes da intro. */
export const TECHNICAL_TERM_PATTERNS: Array<{ conceptId: StructuralConceptId; pattern: RegExp }> = [
  { conceptId: "subject", pattern: /\bsujeito\b/i },
  { conceptId: "verb", pattern: /\bverbo\b/i },
  { conceptId: "object", pattern: /\bobjeto\b/i },
  { conceptId: "particle", pattern: /\bpart[ií]cula\b/i },
  { conceptId: "basic_word_order", pattern: /\b(SVO|ordem b[aá]sica)\b/i },
  { conceptId: "question_ma", pattern: /\bpergunta com\s*吗\b/i },
  { conceptId: "negation_bu", pattern: /\bnega[cç][aã]o\b/i },
  { conceptId: "aspect_zai", pattern: /\baspecto\b/i },
  { conceptId: "aspect_le", pattern: /\baspecto\b/i },
  { conceptId: "location", pattern: /\blocaliza[cç][aã]o\b/i },
  { conceptId: "classifier", pattern: /\bclassificador\b/i },
];
