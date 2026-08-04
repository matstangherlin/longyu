export type MandarinTone = 1 | 2 | 3 | 4 | 5;

export const MANDARIN_TONES: MandarinTone[] = [1, 2, 3, 4, 5];

export type ToneTrainerRoundKind = "isolated" | "minimal_pair" | "word" | "phrase" | "sandhi" | "consonant";

export interface ToneTrainerRound {
  id: string;
  kind: ToneTrainerRoundKind;
  audioText: string;
  displayText: string;
  pinyin: string;
  meaningPt: string;
  answerTone: MandarinTone;
  focusSyllable: string;
  explanation: string;
  /** Rodada de consoante: som inicial correto (ex.: "x", "sh", "ü"). */
  answerInitial?: string;
  itemRef?: `char:${string}` | `chunk:${string}`;
}

export interface ToneTrainerPack {
  id: string;
  order: number;
  title: string;
  shortTitle: string;
  focus: string;
  /** "tone" (padrão) ou "consonant" (resposta por som inicial, ex.: x/sh/ü). */
  kind?: "tone" | "consonant";
  options: MandarinTone[];
  /** Opções de resposta dos packs de consoante (ex.: ["x", "s", "sh", "q", "zh", "r", "ü"]). */
  consonantOptions?: string[];
  rounds: ToneTrainerRound[];
  minimumCorrect: number;
  requiredRounds: number;
  rewardQi: number;
  unlockCopy: string;
}

/** Opções de resposta do pack: tons (padrão) ou consoantes. */
export function packAnswerOptions(pack: ToneTrainerPack): (MandarinTone | string)[] {
  return pack.kind === "consonant" ? (pack.consonantOptions ?? []) : pack.options;
}

export interface ToneTrainerPackStats {
  packId: string;
  attempts: number;
  bestScore: number;
  bestTotal: number;
  completed: boolean;
  lastAttemptAt: number;
  totalRounds: number;
  totalCorrect: number;
  errorsByTone: Record<MandarinTone, number>;
}

export type ToneTrainerProgress = Record<string, ToneTrainerPackStats>;

export interface ToneTrainerAttemptInput {
  packId: string;
  totalRounds: number;
  correct: number;
  passed: boolean;
  errorsByTone: Record<MandarinTone, number>;
}

export const TONE_MARK: Record<MandarinTone, string> = {
  1: "ˉ",
  2: "ˊ",
  3: "ˇ",
  4: "ˋ",
  5: "",
};

export const TONE_SHORT_LABEL: Record<MandarinTone, string> = {
  1: "1º tom",
  2: "2º tom",
  3: "3º tom",
  4: "4º tom",
  5: "tom neutro",
};

export const TONE_EXPLANATION: Record<MandarinTone, string> = {
  1: "Esse foi o 1º tom: alto, plano e sem queda.",
  2: "Esse foi o 2º tom: ele sobe, como uma pergunta curta.",
  3: "Esse foi o 3º tom: ele desce e depois sobe.",
  4: "Esse foi o 4º tom: ele cai rápido e firme.",
  5: "Esse foi o tom neutro: curto, leve e sem acento no pinyin.",
};

const ma14: ToneTrainerRound[] = [
  {
    id: "ma-1",
    kind: "isolated",
    audioText: "妈",
    displayText: "ma",
    pinyin: "mā",
    meaningPt: "mãe",
    answerTone: 1,
    focusSyllable: "ma",
    explanation: "mā fica alto e reto, sem cair no final.",
    itemRef: "char:ma2",
  },
  {
    id: "ma-4",
    kind: "isolated",
    audioText: "骂",
    displayText: "ma",
    pinyin: "mà",
    meaningPt: "xingar",
    answerTone: 4,
    focusSyllable: "ma",
    explanation: "mà cai de uma vez, como uma ordem curta.",
    itemRef: "char:ma_scold",
  },
  {
    id: "shi-1",
    kind: "isolated",
    audioText: "湿",
    displayText: "shi",
    pinyin: "shī",
    meaningPt: "molhado",
    answerTone: 1,
    focusSyllable: "shi",
    explanation: "shī mantém a altura estável.",
  },
  {
    id: "shi-4",
    kind: "isolated",
    audioText: "是",
    displayText: "shi",
    pinyin: "shì",
    meaningPt: "ser",
    answerTone: 4,
    focusSyllable: "shi",
    explanation: "shì começa alto e cai com força.",
    itemRef: "char:shi",
  },
  {
    id: "yao-1",
    kind: "isolated",
    audioText: "腰",
    displayText: "yao",
    pinyin: "yāo",
    meaningPt: "cintura",
    answerTone: 1,
    focusSyllable: "yao",
    explanation: "yāo soa como uma linha reta no alto.",
  },
  {
    id: "yao-4",
    kind: "isolated",
    audioText: "要",
    displayText: "yao",
    pinyin: "yào",
    meaningPt: "querer",
    answerTone: 4,
    focusSyllable: "yao",
    explanation: "yào desce rápido no final.",
    itemRef: "char:yao",
  },
];

const ma23: ToneTrainerRound[] = [
  {
    id: "ma-2",
    kind: "isolated",
    audioText: "麻",
    displayText: "ma",
    pinyin: "má",
    meaningPt: "cânhamo; dormente",
    answerTone: 2,
    focusSyllable: "ma",
    explanation: "má sobe direto, sem fazer vale.",
    itemRef: "char:ma_hemp",
  },
  {
    id: "ma-3",
    kind: "isolated",
    audioText: "马",
    displayText: "ma",
    pinyin: "mǎ",
    meaningPt: "cavalo",
    answerTone: 3,
    focusSyllable: "ma",
    explanation: "mǎ faz um vale: desce e sobe.",
    itemRef: "char:ma_horse",
  },
  {
    id: "yao-2",
    kind: "minimal_pair",
    audioText: "摇",
    displayText: "yao",
    pinyin: "yáo",
    meaningPt: "balançar",
    answerTone: 2,
    focusSyllable: "yao",
    explanation: "yáo sobe em uma curva contínua.",
    itemRef: "char:yao_shake",
  },
  {
    id: "yao-3",
    kind: "minimal_pair",
    audioText: "咬",
    displayText: "yao",
    pinyin: "yǎo",
    meaningPt: "morder",
    answerTone: 3,
    focusSyllable: "yao",
    explanation: "yǎo cai primeiro, depois levanta.",
    itemRef: "char:yao_bite",
  },
  {
    id: "shi-2",
    kind: "isolated",
    audioText: "十",
    displayText: "shi",
    pinyin: "shí",
    meaningPt: "dez",
    answerTone: 2,
    focusSyllable: "shi",
    explanation: "shí sobe, como se pedisse confirmação.",
    itemRef: "char:shi10",
  },
  {
    id: "shi-3",
    kind: "isolated",
    audioText: "使",
    displayText: "shi",
    pinyin: "shǐ",
    meaningPt: "usar; fazer",
    answerTone: 3,
    focusSyllable: "shi",
    explanation: "shǐ entra no vale do 3º tom.",
  },
];

const allIsolated: ToneTrainerRound[] = [...ma14, ...ma23];

const realWords: ToneTrainerRound[] = [
  {
    id: "nihao-hao",
    kind: "word",
    audioText: "你好",
    displayText: "你好",
    pinyin: "nǐ hǎo",
    meaningPt: "olá",
    answerTone: 3,
    focusSyllable: "hǎo",
    explanation: "hǎo tem 3º tom. Em fala natural, o primeiro 3º tom pode soar como 2º.",
    itemRef: "chunk:nihao",
  },
  {
    id: "xiexie-xie",
    kind: "word",
    audioText: "谢谢",
    displayText: "谢谢",
    pinyin: "xièxie",
    meaningPt: "obrigado(a)",
    answerTone: 4,
    focusSyllable: "xiè",
    explanation: "xiè começa com uma queda firme de 4º tom.",
    itemRef: "chunk:xiexie",
  },
  {
    id: "zaijian-zai",
    kind: "word",
    audioText: "再见",
    displayText: "再见",
    pinyin: "zàijiàn",
    meaningPt: "até logo",
    answerTone: 4,
    focusSyllable: "zài",
    explanation: "zài cai rápido: 4º tom.",
    itemRef: "chunk:zaijian",
  },
  {
    id: "keyi-ke",
    kind: "word",
    audioText: "可以",
    displayText: "可以",
    pinyin: "kěyǐ",
    meaningPt: "poder; pode",
    answerTone: 3,
    focusSyllable: "kě",
    explanation: "kě é 3º tom; ouça o vale antes de subir.",
  },
  {
    id: "zhongwen-zhong",
    kind: "word",
    audioText: "中文",
    displayText: "中文",
    pinyin: "Zhōngwén",
    meaningPt: "chinês",
    answerTone: 1,
    focusSyllable: "zhōng",
    explanation: "zhōng é alto e estável: 1º tom.",
  },
  {
    id: "shenme-shen",
    kind: "word",
    audioText: "什么",
    displayText: "什么",
    pinyin: "shénme",
    meaningPt: "o quê",
    answerTone: 2,
    focusSyllable: "shén",
    explanation: "shén sobe: 2º tom.",
  },
];

const neutralRounds: ToneTrainerRound[] = [
  {
    id: "neutral-ma-question",
    kind: "word",
    audioText: "吗",
    displayText: "吗",
    pinyin: "ma",
    meaningPt: "partícula de pergunta",
    answerTone: 5,
    focusSyllable: "ma",
    explanation: "ma é tom neutro: curto, leve e sem acento.",
    itemRef: "char:ma_question",
  },
  {
    id: "neutral-de",
    kind: "word",
    audioText: "的",
    displayText: "的",
    pinyin: "de",
    meaningPt: "partícula possessiva",
    answerTone: 5,
    focusSyllable: "de",
    explanation: "de fica leve e não recebe marca de tom.",
    itemRef: "char:de",
  },
  {
    id: "neutral-le",
    kind: "word",
    audioText: "了",
    displayText: "了",
    pinyin: "le",
    meaningPt: "partícula de ação completa",
    answerTone: 5,
    focusSyllable: "le",
    explanation: "le é curto e acompanha a palavra anterior.",
    itemRef: "char:le",
  },
  {
    id: "neutral-men",
    kind: "word",
    audioText: "们",
    displayText: "们",
    pinyin: "men",
    meaningPt: "sufixo de plural",
    answerTone: 5,
    focusSyllable: "men",
    explanation: "men fica leve em palavras como wǒmen e nǐmen.",
    itemRef: "char:men",
  },
  {
    id: "neutral-xiexie-second",
    kind: "word",
    audioText: "谢谢",
    displayText: "谢谢",
    pinyin: "xièxie",
    meaningPt: "obrigado(a)",
    answerTone: 5,
    focusSyllable: "sílaba final leve",
    explanation: "A segunda sílaba em xièxie soa leve e sem marca.",
    itemRef: "chunk:xiexie",
  },
];

const sandhiRounds: ToneTrainerRound[] = [
  {
    id: "sandhi-nihao-ni",
    kind: "sandhi",
    audioText: "你好",
    displayText: "你好",
    pinyin: "ní hǎo",
    meaningPt: "olá",
    answerTone: 2,
    focusSyllable: "ní",
    explanation: "Regra de fala real: 3º + 3º vira 2º + 3º. nǐ hǎo soa ní hǎo.",
    itemRef: "chunk:nihao",
  },
  {
    id: "sandhi-henhao-hen",
    kind: "sandhi",
    audioText: "很好",
    displayText: "很好",
    pinyin: "hén hǎo",
    meaningPt: "muito bom",
    answerTone: 2,
    focusSyllable: "hén",
    explanation: "Antes de outro 3º tom, 很 sobe na fala: hén hǎo.",
  },
  {
    id: "sandhi-bushi-bu",
    kind: "sandhi",
    audioText: "不是",
    displayText: "不是",
    pinyin: "bú shì",
    meaningPt: "não é",
    answerTone: 2,
    focusSyllable: "bú",
    explanation: "不 vira 2º tom antes de 4º tom: bú shì.",
  },
  {
    id: "sandhi-buhao-bu",
    kind: "sandhi",
    audioText: "不好",
    displayText: "不好",
    pinyin: "bù hǎo",
    meaningPt: "não é bom",
    answerTone: 4,
    focusSyllable: "bù",
    explanation: "Antes de 3º tom, 不 continua bù: 4º tom.",
  },
  {
    id: "sandhi-yibian-yi",
    kind: "sandhi",
    audioText: "一遍",
    displayText: "一遍",
    pinyin: "yí biàn",
    meaningPt: "uma vez",
    answerTone: 2,
    focusSyllable: "yí",
    explanation: "一 vira 2º tom antes de 4º tom: yí biàn.",
  },
  {
    id: "sandhi-yidian-yi",
    kind: "sandhi",
    audioText: "一点",
    displayText: "一点",
    pinyin: "yìdiǎn",
    meaningPt: "um pouco",
    answerTone: 4,
    focusSyllable: "yì",
    explanation: "一 vira 4º tom antes de 1º, 2º ou 3º tom: yìdiǎn.",
  },
];

const consonantRounds: ToneTrainerRound[] = [
  {
    id: "consonant-xie-x",
    kind: "consonant",
    audioText: "谢",
    displayText: "谢",
    pinyin: "xiè",
    meaningPt: "agradecer",
    answerTone: 4,
    answerInitial: "x",
    focusSyllable: "x",
    explanation: "x: língua alta e bem à frente (perto do céu da boca), fricativa suave — o primeiro som de 谢谢. Não é o “chi” do português.",
    itemRef: "char:xie",
  },
  {
    id: "consonant-si-s",
    kind: "consonant",
    audioText: "四",
    displayText: "四",
    pinyin: "sì",
    meaningPt: "quatro",
    answerTone: 4,
    answerInitial: "s",
    focusSyllable: "s",
    explanation: "s com a língua baixa, perto do s de “sapo”.",
    itemRef: "char:si",
  },
  {
    id: "consonant-shi-sh",
    kind: "consonant",
    audioText: "是",
    displayText: "是",
    pinyin: "shì",
    meaningPt: "ser; sim",
    answerTone: 4,
    answerInitial: "sh",
    focusSyllable: "sh",
    explanation: "sh retroflexo: a língua se enrola, como um “x” de xícara dobrado.",
    itemRef: "char:shi",
  },
  {
    id: "consonant-shi10-sh",
    kind: "consonant",
    audioText: "十",
    displayText: "十",
    pinyin: "shí",
    meaningPt: "dez",
    answerTone: 2,
    answerInitial: "sh",
    focusSyllable: "sh",
    explanation: "Mais um sh: 十 também começa com a língua enrolada.",
    itemRef: "char:shi10",
  },
  {
    id: "consonant-zhong-zh",
    kind: "consonant",
    audioText: "中",
    displayText: "中",
    pinyin: "zhōng",
    meaningPt: "meio; China",
    answerTone: 1,
    answerInitial: "zh",
    focusSyllable: "zh",
    explanation: "zh retroflexo, como um “dj/tch” sem sopro — o início de 中文.",
    itemRef: "char:zhong",
  },
  {
    id: "consonant-qing-q",
    kind: "consonant",
    audioText: "请",
    displayText: "请",
    pinyin: "qǐng",
    meaningPt: "por favor",
    answerTone: 3,
    answerInitial: "q",
    focusSyllable: "q",
    explanation: "q: língua alta e bem à frente, africada com sopro — o início de 请问. Parece um “tch”, mas a língua fica mais alta e anterior.",
    itemRef: "char:qing_pls",
  },
  {
    id: "consonant-ren-r",
    kind: "consonant",
    audioText: "人",
    displayText: "人",
    pinyin: "rén",
    meaningPt: "pessoa",
    answerTone: 2,
    answerInitial: "r",
    focusSyllable: "r",
    explanation: "r retroflexo suave, entre um r e um “j” — diferente do rr brasileiro.",
    itemRef: "char:ren",
  },
  {
    id: "consonant-nv-u",
    kind: "consonant",
    audioText: "女",
    displayText: "女",
    pinyin: "nǚ",
    meaningPt: "mulher",
    answerTone: 3,
    answerInitial: "ü",
    focusSyllable: "ü",
    explanation: "ü: produza o som de “i” (língua na mesma posição) e arredonde os lábios — como em 女 nǚ. Não é o “u” de lua.",
    itemRef: "char:nv",
  },
  {
    id: "consonant-jia-j",
    kind: "consonant",
    audioText: "家",
    displayText: "家",
    pinyin: "jiā",
    meaningPt: "casa",
    answerTone: 1,
    answerInitial: "j",
    focusSyllable: "j",
    explanation: "j: língua alta e bem à frente, africada sem sopro — o início de 家. Parece um “dj”, mas a língua fica mais alta e anterior.",
    itemRef: "char:jia",
  },
  {
    id: "consonant-chi-ch",
    kind: "consonant",
    audioText: "吃",
    displayText: "吃",
    pinyin: "chī",
    meaningPt: "comer",
    answerTone: 1,
    answerInitial: "ch",
    focusSyllable: "ch",
    explanation: "ch retroflexo com sopro forte — o início de 吃饭.",
    itemRef: "char:chi_eat",
  },
  {
    id: "consonant-zai-z",
    kind: "consonant",
    audioText: "在",
    displayText: "在",
    pinyin: "zài",
    meaningPt: "estar em; em",
    answerTone: 4,
    answerInitial: "z",
    focusSyllable: "z",
    explanation: "z: africada alveolar sem sopro (como “ts” sem sopro) — o início de 再见. Não é o z de “zebra” do português.",
    itemRef: "char:zai",
  },
  {
    id: "consonant-cai-c",
    kind: "consonant",
    audioText: "菜",
    displayText: "菜",
    pinyin: "cài",
    meaningPt: "prato; verdura",
    answerTone: 4,
    answerInitial: "c",
    focusSyllable: "c",
    explanation: "c é um “ts” soprado — o início de 中国菜.",
    itemRef: "char:cai_dish",
  },
];

function cycleRounds(rounds: ToneTrainerRound[], target: number): ToneTrainerRound[] {
  return Array.from({ length: target }, (_, index) => rounds[index % rounds.length]);
}

const TONE_TRAINER_ROUNDS = 12;
const TONE_TRAINER_MINIMUM = 10;

export const TONE_TRAINER_PACKS: ToneTrainerPack[] = [
  {
    id: "tone-1-vs-4",
    order: 1,
    title: "Pack 1 — Tom 1 vs Tom 4",
    shortTitle: "1 vs 4",
    focus: "Diferença entre tom alto e tom descendente.",
    options: [1, 4],
    rounds: cycleRounds(ma14, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 4,
    unlockCopy: "Base para comparar 1º e 4º tom na jornada.",
  },
  {
    id: "tone-2-vs-3",
    order: 2,
    title: "Pack 2 — Tom 2 vs Tom 3",
    shortTitle: "2 vs 3",
    focus: "Subida direta contra queda-subida.",
    options: [2, 3],
    rounds: cycleRounds(ma23, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 4,
    unlockCopy: "Base para comparar 2º e 3º tom na jornada.",
  },
  {
    id: "tone-2-vs-3-minimal",
    order: 3,
    title: "Pack 3 — Tom 2 vs Tom 3 em pares mínimos",
    shortTitle: "2 vs 3 parecido",
    focus: "má/mǎ, yáo/yǎo e sílabas parecidas.",
    options: [2, 3],
    rounds: cycleRounds(ma23.filter((round) => round.kind === "minimal_pair" || round.focusSyllable === "ma"), TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 5,
    unlockCopy: "Afina os pares mínimos mais traiçoeiros.",
  },
  {
    id: "tone-all-isolated",
    order: 4,
    title: "Pack 4 — Todos os tons isolados",
    shortTitle: "4 tons",
    focus: "Escolher entre 1º, 2º, 3º e 4º tom.",
    options: [1, 2, 3, 4],
    rounds: cycleRounds(allIsolated, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 5,
    unlockCopy: "Prepara o mix geral de tons.",
  },
  {
    id: "tone-general-mix",
    order: 5,
    title: "Pack 5 — Mix geral",
    shortTitle: "Mix geral",
    focus: "12 rodadas com os quatro tons principais.",
    options: [1, 2, 3, 4],
    rounds: cycleRounds(allIsolated, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 6,
    unlockCopy: "Comprova ouvido tonal estável.",
  },
  {
    id: "tone-neutral",
    order: 6,
    title: "Pack 6 — Tom neutro",
    shortTitle: "Neutro",
    focus: "Distinguir sílabas marcadas de sílabas curtas e sem acento.",
    options: [1, 2, 3, 4, 5],
    rounds: cycleRounds([...neutralRounds, ...realWords.slice(0, 5)], TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 7,
    unlockCopy: "Inclui o quinto padrão: sem marca, curto e leve.",
  },
  {
    id: "tone-real-words",
    order: 7,
    title: "Pack 7 — Palavras reais",
    shortTitle: "Palavras",
    focus: "你好, 谢谢, 再见, 可以, 中文, 什么.",
    options: [1, 2, 3, 4, 5],
    rounds: cycleRounds([...realWords, neutralRounds[4]], TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 7,
    unlockCopy: "Leva tons para palavras e frases curtas.",
  },
  {
    id: "tone-sandhi-intro",
    order: 8,
    title: "Pack 8 — Introdução ao tone sandhi",
    shortTitle: "Sandhi",
    focus: "3º + 3º, 不 e 一 como regras de fala real.",
    options: [1, 2, 3, 4],
    rounds: cycleRounds(sandhiRounds, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 8,
    unlockCopy: "Mostra por que o pinyin de dicionário nem sempre soa igual.",
  },
  {
    id: "tone-consonants",
    order: 9,
    title: "Pack 9 — Consoantes que brasileiros confundem",
    shortTitle: "Consoantes",
    kind: "consonant",
    focus: "j/q/x, zh/ch/sh, z/c/s, r e ü em palavras que você já conhece.",
    options: [],
    consonantOptions: ["x", "s", "sh", "q", "zh", "j", "ch", "z", "c", "r", "ü"],
    rounds: cycleRounds(consonantRounds, TONE_TRAINER_ROUNDS),
    minimumCorrect: TONE_TRAINER_MINIMUM,
    requiredRounds: TONE_TRAINER_ROUNDS,
    rewardQi: 8,
    unlockCopy: "Discrimina as consoantes mais difíceis para brasileiros.",
  },
];

export const TONE_TRAINER_PACK_BY_ID = Object.fromEntries(
  TONE_TRAINER_PACKS.map((pack) => [pack.id, pack])
) as Record<string, ToneTrainerPack>;

export const TONE_TRAINER_LESSON_REQUIREMENTS: Record<string, string> = {
  "p2-comparar-tom-2-3": "tone-1-vs-4",
  "p2-tons-nihao": "tone-2-vs-3",
  "p2-tons-xiexie": "tone-all-isolated",
};

export function toneTrainerPackCompleted(progress: ToneTrainerProgress, packId: string): boolean {
  return Boolean(progress[packId]?.completed);
}

export function requiredToneTrainerPackForLesson(lessonId: string): ToneTrainerPack | undefined {
  const packId = TONE_TRAINER_LESSON_REQUIREMENTS[lessonId];
  return packId ? TONE_TRAINER_PACK_BY_ID[packId] : undefined;
}

export function weakestToneFromProgress(progress: ToneTrainerProgress): MandarinTone | null {
  const totals: Record<MandarinTone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const stats of Object.values(progress)) {
    for (const tone of MANDARIN_TONES) {
      totals[tone] += stats.errorsByTone[tone] ?? 0;
    }
  }
  const entries = Object.entries(totals) as Array<[`${MandarinTone}`, number]>;
  const [tone, count] = entries.sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? Number(tone) as MandarinTone : null;
}
