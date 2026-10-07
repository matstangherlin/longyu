/**
 * RC2.2.32 — Contraste Auditivo (família pedagógica).
 *
 * Pares mínimos e tons com a MESMA voz canônica nos dois modelos.
 * A diferença percebida deve ser fonética/tonal — nunca de locutor.
 *
 * RC2.3.5 — Contrast Library V2. Não é uma quinta fonte de pares: agrega as
 * que já existem (pares do corpus da Jornada, conjuntos tonais ensinados,
 * Pronunciation Core BR do Pinyin Lab e as sementes abaixo), deduplica, e só
 * aceita o par que é contraste de verdade:
 *   - tom: mesma base segmental, tom diferente;
 *   - inicial/final: mesmo tom, uma única dimensão de som diferente;
 *   - os dois lados com asset canônico do MESMO speaker.
 * O resto vira `rejected` com motivo — nunca entra mudo ou com voz trocada.
 */
import { audioEntryByText } from "../data/audioManifest.generated";
import { MINIMAL_PAIRS } from "../data/perceptionDrills";
import { PRONUNCIATION_CORE_BR } from "../data/pronunciationCoreBr";
import { TONE_CONTRAST_SETS } from "../data/toneContrastSets";
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
    id: "contrast:xi-shi:v2",
    kind: "initial",
    labelPt: "xī × shī",
    labelEn: "xī × shī",
    a: { hanzi: "西", pinyin: "xī", audioText: "西", meaningPt: "oeste", meaningEn: "west" },
    b: { hanzi: "湿", pinyin: "shī", audioText: "湿", meaningPt: "molhado", meaningEn: "wet" },
    sameCanonicalVoiceRequired: true,
  },
  {
    id: "contrast:hao-hou:v1",
    kind: "final",
    labelPt: "hào × hòu",
    labelEn: "hào × hòu",
    a: { hanzi: "号", pinyin: "hào", audioText: "号", meaningPt: "número; dia do mês", meaningEn: "number; date" },
    b: { hanzi: "后", pinyin: "hòu", audioText: "后", meaningPt: "depois; atrás", meaningEn: "after; behind" },
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

/**
 * RC2.3.5 — sementes retiradas, com o motivo. Não eram contraste de UMA
 * dimensão: o aluno não teria como saber qual diferença ouviu.
 */
export const SUPERSEDED_CONTRAST_SEEDS = [
  { id: "contrast:xi-shi:v1", pair: "西xī × 十shí", reason: "CONFOUNDED_TONE", replacedBy: "contrast:xi-shi:v2" },
  { id: "contrast:xie-xiao:v1", pair: "谢xiè × 小xiǎo", reason: "CONFOUNDED_TONE", replacedBy: "contrast:hao-hou:v1" },
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

// ---------------------------------------------------------------------------
// RC2.3.5 — Contrast Library V2
// ---------------------------------------------------------------------------

export type ContrastSource = "CORPUS_MINIMAL_PAIR" | "TONE_CONTRAST_SET" | "PRONUNCIATION_CORE_BR" | "SEED";

export type ContrastRejection =
  | "MISSING_CANONICAL_AUDIO"
  | "SPEAKER_MISMATCH"
  | "CONFOUNDED_TONE"
  | "CONFOUNDED_SEGMENT"
  | "SAME_SOUND";

export interface ContrastSide {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  tone: number;
  initial: string;
  final: string;
  audioId: string | null;
  speaker: string | null;
}

export interface ContrastLibraryEntry {
  /** Estável: tipo + hànzì ordenados. */
  id: string;
  kind: AudioContrastKind;
  /** "tone:1x4", "initial:sh×x", "final:an×ang". */
  family: string;
  a: ContrastSide;
  b: ContrastSide;
  sources: ContrastSource[];
  /** Corpus da Jornada ou conjunto tonal ensinado — a autoridade curricular cobre os dois lados. */
  curriculumBacked: boolean;
  /** Conjunto tonal com membro `contrastOnly`: só Descoberta (nunca vale mastery). */
  discoveryOnly: boolean;
}

export interface RejectedContrast {
  key: string;
  a: string;
  b: string;
  sources: ContrastSource[];
  reason: ContrastRejection;
}

const INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];

export function pinyinTone(pinyin: string): number {
  const d = pinyin.normalize("NFD");
  if (d.includes("̄")) return 1;
  if (d.includes("́")) return 2;
  if (d.includes("̌")) return 3;
  if (d.includes("̀")) return 4;
  return 5;
}

export function pinyinSegments(pinyin: string): { initial: string; final: string } {
  const base = pinyin
    .normalize("NFD")
    .replace(/[̄́̌̀]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-zü]/g, "");
  const initial = INITIALS.find((i) => base.startsWith(i)) ?? "";
  return { initial, final: base.slice(initial.length) };
}

function side(hanzi: string, pinyin: string, meaningPt: string): ContrastSide {
  const entry = audioEntryByText(hanzi);
  const { initial, final } = pinyinSegments(pinyin);
  return { hanzi, pinyin, meaningPt, tone: pinyinTone(pinyin), initial, final, audioId: entry?.audioId ?? null, speaker: entry?.speaker ?? null };
}

/** Classifica um par: o que muda entre A e B, e se só UMA coisa muda. */
export function classifyContrast(a: ContrastSide, b: ContrastSide): { kind: AudioContrastKind; family: string } | ContrastRejection {
  const sameSeg = a.initial === b.initial && a.final === b.final;
  const sameTone = a.tone === b.tone;
  if (sameSeg && sameTone) return "SAME_SOUND";
  if (sameSeg) {
    const [x, y] = [a.tone, b.tone].sort();
    return { kind: "tone", family: `tone:${x}x${y}` };
  }
  if (!sameTone) return "CONFOUNDED_TONE";
  if (a.initial !== b.initial && a.final === b.final) {
    return { kind: "initial", family: `initial:${[a.initial || "∅", b.initial || "∅"].sort().join("×")}` };
  }
  if (a.final !== b.final && a.initial === b.initial) {
    return { kind: "final", family: `final:${[a.final, b.final].sort().join("×")}` };
  }
  return "CONFOUNDED_SEGMENT";
}

interface Candidate {
  a: ContrastSide;
  b: ContrastSide;
  source: ContrastSource;
  curriculumBacked: boolean;
  discoveryOnly: boolean;
}

function candidates(): Candidate[] {
  const out: Candidate[] = [];
  for (const d of MINIMAL_PAIRS) {
    out.push({ a: side(d.a.hanzi, d.a.pinyin, d.a.meaningPt), b: side(d.b.hanzi, d.b.pinyin, d.b.meaningPt), source: "CORPUS_MINIMAL_PAIR", curriculumBacked: true, discoveryOnly: false });
  }
  for (const set of TONE_CONTRAST_SETS) {
    out.push({
      a: side(set.a.hanzi, set.a.pinyin, set.a.meaningPt),
      b: side(set.b.hanzi, set.b.pinyin, set.b.meaningPt),
      source: "TONE_CONTRAST_SET",
      curriculumBacked: set.taughtIn.length > 0,
      discoveryOnly: Boolean(set.a.contrastOnly || set.b.contrastOnly),
    });
  }
  for (const c of PRONUNCIATION_CORE_BR) {
    for (let i = 0; i < c.sounds.length; i += 1) {
      for (let j = i + 1; j < c.sounds.length; j += 1) {
        const x = c.sounds[i]!;
        const y = c.sounds[j]!;
        out.push({ a: side(x.hanzi, x.pinyin, x.meaningPt), b: side(y.hanzi, y.pinyin, y.meaningPt), source: "PRONUNCIATION_CORE_BR", curriculumBacked: false, discoveryOnly: false });
      }
    }
  }
  for (const p of AUDIO_CONTRAST_SEED_PAIRS) {
    out.push({ a: side(p.a.hanzi, p.a.pinyin, p.a.meaningPt), b: side(p.b.hanzi, p.b.pinyin, p.b.meaningPt), source: "SEED", curriculumBacked: false, discoveryOnly: false });
  }
  return out;
}

export function buildContrastLibrary(input: Candidate[] = candidates()): {
  accepted: ContrastLibraryEntry[];
  rejected: RejectedContrast[];
} {
  const byKey = new Map<string, { a: ContrastSide; b: ContrastSide; sources: Set<ContrastSource>; curriculumBacked: boolean; discoveryOnly: boolean }>();
  for (const c of input) {
    const [a, b] = c.a.hanzi <= c.b.hanzi ? [c.a, c.b] : [c.b, c.a];
    const key = `${a.hanzi}|${b.hanzi}`;
    const prev = byKey.get(key);
    if (prev) {
      prev.sources.add(c.source);
      prev.curriculumBacked ||= c.curriculumBacked;
      prev.discoveryOnly ||= c.discoveryOnly;
    } else {
      byKey.set(key, { a, b, sources: new Set([c.source]), curriculumBacked: c.curriculumBacked, discoveryOnly: c.discoveryOnly });
    }
  }
  const accepted: ContrastLibraryEntry[] = [];
  const rejected: RejectedContrast[] = [];
  for (const [key, row] of byKey) {
    const sources = [...row.sources].sort();
    const reject = (reason: ContrastRejection) => rejected.push({ key, a: `${row.a.hanzi}${row.a.pinyin}`, b: `${row.b.hanzi}${row.b.pinyin}`, sources, reason });
    const cls = classifyContrast(row.a, row.b);
    if (typeof cls === "string") {
      reject(cls);
      continue;
    }
    if (!row.a.audioId || !row.b.audioId) {
      reject("MISSING_CANONICAL_AUDIO");
      continue;
    }
    if (row.a.speaker !== CANONICAL_SPEAKER_TAG || row.b.speaker !== row.a.speaker) {
      reject("SPEAKER_MISMATCH");
      continue;
    }
    accepted.push({
      id: `contrast:${cls.kind}:${row.a.hanzi}${row.b.hanzi}`,
      kind: cls.kind,
      family: cls.family,
      a: row.a,
      b: row.b,
      sources,
      curriculumBacked: row.curriculumBacked,
      discoveryOnly: row.discoveryOnly,
    });
  }
  accepted.sort((x, y) => x.kind.localeCompare(y.kind) || x.family.localeCompare(y.family) || x.id.localeCompare(y.id));
  return { accepted, rejected };
}

let cachedLibrary: ReturnType<typeof buildContrastLibrary> | null = null;

export function contrastLibrary(): ReturnType<typeof buildContrastLibrary> {
  cachedLibrary ??= buildContrastLibrary();
  return cachedLibrary;
}

/** Todos os membros de um conjunto de sons têm asset canônico do mesmo speaker? */
export function soundsShareCanonicalVoice(hanzi: readonly string[]): boolean {
  const speakers = hanzi.map((h) => audioEntryByText(h)?.speaker ?? null);
  return speakers.every((s) => s === CANONICAL_SPEAKER_TAG);
}

// ---------------------------------------------------------------------------
// Elegibilidade — reusa a autoridade que a Jornada já usa para pares mínimos
// (`seenGlyphs`: learnedChars + hànzì montados). Nada de nova fonte de verdade.
// ---------------------------------------------------------------------------

export const CONTRAST_ELIGIBILITY_ORDER = ["NOT_READY", "DISCOVERY_ELIGIBLE", "PERCEPTION_ELIGIBLE", "PRODUCTION_ELIGIBLE"] as const;
export type ContrastEligibility = (typeof CONTRAST_ELIGIBILITY_ORDER)[number];

/**
 * - sem voz canônica comum → NOT_READY (nunca toca mudo ou com locutor trocado);
 * - lados ainda não vistos, ou par só de demonstração → DISCOVERY_ELIGIBLE (ouvir, sem nota);
 * - os dois lados vistos → PERCEPTION_ELIGIBLE (identificar vale);
 * - + percepção já concluída com acerto → PRODUCTION_ELIGIBLE (gravar e comparar).
 */
export function contrastEligibility(
  entry: Pick<ContrastLibraryEntry, "a" | "b" | "discoveryOnly">,
  knownGlyphs: ReadonlySet<string>,
  opts: { perceptionPassed?: boolean } = {}
): ContrastEligibility {
  const voiced = entry.a.audioId && entry.b.audioId && entry.a.speaker === CANONICAL_SPEAKER_TAG && entry.b.speaker === entry.a.speaker;
  if (!voiced) return "NOT_READY";
  if (entry.discoveryOnly || !knownGlyphs.has(entry.a.hanzi) || !knownGlyphs.has(entry.b.hanzi)) return "DISCOVERY_ELIGIBLE";
  return opts.perceptionPassed ? "PRODUCTION_ELIGIBLE" : "PERCEPTION_ELIGIBLE";
}

export function contrastAllows(eligibility: ContrastEligibility, stage: "DISCOVERY" | "PERCEPTION" | "PRODUCTION"): boolean {
  const need: ContrastEligibility =
    stage === "DISCOVERY" ? "DISCOVERY_ELIGIBLE" : stage === "PERCEPTION" ? "PERCEPTION_ELIGIBLE" : "PRODUCTION_ELIGIBLE";
  return CONTRAST_ELIGIBILITY_ORDER.indexOf(eligibility) >= CONTRAST_ELIGIBILITY_ORDER.indexOf(need);
}
