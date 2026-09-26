// Reconhecimento de fala via Web Speech API (SpeechRecognition).
// Grátis e nativo do navegador. Funciona em Chrome/Edge (webkit*),
// exige HTTPS ou localhost e permissão de microfone.
//
// No Chrome Android o padrão que quebra o mic é:
// 1) não pedir getUserMedia antes (a permissão do SpeechRecognition falha/silencia);
// 2) manter MediaRecorder/getUserMedia ABERTO enquanto reconhece (disputa o mic);
// 3) continuous:false + onend imediato → "no-speech" antes do aluno terminar.

import {
  cancelNativeRecognition,
  hasNativeSpeech,
  nativeCheckRecognitionSupport,
  nativeRecognitionStatus,
  nativeRecognize,
  requestNativeMicrophone,
  stopNativeRecognition,
  type NativePermission,
  type NativeRecognitionSupport,
} from "./platform/nativeSpeech";
import { deriveRecognitionCapability, type RecognitionCapability } from "./recognitionCapability";

// ── RC2.2.13 — fala do aluno no Android ────────────────────────────────────
//
// O WebView do Android não expõe `SpeechRecognition`. No app, a fala usa o
// `android.speech.SpeechRecognizer` (plugin LongyuSpeech, via
// src/lib/platform/nativeSpeech.ts) pelas MESMAS funções abaixo:
// ensureMicPermission() e recognizeOnce(). A Web segue igual.
//
// Produto: o reconhecedor devolve TEXTO. Ele não mede tom; nada aqui afirma
// "seu 3º tom está perfeito".

/** Estado do microfone no Android: "denied" = só pelos ajustes do sistema. */
let nativeMicState: NativePermission | null = null;
let nativeRecognitionKnownAvailable: boolean | null = null;

export async function refreshNativeSpeechStatus(): Promise<{ available: boolean; microphone: NativePermission } | null> {
  if (!hasNativeSpeech()) return null;
  const status = await nativeRecognitionStatus();
  nativeRecognitionKnownAvailable = status.available;
  nativeMicState = status.microphone;
  return { available: status.available, microphone: status.microphone };
}

/** Android: o microfone foi negado de vez (só os ajustes do Android liberam). */
// ── RC2.2.17 · U–V — suporte a MANDARIM (separado da permissão) ─────────────

let mandarinSupport: NativeRecognitionSupport | null = null;
let mandarinSupportChecked = false;
/** Último código cru do reconhecedor (LANGUAGE_NOT_SUPPORTED…) nesta sessão. */
let lastRecognitionErrorCode: string | null = null;

/**
 * Android 13+: pergunta ao serviço se zh-CN existe ANTES da primeira atividade
 * de fala. Uma vez por sessão (o resultado muda só com download/instalação:
 * `force` refaz depois de um download).
 */
export async function checkMandarinRecognitionSupport(force = false): Promise<NativeRecognitionSupport | null> {
  if (!hasNativeSpeech()) return null;
  if (mandarinSupportChecked && !force) return mandarinSupport;
  mandarinSupport = await nativeCheckRecognitionSupport();
  mandarinSupportChecked = true;
  if (force) lastRecognitionErrorCode = null;
  if (!mandarinSupport.serviceAvailable && !mandarinSupport.onDeviceAvailable) nativeRecognitionKnownAvailable = false;
  return mandarinSupport;
}

export function mandarinRecognitionSupport(): NativeRecognitionSupport | null {
  return mandarinSupport;
}

export function noteRecognitionErrorCode(code: string | null): void {
  lastRecognitionErrorCode = code;
}

/** Capacidade atual (idioma ≠ permissão) — ver recognitionCapability.ts. */
export function currentRecognitionCapability(): RecognitionCapability {
  const native = hasNativeSpeech();
  return deriveRecognitionCapability({
    native,
    recognizerPresent: native ? nativeRecognitionKnownAvailable !== false : isRecognitionAvailable(),
    support: mandarinSupport,
    microphone: native ? nativeMicState : null,
    lastErrorCode: lastRecognitionErrorCode,
  });
}

export function isNativeMicBlocked(): boolean {
  return hasNativeSpeech() && nativeMicState === "denied";
}

export function nativeMicPermissionState(): NativePermission | null {
  return hasNativeSpeech() ? nativeMicState : null;
}

export function isRecognitionAvailable(): boolean {
  // Android: não depende da Web Speech API; só o SO diz que não há reconhecedor.
  if (hasNativeSpeech()) return nativeRecognitionKnownAvailable !== false;
  if (typeof window === "undefined" || !window.isSecureContext) return false;
  // V4.9.5A.1 — a chave existir não basta. Um navegador que expõe
  // `SpeechRecognition` com valor indefinido nos dava um microfone na tela que
  // só sabia falhar ao ser tocado. Quem decide é o construtor.
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return typeof (w.SpeechRecognition ?? w.webkitSpeechRecognition) === "function";
}

export function isSecureMicContext(): boolean {
  if (hasNativeSpeech()) return true;
  return typeof window !== "undefined" && Boolean(window.isSecureContext);
}

export type MicPermission = "granted" | "denied" | "unavailable";

/**
 * Pede permissão de microfone e LIBERA o stream na hora.
 * Necessário no Chrome Android: sem esse "prime", o SpeechRecognition
 * costuma cair em no-speech / aborted / not-allowed.
 * Nunca deixe o stream aberto ao iniciar o reconhecimento.
 */
export async function ensureMicPermission(): Promise<MicPermission> {
  if (hasNativeSpeech()) {
    // Permissão do SO (RECORD_AUDIO). Pedido em contexto, no toque em "Falar".
    const current = (await nativeRecognitionStatus()).microphone;
    const state = current === "granted" ? current : await requestNativeMicrophone();
    nativeMicState = state;
    return state === "granted" ? "granted" : "denied";
  }
  if (typeof window === "undefined" || !window.isSecureContext) return "unavailable";
  if (!navigator.mediaDevices?.getUserMedia) return "unavailable";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
    // Pequena folga: no Android o hardware às vezes ainda "segura" o mic
    // se o SpeechRecognition começa no mesmo tick do stop().
    await new Promise((resolve) => setTimeout(resolve, 80));
    return "granted";
  } catch {
    return "denied";
  }
}

export interface RecognizeHandle {
  stop: () => void;
}

export type RecognizeErrorCode =
  | "unsupported"
  | "insecure"
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "start-failed"
  | "busy"
  | "language-unavailable"
  | "error";

function mapError(code?: string): RecognizeErrorCode {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    case "start-failed":
      return "start-failed";
    case "insecure":
      return "insecure";
    case "unsupported":
      return "unsupported";
    case "busy":
      return "busy";
    case "language-unavailable":
    case "language-not-supported":
      return "language-unavailable";
    default:
      return "error";
  }
}

/** Códigos do SpeechRecognizer nativo → códigos do Longyu. Nunca "ERROR_CLIENT = 5". */
export function mapNativeRecognitionError(code: string): RecognizeErrorCode {
  switch (code) {
    case "NO_MATCH":
    case "SPEECH_TIMEOUT":
      return "no-speech";
    case "AUDIO":
      return "audio-capture";
    case "NETWORK":
    case "NETWORK_TIMEOUT":
      return "network";
    case "RECOGNIZER_BUSY":
      return "busy";
    case "INSUFFICIENT_PERMISSIONS":
      return "not-allowed";
    case "LANGUAGE_NOT_SUPPORTED":
    case "LANGUAGE_UNAVAILABLE":
      return "language-unavailable";
    case "RECOGNITION_UNAVAILABLE":
      return "unsupported";
    case "CANCELLED":
      return "aborted";
    default:
      return "error";
  }
}

export function speechErrorMessage(code: RecognizeErrorCode | string): string {
  const native = hasNativeSpeech();
  switch (mapError(code)) {
    case "not-allowed":
      return native
        ? "Microfone bloqueado. Permita o microfone para praticar a fala."
        : "Mic bloqueado. Autorize nas configurações do navegador.";
    case "busy":
      return "O reconhecimento ainda está ocupado. Espere um instante e tente de novo.";
    case "language-unavailable":
      return "O reconhecimento de mandarim não está disponível neste aparelho.";
    case "insecure":
      return "O microfone só funciona em HTTPS.";
    case "unsupported":
      return native
        ? "Este aparelho não tem serviço de reconhecimento de fala."
        : "Este navegador não reconhece voz. Use Chrome ou Edge.";
    case "network":
      return "Sem conexão com o serviço de voz. Confira a internet.";
    case "audio-capture":
      return "Não consegui acessar o microfone. Feche outros apps que usam o mic.";
    case "aborted":
      return "Escuta interrompida. Toque em De novo e fale em seguida.";
    case "no-speech":
      return "Não consegui ouvir. Fale um pouco mais perto do mic.";
    case "start-failed":
      return "Não deu para iniciar o microfone. Tente de novo.";
    default:
      return "Não consegui ouvir. Tente de novo falando um pouco mais devagar.";
  }
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface RecognizeOnceOptions {
  lang?: string;
  /** Tempo máximo de escuta (ms). No mobile o padrão curto corta a fala. */
  timeoutMs?: number;
}

/**
 * Escuta uma vez e devolve o que foi reconhecido (ou um erro).
 * Usa continuous + interimResults para sobreviver ao Chrome Android,
 * que encerra cedo demais com continuous:false.
 */
export function recognizeOnce(
  onResult: (transcript: string) => void,
  onError: (err: RecognizeErrorCode) => void,
  langOrOptions: string | RecognizeOnceOptions = "zh-CN"
): RecognizeHandle {
  const options: RecognizeOnceOptions =
    typeof langOrOptions === "string" ? { lang: langOrOptions } : langOrOptions;
  const lang = options.lang ?? "zh-CN";
  const timeoutMs = options.timeoutMs ?? 12000;

  if (hasNativeSpeech()) return recognizeOnceNative(onResult, onError, timeoutMs);

  if (typeof window === "undefined" || !window.isSecureContext) {
    onError("insecure");
    return { stop: () => {} };
  }

  const SR = getSpeechRecognitionCtor();
  if (!SR) {
    onError("unsupported");
    return { stop: () => {} };
  }

  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  // continuous:true evita o corte precoce (no-speech) do Chrome mobile.
  rec.continuous = true;

  let settled = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const finishOk = (transcript: string) => {
    if (settled) return;
    settled = true;
    clearTimer();
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    onResult(transcript.trim());
  };

  const finishErr = (code: RecognizeErrorCode) => {
    if (settled) return;
    settled = true;
    clearTimer();
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    onError(code);
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const bestTranscript = () => (finalTranscript || interimTranscript).trim();

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i]?.[0]?.transcript ?? "";
      if (event.results[i]?.isFinal) finalTranscript += piece;
      else interim += piece;
    }
    interimTranscript = interim;

    // Resultado final com conteúdo → encerra (uma fala completa).
    if (finalTranscript.trim()) {
      finishOk(finalTranscript);
    }
  };

  rec.onerror = (event) => {
    const code = mapError(event.error);
    if (event.error === "language-not-supported") noteRecognitionErrorCode("LANGUAGE_NOT_SUPPORTED");
    // "aborted"/"no-speech" no meio do caminho: se já temos transcript, usa.
    const heard = bestTranscript();
    if (heard && (code === "aborted" || code === "no-speech")) {
      finishOk(heard);
      return;
    }
    // "no-speech" com continuous às vezes dispara sem matar a sessão —
    // só falha de verdade se ainda não ouviu nada e a sessão vai acabar no onend.
    if (code === "no-speech" && !heard) return;
    finishErr(code);
  };

  rec.onend = () => {
    if (settled) return;
    const heard = bestTranscript();
    if (heard) finishOk(heard);
    else finishErr("no-speech");
  };

  timer = setTimeout(() => {
    if (settled) return;
    const heard = bestTranscript();
    if (heard) finishOk(heard);
    else {
      try {
        rec.stop();
      } catch {
        finishErr("no-speech");
      }
    }
  }, timeoutMs);

  try {
    rec.start();
  } catch {
    finishErr("start-failed");
  }

  return {
    stop: () => {
      const heard = bestTranscript();
      if (heard) finishOk(heard);
      else {
        try {
          rec.stop();
        } catch {
          finishErr("aborted");
        }
      }
    },
  };
}

/**
 * Android: uma escuta do SpeechRecognizer nativo (timeout no nativo, sem
 * escuta contínua, reconhecedor destruído ao fim). O resultado volta pelo
 * mesmo `onResult` que a Web usa, e o exercício segue igual.
 */
function recognizeOnceNative(
  onResult: (transcript: string) => void,
  onError: (err: RecognizeErrorCode) => void,
  timeoutMs: number
): RecognizeHandle {
  let settled = false;
  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    fn();
  };
  void nativeRecognize(Math.min(timeoutMs, 15_000)).then((result) => {
    if (result.ok) {
      const best = result.matches.find((match) => match.trim()) ?? "";
      settle(() => (best ? onResult(best.trim()) : onError("no-speech")));
    } else {
      // Permissão e idioma são estados DIFERENTES: só INSUFFICIENT_PERMISSIONS
      // mexe no microfone; LANGUAGE_* vira capacidade de idioma.
      if (result.code === "INSUFFICIENT_PERMISSIONS") nativeMicState = "denied";
      if (/^(LANGUAGE_NOT_SUPPORTED|LANGUAGE_UNAVAILABLE|RECOGNITION_UNAVAILABLE)$/.test(result.code)) noteRecognitionErrorCode(result.code);
      settle(() => onError(mapNativeRecognitionError(result.code)));
    }
  });
  return {
    // "Parar" = o aluno terminou de falar: o SO entrega o que ouviu.
    stop: () => {
      void stopNativeRecognition();
    },
  };
}

/** Cancela a escuta nativa (sair da tela, app em background). */
export function cancelRecognition(): void {
  if (hasNativeSpeech()) void cancelNativeRecognition();
}

const HAN = /[一-鿿]/g;

export function normalizeHan(s: string): string {
  return (s.match(HAN) || []).join("");
}

/** Compara o que foi falado com o alvo preservando a ORDEM dos caracteres. */
export function scorePronunciation(
  heard: string,
  target: string
): { correct: boolean; ratio: number; hasExtra: boolean } {
  const analysis = analyzePronunciation(heard, target);
  return { correct: analysis.correct, ratio: analysis.ratio, hasExtra: analysis.hasExtra };
}

export interface PronunciationAnalysis {
  correct: boolean;
  ratio: number;
  /**
   * Por posição no hànzì normalizado do ALVO: true se aquele caractere
   * foi encontrado na fala na ordem correta (ex.: 谢谢 + "谢" → [true, false]).
   */
  matchedMask: boolean[];
  /** Caracteres do alvo reconhecidos na ordem (só os acertos). */
  matched: string[];
  /** Caracteres do alvo que faltaram na ordem. */
  missing: string[];
  /** A fala tinha hànzì sobrando depois de cobrir o alvo. */
  hasExtra: boolean;
}

/**
 * Análise estruturada com ordem. O reconhecedor (Web Speech) compara
 * caracteres — ele nao valida tom; a UI deve deixar isso claro.
 *
 * `好你` nao cobre `你好`: cada caractere do alvo consome a próxima
 * ocorrência na fala a partir do cursor (subsequência ordenada).
 */
export function analyzePronunciation(heard: string, target: string): PronunciationAnalysis {
  const h = normalizeHan(heard);
  const t = normalizeHan(target);
  if (!t) {
    return { correct: false, ratio: 0, matchedMask: [], matched: [], missing: [], hasExtra: false };
  }
  if (!h) {
    return {
      correct: false,
      ratio: 0,
      matchedMask: Array.from(t, () => false),
      matched: [],
      missing: [...t],
      hasExtra: false,
    };
  }

  const matchedMask: boolean[] = [];
  const matched: string[] = [];
  const missing: string[] = [];
  let cursor = 0;
  let consumed = 0;

  for (const c of t) {
    const idx = h.indexOf(c, cursor);
    if (idx >= 0) {
      matchedMask.push(true);
      matched.push(c);
      cursor = idx + 1;
      consumed += 1;
    } else {
      matchedMask.push(false);
      missing.push(c);
    }
  }

  const hasExtra = h.length > consumed;
  const ratio = t.length ? matched.length / t.length : 0;
  // Correto só se TODOS os caracteres do alvo aparecem na ordem.
  // Extras (你好世界) sao permitidos com aviso — nao invalidam o alvo.
  const correct = missing.length === 0;
  return { correct, ratio, matchedMask, matched, missing, hasExtra };
}
