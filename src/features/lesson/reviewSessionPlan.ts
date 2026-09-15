/**
 * RC1.3 · P1/P2 — a revisão é FINITA.
 *
 * O QA real capturou um aluno preso: responde, vê o feedback, continua, e volta
 * para a mesma atividade — indefinidamente. A causa não era a UI: era a fila.
 * O `LessonPlayer` recalculava a lista de erros a CADA resposta e remontava a
 * sessão (a `key` do componente incluía os corrigidos), então o índice voltava a
 * zero; quando todos os erros ficavam corrigidos, a fila caía de volta no
 * conjunto inteiro (`remainingErrors.length > 0 ? remaining : committed`) e a
 * revisão recomeçava. Somado ao "Continuar revisão" do resumo, não existia
 * nenhum teto: errar para sempre significava revisar para sempre.
 *
 * A correção é estrutural. Uma sessão de revisão passa a ter:
 *
 * - `reviewSessionId` — identidade da sessão;
 * - `plannedItems` — plano IMUTÁVEL, construído UMA vez (P1.1);
 * - `retryBudget` — no máximo um retry adicional por conhecimento (P1.3);
 * - `currentIndex` — cursor que só anda para frente (P1.7);
 * - `completedItemIds` — o que já foi respondido.
 *
 * E dois invariantes que o gate e os testes de mutação verificam (P1.5):
 *
 *     renderedTasks <= plannedItems.length + retryBudget
 *     occurrences(logicalReviewItemId) <= 2
 *
 * Errar dentro da revisão NUNCA cria uma revisão dentro da revisão (P1.2): o
 * erro vira, no máximo, um retry atrasado (P1.4) e, se o aluno errar de novo, a
 * sessão segue em frente e a fraqueza vai para o SRS (P1.6).
 */

export const REVIEW_RETRY_BUDGET_PER_ITEM = 1;
export const REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM = 2;
/** Transições válidas sem o cursor andar antes do disjuntor abrir (P1.8). */
export const REVIEW_STALL_LIMIT = 3;

export type ReviewItemOccurrence = 1 | 2;

export interface ReviewPlanItem {
  /** Identidade desta OCORRÊNCIA na sessão (nunca se repete). */
  reviewItemId: string;
  /** O conhecimento por trás da ocorrência — é ele que tem teto de 2. */
  logicalReviewItemId: string;
  /** Erro de origem na tentativa; o que liga a revisão à tarefa original. */
  sourceErrorId: string;
  occurrence: ReviewItemOccurrence;
}

export interface ReviewSessionPlan {
  reviewSessionId: string;
  /** Congelado no início. Nada acrescenta itens aqui depois (P1.1). */
  plannedItems: readonly ReviewPlanItem[];
  retryBudget: number;
  /** Teto duro de tarefas renderizadas na sessão (P1.5). */
  maxRenderedTasks: number;
}

export type ReviewSessionStatus = "active" | "complete" | "aborted";

export type ReviewBreakerCode =
  | "RENDER_BUDGET_EXCEEDED"
  | "OCCURRENCE_LIMIT_EXCEEDED"
  | "CURSOR_STALLED";

export interface ReviewBreaker {
  code: ReviewBreakerCode;
  detail: string;
  /** Item em que o disjuntor abriu — vai para o diagnóstico. */
  reviewItemId?: string;
}

export interface ReviewSessionState {
  plan: ReviewSessionPlan;
  /** plannedItems + retries concedidos, na ordem de apresentação. */
  queue: readonly ReviewPlanItem[];
  currentIndex: number;
  completedItemIds: readonly string[];
  /** Conhecimentos respondidos certo em alguma ocorrência. */
  correctedLogicalIds: readonly string[];
  /** Conhecimentos que terminaram a sessão ainda errados (vão ao SRS — P1.6). */
  unresolvedLogicalIds: readonly string[];
  occurrences: Readonly<Record<string, number>>;
  retriesGranted: number;
  renderedTasks: number;
  /** Quantas transições válidas aconteceram sem o cursor andar. */
  stalledTransitions: number;
  status: ReviewSessionStatus;
  breaker: ReviewBreaker | null;
}

export interface ReviewSessionSource {
  /** Id do erro da tentativa — identidade da ocorrência planejada. */
  errorId: string;
  /**
   * Conhecimento por trás do erro. Dois erros do MESMO alvo compartilham este
   * id e, juntos, não podem passar de duas aparições.
   */
  logicalReviewItemId: string;
}

function planItemId(sessionId: string, logicalId: string, occurrence: ReviewItemOccurrence): string {
  return `${sessionId}:${logicalId}:${occurrence}`;
}

/**
 * P1.1 — o plano nasce UMA vez.
 *
 * Itens do mesmo conhecimento colapsam: cinco erros do mesmo alvo não viram
 * cinco cards. É isso que faz "5 pontos para firmar" (P2.1) ser honesto — o
 * número é o do plano, não o da contagem bruta de erros.
 */
export function buildReviewSessionPlan(input: {
  reviewSessionId: string;
  sources: readonly ReviewSessionSource[];
  retryBudget?: number;
}): ReviewSessionPlan {
  const seen = new Set<string>();
  const plannedItems: ReviewPlanItem[] = [];
  for (const source of input.sources) {
    const logicalReviewItemId = source.logicalReviewItemId || source.errorId;
    if (seen.has(logicalReviewItemId)) continue;
    seen.add(logicalReviewItemId);
    plannedItems.push({
      reviewItemId: planItemId(input.reviewSessionId, logicalReviewItemId, 1),
      logicalReviewItemId,
      sourceErrorId: source.errorId,
      occurrence: 1,
    });
  }
  const retryBudget = Math.max(
    0,
    Math.floor(input.retryBudget ?? plannedItems.length * REVIEW_RETRY_BUDGET_PER_ITEM)
  );
  return {
    reviewSessionId: input.reviewSessionId,
    plannedItems,
    retryBudget,
    maxRenderedTasks: plannedItems.length + retryBudget,
  };
}

export function startReviewSession(plan: ReviewSessionPlan): ReviewSessionState {
  return {
    plan,
    queue: [...plan.plannedItems],
    currentIndex: 0,
    completedItemIds: [],
    correctedLogicalIds: [],
    unresolvedLogicalIds: [],
    occurrences: Object.fromEntries(plan.plannedItems.map((item) => [item.logicalReviewItemId, 1])),
    retriesGranted: 0,
    renderedTasks: 0,
    stalledTransitions: 0,
    status: plan.plannedItems.length > 0 ? "active" : "complete",
    breaker: null,
  };
}

export function currentReviewItem(state: ReviewSessionState): ReviewPlanItem | null {
  if (state.status !== "active") return null;
  return state.queue[state.currentIndex] ?? null;
}

export function reviewSessionProgress(state: ReviewSessionState): { index: number; total: number } {
  return { index: Math.min(state.currentIndex, state.queue.length), total: state.queue.length };
}

export function isLastReviewItem(state: ReviewSessionState): boolean {
  return state.currentIndex >= state.queue.length - 1;
}

/**
 * P1.8 — disjuntor.
 *
 * Existe porque nenhum invariante sobrevive sozinho a um bug novo. Se a sessão
 * passar do teto de tarefas, se um conhecimento aparecer uma terceira vez ou se
 * o cursor deixar de andar depois de transições válidas, a sessão encerra com
 * diagnóstico e o aluno vai para o resumo. Prender a pessoa na tela nunca é
 * uma opção.
 */
function trip(state: ReviewSessionState, breaker: ReviewBreaker): ReviewSessionState {
  return {
    ...state,
    status: "aborted",
    breaker,
    unresolvedLogicalIds: unresolvedAfter(state),
  };
}

function unresolvedAfter(state: ReviewSessionState): string[] {
  const corrected = new Set(state.correctedLogicalIds);
  const pending = new Set<string>();
  for (const item of state.queue) {
    if (!corrected.has(item.logicalReviewItemId)) pending.add(item.logicalReviewItemId);
  }
  return [...pending];
}

/**
 * Registra a resposta do item corrente.
 *
 * P1.2/P1.4 — errar NÃO reinsere o item logo a seguir nem abre uma sub-revisão.
 * Quando ainda há orçamento e o conhecimento apareceu só uma vez, o retry entra
 * no FIM da fila (A B C A'), e só se houver ao menos um outro item entre agora
 * e ele: sem item no meio, repetir seria "A A", que é o que a regra proíbe —
 * nesse caso a fraqueza segue para o SRS (P1.6) e a sessão continua.
 */
export function answerReviewItem(
  state: ReviewSessionState,
  input: { reviewItemId: string; correct: boolean }
): ReviewSessionState {
  if (state.status !== "active") return state;
  const current = currentReviewItem(state);
  if (!current || current.reviewItemId !== input.reviewItemId) return state;

  const renderedTasks = state.renderedTasks + (state.completedItemIds.includes(input.reviewItemId) ? 0 : 1);
  if (renderedTasks > state.plan.maxRenderedTasks) {
    return trip(state, {
      code: "RENDER_BUDGET_EXCEEDED",
      detail: `${renderedTasks} > ${state.plan.maxRenderedTasks}`,
      reviewItemId: input.reviewItemId,
    });
  }

  const completedItemIds = state.completedItemIds.includes(input.reviewItemId)
    ? state.completedItemIds
    : [...state.completedItemIds, input.reviewItemId];

  const correctedLogicalIds = input.correct
    ? state.correctedLogicalIds.includes(current.logicalReviewItemId)
      ? state.correctedLogicalIds
      : [...state.correctedLogicalIds, current.logicalReviewItemId]
    : state.correctedLogicalIds;

  let queue = state.queue;
  let occurrences = state.occurrences;
  let retriesGranted = state.retriesGranted;

  const alreadySeen = state.occurrences[current.logicalReviewItemId] ?? 1;
  const pendingAhead = state.queue.length - (state.currentIndex + 1);
  const canGrantRetry =
    !input.correct &&
    retriesGranted < state.plan.retryBudget &&
    alreadySeen < REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM &&
    // P1.4 — um retry só existe se houver algo entre a falha e a volta.
    pendingAhead > 0;

  if (canGrantRetry) {
    const retry: ReviewPlanItem = {
      reviewItemId: planItemId(state.plan.reviewSessionId, current.logicalReviewItemId, 2),
      logicalReviewItemId: current.logicalReviewItemId,
      sourceErrorId: current.sourceErrorId,
      occurrence: 2,
    };
    const nextOccurrence = alreadySeen + 1;
    if (nextOccurrence > REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM) {
      return trip(state, {
        code: "OCCURRENCE_LIMIT_EXCEEDED",
        detail: `${current.logicalReviewItemId} × ${nextOccurrence}`,
        reviewItemId: current.reviewItemId,
      });
    }
    queue = [...state.queue, retry];
    occurrences = { ...state.occurrences, [current.logicalReviewItemId]: nextOccurrence };
    retriesGranted += 1;
  }

  return {
    ...state,
    queue,
    occurrences,
    retriesGranted,
    renderedTasks,
    completedItemIds,
    correctedLogicalIds,
  };
}

/**
 * P1.7 — "Continuar" depois do feedback só anda para frente. O último item
 * fecha a sessão; nunca devolve ao mesmo card.
 */
export function advanceReviewSession(state: ReviewSessionState): ReviewSessionState {
  if (state.status !== "active") return state;
  const nextIndex = state.currentIndex + 1;
  if (nextIndex <= state.currentIndex) {
    const stalledTransitions = state.stalledTransitions + 1;
    if (stalledTransitions >= REVIEW_STALL_LIMIT) {
      return trip(state, { code: "CURSOR_STALLED", detail: `index travado em ${state.currentIndex}` });
    }
    return { ...state, stalledTransitions };
  }
  if (nextIndex >= state.queue.length) {
    return {
      ...state,
      currentIndex: state.queue.length,
      status: "complete",
      stalledTransitions: 0,
      unresolvedLogicalIds: unresolvedAfter(state),
    };
  }
  return { ...state, currentIndex: nextIndex, stalledTransitions: 0 };
}

/** P2.2 — a revisão termina mesmo com erro; o aluno pode sair a qualquer momento. */
export function endReviewSession(state: ReviewSessionState): ReviewSessionState {
  if (state.status !== "active") return state;
  return {
    ...state,
    status: "complete",
    currentIndex: state.queue.length,
    unresolvedLogicalIds: unresolvedAfter(state),
  };
}

export interface ReviewSessionInvariantReport {
  ok: boolean;
  violations: { code: ReviewBreakerCode; detail: string }[];
}

/** P1.5 — o invariante escrito como código, para gate e teste de mutação. */
export function checkReviewSessionInvariants(state: ReviewSessionState): ReviewSessionInvariantReport {
  const violations: { code: ReviewBreakerCode; detail: string }[] = [];
  if (state.renderedTasks > state.plan.maxRenderedTasks) {
    violations.push({
      code: "RENDER_BUDGET_EXCEEDED",
      detail: `renderedTasks ${state.renderedTasks} > plannedItems ${state.plan.plannedItems.length} + retryBudget ${state.plan.retryBudget}`,
    });
  }
  if (state.queue.length > state.plan.maxRenderedTasks) {
    violations.push({
      code: "RENDER_BUDGET_EXCEEDED",
      detail: `queue ${state.queue.length} > ${state.plan.maxRenderedTasks}`,
    });
  }
  for (const [logicalId, count] of Object.entries(state.occurrences)) {
    if (count > REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM) {
      violations.push({ code: "OCCURRENCE_LIMIT_EXCEEDED", detail: `${logicalId} × ${count}` });
    }
  }
  const rendered = new Map<string, number>();
  for (const item of state.queue) {
    rendered.set(item.logicalReviewItemId, (rendered.get(item.logicalReviewItemId) ?? 0) + 1);
  }
  for (const [logicalId, count] of rendered) {
    if (count > REVIEW_MAX_OCCURRENCES_PER_LOGICAL_ITEM) {
      violations.push({ code: "OCCURRENCE_LIMIT_EXCEEDED", detail: `fila: ${logicalId} × ${count}` });
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Simula a sessão inteira com um oráculo de respostas. Serve ao gate e ao teste
 * de mutação: o cenário "erra tudo, sempre" tem de TERMINAR.
 */
export function runReviewSession(
  plan: ReviewSessionPlan,
  answer: (item: ReviewPlanItem, index: number) => boolean,
  { maxSteps = 500 }: { maxSteps?: number } = {}
): { state: ReviewSessionState; renderedOrder: string[]; terminated: boolean } {
  let state = startReviewSession(plan);
  const renderedOrder: string[] = [];
  let steps = 0;
  while (state.status === "active" && steps < maxSteps) {
    steps += 1;
    const item = currentReviewItem(state);
    if (!item) break;
    renderedOrder.push(item.reviewItemId);
    state = answerReviewItem(state, {
      reviewItemId: item.reviewItemId,
      correct: answer(item, renderedOrder.length - 1),
    });
    state = advanceReviewSession(state);
  }
  return { state, renderedOrder, terminated: state.status !== "active" };
}
