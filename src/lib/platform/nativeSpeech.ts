/**
 * RC2.2.13 — adapter da voz nativa (Android). Único ponto do front-end que
 * fala com o plugin interno `LongyuSpeech`
 * (android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java).
 *
 *   Web     → tts.ts / speech.ts seguem com a Web Speech API (inalterados).
 *   Android → TextToSpeech + SpeechRecognizer nativos, pelos MESMOS
 *             speak() / recognizeOnce() — nenhuma tela ganha componente próprio.
 *
 * Sem estado persistido: só consultas ao sistema operacional.
 */
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { isAndroid } from "./nativePlatform";
import { trackObserver } from "../resourceCounters";
import { recordTtsTrace, sanitizeTtsEvent, type TtsEvent } from "../ttsCorrelation";

export type NativePermission = "granted" | "denied" | "prompt" | "prompt-with-rationale";

type TtsStatus = {
  available: boolean;
  status: string;
  engine?: string | null;
  /** RC2.2.17 · H — diagnóstico (sem PII): resultado do init e locale pedido. */
  initStatus?: string;
  requestedLocale?: string;
  /** RC2.2.21 — voz modelo tocada como mídia/fala; motor recriado após instalar voz. */
  audioAttributes?: string;
  reinitialized?: boolean;
};
type RecognitionStatus = { available: boolean; onDevice: boolean; microphone: NativePermission };

/** RC2.2.17 · V — resposta de SpeechRecognizer.checkRecognitionSupport (API 33+). */
export type NativeRecognitionSupport = {
  /** false = API < 33: a checagem não existe neste Android. */
  checked: boolean;
  serviceAvailable: boolean;
  onDeviceAvailable: boolean;
  installedOnDevice: boolean;
  pendingOnDevice: boolean;
  supportedOnDevice: boolean;
  online: boolean;
  sdk: number;
  error?: string | null;
};

export type NativeModelDownloadResult = {
  /** STARTED / SCHEDULED / SUCCESS / UNSUPPORTED_API / ERROR */
  status: string;
  code?: string | null;
};

/**
 * RC2.2.21 — estados da gravação de prática, iguais no Android e no JS:
 * IDLE → PREPARING → RECORDING → STOPPING → RECORDED → PLAY_PREPARING →
 * PLAYING → PLAYED (ou FAILED). PLAYING só depois do player confirmar.
 */
export const PRACTICE_STATES = ["IDLE", "PREPARING", "RECORDING", "STOPPING", "RECORDED", "PLAY_PREPARING", "PLAYING", "PLAYED", "FAILED"] as const;
export type PracticeState = (typeof PRACTICE_STATES)[number];

export type NativePracticeStateEvent = {
  state: PracticeState;
  code?: string;
  playbackPrepared?: boolean;
  playbackStarted?: boolean;
  outputRoute?: string;
  mediaVolumeCurrent?: number;
  mediaVolumeMax?: number;
};

type NativeStopRecordingPayload = {
  durationMs: number;
  wallDurationMs?: number;
  /** Duração lida do arquivo (MediaMetadataRetriever); -1 = ilegível. */
  metadataDurationMs?: number;
  fileExists?: boolean;
  fileBytes?: number;
  /** Pico de amplitude (0–32767): só prova se houve sinal; nunca é nota. */
  peakAmplitude?: number;
  signalDetected?: boolean;
  /** INVALID_FILE / RECORDING_TOO_SHORT quando o arquivo não serve. */
  code?: string;
};

type NativePlaybackPayload = {
  played: boolean;
  stopped?: boolean;
  playbackPrepared?: boolean;
  playbackStarted?: boolean;
  playbackCompleted?: boolean;
};

export type NativePracticeAudioDiagnostics = {
  mediaVolumeCurrent?: number;
  mediaVolumeMax?: number;
  mediaMuted?: boolean;
  outputRoute?: string;
  state?: string;
  hasRecording?: boolean;
};

/** RC2.2.22 — recursos nativos vivos (QA). Em repouso: tudo 0. */
export type NativeResourceCounters = {
  activeMediaPlayers: number;
  activeRecorders: number;
  activeRecognizers: number;
  activeTtsUtterances: number;
  pendingRecognitionCalls: number;
  activeTimersCritical: number;
  practiceState?: string;
};

/** Diagnóstico da escuta: reconhecedor usado, locale e sinal (sem áudio, sem texto). */
export type NativeRecognitionDiagnostics = {
  recognizer?: string;
  requestedLocale?: string;
  usedLocale?: string;
  signalDetected?: boolean;
  peakRmsBucket?: string;
};

interface LongyuSpeechPlugin {
  getTtsStatus(options: { language: string; reinit?: boolean }): Promise<TtsStatus>;
  speak(options: { text: string; language: string; rate?: number; pitch?: number; requestId?: string }): Promise<{ interrupted: boolean; requestId?: string; utteranceId?: string; started?: boolean }>;
  stop(): Promise<void>;
  openTtsSettings(): Promise<void>;
  getRecognitionStatus(): Promise<RecognitionStatus>;
  startRecognition(options: { language: string; timeoutMs: number; preferOnDevice?: boolean }): Promise<{ matches: string[] } & NativeRecognitionDiagnostics>;
  stopRecognition(): Promise<void>;
  cancelRecognition(): Promise<void>;
  requestMicrophone(): Promise<{ microphone: NativePermission }>;
  openAppSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  installTtsData(): Promise<void>;
  checkRecognitionSupport(options: { language: string }): Promise<NativeRecognitionSupport>;
  triggerModelDownload(options: { language: string }): Promise<NativeModelDownloadResult>;
  startPracticeRecording(): Promise<{ recording: boolean }>;
  stopPracticeRecording(): Promise<NativeStopRecordingPayload>;
  playPracticeRecording(): Promise<NativePlaybackPayload>;
  stopPracticePlayback(): Promise<void>;
  getPracticeAudioDiagnostics(): Promise<NativePracticeAudioDiagnostics>;
  getResourceCounters(): Promise<NativeResourceCounters>;
  deletePracticeRecording(): Promise<{ deleted: boolean }>;
  addListener(event: "practiceRecordingState", listener: (event: NativePracticeStateEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: "recognitionState", listener: (event: { state: string; recognizer?: string; signalDetected?: boolean }) => void): Promise<PluginListenerHandle>;
  addListener(event: "ttsState", listener: (event: { state: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "ttsEvent", listener: (event: Record<string, unknown>) => void): Promise<PluginListenerHandle>;
  addListener(event: "modelDownload", listener: (event: { status: string; progress?: number }) => void): Promise<PluginListenerHandle>;
}

const LongyuSpeech = registerPlugin<LongyuSpeechPlugin>("LongyuSpeech");

export const MANDARIN_LANGUAGE = "zh-CN";
export const RECOGNITION_TIMEOUT_MS = 10_000;

/** A voz nativa é o caminho do Android; a Web nunca passa por aqui. */
export function hasNativeSpeech(): boolean {
  return isAndroid();
}

/** Dados que o plugin anexa à rejeição (`call.reject(msg, code, null, data)`). */
function errorData<T>(error: unknown): T | undefined {
  const data = (error as { data?: unknown })?.data;
  return data && typeof data === "object" ? (data as T) : undefined;
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && code) return code;
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && /^[A-Z_]+$/.test(message) ? message : "UNKNOWN";
}

// ── TTS ───────────────────────────────────────────────────────────────────

export async function nativeTtsStatus(language = MANDARIN_LANGUAGE, options: { reinit?: boolean } = {}): Promise<TtsStatus> {
  try {
    return await LongyuSpeech.getTtsStatus({ language, reinit: options.reinit === true });
  } catch (error) {
    return { available: false, status: errorCode(error) };
  }
}

export type NativeSpeakResult = { ok: true; interrupted: boolean } | { ok: false; code: string };

/** Fala com QUEUE_FLUSH (a anterior é interrompida). Nunca finge que tocou. */
export async function nativeSpeak(text: string, options: { rate?: number; pitch?: number } = {}): Promise<NativeSpeakResult> {
  try {
    const result = await LongyuSpeech.speak({ text, language: MANDARIN_LANGUAGE, rate: options.rate, pitch: options.pitch });
    return { ok: true, interrupted: Boolean(result?.interrupted) };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
}

// ── RC2.2.24 — eventos de TTS correlacionados (requestId / utteranceId) ──
//
// Antes: um listener global de `ttsState` SEM identidade da fala, instalado
// só no primeiro play — o `addListener` é assíncrono, então no cold start o
// onStart do motor chegava antes do listener e se perdia (o aluno ouvia; o
// Continuar ficava desligado). Agora a ponte é instalada no
// NativeExperienceBootstrap (antes de qualquer tela usar TTS) e cada fala
// AGUARDA a ponte antes de pedir ao motor. Cada evento carrega a requestId da
// fala; só o assinante daquela requestId recebe.
type TtsSubscriber = (event: TtsEvent) => void;
const ttsSubscribers = new Map<string, TtsSubscriber>();
let ttsBridge: Promise<boolean> | null = null;
let ttsBridgeInstalledAt: number | null = null;

/** Instala a ponte de eventos de TTS uma vez (idempotente). */
export function initNativeTtsEventBridge(): Promise<boolean> {
  if (!hasNativeSpeech()) return Promise.resolve(false);
  if (ttsBridge) return ttsBridge;
  ttsBridge = LongyuSpeech.addListener("ttsEvent", (raw) => {
    const event = sanitizeTtsEvent(raw);
    if (!event) return;
    recordTtsTrace(event);
    ttsSubscribers.get(event.requestId)?.(event);
  })
    .then(() => {
      ttsBridgeInstalledAt = Date.now();
      return true;
    })
    .catch(() => {
      ttsBridge = null;
      return false;
    });
  return ttsBridge;
}

export function nativeTtsBridgeInstalledAt(): number | null {
  return ttsBridgeInstalledAt;
}

export type NativeTrackedSpeakResult =
  | { ok: true; interrupted: boolean; started: boolean; utteranceId: string | null }
  | { ok: false; code: string };

/** Mantém o assinante um pouco depois do fim: eventos atrasados ainda chegam. */
const SUBSCRIBER_GRACE_MS = 1500;

/**
 * Fala com identidade. `onEvent` recebe SÓ os eventos desta requestId
 * (TTS_REQUESTED sintetizado aqui; QUEUED/STARTED/DONE/STOPPED/ERROR do
 * nativo). A ponte está instalada ANTES do pedido ao motor.
 */
export async function nativeSpeakTracked(
  text: string,
  options: { rate?: number; pitch?: number; requestId: string },
  onEvent: TtsSubscriber
): Promise<NativeTrackedSpeakResult> {
  const { requestId } = options;
  ttsSubscribers.set(requestId, onEvent);
  const requested: TtsEvent = { type: "TTS_REQUESTED", requestId, utteranceId: null, timestamp: Date.now(), engineState: "js" };
  recordTtsTrace(requested);
  onEvent(requested);
  await initNativeTtsEventBridge();
  try {
    const result = await LongyuSpeech.speak({ text, language: MANDARIN_LANGUAGE, rate: options.rate, pitch: options.pitch, requestId });
    return { ok: true, interrupted: Boolean(result?.interrupted), started: Boolean(result?.started), utteranceId: result?.utteranceId ?? null };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  } finally {
    setTimeout(() => {
      if (ttsSubscribers.get(requestId) === onEvent) ttsSubscribers.delete(requestId);
    }, SUBSCRIBER_GRACE_MS);
  }
}

/**
 * RC2.2.17 · I — "Instalar voz chinesa": abre o fluxo do SO
 * (ACTION_INSTALL_TTS_DATA); sem ele, a tela de ajustes de TTS.
 */
export async function installNativeTtsData(): Promise<boolean> {
  try {
    await LongyuSpeech.installTtsData();
    return true;
  } catch {
    try {
      await LongyuSpeech.openTtsSettings();
      return true;
    } catch {
      return false;
    }
  }
}

export async function nativeStopSpeaking(): Promise<void> {
  try {
    await LongyuSpeech.stop();
  } catch {
    /* sem voz ativa */
  }
}

export async function openNativeTtsSettings(): Promise<void> {
  try {
    await LongyuSpeech.openTtsSettings();
  } catch {
    /* aparelho sem tela de TTS */
  }
}

// ── Reconhecimento ───────────────────────────────────────────────────────

export async function nativeRecognitionStatus(): Promise<RecognitionStatus> {
  try {
    return await LongyuSpeech.getRecognitionStatus();
  } catch {
    return { available: false, onDevice: false, microphone: "prompt" };
  }
}

export async function requestNativeMicrophone(): Promise<NativePermission> {
  try {
    return (await LongyuSpeech.requestMicrophone()).microphone;
  } catch {
    return "denied";
  }
}

let recognitionInFlight = false;

export type NativeRecognizeResult =
  | ({ ok: true; matches: string[] } & NativeRecognitionDiagnostics)
  | ({ ok: false; code: string } & NativeRecognitionDiagnostics);

/**
 * Uma escuta por vez. Toque repetido enquanto escuta = RECOGNIZER_BUSY
 * (definido; nunca dois reconhecedores). O nativo tem timeout próprio e
 * destrói o reconhecedor ao terminar.
 */
export async function nativeRecognize(timeoutMs = RECOGNITION_TIMEOUT_MS, options: { preferOnDevice?: boolean } = {}): Promise<NativeRecognizeResult> {
  if (recognitionInFlight) return { ok: false, code: "RECOGNIZER_BUSY" };
  recognitionInFlight = true;
  // Microfone e voz não disputam o áudio: a fala do sistema para antes.
  await nativeStopSpeaking();
  try {
    // RC2.2.21 — on-device só quando o mandarim está instalado nele; senão o
    // serviço do aparelho (que costuma ter zh-CN online).
    const result = await LongyuSpeech.startRecognition({ language: MANDARIN_LANGUAGE, timeoutMs, preferOnDevice: options.preferOnDevice === true });
    const { matches, ...diagnostics } = result ?? { matches: [] };
    return { ok: true, matches: (matches ?? []).filter((match) => typeof match === "string"), ...diagnostics };
  } catch (error) {
    return { ok: false, code: errorCode(error), ...(errorData<NativeRecognitionDiagnostics>(error) ?? {}) };
  } finally {
    recognitionInFlight = false;
  }
}

/** Eventos técnicos da escuta (criado/pronto/sinal/fim/destruído). */
export function onNativeRecognitionState(listener: (event: { state: string; recognizer?: string; signalDetected?: boolean }) => void): () => void {
  if (!hasNativeSpeech()) return () => undefined;
  let handle: PluginListenerHandle | null = null;
  let released = false;
  const releaseObserver = trackObserver();
  void LongyuSpeech.addListener("recognitionState", listener)
    .then((h) => {
      if (released) void h.remove();
      else handle = h;
    })
    .catch(() => undefined);
  return () => {
    if (released) return;
    released = true;
    releaseObserver();
    if (handle) void handle.remove();
  };
}

export async function stopNativeRecognition(): Promise<void> {
  try {
    await LongyuSpeech.stopRecognition();
  } catch {
    /* nada escutando */
  }
}

export async function cancelNativeRecognition(): Promise<void> {
  try {
    await LongyuSpeech.cancelRecognition();
  } catch {
    /* nada escutando */
  }
}

// ── RC2.2.17 · U–X — suporte a mandarim e download do modelo ─────────────

export async function nativeCheckRecognitionSupport(language = MANDARIN_LANGUAGE): Promise<NativeRecognitionSupport> {
  try {
    return await LongyuSpeech.checkRecognitionSupport({ language });
  } catch (error) {
    return {
      checked: false,
      serviceAvailable: false,
      onDeviceAvailable: false,
      installedOnDevice: false,
      pendingOnDevice: false,
      supportedOnDevice: false,
      online: false,
      sdk: 0,
      error: errorCode(error),
    };
  }
}

export async function nativeTriggerModelDownload(language = MANDARIN_LANGUAGE): Promise<NativeModelDownloadResult> {
  try {
    return await LongyuSpeech.triggerModelDownload({ language });
  } catch (error) {
    return { status: "ERROR", code: errorCode(error) };
  }
}

export function onNativeModelDownload(listener: (event: { status: string; progress?: number }) => void): () => void {
  let handle: PluginListenerHandle | null = null;
  let released = false;
  const releaseObserver = trackObserver();
  void LongyuSpeech.addListener("modelDownload", listener)
    .then((h) => {
      if (released) void h.remove();
      else handle = h;
    })
    .catch(() => undefined);
  return () => {
    if (released) return;
    released = true;
    releaseObserver();
    if (handle) void handle.remove();
  };
}

// ── RC2.2.17 · AA — gravação TEMPORÁRIA de prática (sem SpeechRecognizer) ──
//
// Arquivo único no cache do app; apagado ao gravar de novo, ao apagar, ao ir
// para o background de verdade (onStop) e ao fechar. Uma pausa transitória
// (diálogo de permissão, painel) só interrompe microfone/reprodução — RC2.2.21.
// Nunca sai do aparelho.

export type NativeRecordingResult =
  | ({ ok: true } & Partial<NativeStopRecordingPayload>)
  | { ok: false; code: string };

export async function nativeStartPracticeRecording(): Promise<NativeRecordingResult> {
  try {
    await nativeStopSpeaking();
    await LongyuSpeech.startPracticeRecording();
    return { ok: true };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
}

export async function nativeStopPracticeRecording(): Promise<NativeRecordingResult> {
  try {
    const result = await LongyuSpeech.stopPracticeRecording();
    // RC2.2.21 — o plugin valida o arquivo (bytes, duração no metadado).
    if (result?.code) return { ok: false, code: result.code };
    return {
      ok: true,
      durationMs: Number(result?.durationMs ?? 0),
      wallDurationMs: Number(result?.wallDurationMs ?? result?.durationMs ?? 0),
      metadataDurationMs: typeof result?.metadataDurationMs === "number" ? result.metadataDurationMs : undefined,
      fileExists: result?.fileExists === true,
      fileBytes: Number(result?.fileBytes ?? 0),
      peakAmplitude: typeof result?.peakAmplitude === "number" ? result.peakAmplitude : undefined,
      signalDetected: typeof result?.signalDetected === "boolean" ? result.signalDetected : undefined,
    };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
}

export type NativePlaybackResult =
  | ({ ok: true } & NativePlaybackPayload)
  | { ok: false; code: string; outputRoute?: string };

/**
 * Toca a própria gravação. Resolve SÓ no fim (ou no "Parar"); o início real
 * (PLAYING, depois de isPlaying no Android) chega por `onPracticeRecordingState`.
 */
export async function nativePlayPracticeRecording(): Promise<NativePlaybackResult> {
  try {
    await nativeStopSpeaking();
    const result = await LongyuSpeech.playPracticeRecording();
    return {
      ok: true,
      played: result?.played === true,
      stopped: result?.stopped === true,
      playbackPrepared: result?.playbackPrepared === true,
      playbackStarted: result?.playbackStarted === true,
      playbackCompleted: result?.playbackCompleted === true,
    };
  } catch (error) {
    return { ok: false, code: errorCode(error), outputRoute: errorData<{ outputRoute?: string }>(error)?.outputRoute };
  }
}

export async function nativeStopPracticePlayback(): Promise<void> {
  try {
    await LongyuSpeech.stopPracticePlayback();
  } catch {
    /* nada tocando */
  }
}

export async function nativePracticeAudioDiagnostics(): Promise<NativePracticeAudioDiagnostics | null> {
  if (!hasNativeSpeech()) return null;
  try {
    return await LongyuSpeech.getPracticeAudioDiagnostics();
  } catch {
    return null;
  }
}

export async function nativeResourceCounters(): Promise<NativeResourceCounters | null> {
  if (!hasNativeSpeech()) return null;
  try {
    return await LongyuSpeech.getResourceCounters();
  } catch {
    return null;
  }
}

/** Estados da gravação/reprodução vindos do Android (um ouvinte por tela). */
export function onPracticeRecordingState(listener: (event: NativePracticeStateEvent) => void): () => void {
  if (!hasNativeSpeech()) return () => undefined;
  let handle: PluginListenerHandle | null = null;
  let released = false;
  const releaseObserver = trackObserver();
  void LongyuSpeech.addListener("practiceRecordingState", listener)
    .then((h) => {
      if (released) void h.remove();
      else handle = h;
    })
    .catch(() => undefined);
  return () => {
    if (released) return;
    released = true;
    releaseObserver();
    if (handle) void handle.remove();
  };
}

export async function nativeDeletePracticeRecording(): Promise<void> {
  try {
    await LongyuSpeech.deletePracticeRecording();
  } catch {
    /* nada gravado */
  }
}

// ── Ajustes do Android ───────────────────────────────────────────────────

export async function openNativeAppSettings(): Promise<void> {
  try {
    await LongyuSpeech.openAppSettings();
  } catch {
    /* ignore */
  }
}

export async function openNativeNotificationSettings(): Promise<void> {
  try {
    await LongyuSpeech.openNotificationSettings();
  } catch {
    /* ignore */
  }
}
