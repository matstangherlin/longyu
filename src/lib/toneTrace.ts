/**
 * RC2.2.24 — Tone Trace: memorizar o CONTORNO passando o dedo por ele.
 *
 * Não existe análise de pitch: o exercício treina memória, percepção e
 * contorno. Nunca diz "seu tom ficou correto". Pointer Events (mouse, toque,
 * caneta — o mesmo componente). Haptic discreto só no início correto e no
 * fim do contorno; nunca vibração contínua.
 *
 *   linha completa → linha parcial → pontos-guia → sem linha
 * (depois: escolha de memória, palavra real, frase — os estágios seguintes da
 * microaula). Tone Trace nunca é o único caminho: Ouvir + escolher contorno.
 */
export const TONE_TRACE_LEVELS = ["FULL_LINE", "PARTIAL_LINE", "GUIDE_DOTS", "NO_LINE"] as const;
export type ToneTraceLevel = (typeof TONE_TRACE_LEVELS)[number];

export const TONE_TRACE_INSTRUCTION = "Passe o dedo pela forma do tom.";
/** O traço só conta se começar perto do início do contorno. */
export const TRACE_START_WINDOW = 0.18;
/** E termina perto do fim. */
export const TRACE_COMPLETE_AT = 0.9;
/** Nada aqui mede a voz. */
export const TONE_TRACE_MEASURES_PITCH = false as const;

export interface TracePoint {
  x: number;
  y: number;
}

/** Amostra mais próxima na horizontal (o contorno é função do tempo). */
export function nearestSampleIndex(samples: readonly TracePoint[], x: number): number {
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;
  samples.forEach((point, index) => {
    const d = Math.abs(point.x - x);
    if (d < distance) {
      distance = d;
      best = index;
    }
  });
  return best;
}

/** Progresso só anda para a frente (voltar o dedo não "desfaz" o traço). */
export function advanceTraceProgress(previous: number, sampleIndex: number, sampleCount: number): number {
  if (sampleCount <= 1) return 1;
  return Math.max(previous, sampleIndex / (sampleCount - 1));
}

export function traceStartsCorrectly(sampleIndex: number, sampleCount: number): boolean {
  return sampleCount <= 1 || sampleIndex / (sampleCount - 1) <= TRACE_START_WINDOW;
}

export function traceComplete(progress: number): boolean {
  return progress >= TRACE_COMPLETE_AT;
}

/** Depois de um traço completo, a ajuda visual diminui um degrau. */
export function nextTraceLevel(level: ToneTraceLevel): ToneTraceLevel {
  const index = TONE_TRACE_LEVELS.indexOf(level);
  return TONE_TRACE_LEVELS[Math.min(TONE_TRACE_LEVELS.length - 1, index + 1)];
}

/** Feedback do traço: sobre o MOVIMENTO, nunca sobre a voz. */
export function traceFeedback(level: ToneTraceLevel, completed: boolean): string {
  if (!completed) return "Comece pelo início da linha.";
  return level === "NO_LINE" ? "✓ Você lembrou a forma." : "✓ Forma completa.";
}
