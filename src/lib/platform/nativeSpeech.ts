/**
 * RC2.2.13 — adapter da voz nativa (Android). Único ponto do front-end que
 * fala com o plugin interno `LongyuSpeech`
 * (android/app/src/main/java/com/longyu/app/LongyuSpeechPlugin.java).
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

type TtsStatus = { available: boolean; status: string; engine?: string | null };
type RecognitionStatus = { available: boolean; onDevice: boolean; microphone: NativePermission };

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
  addListener(event: "recognitionState", listener: (event: { state: string }) => void): Promise<PluginListenerHandle>;
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
