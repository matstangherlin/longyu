/**
 * RC2.2.28 — contrato de reprodução do áudio em mandarim.
 * RC2.2.32 — FIXED_CONTENT: asset → player → DEGRADED (sem TTS silencioso).
 *
 * Ordem para conteúdo fixo:
 *   CANONICAL ASSET → NATIVE MEDIA PLAYER → estado degradado explícito
 *
 * TTS permanece somente para DYNAMIC / QA. Conteúdo fixo que cairia em
 * native/web TTS registra FIXED_CONTENT_NATIVE_TTS_FALLBACK (gate ZERO).
 *
 * Evolui o contrato RC2.2.17 (PlaybackState / PlaybackOutcome) — não é outro
 * motor de voz; é a mesma API com asset-first.
 */
import { isTTSAvailable, speak, getNativeTtsUnavailableReason, usesNativeVoice, noteUserGesture, type SpeakOptions } from "./tts";
import { traceCurrentLessonStep } from "./lessonStepTrace";
import { deviceQaEnabled, recordDeviceQaObservation } from "./deviceQa";
import { claimAudio, releaseAudio } from "./audioArbiter";
import { recordTechEvent, type TechEventName } from "./techEvents";
import { stopSpeaking } from "./tts";
import { newTtsRequestId } from "./ttsCorrelation";
import { nativeCancelSpeak } from "./platform/nativeSpeech";
import { CANONICAL_AUDIO_ASSETS, audioEntryById, audioEntryByText, resolveCanonicalUri } from "../data/audioManifest.generated";
import { decideAudioEngine, classifyAudioSource, fixedContentAllowsTtsEngine } from "./audio/audioEnginePolicy";
import { playCanonicalAudio, cancelCanonicalAudio } from "./audio/canonicalPlayer";
import { recordVoicePlayback, type VoicePlaybackEngine } from "./audio/voiceConsistency";

export type PlaybackState = "IDLE" | "STARTING" | "PLAYING" | "ENDED" | "FAILED" | "UNAVAILABLE";

export type PlaybackEngine = "asset" | "native-media" | "native-tts" | "web-tts" | "none";

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
  /** RC2.2.27 — identidade desta reprodução (sempre presente). */
  requestId?: string;
  /** RC2.2.28 — audioId canônico quando aplicável. */
  audioId?: string | null;
}

/** Sem início neste prazo = falha perceptível, não espera infinita (Part J). */
export const PLAYBACK_START_TIMEOUT_MS = 6000;

/**
 * RC2.2.22 — WebKit/Firefox às vezes disparam onstart e nunca onend. Sem teto
 * depois do start, o Continuar do contraste (e qualquer UI que espere a
 * Promise) fica disabled para sempre. Consideramos ENDED e soltamos o áudio.
 */
export const PLAYBACK_END_TIMEOUT_MS = 8_000;

/** Re-export do manifesto — o mapa não fica mais vazio. */
export { CANONICAL_AUDIO_ASSETS };

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
  audioId?: string | null;
}

const TRACE_LIMIT = 40;
const trace: PlaybackTraceEntry[] = [];

function traceEnabled(): boolean {
  try {
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
  recordTechEvent(TECH_EVENT_FOR[entry.event], { engine: entry.engine, reason: entry.reason ?? null });
  if (entry.event === "error" || entry.event === "timeout" || entry.event === "unavailable") {
    recordDeviceQaObservation("audio_failed", `${entry.engine} · ${entry.event}${entry.reason ? ` · ${entry.reason}` : ""}`);
  }
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

/** RC2.2.28 — força TTS off (prova de independência / gate). */
let ttsForcedUnavailable = false;

export function setTtsForcedUnavailableForTests(value: boolean): void {
  ttsForcedUnavailable = value;
}

export function isTtsForcedUnavailable(): boolean {
  return ttsForcedUnavailable;
}

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
  /** RC2.2.27 — origem (GUIDED_TRY, CONVERSATION_AUTOPLAY…) para o diagnóstico. */
  source?: string;
  /** RC2.2.27 — autoplay não é gesto do aluno (não finge ativação de áudio). */
  userGesture?: boolean;
  /** RC2.2.28 — chave estável do manifesto (preferida sobre texto). */
  audioId?: string;
  /** RC2.2.28 — QA pode forçar TTS mesmo com asset. */
  qaOverride?: boolean;
  /** RC2.2.28 — justificativa quando FIXED_CONTENT cai em TTS. */
  ttsJustification?: string;
}

function resolveAsset(
  text: string,
  audioId?: string
): { uri: string; audioId: string | null; androidAssetPath?: string } | null {
  if (audioId) {
    const entry = audioEntryById(audioId);
    if (entry) {
      return {
        uri: entry.uri,
        audioId: entry.audioId,
        androidAssetPath: entry.androidAssetPath ?? entry.file,
      };
    }
  }
  const byText = audioEntryByText(text);
  if (byText) {
    return {
      uri: byText.uri,
      audioId: byText.audioId,
      androidAssetPath: byText.androidAssetPath ?? byText.file,
    };
  }
  const legacy = CANONICAL_AUDIO_ASSETS[text];
  if (legacy) {
    const path = legacy.startsWith("/") ? legacy.slice(1) : legacy;
    return { uri: legacy, audioId: null, androidAssetPath: path.startsWith("audio/") ? path : undefined };
  }
  const resolved = resolveCanonicalUri({ text, audioId });
  return resolved ? { uri: resolved, audioId: audioId ?? null } : null;
}

/**
 * RC2.2.28 — asset-first. Native TTS só quando não há asset (ou QA override /
 * conteúdo dinâmico). Nunca preferir TTS só porque estamos no Android.
 */
function engineFor(text: string, options: PlayMandarinOptions = {}): PlaybackEngine {
  const asset = resolveAsset(text, options.audioId);
  const decision = decideAudioEngine({
    source: options.source,
    hasCanonicalAsset: Boolean(asset),
    qaOverride: options.qaOverride,
    ttsJustification: options.ttsJustification,
  });
  if (ttsForcedUnavailable && decision.contentClass === "FIXED_CONTENT") {
    return asset ? "asset" : "none";
  }
  for (const pref of decision.preferred) {
    if (pref === "canonical-asset" || pref === "native-media") {
      if (asset) return "asset";
      continue;
    }
    // RC2.2.32 — FIXED nunca seleciona TTS (mesmo se a ordem legada listar).
    if (pref === "native-tts") {
      if (!fixedContentAllowsTtsEngine(decision)) continue;
      if (!ttsForcedUnavailable && usesNativeVoice()) return "native-tts";
      continue;
    }
    if (pref === "web-tts") {
      if (!fixedContentAllowsTtsEngine(decision)) continue;
      if (!ttsForcedUnavailable && isTTSAvailable()) return "web-tts";
      continue;
    }
  }
  return "none";
}

function toVoiceEngine(engine: PlaybackEngine): VoicePlaybackEngine {
  if (engine === "asset") return "canonical-asset";
  if (engine === "native-media") return "native-media";
  if (engine === "native-tts") return "native-tts";
  if (engine === "web-tts") return "web-tts";
  return "none";
}

function noteVoiceDecision(input: {
  text: string;
  source?: string;
  audioId?: string | null;
  engine: PlaybackEngine;
  assetUri?: string | null;
  fallbackOccurred?: boolean;
  fallbackReason?: string | null;
}): void {
  const contentClass = classifyAudioSource(input.source);
  recordVoicePlayback({
    audioId: input.audioId,
    text: input.text,
    source: input.source,
    contentClass,
    engineSelected: toVoiceEngine(input.engine),
    assetUsed: input.assetUri ?? null,
    fallbackOccurred: input.fallbackOccurred,
    fallbackReason: input.fallbackReason,
  });
}

/**
 * Toca `text` (e/ou `audioId`) e resolve com o que o motor REALMENTE fez.
 * Promise SEMPRE resolve — callers de UI devem usar .then/.catch/.finally;
 * esta API não rejeita (evita unhandled rejection + botão cinza).
 */
export function playMandarinAudio(text: string, options: PlayMandarinOptions = {}): Promise<PlaybackOutcome> {
  const clean = String(text ?? "").trim();
  const token = ++generation;
  const asset = resolveAsset(clean, options.audioId);
  const engine = engineFor(clean, options);
  const requestId = options.requestId ?? newTtsRequestId();
  latestRequestId = requestId;
  const outcome: PlaybackOutcome = {
    started: false,
    ended: false,
    failed: false,
    unavailable: false,
    reason: null,
    engine,
    superseded: false,
    requestId,
    audioId: asset?.audioId ?? options.audioId ?? null,
  };
  const emit = (state: PlaybackState) => {
    if (token !== generation) return;
    options.onState?.(state, { ...outcome });
  };

  // RC2.2.28 — pré-native forensics (Part 23).
  recordTechEvent("audio_request_created" as TechEventName, { requestId, engine, source: options.source ?? null });
  recordTechEvent("audio_record_enter" as TechEventName, { requestId });
  if (options.userGesture !== false) {
    recordTechEvent("audio_gesture_recorded" as TechEventName, { requestId });
  }

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let claim: number | null = null;
    let claimedOwner: "CANONICAL_MEDIA" | "TTS" | null = null;
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
      if (claim != null && claimedOwner) releaseAudio(claimedOwner, claim);
      if (token !== generation) outcome.superseded = true;
      resolve({ ...outcome });
    };

    if (!clean && !options.audioId) {
      outcome.failed = true;
      outcome.reason = "EMPTY_TEXT";
      emit("FAILED");
      settle();
      return;
    }

    record({ at: Date.now(), engine, event: "request", chars: clean.length, audioId: outcome.audioId });
    noteVoiceDecision({
      text: clean,
      source: options.source,
      audioId: outcome.audioId,
      engine,
      assetUri: asset?.uri ?? null,
      fallbackOccurred: false,
      fallbackReason: engine === "none" ? (asset ? "ASSET_ENGINE_UNAVAILABLE" : "FIXED_CONTENT_NO_ASSET_NO_TTS") : null,
    });

    if (engine === "none") {
      outcome.unavailable = true;
      outcome.reason = ttsForcedUnavailable ? "TTS_FORCED_UNAVAILABLE" : "WEB_TTS_UNAVAILABLE";
      // Fixed content sem asset: DEGRADED path — não trava UI e não troca de voz.
      if (classifyAudioSource(options.source) === "FIXED_CONTENT") {
        outcome.failed = true;
        outcome.unavailable = false;
        outcome.reason = asset ? "ASSET_ENGINE_UNAVAILABLE" : "FIXED_CONTENT_NO_ASSET_NO_TTS";
      }
      record({ at: Date.now(), engine, event: "unavailable", reason: outcome.reason, audioId: outcome.audioId });
      emit(outcome.failed ? "FAILED" : "UNAVAILABLE");
      settle();
      return;
    }

    // RC2.2.31C — gesture unlock is best-effort. Never abort before native player.
    if (options.userGesture !== false) {
      try {
        noteUserGesture();
      } catch {
        recordTechEvent("js_error", { errorClass: "GestureUnlockError", source: "playMandarinAudio" });
      }
    }
    // RC2.2.31 — asset canônico usa CANONICAL_MEDIA; TTS so para fallback.
    claimedOwner = engine === "asset" || engine === "native-media" ? "CANONICAL_MEDIA" : "TTS";
    if (claimedOwner === "CANONICAL_MEDIA") {
      claim = claimAudio("CANONICAL_MEDIA", () => cancelOwnSpeech(requestId, token));
    } else {
      claim = claimAudio("TTS", () => cancelOwnSpeech(requestId, token));
    }
    recordTechEvent("audio_owner_claimed" as TechEventName, { requestId, owner: claimedOwner });
    recordTechEvent("audio_engine_selected" as TechEventName, { requestId, engine });
    emit("STARTING");

    const armEndTimeout = () => {
      clearTimer();
      timer = setTimeout(() => {
        if (settled) return;
        cancelOwnSpeech(requestId, token);
        outcome.ended = true;
        outcome.reason = outcome.reason ?? "NO_END_TIMEOUT";
        record({ at: Date.now(), engine, event: "end", reason: "NO_END_TIMEOUT", audioId: outcome.audioId });
        emit("ENDED");
        settle();
      }, options.endTimeoutMs ?? PLAYBACK_END_TIMEOUT_MS);
    };

    const onStart = () => {
      if (settled || outcome.started) return;
      outcome.started = true;
      record({ at: Date.now(), engine, event: "start", audioId: outcome.audioId });
      emit("PLAYING");
      armEndTimeout();
    };
    const onError = (reason?: string) => {
      if (settled) return;
      const code = reason || (usesNativeVoice() ? getNativeTtsUnavailableReason() : null) || "PLAYBACK_FAILED";
      outcome.reason = code;
      if (UNAVAILABLE_CODE.test(code)) outcome.unavailable = true;
      else outcome.failed = true;
      record({ at: Date.now(), engine, event: "error", reason: code, audioId: outcome.audioId });
      emit(outcome.unavailable ? "UNAVAILABLE" : "FAILED");
      settle();
    };
    const onEnd = () => {
      if (settled) return;
      if (!outcome.started) {
        onError(outcome.reason ?? "ENDED_WITHOUT_START");
        return;
      }
      outcome.ended = true;
      record({ at: Date.now(), engine, event: "end", audioId: outcome.audioId });
      emit("ENDED");
      settle();
    };

    timer = setTimeout(() => {
      if (settled || outcome.started) return;
      record({ at: Date.now(), engine, event: "timeout", audioId: outcome.audioId });
      onError("NO_START_TIMEOUT");
    }, options.startTimeoutMs ?? PLAYBACK_START_TIMEOUT_MS);

    if (engine === "asset" && asset) {
      recordTechEvent("audio_native_call_enter" as TechEventName, { requestId, path: "canonical" });
      void playCanonicalAudio({
        audioId: asset.audioId ?? options.audioId ?? clean,
        uri: asset.uri,
        androidAssetPath: asset.androidAssetPath,
        requestId,
        onState: (state) => {
          if (state === "PLAYING") onStart();
          else if (state === "ENDED") onEnd();
          else if (state === "ERROR") onError("ASSET_PLAYBACK_FAILED");
          else if (state === "CANCELLED" || state === "SUPERSEDED") {
            outcome.superseded = state === "SUPERSEDED";
            outcome.reason = state;
            settle();
          }
        },
      })
        .then((canonical) => {
          recordTechEvent("audio_native_call_return" as TechEventName, { requestId, started: canonical.started });
          if (settled) return;
          if (canonical.cancelled || canonical.superseded) {
            outcome.superseded = canonical.superseded;
            outcome.reason = canonical.reason ?? (canonical.superseded ? "SUPERSEDED" : "CANCELLED");
            settle();
            return;
          }
          if (canonical.started && canonical.ended) {
            // playCanonical já disparou onState; garantir settle se perdemos evento.
            if (!outcome.ended) onEnd();
            return;
          }
          if (canonical.failed && !outcome.started) {
            // RC2.2.32 — FIXED_CONTENT: asset falhou → DEGRADED (sem TTS / outra voz).
            // DYNAMIC/QA ainda podem cair em TTS.
            const contentClass = classifyAudioSource(options.source);
            const allowTts =
              contentClass !== "FIXED_CONTENT" ||
              options.qaOverride === true;
            if (allowTts && !ttsForcedUnavailable && (usesNativeVoice() || isTTSAvailable())) {
              speak(clean || asset.audioId || " ", {
                rate: options.rate,
                requestId,
                source: options.source,
                onTtsEvent: options.onTtsEvent,
                onstart: onStart,
                onerror: onError,
                onend: onEnd,
              });
              outcome.engine = usesNativeVoice() ? "native-tts" : "web-tts";
              outcome.reason = "ASSET_FALLBACK_TTS";
              noteVoiceDecision({
                text: clean,
                source: options.source,
                audioId: outcome.audioId,
                engine: outcome.engine,
                assetUri: asset.uri,
                fallbackOccurred: true,
                fallbackReason: "ASSET_FALLBACK_TTS",
              });
              return;
            }
            onError(canonical.reason ?? "ASSET_PLAYBACK_FAILED");
          }
        })
        .catch(() => {
          if (!settled) onError("ASSET_PLAYBACK_FAILED");
        });
      return;
    }

    recordTechEvent("audio_native_call_enter" as TechEventName, { requestId, path: "tts" });
    speak(clean, {
      rate: options.rate,
      requestId,
      source: options.source,
      onTtsEvent: options.onTtsEvent,
      onstart: onStart,
      onerror: onError,
      onend: onEnd,
    });
  });
}

/**
 * RC2.2.27 — cancela a fala DESTA reprodução. Android: `cancelSpeak(requestId)`
 * (no-op se já terminou ou se outra é a corrente). Web: só se esta ainda é a
 * reprodução mais nova (speechSynthesis tem uma fila só).
 * RC2.2.28 — também para o player canônico.
 */
export function cancelOwnSpeech(requestId: string, token?: number): void {
  // RC2.2.31 — cancel request-aware: cleanup A nao mata B no Media3.
  void cancelCanonicalAudio(requestId);
  if (usesNativeVoice()) {
    void nativeCancelSpeak(requestId);
    return;
  }
  const stillNewest = token != null ? token === generation : latestRequestId === requestId;
  if (stillNewest) stopSpeaking();
}

/** Última reprodução pedida (Web: uma fila só no speechSynthesis). */
let latestRequestId: string | null = null;
