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
import { isTTSAvailable, speak, getNativeTtsUnavailableReason, usesNativeVoice, noteUserGesture, type SpeakOptions } from "./tts";
import { traceCurrentLessonStep } from "./lessonStepTrace";
import { deviceQaEnabled, recordDeviceQaObservation } from "./deviceQa";
import { claimAudio, releaseAudio } from "./audioArbiter";
import { recordTechEvent, type TechEventName } from "./techEvents";
import { stopSpeaking } from "./tts";

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
 * RC2.2.22 — WebKit/Firefox às vezes disparam onstart e nunca onend. Sem teto
 * depois do start, o Continuar do contraste (e qualquer UI que espere a
 * Promise) fica disabled para sempre. Consideramos ENDED e soltamos o áudio.
 */
export const PLAYBACK_END_TIMEOUT_MS = 8_000;

/**
 * Asset canônico gravado por falante, se existir para o texto. A auditoria
 * RC2.2.17 · G (你好 谢谢 再见 我 你 好 妈 麻 马 骂) não encontrou nenhum no
 * repositório: o mapa fica vazio até existir gravação com origem registrada.
 * Nunca baixar áudio aleatório.
 */
export const CANONICAL_AUDIO_ASSETS: Readonly<Record<string, string>> = {};

/** Códigos que significam "falta a voz chinesa", não "falhou agora". */
const UNAVAILABLE_CODE = /^(TTS_LANGUAGE_MISSING_DATA|TTS_LANGUAGE_NOT_SUPPORTED|TTS_UNAVAILABLE|TTS_NATIVE_PLUGIN_UNAVAILABLE|WEB_TTS_UNAVAILABLE)$/;

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
    // RC2.2.20 — também no APK de diagnóstico / Preview / QA Candidate.
    if (deviceQaEnabled()) return true;
    return Boolean(import.meta.env?.DEV) || import.meta.env?.VITE_USE_TEST_FIXTURES === "true";
  } catch {
    return false;
  }
}

const TECH_EVENT_FOR: Record<PlaybackTraceEntry["event"], TechEventName> = {
  request: "audio_requested",
  start: "audio_started",
  end: "audio_ended",
  error: "audio_failed",
  timeout: "audio_failed",
  unavailable: "audio_failed",
};

function record(entry: PlaybackTraceEntry): void {
  if (!traceEnabled()) return;
  // RC2.2.21 — mesmo evento no buffer técnico do /qa/device (sem o texto).
  recordTechEvent(TECH_EVENT_FOR[entry.event], { engine: entry.engine, reason: entry.reason ?? null });
  if (entry.event === "error" || entry.event === "timeout" || entry.event === "unavailable") {
    recordDeviceQaObservation("audio_failed", `${entry.engine} · ${entry.event}${entry.reason ? ` · ${entry.reason}` : ""}`);
  }
  // RC2.2.19 — o mesmo pedido/início aparece na trilha do passo atual.
  if (entry.event === "request") traceCurrentLessonStep("audio_requested");
  else if (entry.event === "start") traceCurrentLessonStep("audio_started");
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
  /** Teto após onstart quando o motor não dispara onend (default: PLAYBACK_END_TIMEOUT_MS). */
  endTimeoutMs?: number;
  /** RC2.2.24 — identidade desta reprodução (Android correlaciona os eventos por ela). */
  requestId?: string;
  /** RC2.2.24 — eventos de TTS DESTA reprodução (diagnóstico e motivo do CTA). */
  onTtsEvent?: SpeakOptions["onTtsEvent"];
}

function engineFor(text: string): PlaybackEngine {
  if (usesNativeVoice()) return "native-tts";
  if (CANONICAL_AUDIO_ASSETS[text]) return "asset";
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
    /** RC2.2.21 — posse do áudio (voz modelo); liberada ao terminar/falhar. */
    let claim: number | null = null;
    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimer();
      if (claim != null) releaseAudio("TTS", claim);
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
    // A voz modelo interrompe gravação/reprodução própria/escuta em curso.
    claim = claimAudio("TTS", () => stopSpeaking());
    emit("STARTING");

    const armEndTimeout = () => {
      clearTimer();
      timer = setTimeout(() => {
        if (settled) return;
        // Motor confirmou início mas não fechou — corta e libera a UI.
        try {
          stopSpeaking();
        } catch {
          /* ignore */
        }
        outcome.ended = true;
        outcome.reason = outcome.reason ?? "NO_END_TIMEOUT";
        record({ at: Date.now(), engine, event: "end", reason: "NO_END_TIMEOUT" });
        emit("ENDED");
        settle();
      }, options.endTimeoutMs ?? PLAYBACK_END_TIMEOUT_MS);
    };

    const onStart = () => {
      if (settled || outcome.started) return;
      outcome.started = true;
      record({ at: Date.now(), engine, event: "start" });
      emit("PLAYING");
      armEndTimeout();
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
      requestId: options.requestId,
      onTtsEvent: options.onTtsEvent,
      onstart: onStart,
      onerror: onError,
      onend: onEnd,
    });
  });
}
