/**
 * RC2.2.32 — Contraste Auditivo (família pedagógica).
 *
 * Pares mínimos e tons com a MESMA voz canônica nos dois modelos.
 * A diferença percebida deve ser fonética/tonal — nunca de locutor.
 */
import { audioEntryByText } from "../data/audioManifest.generated";
import { CANONICAL_SPEAKER_TAG, CANONICAL_VOICE_PROFILE } from "./audio/voiceConsistency";

export type AudioContrastKind = "initial" | "tone" | "final";

export interface AudioContrastMember {
  hanzi: string;
  pinyin: string;
  audioText: string;
  meaningPt: string;
  meaningEn: string;
}

export interface AudioContrastPair {
  id: string;
  kind: AudioContrastKind;
  labelPt: string;
  labelEn: string;
  a: AudioContrastMember;
  b: AudioContrastMember;
  /** Ambos os membros devem resolver para o mesmo speaker canônico. */
  sameCanonicalVoiceRequired: true;
}

export const AUDIO_CONTRAST_SEED_PAIRS: readonly AudioContrastPair[] = [
  {
    id: "contrast:xi-shi:v1",
    kind: "initial",
    labelPt: "xī × shí",
    labelEn: "xī × shí",
    a: { hanzi: "西", pinyin: "xī", audioText: "西", meaningPt: "oeste", meaningEn: "west" },
    b: { hanzi: "十", pinyin: "shí", audioText: "十", meaningPt: "dez", meaningEn: "ten" },
    sameCanonicalVoiceRequired: true,
  },
  {
    id: "contrast:xie-xiao:v1",
    kind: "final",
    labelPt: "xiè × xiǎo",
    labelEn: "xiè × xiǎo",
    a: { hanzi: "谢", pinyin: "xiè", audioText: "谢", meaningPt: "agradecer", meaningEn: "thank" },
    b: { hanzi: "小", pinyin: "xiǎo", audioText: "小", meaningPt: "pequeno", meaningEn: "small" },
    sameCanonicalVoiceRequired: true,
  },
  {
    id: "contrast:ma-tones:1-2:v1",
    kind: "tone",
    labelPt: "mā × má",
    labelEn: "mā × má",
    a: { hanzi: "妈", pinyin: "mā", audioText: "妈", meaningPt: "mãe", meaningEn: "mom" },
    b: { hanzi: "麻", pinyin: "má", audioText: "麻", meaningPt: "cânhamo / formigamento", meaningEn: "hemp / numb" },
    sameCanonicalVoiceRequired: true,
  },
  {
    id: "contrast:ma-tones:3-4:v1",
    kind: "tone",
    labelPt: "mǎ × mà",
    labelEn: "mǎ × mà",
    a: { hanzi: "马", pinyin: "mǎ", audioText: "马", meaningPt: "cavalo", meaningEn: "horse" },
    b: { hanzi: "骂", pinyin: "mà", audioText: "骂", meaningPt: "repreender", meaningEn: "scold" },
    sameCanonicalVoiceRequired: true,
  },
] as const;

export interface AudioContrastVoiceCheck {
  pairId: string;
  aAudioId: string | null;
  bAudioId: string | null;
  aSpeaker: string | null;
  bSpeaker: string | null;
  sameCanonicalVoice: boolean;
  missingAssets: string[];
}

/** Valida que A e B usam a mesma voz canônica (asset no manifesto). */
export function checkContrastPairVoice(pair: AudioContrastPair): AudioContrastVoiceCheck {
  const a = audioEntryByText(pair.a.audioText);
  const b = audioEntryByText(pair.b.audioText);
  const missing: string[] = [];
  if (!a) missing.push(pair.a.audioText);
  if (!b) missing.push(pair.b.audioText);
  const aSpeaker = a?.speaker ?? null;
  const bSpeaker = b?.speaker ?? null;
  const sameCanonicalVoice =
    aSpeaker === CANONICAL_SPEAKER_TAG &&
    bSpeaker === CANONICAL_SPEAKER_TAG &&
    aSpeaker === bSpeaker;
  return {
    pairId: pair.id,
    aAudioId: a?.audioId ?? null,
    bAudioId: b?.audioId ?? null,
    aSpeaker,
    bSpeaker,
    sameCanonicalVoice,
    missingAssets: missing,
  };
}

export function auditAudioContrastPairs(pairs: readonly AudioContrastPair[] = AUDIO_CONTRAST_SEED_PAIRS): {
  voiceProfile: typeof CANONICAL_VOICE_PROFILE;
  total: number;
  sameVoice: number;
  missingAssets: number;
  failures: AudioContrastVoiceCheck[];
} {
  const checks = pairs.map(checkContrastPairVoice);
  const failures = checks.filter((c) => !c.sameCanonicalVoice || c.missingAssets.length > 0);
  return {
    voiceProfile: CANONICAL_VOICE_PROFILE,
    total: pairs.length,
    sameVoice: checks.filter((c) => c.sameCanonicalVoice).length,
    missingAssets: checks.reduce((n, c) => n + c.missingAssets.length, 0),
    failures,
  };
}
