export interface ReviewExample {
  hanzi: string;
  pinyin: string;
  pt: string;
  note?: string;
}

export const REVIEW_EXAMPLES: Record<string, ReviewExample> = {
  "你好": {
    hanzi: "你好！",
    pinyin: "Nǐ hǎo!",
    pt: "Olá!",
    note: "chunk curto de saudação",
  },
  "不": {
    hanzi: "我听不懂。",
    pinyin: "Wǒ tīng bù dǒng.",
    pt: "Não entendi.",
    note: "不 nega o verbo depois dele",
  },
  "明": {
    hanzi: "日 + 月 = 明",
    pinyin: "rì + yuè = míng",
    pt: "sol + lua = claro, brilhante",
    note: "forma lógica: duas fontes de luz",
  },
  "我叫马修": {
    hanzi: "我叫马修。",
    pinyin: "Wǒ jiào Mǎxiū.",
    pt: "Meu nome é Matheus.",
    note: "frase de apresentação",
  },
  "我是巴西人": {
    hanzi: "我是巴西人。",
    pinyin: "Wǒ shì Bāxī rén.",
    pt: "Eu sou brasileiro.",
    note: "identidade e origem",
  },
};

export function reviewExampleFor(hanzi: string): ReviewExample {
  const normalized = hanzi.replace(/[，。！？、,.!?？\s]/g, "");
  return REVIEW_EXAMPLES[normalized] ?? {
    hanzi,
    pinyin: "",
    pt: "Reconheça este item no contexto em que apareceu na jornada.",
  };
}
