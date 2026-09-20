/**
 * RC2.2.6 — autoridade única de readiness dos marcos culturais.
 *
 * Journey UI, deep link, ponteiro de lição atual e QA leem ESTA função. Se
 * houvesse duas leituras, o card ficaria trancado e a URL direta passaria — que
 * é exatamente o buraco que esta camada existe para fechar.
 *
 * Progresso canônico apenas: `cultureMasteryById`, `cultureCompletedIds` e
 * `cultureSeals`. `AUX_NODE_PROGRESS_LOCAL_ONLY` (journeyNodeProgress.ts) jamais
 * entra aqui: é estado local-only e não pode decidir currículo obrigatório.
 */

import { ALL_LESSONS } from "../data/journey";
import {
  CULTURE_PROGRESSION_GATES,
  cultureProgressionGateBeforeTopic,
  requiredCultureItemIdsForGate,
  type CultureProgressionGate,
} from "../data/cultureProgressionGates";
import type { CultureMasteryRecord } from "../data/cultureQuest";

export type CultureGateStatus =
  /** Selo na mão (ou concluído agora) — o tópico seguinte abre. */
  | "unlocked"
  /** Faltam requisitos culturais. */
  | "locked"
  /** Usuário já estava além deste ponto antes do marco existir. Nunca regride. */
  | "legacy_passed";

export type CultureProgressionGateEvaluation = {
  gate: CultureProgressionGate;
  ready: boolean;
  status: CultureGateStatus;
  completed: number;
  total: number;
  completedItemIds: readonly string[];
  missingItemIds: readonly string[];
  /** Próximo CultureItem a fazer — o CTA abre exatamente este, nunca o Hub genérico. */
  nextItemId?: string;
  reasonPt: string;
  reasonEn: string;
};

export type CultureProgressionProgress = {
  cultureCompletedIds?: readonly string[];
  cultureMasteryById?: Record<string, CultureMasteryRecord | undefined>;
  cultureSeals?: readonly string[];
  /** Lições de Mandarim concluídas — só para a política de grandfather. */
  completedLessons?: readonly string[];
};

/**
 * Um CultureItem conta como feito com UMA estrela ou com a marca de conclusão.
 * Não exigimos 3 estrelas nem pontuação perfeita: o marco é preparo, não pedágio.
 *
 * Aceitar `cultureCompletedIds` além do mastery é o que faz o Hub e a Jornada
 * serem a mesma realidade — concluir por qualquer um dos dois caminhos vale.
 */
export function isCultureItemDone(
  itemId: string,
  progress: CultureProgressionProgress
): boolean {
  if ((progress.cultureCompletedIds ?? []).includes(itemId)) return true;
  const record = progress.cultureMasteryById?.[itemId];
  if (!record) return false;
  // `completed` e `stars >= 1` são equivalentes aqui de propósito: review_due
  // pode mexer no agendamento, nunca em ter aprendido.
  return Boolean(record.completed) || (record.stars ?? 0) >= 1;
}

function lessonIndex(topicId: string): number {
  return ALL_LESSONS.findIndex((lesson) => lesson.id === topicId);
}

/**
 * Grandfather: se a pessoa já concluiu o próprio tópico guardado ou qualquer
 * tópico posterior, ela passou por ali antes deste marco existir. Trancar agora
 * seria retirar progresso conquistado — proibido.
 */
export function hasLegacyProgressPastGate(
  gate: CultureProgressionGate,
  completedLessons: readonly string[] | undefined
): boolean {
  const completed = completedLessons ?? [];
  if (!completed.length) return false;
  const gateIndex = lessonIndex(gate.beforeTopicId);
  if (gateIndex < 0) return false;
  return completed.some((lessonId) => {
    const index = lessonIndex(lessonId);
    return index >= gateIndex;
  });
}

/** Avaliação canônica de um marco. Pura: mesma entrada, mesma saída. */
export function evaluateCultureProgressionGate(
  gate: CultureProgressionGate,
  progress: CultureProgressionProgress
): CultureProgressionGateEvaluation {
  const required = requiredCultureItemIdsForGate(gate);
  const completedItemIds = required.filter((itemId) => isCultureItemDone(itemId, progress));
  const missingItemIds = required.filter((itemId) => !isCultureItemDone(itemId, progress));

  // Selo adquirido permanece adquirido. `review_due` reagenda a memória; não
  // revoga o marco nem devolve a Jornada para trás.
  const sealHeld = (progress.cultureSeals ?? []).includes(gate.requiredSealId);
  const allDone = required.length > 0 && missingItemIds.length === 0;

  let status: CultureGateStatus;
  if (sealHeld || allDone) {
    status = "unlocked";
  } else if (hasLegacyProgressPastGate(gate, progress.completedLessons)) {
    status = "legacy_passed";
  } else {
    status = "locked";
  }

  return {
    gate,
    ready: status !== "locked",
    status,
    completed: completedItemIds.length,
    total: required.length,
    completedItemIds,
    missingItemIds,
    nextItemId: missingItemIds[0],
    reasonPt: gate.reasonPt,
    reasonEn: gate.reasonEn,
  };
}

/**
 * O marco que guarda este tópico, já avaliado. `undefined` = tópico sem marco.
 * É por aqui que Journey UI, `canStartLesson` e o ponteiro convergem.
 */
export function cultureGateForTopic(
  topicId: string | undefined | null,
  progress: CultureProgressionProgress
): CultureProgressionGateEvaluation | undefined {
  const gate = cultureProgressionGateBeforeTopic(topicId);
  if (!gate) return undefined;
  return evaluateCultureProgressionGate(gate, progress);
}

/**
 * Resposta curta para quem só precisa saber se pode abrir: Journey card, deep
 * link e ponteiro. Tópico sem marco nunca é bloqueado por esta camada.
 */
export function isTopicBlockedByCultureGate(
  topicId: string | undefined | null,
  progress: CultureProgressionProgress
): boolean {
  const evaluation = cultureGateForTopic(topicId, progress);
  return Boolean(evaluation && !evaluation.ready);
}

/** Todos os marcos avaliados, na ordem de apresentação. */
export function evaluateAllCultureProgressionGates(
  progress: CultureProgressionProgress
): CultureProgressionGateEvaluation[] {
  return [...CULTURE_PROGRESSION_GATES]
    .sort((a, b) => a.priority - b.priority)
    .map((gate) => evaluateCultureProgressionGate(gate, progress));
}
