export type MandarinToneNumber = 1 | 2 | 3 | 4 | 5;

export type ToneDisplayMode = "EARLY" | "MID" | "LATE" | "ASSESSMENT";

export interface ToneKnowledge {
  id: `concept:tone-${number}`;
  number: MandarinToneNumber;
  mark: string;
  contour: "HIGH_LEVEL" | "RISING" | "DIP" | "FALLING" | "NEUTRAL";
  learnerDescriptionPt: string;
  learnerDescriptionEn: string;
  canonicalExample: {
    hanzi: string;
    pinyin: string;
  };
}

/**
 * RC2.2.17 · BQ–CA — cópia da EXPERIÊNCIA GUIADA de tom (apresentação, não
 * currículo). Tom é contorno de altura (pitch). Nada aqui fala de língua ou
 * boca: articulação mora em `articulationTargets.ts`, separada.
 */
export interface ToneGuidance {
  number: MandarinToneNumber;
  /** Frase curta do passo "veja o movimento". */
  guidedPt: string;
  guidedEn: string;
  /** Gesto de mão para memorizar o contorno. */
  gesturePt: string;
  gestureEn: string;
  /**
   * Altura da voz em 5 níveis (1 = baixo, 5 = alto), pontos do contorno que o
   * ponto animado percorre. É ilustração pedagógica, não pitch tracking.
   */
  heights: readonly number[];
  /** Duração relativa (neutro é curto). */
  durationMs: number;
}

export const TONE_GUIDANCE: readonly ToneGuidance[] = [
  { number: 1, guidedPt: "Alto e estável.", guidedEn: "High and steady.", gesturePt: "Mão andando reta, no alto.", gestureEn: "Hand moving straight, up high.", heights: [5, 5, 5], durationMs: 900 },
  { number: 2, guidedPt: "A voz sobe.", guidedEn: "Your voice rises.", gesturePt: "Mão sobe.", gestureEn: "Hand goes up.", heights: [3, 4, 5], durationMs: 900 },
  {
    number: 3,
    guidedPt: "Fica baixo; sozinho pode fazer um vale. Na fala natural, muitas vezes o final não sobe por completo.",
    guidedEn: "It stays low; on its own it can dip. In natural speech the end often does not fully rise.",
    gesturePt: "Mão baixa, num vale curto.",
    gestureEn: "Hand low, in a short dip.",
    heights: [2, 1, 1, 3],
    durationMs: 1000,
  },
  { number: 4, guidedPt: "Cai firme.", guidedEn: "It falls firmly.", gesturePt: "Mão desce.", gestureEn: "Hand goes down.", heights: [5, 3, 1], durationMs: 700 },
  { number: 5, guidedPt: "Curto e leve.", guidedEn: "Short and light.", gesturePt: "Um toque leve, sem movimento.", gestureEn: "A light tap, no movement.", heights: [3], durationMs: 300 },
] as const;

export function toneGuidance(number: MandarinToneNumber): ToneGuidance {
  const item = TONE_GUIDANCE.find((candidate) => candidate.number === number);
  if (!item) throw new Error(`Unknown Mandarin tone: ${number}`);
  return item;
}

/**
 * RC2.2.17 · CI — gancho para um futuro analisador de pitch. Hoje não existe
 * medição: todo exercício de tom fica em NO_PITCH_MEASUREMENT e nenhuma tela
 * pode mostrar nota/percentual de tom.
 */
export type ToneProductionEvidenceStatus = "NO_PITCH_MEASUREMENT";
export interface ToneProductionEvidence {
  status: ToneProductionEvidenceStatus;
  /** Frase reconhecida pelo SpeechRecognizer (texto), quando houve. */
  recognizedText?: string | null;
  /** O aluno gravou e ouviu a própria voz para comparar. */
  selfCompared?: boolean;
}
export const TONE_PRODUCTION_EVIDENCE_STATUS: ToneProductionEvidenceStatus = "NO_PITCH_MEASUREMENT";

/**
 * Canonical tone model shared by Journey lessons, Tone Trainer and Pinyin Lab.
 * Tone 3 uses a beginner-friendly dip while explicitly avoiding the claim that
 * every natural-speech realization must finish with a full rise.
 */
export const TONE_KNOWLEDGE: readonly ToneKnowledge[] = [
  {
    id: "concept:tone-1",
    number: 1,
    mark: "ˉ",
    contour: "HIGH_LEVEL",
    learnerDescriptionPt: "alto e reto",
    learnerDescriptionEn: "high and level",
    canonicalExample: { hanzi: "妈", pinyin: "mā" },
  },
  {
    id: "concept:tone-2",
    number: 2,
    mark: "´",
    contour: "RISING",
    learnerDescriptionPt: "sobe",
    learnerDescriptionEn: "rising",
    canonicalExample: { hanzi: "麻", pinyin: "má" },
  },
  {
    id: "concept:tone-3",
    number: 3,
    mark: "ˇ",
    contour: "DIP",
    learnerDescriptionPt: "desce e volta (vale); na fala natural pode ficar mais baixo e curto",
    learnerDescriptionEn: "a dip; in natural speech it may stay lower and shorter",
    canonicalExample: { hanzi: "马", pinyin: "mǎ" },
  },
  {
    id: "concept:tone-4",
    number: 4,
    mark: "`",
    contour: "FALLING",
    learnerDescriptionPt: "cai",
    learnerDescriptionEn: "falling",
    canonicalExample: { hanzi: "骂", pinyin: "mà" },
  },
  {
    id: "concept:tone-5",
    number: 5,
    mark: "",
    contour: "NEUTRAL",
    learnerDescriptionPt: "leve e curto, sem marca",
    learnerDescriptionEn: "light and short, with no mark",
    canonicalExample: { hanzi: "吗", pinyin: "ma" },
  },
] as const;

export const TONE_SYSTEM_TARGET_ID = "concept:tone-system" as const;
export const TONE_NEUTRAL_POLICY =
  "The neutral tone is introduced only after the four marked contours are noticed; it is never treated as a fifth full contour." as const;

export function toneKnowledge(number: MandarinToneNumber): ToneKnowledge {
  const item = TONE_KNOWLEDGE.find((candidate) => candidate.number === number);
  if (!item) throw new Error(`Unknown Mandarin tone: ${number}`);
  return item;
}

export function toneKnowledgeTargetId(number: MandarinToneNumber): ToneKnowledge["id"] {
  return toneKnowledge(number).id;
}
