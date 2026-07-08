import type { ToneSyllable } from "./types";

// Pares mínimos de tom — o clássico "ma" + um par real para subir o nível.
export const TONE_SYLLABLES: ToneSyllable[] = [
  {
    base: "ma",
    forms: [
      { tone: 1, hanzi: "妈", pinyin: "mā", meaningPt: "mãe" },
      { tone: 2, hanzi: "麻", pinyin: "má", meaningPt: "cânhamo; dormente" },
      { tone: 3, hanzi: "马", pinyin: "mǎ", meaningPt: "cavalo" },
      { tone: 4, hanzi: "骂", pinyin: "mà", meaningPt: "xingar" },
    ],
  },
  {
    base: "yao",
    forms: [
      { tone: 1, hanzi: "腰", pinyin: "yāo", meaningPt: "cintura" },
      { tone: 2, hanzi: "摇", pinyin: "yáo", meaningPt: "balançar" },
      { tone: 3, hanzi: "咬", pinyin: "yǎo", meaningPt: "morder" },
      { tone: 4, hanzi: "要", pinyin: "yào", meaningPt: "querer" },
    ],
  },
  {
    base: "shi",
    forms: [
      { tone: 1, hanzi: "湿", pinyin: "shī", meaningPt: "molhado" },
      { tone: 2, hanzi: "十", pinyin: "shí", meaningPt: "dez" },
      { tone: 3, hanzi: "使", pinyin: "shǐ", meaningPt: "usar; fazer" },
      { tone: 4, hanzi: "是", pinyin: "shì", meaningPt: "ser" },
    ],
  },
];

export const TONE_NAMES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "1º — alto e constante",
  2: "2º — subindo",
  3: "3º — desce e sobe",
  4: "4º — caindo firme",
  5: "neutro — leve e curto",
};

export const TONE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "alto e constante",
  2: "subindo",
  3: "desce e sobe",
  4: "caindo firme",
};

export const TONE_LISTENING_TIPS: Record<1 | 2 | 3 | 4, string> = {
  1: "soa plano, sem subir nem cair",
  2: "parece uma pergunta curta",
  3: "faz um vale antes de levantar",
  4: "cai rápido, como uma ordem",
};

// Cor por tom (acento visual consistente; usado nos chips de pinyin).
export const TONE_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#2F6FB0", // azul — constante
  2: "#2F855A", // verde — sobe
  3: "#B7791F", // âmbar — vale
  4: "#B42318", // vermelho — cai
  5: "#8C9196", // cinza — neutro
};
