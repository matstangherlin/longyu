/**
 * RC2.2.28 — ConversationRuntimeState + reducer puro.
 *
 * Separação definitiva: estado pedagógico ≠ efeitos (áudio / voz / bridge / tela).
 *
 *   conversationReducer(state, event) → newState
 *
 * Sem await, sem chamada de bridge, sem mutação de tela dentro do reducer.
 * Áudio só depois de state_commit + DOM_VISIBLE(nodeId).
 */
export type ConversationMode = "listening" | "answering" | "revealing" | "repairing" | "finished";

export interface ConversationRuntimeState {
  sceneId: string;
  nodeId: string;
  spokenCount: number;
  mode: ConversationMode;
  answering: boolean;
  repairPending: boolean;
  revealPending: boolean;
  transitionId: string;
}

export type ConversationRuntimeEvent =
  | { type: "CONTINUE"; targetNodeId: string; transitionId: string }
  | { type: "ANSWER"; correct: boolean; nextNodeId?: string; transitionId: string }
  | { type: "ANSWER_WRONG"; transitionId: string }
  | { type: "REVEAL"; transitionId: string }
  | { type: "REPAIR"; nextNodeId: string; transitionId: string }
  | { type: "FINISH"; transitionId: string };

export function createConversationRuntimeState(input: {
  sceneId: string;
  entryNodeId: string;
  transitionId?: string;
}): ConversationRuntimeState {
  return {
    sceneId: input.sceneId,
    nodeId: input.entryNodeId,
    spokenCount: 0,
    mode: "listening",
    answering: false,
    repairPending: false,
    revealPending: false,
    transitionId: input.transitionId ?? `t-${input.sceneId}-0`,
  };
}

/**
 * Reducer puro: só muda estado pedagógico. Nunca toca áudio.
 * CONTINUE sempre commita o novo nodeId (áudio não cancela transição).
 */
export function conversationReducer(
  state: ConversationRuntimeState,
  event: ConversationRuntimeEvent
): ConversationRuntimeState {
  switch (event.type) {
    case "CONTINUE":
      if (event.targetNodeId === state.nodeId) {
        return {
          ...state,
          spokenCount: state.spokenCount + 1,
          transitionId: event.transitionId,
          mode: "listening",
          answering: false,
          repairPending: false,
          revealPending: false,
        };
      }
      return {
        ...state,
        nodeId: event.targetNodeId,
        spokenCount: state.spokenCount + 1,
        transitionId: event.transitionId,
        mode: "listening",
        answering: false,
        repairPending: false,
        revealPending: false,
      };
    case "ANSWER":
      if (event.correct && event.nextNodeId) {
        return {
          ...state,
          nodeId: event.nextNodeId,
          spokenCount: state.spokenCount + 1,
          transitionId: event.transitionId,
          mode: "listening",
          answering: false,
          repairPending: false,
          revealPending: false,
        };
      }
      return {
        ...state,
        transitionId: event.transitionId,
        mode: "answering",
        answering: true,
        repairPending: !event.correct,
      };
    case "ANSWER_WRONG":
      return {
        ...state,
        transitionId: event.transitionId,
        mode: "answering",
        answering: true,
        repairPending: true,
      };
    case "REVEAL":
      return {
        ...state,
        transitionId: event.transitionId,
        mode: "revealing",
        revealPending: true,
      };
    case "REPAIR":
      return {
        ...state,
        nodeId: event.nextNodeId,
        spokenCount: state.spokenCount + 1,
        transitionId: event.transitionId,
        mode: "repairing",
        answering: false,
        repairPending: false,
        revealPending: false,
      };
    case "FINISH":
      return {
        ...state,
        transitionId: event.transitionId,
        mode: "finished",
        answering: false,
        repairPending: false,
        revealPending: false,
      };
    default:
      return state;
  }
}

/** Novo transitionId estável por avanço (prova 10 nodes → 10 ids). */
export function nextTransitionId(sceneId: string, spokenCount: number): string {
  return `t-${sceneId}-${spokenCount + 1}`;
}

/**
 * RC2.2.29 — lock de transição: bloqueia tap duplicado durante o commit.
 * Durante `TRANSITION_LOCK_MS`, o mesmo transitionId / um segundo Continuar
 * não avança dois nós nem congela — o segundo tap é ignorado.
 *
 * Preferência: liberar quando DOM_NEXT_NODE_VISIBLE (forceRelease), não só
 * por timeout — o timeout só protege duplicata; a próxima interação
 * legítima após o render não pode ficar bloqueada.
 */
export const TRANSITION_LOCK_MS = 280;

export interface TransitionLockState {
  locked: boolean;
  transitionId: string | null;
  lockedAt: number;
}

export function createTransitionLock(): TransitionLockState {
  return { locked: false, transitionId: null, lockedAt: 0 };
}

/** Tenta adquirir o lock. false = tap duplicado (ignorar). */
export function tryAcquireTransitionLock(
  lock: TransitionLockState,
  transitionId: string,
  now = Date.now()
): { ok: true; lock: TransitionLockState } | { ok: false; lock: TransitionLockState } {
  if (lock.locked && now - lock.lockedAt < TRANSITION_LOCK_MS) {
    return { ok: false, lock };
  }
  return { ok: true, lock: { locked: true, transitionId, lockedAt: now } };
}

/** Liberação temporal: só solta depois de TRANSITION_LOCK_MS. */
export function releaseTransitionLock(lock: TransitionLockState, now = Date.now()): TransitionLockState {
  if (!lock.locked) return lock;
  if (now - lock.lockedAt < TRANSITION_LOCK_MS) {
    return lock;
  }
  return { locked: false, transitionId: null, lockedAt: 0 };
}

/** Liberação imediata (DOM visível / failsafe). Não espera o timeout. */
export function forceReleaseTransitionLock(_lock: TransitionLockState): TransitionLockState {
  return { locked: false, transitionId: null, lockedAt: 0 };
}

/** Fixture QA: 20 transições (stress). */
export const QA_CONVERSATION_20_NODE_IDS = Array.from({ length: 20 }, (_, i) => `qa-node-${String(i + 1).padStart(2, "0")}`);

export function runQaConversationNodes(count: number, playerOff = true): {
  nodeIds: string[];
  transitionIds: string[];
  final: ConversationRuntimeState;
} {
  const ids = Array.from({ length: count }, (_, i) => `qa-node-${String(i + 1).padStart(2, "0")}`);
  let state = createConversationRuntimeState({
    sceneId: `qa-${count}-nodes`,
    entryNodeId: ids[0],
    transitionId: `t-qa-${count}-nodes-0`,
  });
  const nodeIds = [state.nodeId];
  const transitionIds = [state.transitionId];
  let lock = createTransitionLock();
  for (let i = 1; i < ids.length; i += 1) {
    const transitionId = nextTransitionId(state.sceneId, state.spokenCount);
    const acquired = tryAcquireTransitionLock(lock, transitionId, Date.now() + i * (TRANSITION_LOCK_MS + 1));
    if (!acquired.ok) continue;
    lock = acquired.lock;
    state = conversationReducer(state, {
      type: "CONTINUE",
      targetNodeId: ids[i],
      transitionId,
    });
    nodeIds.push(state.nodeId);
    transitionIds.push(state.transitionId);
    lock = releaseTransitionLock(lock, Date.now() + i * (TRANSITION_LOCK_MS + 1) + TRANSITION_LOCK_MS);
    void playerOff;
  }
  return { nodeIds, transitionIds, final: state };
}

/**
 * Fixture QA: cena sintética de 10 nós (PLAYER OFF / ON).
 * Usada pelos gates e pelo teste Android contra o APK.
 */
export const QA_CONVERSATION_10_NODE_IDS = [
  "qa-node-01",
  "qa-node-02",
  "qa-node-03",
  "qa-node-04",
  "qa-node-05",
  "qa-node-06",
  "qa-node-07",
  "qa-node-08",
  "qa-node-09",
  "qa-node-10",
] as const;

export function runQaConversationTenNodes(playerOff = true): {
  nodeIds: string[];
  transitionIds: string[];
  final: ConversationRuntimeState;
} {
  let state = createConversationRuntimeState({
    sceneId: "qa-ten-nodes",
    entryNodeId: QA_CONVERSATION_10_NODE_IDS[0],
    transitionId: "t-qa-ten-nodes-0",
  });
  const nodeIds = [state.nodeId];
  const transitionIds = [state.transitionId];
  for (let i = 1; i < QA_CONVERSATION_10_NODE_IDS.length; i += 1) {
    const transitionId = nextTransitionId(state.sceneId, state.spokenCount);
    state = conversationReducer(state, {
      type: "CONTINUE",
      targetNodeId: QA_CONVERSATION_10_NODE_IDS[i],
      transitionId,
    });
    nodeIds.push(state.nodeId);
    transitionIds.push(state.transitionId);
    // playerOff: áudio não existe; estado já commitado. playerOn: side-effect
    // externo (não entra no reducer).
    void playerOff;
  }
  return { nodeIds, transitionIds, final: state };
}
