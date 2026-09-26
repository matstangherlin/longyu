/**
 * RC2.2.17 · AX–DH — camada de apresentação guiada sobre o LessonPlayer.
 *
 * Não é outro motor: as 134 lições, os StepKinds, o SRS, os erros, as
 * transferências tonais, a cultura, as cenas, a revisão e o domínio seguem
 * iguais. Esta camada só decide apresentação: quanto o Dragão guia, em que
 * fase pedagógica cada passo está (PREPARE → NOTICE → TRY → FEEDBACK → USE →
 * RECAP) e qual frase curta abre a lição.
 *
 * Tudo é derivado de dados (posição na Jornada, papel curricular, domínio já
 * conquistado, tipo do passo) — nada de 134 ifs.
 */
import type { CurriculumRole } from "../data/curriculumRole";

export type GuidanceLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";
export type GuidedPhase = "PREPARE" | "NOTICE" | "TRY" | "FEEDBACK" | "USE" | "RECAP";

/** Primeiras ~20 lições: guia alto (retenção inicial). */
export const HIGH_GUIDANCE_LESSONS = 20;
/** Até aqui, guia médio; depois, baixo (mais situação e produção). */
export const MEDIUM_GUIDANCE_LESSONS = 60;

export interface GuidanceInput {
  /** Posição 0-based da lição na Jornada. */
  position: number;
  curriculumRole?: CurriculumRole;
  isReview?: boolean;
  /** Superfície de avaliação: Placement, desafio de fase/módulo, transferência pontuada. */
  assessment?: boolean;
  /** Nível de domínio já conquistado nesta lição (0–4). */
  priorMastery?: number;
}

const ORDER: readonly GuidanceLevel[] = ["HIGH", "MEDIUM", "LOW", "NONE"];

function lower(level: GuidanceLevel): GuidanceLevel {
  const index = ORDER.indexOf(level);
  return ORDER[Math.min(ORDER.length - 2, index + 1)] ?? level;
}

/**
 * RC2.2.17 · DE–DI — o guia DESAPARECE com o tempo e nunca entra em prova.
 * Revisão fica em LOW (feedback claro + próxima ação, sem tutorial). Imersão
 * fica em LOW (natural, não aula expositiva).
 */
export function guidanceLevelForLesson(input: GuidanceInput): GuidanceLevel {
  if (input.assessment) return "NONE";
  if (input.isReview || input.curriculumRole === "review") return "LOW";
  if (input.curriculumRole === "immersion") return "LOW";
  let level: GuidanceLevel =
    input.position < HIGH_GUIDANCE_LESSONS ? "HIGH" : input.position < MEDIUM_GUIDANCE_LESSONS ? "MEDIUM" : "LOW";
  // Quem já passou por esta lição (passadas 2+) recebe menos andaime.
  if ((input.priorMastery ?? 0) >= 2) level = lower(level);
  return level;
}

/** O Dragão abre a lição (PREPARE) só com guia alto ou médio. */
export function showsPrepareLine(level: GuidanceLevel): boolean {
  return level === "HIGH" || level === "MEDIUM";
}

const NOTICE_KINDS = new Set(["listen", "flashcard", "teach", "hanzi_intro", "tone_intro", "pinyin_intro", "decompose", "compare_with_image"]);
const USE_KINDS = new Set([
  "conversation_scene",
  "dialogue_choice",
  "dialogue_completion",
  "contextual_choice",
  "free_production",
  "produce",
  "reverse_recall",
  "sentence_transform",
  "tone_transfer",
  "audio_to_action",
]);
const RECAP_KINDS = new Set(["recap", "summary", "lesson_recap"]);

/** Fase guiada de um passo, pelo tipo (dado), sem tocar no passo. */
export function guidedPhaseForStep(kind: string, index: number): GuidedPhase {
  if (index === 0 && kind === "intro") return "PREPARE";
  if (kind === "intro" || NOTICE_KINDS.has(kind)) return "NOTICE";
  if (RECAP_KINDS.has(kind)) return "RECAP";
  if (USE_KINDS.has(kind)) return "USE";
  return "TRY";
}

/**
 * Sequência de fases do plano. FEEDBACK acontece dentro de cada TRY (resposta
 * imediata e curta); RECAP é a tela de vitória da lição.
 */
export function guidedPhasesForPlan(kinds: readonly string[]): GuidedPhase[] {
  return kinds.map((kind, index) => guidedPhaseForStep(kind, index));
}

/**
 * RC2.2.17 · AV — a lição que ensina 你好 (l2 · "Olá") sabe que o aluno viu 你好 no Teste guiado: em vez
 * de reensinar do zero, o Dragão faz a ponte. Os alvos de conhecimento e a
 * avaliação continuam TODOS na lição (sem domínio grátis).
 */
export const GUIDED_TRY_LESSON_IDS: ReadonlySet<string> = new Set(["l2"]);

export function guidedTryBridgeApplies(lessonId: string, hasGuidedTryExposure: boolean): boolean {
  return hasGuidedTryExposure && GUIDED_TRY_LESSON_IDS.has(lessonId);
}

/** Limite de texto da fala do Dragão (uma frase curta, não parágrafo). */
export const GUIDE_LINE_MAX_CHARS = 140;
