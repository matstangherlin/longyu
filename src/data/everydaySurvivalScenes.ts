import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.9B — one connected street chat.
 * Recall + transfer only. Mei reacts to what the student just said.
 */

type Interaction = {
  type: "choose_reply" | "choose_meaning" | "produce_reply" | "listen_reply";
  prompt: string;
  answer: string;
  pinyin: string;
  pt: string;
  spokenHanzi?: string;
  spokenPinyin?: string;
  spokenPt?: string;
  options?: string[];
  accepts?: string[];
  listenAudioText?: string;
  speechAct: ConversationSpeechAct;
  expectedResponseAct: ConversationSpeechAct;
  repairType: ConversationRepairType;
  repairHanzi: string;
  repairPinyin: string;
  repairPt: string;
  explanation?: string;
  decision?: boolean;
  validAnswers?: string[];
  nextByAnswer?: Record<string, string>;
  productionScaffold?: "first" | "transfer";
  capabilityId?: string;
  productionPattern?: string;
  productionHelpVocab?: { hanzi: string; pinyin?: string; meaningPt?: string }[];
  productionHelpBuildBank?: string[];
  productionHelpPiecePinyin?: Record<string, string>;
};

function npc(
  speakerId: "mei" | "wang",
  id: string,
  hanzi: string,
  pinyin: string,
  pt: string,
  next: Partial<ConversationNode> & { nextNodeId?: string; interaction?: ConversationNode["interaction"] } = {},
  emotion: ConversationEmotion = "happy"
): ConversationNode {
  return { id, speakerId, hanzi, pinyin, pt, emotion, ...next };
}

function lin(id: string, hanzi: string, pinyin: string, pt: string, nextNodeId?: string, emotion: ConversationEmotion = "happy"): ConversationNode {
  return { id, speakerId: "lin", hanzi, pinyin, pt, emotion, nextNodeId };
}

function interactionOf(turn: Interaction, answerId: string, wrongNextNodeId: string): ConversationNode["interaction"] {
  return {
    type: turn.type,
    prompt: turn.prompt,
    options: turn.options,
    correctAnswer: turn.answer,
    accepts: [turn.answer, ...(turn.accepts ?? [])],
    correctNextNodeId: answerId,
    wrongNextNodeId,
    explanation: turn.explanation,
    speechAct: turn.speechAct,
    expectedResponseAct: turn.expectedResponseAct,
    repairType: turn.repairType,
    listenAudioText: turn.listenAudioText,
    decision: turn.decision,
    validAnswers: turn.validAnswers,
    nextByAnswer: turn.nextByAnswer,
    productionScaffold: turn.productionScaffold,
    capabilityId: turn.capabilityId,
    productionPattern: turn.productionPattern,
    productionHelpVocab: turn.productionHelpVocab,
    productionHelpBuildBank: turn.productionHelpBuildBank,
    productionHelpPiecePinyin: turn.productionHelpPiecePinyin,
  };
}

function ask(
  speakerId: "mei" | "wang",
  id: string,
  question: { hanzi: string; pinyin: string; pt: string; audioText?: string },
  turn: Interaction,
  nextAfterAnswer?: string,
  reaction?: { hanzi: string; pinyin: string; pt: string; emotion?: ConversationEmotion }
): ConversationNode[] {
  const answerId = `${id}-answer`;
  const retryId = `${id}-retry`;
  const reactId = `${id}-react`;
  const afterAnswer = reaction ? reactId : nextAfterAnswer;
  const nodes: ConversationNode[] = [
    npc(speakerId, id, question.hanzi, question.pinyin, question.pt, {
      audioText: question.audioText,
      interaction: interactionOf(turn, answerId, retryId),
    }),
    npc(speakerId, retryId, turn.repairHanzi, turn.repairPinyin, turn.repairPt, { nextNodeId: id }, "thinking"),
    lin(answerId, turn.spokenHanzi ?? turn.answer, turn.spokenPinyin ?? turn.pinyin, turn.spokenPt ?? turn.pt, afterAnswer),
  ];
  if (reaction) {
    nodes.push(npc(speakerId, reactId, reaction.hanzi, reaction.pinyin, reaction.pt, nextAfterAnswer ? { nextNodeId: nextAfterAnswer } : {}));
  }
  return nodes;
}

export const CONVERSA_COTIDIANA_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:nihaoma",
  "chunk:wohenhao",
  "chunk:wobushufu",
  "chunk:nine",
  "chunk:woyeshi",
  "chunk:jintianhenleng",
  "chunk:mingtian",
  "chunk:mingtianjian",
  "chunk:zaijian",
  "chunk:qingzaishuoyibian",
  "chunk:qingmanyidian",
  "chunk:woyaogongzuo",
  "char:hao",
  "char:ni",
  "char:wo",
  "char:ma_question",
  "char:ming",
];

/**
 * Main path (14 falas, 6 intervenções):
 * 你好 → 你好吗 → 我很好。你呢？ → clima → 明天呢？ → reparo → 再见.
 * 我不舒服 fecha noutro terminal. 请慢一点 ≠ 请再说一遍.
 */
export const CONVERSA_COTIDIANA_NODES: ConversationNode[] = [
  npc("mei", "cot-open", "你好！", "nǐ hǎo!", "Olá!", { nextNodeId: "cot-hi" }),
  ...ask(
    "mei",
    "cot-hi",
    { hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!" },
    {
      type: "produce_reply",
      prompt: "Cumprimente Mei.",
      answer: "你好",
      pinyin: "nǐ hǎo",
      pt: "Olá.",
      accepts: ["你好。", "你好！", "你好!"],
      productionScaffold: "transfer",
      capabilityId: "nihao",
      productionPattern: "______",
      productionHelpBuildBank: ["你好"],
      productionHelpPiecePinyin: { 你好: "nǐ hǎo" },
      productionHelpVocab: [{ hanzi: "你好", pinyin: "nǐ hǎo", meaningPt: "olá" }],
      speechAct: "greet",
      expectedResponseAct: "greet",
      repairType: "clarify",
      repairHanzi: "你好？",
      repairPinyin: "nǐ hǎo?",
      repairPt: "Olá?",
      explanation: "Mei acabou de cumprimentar. 你好 devolve o cumprimento.",
    },
    "cot-how"
  ),
  npc("mei", "cot-how", "你好吗？", "nǐ hǎo ma?", "Tudo bem?", {
    interaction: {
      type: "produce_reply",
      prompt: "Responda como você está e devolva a pergunta.",
      correctAnswer: "我很好你呢",
      accepts: ["我很好你呢", "我很好。你呢？", "我很好你呢？", "我很好。你呢", "我很好 你呢"],
      correctNextNodeId: "cot-how-answer",
      wrongNextNodeId: "cot-how-retry",
      decision: true,
      validAnswers: ["我很好你呢", "我很好。你呢？", "我很好你呢？", "我很好", "我很好。", "我不舒服", "我不舒服。"],
      nextByAnswer: {
        "我很好你呢": "cot-how-answer",
        "我很好。你呢？": "cot-how-answer",
        "我很好你呢？": "cot-how-answer",
        "我很好": "cot-need-nine",
        "我很好。": "cot-need-nine",
        "我不舒服": "cot-unwell-say",
        "我不舒服。": "cot-unwell-say",
      },
      explanation: "我很好 fecha o bem-estar. 你呢 devolve a pergunta — não é um flashcard.",
      speechAct: "ask_wellbeing",
      expectedResponseAct: "tell_wellbeing",
      repairType: "reask",
      productionScaffold: "first",
      capabilityId: "wohenhao",
      productionPattern: "我很好。______",
      productionHelpBuildBank: ["我很好", "你呢", "我不舒服"],
      productionHelpPiecePinyin: { 我很好: "wǒ hěn hǎo", 你呢: "nǐ ne", 我不舒服: "wǒ bù shūfu" },
      productionHelpVocab: [
        { hanzi: "我很好", pinyin: "wǒ hěn hǎo", meaningPt: "estou bem" },
        { hanzi: "你呢", pinyin: "nǐ ne", meaningPt: "e você" },
        { hanzi: "我不舒服", pinyin: "wǒ bù shūfu", meaningPt: "não estou bem" },
      ],
    },
  }),
  npc("mei", "cot-how-retry", "好吗？", "hǎo ma?", "Tudo bem?", { nextNodeId: "cot-how" }, "thinking"),
  lin("cot-how-answer", "我很好。你呢？", "wǒ hěn hǎo. nǐ ne?", "Estou bem. E você?", "cot-fine"),
  npc("mei", "cot-need-nine", "我很好。", "wǒ hěn hǎo.", "Estou bem.", {
    interaction: {
      type: "produce_reply",
      prompt: "Mei falou de si. Devolva a pergunta.",
      correctAnswer: "你呢",
      accepts: ["你呢", "你呢？", "你呢?"],
      correctNextNodeId: "cot-nine-answer",
      wrongNextNodeId: "cot-need-nine-retry",
      explanation: "你呢 devolve a pergunta. Não traduzir — usar.",
      speechAct: "acknowledge",
      expectedResponseAct: "acknowledge",
      repairType: "reask",
      productionScaffold: "first",
      capabilityId: "nine",
      productionPattern: "______",
      productionHelpBuildBank: ["你呢"],
      productionHelpPiecePinyin: { 你呢: "nǐ ne" },
      productionHelpVocab: [{ hanzi: "你呢", pinyin: "nǐ ne", meaningPt: "e você" }],
    },
  }),
  npc("mei", "cot-need-nine-retry", "你呢？", "nǐ ne?", "E você?", { nextNodeId: "cot-need-nine" }, "thinking"),
  lin("cot-nine-answer", "你呢？", "nǐ ne?", "E você?", "cot-fine"),
  lin("cot-unwell-say", "我不舒服。", "wǒ bù shūfu.", "Não me sinto bem.", "cot-concern"),
  npc("mei", "cot-concern", "不舒服？", "bù shūfu?", "Indisposto?", {
    emotion: "thinking",
    nextNodeId: "cot-unwell-end",
  }),
  npc("mei", "cot-unwell-end", "好。明天见。", "hǎo. míngtiān jiàn.", "Certo. Até amanhã."),
  npc("mei", "cot-fine", "我也很好。今天很冷。", "wǒ yě hěn hǎo. jīntiān hěn lěng.", "Eu também estou bem. Hoje está frio.", {
    audioText: "今天很冷",
    interaction: {
      type: "listen_reply",
      prompt: "O que Mei comentou agora?",
      options: ["está frio", "está quente", "até amanhã", "está tudo bem"],
      correctAnswer: "está frio",
      listenAudioText: "今天很冷",
      correctNextNodeId: "cot-weather-ack",
      wrongNextNodeId: "cot-weather-retry",
      explanation: "今天很冷 comenta o dia. O hànzì não aparece no título.",
      speechAct: "acknowledge",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("mei", "cot-weather-retry", "今天很冷？", "jīntiān hěn lěng?", "Hoje está frio?", { nextNodeId: "cot-fine" }, "thinking"),
  lin("cot-weather-ack", "好。", "hǎo.", "Certo.", "cot-tomorrow"),
  npc("mei", "cot-tomorrow", "明天呢？", "míngtiān ne?", "E amanhã?", {
    interaction: {
      type: "produce_reply",
      prompt: "Combinem o amanhã.",
      correctAnswer: "明天见",
      accepts: ["明天见", "明天见。", "明天见!", "明天见！", "我要工作", "我要工作。"],
      correctNextNodeId: "cot-plan-answer",
      wrongNextNodeId: "cot-tomorrow-retry",
      decision: true,
      validAnswers: ["明天见", "明天见。", "明天见!", "明天见！", "我要工作", "我要工作。"],
      nextByAnswer: {
        "明天见": "cot-plan-answer",
        "明天见。": "cot-plan-answer",
        "明天见!": "cot-plan-answer",
        "明天见！": "cot-plan-answer",
        "我要工作": "cot-work-say",
        "我要工作。": "cot-work-say",
      },
      explanation: "明天见 combina o encontro. 我要工作 também é um plano já ensinado.",
      speechAct: "ask_when",
      expectedResponseAct: "tell_when",
      repairType: "confirm_time",
      productionScaffold: "transfer",
      capabilityId: "mingtianjian",
      productionPattern: "明天______",
      productionHelpBuildBank: ["明天见", "我要工作"],
      productionHelpPiecePinyin: { 明天见: "míngtiān jiàn", 我要工作: "wǒ yào gōngzuò" },
      productionHelpVocab: [
        { hanzi: "明天见", pinyin: "míngtiān jiàn", meaningPt: "até amanhã" },
        { hanzi: "我要工作", pinyin: "wǒ yào gōngzuò", meaningPt: "preciso trabalhar" },
      ],
    },
  }),
  npc("mei", "cot-tomorrow-retry", "明天？", "míngtiān?", "Amanhã?", { nextNodeId: "cot-tomorrow" }, "thinking"),
  lin("cot-plan-answer", "明天见。", "míngtiān jiàn.", "Até amanhã.", "cot-fast"),
  lin("cot-work-say", "我要工作。", "wǒ yào gōngzuò.", "Quero trabalhar.", "cot-work-react"),
  npc("mei", "cot-work-react", "明天？工作？", "míngtiān? gōngzuò?", "Amanhã? Trabalho?", {
    emotion: "thinking",
    nextNodeId: "cot-fast",
  }),
  npc("mei", "cot-fast", "好。明天见！", "hǎo. míngtiān jiàn!", "Certo. Até amanhã!", {
    audioText: "明天见",
    interaction: {
      type: "choose_reply",
      prompt: "Mei falou rápido. Peça para repetir ou para ir mais devagar — as duas mudam a conversa.",
      options: ["请再说一遍", "请慢一点"],
      correctAnswer: "请再说一遍",
      correctNextNodeId: "cot-repeat",
      wrongNextNodeId: "cot-fast-retry",
      decision: true,
      validAnswers: ["请再说一遍", "请慢一点"],
      nextByAnswer: { "请再说一遍": "cot-repeat", "请慢一点": "cot-slow-1" },
      explanation: "请再说一遍 pede a mesma fala. 请慢一点 pede em pedaços.",
      speechAct: "tell_when",
      expectedResponseAct: "ask_repeat",
      repairType: "repeat",
    },
  }),
  npc("mei", "cot-fast-retry", "明天？", "míngtiān?", "Amanhã?", { nextNodeId: "cot-fast" }, "thinking"),
  npc("mei", "cot-repeat", "明天见！", "míngtiān jiàn!", "Até amanhã!", {
    audioText: "明天见",
    nextNodeId: "cot-bye",
  }),
  npc("mei", "cot-slow-1", "明天。", "míngtiān.", "Amanhã.", { nextNodeId: "cot-slow-2" }),
  npc("mei", "cot-slow-2", "见。", "jiàn.", "Ver.", { nextNodeId: "cot-bye" }),
  ...ask(
    "mei",
    "cot-bye",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Encerre a conversa.",
      answer: "再见",
      pinyin: "zàijiàn",
      pt: "Até logo.",
      accepts: ["再见。", "再见！", "明天见", "明天见。"],
      productionScaffold: "transfer",
      capabilityId: "zaijian",
      productionPattern: "______",
      productionHelpBuildBank: ["再见", "明天见"],
      productionHelpPiecePinyin: { 再见: "zàijiàn", 明天见: "míngtiān jiàn" },
      productionHelpVocab: [
        { hanzi: "再见", pinyin: "zàijiàn", meaningPt: "até logo" },
        { hanzi: "明天见", pinyin: "míngtiān jiàn", meaningPt: "até amanhã" },
      ],
      speechAct: "farewell",
      expectedResponseAct: "farewell",
      repairType: "clarify",
      repairHanzi: "再见？",
      repairPinyin: "zàijiàn?",
      repairPt: "Até logo?",
      explanation: "再见 encerra. 明天见 também fecha se o plano já ficou combinado.",
    },
    undefined,
    { hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!" }
  ),
];
