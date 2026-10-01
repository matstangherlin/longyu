/**
 * RC2.2.24 — ANDROID_CONVERSATION_NODE_STALL.
 *
 * A conversa é navegação pedagógica; o áudio só acompanha:
 *
 *   USER ACTION → RESOLVE NEXT NODE → COMMIT STATE → RENDER NEXT NODE → ONLY THEN AUTO-SPEAK
 *
 * Antes, a transição chamava TTS no próprio toque, ANTES de trocar o nó: no
 * APK, qualquer falha síncrona do caminho nativo abortava o handler e o aluno
 * ficava na MESMA fala. Agora `goTo` só valida, grava o nó e marca a fala; o
 * áudio do nó novo sai de um efeito depois que o DOM do nó apareceu.
 *
 * "Avançou" só quando o DOM do nó esperado ficou visível. Sem isso em 800 ms:
 * CONVERSATION_DOM_STALL (no build de QA: [Tentar transição novamente]
 * [Copiar diagnóstico]).
 *
 * Módulo puro (sem React/Capacitor) — o gate o executa a partir do texto.
 */
export const CONVERSATION_TRACE_EVENTS = [
  "conversation_continue_tap",
  "conversation_state_before",
  "conversation_target_resolved",
  "conversation_state_committed",
  "conversation_dom_next_visible",
  "conversation_audio_requested",
  "conversation_audio_started",
  "conversation_dom_stall",
] as const;
export type ConversationTraceEvent = (typeof CONVERSATION_TRACE_EVENTS)[number];

/** Depois do toque, o nó esperado precisa estar visível neste prazo. */
export const CONVERSATION_DOM_STALL_MS = 800;

export interface ConversationTraceEntry {
  at: number;
  event: ConversationTraceEvent;
  sceneId: string;
  /** Nó (V2) ou índice de fala (V1) — nunca texto. */
  nodeId: string | null;
  expectedNodeId?: string | null;
}

const LIMIT = 80;
const trace: ConversationTraceEntry[] = [];

export function recordConversationTrace(entry: Omit<ConversationTraceEntry, "at"> & { at?: number }): void {
  trace.push({ at: entry.at ?? Date.now(), ...entry });
  if (trace.length > LIMIT) trace.splice(0, trace.length - LIMIT);
  if (typeof window !== "undefined") (window as Window & { __longyuConversationTrace?: ConversationTraceEntry[] }).__longyuConversationTrace = trace.slice();
}

export function conversationTrace(): readonly ConversationTraceEntry[] {
  return trace.slice();
}

export function resetConversationTraceForTests(): void {
  trace.length = 0;
}

/**
 * Resolve o próximo nó SEM efeito colateral: alvo válido → id; grafo
 * quebrado / loop → "finish" (a cena termina em vez de prender o aluno).
 */
export function resolveConversationTarget(targetId: string | undefined, known: (id: string) => boolean, transitions: number, maxTransitions = 60): { kind: "node"; id: string } | { kind: "finish" } {
  if (!targetId || !known(targetId) || transitions > maxTransitions) return { kind: "finish" };
  return { kind: "node", id: targetId };
}

/** Uma transição terminou de verdade? (o nó esperado é o que está visível). */
export function conversationTransitionLanded(expectedNodeId: string | null, visibleNodeId: string | null): boolean {
  return expectedNodeId == null || expectedNodeId === visibleNodeId;
}

/** Diagnóstico copiável (sem texto da fala, sem PII). */
export function conversationDiagnostic(input: { sceneId: string; currentNodeId: string | null; expectedNodeId: string | null; visibleNodeId: string | null; ttsRequestId?: string | null; ttsPhase?: string | null }): string {
  return JSON.stringify({ ...input, trace: conversationTrace().filter((entry) => entry.sceneId === input.sceneId).slice(-20) }, null, 2);
}
