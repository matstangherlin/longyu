/**
 * RC2.2.28 — áudio gate da UI (Guided Try e passos com trava de ouvir).
 *
 * Nenhuma tela pode ficar disabled forever.
 *
 *   NOT_TRIED → PLAYING → HEARD
 *            ↘ DEGRADED (erro / timeout / TTS off / asset fail)
 *
 * CTA enabled quando HEARD ou DEGRADED.
 */
export type AudioGateState = "NOT_TRIED" | "PLAYING" | "HEARD" | "DEGRADED";

export function audioGateCtaEnabled(state: AudioGateState): boolean {
  return state === "HEARD" || state === "DEGRADED";
}

export function audioGateFromPlayback(input: {
  tried: boolean;
  playing: boolean;
  heard: boolean;
  failed: boolean;
  unavailable: boolean;
  degradedChoice?: boolean;
}): AudioGateState {
  if (input.heard) return "HEARD";
  if (input.degradedChoice || input.failed || input.unavailable) return "DEGRADED";
  if (input.playing) return "PLAYING";
  if (!input.tried) return "NOT_TRIED";
  // Tentou e ainda não confirmou: permanece PLAYING (STARTING conta como PLAYING
  // para o prazo; o deadline da UI força DEGRADED).
  return "PLAYING";
}

/** Erro do player → DEGRADED (nunca IDLE eterno). */
export function audioGateOnPlayerError(prev: AudioGateState): AudioGateState {
  if (prev === "HEARD") return "HEARD";
  return "DEGRADED";
}

export function audioGateOnDeadline(prev: AudioGateState): AudioGateState {
  if (prev === "HEARD" || prev === "DEGRADED") return prev;
  return "DEGRADED";
}
