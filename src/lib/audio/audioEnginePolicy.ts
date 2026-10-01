/**
 * RC2.2.28 — política do motor de áudio.
 *
 * FIXED_CONTENT  → asset canônico obrigatório (TTS só fallback justificado).
 * DYNAMIC_CONTENT → TTS permitido (nome do aluno, QA, frases geradas).
 * QA              → override explícito permitido.
 *
 * O curso NÃO pergunta se o telefone tem voz chinesa para decidir se a aula
 * funciona. A frase fixa já tem (ou deve ter) o seu áudio.
 */
export type AudioContentClass = "FIXED_CONTENT" | "DYNAMIC_CONTENT" | "QA";

export type AudioEnginePreference =
  | "canonical-asset"
  | "native-media"
  | "native-tts"
  | "web-tts"
  | "textual-fallback";

/** Ordem canônica: asset → player nativo/web → TTS → textual. */
export const FIXED_CONTENT_ENGINE_ORDER: readonly AudioEnginePreference[] = [
  "canonical-asset",
  "native-media",
  "native-tts",
  "web-tts",
  "textual-fallback",
] as const;

export const DYNAMIC_CONTENT_ENGINE_ORDER: readonly AudioEnginePreference[] = [
  "native-tts",
  "web-tts",
  "textual-fallback",
] as const;

export interface AudioEngineDecision {
  contentClass: AudioContentClass;
  preferred: readonly AudioEnginePreference[];
  /** Se true, cair em TTS sem asset é gate FAIL em build de validação. */
  ttsWithoutJustificationFailsGate: boolean;
  justification?: string;
}

export function classifyAudioSource(source: string | null | undefined): AudioContentClass {
  const s = String(source ?? "").toUpperCase();
  if (s === "QA" || s.startsWith("QA_") || s.includes("FORENSIC") || s.includes("PROBE")) return "QA";
  if (
    s === "GUIDED_TRY" ||
    s === "CONVERSATION_AUTOPLAY" ||
    s === "CONVERSATION" ||
    s === "LESSON" ||
    s === "REVIEW" ||
    s === "TONE" ||
    s === "CULTURE" ||
    s === "IMMERSION" ||
    s === "PINYIN" ||
    s === "ATLAS" ||
    s === "PLACEMENT" ||
    s === "PHASE_CHALLENGE" ||
    s === "SELF_COMPARE_MODEL" ||
    s.includes("GUIDED") ||
    s.includes("LESSON") ||
    s.includes("CONVERSATION") ||
    s.includes("TONE") ||
    s.includes("CULTURE") ||
    s.includes("IMMERSION") ||
    s.includes("REVIEW")
  ) {
    return "FIXED_CONTENT";
  }
  if (s.includes("DYNAMIC") || s.includes("NAME") || s.includes("PERSONAL")) return "DYNAMIC_CONTENT";
  // Default: conteúdo de aprendizagem é fixo até prova em contrário.
  return "FIXED_CONTENT";
}

export function decideAudioEngine(input: {
  source?: string | null;
  hasCanonicalAsset: boolean;
  qaOverride?: boolean;
  ttsJustification?: string | null;
}): AudioEngineDecision {
  if (input.qaOverride) {
    return {
      contentClass: "QA",
      preferred: DYNAMIC_CONTENT_ENGINE_ORDER,
      ttsWithoutJustificationFailsGate: false,
      justification: input.ttsJustification ?? "QA_OVERRIDE",
    };
  }
  const contentClass = classifyAudioSource(input.source);
  if (contentClass === "DYNAMIC_CONTENT") {
    return {
      contentClass,
      preferred: DYNAMIC_CONTENT_ENGINE_ORDER,
      ttsWithoutJustificationFailsGate: false,
      justification: input.ttsJustification ?? "DYNAMIC_CONTENT",
    };
  }
  if (input.hasCanonicalAsset) {
    return {
      contentClass: "FIXED_CONTENT",
      preferred: FIXED_CONTENT_ENGINE_ORDER,
      ttsWithoutJustificationFailsGate: true,
    };
  }
  return {
    contentClass: "FIXED_CONTENT",
    preferred: FIXED_CONTENT_ENGINE_ORDER,
    ttsWithoutJustificationFailsGate: true,
    justification: input.ttsJustification ?? "ASSET_MISSING_FALLBACK",
  };
}

/** Gate: fixed content sem justificativa não pode cair em TTS. */
export function fixedContentTtsIsReleaseBlocker(decision: AudioEngineDecision, engineUsed: AudioEnginePreference): boolean {
  if (decision.contentClass !== "FIXED_CONTENT") return false;
  if (engineUsed !== "native-tts" && engineUsed !== "web-tts") return false;
  if (decision.justification && decision.justification !== "ASSET_MISSING_FALLBACK") return false;
  return decision.ttsWithoutJustificationFailsGate && !decision.justification;
}
