import type { EssentialPlacementItem, QuizCategory, QuizDifficulty, QuizLayer, QuizQuestion } from "./types.ts";

export function quizQuestion(
  id: string,
  category: QuizCategory,
  layer: QuizLayer,
  prompt: string,
  answer: string,
  options: string[],
  extra: Partial<Omit<QuizQuestion, "id" | "category" | "layer" | "prompt" | "answer" | "options">> = {}
): QuizQuestion {
  const hasHint = extra.hasHint ?? Boolean(extra.allowHints || extra.withClue || layer === "supported" || layer === "reduced");
  const noHint = extra.noHint ?? !hasHint;
  return {
    id,
    skill: extra.skill ?? category,
    category,
    layer,
    prompt,
    answer,
    options,
    hasHint,
    noHint,
    unlockWeight: extra.unlockWeight ?? defaultUnlockWeight(layer, hasHint, extra.essential, extra.difficulty),
    ...extra,
  };
}

function defaultUnlockWeight(
  layer: QuizLayer,
  hasHint: boolean,
  essential?: boolean,
  difficulty?: QuizDifficulty
): number {
  if (hasHint) return essential ? 0.35 : 0.25;
  const difficultyWeight = difficulty === 4 ? 1.35 : difficulty === 3 ? 1.15 : 1;
  const layerWeight = layer === "production" ? 1.25 : layer === "soundSpeech" ? 1.2 : 1;
  return Number((difficultyWeight * layerWeight * (essential ? 1.1 : 1)).toFixed(2));
}

const SUPPORTED_QUESTIONS: QuizQuestion[] = [
  quizQuestion("warm-nihao-meaning", "meaning", "supported", "O que significa esta saudação?", "Olá", ["Olá", "Obrigado(a)", "Não", "Tchau"], {
    stimulus: "你好",
    detail: "pinyin: nǐ hǎo",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "你好",
    withClue: true,
  }),
  quizQuestion("warm-xiexie-meaning", "meaning", "supported", "O que significa esta frase?", "Obrigado(a).", ["Obrigado(a).", "De nada.", "Até logo.", "Tudo bem?"], {
    stimulus: "谢谢",
    detail: "pinyin: xièxie",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "谢谢",
    withClue: true,
  }),
  quizQuestion("warm-nihao-pinyin", "sound", "supported", "Qual pinyin combina com esta frase?", "nǐ hǎo", ["nǐ hǎo", "xièxie", "bù", "wǒ"], {
    stimulus: "你好",
    detail: "pinyin escreve o som com letras latinas",
    allowHints: true,
    difficulty: 1,
    essential: true,
    essentialItem: "pinyin",
    withClue: true,
  }),
  quizQuestion("warm-thanks-context", "context", "supported", "Alguém te ajuda. O que combina dizer?", "谢谢", ["谢谢", "你好", "再见", "不客气"], {
    allowHints: true,
    difficulty: 1,
    withClue: true,
  }),
];

const FOUNDATION_CHECK_QUESTIONS: QuizQuestion[] = [
  quizQuestion(
    "foundation-what-is-mandarin",
    "context",
    "noHelp",
    "Sem dica: no Longyu, o que chamamos de mandarim?",
    "A forma padrão do chinês falado",
    ["A forma padrão do chinês falado", "Um alfabeto chinês", "Uma tradução em português", "Um tipo de hànzì"],
    { difficulty: 2, essential: true, essentialItem: "mandarim", unlockWeight: 1.05 }
  ),
  quizQuestion(
    "foundation-pinyin-role",
    "sound",
    "noHelp",
    "Sem dica: para que serve o pinyin?",
    "Mostrar o som com letras latinas",
    ["Mostrar o som com letras latinas", "Substituir hànzì para sempre", "Traduzir palavras para português", "Marcar plural"],
    { difficulty: 2, essential: true, essentialItem: "pinyin", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-tone-role",
    "tone",
    "noHelp",
    "Sem dica: em mandarim, mudar o tom pode...",
    "mudar a palavra",
    ["mudar a palavra", "apagar o hànzì", "criar plural", "virar tradução"],
    { difficulty: 2, essential: true, essentialItem: "tom", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-hanzi-role",
    "hanzi",
    "noHelp",
    "Sem dica: o que é hànzì?",
    "Caractere chinês usado na escrita",
    ["Caractere chinês usado na escrita", "Pinyin com acento", "Som gravado", "Tradução literal"],
    { difficulty: 2, essential: true, essentialItem: "hanzi", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-pinyin-vs-hanzi",
    "hanzi",
    "noHelp",
    "Sem dica: qual diferença está correta?",
    "Pinyin guia o som; hànzì é o caractere",
    ["Pinyin guia o som; hànzì é o caractere", "Pinyin é o caractere; hànzì é áudio", "Pinyin é português; hànzì é tom", "Pinyin e hànzì são a mesma coisa"],
    { difficulty: 3, essential: true, essentialItem: "hanzi", unlockWeight: 1.2 }
  ),
  quizQuestion(
    "foundation-tone-marks",
    "tone",
    "noHelp",
    "Sem dica: as marcas em mā má mǎ mà marcam o quê?",
    "O tom da sílaba",
    ["O tom da sílaba", "O plural", "A tradução", "O hànzì"],
    { difficulty: 2, essential: true, essentialItem: "tom", unlockWeight: 1.1 }
  ),
  quizQuestion(
    "foundation-audio-to-pinyin",
    "sound",
    "soundSpeech",
    "Ouça e escolha o pinyin correspondente.",
    "nǐ hǎo",
    ["nǐ hǎo", "xièxie", "zàijiàn", "wǒ"],
    { audioText: "你好", difficulty: 2, essential: true, essentialItem: "pinyin", unlockWeight: 1.15 }
  ),
];

const REDUCED_HELP_QUESTIONS: QuizQuestion[] = [
  quizQuestion("core-bu-meaning", "meaning", "reduced", "O que significa este caractere?", "não", ["eu", "não", "três", "bom"], {
    stimulus: "不",
    allowHints: true,
    difficulty: 2,
    essential: true,
  }),
  quizQuestion("core-hao-meaning", "meaning", "reduced", "O que significa este caractere?", "bom; bem", ["bom; bem", "mãe", "casa", "obrigado"], {
    stimulus: "好",
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "好",
  }),
  quizQuestion("core-xiexie-pinyin", "sound", "reduced", "Qual é o pinyin correto?", "xièxie", ["xièxie", "nǐ hǎo", "zàijiàn", "hǎo"], {
    stimulus: "谢谢",
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "谢谢",
  }),
  quizQuestion("core-third-tone", "tone", "reduced", "Qual sílaba está no 3º tom (a voz desce e depois sobe)?", "mǎ", ["mā", "má", "mǎ", "mà"], {
    difficulty: 2,
    essential: true,
    essentialItem: "tom",
  }),
  quizQuestion("core-wo-hanzi", "hanzi", "reduced", "Qual caractere significa eu?", "我", ["我", "你", "好", "不"], {
    allowHints: true,
    difficulty: 2,
    essential: true,
    essentialItem: "我",
  }),
];

const NO_HELP_QUESTIONS: QuizQuestion[] = [
  quizQuestion("nohelp-nihao-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 你好?", "nǐ hǎo", ["nǐ hǎo", "xièxie", "bú kèqi", "wǒ"], {
    stimulus: "你好",
    difficulty: 3,
    essential: true,
    essentialItem: "你好",
  }),
  quizQuestion("nohelp-xiexie-tone", "tone", "noHelp", "Sem dica: qual é o tom da primeira sílaba de 谢谢?", "4º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    stimulus: "谢谢",
    difficulty: 3,
    essential: true,
    essentialItem: "tom",
  }),
  quizQuestion("nohelp-san-meaning", "meaning", "noHelp", "Sem dica: o que significa 三?", "três", ["três", "dez", "pessoa", "sol"], {
    stimulus: "三",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("nohelp-san-hanzi", "hanzi", "noHelp", "Sem dica: qual hànzì significa três?", "三", ["三", "二", "十", "人"], {
    difficulty: 3,
    essential: true,
    essentialItem: "hanzi",
  }),
  quizQuestion("nohelp-ni-meaning", "meaning", "noHelp", "Sem dica: o que significa 你?", "você", ["você", "eu", "bom; bem", "não"], {
    stimulus: "你",
    difficulty: 3,
    essential: true,
    essentialItem: "你",
  }),
  quizQuestion("nohelp-nihaoma-sentence", "sentence", "noHelp", "Sem dica: escolha o significado da pergunta.", "Tudo bem?", ["Tudo bem?", "Obrigado(a).", "Até logo.", "Meu nome é..."], {
    stimulus: "你好吗？",
    difficulty: 3,
    essential: true,
    essentialItem: "你好",
  }),
  quizQuestion("nohelp-zaijian-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 再见?", "zàijiàn", ["zàijiàn", "xièxie", "nǐ hǎo", "bú kèqi"], {
    stimulus: "再见",
    difficulty: 3,
    essential: true,
    essentialItem: "再见",
  }),
];

const PHRASE_REASONING_QUESTIONS: QuizQuestion[] = [
  quizQuestion("phrase-brazilian", "sentence", "sentenceReasoning", "Entenda pelo contexto: 我是巴西人", "Sou brasileiro.", ["Meu nome é Ana.", "Sou brasileiro.", "Eu quero água.", "Não entendi."], {
    stimulus: "我是巴西人",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("phrase-dont-understand", "context", "sentenceReasoning", "Você não entendeu o que ouviu. O que combina dizer?", "我听不懂", ["我听不懂", "谢谢", "我很好", "再见"], {
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("phrase-cannot-speak", "sentence", "sentenceReasoning", "Sem dica: escolha o significado da frase.", "Não falo chinês.", ["Eu falo chinês.", "Não falo chinês.", "Eu estudo chinês.", "Gosto de chinês."], {
    stimulus: "我不会说中文",
    difficulty: 4,
  }),
  quizQuestion("phrase-repeat", "context", "sentenceReasoning", "Você quer pedir para a pessoa repetir. O que combina dizer?", "请再说一遍", ["请再说一遍", "谢谢", "我很好", "再见"], {
    difficulty: 4,
  }),
  quizQuestion("phrase-price-clue", "sentence", "sentenceReasoning", "Com pista: escolha o significado da frase.", "Quanto custa este?", ["Quanto custa este?", "Que horas são?", "Onde fica?", "Eu quero água."], {
    stimulus: "这个多少钱？",
    allowHints: true,
    withClue: true,
    difficulty: 4,
  }),
];

const SOUND_SPEECH_QUESTIONS: QuizQuestion[] = [
  quizQuestion("audio-ma1-tone", "tone", "soundSpeech", "Ouça 妈 e escolha o tom que você ouviu.", "1º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    audioText: "妈",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("audio-ma3-tone", "tone", "soundSpeech", "Ouça 马 e escolha o tom que você ouviu.", "3º tom", ["1º tom", "2º tom", "3º tom", "4º tom"], {
    audioText: "马",
    difficulty: 4,
  }),
  quizQuestion("audio-xiexie-phrase", "sound", "soundSpeech", "Ouça e escolha a frase que foi dita.", "谢谢", ["谢谢", "你好", "再见", "不客气"], {
    audioText: "谢谢",
    difficulty: 3,
    essential: true,
  }),
  quizQuestion("speech-nihao-self", "speaking", "soundSpeech", "Repita em voz alta 你好. Como ficou?", "Consegui repetir com tom parecido", ["Consegui repetir com tom parecido", "Reconheci, mas não consegui repetir", "Não reconheci o som"], {
    audioText: "你好",
    difficulty: 3,
    tier: "A",
  }),
];

const PRODUCTION_QUESTIONS: QuizQuestion[] = [
  quizQuestion("prod-nihao-build", "sentence", "production", "Monte a frase para dizer olá.", "你好", ["你好", "好你", "谢谢", "再见"], {
    audioText: "你好",
    difficulty: 3,
    essential: true,
    tier: "E",
  }),
  quizQuestion("prod-thanks-build", "context", "production", "Alguém te ajuda. Monte a resposta adequada.", "谢谢", ["谢谢", "不客气", "你好", "再见"], {
    audioText: "谢谢",
    difficulty: 3,
    essential: true,
    tier: "E",
  }),
  quizQuestion("prod-woshi-gap", "sentence", "production", "Complete a frase: 我__巴西人", "是", ["是", "不", "好", "吗"], {
    difficulty: 4,
    tier: "E",
  }),
  quizQuestion("prod-question-ma", "sentence", "production", "Complete a pergunta: 你好吗__", "？", ["？", "。", "不", "是"], {
    difficulty: 4,
    tier: "E",
  }),
];

const ADVANCED_HANZI_QUESTIONS: QuizQuestion[] = [
  quizQuestion("adv-ming-meaning", "hanzi", "noHelp", "Sem dica: 明 junta sol e lua. O que significa?", "claro; brilhante", ["escuro", "claro; brilhante", "floresta", "descanso"], {
    stimulus: "明",
    difficulty: 4,
  }),
  quizQuestion("adv-ma-phonetic", "hanzi", "noHelp", "Sem dica: em 妈, qual peça dá a pista de som?", "马", ["女", "马", "妈", "口"], {
    stimulus: "妈",
    difficulty: 4,
  }),
  quizQuestion("adv-lin-meaning", "hanzi", "noHelp", "Sem dica: o que significa 林?", "bosque; floresta", ["montanha", "bosque; floresta", "rio", "fogo"], {
    stimulus: "林",
    difficulty: 4,
  }),
  quizQuestion("adv-zhongguo-pinyin", "sound", "noHelp", "Sem dica: qual é o pinyin de 中国?", "Zhōngguó", ["Zhōngguó", "Rìběn", "Běijīng", "Hànyǔ"], {
    stimulus: "中国",
    difficulty: 4,
  }),
  quizQuestion("adv-nice-meet", "sentence", "sentenceReasoning", "Sem dica: o que significa 认识你很高兴?", "Prazer em conhecer você.", ["Prazer em conhecer você.", "Eu quero este.", "Não falo chinês.", "Quanto custa?"], {
    stimulus: "认识你很高兴",
    difficulty: 4,
  }),
];

export const PLACEMENT_QUESTION_BANK: QuizQuestion[] = [
  ...SUPPORTED_QUESTIONS,
  ...FOUNDATION_CHECK_QUESTIONS,
  ...REDUCED_HELP_QUESTIONS,
  ...NO_HELP_QUESTIONS,
  ...PHRASE_REASONING_QUESTIONS,
  ...SOUND_SPEECH_QUESTIONS,
  ...PRODUCTION_QUESTIONS,
  ...ADVANCED_HANZI_QUESTIONS,
];

const byId = new Map<string, QuizQuestion>();
for (const question of PLACEMENT_QUESTION_BANK) {
  if (byId.has(question.id)) {
    throw new Error(`Pergunta de placement duplicada: ${question.id}`);
  }
  byId.set(question.id, question);
}

export function getPlacementQuestion(id: string): QuizQuestion | undefined {
  return byId.get(id);
}

export function requirePlacementQuestion(id: string): QuizQuestion {
  const question = byId.get(id);
  if (!question) throw new Error(`Pergunta de placement desconhecida: ${id}`);
  return question;
}

export function normalizeQuizOption(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/[.。\s]+$/, "");
}

export function isValidQuizQuestion(question: QuizQuestion): boolean {
  if (!question.answer?.trim()) return false;
  if (!question.skill || !question.category || !question.difficulty) return false;
  if (question.unlockWeight <= 0) return false;
  if (question.hasHint === question.noHint) return false;
  const options = question.options ?? [];
  if (options.length < 2) return false;
  if (options.some((option) => !option?.trim())) return false;
  const normalized = options.map(normalizeQuizOption);
  if (new Set(normalized).size !== normalized.length) return false;
  return normalized.includes(normalizeQuizOption(question.answer));
}

export const VALID_PLACEMENT_QUESTIONS = PLACEMENT_QUESTION_BANK.filter(isValidQuizQuestion);

export type { EssentialPlacementItem };
