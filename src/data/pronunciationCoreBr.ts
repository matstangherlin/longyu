/**
 * RC2.2.20 · V5A — Pronunciation Core BR.
 *
 * Os contrastes que mais pegam quem fala português, ensinados como
 * percepção antes de cobrança:
 *
 *   ver articulação → ouvir A → ouvir B → comparar → identificar → (produzir)
 *
 * Nunca começa por quiz. A explicação em relação ao português é curta e só
 * existe quando ajuda (b/p do pinyin não é o B/P do português).
 *
 * Reusa ARTICULATION_TARGETS/ARTICULATION_DIAGRAMS (mesmo sistema de
 * articulação, separado de tom). Pares são palavras reais no MESMO tom, para
 * a única diferença ser o som em foco. Este arquivo é conteúdo do Pinyin Lab,
 * fora das fontes congeladas da Jornada (fingerprint inalterado).
 */
import type { ArticulationContrastId } from "./articulationTargets";

export interface ContrastSound {
  /** Rótulo do som (ex.: "b"). */
  label: string;
  hanzi: string;
  pinyin: string;
  /** Sentido curto, só para dar vida à palavra (não é o foco). */
  meaningPt: string;
}

export interface PronunciationContrast {
  id: ArticulationContrastId;
  title: string;
  /** 2 ou 3 sons do contraste, na ordem em que são apresentados. */
  sounds: readonly ContrastSound[];
  /** Uma ou duas frases: o que muda na boca, e a armadilha do português. */
  notePt: string;
}

export const PRONUNCIATION_CORE_BR: readonly PronunciationContrast[] = [
  {
    id: "b-p",
    title: "b × p",
    sounds: [
      { label: "b", hanzi: "八", pinyin: "bā", meaningPt: "oito" },
      { label: "p", hanzi: "趴", pinyin: "pā", meaningPt: "deitar de bruços" },
    ],
    notePt: "O b do pinyin não é o B do português: é um p sem sopro. O p é o mesmo p com um sopro forte — sinta o ar na mão.",
  },
  {
    id: "d-t",
    title: "d × t",
    sounds: [
      { label: "d", hanzi: "搭", pinyin: "dā", meaningPt: "montar" },
      { label: "t", hanzi: "他", pinyin: "tā", meaningPt: "ele" },
    ],
    notePt: "d é um t sem sopro (nunca o d de \"dia\" com som de dj). t tem um sopro forte.",
  },
  {
    id: "g-k",
    title: "g × k",
    sounds: [
      { label: "g", hanzi: "个", pinyin: "gè", meaningPt: "classificador (unidade)" },
      { label: "k", hanzi: "客", pinyin: "kè", meaningPt: "convidado; cliente" },
    ],
    notePt: "g é um k sem sopro. k tem sopro forte. A diferença é o ar, não a voz.",
  },
  {
    id: "z-c-s",
    title: "z × c",
    sounds: [
      { label: "z", hanzi: "在", pinyin: "zài", meaningPt: "estar em" },
      { label: "c", hanzi: "菜", pinyin: "cài", meaningPt: "prato, verdura" },
    ],
    notePt: "Língua atrás dos dentes de cima. z ≈ \"dz\" sem sopro, c ≈ \"ts\" com sopro. O c do pinyin nunca é \"k\".",
  },
  {
    id: "zh-ch-sh",
    title: "ch × sh",
    sounds: [
      { label: "ch", hanzi: "吃", pinyin: "chī", meaningPt: "comer" },
      { label: "sh", hanzi: "师", pinyin: "shī", meaningPt: "mestre, professor" },
    ],
    notePt: "Ponta da língua dobrada para trás, no céu da boca. ch sai com sopro e trava; sh sai contínuo, sem travar.",
  },
  {
    id: "j-q-x",
    title: "j × q × x",
    sounds: [
      { label: "j", hanzi: "机", pinyin: "jī", meaningPt: "máquina" },
      { label: "q", hanzi: "七", pinyin: "qī", meaningPt: "sete" },
      { label: "x", hanzi: "西", pinyin: "xī", meaningPt: "oeste" },
    ],
    notePt: "Lábios em sorriso, meio da língua no céu da boca. j sem sopro, q com sopro, x é um chiado suave — o q nunca é \"k\".",
  },
  {
    id: "u-umlaut",
    title: "u × ü",
    sounds: [
      { label: "u", hanzi: "路", pinyin: "lù", meaningPt: "caminho" },
      { label: "ü", hanzi: "绿", pinyin: "lǜ", meaningPt: "verde" },
    ],
    notePt: "Diga \"i\" e, sem mexer a língua, arredonde os lábios como para \"u\". Esse som não existe em português.",
  },
  {
    id: "r-retroflex",
    title: "r × l",
    sounds: [
      { label: "r", hanzi: "肉", pinyin: "ròu", meaningPt: "carne" },
      { label: "l", hanzi: "漏", pinyin: "lòu", meaningPt: "vazar" },
    ],
    notePt: "O r do pinyin não é o r de \"caro\" nem de \"rato\": parece o j de \"já\" com a língua dobrada para trás.",
  },
  {
    id: "an-ang",
    title: "an × ang",
    sounds: [
      { label: "an", hanzi: "班", pinyin: "bān", meaningPt: "turma" },
      { label: "ang", hanzi: "帮", pinyin: "bāng", meaningPt: "ajudar" },
    ],
    notePt: "an termina com a língua nos dentes (um n de verdade). ang termina no fundo da boca, como \"manga\" sem o \"ga\".",
  },
  {
    id: "en-eng",
    title: "en × eng",
    sounds: [
      { label: "en", hanzi: "根", pinyin: "gēn", meaningPt: "raiz" },
      { label: "eng", hanzi: "耕", pinyin: "gēng", meaningPt: "arar a terra" },
    ],
    notePt: "Mesma ideia de an/ang: en fecha na frente, eng fecha no fundo da boca.",
  },
  {
    id: "in-ing",
    title: "in × ing",
    sounds: [
      { label: "in", hanzi: "心", pinyin: "xīn", meaningPt: "coração" },
      { label: "ing", hanzi: "星", pinyin: "xīng", meaningPt: "estrela" },
    ],
    notePt: "in fecha com a língua nos dentes; ing fecha no fundo, e a boca fica mais aberta no final.",
  },
];

/** A ordem pedagógica de cada contraste — percepção antes de cobrança. */
export const CONTRAST_DRILL_STAGES = ["see", "hear_a", "hear_b", "compare", "identify", "produce"] as const;
export type ContrastDrillStage = (typeof CONTRAST_DRILL_STAGES)[number];
