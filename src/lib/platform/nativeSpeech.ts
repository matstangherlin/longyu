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

export type NativePermission = "granted" | "denied" | "prompt" | "prompt-with-rationale";

type TtsStatus = {
  available: boolean;
  status: string;
  engine?: string | null;
  /** RC2.2.17 · H — diagnóstico (sem PII): resultado do init e locale pedido. */
  initStatus?: string;
  requestedLocale?: string;
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

interface LongyuSpeechPlugin {
  getTtsStatus(options: { language: string }): Promise<TtsStatus>;
  speak(options: { text: string; language: string; rate?: number; pitch?: number }): Promise<{ interrupted: boolean }>;
  stop(): Promise<void>;
  openTtsSettings(): Promise<void>;
  getRecognitionStatus(): Promise<RecognitionStatus>;
  startRecognition(options: { language: string; timeoutMs: number }): Promise<{ matches: string[] }>;
  stopRecognition(): Promise<void>;
  cancelRecognition(): Promise<void>;
  requestMicrophone(): Promise<{ microphone: NativePermission }>;
  openAppSettings(): Promise<void>;
  openNotificationSettings(): Promise<void>;
  installTtsData(): Promise<void>;
  checkRecognitionSupport(options: { language: string }): Promise<NativeRecognitionSupport>;
  triggerModelDownload(options: { language: string }): Promise<NativeModelDownloadResult>;
  startPracticeRecording(): Promise<{ recording: boolean }>;
  stopPracticeRecording(): Promise<{ durationMs: number }>;
  playPracticeRecording(): Promise<{ played: boolean }>;
  deletePracticeRecording(): Promise<{ deleted: boolean }>;
  addListener(event: "recognitionState", listener: (event: { state: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "ttsState", listener: (event: { state: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "modelDownload", listener: (event: { status: string; progress?: number }) => void): Promise<PluginListenerHandle>;
}

const LongyuSpeech = registerPlugin<LongyuSpeechPlugin>("LongyuSpeech");

export const MANDARIN_LANGUAGE = "zh-CN";
export const RECOGNITION_TIMEOUT_MS = 10_000;

/** A voz nativa é o caminho do Android; a Web nunca passa por aqui. */
export function hasNativeSpeech(): boolean {
  return isAndroid();
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && code) return code;
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && /^[A-Z_]+$/.test(message) ? message : "UNKNOWN";
}

// ── TTS ───────────────────────────────────────────────────────────────────

export async function nativeTtsStatus(language = MANDARIN_LANGUAGE): Promise<TtsStatus> {
  try {
    return await LongyuSpeech.getTtsStatus({ language });
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

// RC2.2.17 · B — o plugin avisa `ttsState: start` no onStart do motor. Um
// único listener nativo; quem fala registra o callback da fala corrente.
const ttsStartWaiters = new Set<() => void>();
let ttsListenerInstalled = false;

function ensureTtsStateListener(): void {
  if (ttsListenerInstalled || !hasNativeSpeech()) return;
  ttsListenerInstalled = true;
  try {
    void LongyuSpeech.addListener("ttsState", (event) => {
      if (event?.state !== "start") return;
      for (const waiter of Array.from(ttsStartWaiters)) waiter();
    }).catch(() => {
      ttsListenerInstalled = false;
    });
  } catch {
    ttsListenerInstalled = false;
  }
}

/** Registra o callback de início da fala corrente; devolve o "desregistrar". */
export function onNativeTtsStart(callback: () => void): () => void {
  ensureTtsStateListener();
  ttsStartWaiters.add(callback);
  return () => {
    ttsStartWaiters.delete(callback);
  };
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

export type NativeRecognizeResult = { ok: true; matches: string[] } | { ok: false; code: string };

/**
 * Uma escuta por vez. Toque repetido enquanto escuta = RECOGNIZER_BUSY
 * (definido; nunca dois reconhecedores). O nativo tem timeout próprio e
 * destrói o reconhecedor ao terminar.
 */
export async function nativeRecognize(timeoutMs = RECOGNITION_TIMEOUT_MS): Promise<NativeRecognizeResult> {
  if (recognitionInFlight) return { ok: false, code: "RECOGNIZER_BUSY" };
  recognitionInFlight = true;
  // Microfone e voz não disputam o áudio: a fala do sistema para antes.
  await nativeStopSpeaking();
  try {
    const result = await LongyuSpeech.startRecognition({ language: MANDARIN_LANGUAGE, timeoutMs });
    return { ok: true, matches: (result?.matches ?? []).filter((match) => typeof match === "string") };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  } finally {
    recognitionInFlight = false;
  }
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
  void LongyuSpeech.addListener("modelDownload", listener)
    .then((h) => {
      if (released) void h.remove();
      else handle = h;
    })
    .catch(() => undefined);
  return () => {
    released = true;
    if (handle) void handle.remove();
  };
}

// ── RC2.2.17 · AA — gravação TEMPORÁRIA de prática (sem SpeechRecognizer) ──
//
// Arquivo único no cache do app; apagado ao gravar de novo, ao apagar, ao ir
// para o background e ao fechar. Nunca sai do aparelho.

export type NativeRecordingResult = { ok: true; durationMs?: number } | { ok: false; code: string };

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
    return { ok: true, durationMs: Number(result?.durationMs ?? 0) };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
}

export async function nativePlayPracticeRecording(): Promise<NativeRecordingResult> {
  try {
    await nativeStopSpeaking();
    await LongyuSpeech.playPracticeRecording();
    return { ok: true };
  } catch (error) {
    return { ok: false, code: errorCode(error) };
  }
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
