/**
 * RC2.2.32 — consistência de voz canônica.
 *
 * Conteúdo FIXO do Longyu deve soar sempre com a mesma locutora
 * (`zh-CN-XiaoxiaoNeural` / speaker `fixed-speech-xiaoxiao-v1`).
 * Fallback silencioso para TTS do aparelho é gate FAIL.
 *
 * Instrumentação (sem PII de texto completo em produção): registra audioId,
 * texto normalizado (hash/tamanho), source, engine, asset, perfil de voz,
 * se houve fallback e o motivo.
 */
export const CANONICAL_VOICE_PROFILE = "zh-CN-XiaoxiaoNeural" as const;
export const CANONICAL_SPEAKER_TAG = "fixed-speech-xiaoxiao-v1" as const;

/** Contador de release: deve ser ZERO no corpus pedagógico fixo. */
export const FIXED_CONTENT_NATIVE_TTS_FALLBACK_GATE = "FIXED_CONTENT_NATIVE_TTS_FALLBACK" as const;

export type VoicePlaybackSourceKind = "FIXED_CONTENT" | "DYNAMIC_CONTENT" | "QA";

export type VoicePlaybackEngine =
  | "canonical-asset"
  | "native-media"
  | "native-tts"
  | "web-tts"
  | "none"
  | "textual-fallback";

export interface VoicePlaybackRecord {
  at: number;
  audioId: string | null;
  /** Texto normalizado (sem espaços extremos). Nunca logar em UI de aluno. */
  textNormalized: string;
  textChars: number;
  source: string | null;
  contentClass: VoicePlaybackSourceKind;
  engineSelected: VoicePlaybackEngine;
  assetUsed: string | null;
  canonicalVoiceProfile: typeof CANONICAL_VOICE_PROFILE;
  fallbackOccurred: boolean;
  fallbackReason: string | null;
  /** true quando conteúdo fixo caiu em TTS nativo/web — gate FAIL. */
  fixedContentNativeTtsFallback: boolean;
}

const TRACE_LIMIT = 80;
const records: VoicePlaybackRecord[] = [];
let fixedContentNativeTtsFallbackCount = 0;

export function normalizeMandarinText(text: string): string {
  return String(text ?? "").trim().replace(/\s+/g, "");
}

export function voicePlaybackRecords(): readonly VoicePlaybackRecord[] {
  return records.slice();
}

export function fixedContentNativeTtsFallbackCountValue(): number {
  return fixedContentNativeTtsFallbackCount;
}

export function resetVoiceConsistencyForTests(): void {
  records.length = 0;
  fixedContentNativeTtsFallbackCount = 0;
}

/**
 * Registra uma decisão/resultado de reprodução. Se FIXED cair em TTS,
 * incrementa FIXED_CONTENT_NATIVE_TTS_FALLBACK.
 */
export function recordVoicePlayback(input: {
  audioId?: string | null;
  text?: string | null;
  source?: string | null;
  contentClass: VoicePlaybackSourceKind;
  engineSelected: VoicePlaybackEngine;
  assetUsed?: string | null;
  fallbackOccurred?: boolean;
  fallbackReason?: string | null;
}): VoicePlaybackRecord {
  const textNormalized = normalizeMandarinText(input.text ?? "");
  const engine = input.engineSelected;
  const isTts = engine === "native-tts" || engine === "web-tts";
  const fixedContentNativeTtsFallback =
    input.contentClass === "FIXED_CONTENT" && (input.fallbackOccurred === true || isTts);
  if (fixedContentNativeTtsFallback) fixedContentNativeTtsFallbackCount += 1;

  const entry: VoicePlaybackRecord = {
    at: Date.now(),
    audioId: input.audioId ?? null,
    textNormalized,
    textChars: textNormalized.length,
    source: input.source ?? null,
    contentClass: input.contentClass,
    engineSelected: engine,
    assetUsed: input.assetUsed ?? null,
    canonicalVoiceProfile: CANONICAL_VOICE_PROFILE,
    fallbackOccurred: Boolean(input.fallbackOccurred) || isTts,
    fallbackReason: input.fallbackReason ?? (isTts ? "TTS_ENGINE_SELECTED" : null),
    fixedContentNativeTtsFallback,
  };
  records.push(entry);
  if (records.length > TRACE_LIMIT) records.splice(0, records.length - TRACE_LIMIT);
  if (typeof window !== "undefined") {
    (window as Window & {
      __longyuVoiceConsistency?: {
        records: VoicePlaybackRecord[];
        fixedContentNativeTtsFallbackCount: number;
      };
    }).__longyuVoiceConsistency = {
      records: records.slice(),
      fixedContentNativeTtsFallbackCount,
    };
  }
  return entry;
}

/** Gate puro: ZERO fallbacks nativos/web em conteúdo fixo. */
export function fixedContentNativeTtsFallbackIsZero(): boolean {
  return fixedContentNativeTtsFallbackCount === 0;
}
