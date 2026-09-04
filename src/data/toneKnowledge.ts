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
