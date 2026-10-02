/**
 * RC2.2.22 — lint de PRODUTO (não ciência pedagógica, nunca mostrado ao aluno).
 *
 * 1. Complexidade de tela: LOW · GOOD · HIGH · OVERLOADED a partir de sinais
 *    contáveis (CTAs, parágrafos, chips, controles interativos, tamanho da
 *    instrução). Serve para achar telas que ainda têm "cards demais, chips
 *    demais, texto demais".
 * 2. Repetição ruim: mesma pergunta, mesma resposta, mesma forma, logo em
 *    seguida. Repetição boa (recuperação, espaçamento, transformação,
 *    contexto) passa: o mesmo alvo pode voltar se a ação cognitiva muda ou se
 *    há distância.
 */
export const COMPLEXITY_LEVELS = ["LOW", "GOOD", "HIGH", "OVERLOADED"] as const;
export type ComplexityLevel = (typeof COMPLEXITY_LEVELS)[number];

export interface ComplexityInputs {
  ctas: number;
  paragraphs: number;
  chips: number;
  interactiveControls: number;
  instructionChars: number;
}

/** Sessão guiada: exatamente UMA ação principal por tela. */
export const GUIDED_PRIMARY_CTA_LIMIT = 1;

export function complexityScore(input: ComplexityInputs): number {
  let score = 0;
  if (input.ctas > 2) score += 2;
  else if (input.ctas > GUIDED_PRIMARY_CTA_LIMIT) score += 1;
  if (input.paragraphs > 3) score += 2;
  else if (input.paragraphs > 2) score += 1;
  if (input.interactiveControls > 6) score += 2;
  else if (input.interactiveControls > 4) score += 1;
  if (input.instructionChars > 280) score += 2;
  else if (input.instructionChars > 160) score += 1;
  if (input.chips > 4) score += 1;
  return score;
}

export function complexityLevel(input: ComplexityInputs): ComplexityLevel {
  const score = complexityScore(input);
  if (score >= 4) return "OVERLOADED";
  if (score >= 2) return "HIGH";
  if (score === 0 && input.instructionChars < 40 && input.interactiveControls <= 1) return "LOW";
  return "GOOD";
}

type StepLike = Record<string, unknown> & { kind: string };

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** Sinais contáveis a partir do dado do passo (o player guiado tem 1 CTA principal). */
export function stepComplexityInputs(step: StepLike): ComplexityInputs {
  const options = Array.isArray(step.options) ? step.options.length : 0;
  const pairs = Array.isArray(step.pairs) ? step.pairs.length * 2 : 0;
  const pieces = Array.isArray(step.pieces) ? step.pieces.length : Array.isArray(step.tokens) ? step.tokens.length : 0;
  const interactiveControls = Math.max(options, pairs, pieces, 1);
  const instruction = text(step.dialoguePrompt) || text(step.prompt) || text(step.question) || `${text(step.title)} ${text(step.body)}`.trim();
  const body = text(step.body);
  const paragraphs = (body ? body.split(/\n\s*\n/).length : 0) + (text(step.explanation) ? 1 : 0);
  return { ctas: GUIDED_PRIMARY_CTA_LIMIT, paragraphs, chips: 0, interactiveControls, instructionChars: instruction.length };
}

// ── Repetição ──────────────────────────────────────────────────────────────

/** Família de tarefa (ação cognitiva), não o componente visual. */
export function taskFamily(kind: string): string {
  if (/^(intro|teach|explain)/.test(kind)) return "TEACH";
  if (/listen/.test(kind)) return "LISTEN";
  if (/tone/.test(kind)) return "TONE";
  if (/hanzi|build|sentence/.test(kind)) return "BUILD";
  if (/match/.test(kind)) return "MATCH";
  if (/produc|recall|speak|produce/.test(kind)) return "PRODUCE";
  if (/conversation|dialogue|contextual/.test(kind)) return "CONTEXT";
  return "RECOGNIZE";
}

/** O que o passo pergunta e o que ele espera (a "forma" da pergunta). */
export function stepSignature(step: StepLike): string {
  const prompt = text(step.dialoguePrompt) || text(step.prompt) || text(step.question) || text(step.situationPt) || text(step.pt) || text(step.hanzi) || text(step.text);
  const answer = text(step.correctAnswer) || text(step.answer) || text(step.targetHanzi);
  return `${taskFamily(step.kind)}|${prompt}|${answer}`;
}

/** Distância mínima entre a MESMA pergunta na mesma forma. */
export const MIN_SAME_QUESTION_GAP = 3;

export interface RepetitionFinding {
  first: number;
  second: number;
  signature: string;
}

/**
 * Repetição ruim = mesma família + mesma pergunta + mesma resposta a menos de
 * MIN_SAME_QUESTION_GAP passos. Passos de ensino (TEACH) não contam.
 */
export function badRepetitions(steps: readonly StepLike[]): RepetitionFinding[] {
  const findings: RepetitionFinding[] = [];
  const lastSeen = new Map<string, number>();
  steps.forEach((step, index) => {
    if (taskFamily(step.kind) === "TEACH") return;
    const signature = stepSignature(step);
    if (signature.endsWith("||")) return;
    const previous = lastSeen.get(signature);
    if (previous != null && index - previous < MIN_SAME_QUESTION_GAP) findings.push({ first: previous, second: index, signature });
    lastSeen.set(signature, index);
  });
  return findings;
}
