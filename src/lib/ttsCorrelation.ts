/**
 * RC2.2.24 — ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED.
 *
 * O aluno ouvia a voz no APK e o Continuar ficava desligado: o evento de
 * início do motor chegava a um listener global SEM identidade da fala,
 * instalado só no primeiro play (depois do speak, no cold start) — o
 * primeiro START se perdia, e um START antigo podia "liberar" outra fala.
 *
 * Contrato novo: cada reprodução tem `requestId` (JS) e `utteranceId`
 * (nativo). O plugin emite TTS_QUEUED / TTS_STARTED / TTS_DONE / TTS_STOPPED /
 * TTS_ERROR, cada um com requestId, utteranceId, timestamp e engineState —
 * NUNCA o texto falado. Só o evento cuja requestId é a da reprodução ativa
 * muda o estado dela.
 *
 *   IDLE → REQUESTED → (QUEUED) → STARTED → HEARD → DONE
 *
 * O CTA libera com STARTED confirmado OU DONE confirmado DAQUELA fala. DONE
 * sem START recebido = TTS_START_EVENT_MISSED, mas a reprodução conta como
 * confirmada (o aluno não fica preso). Sem START nem DONE = erro explícito.
 *
 * Módulo puro (sem Capacitor, sem store): o gate executa a partir do texto.
 */
/**
 * RC2.2.27 — TTS_ENGINE_SPEAKING: `tts.isSpeaking()` == true para a request
 * CORRENTE (fonte independente do UtteranceProgressListener). TTS_SUPERSEDED:
 * a request foi substituída por outra antes de terminar (terminal explícito).
 */
export const TTS_EVENT_TYPES = ["TTS_REQUESTED", "TTS_QUEUED", "TTS_STARTED", "TTS_ENGINE_SPEAKING", "TTS_DONE", "TTS_STOPPED", "TTS_SUPERSEDED", "TTS_ERROR"] as const;
export type TtsEventType = (typeof TTS_EVENT_TYPES)[number];

export interface TtsEvent {
  type: TtsEventType;
  requestId: string;
  utteranceId: string | null;
  timestamp: number;
  /** Estado do motor (ex.: ready, speaking, idle, error) — nunca o texto. */
  engineState: string;
  /** Código estável quando TTS_ERROR (TTS_SPEAK_FAILED, TTS_LANGUAGE_MISSING_DATA…). */
  code?: string | null;
  source?: TtsAckSource;
}

/** Quem confirmou: listener (event), ACK direto, consulta de estado, ou isSpeaking do motor. */
export type TtsAckSource = "event" | "direct" | "query" | "engine";

export type TtsPhase = "IDLE" | "REQUESTED" | "QUEUED" | "STARTED" | "HEARD" | "DONE" | "STOPPED" | "ERROR";

export interface TtsPlayback {
  requestId: string | null;
  phase: TtsPhase;
  /** DONE chegou sem START: registrado, mas a fala conta como tocada. */
  startEventMissed: boolean;
  code: string | null;
  /** Tipos de evento aplicados (diagnóstico; sem texto). */
  events: TtsEventType[];
  /** Eventos de OUTRA fala ignorados (um START antigo nunca libera a atual). */
  ignoredForeign: number;
  ackSources?: TtsAckSource[];
}

export const IDLE_TTS_PLAYBACK: TtsPlayback = { requestId: null, phase: "IDLE", startEventMissed: false, code: null, events: [], ignoredForeign: 0 };

let requestSeq = 0;
/** Identidade da reprodução no JS. Não carrega texto. */
export function newTtsRequestId(now: number = Date.now()): string {
  requestSeq += 1;
  return `tts-${now.toString(36)}-${requestSeq}`;
}

export function beginTtsPlayback(requestId: string): TtsPlayback {
  return { requestId, phase: "REQUESTED", startEventMissed: false, code: null, events: ["TTS_REQUESTED"], ignoredForeign: 0 };
}

const TERMINAL: readonly TtsPhase[] = ["DONE", "STOPPED", "ERROR"];

/** Aplica um evento. Evento de outra requestId NUNCA muda esta reprodução. */
export function applyTtsEvent(state: TtsPlayback, event: TtsEvent): TtsPlayback {
  if (!state.requestId || event.requestId !== state.requestId) return { ...state, ignoredForeign: state.ignoredForeign + 1 };
  const events = [...state.events, event.type];
  const ackSources = event.type === "TTS_STARTED" || event.type === "TTS_ENGINE_SPEAKING" || event.type === "TTS_DONE"
    ? Array.from(new Set([...(state.ackSources ?? []), event.source ?? "event"])) as TtsPlayback["ackSources"]
    : state.ackSources;
  switch (event.type) {
    case "TTS_REQUESTED":
      return { ...state, events };
    case "TTS_QUEUED":
      return state.phase === "REQUESTED" ? { ...state, phase: "QUEUED", events } : { ...state, events };
    case "TTS_ENGINE_SPEAKING":
    case "TTS_STARTED":
      if (TERMINAL.includes(state.phase) && state.phase !== "STOPPED") return { ...state, events, ackSources };
      // Começou = o aluno está ouvindo (HEARD). START tardio depois de DONE não regride.
      return { ...state, phase: state.phase === "DONE" ? "DONE" : "HEARD", events, ackSources };
    case "TTS_DONE": {
      const heardBefore = state.phase === "STARTED" || state.phase === "HEARD";
      return { ...state, phase: "DONE", startEventMissed: state.startEventMissed || !heardBefore, events, ackSources };
    }
    case "TTS_SUPERSEDED":
    case "TTS_STOPPED":
      // Interrompida por outra fala/tela: se já tinha começado, o que foi ouvido vale.
      return state.phase === "HEARD" || state.phase === "STARTED" || state.phase === "DONE" ? { ...state, events } : { ...state, phase: "STOPPED", events };
    case "TTS_ERROR":
      if (state.phase === "DONE") return { ...state, events };
      return { ...state, phase: "ERROR", code: event.code ?? "TTS_ERROR", events };
    default:
      return state;
  }
}

/** A reprodução DESTA fala foi confirmada pelo motor (START ou DONE). */
export function ttsPlaybackConfirmed(state: TtsPlayback): boolean {
  return state.phase === "STARTED" || state.phase === "HEARD" || state.phase === "DONE";
}

export type TtsCtaReason = "IDLE" | "WAITING_ENGINE" | "PLAYBACK_STARTED" | "PLAYBACK_DONE" | "START_EVENT_MISSED_DONE" | "PLAYBACK_FAILED" | "PLAYBACK_STOPPED";

/** Por que o CTA está (des)ligado — exposto no diagnóstico do /qa. */
export function ttsCtaReason(state: TtsPlayback): TtsCtaReason {
  if (state.phase === "IDLE") return "IDLE";
  if (state.phase === "REQUESTED" || state.phase === "QUEUED") return "WAITING_ENGINE";
  if (state.phase === "STARTED" || state.phase === "HEARD") return "PLAYBACK_STARTED";
  if (state.phase === "DONE") return state.startEventMissed ? "START_EVENT_MISSED_DONE" : "PLAYBACK_DONE";
  if (state.phase === "STOPPED") return "PLAYBACK_STOPPED";
  return "PLAYBACK_FAILED";
}

/** O CTA libera só com a confirmação da MESMA fala. */
export function ttsCtaEnabled(state: TtsPlayback): boolean {
  return ttsPlaybackConfirmed(state);
}

/**
 * Normaliza o payload cru do plugin. Qualquer campo de texto (`text`,
 * `utterance`, `spoken`) é descartado: diagnóstico nunca guarda o que foi dito.
 */
export function sanitizeTtsEvent(raw: unknown): TtsEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = String(value.type ?? "");
  if (!(TTS_EVENT_TYPES as readonly string[]).includes(type)) return null;
  const requestId = typeof value.requestId === "string" ? value.requestId : "";
  if (!requestId) return null;
  return {
    type: type as TtsEventType,
    requestId,
    utteranceId: typeof value.utteranceId === "string" ? value.utteranceId : null,
    timestamp: typeof value.timestamp === "number" ? value.timestamp : Date.now(),
    engineState: typeof value.engineState === "string" ? value.engineState : "unknown",
    code: typeof value.code === "string" ? value.code : null,
    source: type === "TTS_ENGINE_SPEAKING" ? "engine" : "event",
  };
}

// ── Trilha de diagnóstico (memória, sem texto) ────────────────────────────

const TRACE_LIMIT = 40;
const trace: TtsEvent[] = [];
let activeRequestId: string | null = null;
let lastEngineState = "unknown";

export function recordTtsTrace(event: TtsEvent): void {
  trace.push(event);
  lastEngineState = event.engineState;
  if (trace.length > TRACE_LIMIT) trace.splice(0, trace.length - TRACE_LIMIT);
}

export function setActiveTtsRequest(requestId: string | null): void {
  activeRequestId = requestId;
}

export function ttsDiagnostics(): { activeRequestId: string | null; engineState: string; trace: readonly TtsEvent[] } {
  return { activeRequestId, engineState: lastEngineState, trace: trace.slice() };
}

export function resetTtsCorrelationForTests(): void {
  trace.length = 0;
  activeRequestId = null;
  lastEngineState = "unknown";
  requestSeq = 0;
}
