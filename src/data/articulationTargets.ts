/**
 * RC2.2.17 · CB/EC/ED — articulação (consoantes e vogais), sistema SEPARADO
 * de tom.
 *
 * Tom é contorno de altura da voz (ToneContour / toneKnowledge). Língua,
 * lábios e ponto de articulação explicam FONEMAS — nunca o tom. Nada aqui é
 * usado para ensinar 1º/2º/3º/4º tom.
 *
 * RC2.2.19 — os contrastes que precisam de desenho ganham ArticulationDiagram
 * (corte lateral: lábios, dentes, céu da boca, língua) no Pinyin Lab. Os de
 * sopro/nasal continuam só com áudio e texto (desenho não ajuda ali).
 */
export type ArticulationContrastId =
  | "b-p"
  | "d-t"
  | "g-k"
  | "z-c-s"
  | "zh-ch-sh"
  | "j-q-x"
  | "u-umlaut"
  | "r-retroflex"
  | "an-ang"
  | "en-eng"
  | "in-ing"
  | "e"
  | "apical-i";

export type ArticulationFeature = "aspiration" | "place" | "tongue-shape" | "lip-rounding" | "nasal-ending" | "vowel-quality";

export interface ArticulationTarget {
  id: ArticulationContrastId;
  feature: ArticulationFeature;
  /** Precisa de desenho de língua/boca (ArticulationDiagram). */
  needsDiagram: boolean;
  status: "PLANNED_RC2_2_18" | "DIAGRAM_READY_RC2_2_19";
}

export const ARTICULATION_TARGETS: readonly ArticulationTarget[] = [
  { id: "b-p", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "d-t", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "g-k", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "z-c-s", feature: "place", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "zh-ch-sh", feature: "tongue-shape", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "j-q-x", feature: "place", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "u-umlaut", feature: "lip-rounding", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "r-retroflex", feature: "tongue-shape", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "an-ang", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "en-eng", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "in-ing", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "e", feature: "vowel-quality", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
  { id: "apical-i", feature: "vowel-quality", needsDiagram: true, status: "DIAGRAM_READY_RC2_2_19" },
] as const;

/**
 * RC2.2.19 — o que o desenho mostra. Só posições relativas (0–1) num corte
 * lateral; nada de "o tom é feito com a língua".
 */
export type TonguePlacement = "tip-behind-upper-teeth" | "tip-curled-back" | "blade-to-hard-palate" | "tip-low-body-mid" | "tip-behind-lower-teeth";
export type LipShape = "spread" | "neutral" | "rounded";

export interface ArticulationDiagramSpec {
  id: ArticulationContrastId;
  sounds: string;
  tongue: TonguePlacement;
  lips: LipShape;
  /** Uma frase curta, sem jargão, do que a boca faz. */
  tipPt: string;
  tipEn: string;
  /** Exemplos para ouvir (o áudio lê o hànzì; o pinyin mostra o som). */
  examples: readonly { pinyin: string; hanzi: string }[];
}

export const ARTICULATION_DIAGRAMS: readonly ArticulationDiagramSpec[] = [
  {
    id: "j-q-x",
    sounds: "j · q · x",
    tongue: "blade-to-hard-palate",
    lips: "spread",
    tipPt: "Ponta da língua atrás dos dentes de baixo; o meio da língua sobe até o céu da boca. Lábios em sorriso.",
    tipEn: "Tongue tip behind the lower teeth; the middle of the tongue rises to the roof of the mouth. Lips in a smile.",
    examples: [{ pinyin: "jī", hanzi: "鸡" }, { pinyin: "qī", hanzi: "七" }, { pinyin: "xī", hanzi: "西" }],
  },
  {
    id: "zh-ch-sh",
    sounds: "zh · ch · sh",
    tongue: "tip-curled-back",
    lips: "neutral",
    tipPt: "Ponta da língua dobrada para trás, logo atrás da gengiva de cima.",
    tipEn: "Tongue tip curled back, just behind the upper gum ridge.",
    examples: [{ pinyin: "zhī", hanzi: "知" }, { pinyin: "chī", hanzi: "吃" }, { pinyin: "shī", hanzi: "诗" }],
  },
  {
    id: "z-c-s",
    sounds: "z · c · s",
    tongue: "tip-behind-upper-teeth",
    lips: "neutral",
    tipPt: "Ponta da língua reta, encostada atrás dos dentes de cima.",
    tipEn: "Tongue tip flat, right behind the upper teeth.",
    examples: [{ pinyin: "zì", hanzi: "字" }, { pinyin: "cí", hanzi: "词" }, { pinyin: "sì", hanzi: "四" }],
  },
  {
    id: "r-retroflex",
    sounds: "r",
    tongue: "tip-curled-back",
    lips: "neutral",
    tipPt: "Como o sh, mas com voz e sem encostar: a ponta fica perto, não toca.",
    tipEn: "Like sh, but voiced and without touching: the tip stays close.",
    examples: [{ pinyin: "rì", hanzi: "日" }, { pinyin: "rén", hanzi: "人" }],
  },
  {
    id: "u-umlaut",
    sounds: "ü",
    tongue: "tip-behind-lower-teeth",
    lips: "rounded",
    tipPt: "Língua do i, lábios do u: diga i e arredonde os lábios sem mexer a língua.",
    tipEn: "Tongue of i, lips of u: say i and round your lips without moving the tongue.",
    examples: [{ pinyin: "lǜ", hanzi: "绿" }, { pinyin: "nǚ", hanzi: "女" }, { pinyin: "yú", hanzi: "鱼" }],
  },
  {
    id: "e",
    sounds: "e",
    tongue: "tip-low-body-mid",
    lips: "neutral",
    tipPt: "Boca meio aberta, lábios soltos, língua relaxada no meio — um som que o português não tem.",
    tipEn: "Mouth half open, relaxed lips, tongue resting in the middle.",
    examples: [{ pinyin: "è", hanzi: "饿" }, { pinyin: "hē", hanzi: "喝" }],
  },
  {
    id: "apical-i",
    sounds: "zi · ci · si · zhi · chi · shi · ri",
    tongue: "tip-behind-upper-teeth",
    lips: "spread",
    tipPt: "Depois de z/c/s e zh/ch/sh/r, o i não é \"i\": a língua fica onde a consoante estava e só a voz continua.",
    tipEn: "After z/c/s and zh/ch/sh/r, the i is not \"ee\": the tongue stays where the consonant was and only the voice continues.",
    examples: [{ pinyin: "sì", hanzi: "四" }, { pinyin: "shì", hanzi: "是" }],
  },
];
