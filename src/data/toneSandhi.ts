// Tone sandhi — mudanças de tom em contexto. Conteúdo pedagógico inicial:
// o suficiente para o aluno não estranhar o que ouve, sem virar aula de
// fonologia. Cada regra vira uma nota curta exibida na referência de som.

export interface ToneSandhiExample {
  hanzi: string;
  /** Pinyin como se pronuncia de fato (com o sandhi aplicado). */
  pinyin: string;
  /** Pinyin "de dicionário", antes da regra. */
  citation: string;
  pt: string;
}

export interface ToneSandhiRule {
  id: string;
  title: string;
  /** Regra explicada em uma frase, para brasileiros. */
  rulePt: string;
  /** Dica prática de ouvido/boca. */
  tipPt: string;
  examples: ToneSandhiExample[];
  /** Lição da jornada a partir da qual a nota faz sentido aparecer. */
  relevantFromLesson: string;
}

export const TONE_SANDHI_RULES: ToneSandhiRule[] = [
  {
    id: "third-third",
    title: "3º tom + 3º tom → 2º + 3º",
    rulePt:
      "Quando duas sílabas de 3º tom vêm juntas, a primeira vira 2º tom. É por isso que 你好 soa \"ní hǎo\", mesmo que se escreva nǐ hǎo.",
    tipPt:
      "Não tente fazer dois vales seguidos — a boca não gosta. Deixe a primeira sílaba subir e faça o vale só na segunda.",
    examples: [
      { hanzi: "你好", pinyin: "ní hǎo", citation: "nǐ hǎo", pt: "olá" },
      { hanzi: "很好", pinyin: "hén hǎo", citation: "hěn hǎo", pt: "muito bom" },
      { hanzi: "我很好", pinyin: "wǒ hén hǎo", citation: "wǒ hěn hǎo", pt: "eu estou bem" },
    ],
    relevantFromLesson: "l3",
  },
  {
    id: "bu-sandhi",
    title: "不 muda para 2º tom antes de 4º tom",
    rulePt:
      "不 é bù (4º tom), mas antes de outra sílaba de 4º tom ele vira bú. Por isso 不客气 soa \"bú kèqi\" e 不是 soa \"bú shì\".",
    tipPt:
      "Antes de 1º, 2º e 3º tons, 不 continua bù: bù hǎo, bù máng. A mudança só acontece antes de um 4º tom.",
    examples: [
      { hanzi: "不是", pinyin: "bú shì", citation: "bù shì", pt: "não é" },
      { hanzi: "不客气", pinyin: "bú kèqi", citation: "bù kèqi", pt: "de nada" },
      { hanzi: "不好", pinyin: "bù hǎo", citation: "bù hǎo", pt: "não é bom (sem mudança)" },
    ],
    relevantFromLesson: "l8",
  },
  {
    id: "yi-sandhi",
    title: "一 muda de tom conforme a sílaba seguinte",
    rulePt:
      "一 sozinho ou em número é yī (1º tom). Antes de 4º tom vira yí (一遍 → yí biàn); antes de 1º, 2º ou 3º tom vira yì (一点 → yìdiǎn).",
    tipPt:
      "Contando (一、二、三) e em datas, 一 fica no 1º tom. A mudança acontece quando 一 vem grudado na palavra seguinte.",
    examples: [
      { hanzi: "一遍", pinyin: "yí biàn", citation: "yī biàn", pt: "uma vez" },
      { hanzi: "一点", pinyin: "yìdiǎn", citation: "yī diǎn", pt: "um pouco" },
      { hanzi: "一、二、三", pinyin: "yī, èr, sān", citation: "yī, èr, sān", pt: "um, dois, três (sem mudança)" },
    ],
    relevantFromLesson: "l11",
  },
];

export const toneSandhiById = Object.fromEntries(TONE_SANDHI_RULES.map((rule) => [rule.id, rule]));
