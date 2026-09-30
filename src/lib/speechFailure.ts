/**
 * RC2.2.20 — categorias SEGURAS de falha de fala.
 *
 * Permissão negada, aparelho sem serviço, sem mandarim, prazo esgotado, sem
 * fala e falha de gravação são problemas DIFERENTES, com saídas diferentes.
 * Nunca a mesma mensagem para tudo, e nunca termo técnico ("recognition model
 * unavailable") na ação principal — o detalhe fica no diagnóstico de QA.
 */
export const SPEECH_FAILURE_CATEGORIES = [
  "PERMISSION_DENIED",
  "NO_SERVICE",
  "NO_ZH_CN",
  "TIMEOUT",
  "NO_SPEECH",
  "RECORDING_FAILURE",
  "NETWORK",
  "BUSY",
  "INTERRUPTED",
  "UNKNOWN",
] as const;
export type SpeechFailureCategory = (typeof SPEECH_FAILURE_CATEGORIES)[number];

/** Código do Longyu (RecognizeErrorCode) ou do plugin nativo de gravação → categoria. */
export function classifySpeechFailure(code: string | null | undefined): SpeechFailureCategory {
  switch (String(code ?? "")) {
    case "not-allowed":
    case "INSUFFICIENT_PERMISSIONS":
    case "PERMISSION_DENIED":
    case "MIC_PERMISSION_DENIED":
      return "PERMISSION_DENIED";
    case "unsupported":
    case "insecure":
    case "RECOGNITION_UNAVAILABLE":
      return "NO_SERVICE";
    case "language-unavailable":
    case "LANGUAGE_NOT_SUPPORTED":
    case "LANGUAGE_UNAVAILABLE":
      return "NO_ZH_CN";
    case "timeout":
      return "TIMEOUT";
    case "no-speech":
    case "NO_MATCH":
    case "SPEECH_TIMEOUT":
      return "NO_SPEECH";
    case "audio-capture":
    case "start-failed":
    case "WEB_RECORDING_FAILED":
    case "RECORDING_FAILED":
    case "RECORDER_START_FAILED":
    case "RECORDING_TOO_SHORT":
    case "EMPTY_RECORDING":
      return "RECORDING_FAILURE";
    case "network":
    case "NETWORK":
    case "NETWORK_TIMEOUT":
      return "NETWORK";
    case "busy":
    case "RECOGNIZER_BUSY":
      return "BUSY";
    case "aborted":
    case "CANCELLED":
      return "INTERRUPTED";
    default:
      return "UNKNOWN";
  }
}

/**
 * Saída útil por categoria (nunca beco sem saída). "Continuar sem falar"
 * existe em todas; Baixar suporte só quando é o mandarim que falta.
 */
export type SpeechFallbackAction = "retry" | "open_settings" | "download_support" | "record_compare" | "continue_without_speaking";

export function speechFallbackActions(category: SpeechFailureCategory, opts: { canRecord: boolean; canDownload: boolean }): SpeechFallbackAction[] {
  const actions: SpeechFallbackAction[] = [];
  switch (category) {
    case "PERMISSION_DENIED":
      actions.push("open_settings");
      break;
    case "NO_ZH_CN":
      if (opts.canDownload) actions.push("download_support");
      if (opts.canRecord) actions.push("record_compare");
      break;
    case "NO_SERVICE":
      if (opts.canRecord) actions.push("record_compare");
      break;
    case "RECORDING_FAILURE":
      actions.push("retry");
      break;
    default:
      actions.push("retry");
      if (opts.canRecord) actions.push("record_compare");
  }
  actions.push("continue_without_speaking");
  return actions;
}
