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
