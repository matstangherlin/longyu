import type { QuizQuestion } from "./types";

/**
 * Placement option identity (V4.8.1).
 *
 * Scoring, evidence, and the hosted wire format use stable option IDs
 * (or canonical Chinese/pinyin). Visible labels live in the catalogs.
 *
 * Portuguese aliases are the exact option strings from Placement v2 so
 * leftover sessionStorage and the currently deployed Edge still round-trip.
 * English aliases exist so an EN UI answer canonicalizes to the same ID.
 */

const CJK_RE = /[\u3400-\u9fff]/;
const PINYIN_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/;
const PUNCT_RE = /^[？。]$/;

/** Gloss optionId → [pt-BR wire/label, en label, ...extras] */
export const OPTION_ALIASES: Record<string, readonly string[]> = {
  hello: ["Olá", "Hello"],
  thanks: ["Obrigado(a)", "Thanks"],
  no: ["Não", "No"],
  bye: ["Tchau", "Bye"],
  thanksStop: ["Obrigado(a).", "Thank you."],
  youreWelcome: ["De nada.", "You're welcome."],
  seeYouLater: ["Até logo.", "See you later."],
  allGood: ["Tudo bem?", "How are you?"],
  standardSpoken: ["A forma padrão do chinês falado", "The standard form of spoken Chinese"],
  chineseAlphabet: ["Um alfabeto chinês", "A Chinese alphabet"],
  ptTranslation: ["Uma tradução em português", "A Portuguese translation"],
  kindOfHanzi: ["Um tipo de hànzì", "A kind of hànzì"],
  showSoundLatin: ["Mostrar o som com letras latinas", "Show the sound with Latin letters"],
  replaceHanziForever: ["Substituir hànzì para sempre", "Replace hànzì forever"],
  translateToPt: ["Traduzir palavras para português", "Translate words into Portuguese"],
  markPlural: ["Marcar plural", "Mark the plural"],
  changeTheWord: ["mudar a palavra", "change the word"],
  eraseHanzi: ["apagar o hànzì", "erase the hànzì"],
  createPlural: ["criar plural", "make a plural"],
  becomeTranslation: ["virar tradução", "turn into a translation"],
  chineseCharWriting: ["Caractere chinês usado na escrita", "The Chinese character used in writing"],
  pinyinWithAccent: ["Pinyin com acento", "Pinyin with an accent"],
  recordedSound: ["Som gravado", "A recorded sound"],
  literalTranslation: ["Tradução literal", "A literal translation"],
  pinyinGuidesSound: ["Pinyin guia o som; hànzì é o caractere", "Pinyin guides the sound; hànzì is the character"],
  pinyinIsCharacter: ["Pinyin é o caractere; hànzì é áudio", "Pinyin is the character; hànzì is audio"],
  pinyinIsPortuguese: ["Pinyin é português; hànzì é tom", "Pinyin is Portuguese; hànzì is tone"],
  pinyinSameAsHanzi: ["Pinyin e hànzì são a mesma coisa", "Pinyin and hànzì are the same thing"],
  syllableTone: ["O tom da sílaba", "The syllable's tone"],
  thePlural: ["O plural", "The plural"],
  theTranslation: ["A tradução", "The translation"],
  theHanzi: ["O hànzì", "The hànzì"],
  i: ["eu", "I"],
  not: ["não", "no"],
  three: ["três", "three"],
  good: ["bom", "good"],
  goodWell: ["bom; bem", "good; well"],
  mother: ["mãe", "mother"],
  house: ["casa", "house"],
  thankYou: ["obrigado", "thanks"],
  tone1: ["1º tom", "1st tone"],
  tone2: ["2º tom", "2nd tone"],
  tone3: ["3º tom", "3rd tone"],
  tone4: ["4º tom", "4th tone"],
  ten: ["dez", "ten"],
  person: ["pessoa", "person"],
  sun: ["sol", "sun"],
  you: ["você", "you"],
  myNameIs: ["Meu nome é...", "My name is..."],
  imBrazilian: ["Sou brasileiro.", "I'm Brazilian."],
  myNameIsAna: ["Meu nome é Ana.", "My name is Ana."],
  iWantWater: ["Eu quero água.", "I want water."],
  didntGetIt: ["Não entendi.", "I didn't catch that."],
  iSpeakChinese: ["Eu falo chinês.", "I speak Chinese."],
  iDontSpeakChinese: ["Não falo chinês.", "I don't speak Chinese."],
  iStudyChinese: ["Eu estudo chinês.", "I study Chinese."],
  iLikeChinese: ["Gosto de chinês.", "I like Chinese."],
  howMuchThis: ["Quanto custa este?", "How much is this?"],
  whatTime: ["Que horas são?", "What time is it?"],
  whereIs: ["Onde fica?", "Where is it?"],
  repeatedSimilarTone: ["Consegui repetir com tom parecido", "I could repeat it with a similar tone"],
  recognizedNotRepeated: ["Reconheci, mas não consegui repetir", "I recognized it, but I couldn't repeat it"],
  didNotRecognize: ["Não reconheci o som", "I didn't recognize the sound"],
  dark: ["escuro", "dark"],
  bright: ["claro; brilhante", "bright"],
  forest: ["floresta", "forest"],
  rest: ["descanso", "rest"],
  mountain: ["montanha", "mountain"],
  woods: ["bosque; floresta", "woods; forest"],
  river: ["rio", "river"],
  fire: ["fogo", "fire"],
  niceToMeet: ["Prazer em conhecer você.", "Nice to meet you."],
  iWantThis: ["Eu quero este.", "I want this."],
  howMuch: ["Quanto custa?", "How much is it?"],
};

export function isCanonicalOptionId(optionId: string): boolean {
  const value = String(optionId ?? "");
  if (!value) return false;
  if (CJK_RE.test(value)) return true;
  if (PINYIN_MARK_RE.test(value)) return true;
  if (PUNCT_RE.test(value)) return true;
  return false;
}

export function catalogQuestionKey(questionId: string): string {
  return String(questionId).replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

function normalizeAlias(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/[.。\s]+$/, "");
}

export function canonicalizeAnswer(question: QuizQuestion, raw: string): string {
  const given = String(raw ?? "");
  const trimmed = given.trim();
  if (question.options.includes(given)) return given;
  if (question.options.includes(trimmed)) return trimmed;

  for (const optionId of question.options) {
    if (optionId === given || optionId === trimmed) return optionId;
    if (isCanonicalOptionId(optionId)) {
      if (optionId === given || optionId === trimmed) return optionId;
      continue;
    }
    const aliases = OPTION_ALIASES[optionId] ?? [];
    for (const alias of aliases) {
      if (alias === given || alias === trimmed) return optionId;
      if (normalizeAlias(alias) === normalizeAlias(given)) return optionId;
    }
  }
  return trimmed;
}

/** Value the currently deployed Edge still expects (PT gloss or canonical form). */
export function wireAnswer(question: QuizQuestion, raw: string): string {
  const optionId = canonicalizeAnswer(question, raw);
  if (question.options.includes(optionId) && isCanonicalOptionId(optionId)) return optionId;
  const aliases = OPTION_ALIASES[optionId];
  if (aliases?.[0]) return aliases[0];
  return optionId;
}

export function optionLabelForLocale(optionId: string, locale: "pt-BR" | "en"): string {
  if (isCanonicalOptionId(optionId)) return optionId;
  const aliases = OPTION_ALIASES[optionId];
  if (!aliases?.length) return optionId;
  return locale === "en" ? (aliases[1] ?? aliases[0]) : aliases[0];
}

export function canonicalQuestionIdentity(question: QuizQuestion) {
  return {
    id: question.id,
    category: question.category,
    layer: question.layer,
    difficulty: question.difficulty ?? null,
    stimulus: question.stimulus ?? null,
    audioText: question.audioText ?? null,
    essential: Boolean(question.essential),
    essentialItem: question.essentialItem ?? null,
    hasHint: question.hasHint,
    noHint: question.noHint,
    unlockWeight: question.unlockWeight,
    optionIds: [...question.options],
    correctOptionId: question.answer,
  };
}
