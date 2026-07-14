import { charById } from "../../data/characters";
import { chunkById } from "../../data/chunks";
import { radicalById } from "../../data/radicals";
import { selectHanziBuilderForStudent, type HanziBuilderProgressMap } from "../../data/hanziBuilder";
import {
  defaultVisualDistractors,
  imageChoiceUsesImageOptions,
  normalizeImageChoiceMode,
  resolveVisualConcept,
  visualByCharId,
  type ImageChoiceMode,
  type VisualConceptId,
} from "../../data/visualVocabulary";
import { expandPairsWithLearned, type AdaptivePair } from "../../data/adaptivePairs";
import { TONE_LABELS } from "../../data/tones";
import type { ItemType } from "../../data/types";
import { stripPinyinTone } from "../../lib/pinyin";
import { newItem, type ReviewDomain, type SRSItem } from "../../lib/srs";
import type { ActivityErrorRecord, ActivityReviewTarget } from "../../lib/store";

export type ReviewExerciseKind =
  | "flashcard"
  | "fill_blank"
  | "sentence_build"
  | "match_pairs"
  | "listen_select"
  | "pinyin_choice"
  | "pinyin_reverse"
  | "hanzi_reverse"
  | "meaning_to_hanzi"
  | "dialogue_choice"
  | "microread"
  | "tone_choice"
  | "hanzi_build"
  | "speak"
  | "image_choice";

export type ReviewTextType = "pt" | "hanzi" | "pinyin" | "audio";

export interface ReviewOption {
  id: string;
  value: string;
  label: string;
  detail?: string;
  type?: ReviewTextType;
}

export interface ReviewBuildPiece {
  id: string;
  value: string;
}

export interface ReviewMatchPair {
  id: string;
  left: string;
  right: string;
  leftType?: ReviewTextType;
  rightType?: ReviewTextType;
  reinforcement?: boolean;
  reviewType?: ItemType;
  reviewItemId?: string;
}

export interface ReviewExerciseEntity {
  type: ItemType;
  itemId: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  literalPt?: string;
  mnemonicPt?: string;
  /** Sílaba sem diacríticos e tom (1-5), presentes só em caracteres. */
  toneless?: string;
  tone?: 1 | 2 | 3 | 4 | 5;
}

export interface ReviewExercise {
  kind: ReviewExerciseKind;
  domain: ReviewDomain;
  item: SRSItem;
  entity: ReviewExerciseEntity;
  prompt: string;
  question?: string;
  displayText?: string;
  displayType?: ReviewTextType;
  audioText?: string;
  answer: string;
  answerLabel: string;
  options?: ReviewOption[];
  pieces?: ReviewBuildPiece[];
  targetValues?: string[];
  pairs?: ReviewMatchPair[];
  explanation: string;
  canAutoCheck: boolean;
  fallback?: boolean;
  remediation?: boolean;
  sourceErrorId?: string;
  mistakeReason?: string;
  /** hanzi_build: id do exercício em data/hanziBuilder.ts (carta visual). */
  builderId?: string;
  imageChoiceMode?: ImageChoiceMode;
  imageOptionIds?: string[];
  visualConceptId?: string;
}

export interface ReviewExerciseBuildInput {
  item: SRSItem;
  learnedItems: SRSItem[];
  domain: ReviewDomain;
  errorHistory?: SRSItem[];
  activityErrors?: ActivityErrorRecord[];
  /** Domínio do HanziBuilder por caractere: revisão de forma segue o aluno. */
  hanziBuilderProgress?: HanziBuilderProgressMap;
}

export interface MistakeReviewExerciseBuildInput {
  mistake: ActivityErrorRecord;
  learnedItems: SRSItem[];
  remediationStep?: number;
  hanziBuilderProgress?: HanziBuilderProgressMap;
}

type MistakeReviewFocus = "meaning" | "pinyin" | "tone" | "hanzi" | "sentence" | "audio" | "pairs" | "visual";

const CORE_CHUNK_IDS = [
  "nihao",
  "xiexie",
  "zaijian",
  "bukeqi",
  "nihaoma",
  "wohenhao",
  "wojiao",
  "nijiaoshenme",
  "wature",
  "wobuhui",
  "qingzaishuoyibian",
  "woxihuan",
  "woxianghe",
  "duoshaoqian",
  "woyao",
  "womenzouba",
  "woyousangepengyou",
];

const CORE_CHAR_IDS = [
  "ni",
  "hao",
  "xie",
  "zai_again",
  "jian_see",
  "bu",
  "wo",
  "shi",
  "ma_question",
  "yi",
  "er",
  "san",
  "si",
  "wu",
];

const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;

const CHUNK_DIALOGUES: Record<string, { prompt: string; answer: string; explanation: string }> = {
  "你好": {
    prompt: "Você encontra alguém. O que combina dizer?",
    answer: "你好",
    explanation: "你好 é a saudação segura para abrir uma conversa.",
  },
  "谢谢": {
    prompt: "Alguém te ajuda. Qual frase curta você usa?",
    answer: "谢谢",
    explanation: "谢谢 agradece de forma curta e natural.",
  },
  "不客气": {
    prompt: "Alguém diz 谢谢. Qual resposta combina?",
    answer: "不客气",
    explanation: "不客气 é uma resposta comum para de nada.",
  },
  "再见": {
    prompt: "Você vai embora. O que combina dizer?",
    answer: "再见",
    explanation: "再见 fecha a conversa: até logo.",
  },
  "我叫马修": {
    prompt: "Alguém pergunta 你叫什么？ Como você responde?",
    answer: "我叫马修",
    explanation: "我叫 + nome responde como você se chama.",
  },
  "我很好": {
    prompt: "Pessoa pergunta 你好吗？ O que você responde se está bem?",
    answer: "我很好",
    explanation: "我很好 é uma resposta simples para dizer que está bem.",
  },
  "我要这个": {
    prompt: "Você aponta para um produto e quer comprar. O que diz?",
    answer: "我要这个",
    explanation: "我要这个 confirma que você quer aquele item.",
  },
};

const CHAR_FILL_TEMPLATES: Record<
  string,
  { prompt: string; sentenceBefore: string; sentenceAfter: string; options: string[]; explanation: string }
> = {
  "好": {
    prompt: "Complete a pergunta.",
    sentenceBefore: "你",
    sentenceAfter: "吗？",
    options: ["好", "谢", "再", "见"],
    explanation: "你好吗？ pergunta se a pessoa está bem.",
  },
  "谢": {
    prompt: "Complete a palavra de agradecimento.",
    sentenceBefore: "谢",
    sentenceAfter: "",
    options: ["谢", "你", "好", "再"],
    explanation: "谢谢 repete 谢 para agradecer.",
  },
  "不": {
    prompt: "Complete a resposta ao agradecimento.",
    sentenceBefore: "",
    sentenceAfter: "客气",
    options: ["不", "你", "好", "再"],
    explanation: "不客气 responde a 谢谢.",
  },
  "再": {
    prompt: "Complete a despedida.",
    sentenceBefore: "",
    sentenceAfter: "见",
    options: ["再", "谢", "你", "好"],
    explanation: "再见 significa até logo.",
  },
  "见": {
    prompt: "Complete a despedida.",
    sentenceBefore: "再",
    sentenceAfter: "",
    options: ["见", "谢", "你", "好"],
    explanation: "再见 literalmente sugere ver de novo.",
  },
  "你": {
    prompt: "Complete a saudação.",
    sentenceBefore: "",
    sentenceAfter: "好",
    options: ["你", "我", "是", "不"],
    explanation: "你好 junta você + bom/bem.",
  },
  "我": {
    prompt: "Complete a apresentação.",
    sentenceBefore: "",
    sentenceAfter: "叫马修",
    options: ["我", "你", "是", "不"],
    explanation: "我叫马修 significa meu nome é Matheus.",
  },
  "是": {
    prompt: "Complete a frase de identidade.",
    sentenceBefore: "我",
    sentenceAfter: "巴西人",
    options: ["是", "叫", "好", "谢"],
    explanation: "我是巴西人 significa sou brasileiro.",
  },
  "吗": {
    prompt: "Complete a pergunta.",
    sentenceBefore: "你好",
    sentenceAfter: "？",
    options: ["吗", "好", "谢", "再"],
    explanation: "吗 transforma a frase em pergunta.",
  },
};

const MICROREAD_BY_HANZI: Record<string, { text: string; pinyin: string; question: string; answer: string; explanation: string }> = {
  "你好": {
    text: "你好，我叫马修。",
    pinyin: "Nǐ hǎo, wǒ jiào Mǎxiū.",
    question: "Que frase abre a apresentação?",
    answer: "你好",
    explanation: "你好 abre o microtexto como saudação.",
  },
  "我叫马修": {
    text: "你好，我叫马修。",
    pinyin: "Nǐ hǎo, wǒ jiào Mǎxiū.",
    question: "Quem está se apresentando?",
    answer: "马修",
    explanation: "我叫马修 apresenta o nome Matheus.",
  },
  "谢谢": {
    text: "谢谢。不客气。",
    pinyin: "Xièxie. Bú kèqi.",
    question: "Qual frase agradece?",
    answer: "谢谢",
    explanation: "谢谢 é o agradecimento.",
  },
  "不客气": {
    text: "谢谢。不客气。",
    pinyin: "Xièxie. Bú kèqi.",
    question: "Qual resposta vem depois de 谢谢?",
    answer: "不客气",
    explanation: "不客气 responde ao agradecimento.",
  },
  "再见": {
    text: "谢谢，再见。",
    pinyin: "Xièxie, zàijiàn.",
    question: "Como a frase termina?",
    answer: "再见",
    explanation: "再见 fecha a fala.",
  },
  "我有三个朋友": {
    text: "我有三个朋友。",
    pinyin: "Wǒ yǒu sān ge péngyou.",
    question: "Quantos amigos aparecem?",
    answer: "三个",
    explanation: "三个朋友 significa três amigos.",
  },
  "我喜欢中文": {
    text: "我喜欢中文。",
    pinyin: "Wǒ xǐhuan Zhōngwén.",
    question: "Do que a pessoa gosta?",
    answer: "中文",
    explanation: "我喜欢中文 significa eu gosto de chinês.",
  },
  "我想喝茶": {
    text: "我想喝茶。",
    pinyin: "Wǒ xiǎng hē chá.",
    question: "O que a pessoa quer beber?",
    answer: "茶",
    explanation: "喝茶 significa beber chá.",
  },
  "我们走吧": {
    text: "我们走吧。",
    pinyin: "Wǒmen zǒu ba.",
    question: "Qual é a ideia da frase?",
    answer: "Vamos embora.",
    explanation: "我们走吧 sugere sair juntos.",
  },
};

export function buildReviewExercise(input: ReviewExerciseBuildInput): ReviewExercise | null {
  const entity = resolveReviewEntity(input.item);
  if (!entity) return null;

  const fallback = buildFlashcard(input, entity);
  for (const candidate of candidatesForDomain(input, entity, fallback)) {
    const valid = validateReviewExercise(candidate);
    if (valid) return valid;
  }
  return null;
}

export function buildReviewExerciseFromMistake(input: MistakeReviewExerciseBuildInput): ReviewExercise | null {
  const target = primaryMistakeTarget(input.mistake);
  if (!target) return null;
  const item = newItem(target.type, target.itemId, {
    track: target.track,
    reviewDomain: target.domain,
    now: input.mistake.timestamp,
  });
  const entity = resolveReviewEntity(item) ?? entityFromMistake(input.mistake, item);
  if (!entity) return null;

  const buildInput: ReviewExerciseBuildInput = {
    item: {
      ...item,
      reps: input.mistake.correctionAttempts ?? 0,
      lapses: Math.max(1, input.mistake.wrongCount ?? 1),
      due: Date.now(),
    },
    learnedItems: input.learnedItems,
    domain: target.domain,
    errorHistory: [],
    activityErrors: [input.mistake],
    hanziBuilderProgress: input.hanziBuilderProgress,
  };
  const step = input.remediationStep ?? ((input.mistake.correctionAttempts ?? 0) + (input.mistake.wrongCount ?? 1) - 1);
  const candidates = remediationCandidates(input.mistake, buildInput, entity);
  if (candidates.length === 0) return null;

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(step + offset) % candidates.length];
    const valid = validateReviewExercise(candidate ? markRemedial(candidate, input.mistake) : null);
    if (valid) return valid;
  }
  return validateReviewExercise(markRemedial(buildFlashcard(buildInput, entity), input.mistake));
}

function primaryMistakeTarget(mistake: ActivityErrorRecord): ActivityReviewTarget | null {
  return mistake.targets[0] ?? null;
}

function entityFromMistake(mistake: ActivityErrorRecord, item: SRSItem): ReviewExerciseEntity | null {
  const hanzi = cleanHanzi(mistake.hanzi ?? mistake.correctAnswer);
  if (!hanzi && !mistake.pinyin && !mistake.meaningPt) return null;
  return {
    type: item.type,
    itemId: item.itemId,
    hanzi: hanzi || mistake.correctAnswer,
    pinyin: mistake.pinyin ?? "",
    meaningPt: mistake.meaningPt ?? mistake.correctAnswer,
  };
}

function markRemedial(exercise: ReviewExercise, mistake: ActivityErrorRecord): ReviewExercise {
  return {
    ...exercise,
    remediation: true,
    sourceErrorId: mistake.id,
    mistakeReason: mistake.mistakeReason,
    prompt: remedialPromptPrefix(mistake, exercise.prompt),
  };
}

function remedialPromptPrefix(mistake: ActivityErrorRecord, prompt: string): string {
  const count = Math.max(1, mistake.wrongCount ?? 1);
  return count > 1 ? `${prompt} · erro recorrente x${count}` : prompt;
}

function remediationCandidates(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): (ReviewExercise | null)[] {
  if (isConceptualMistake(mistake)) {
    return [buildConceptualRemedy(mistake, input, entity), buildMeaningExercise(input, entity), buildPinyinExercise(input, entity)];
  }

  switch (mistakeReviewFocus(mistake)) {
    case "visual":
      return [
        buildImageChoiceReview(input, entity),
        buildHanziFromMeaning(input, entity),
        buildMeaningExercise(input, entity),
        buildListenSelect(input, entity),
      ];
    case "pairs":
      return [
        buildPairMeaningChoice(mistake, input, entity),
        buildMistakePairs(mistake, input, entity),
        buildSentenceUsingMistakePair(mistake, input, entity),
      ];
    case "tone":
      return [
        buildToneNumberChoice(input, entity),
        buildToneChoice(input, entity),
        buildToneMinimalPairChoice(input, entity),
        buildListenPinyinChoice(input, entity),
      ];
    case "pinyin":
      return [
        buildListenPinyinChoice(input, entity),
        buildPinyinAssembly(input, entity),
        buildPinyinExercise(input, entity),
        buildPinyinRecognitionFromMistake(mistake, input, entity),
      ];
    case "hanzi":
      return [
        buildHanziBuilderExercise(input, entity),
        buildHanziAssembly(input, entity),
        buildHanziFromMeaning(input, entity),
        buildUsageExercise(input, entity),
        buildReadingExercise(input, entity) ?? buildFormExercise(input, entity),
      ];
    case "sentence":
      return [
        buildClozeFromMistake(mistake, input, entity),
        buildSentenceBuild(input, entity),
        buildPhraseContextFromMistake(mistake, input, entity),
        buildMeaningContextChoice(input, entity),
      ];
    case "audio":
      return [
        buildListenSelect(input, entity),
        buildListenPinyinChoice(input, entity),
        buildSentenceBuild(input, entity),
        buildSpeakExercise(input, entity),
      ];
    case "meaning":
      return [
        buildMeaningContextChoice(input, entity),
        buildMeaningExercise(input, entity),
        buildHanziFromMeaning(input, entity),
        buildMistakePairs(mistake, input, entity),
      ];
    default:
      break;
  }
  return [buildReviewExercise(input), buildMeaningExercise(input, entity), buildFlashcard(input, entity)];
}

function isConceptualMistake(mistake: ActivityErrorRecord): boolean {
  const text = `${mistake.prompt} ${mistake.mistakeReason ?? ""} ${mistake.explanation ?? ""}`.toLocaleLowerCase("pt-BR");
  return text.includes("conceito") || text.includes("pinyin ≠") || text.includes("pinyin diferente de hànzì");
}

function mistakeReviewFocus(mistake: ActivityErrorRecord): MistakeReviewFocus {
  const primaryDomain = mistake.targets[0]?.domain;
  const text = `${mistake.type} ${mistake.skill} ${primaryDomain ?? ""} ${mistake.prompt} ${mistake.mistakeReason ?? ""} ${mistake.explanation ?? ""}`
    .toLocaleLowerCase("pt-BR");

  if (mistake.type === "image_choice") {
    if (mistake.skill === "pinyin" || mistake.skill === "som") return "visual";
    if (mistake.skill === "forma" || mistake.skill === "hanzi") return "visual";
    return "visual";
  }
  if (mistake.type === "pair-match" || mistake.type === "match_pairs") return "pairs";
  if (mistake.type === "tone" || mistake.type === "tone_pair" || text.includes("tom") || isLikelyToneOnlyMistake(mistake)) return "tone";
  if (mistake.skill === "pinyin" || primaryDomain === "pinyin" || text.includes("pinyin")) return "pinyin";
  if (mistake.type === "listen_select" || mistake.skill === "som" || primaryDomain === "som" || text.includes("áudio")) return "audio";
  if (
    mistake.type === "recognize" ||
    mistake.type === "hanzi_build" ||
    mistake.skill === "forma" ||
    mistake.skill === "hanzi" ||
    primaryDomain === "forma" ||
    text.includes("hànzì") ||
    text.includes("hanzi")
  ) {
    return "hanzi";
  }
  if (
    mistake.type === "translation_build" ||
    mistake.type === "sentence_build" ||
    mistake.type === "produce" ||
    mistake.type === "fill_blank" ||
    mistake.type === "dialogue_choice" ||
    mistake.skill === "uso" ||
    primaryDomain === "uso" ||
    primaryDomain === "fala"
  ) {
    return "sentence";
  }
  return "meaning";
}

function isLikelyToneOnlyMistake(mistake: ActivityErrorRecord): boolean {
  const correct = stripPinyinTone(mistake.correctAnswer ?? "").toLocaleLowerCase("pt-BR");
  const selected = stripPinyinTone(mistake.selectedAnswer ?? "").toLocaleLowerCase("pt-BR");
  return Boolean(correct && selected && correct === selected && mistake.correctAnswer !== mistake.selectedAnswer);
}

// Ordena os formatos possíveis para o domínio. O primeiro que passar na
// validação vira a tarefa; o flashcard é sempre o último recurso. A paridade
// de `reps` alterna formatos para o mesmo item não repetir sempre o mesmo tipo.
function candidatesForDomain(
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity,
  fallback: ReviewExercise
): (ReviewExercise | null)[] {
  const reps = input.item.reps;
  switch (input.domain) {
    case "fala":
      return [buildSpeakExercise(input, entity), fallback];
    case "som":
      return reps % 2 === 0
        ? [buildToneNumberChoice(input, entity), buildListenSelect(input, entity), buildListenPinyinChoice(input, entity), fallback]
        : [buildListenSelect(input, entity), buildToneChoice(input, entity), buildToneMinimalPairChoice(input, entity), fallback];
    case "pinyin":
      return reps % 2 === 1
        ? [buildPinyinAssembly(input, entity), buildListenPinyinChoice(input, entity), buildPinyinExercise(input, entity), fallback]
        : [buildPinyinExercise(input, entity), buildListenPinyinChoice(input, entity), buildPinyinAssembly(input, entity), fallback];
    case "forma":
      return entity.type === "char" && reps % 2 === 1
        ? [buildImageChoiceReview(input, entity), buildHanziBuilderExercise(input, entity), buildHanziFromMeaning(input, entity), buildFormExercise(input, entity), fallback]
        : [buildFormExercise(input, entity), buildImageChoiceReview(input, entity), buildHanziBuilderExercise(input, entity), buildHanziFromMeaning(input, entity), fallback];
    case "significado":
      return reps % 2 === 0
        ? [buildImageChoiceReview(input, entity), buildMeaningContextChoice(input, entity), buildMeaningExercise(input, entity), fallback]
        : [buildMeaningExercise(input, entity), buildImageChoiceReview(input, entity), buildMeaningContextChoice(input, entity), fallback];
    case "uso":
      return [buildUsageExercise(input, entity), fallback];
    case "leitura":
      return [buildReadingExercise(input, entity), fallback];
    default:
      return [fallback];
  }
}

export function resolveReviewEntity(item: SRSItem): ReviewExerciseEntity | null {
  if (item.type === "chunk") {
    const chunk = chunkById[item.itemId];
    return chunk
      ? {
          type: item.type,
          itemId: item.itemId,
          hanzi: chunk.hanzi,
          pinyin: chunk.pinyin,
          meaningPt: chunk.meaningPt,
          literalPt: chunk.literalPt,
        }
      : null;
  }

  if (item.type === "char") {
    const char = charById[item.itemId];
    return char
      ? {
          type: item.type,
          itemId: item.itemId,
          hanzi: char.hanzi,
          pinyin: char.pinyin,
          meaningPt: char.meaningPt,
          mnemonicPt: char.mnemonicPt,
          toneless: char.toneless,
          tone: char.tone,
        }
      : null;
  }

  const radical = radicalById[item.itemId];
  return radical
    ? {
        type: item.type,
        itemId: item.itemId,
        hanzi: radical.glyph,
        pinyin: radical.pinyin ?? "",
        meaningPt: radical.meaningPt,
      }
    : null;
}

function buildListenSelect(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const options = entity.type === "chunk" ? chunkHanziOptions(input, entity) : charHanziOptions(input, entity);
  if (options.length < 2) return null;
  const answer = entity.type === "chunk" ? cleanHanzi(entity.hanzi) : entity.hanzi;
  return {
    kind: "listen_select",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Ouça e escolha.",
    question: "Qual item você ouviu?",
    audioText: entity.hanzi,
    answer,
    answerLabel: entity.hanzi,
    options,
    explanation: `${entity.hanzi} soa como ${entity.pinyin || "este item"} e significa ${entity.meaningPt}`,
    canAutoCheck: true,
  };
}

function buildPinyinExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const options = pinyinOptions(input, entity);
  if (!entity.pinyin || options.length < 2) return null;
  return {
    kind: "pinyin_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: hasRecentError(input) ? "Corrija o pinyin que escapou." : "Escolha o pinyin.",
    question: "Qual é o pinyin correto?",
    displayText: entity.hanzi,
    displayType: "hanzi",
    audioText: entity.hanzi,
    answer: entity.pinyin,
    answerLabel: entity.pinyin,
    options,
    explanation: `${entity.hanzi} se lê ${entity.pinyin} e significa ${meaningForSentence(entity)}.`,
    canAutoCheck: true,
  };
}

function buildListenPinyinChoice(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const options = pinyinOptions(input, entity);
  if (!entity.pinyin || options.length < 2) return null;
  return {
    kind: "pinyin_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Ouça e escolha o pinyin.",
    question: "Qual pinyin corresponde ao áudio?",
    audioText: entity.hanzi,
    answer: entity.pinyin,
    answerLabel: entity.pinyin,
    options,
    explanation: `O áudio de ${entity.hanzi} corresponde a ${entity.pinyin}.`,
    canAutoCheck: true,
  };
}

function buildPinyinAssembly(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (!entity.pinyin) return null;
  const targetValues = pinyinPartsFor(entity.pinyin);
  if (targetValues.length < 2) return null;
  const distractors = pinyinDistractors(input, entity);
  return {
    kind: "sentence_build",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Monte o pinyin.",
    question: `Como se escreve o som de ${entity.hanzi}?`,
    displayText: entity.hanzi,
    displayType: "hanzi",
    audioText: entity.hanzi,
    answer: entity.pinyin,
    answerLabel: entity.pinyin,
    pieces: buildPieces(mixPieces([...targetValues, ...distractors])),
    targetValues,
    explanation: `${entity.hanzi} se lê ${entity.pinyin}. O acento marca o tom da sílaba.`,
    canAutoCheck: true,
  };
}

// base -> forma acentuada por tom (1..4). Usado para gerar os 4 tons possíveis.
const TONE_VOWEL_FORMS: Record<string, [string, string, string, string]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
};

const ACCENTED_VOWEL_TO_BASE: Record<string, string> = Object.entries(TONE_VOWEL_FORMS).reduce(
  (acc, [base, forms]) => {
    for (const form of forms) acc[form] = base;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * A partir do pinyin correto (com acento), reescreve a vogal tônica com cada um
 * dos 4 tons. Não adivinha qual vogal recebe o tom: lê a posição já marcada no
 * pinyin de origem, então é robusto (inclui ü). Devolve null se não houver
 * vogal acentuada (ex.: tom neutro).
 */
function tonedVariants(pinyin: string): string[] | null {
  const chars = [...pinyin];
  const idx = chars.findIndex((ch) => ACCENTED_VOWEL_TO_BASE[ch]);
  if (idx < 0) return null;
  const base = ACCENTED_VOWEL_TO_BASE[chars[idx]];
  return [0, 1, 2, 3].map((tone) => {
    const next = [...chars];
    next[idx] = TONE_VOWEL_FORMS[base][tone];
    return next.join("");
  });
}

function buildToneChoice(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char" || !entity.tone || entity.tone < 1 || entity.tone > 4 || !entity.pinyin) return null;
  const variants = tonedVariants(entity.pinyin);
  if (!variants || variants.length < 2) return null;
  const options = variants.map((value, index) => ({
    id: `tone-${index}-${value}`,
    value,
    label: value,
    detail: TONE_LABELS[(index + 1) as 1 | 2 | 3 | 4],
    type: "pinyin" as const,
  }));
  return {
    kind: "tone_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: hasRecentError(input) ? "Ouça de novo e ajuste o tom." : "Ouça e escolha o tom.",
    question: `Qual é o tom de ${entity.hanzi}?`,
    displayText: entity.hanzi,
    displayType: "hanzi",
    audioText: entity.hanzi,
    answer: entity.pinyin,
    answerLabel: entity.pinyin,
    options,
    explanation: `${entity.hanzi} é ${entity.pinyin} — ${TONE_LABELS[entity.tone as 1 | 2 | 3 | 4]} (${entity.tone}º tom).`,
    canAutoCheck: true,
  };
}

function buildToneNumberChoice(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char" || !entity.tone || entity.tone < 1 || entity.tone > 4 || !entity.pinyin) return null;
  const tone = entity.tone as 1 | 2 | 3 | 4;
  const answer = `${tone}º tom`;
  const options = ([1, 2, 3, 4] as const).map((tone) => ({
    id: `tone-number-${tone}`,
    value: `${tone}º tom`,
    label: `${tone}º tom`,
    detail: TONE_LABELS[tone],
    type: "pt" as const,
  }));
  return {
    kind: "tone_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Ouça e escolha o tom.",
    question: `Qual é o contorno tonal de ${entity.hanzi}?`,
    displayText: entity.hanzi,
    displayType: "hanzi",
    audioText: entity.hanzi,
    answer,
    answerLabel: answer,
    options,
    explanation: `${entity.hanzi} é ${entity.pinyin}: ${answer}, ${TONE_LABELS[tone]}.`,
    canAutoCheck: true,
  };
}

function buildToneMinimalPairChoice(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char" || !entity.tone || entity.tone < 1 || entity.tone > 4 || !entity.pinyin) return null;
  const tone = entity.tone as 1 | 2 | 3 | 4;
  const variants = tonedVariants(entity.pinyin);
  if (!variants || variants.length < 2) return null;
  const base = stripPinyinTone(entity.pinyin);
  const options = variants.map((value, index) => ({
    id: `tone-minimal-${index}-${value}`,
    value,
    label: value,
    detail: `${base}, ${TONE_LABELS[(index + 1) as 1 | 2 | 3 | 4]}`,
    type: "pinyin" as const,
  }));
  return {
    kind: "tone_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Compare pares mínimos de tom.",
    question: "Qual versão combina com o áudio?",
    audioText: entity.hanzi,
    answer: entity.pinyin,
    answerLabel: entity.pinyin,
    options,
    explanation: `A base ${base} muda de sentido com o tom. Aqui a forma correta é ${entity.pinyin}, ${TONE_LABELS[tone]}.`,
    canAutoCheck: true,
  };
}

function buildHanziFromMeaning(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char") return null;
  const options = charHanziOptions(input, entity);
  if (options.length < 2) return null;
  return {
    kind: "meaning_to_hanzi",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Escolha o caractere.",
    question: `Qual hànzì significa “${entity.meaningPt}”?`,
    displayText: entity.pinyin || undefined,
    displayType: "pinyin",
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    options,
    explanation: `${entity.hanzi} = ${entity.pinyin} · ${meaningForSentence(entity)}.`,
    canAutoCheck: true,
  };
}

function visualConceptForEntity(entity: ReviewExerciseEntity): VisualConceptId | undefined {
  if (entity.type === "char") return visualByCharId[entity.itemId]?.id;
  const byHanzi = Object.values(visualByCharId).find((concept) => concept?.hanzi === entity.hanzi);
  return byHanzi?.id;
}

export function buildImageChoiceReview(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const conceptId = visualConceptForEntity(entity);
  const concept = conceptId ? resolveVisualConcept(conceptId) : undefined;
  if (!concept) return null;

  const modes: ImageChoiceMode[] = [
    "image_to_hanzi",
    "image_to_pinyin",
    "hanzi_to_image",
    "audio_to_image",
    "image_to_meaning",
    "meaning_to_image",
    "image_to_audio",
  ];
  const mode = modes[input.item.reps % modes.length];
  const normalized = normalizeImageChoiceMode(mode);
  const imageIds = [concept.id, ...defaultVisualDistractors(concept.id, 3)];

  if (imageChoiceUsesImageOptions(mode)) {
    const isAudio = normalized === "audio_to_image";
    const isMeaning = normalized === "meaning_to_image";
    return {
      kind: "image_choice",
      domain: input.domain,
      item: input.item,
      entity,
      prompt: isAudio ? "Revisão visual por áudio." : isMeaning ? "Revisão visual por significado." : "Revisão visual.",
      question: isAudio
        ? "Ouça e escolha a imagem certa."
        : isMeaning
          ? `Qual imagem combina com ${concept.meaningPt}?`
          : `Qual imagem combina com ${concept.hanzi}?`,
      displayText: normalized === "hanzi_to_image" ? concept.hanzi : isMeaning ? concept.meaningPt : undefined,
      displayType: normalized === "hanzi_to_image" ? "hanzi" : isMeaning ? "pt" : undefined,
      audioText: isAudio ? concept.hanzi : undefined,
      answer: concept.id,
      answerLabel: concept.meaningPt,
      imageChoiceMode: mode,
      imageOptionIds: imageIds,
      visualConceptId: concept.id,
      options: imageIds.map((id, index) => ({
        id: `visual-${id}-${index}`,
        value: id,
        label: resolveVisualConcept(id)?.meaningPt ?? id,
      })),
      explanation: `${concept.hanzi} (${concept.pinyin}) = ${concept.meaningPt}.`,
      canAutoCheck: true,
    };
  }

  if (normalized === "image_to_audio") {
    const hanziOptions = [concept.hanzi, ...defaultVisualDistractors(concept.id, 3)
      .map((id) => resolveVisualConcept(id)?.hanzi)
      .filter((value): value is string => Boolean(value && value !== concept.hanzi))].slice(0, 4);
    return {
      kind: "image_choice",
      domain: input.domain,
      item: input.item,
      entity,
      prompt: "Revisão visual por áudio.",
      question: "Ouça as opções e escolha o som certo.",
      visualConceptId: concept.id,
      imageChoiceMode: mode,
      answer: concept.hanzi,
      answerLabel: concept.hanzi,
      options: hanziOptions.map((value, index) => ({
        id: `audio-${value}-${index}`,
        value,
        label: value,
        type: "audio" as const,
      })),
      explanation: `${concept.hanzi} (${concept.pinyin}) = ${concept.meaningPt}.`,
      canAutoCheck: true,
    };
  }

  const textModes: Record<
    "image_to_hanzi" | "image_to_pinyin" | "image_to_meaning",
    { question: string; answer: string; options: ReviewOption[] }
  > = {
    image_to_hanzi: {
      question: "Qual hànzì combina com a imagem?",
      answer: concept.hanzi,
      options: imageIds
        .map((id) => resolveVisualConcept(id))
        .filter(Boolean)
        .map((entry, index) => ({
          id: `hanzi-${entry!.id}-${index}`,
          value: entry!.hanzi,
          label: entry!.hanzi,
          type: "hanzi" as const,
        })),
    },
    image_to_pinyin: {
      question: "Qual é o pinyin?",
      answer: concept.pinyin,
      options: imageIds
        .map((id) => resolveVisualConcept(id))
        .filter(Boolean)
        .map((entry, index) => ({
          id: `pinyin-${entry!.id}-${index}`,
          value: entry!.pinyin,
          label: entry!.pinyin,
          type: "pinyin" as const,
        })),
    },
    image_to_meaning: {
      question: "Qual é o significado?",
      answer: concept.meaningPt,
      options: imageIds
        .map((id) => resolveVisualConcept(id))
        .filter(Boolean)
        .map((entry, index) => ({
          id: `meaning-${entry!.id}-${index}`,
          value: entry!.meaningPt,
          label: entry!.meaningPt,
          type: "pt" as const,
        })),
    },
  };

  const payload = textModes[normalized as keyof typeof textModes];
  if (!payload || payload.options.length < 2) return null;

  return {
    kind: "image_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Revisão visual.",
    question: payload.question,
    visualConceptId: concept.id,
    imageChoiceMode: mode,
    answer: payload.answer,
    answerLabel: payload.answer,
    options: payload.options,
    explanation: `${concept.hanzi} (${concept.pinyin}) = ${concept.meaningPt}.`,
    canAutoCheck: true,
  };
}

function buildMeaningExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type === "chunk") {
    const pairs = chunkPairs(input, entity);
    if (pairs.length >= 2) {
      return {
        kind: "match_pairs",
        domain: input.domain,
        item: input.item,
        entity,
        prompt: "Combine pares.",
        question: "Ligue cada frase ao sentido.",
        answer: entity.hanzi,
        answerLabel: entity.meaningPt,
        pairs,
        explanation: `${entity.hanzi} significa ${entity.meaningPt}`,
        canAutoCheck: true,
      };
    }
  }

  const options = meaningOptions(input, entity);
  if (options.length < 2) return null;
  return {
    kind: "hanzi_reverse",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Leia e escolha.",
    question: "Qual é o pinyin e significado?",
    displayText: entity.hanzi,
    displayType: "hanzi",
    answer: `${entity.pinyin} · ${entity.meaningPt}`,
    answerLabel: `${entity.pinyin} · ${entity.meaningPt}`,
    options,
    explanation: `${entity.hanzi} = ${entity.pinyin} · ${entity.meaningPt}`,
    canAutoCheck: true,
  };
}

function buildMeaningContextChoice(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const context = MICROREAD_BY_HANZI[cleanHanzi(entity.hanzi)];
  const answer = meaningAnswerFor(entity);
  const options = meaningOnlyOptions(input, entity);
  if (options.length < 2) return null;
  return {
    kind: "microread",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Escolha a tradução em contexto.",
    question: `O que ${entity.hanzi} expressa aqui?`,
    displayText: context?.text ?? entity.hanzi,
    displayType: "hanzi",
    answer,
    answerLabel: answer,
    options,
    explanation: context?.explanation ?? `${entity.hanzi} significa ${meaningForSentence(entity)}.`,
    canAutoCheck: true,
  };
}

function splitPairReviewAnswer(value: string | undefined): { pinyin?: string; meaning?: string } {
  const raw = value?.trim();
  if (!raw) return {};
  const parts = raw.split("·").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { pinyin: parts[0], meaning: parts.slice(1).join(" · ") };
  return { meaning: raw };
}

function pairMistakeContext(mistake: ActivityErrorRecord, entity: ReviewExerciseEntity) {
  const left = (mistake.pairLeft ?? mistake.hanzi ?? mistake.tokens?.[0] ?? entity.hanzi).trim();
  const expectedRight = (mistake.pairExpectedRight ?? mistake.correctAnswer).trim();
  const selectedRight = (mistake.pairSelectedRight ?? mistake.selectedAnswer).trim();
  const expected = splitPairReviewAnswer(expectedRight);
  const selected = splitPairReviewAnswer(selectedRight);
  return {
    left,
    expectedRight,
    selectedRight,
    expectedMeaning: expected.meaning ?? expectedRight,
    selectedMeaning: selected.meaning ?? selectedRight,
    pinyin: expected.pinyin ?? mistake.pinyin ?? entity.pinyin,
    leftType: asReviewTextType(mistake.pairLeftType) ?? inferReviewTextType(left),
    rightType: asReviewTextType(mistake.pairRightType) ?? "pt",
    selectedRightType: asReviewTextType(mistake.pairSelectedRightType) ?? "pt",
  };
}

function asReviewTextType(value: string | undefined): ReviewTextType | undefined {
  return value === "pt" || value === "hanzi" || value === "pinyin" || value === "audio" ? value : undefined;
}

function inferReviewTextType(value: string): ReviewTextType {
  if (isMostlyPinyin(value)) return "pinyin";
  if (/[\u3400-\u9fff]/u.test(value)) return "hanzi";
  return "pt";
}

function buildPairMeaningChoice(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  const pair = pairMistakeContext(mistake, entity);
  const answer = pair.expectedMeaning;
  const selected = pair.selectedMeaning;
  const options = uniqueByValue(
    [
      optionFromValue(answer, 0, "pt"),
      optionFromValue(selected, 1, "pt"),
      ...learnedEntitiesForOptions(input, entity)
        .filter((option) => cleanHanzi(option.hanzi) !== cleanHanzi(pair.left))
        .map((option, index) => optionFromValue(option.meaningPt, index + 2, "pt")),
      ...["pessoa", "boca", "água", "fogo", "montanha", "sol; dia", "lua; mês", "árvore"].map((value, index) =>
        optionFromValue(value, index + 20, "pt")
      ),
    ].filter((option) => option.value.trim())
  ).slice(0, 5);
  if (options.length < 2) return null;
  return {
    kind: "hanzi_reverse",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Complete o par que você confundiu.",
    question: pair.leftType === "audio" ? "O que significa este áudio?" : `O que significa ${pair.left}?`,
    displayText: pair.left,
    displayType: pair.leftType,
    answer,
    answerLabel: answer,
    options,
    explanation: mistake.explanation ?? `${pair.left}${pair.pinyin ? ` (${pair.pinyin})` : ""} = ${answer}.`,
    canAutoCheck: true,
  };
}

function buildFormExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type === "chunk" && shouldBuildSentence(input)) {
    return buildSentenceBuild(input, entity);
  }

  const options = entity.type === "chunk" ? chunkHanziOptions(input, entity) : charHanziOptions(input, entity);
  if (!entity.pinyin || options.length < 2) return null;
  return {
    kind: "pinyin_reverse",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Pinyin reverso.",
    question: "Qual é o hànzì?",
    displayText: entity.pinyin,
    displayType: "pinyin",
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    options,
    explanation: `${entity.pinyin} corresponde a ${entity.hanzi}.`,
    canAutoCheck: true,
  };
}

function buildUsageExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type === "chunk") {
    const dialogue = CHUNK_DIALOGUES[cleanHanzi(entity.hanzi)];
    if (hasRecentError(input)) {
      return buildSentenceBuild(input, entity) ?? (dialogue ? buildDialogue(input, entity, dialogue) : null);
    }
    if (dialogue) return buildDialogue(input, entity, dialogue);
    return buildSentenceBuild(input, entity);
  }

  const template = CHAR_FILL_TEMPLATES[cleanHanzi(entity.hanzi)];
  if (!template) return null;
  return {
    kind: "fill_blank",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: template.prompt,
    question: `${template.sentenceBefore} ___ ${template.sentenceAfter}`,
    displayText: `${template.sentenceBefore}___${template.sentenceAfter}`,
    displayType: "hanzi",
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    options: template.options.map((option, index) => optionFromValue(option, index, "hanzi")),
    explanation: template.explanation,
    canAutoCheck: true,
  };
}

function buildReadingExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const example = MICROREAD_BY_HANZI[cleanHanzi(entity.hanzi)];
  if (!example) {
    if (entity.type === "char") {
      const answer = `${entity.pinyin} · ${entity.meaningPt}`;
      return {
        kind: "microread",
        domain: input.domain,
        item: input.item,
        entity,
        prompt: "Leia em contexto.",
        question: `Qual leitura combina com ${entity.hanzi}?`,
        displayText: entity.hanzi,
        displayType: "hanzi",
        answer,
        answerLabel: answer,
        options: meaningOptions(input, entity),
        explanation: `${entity.hanzi} = ${entity.pinyin} · ${meaningForSentence(entity)}.`,
        canAutoCheck: true,
      };
    }
    return null;
  }

  return {
    kind: "microread",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Leitura curta.",
    question: example.question,
    displayText: example.text,
    displayType: "hanzi",
    answer: example.answer,
    answerLabel: example.answer,
    options: readingOptions(example.answer, input, entity),
    explanation: example.explanation,
    canAutoCheck: true,
  };
}

function buildSpeakExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise {
  return {
    kind: "speak",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Fale, ouça e compare.",
    question: `Diga em mandarim: ${entity.meaningPt}`,
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    explanation: `Modelo: ${entity.hanzi}${entity.pinyin ? ` (${entity.pinyin})` : ""}. Compare ritmo, tom e pinyin antes de dar a nota.`,
    canAutoCheck: false,
  };
}

function buildSentenceBuild(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  const clean = cleanHanzi(entity.hanzi);
  const targetValues = targetPartsFor(clean);
  if (targetValues.length === 0) return null;
  const pieces = buildPieces(mixPieces([...targetValues, ...pieceDistractors(clean, input, entity)]));
  return {
    kind: "sentence_build",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: `Monte “${meaningAnswerFor(entity)}”.`,
    question: "Toque nas peças na ordem certa.",
    answer: clean,
    answerLabel: entity.hanzi,
    pieces,
    targetValues,
    explanation: `${entity.hanzi} = ${entity.meaningPt}`,
    canAutoCheck: true,
  };
}

function buildDialogue(
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity,
  dialogue: { prompt: string; answer: string; explanation: string }
): ReviewExercise {
  return {
    kind: "dialogue_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Diálogo.",
    question: dialogue.prompt,
    answer: dialogue.answer,
    answerLabel: dialogue.answer,
    options: chunkHanziOptions(input, { ...entity, hanzi: dialogue.answer }),
    explanation: dialogue.explanation,
    canAutoCheck: true,
  };
}

function buildFlashcard(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise {
  return {
    kind: "flashcard",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Flashcard.",
    displayText: entity.hanzi,
    displayType: "hanzi",
    audioText: entity.hanzi,
    question: "Revele e dê uma nota.",
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    explanation: `${entity.hanzi}${entity.pinyin ? ` (${entity.pinyin})` : ""} = ${entity.meaningPt}`,
    canAutoCheck: false,
    fallback: true,
  };
}

function buildClozeFromMistake(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  const sentence = cleanHanzi(mistake.hanzi ?? entity.hanzi);
  const answer = clozeAnswerForMistake(mistake, entity);
  if (!sentence || !answer || !sentence.includes(answer)) return buildUsageExercise(input, entity);
  const before = sentence.slice(0, sentence.indexOf(answer));
  const after = sentence.slice(sentence.indexOf(answer) + answer.length);
  const options = uniqueByValue(
    [
      optionFromValue(answer, 0, "hanzi"),
      ...pieceDistractors(sentence, input, entity).map((value, index) => optionFromValue(value, index + 1, "hanzi")),
      ...targetPartsFor(sentence)
        .filter((value) => value !== answer)
        .map((value, index) => optionFromValue(value, index + 5, "hanzi")),
    ]
  ).slice(0, 4);
  return {
    kind: "fill_blank",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Complete a lacuna antes de montar tudo.",
    question: `${before || ""} ___ ${after || ""}`,
    displayText: `${before}___${after}`,
    displayType: "hanzi",
    answer,
    answerLabel: answer,
    options,
    explanation: `${answer} é a peça que faltava em ${sentence}. ${mistake.explanation ?? entity.meaningPt}`,
    canAutoCheck: true,
  };
}

function clozeAnswerForMistake(mistake: ActivityErrorRecord, entity: ReviewExerciseEntity): string {
  if (mistake.type === "fill_blank") return cleanHanzi(mistake.correctAnswer);
  const parts = targetPartsFor(cleanHanzi(entity.hanzi));
  if (parts.includes("不会")) return "不会";
  if (parts.length > 1) return parts[Math.min(1, parts.length - 1)];
  return cleanHanzi(entity.hanzi);
}

function buildMistakePairs(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  const pair = pairMistakeContext(mistake, entity);
  const distractors = learnedEntitiesForOptions(input, entity)
    .filter((item) => cleanHanzi(item.hanzi) !== cleanHanzi(pair.left) && item.meaningPt !== pair.expectedMeaning)
    .slice(0, 3);
  const pairs = uniqueByValue([
    {
      id: `mistake-pair-target-${cleanHanzi(pair.left) || pair.left}`,
      left: pair.left,
      right: pair.expectedMeaning.replace(/\.$/, ""),
      leftType: pair.leftType,
      rightType: "pt" as const,
      reinforcement: true,
      reviewType: entity.type,
      reviewItemId: entity.itemId,
    },
    ...distractors.map((item, index) => ({
      id: `mistake-pair-distractor-${index}-${cleanHanzi(item.hanzi)}`,
      left: cleanHanzi(item.hanzi),
      right: meaningAnswerFor(item),
      leftType: "hanzi" as const,
      rightType: "pt" as const,
      reinforcement: false,
      reviewType: item.type,
      reviewItemId: item.itemId,
    })),
  ]);
  if (pairs.length < 2) return null;
  return {
    kind: "match_pairs",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Revise só o par que falhou.",
    question: "Ligue o par principal ao sentido correto.",
    answer: pair.left,
    answerLabel: pair.expectedMeaning,
    pairs,
    explanation: `${pair.left}${pair.pinyin ? ` (${pair.pinyin})` : ""} significa ${pair.expectedMeaning}.`,
    canAutoCheck: true,
  };
}

function uniqueEntities(values: ReviewExerciseEntity[]): ReviewExerciseEntity[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = `${value.type}:${value.itemId}:${cleanHanzi(value.hanzi)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSentenceUsingMistakePair(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  const sentence = cleanHanzi(mistake.hanzi ?? entity.hanzi);
  if (sentence.length > cleanHanzi(entity.hanzi).length) {
    return buildPhraseContextFromMistake(mistake, input, { ...entity, hanzi: sentence });
  }
  return buildReadingExercise(input, entity) ?? buildUsageExercise(input, entity);
}

function buildPhraseContextFromMistake(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  const sentence = cleanHanzi(mistake.hanzi ?? entity.hanzi);
  if (!sentence) return buildUsageExercise(input, entity);
  const options = readingOptions(sentence, input, entity);
  return {
    kind: "microread",
    domain: input.domain,
    item: input.item,
    entity: { ...entity, hanzi: sentence },
    prompt: "Leia a frase em contexto.",
    question: "Qual frase corrige o erro anterior?",
    displayText: sentence,
    displayType: "hanzi",
    answer: sentence,
    answerLabel: sentence,
    options,
    explanation: mistake.explanation ?? `${sentence} retoma o ponto que você errou.`,
    canAutoCheck: true,
  };
}

function buildPinyinRecognitionFromMistake(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise | null {
  if (!entity.pinyin) return null;
  const options = entity.type === "chunk" ? chunkHanziOptions(input, entity) : charHanziOptions(input, entity);
  return {
    kind: "pinyin_reverse",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Veja o pinyin com acento e escolha a forma.",
    question: "Qual hànzì corresponde a esse pinyin?",
    displayText: mistake.pinyin ?? entity.pinyin,
    displayType: "pinyin",
    audioText: entity.hanzi,
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    options,
    explanation: `${entity.pinyin} corresponde a ${entity.hanzi}.`,
    canAutoCheck: true,
  };
}

// Glifos que o aluno já encontrou via SRS (caracteres e radicais aprendidos).
// Libera builders compostos na revisão sem pular as bases: 你 por componentes
// só depois de 人/亻 terem aparecido para o aluno.
function seenGlyphsFromLearned(learnedItems: SRSItem[]): Set<string> {
  const set = new Set<string>();
  for (const learned of learnedItems) {
    if (learned.type === "char") {
      const glyph = charById[learned.itemId]?.hanzi;
      if (glyph) set.add(glyph);
    } else if (learned.type === "radical") {
      const radical = radicalById[learned.itemId];
      if (radical?.glyph) set.add(radical.glyph);
      if (radical?.variant) set.add(radical.variant);
    }
  }
  return set;
}

// Monta o hànzì como quebra-cabeça visual (carta central), quando existe um
// exercício de builder para o caractere errado. Renderizado pela RevisaoPage
// com o componente HanziBuilderExercise (auto-verificável).
//
// A variação segue o domínio do aluno (novo → guia; dominado → desafio/frase)
// e nunca escolhe composição cujas bases ele ainda não viu — nesse caso retorna
// null e a fila de candidatos cai em reconhecimento simples (assembly de
// peças mnemônicas, significado→hànzì, pinyin reverso).
function buildHanziBuilderExercise(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char") return null;
  const character = cleanHanzi(entity.hanzi);
  const builder = selectHanziBuilderForStudent(
    character,
    input.hanziBuilderProgress?.[character],
    seenGlyphsFromLearned(input.learnedItems)
  );
  if (!builder) return null;
  return {
    kind: "hanzi_build",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Monte o hànzì peça por peça.",
    question: builder.promptPt,
    displayText: entity.hanzi,
    displayType: "hanzi",
    answer: entity.hanzi,
    answerLabel: entity.hanzi,
    explanation: builder.explanationPt,
    builderId: builder.id,
    canAutoCheck: false,
  };
}

function buildHanziAssembly(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExercise | null {
  if (entity.type !== "char") return null;
  const char = charById[entity.itemId];
  const components = (char?.components ?? [])
    .map((id) => radicalById[id]?.variant ?? radicalById[id]?.glyph)
    .filter((value): value is string => Boolean(value));
  if (components.length === 0) return null;
  const distractors = ["口", "人", "木", "日", "月", "水", "火"].filter((value) => !components.includes(value));
  return {
    kind: "sentence_build",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Monte o hànzì pelas peças.",
    question: `Quais peças ajudam a lembrar ${entity.hanzi}?`,
    displayText: entity.meaningPt,
    displayType: "pt",
    answer: components.join(""),
    answerLabel: entity.hanzi,
    pieces: buildPieces(mixPieces([...components, ...distractors.slice(0, 3)])),
    targetValues: components,
    explanation: char?.mnemonicPt ?? `${entity.hanzi} pode ser lembrado pelas peças ${components.join(" + ")}.`,
    canAutoCheck: true,
  };
}

function buildConceptualRemedy(
  mistake: ActivityErrorRecord,
  input: ReviewExerciseBuildInput,
  entity: ReviewExerciseEntity
): ReviewExercise {
  const answer = "Pinyin representa o som; hànzì é a forma visual.";
  return {
    kind: "dialogue_choice",
    domain: input.domain,
    item: input.item,
    entity,
    prompt: "Repare no conceito antes da pergunta.",
    question: "Qual explicação está correta?",
    displayText: "Pinyin ≠ hànzì",
    displayType: "pt",
    answer,
    answerLabel: answer,
    options: [
      optionFromValue(answer, 0, "pt"),
      optionFromValue("Pinyin é a tradução em português.", 1, "pt"),
      optionFromValue("Hànzì representa só o som da palavra.", 2, "pt"),
      optionFromValue("Pinyin é sempre uma palavra em inglês.", 3, "pt"),
    ],
    explanation:
      mistake.explanation ??
      "Pinyin representa o som da palavra. Hànzì é a forma visual usada na escrita chinesa.",
    canAutoCheck: true,
  };
}

export function validateReviewExercise(exercise: ReviewExercise | null): ReviewExercise | null {
  if (!exercise) return null;
  if (!exercise.answer?.trim()) return null;
  if (!exercise.prompt?.trim() || !exercise.question?.trim()) return null;

  if (exercise.kind === "sentence_build") {
    const targetValues = exercise.targetValues ?? [];
    const pieces = exercise.pieces ?? [];
    if (targetValues.length === 0 || pieces.length < targetValues.length) return null;
    if (!containsPieceCounts(pieces.map((piece) => piece.value), targetValues)) return null;
    return exercise;
  }

  if (exercise.kind === "match_pairs") {
    const pairs = exercise.pairs ?? [];
    if (pairs.length < 2) return null;
    if (pairs.some((pair) => !pair.left?.trim() || !pair.right?.trim())) return null;
    if (hasDuplicate(pairs.map((pair) => pair.left))) return null;
    if (hasDuplicate(pairs.map((pair) => pair.right))) return null;
    return exercise;
  }

  if (exercise.kind === "image_choice") {
    if (exercise.imageOptionIds?.length) {
      const ids = exercise.imageOptionIds;
      if (ids.length < 2) return null;
      if (hasDuplicate(ids)) return null;
      if (!ids.includes(exercise.answer)) return null;
      return exercise;
    }
  }

  if (!exercise.canAutoCheck) return exercise;

  const options = exercise.options ?? [];
  if (options.length < 2) return null;
  if (options.some((option) => !option.value?.trim() || !option.label?.trim())) return null;
  if (hasDuplicate(options.map((option) => normalizeOptionValue(option.value)))) return null;
  if (!options.some((option) => normalizeOptionValue(option.value) === normalizeOptionValue(exercise.answer))) return null;
  return exercise;
}

function shouldBuildSentence(input: ReviewExerciseBuildInput): boolean {
  return hasRecentError(input) || input.item.reps % 2 === 0;
}

function hasRecentError(input: ReviewExerciseBuildInput): boolean {
  return (
    input.item.lapses > 0 ||
    hasActivityErrorForItem(input) ||
    (input.errorHistory ?? []).some(
      (item) =>
        item.type === input.item.type &&
        item.itemId === input.item.itemId &&
        item.reviewDomain === input.item.reviewDomain
    )
  );
}

function hasActivityErrorForItem(input: ReviewExerciseBuildInput): boolean {
  return (input.activityErrors ?? []).some((error) =>
    error.targets.some((target) => targetMatchesItem(target, input))
  );
}

function targetMatchesItem(target: ActivityReviewTarget, input: ReviewExerciseBuildInput): boolean {
  return target.type === input.item.type && target.itemId === input.item.itemId && target.domain === input.domain;
}

function learnedChunks(input: ReviewExerciseBuildInput): ReviewExerciseEntity[] {
  const ids = [
    ...input.learnedItems.filter((item) => item.type === "chunk").map((item) => item.itemId),
    ...CORE_CHUNK_IDS,
  ];
  return unique(ids)
    .map((id) => chunkById[id])
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk))
    .map((chunk) => ({
      type: "chunk" as const,
      itemId: chunk.id,
      hanzi: chunk.hanzi,
      pinyin: chunk.pinyin,
      meaningPt: chunk.meaningPt,
      literalPt: chunk.literalPt,
    }));
}

function learnedChars(input: ReviewExerciseBuildInput): ReviewExerciseEntity[] {
  const ids = [
    ...input.learnedItems.filter((item) => item.type === "char").map((item) => item.itemId),
    ...CORE_CHAR_IDS,
  ];
  return unique(ids)
    .map((id) => charById[id])
    .filter((char): char is NonNullable<typeof char> => Boolean(char))
    .map((char) => ({
      type: "char" as const,
      itemId: char.id,
      hanzi: char.hanzi,
      pinyin: char.pinyin,
      meaningPt: char.meaningPt,
      mnemonicPt: char.mnemonicPt,
    }));
}

function learnedEntitiesForOptions(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewExerciseEntity[] {
  const source = entity.type === "chunk" ? [...learnedChunks(input), ...learnedChars(input)] : [...learnedChars(input), ...learnedChunks(input)];
  return uniqueEntities([entity, ...source]).filter((item) => item.hanzi && item.meaningPt);
}

function meaningOnlyOptions(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewOption[] {
  const answer = meaningAnswerFor(entity);
  return uniqueByValue([
    optionFromValue(answer, 0, "pt"),
    ...learnedEntitiesForOptions(input, entity)
      .filter((option) => cleanHanzi(option.hanzi) !== cleanHanzi(entity.hanzi))
      .map((option, index) => optionFromValue(meaningAnswerFor(option), index + 1, "pt")),
  ]).slice(0, 4);
}

function pinyinPartsFor(pinyin: string): string[] {
  const syllables = pinyin.trim().split(/\s+/).filter(Boolean);
  if (syllables.length > 1) return syllables;
  const [syllable] = syllables;
  if (!syllable) return [];
  const chars = [...syllable];
  const accentIndex = chars.findIndex((char) => ACCENTED_VOWEL_TO_BASE[char]);
  if (accentIndex > 0) return [chars.slice(0, accentIndex).join(""), chars.slice(accentIndex).join("")].filter(Boolean);
  if (chars.length <= 2) return chars;
  return [chars.slice(0, -1).join(""), chars.slice(-1).join("")].filter(Boolean);
}

function pinyinDistractors(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): string[] {
  const target = new Set(pinyinPartsFor(entity.pinyin));
  return unique(
    learnedEntitiesForOptions(input, entity)
      .flatMap((item) => pinyinPartsFor(item.pinyin))
      .filter((part) => !target.has(part))
  ).slice(0, 4);
}

function chunkHanziOptions(input: ReviewExerciseBuildInput, entity: Pick<ReviewExerciseEntity, "hanzi">): ReviewOption[] {
  const target = cleanHanzi(entity.hanzi);
  const options = learnedChunks(input)
    .filter((option) => cleanHanzi(option.hanzi) !== target)
    .slice(0, 6);
  return uniqueByValue([{ hanzi: target, pinyin: "", meaningPt: "" }, ...options].map((option, index) =>
    optionFromValue(cleanHanzi(option.hanzi), index, "hanzi")
  )).slice(0, 4);
}

function charHanziOptions(input: ReviewExerciseBuildInput, entity: Pick<ReviewExerciseEntity, "hanzi">): ReviewOption[] {
  const target = cleanHanzi(entity.hanzi);
  return uniqueByValue(
    [{ hanzi: target }, ...learnedChars(input).filter((option) => option.hanzi !== target)]
      .slice(0, 5)
      .map((option, index) => optionFromValue(option.hanzi, index, "hanzi"))
  ).slice(0, 4);
}

function meaningOptions(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewOption[] {
  const source = entity.type === "chunk" ? learnedChunks(input) : learnedChars(input);
  const target = `${entity.pinyin} · ${entity.meaningPt}`;
  return uniqueByValue([
    optionFromValue(target, 0, "pt"),
    ...source
      .filter((option) => option.hanzi !== entity.hanzi)
      .slice(0, 5)
      .map((option, index) => optionFromValue(`${option.pinyin} · ${option.meaningPt}`, index + 1, "pt")),
  ]).slice(0, 4);
}

function meaningAnswerFor(entity: Pick<ReviewExerciseEntity, "hanzi" | "meaningPt">): string {
  if (cleanHanzi(entity.hanzi) === "谢谢") return "Obrigado(a).";
  return entity.meaningPt.replace(/\.$/, "");
}

function meaningForSentence(entity: Pick<ReviewExerciseEntity, "meaningPt">): string {
  return entity.meaningPt.replace(/[.!?。]+$/, "");
}

function pinyinOptions(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewOption[] {
  const source = entity.type === "chunk" ? learnedChunks(input) : learnedChars(input);
  return uniqueByValue([
    optionFromValue(entity.pinyin, 0, "pinyin"),
    ...source
      .filter((option) => option.hanzi !== entity.hanzi && option.pinyin && option.pinyin !== entity.pinyin)
      .slice(0, 6)
      .map((option, index) => optionFromValue(option.pinyin, index + 1, "pinyin")),
  ]).slice(0, 4);
}

function readingOptions(answer: string, input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewOption[] {
  const chunkOptions = learnedChunks(input)
    .filter((option) => cleanHanzi(option.hanzi) !== cleanHanzi(entity.hanzi))
    .map((option) => cleanHanzi(option.hanzi));
  const generic = ["你好", "谢谢", "再见", "不客气", "中文", "茶", "三个", "Vamos embora."];
  return uniqueByValue([answer, ...chunkOptions, ...generic].map((value, index) => optionFromValue(value, index))).slice(0, 4);
}

function chunkPairs(input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): ReviewMatchPair[] {
  const target = cleanHanzi(entity.hanzi);
  const basePairs: AdaptivePair[] = [
    {
      left: target,
      right: meaningAnswerFor(entity),
      leftType: "hanzi",
      rightType: "pt",
      reviewType: entity.type,
      reviewItemId: entity.itemId,
    },
  ];
  return expandPairsWithLearned(
    basePairs,
    {
      learnedItems: input.learnedItems,
      phaseOrder: 3,
    },
    4
  ).map((pair, index) => ({
    ...pair,
    id: `pair-${index}-${cleanHanzi(pair.left)}-${cleanHanzi(pair.right)}`,
  }));
}

function targetPartsFor(clean: string): string[] {
  if (clean === "谢谢") return ["谢", "谢"];
  if (clean === "不客气") return ["不", "客气"];
  if (clean === "再见") return ["再", "见"];
  if (clean === "你好") return ["你", "好"];
  if (clean === "你好吗") return ["你", "好", "吗"];
  if (clean === "我叫马修") return ["我", "叫", "马修"];
  if (clean === "我很好") return ["我", "很", "好"];
  if (clean === "我不会说中文") return ["我", "不会", "说", "中文"];
  if (clean === "我会说一点中文") return ["我", "会", "说", "一点", "中文"];
  if (clean === "请再说一遍") return ["请", "再", "说", "一遍"];
  if (clean === "我听不懂") return ["我", "听不懂"];
  if (clean === "我喜欢中文") return ["我", "喜欢", "中文"];
  if (clean === "我想喝茶") return ["我", "想", "喝", "茶"];
  if (clean === "多少钱") return ["多少", "钱"];
  if (clean === "我要这个") return ["我", "要", "这个"];
  if (clean === "我们走吧") return ["我们", "走", "吧"];
  if (clean === "我有三个朋友") return ["我", "有", "三", "个", "朋友"];
  return [...clean];
}

function pieceDistractors(clean: string, input: ReviewExerciseBuildInput, entity: ReviewExerciseEntity): string[] {
  const common = ["你", "好", "谢", "再", "见", "我", "是", "不", "吗", "中文", "茶"];
  const weak = weakChunkPieces(input);
  const learned = learnedChunks(input).flatMap((chunk) => targetPartsFor(cleanHanzi(chunk.hanzi))).slice(0, 8);
  return unique([...weak, ...common, ...learned])
    .filter((piece) => !targetPartsFor(clean).includes(piece))
    .slice(0, entity.type === "chunk" ? 4 : 3);
}

function weakChunkPieces(input: ReviewExerciseBuildInput): string[] {
  const activityErrorPieces = (input.activityErrors ?? [])
    .flatMap((error) => error.targets)
    .filter((target) => target.type === "chunk")
    .map((target) => chunkById[target.itemId])
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk))
    .flatMap((chunk) => targetPartsFor(cleanHanzi(chunk.hanzi)));

  const srsErrorPieces = (input.errorHistory ?? [])
    .filter((item) => item.type === "chunk")
    .map((item) => chunkById[item.itemId])
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk))
    .flatMap((chunk) => targetPartsFor(cleanHanzi(chunk.hanzi)));

  return unique([...activityErrorPieces, ...srsErrorPieces])
    .slice(0, 8);
}

function buildPieces(values: string[]): ReviewBuildPiece[] {
  return values.map((value, index) => ({ id: `piece-${index}-${value}`, value }));
}

function mixPieces(values: string[]): string[] {
  if (values.length <= 2) return [...values].reverse();
  return values
    .map((value, index) => ({ value, rank: (index * 3 + 2) % values.length }))
    .sort((a, b) => a.rank - b.rank)
    .map((item) => item.value);
}

function optionFromValue(value: string, index: number, type?: ReviewTextType): ReviewOption {
  return { id: `option-${index}-${value}`, value, label: value, type };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueByValue<T extends { value?: string; label?: string; right?: string; left?: string }>(values: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = value.value ?? value.label ?? `${value.left ?? ""}->${value.right ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function cleanHanzi(value: string): string {
  return value.replace(HANZI_PUNCTUATION_RE, "");
}

function isMostlyPinyin(value: string): boolean {
  const plain = stripPinyinTone(value)
    .toLocaleLowerCase("pt-BR")
    .replace(/[\s'’-]/g, "");
  return /^[a-züv]+$/u.test(plain) && /[aeiouüv]/u.test(plain);
}

function normalizeOptionValue(value: string): string {
  return cleanHanzi(value).toLocaleLowerCase("pt-BR");
}

function hasDuplicate(values: string[]): boolean {
  const seen = new Set<string>();
  for (const value of values.map(normalizeOptionValue)) {
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

function containsPieceCounts(pieces: string[], targetValues: string[]): boolean {
  const available = countValues(pieces);
  const needed = countValues(targetValues);
  for (const [value, count] of needed) {
    if ((available.get(value) ?? 0) < count) return false;
  }
  return true;
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
