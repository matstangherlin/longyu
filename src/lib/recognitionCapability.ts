/**
 * RC2.2.17 · T–AF — o que o aparelho consegue fazer com a FALA do aluno.
 *
 * Duas perguntas diferentes que antes se confundiam:
 *   1. o serviço reconhece MANDARIM (zh-CN)?        → idioma/modelo
 *   2. o app pode usar o MICROFONE?                  → permissão
 * "Microfone autorizado" não diz nada sobre a 1ª. LANGUAGE_NOT_SUPPORTED /
 * LANGUAGE_UNAVAILABLE nunca são tratados como "sem permissão".
 *
 * E uma regra de produto: fala NUNCA bloqueia a lição. Sem reconhecimento de
 * mandarim, o aluno grava e compara com o modelo (self-compare); sem nem
 * gravação, vê o modelo e segue com "Não consigo falar agora".
 *
 * Funções puras: o estado nativo entra como dado (nativeSpeech.ts).
 */
import type { NativePermission, NativeRecognitionSupport } from "./platform/nativeSpeech";

export type RecognitionCapability =
  | "AVAILABLE"
  | "MODEL_DOWNLOAD_REQUIRED"
  | "SERVICE_UNAVAILABLE"
  | "LANGUAGE_UNSUPPORTED"
  | "LANGUAGE_TEMP_UNAVAILABLE"
  | "PERMISSION_REQUIRED"
  | "READY"
  | "UNKNOWN_SUPPORT";

export type SpeakingMode = "recognize" | "self_compare" | "model_only";

export interface RecognitionCapabilityInput {
  /** Android nativo (SpeechRecognizer) ou Web Speech API. */
  native: boolean;
  /** Existe algum reconhecedor neste runtime (Web: SpeechRecognition). */
  recognizerPresent: boolean;
  /** Resultado de checkRecognitionSupport (API 33+); null = não consultado. */
  support: NativeRecognitionSupport | null;
  /** Estado do microfone no SO (null = desconhecido, ex.: Web antes de pedir). */
  microphone: NativePermission | null;
  /** Último código de erro do reconhecedor nesta sessão. */
  lastErrorCode?: string | null;
}

/** Idioma: o que o serviço diz sobre zh-CN, independente do microfone. */
export type LanguageSupport = "SUPPORTED" | "MODEL_MISSING" | "UNSUPPORTED" | "TEMP_UNAVAILABLE" | "NO_SERVICE" | "UNKNOWN";

export function languageSupportFor(input: RecognitionCapabilityInput): LanguageSupport {
  if (!input.recognizerPresent) return "NO_SERVICE";
  const code = input.lastErrorCode ?? null;
  if (code === "LANGUAGE_UNAVAILABLE") return "TEMP_UNAVAILABLE";
  if (code === "LANGUAGE_NOT_SUPPORTED") return "UNSUPPORTED";
  if (code === "RECOGNITION_UNAVAILABLE") return "NO_SERVICE";
  if (!input.native) return "UNKNOWN";
  const support = input.support;
  if (!support) return "UNKNOWN";
  if (!support.serviceAvailable && !support.onDeviceAvailable) return "NO_SERVICE";
  if (!support.checked) return "UNKNOWN";
  if (support.installedOnDevice || support.online) return "SUPPORTED";
  if (support.supportedOnDevice || support.pendingOnDevice) return "MODEL_MISSING";
  return "UNSUPPORTED";
}

/**
 * Capacidade final. Ordem: sem serviço → idioma → permissão. Permissão só
 * entra quando o idioma não é o problema (e nunca o substitui).
 */
export function deriveRecognitionCapability(input: RecognitionCapabilityInput): RecognitionCapability {
  const language = languageSupportFor(input);
  if (language === "NO_SERVICE") return "SERVICE_UNAVAILABLE";
  if (language === "UNSUPPORTED") return "LANGUAGE_UNSUPPORTED";
  if (language === "TEMP_UNAVAILABLE") return "LANGUAGE_TEMP_UNAVAILABLE";
  if (language === "MODEL_MISSING") return "MODEL_DOWNLOAD_REQUIRED";
  if (input.microphone === "denied") return "PERMISSION_REQUIRED";
  if (language === "UNKNOWN") return "UNKNOWN_SUPPORT";
  return input.microphone === "granted" ? "READY" : "AVAILABLE";
}

/**
 * Como a atividade de fala acontece. Nenhum estado devolve "bloquear":
 * reconhecer, autoavaliar gravando, ou só o modelo + seguir.
 */
export function speakingModeFor(capability: RecognitionCapability, recordingAvailable: boolean): SpeakingMode {
  switch (capability) {
    case "READY":
    case "AVAILABLE":
    case "UNKNOWN_SUPPORT":
      return "recognize";
    case "PERMISSION_REQUIRED":
      // Gravar também precisa do microfone: só o modelo (+ abrir ajustes).
      return "model_only";
    case "MODEL_DOWNLOAD_REQUIRED":
    case "SERVICE_UNAVAILABLE":
    case "LANGUAGE_UNSUPPORTED":
    case "LANGUAGE_TEMP_UNAVAILABLE":
      return recordingAvailable ? "self_compare" : "model_only";
    default:
      return recordingAvailable ? "self_compare" : "model_only";
  }
}

/** Erro do reconhecedor que troca a atividade para self-compare (sem 10 tentativas). */
export function recognitionErrorForcesFallback(code: string | null | undefined): boolean {
  return code === "language-unavailable" || code === "unsupported" || code === "LANGUAGE_NOT_SUPPORTED" || code === "LANGUAGE_UNAVAILABLE" || code === "RECOGNITION_UNAVAILABLE";
}

/** O Android oferece baixar o modelo de mandarim (API 33+ e serviço presente). */
export function canOfferModelDownload(capability: RecognitionCapability, support: NativeRecognitionSupport | null): boolean {
  return capability === "MODEL_DOWNLOAD_REQUIRED" && Boolean(support && support.sdk >= 33);
}

/**
 * RC2.2.17 · AD/CH/EQ — a autoavaliação não mede tom nem pronúncia. O único
 * registro possível é "gravou e comparou". Nenhum campo de nota existe aqui.
 */
export interface SelfCompareEvidence {
  kind: "SELF_COMPARE";
  recorded: boolean;
  listenedToModel: boolean;
  listenedToSelf: boolean;
}
