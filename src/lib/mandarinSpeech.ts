/**
 * RC2.2.27 — UM contrato de sessão de fala mandarim (sem motor novo).
 *
 * Antes havia dois caminhos com ciclos de vida diferentes:
 *   manual:   playMandarinAudio → audioArbiter → speak()
 *   autoplay: SpeechBubble → useAutoSpeak → scheduleAutoSpeak → speak()  (sem árbitro,
 *             sem requestId próprio, cleanup cancelava só o timer)
 *
 * Agora toda fala — manual ou automática, de qualquer superfície — passa por
 * `requestMandarinSpeech`: mesma identidade (requestId), mesma posse de áudio,
 * mesma correlação nativa, mesmo cancelamento e o mesmo diagnóstico. Quem
 * criou a request é o dono dela: ao desmontar, cancela SÓ a sua.
 */
import { playMandarinAudio, cancelOwnSpeech, type PlaybackOutcome, type PlaybackState } from "./audioPlayback";
import { hasRecentTtsGesture, warmUpVoices, type SpeakOptions } from "./tts";
import { hasNativeSpeech } from "./platform/nativeSpeech";
import { newTtsRequestId } from "./ttsCorrelation";
import { useStore } from "./store";

export const MANDARIN_SPEECH_SOURCES = [
  "GUIDED_TRY",
  "LESSON_AUDIO",
  "CONVERSATION_AUTOPLAY",
  "CONVERSATION_MANUAL",
  "TONE",
  "REVIEW",
  "CULTURE",
  "IMMERSION",
  "PINYIN",
  "SPEAKING_MODEL",
  "QA_DIAGNOSTIC",
] as const;
export type MandarinSpeechSource = (typeof MANDARIN_SPEECH_SOURCES)[number];
export type MandarinSpeechMode = "USER_REQUESTED" | "AUTO_PLAY";

export interface MandarinSpeechRequest {
  text: string;
  source: MandarinSpeechSource;
  mode: MandarinSpeechMode;
  requestId?: string;
  rate?: number;
  onState?: (state: PlaybackState, outcome: PlaybackOutcome) => void;
  onTtsEvent?: SpeakOptions["onTtsEvent"];
}

export interface MandarinSpeechHandle {
  requestId: string;
  done: Promise<PlaybackOutcome>;
  /** Cancela SÓ esta request se ainda estiver na fila ou tocando. */
  cancel: () => void;
}

/** Linha do diagnóstico JS (sem texto). */
export interface MandarinSpeechLogEntry {
  requestId: string;
  source: MandarinSpeechSource;
  mode: MandarinSpeechMode;
  at: number;
  result: "PENDING" | "HEARD" | "ENDED" | "FAILED" | "UNAVAILABLE" | "SUPERSEDED" | "CANCELLED";
  reason: string | null;
}

const LOG_LIMIT = 20;
const log: MandarinSpeechLogEntry[] = [];
const active = new Map<string, { token: number; settled: boolean }>();
let tokenSeq = 0;

export function mandarinSpeechLog(): readonly MandarinSpeechLogEntry[] {
  return log.slice();
}

function remember(entry: MandarinSpeechLogEntry): MandarinSpeechLogEntry {
  log.push(entry);
  if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT);
  return entry;
}

export function requestMandarinSpeech(request: MandarinSpeechRequest): MandarinSpeechHandle {
  const requestId = request.requestId ?? newTtsRequestId();
  const entry = remember({ requestId, source: request.source, mode: request.mode, at: Date.now(), result: "PENDING", reason: null });
  const slot = { token: ++tokenSeq, settled: false };
  active.set(requestId, slot);
  const done = playMandarinAudio(request.text, {
    rate: request.rate,
    requestId,
    source: request.source,
    userGesture: request.mode === "USER_REQUESTED",
    onState: request.onState,
    onTtsEvent: request.onTtsEvent,
  }).then((outcome) => {
    slot.settled = true;
    active.delete(requestId);
    if (entry.result === "PENDING") {
      entry.result = outcome.started ? (outcome.ended ? "ENDED" : "HEARD") : outcome.superseded ? "SUPERSEDED" : outcome.unavailable ? "UNAVAILABLE" : "FAILED";
      entry.reason = outcome.reason;
    }
    return outcome;
  });
  return {
    requestId,
    done,
    cancel: () => cancelMandarinSpeech(requestId),
  };
}

/** Cancela a request se ela ainda está viva. Fala de outro dono nunca é tocada. */
export function cancelMandarinSpeech(requestId: string): void {
  const slot = active.get(requestId);
  if (!slot || slot.settled) return;
  const entry = log.find((item) => item.requestId === requestId);
  if (entry && entry.result === "PENDING") entry.result = "CANCELLED";
  cancelOwnSpeech(requestId);
}

/**
 * Cancela TODAS as falas vivas deste runtime (cada uma pelo próprio requestId).
 * Uso: a conclusão da lição encerra a última fala pedagógica antes do som de
 * conclusão — nunca dois sons por cima um do outro.
 */
export function cancelAllMandarinSpeech(): void {
  for (const requestId of [...active.keys()]) cancelMandarinSpeech(requestId);
}

export function mandarinSpeechActive(requestId: string): boolean {
  const slot = active.get(requestId);
  return Boolean(slot && !slot.settled);
}

function autoSpeakDelayMs(requested?: number): number {
  if (requested != null) return requested;
  // Gesto fresco: falar na mesma janela de ativação (Safari/iOS).
  return hasRecentTtsGesture(2500) ? 0 : 120;
}

export interface AutoSpeakOptions {
  rate?: number;
  delayMs?: number;
  source?: MandarinSpeechSource;
  /** O motor confirmou o início (nunca no agendamento). */
  onstart?: () => void;
  /** Terminou, falhou, foi substituída ou cancelada — sempre chega uma vez. */
  onend?: () => void;
}

/**
 * Agenda fala automática ao montar/trocar conteúdo, pelo MESMO runtime da
 * fala manual. Cleanup: cancela o timer pendente E a própria request se ela
 * ainda estiver na fila/tocando (nunca a fala de outro componente).
 * Respeita `autoPlayAudio` do store.
 */
export function scheduleAutoSpeak(text: string, opts: AutoSpeakOptions = {}): () => void {
  const clean = String(text ?? "").trim();
  if (!clean) return () => {};
  if (useStore.getState().autoPlayAudio === false) return () => {};

  let cancelled = false;
  let handle: MandarinSpeechHandle | null = null;
  const delayMs = autoSpeakDelayMs(opts.delayMs);
  const recentGesture = hasRecentTtsGesture(800);
  const speakNow = () => {
    if (cancelled) return;
    let startedNotified = false;
    handle = requestMandarinSpeech({
      text: clean,
      source: opts.source ?? "LESSON_AUDIO",
      mode: "AUTO_PLAY",
      rate: opts.rate,
      onState: (state) => {
        if (state === "PLAYING" && !startedNotified) {
          startedNotified = true;
          opts.onstart?.();
        }
      },
    });
    void handle.done.then(() => opts.onend?.());
  };

  const run = () => {
    if (cancelled) return;
    // Android: TTS nativo não depende de gesto nem de carregar vozes do navegador.
    if (hasNativeSpeech() || recentGesture) {
      speakNow();
      return;
    }
    void warmUpVoices().then(speakNow);
  };

  let timer: ReturnType<typeof setTimeout> | null = null;
  if (delayMs === 0 && recentGesture) run();
  else timer = setTimeout(run, delayMs);
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    // RC2.2.27 — a bolha que desmonta cancela SÓ a sua fala, se ainda viva.
    const own = handle as MandarinSpeechHandle | null;
    if (own && mandarinSpeechActive(own.requestId)) own.cancel();
  };
}
