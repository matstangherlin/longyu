/**
 * RC1.1 P2 — áudio automático no feedback.
 *
 * O que o QA viu: o aluno erra 再见, a correção aparece escrita, e o som — a
 * única coisa que ensina um tom — só sai se ele descobrir o botão. Numa correção
 * o áudio não é enfeite: é a informação.
 *
 * A regra aqui é uma decisão pura (sem React, sem Web Speech): dado o alvo, o
 * estado do feedback e as preferências, isto responde "tocar agora?" e "por
 * quê?". Quem chama executa e registra a chave no dedupe.
 *
 * Não cria motor de áudio novo: a execução continua em `src/lib/tts.ts`.
 */

export type FeedbackOutcome = "correct" | "wrong" | "revealed";

export interface FeedbackAudioRequest {
  /** Identidade do item na sessão. */
  stepId: string;
  /** Tentativa dentro do item (ver taskFlowMachine). */
  attemptId: string | number;
  outcome: FeedbackOutcome;
  /** Texto mandarim do alvo/correção. Vazio = nada a tocar. */
  target?: string;
  /** A atividade já tocou este mesmo alvo agora (listening) — P2.3. */
  alreadyPlayedThisStep?: boolean;
  /** Preferências do aluno — P2.5. */
  soundEnabled: boolean;
  autoPlayAudio: boolean;
  /** Uma celebração está no ar: não sobrepor (P17). */
  victorySoundActive?: boolean;
}

export type FeedbackAudioDecision =
  | { play: true; text: string; reason: "correction" | "reveal" | "reinforce"; key: string }
  | { play: false; reason: FeedbackAudioSkipReason; key: string };

export type FeedbackAudioSkipReason =
  | "no-target"
  | "muted"
  | "autoplay-off"
  | "duplicate-step-audio"
  | "already-played"
  | "victory-sound";

const CJK = /[㐀-鿿豈-﫿]/u;

export function feedbackAudioKey(request: Pick<FeedbackAudioRequest, "stepId" | "attemptId" | "outcome">): string {
  return `${request.stepId}#${request.attemptId}#${request.outcome}`;
}

/**
 * P2.3 — o dedupe é por `stepId + attemptId + feedback state`. Trocar de item
 * ou tentar de novo gera chave nova; re-render não.
 */
export function decideFeedbackAudio(
  request: FeedbackAudioRequest,
  played: { has(key: string): boolean }
): FeedbackAudioDecision {
  const key = feedbackAudioKey(request);
  const target = String(request.target ?? "").trim();

  if (!target || !CJK.test(target)) return { play: false, reason: "no-target", key };
  // P2.5 — mute vence tudo. Mutação #5/#20 do contrato.
  if (!request.soundEnabled) return { play: false, reason: "muted", key };
  if (!request.autoPlayAudio) return { play: false, reason: "autoplay-off", key };
  // P17 — feedback e vitória nunca ao mesmo tempo.
  if (request.victorySoundActive) return { play: false, reason: "victory-sound", key };
  if (played.has(key)) return { play: false, reason: "already-played", key };
  // P2.3 — listening que acabou de tocar não dispara três vezes.
  if (request.alreadyPlayedThisStep && request.outcome === "correct") {
    return { play: false, reason: "duplicate-step-audio", key };
  }

  const reason =
    request.outcome === "wrong" ? "correction" : request.outcome === "revealed" ? "reveal" : "reinforce";
  return { play: true, text: target, reason, key };
}

/**
 * P2.4 — autoplay bloqueado (Safari/iOS sem gesto) não trava nada. O botão de
 * replay continua sendo a saída, e é sempre renderizado — não é um fallback que
 * aparece só quando falha.
 */
export interface FeedbackAudioAffordance {
  /** O botão 🔊 ouvir deve existir sempre que há alvo mandarim. */
  showReplayButton: boolean;
  /** Aviso discreto de que o navegador bloqueou o autoplay. */
  blockedHint: boolean;
}

export function feedbackAudioAffordance(input: {
  hasMandarinTarget: boolean;
  autoplayBlocked: boolean;
  soundEnabled: boolean;
}): FeedbackAudioAffordance {
  return {
    showReplayButton: input.hasMandarinTarget && input.soundEnabled,
    blockedHint: input.hasMandarinTarget && input.soundEnabled && input.autoplayBlocked,
  };
}

/**
 * P17 — sequência de sons ao encerrar: primeiro o alvo do feedback, e só
 * depois do Continuar a celebração. Esta função descreve a ordem para quem
 * agenda; nunca devolve dois sons simultâneos.
 */
export function feedbackToVictorySequence(input: {
  hasFeedbackAudio: boolean;
  isLastItem: boolean;
}): Array<"feedbackTarget" | "victory"> {
  const sequence: Array<"feedbackTarget" | "victory"> = [];
  if (input.hasFeedbackAudio) sequence.push("feedbackTarget");
  if (input.isLastItem) sequence.push("victory");
  return sequence;
}
