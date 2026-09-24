/**
 * RC2.2.11 · G–J — Cultura → Jornada: reaparecimento espaçado.
 *
 * Nada de agendador novo. Usa o que já existe:
 * - `cultureMemoryById` + `dueCultureMemoryTargets` (espaçamento da Cultura);
 * - `buildCultureReviewSession` (as mesmas perguntas da Revisão de Cultura);
 * - `cultureCompletedIds` (ensinar antes de testar: só item já concluído);
 * - `cultureKnowledgeById` (o acerto vira "practiced" com fonte "journey").
 *
 * Regras:
 * - no máximo UM cartão de lembrança por vez na Jornada, na fronteira do aluno
 *   (depois da última lição de mandarim concluída);
 * - só itens de cultura que o aluno JÁ concluiu (teach-before-test);
 * - sem poluição lexical: a pergunta não pode trazer Hànzì que a aula daquele
 *   item não ensinou (a pergunta é a da própria revisão de Cultura);
 * - ignorado por "Agora não" nesta sessão → não volta até a próxima sessão.
 */

import type { CultureMemoryRecord } from "../data/cultureQuest";
import { buildCultureReviewSession, type CultureReviewTask } from "./cultureReview";

export type CultureJourneyRecall = {
  task: CultureReviewTask;
  /** Lição de mandarim depois da qual o cartão aparece (fronteira). */
  anchorLessonId: string;
};

export function planCultureJourneyRecall(input: {
  cultureMemoryById: Record<string, CultureMemoryRecord>;
  cultureCompletedIds: readonly string[];
  /** Lições de mandarim concluídas em ordem da Jornada. */
  completedJourneyLessonIds: readonly string[];
  dismissedTargetIds?: ReadonlySet<string>;
  /**
   * Hànzì que o aluno já viu (aulas de mandarim concluídas + aulas de Cultura
   * concluídas). Pergunta com Hànzì fora daqui é pulada: sem poluição lexical.
   */
  knownHanzi?: ReadonlySet<string>;
  now?: number;
}): CultureJourneyRecall | null {
  const anchorLessonId = input.completedJourneyLessonIds[input.completedJourneyLessonIds.length - 1];
  if (!anchorLessonId) return null;
  const taught = new Set(input.cultureCompletedIds);
  const eligible: Record<string, CultureMemoryRecord> = {};
  for (const [id, row] of Object.entries(input.cultureMemoryById ?? {})) {
    if (!taught.has(row.cultureItemId)) continue;
    if (input.dismissedTargetIds?.has(row.targetId)) continue;
    eligible[id] = row;
  }
  const tasks = buildCultureReviewSession(eligible, input.now ?? Date.now(), 7);
  const task = tasks.find((candidate) => !input.knownHanzi || unknownHanziIn(candidate, input.knownHanzi).length === 0);
  if (!task) return null;
  return { task, anchorLessonId };
}

const CJK_CHAR_RE = /[\u3400-\u9fff\uf900-\ufaff]/gu;

export function hanziIn(value: unknown): string[] {
  return Array.from(new Set(JSON.stringify(value ?? "").match(CJK_CHAR_RE) ?? []));
}

/** Hànzì da pergunta (enunciado, opções, feedback) que o aluno ainda não viu. */
export function unknownHanziIn(task: CultureReviewTask, known: ReadonlySet<string>): string[] {
  return hanziIn(task.step).filter((ch) => !known.has(ch));
}

const DISMISS_KEY = "longyu:culture-recall-dismissed:v1";

export function readDismissedCultureRecall(): Set<string> {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(DISMISS_KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function dismissCultureRecall(targetId: string): void {
  try {
    const next = readDismissedCultureRecall();
    next.add(targetId);
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
  } catch {
    // sem storage: o cartão pode voltar na próxima renderização desta sessão
  }
}
