/**
 * V3.9 · VAR-015/016/017 — Memória de variedade entre modos.
 *
 * O controle de repetição do planner (`wouldViolateVariety`) só enxerga a
 * sequência do plano ATUAL. Cada plano passa isolado e, mesmo assim, o aluno
 * vê Hànzì → Hànzì → Hànzì, porque a sequência real atravessa modos:
 *
 *     lição (…, hanzi_build) → revisão (hanzi) → próxima lição (hanzi_build)
 *
 * Este módulo guarda o que o aluno acabou de fazer, independentemente do modo,
 * para que o próximo plano comece já sabendo o que veio antes.
 */

/** Modo de onde veio a atividade — a repetição percebida cruza todos. */
export type ActivityMode = "journey" | "mastery" | "review" | "practice";

export interface ActivityMemoryEntry {
  at: number;
  mode: ActivityMode;
  stepKind: string;
  /** Família cognitiva (hanzi, listening, conversation…). */
  cognitiveFamily: string;
  /** Alvo lexical avaliado (chunk/palavra), normalizado. */
  lexicalTarget?: string;
  /** Hànzì específico praticado — base do VAR-017. */
  hanziTarget?: string;
  /** Intenção da conversa, quando aplicável. */
  conversationIntent?: string;
  /**
   * Preenchido quando a repetição é DELIBERADA (remediação de erro). Distingue
   * reforço intencional de repetição acidental (VAR-017).
   */
  recoveryReason?: string;
}

/** Quantas atividades o histórico guarda. Suficiente para janelas de 2–5. */
export const ACTIVITY_MEMORY_LIMIT = 40;

/** Depois de uma atividade Hànzì pesada, evitar a família nas próximas N. */
export const HANZI_COOLDOWN_ACTIVITIES = 2;

/** Janela curta em que o MESMO hànzì não deve reaparecer sem motivo. */
export const SAME_HANZI_WINDOW = 6;

const HANZI_FAMILY_KINDS = new Set([
  "hanzi_build",
  "decompose",
  "hanzi_evolution",
  "recognize",
]);

export function isHanziFamilyStep(stepKind: string, cognitiveFamily?: string): boolean {
  return cognitiveFamily === "hanzi" || HANZI_FAMILY_KINDS.has(stepKind);
}

/** Acrescenta ao histórico mantendo o mais recente primeiro e o teto. */
export function rememberActivity(
  history: readonly ActivityMemoryEntry[],
  entry: ActivityMemoryEntry
): ActivityMemoryEntry[] {
  return [entry, ...history].slice(0, ACTIVITY_MEMORY_LIMIT);
}

/**
 * VAR-016 — a família Hànzì está em descanso?
 *
 * Verdadeiro quando alguma das últimas `HANZI_COOLDOWN_ACTIVITIES` atividades
 * avaliadas foi da família Hànzì. Lições dedicadas a Hànzì são exceção e devem
 * ignorar este sinal (ver `hanziCooldownActive` no planner).
 */
export function hanziCooldownActive(
  history: readonly ActivityMemoryEntry[],
  windowSize = HANZI_COOLDOWN_ACTIVITIES
): boolean {
  return history
    .slice(0, windowSize)
    .some((entry) => isHanziFamilyStep(entry.stepKind, entry.cognitiveFamily));
}

/**
 * VAR-017 — o mesmo hànzì reapareceu numa janela curta sem ser recuperação?
 * Repetição por erro é legítima e vem rotulada com `recoveryReason`.
 */
export function recentlyPracticedHanzi(
  history: readonly ActivityMemoryEntry[],
  hanzi: string | undefined,
  windowSize = SAME_HANZI_WINDOW
): boolean {
  if (!hanzi) return false;
  return history
    .slice(0, windowSize)
    .some((entry) => entry.hanziTarget === hanzi && !entry.recoveryReason);
}

/** Famílias das últimas atividades, mais recente primeiro. */
export function recentFamilies(
  history: readonly ActivityMemoryEntry[],
  windowSize = 5
): string[] {
  return history.slice(0, windowSize).map((entry) => entry.cognitiveFamily);
}
