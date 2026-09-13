/**
 * RC1.1 P0.1 — máquina de estados de uma tarefa.
 *
 * O motivo de existir: o fluxo de resposta vivia espalhado em booleans
 * independentes (`revealed`, `selected`, `exerciseCorrect`, `finished`,
 * `syncing`). Nada impedia que dois deles ficassem verdadeiros ao mesmo tempo,
 * e foi exatamente assim que o QA viu a revisão parar depois de responder:
 * a tela mostrava feedback e continuava esperando resposta, então nenhum CTA
 * era o CTA certo.
 *
 * Aqui o estado é UM valor. As transições legais são explícitas e a função
 * `nextTaskFlow` é a única porta de entrada. Quem tentar uma transição que não
 * existe recebe o estado atual de volta — nunca um estado híbrido.
 *
 * Este módulo é runtime puro: não conhece React, store, áudio nem currículo.
 * Não adiciona lesson, chunk, char nem StepKind (freeze RC1).
 */

export type TaskFlowState = "idle" | "answered" | "feedback" | "advancing" | "completed";

export type TaskFlowEvent =
  /** O aluno escolheu/montou/digitou algo, mas ainda não verificou. */
  | { type: "ANSWER" }
  /** Verificar: o motor julgou a resposta. */
  | { type: "VERIFY" }
  /** O feedback (correção, áudio, explicação) está na tela. */
  | { type: "FEEDBACK" }
  /** Continuar: o aluno pediu o próximo item. */
  | { type: "CONTINUE"; isLast: boolean }
  /** O próximo item entrou (ou a sessão encerrou). */
  | { type: "SETTLED"; isLast: boolean }
  /** Reinício explícito de item (retry pedagógico declarado pela atividade). */
  | { type: "RETRY" }
  /** Item novo montado — volta para o começo do ciclo. */
  | { type: "RESET" };

export interface TaskFlowSnapshot {
  state: TaskFlowState;
  /** Sequência da tentativa dentro do item. Sobe a cada RETRY. */
  attempt: number;
}

export function initialTaskFlow(): TaskFlowSnapshot {
  return { state: "idle", attempt: 1 };
}

/**
 * P0.3 — errar também avança. `VERIFY` leva a `answered` independentemente de
 * acerto; só uma atividade com fase de retry declarada emite `RETRY`.
 */
export function nextTaskFlow(current: TaskFlowSnapshot, event: TaskFlowEvent): TaskFlowSnapshot {
  const { state, attempt } = current;

  switch (event.type) {
    case "ANSWER":
      // Responder de novo antes de verificar é legítimo (trocar de alternativa).
      return state === "idle" || state === "answered" ? { state: "answered", attempt } : current;

    case "VERIFY":
      // Verificar sem resposta não é transição — o CTA fica desabilitado.
      return state === "answered" ? { state: "answered", attempt } : current;

    case "FEEDBACK":
      return state === "answered" ? { state: "feedback", attempt } : current;

    case "CONTINUE":
      // P0.2/P0.4 — Continuar só existe a partir do feedback, e no último item
      // ele encerra a sessão em vez de procurar um próximo.
      if (state !== "feedback") return current;
      return { state: "advancing", attempt };

    case "SETTLED":
      if (state !== "advancing") return current;
      return event.isLast ? { state: "completed", attempt } : { state: "idle", attempt: 1 };

    case "RETRY":
      // Só a partir do feedback, e só quando a atividade declara retry.
      return state === "feedback" ? { state: "idle", attempt: attempt + 1 } : current;

    case "RESET":
      return state === "completed" ? current : { state: "idle", attempt: 1 };

    default:
      return current;
  }
}

/** P0.2 — qual CTA a tela deve mostrar neste estado. */
export type TaskFlowCta = "check" | "continue" | "finish" | "none";

export function taskFlowCta(snapshot: TaskFlowSnapshot, isLast: boolean): TaskFlowCta {
  switch (snapshot.state) {
    case "idle":
    case "answered":
      return "check";
    case "feedback":
      return isLast ? "finish" : "continue";
    case "advancing":
    case "completed":
      return "none";
    default:
      return "none";
  }
}

/**
 * P0.1 — o invariante que o QA quebrou. Um item não pode estar em feedback e
 * esperando resposta ao mesmo tempo. Telas que ainda derivam booleans
 * chamam isto para provar que a derivação continua coerente.
 */
export function assertTaskFlowInvariant(flags: {
  showingFeedback: boolean;
  waitingForAnswer: boolean;
  completed: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (flags.showingFeedback && flags.waitingForAnswer) {
    return { ok: false, reason: "feedback e waitingForAnswer simultâneos: nenhum CTA é o CTA certo" };
  }
  if (flags.completed && (flags.showingFeedback || flags.waitingForAnswer)) {
    return { ok: false, reason: "sessão concluída ainda exibindo item" };
  }
  return { ok: true };
}

/** Derivação canônica dos booleans a partir do estado — sem inventar híbridos. */
export function taskFlowFlags(snapshot: TaskFlowSnapshot): {
  showingFeedback: boolean;
  waitingForAnswer: boolean;
  completed: boolean;
  advancing: boolean;
} {
  return {
    showingFeedback: snapshot.state === "feedback",
    waitingForAnswer: snapshot.state === "idle" || snapshot.state === "answered",
    completed: snapshot.state === "completed",
    advancing: snapshot.state === "advancing",
  };
}

// ── P12.1 — ponteiro de destino único ───────────────────────────────────────
//
// O bug de "a sessão terminou mas a tela ficou na mesma atividade" nasce de
// vários efeitos tentando navegar. Aqui o destino é resolvido UMA vez, a partir
// do estado da sessão, e quem chama só executa.

export type TaskFlowDestination =
  | { kind: "nextStep"; index: number }
  | { kind: "nextRound" }
  | { kind: "plusRound" }
  | { kind: "nextTopic" }
  | { kind: "journey" }
  | { kind: "result" };

export interface AdvanceResolutionInput {
  currentIndex: number;
  totalItems: number;
  /** Quantas rodadas obrigatórias o tema tem e quantas já foram fechadas. */
  roundsCompleted?: number;
  requiredRounds?: number;
  /** P6 — a Plus só entra quando o cálculo de média pediu. */
  needsPlusRound?: boolean;
  /** A sessão atual JÁ é a Plus: depois dela o tema fecha (P6.6). */
  isPlusRound?: boolean;
  /** O tema inteiro acabou. */
  topicComplete?: boolean;
}

/**
 * P12.2 — o destino nunca depende de `cloudSync === finished`. A assinatura não
 * recebe estado de sync de propósito: não há como um caller acoplar os dois.
 */
export function resolveAdvanceDestination(input: AdvanceResolutionInput): TaskFlowDestination {
  const total = Math.max(0, input.totalItems);
  const nextIndex = input.currentIndex + 1;
  if (nextIndex < total) return { kind: "nextStep", index: nextIndex };

  // Fim da sessão. A tela de resultado é sempre o primeiro destino — é ela que
  // oferece o próximo passo. Quem pergunta "e depois do resultado?" chama
  // `resolvePostResultDestination`.
  return { kind: "result" };
}

export function resolvePostResultDestination(input: AdvanceResolutionInput): TaskFlowDestination {
  if (input.isPlusRound) {
    // P6.6 — depois da Plus o tema é finalizado. Nunca Plus 2.
    return { kind: "nextTopic" };
  }
  const required = input.requiredRounds ?? 4;
  const done = input.roundsCompleted ?? 0;
  if (done < required) return { kind: "nextRound" };
  if (input.needsPlusRound) return { kind: "plusRound" };
  if (input.topicComplete) return { kind: "nextTopic" };
  return { kind: "journey" };
}

// ── P0.6 / P22 — idempotência de conclusão ─────────────────────────────────

/**
 * Chave de transação de uma conclusão. Dois cliques em Continuar produzem a
 * MESMA chave, então XP, estrelas, agendamento de revisão e XP de liga só
 * contam uma vez. O `attemptId` entra para que uma segunda tentativa legítima
 * (outra sessão da mesma lição) continue sendo uma conclusão distinta.
 */
export function completionSourceKey(input: {
  scope: "lesson" | "review" | "test" | "plus" | "culture" | "mission";
  sessionId: string;
  targetId: string;
  pass?: number;
}): string {
  const pass = input.pass != null ? `:p${input.pass}` : "";
  return `${input.scope}:${input.targetId}${pass}:${input.sessionId}`;
}

/**
 * Guarda de efeitos colaterais por chave. Uma instância por sessão; `claim`
 * devolve `true` só na primeira vez. Substitui os `useRef(new Set())` avulsos
 * que cada tela mantinha com regras ligeiramente diferentes.
 */
export class CompletionLedger {
  private readonly claimed = new Set<string>();

  claim(key: string): boolean {
    if (this.claimed.has(key)) return false;
    this.claimed.add(key);
    return true;
  }

  has(key: string): boolean {
    return this.claimed.has(key);
  }

  get size(): number {
    return this.claimed.size;
  }
}

// ── P0.5 — conclusão local-first ───────────────────────────────────────────

export interface LocalFirstCompletion<T> {
  /** 1. persistir local; 2. atualizar UI; 3. avançar; 4. sync em background. */
  local: T;
  destination: TaskFlowDestination;
}

/**
 * Ordena os passos de uma conclusão. `syncCloud` é disparado e esquecido: a
 * promessa nunca é aguardada antes de `destination` ser devolvido, então
 * "Sincronizando progresso..." não tem como segurar o botão Continuar.
 */
export function completeLocalFirst<T>(steps: {
  persistLocal: () => T;
  destination: () => TaskFlowDestination;
  syncCloud?: () => void | Promise<unknown>;
}): LocalFirstCompletion<T> {
  const local = steps.persistLocal();
  const destination = steps.destination();
  if (steps.syncCloud) {
    try {
      const result = steps.syncCloud();
      if (result && typeof (result as Promise<unknown>).catch === "function") {
        void (result as Promise<unknown>).catch(() => undefined);
      }
    } catch {
      // Falha de nuvem não é falha de conclusão: o progresso local já está feito.
    }
  }
  return { local, destination };
}

// ── P13 — corrida de item due ──────────────────────────────────────────────

/**
 * Um item respondido não pode ser o PRÓXIMO item da mesma sessão. O selector
 * recolocava o mesmo `due` no mesmo tick porque `reviewedAt`/`nextReviewAt`
 * ainda não tinham sido gravados quando a fila foi recalculada.
 *
 * Esta função é o contrato: dado o id respondido e a fila candidata, devolve a
 * posição do próximo item que não seja ele — a menos que a atividade declare
 * retry explícito, caso em que o item volta, mas nunca colado.
 */
export function nextQueuePosition(input: {
  queueIds: readonly string[];
  from: number;
  justAnsweredId: string | undefined;
  allowImmediateRepeat?: boolean;
}): number {
  const { queueIds, from, justAnsweredId } = input;
  const start = from + 1;
  if (input.allowImmediateRepeat || !justAnsweredId) return start;

  // Pula o item recém-respondido... mas só se houver outro item depois dele.
  // Quando o retry é a única coisa que sobrou, ele é legitimamente o último —
  // adiar ali significaria descartá-lo, não espaçá-lo.
  const hasOther = queueIds.slice(start).some((id) => id !== justAnsweredId);
  if (!hasOther) return start;

  let pos = start;
  while (pos < queueIds.length && queueIds[pos] === justAnsweredId) pos += 1;
  return pos;
}

/**
 * Reinserção de retry: o item errado volta para a fila, mas com uma distância
 * mínima para não ser literalmente a próxima pergunta (P8/P13.1).
 */
export function scheduleRetryPosition(input: {
  queueLength: number;
  from: number;
  minGap?: number;
}): number {
  const gap = Math.max(1, input.minGap ?? 2);
  return Math.min(input.queueLength, Math.max(input.from + 1 + gap, input.queueLength));
}
