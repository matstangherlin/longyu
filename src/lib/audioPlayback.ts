/**
 * RC2.2.17 · B/C — contrato de reprodução do áudio em mandarim.
 *
 * Um toque no 🔊 não é "ouviu". O estado só vira PLAYING quando o motor avisa
 * que a fala começou (Web: `utterance.onstart`; Android: `onStart` do
 * UtteranceProgressListener) e só vira ENDED quando ela termina depois de ter
 * começado. Tudo o que não chega lá termina em FAILED ou UNAVAILABLE, com um
 * motivo — nunca em silêncio.
 *
 * Ordem de fonte (Part F): asset canônico → TTS nativo (Android) → Web TTS →
 * fallback textual explícito (quem chama mostra hànzì/pinyin/significado e
 * "Continuar sem áudio"). A auditoria (Part G) não encontrou assets de áudio
 * no repositório, então hoje a primeira fonte real é o TTS. Nenhum áudio
 * "falso" é gerado.
 *
 * Evolui tts.ts (mesmo speak()); não é outro motor de voz.
 */
import { isTTSAvailable, speak, getNativeTtsUnavailableReason, usesNativeVoice, noteUserGesture } from "./tts";

export type PlaybackState = "IDLE" | "STARTING" | "PLAYING" | "ENDED" | "FAILED" | "UNAVAILABLE";

export type PlaybackEngine = "asset" | "native-tts" | "web-tts" | "none";

export interface PlaybackOutcome {
  /** O motor confirmou o início da fala. */
  started: boolean;
  /** A fala terminou DEPOIS de ter começado. */
  ended: boolean;
  /** Tentou e não tocou (erro do motor, sem início dentro do prazo). */
  failed: boolean;
  /** Não há motor/voz chinesa neste aparelho agora. */
  unavailable: boolean;
  /** Código estável (TTS_LANGUAGE_MISSING_DATA, WEB_TTS_UNAVAILABLE, NO_START_TIMEOUT…). */
  reason: string | null;
  engine: PlaybackEngine;
  /** Uma chamada mais nova substituiu esta (o aluno tocou de novo). */
  superseded: boolean;
}

/** Sem início neste prazo = falha perceptível, não espera infinita (Part J). */
export const PLAYBACK_START_TIMEOUT_MS = 6000;

/**
 * Asset canônico gravado por falante, se existir para o texto. A auditoria
 * RC2.2.17 · G (你好 谢谢 再见 我 你 好 妈 麻 马 骂) não encontrou nenhum no
 * repositório: o mapa fica vazio até existir gravação com origem registrada.
 * Nunca baixar áudio aleatório.
 */
export const CANONICAL_AUDIO_ASSETS: Readonly<Record<string, string>> = {};

/** Códigos que significam "falta a voz chinesa", não "falhou agora". */
const UNAVAILABLE_CODE = /^(TTS_LANGUAGE_MISSING_DATA|TTS_LANGUAGE_NOT_SUPPORTED|TTS_UNAVAILABLE|WEB_TTS_UNAVAILABLE)$/;

export function isVoiceMissingReason(reason: string | null | undefined): boolean {
  return reason === "TTS_LANGUAGE_MISSING_DATA" || reason === "TTS_LANGUAGE_NOT_SUPPORTED";
}

/** Só a falta de DADOS da voz tem instalação pelo Android (Part I). */
export function canOfferVoiceInstall(reason: string | null | undefined): boolean {
  return usesNativeVoice() && isVoiceMissingReason(reason);
}

// ── Diagnóstico DEV (Part H) — sem PII: nunca o texto, só o tamanho ─────────

export interface PlaybackTraceEntry {
  at: number;
  engine: PlaybackEngine;
  event: "request" | "start" | "end" | "error" | "timeout" | "unavailable";
  reason?: string | null;
  chars?: number;
}

const TRACE_LIMIT = 40;
const trace: PlaybackTraceEntry[] = [];

function traceEnabled(): boolean {
  try {
    return Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_USE_TEST_FIXTURES === "true";
  } catch {
    return false;
  }
}

function record(entry: PlaybackTraceEntry): void {
  if (!traceEnabled()) return;
  trace.push(entry);
  if (trace.length > TRACE_LIMIT) trace.splice(0, trace.length - TRACE_LIMIT);
  if (typeof window !== "undefined") {
    (window as Window & { __longyuAudioTrace?: PlaybackTraceEntry[] }).__longyuAudioTrace = trace.slice();
  }
}

export function playbackTrace(): readonly PlaybackTraceEntry[] {
  return trace.slice();
}

// ── Reprodução ────────────────────────────────────────────────────────────

let generation = 0;

export interface PlayMandarinOptions {
  rate?: number;
  onState?: (state: PlaybackState, outcome: PlaybackOutcome) => void;
  startTimeoutMs?: number;
}

function engineFor(text: string): PlaybackEngine {
  if (CANONICAL_AUDIO_ASSETS[text]) return "asset";
  if (usesNativeVoice()) return "native-tts";
  if (isTTSAvailable()) return "web-tts";
  return "none";
}

function playAsset(url: string, onStart: () => void, onEnd: () => void, onError: (reason: string) => void): void {
  try {
    const audio = new Audio(url);
    audio.onplaying = onStart;
    audio.onended = onEnd;
    audio.onerror = () => onError("ASSET_PLAYBACK_FAILED");
    void audio.play().catch(() => onError("ASSET_PLAYBACK_BLOCKED"));
  } catch {
    onError("ASSET_PLAYBACK_FAILED");
  }
}

/**
 * Toca `text` e resolve com o que o motor REALMENTE fez. `onState` recebe a
 * sequência IDLE→STARTING→PLAYING→ENDED (ou FAILED/UNAVAILABLE). Uma chamada
 * nova torna a anterior `superseded` (seus callbacks param de valer).
 */
export function playMandarinAudio(text: string, options: PlayMandarinOptions = {}): Promise<PlaybackOutcome> {
  const clean = String(text ?? "").trim();
  const token = ++generation;
  const engine = engineFor(clean);
  const outcome: PlaybackOutcome = {
    started: false,
    ended: false,
    failed: false,
    unavailable: false,
    reason: null,
    engine,
    superseded: false,
  };
  const emit = (state: PlaybackState) => {
    if (token !== generation) return;
    options.onState?.(state, { ...outcome });
  };

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (token !== generation) outcome.superseded = true;
      resolve({ ...outcome });
    };

    if (!clean) {
      outcome.failed = true;
      outcome.reason = "EMPTY_TEXT";
      emit("FAILED");
      settle();
      return;
    }

    record({ at: Date.now(), engine, event: "request", chars: clean.length });

    if (engine === "none") {
      outcome.unavailable = true;
      outcome.reason = "WEB_TTS_UNAVAILABLE";
      record({ at: Date.now(), engine, event: "unavailable", reason: outcome.reason });
      emit("UNAVAILABLE");
      settle();
      return;
    }

    noteUserGesture();
    emit("STARTING");

    const onStart = () => {
      if (settled || outcome.started) return;
      outcome.started = true;
      record({ at: Date.now(), engine, event: "start" });
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      emit("PLAYING");
    };
    const onError = (reason?: string) => {
      if (settled) return;
      const code = reason || (usesNativeVoice() ? getNativeTtsUnavailableReason() : null) || "PLAYBACK_FAILED";
      outcome.reason = code;
      if (UNAVAILABLE_CODE.test(code)) outcome.unavailable = true;
      else outcome.failed = true;
      record({ at: Date.now(), engine, event: "error", reason: code });
      emit(outcome.unavailable ? "UNAVAILABLE" : "FAILED");
      settle();
    };
    const onEnd = () => {
      if (settled) return;
      if (!outcome.started) {
        // Terminou sem ter começado: nada foi ouvido.
        onError(outcome.reason ?? "ENDED_WITHOUT_START");
        return;
      }
      outcome.ended = true;
      record({ at: Date.now(), engine, event: "end" });
      emit("ENDED");
      settle();
    };

    timer = setTimeout(() => {
      if (settled || outcome.started) return;
      record({ at: Date.now(), engine, event: "timeout" });
      onError("NO_START_TIMEOUT");
    }, options.startTimeoutMs ?? PLAYBACK_START_TIMEOUT_MS);

    if (engine === "asset") {
      playAsset(CANONICAL_AUDIO_ASSETS[clean], onStart, onEnd, onError);
      return;
    }
    speak(clean, {
      rate: options.rate,
      onstart: onStart,
      onerror: onError,
      onend: onEnd,
    });
  });
}
