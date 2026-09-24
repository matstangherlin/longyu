/**
 * RC2.2.11 · D–F — o dragão dentro da aula de Cultura.
 *
 * Contrato de função pedagógica: cada fala do dragão numa aula de Cultura tem
 * UM papel, pela posição nos passos de ensino (`teachSteps` em
 * cultureLessons.ts) — e nenhum papel repete outro:
 *   orient → o que é e onde aparece (o "card" da aula: título + resumo)
 *   notice → como ler o sinal no contexto
 *   why    → por que isso importa
 *   story  → cena narrada (passos com personagem/cena, depois dos três acima)
 *
 * Não-duplicação: o dragão não repete o título do card, não repete outra fala
 * dele na mesma aula, e a explicação de uma questão que é cópia literal de
 * uma fala já dita vira um lembrete curto ("É o que o dragão mostrou em …")
 * em vez do mesmo parágrafo de novo. Isso roda em tempo de exibição: os
 * dados da aula (fonte de currículo) não mudam.
 */

import type { Lesson, LessonStep } from "../data/journey";

export type CultureDragonRole = "orient" | "notice" | "why" | "story";

export const CULTURE_DRAGON_ROLES_BY_POSITION: readonly CultureDragonRole[] = ["orient", "notice", "why"];

/** Estilo de voz (BN): curto, calmo, sem exclamação, até 3 frases por fala. */
export const CULTURE_DRAGON_STYLE = {
  maxCharsPerMessage: 260,
  maxSentencesPerMessage: 3,
  maxExclamations: 0,
} as const;

export function normalizeDragonText(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dragonMessages(step: Pick<LessonStep, "body">): string[] {
  return String(step.body ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isCultureDragonStep(step: LessonStep): boolean {
  return step.kind === "intro" && step.pedagogicalEvidence?.domain === "culture";
}

export function cultureDragonRole(introPosition: number): CultureDragonRole {
  return CULTURE_DRAGON_ROLES_BY_POSITION[introPosition] ?? "story";
}

export type CultureDragonLine = { stepIndex: number; role: CultureDragonRole; title: string; text: string };

export function cultureDragonLines(lesson: Pick<Lesson, "steps">): CultureDragonLine[] {
  const lines: CultureDragonLine[] = [];
  let position = 0;
  lesson.steps.forEach((step, stepIndex) => {
    if (!isCultureDragonStep(step)) return;
    const role = cultureDragonRole(position);
    position += 1;
    for (const text of dragonMessages(step)) lines.push({ stepIndex, role, title: String(step.title ?? ""), text });
  });
  return lines;
}

export type CultureDragonFinding =
  | { kind: "repeats_card_title"; stepIndex: number; text: string }
  | { kind: "repeats_own_line"; stepIndex: number; firstStepIndex: number; text: string }
  | { kind: "feedback_repeats_dragon"; stepIndex: number; dragonStepIndex: number; text: string }
  | { kind: "style"; stepIndex: number; text: string; reason: string };

function sentenceCount(text: string): number {
  return (text.match(/[.!?…](\s|$)/g) ?? []).length || 1;
}

/**
 * Achados de duplicação/estilo. `recallApplied` = a camada de exibição já
 * troca a explicação repetida por lembrete; então `feedback_repeats_dragon`
 * só é falha quando essa camada não está ligada.
 */
export function auditCultureDragon(lesson: Pick<Lesson, "steps">): CultureDragonFinding[] {
  const findings: CultureDragonFinding[] = [];
  const seen = new Map<string, number>();
  for (const line of cultureDragonLines(lesson)) {
    const n = normalizeDragonText(line.text);
    if (n && n === normalizeDragonText(line.title)) {
      findings.push({ kind: "repeats_card_title", stepIndex: line.stepIndex, text: line.text });
    }
    const first = seen.get(n);
    if (first != null) findings.push({ kind: "repeats_own_line", stepIndex: line.stepIndex, firstStepIndex: first, text: line.text });
    else seen.set(n, line.stepIndex);
    if (line.text.length > CULTURE_DRAGON_STYLE.maxCharsPerMessage) {
      findings.push({ kind: "style", stepIndex: line.stepIndex, text: line.text, reason: "long" });
    }
    if (sentenceCount(line.text) > CULTURE_DRAGON_STYLE.maxSentencesPerMessage) {
      findings.push({ kind: "style", stepIndex: line.stepIndex, text: line.text, reason: "sentences" });
    }
    if ((line.text.match(/!/g) ?? []).length > CULTURE_DRAGON_STYLE.maxExclamations) {
      findings.push({ kind: "style", stepIndex: line.stepIndex, text: line.text, reason: "exclamation" });
    }
  }
  lesson.steps.forEach((step, stepIndex) => {
    if (step.kind === "intro") return;
    const n = normalizeDragonText(step.explanation);
    const dragonStepIndex = n ? seen.get(n) : undefined;
    if (dragonStepIndex != null && dragonStepIndex < stepIndex) {
      findings.push({ kind: "feedback_repeats_dragon", stepIndex, dragonStepIndex, text: String(step.explanation) });
    }
  });
  return findings;
}

/**
 * Camada de exibição: a explicação que repete literalmente uma fala já dita
 * pelo dragão nesta aula vira um lembrete que aponta a fala (sem o parágrafo).
 */
export function cultureStepForDisplay(
  lesson: Pick<Lesson, "steps" | "lessonDomain">,
  index: number,
  recall: (dragonTitle: string) => string
): LessonStep {
  const step = lesson.steps[index];
  if (!step || lesson.lessonDomain !== "culture" || step.kind === "intro" || !step.explanation) return step;
  const n = normalizeDragonText(step.explanation);
  const line = cultureDragonLines(lesson).find((candidate) => candidate.stepIndex < index && normalizeDragonText(candidate.text) === n);
  if (!line) return step;
  // Identidade estável: o mesmo passo exibido não vira objeto novo a cada render.
  const explanation = recall(line.title);
  const cached = displayCache.get(step);
  if (cached && cached.explanation === explanation) return cached;
  const next = { ...step, explanation };
  displayCache.set(step, next);
  return next;
}

const displayCache = new WeakMap<LessonStep, LessonStep>();
