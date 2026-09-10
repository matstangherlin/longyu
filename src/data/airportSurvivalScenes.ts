import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.8B inside-airport scene.
 * Already at the airport. Staff asks for the document, then the traveller finds the gate.
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
  id: string,
  hanzi: string,
  pinyin: string,
  pt: string,
  next: Partial<ConversationNode> & { nextNodeId?: string; interaction?: ConversationNode["interaction"] } = {},
  emotion: ConversationEmotion = "happy"
): ConversationNode {
  return { id, speakerId: "wang", hanzi, pinyin, pt, emotion, ...next };
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
    npc(id, question.hanzi, question.pinyin, question.pt, {
      audioText: question.audioText,
      interaction: interactionOf(turn, answerId, retryId),
    }),
    npc(retryId, turn.repairHanzi, turn.repairPinyin, turn.repairPt, { nextNodeId: id }, "thinking"),
    lin(answerId, turn.spokenHanzi ?? turn.answer, turn.spokenPinyin ?? turn.pinyin, turn.spokenPt ?? turn.pt, afterAnswer),
  ];
  if (reaction) {
    nodes.push(npc(reactId, reaction.hanzi, reaction.pinyin, reaction.pt, nextAfterAnswer ? { nextNodeId: nextAfterAnswer } : {}));
  }
  return nodes;
}

export const NO_AEROPORTO_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:huzhao",
  "chunk:zheshiwodehuzhao",
  "chunk:dengjikou",
  "chunk:dengjikouzainali",
  "chunk:qingzaishuoyibian",
  "chunk:qingmanyidian",
  "chunk:woxuyaobangzhu",
  "chunk:xiexie",
  "chunk:bukeqi",
  "chunk:zaijian",
  "chunk:chuko",
  "chunk:yizhizou",
  "char:hao",
  "char:zai",
  "char:na_that",
  "char:li_inside",
  "char:zhe",
  "char:shi",
  "char:ma_question",
  "char:shi10",
  "char:ba8",
  "char:hao_number",
  "char:kou",
];

/** Inside the airport: document → ask gate → hear 18 → repair → arrive. */
export const NO_AEROPORTO_NODES: ConversationNode[] = [
  npc("aero-greet", "你好。", "nǐ hǎo.", "Olá.", { nextNodeId: "aero-passport" }),
  ...ask(
    "aero-passport",
    { hanzi: "护照。", pinyin: "hùzhào.", pt: "O passaporte." },
    {
      type: "produce_reply",
      prompt: "O funcionário pediu o documento. Mostre o passaporte.",
      answer: "这是我的护照",
      pinyin: "zhè shì wǒ de hùzhào",
      pt: "Este é o meu passaporte.",
      accepts: ["这是我的护照。", "护照", "护照。"],
      productionScaffold: "transfer",
      capabilityId: "zheshiwodehuzhao",
      productionPattern: "这是我的 ______",
      productionHelpBuildBank: ["这是", "我的", "护照", "房间"],
      productionHelpPiecePinyin: { 这是: "zhè shì", 我的: "wǒ de", 护照: "hùzhào", 房间: "fángjiān" },
      productionHelpVocab: [
        { hanzi: "这是", pinyin: "zhè shì", meaningPt: "isto é" },
        { hanzi: "我的", pinyin: "wǒ de", meaningPt: "meu" },
        { hanzi: "护照", pinyin: "hùzhào", meaningPt: "passaporte" },
      ],
      speechAct: "request_document",
      expectedResponseAct: "present_document",
      repairType: "confirm_document",
      repairHanzi: "护照？",
      repairPinyin: "hùzhào?",
      repairPt: "O passaporte?",
      explanation: "这是我的护照 transfere o documento do hotel para o aeroporto.",
    },
    "aero-ok"
  ),
  npc("aero-ok", "好。", "hǎo.", "Certo.", { nextNodeId: "aero-gate" }),
  ...ask(
    "aero-gate",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você precisa do portão. Pergunte onde fica o portão de embarque.",
      answer: "登机口在哪里？",
      pinyin: "dēngjīkǒu zài nǎlǐ?",
      pt: "Onde fica o portão de embarque?",
      accepts: ["登机口在哪里", "登机口呢？", "登机口呢"],
      productionScaffold: "first",
      capabilityId: "dengjikouzainali",
      productionPattern: "______ 在哪里？",
      productionHelpBuildBank: ["登机口", "在哪里", "房卡"],
      productionHelpPiecePinyin: { 登机口: "dēngjīkǒu", 在哪里: "zài nǎlǐ", 房卡: "fángkǎ" },
      productionHelpVocab: [
        { hanzi: "登机口", pinyin: "dēngjīkǒu", meaningPt: "portão de embarque" },
        { hanzi: "在哪里", pinyin: "zài nǎlǐ", meaningPt: "onde" },
      ],
      speechAct: "acknowledge",
      expectedResponseAct: "ask_gate",
      repairType: "confirm_gate",
      repairHanzi: "登机口？",
      repairPinyin: "dēngjīkǒu?",
      repairPt: "O portão?",
      explanation: "登机口在哪里？ acha o portão. O funcionário não pergunta isso a você.",
    },
    "aero-fast"
  ),
  npc("aero-fast", "十八号登机口。", "shí bā hào dēngjīkǒu.", "Portão de embarque número 18.", {
    audioText: "十八号登机口",
    interaction: {
      type: "choose_reply",
      prompt: "A fala foi rápida. Peça para repetir ou para ir mais devagar — as duas mudam a conversa.",
      options: ["请再说一遍", "请慢一点"],
      correctAnswer: "请再说一遍",
      correctNextNodeId: "aero-repeat",
      wrongNextNodeId: "aero-fast-retry",
      decision: true,
      validAnswers: ["请再说一遍", "请慢一点"],
      nextByAnswer: { 请再说一遍: "aero-repeat", 请慢一点: "aero-slow-1" },
      explanation: "请再说一遍 pede a mesma fala. 请慢一点 pede em pedaços.",
      speechAct: "tell_gate",
      expectedResponseAct: "ask_repeat",
      repairType: "repeat",
    },
  }),
  npc("aero-fast-retry", "十八？", "shí bā?", "Dezoito?", { nextNodeId: "aero-fast" }, "thinking"),
  npc("aero-repeat", "十八号登机口。", "shí bā hào dēngjīkǒu.", "Portão de embarque número 18.", {
    audioText: "十八号登机口",
    nextNodeId: "aero-number",
  }),
  npc("aero-slow-1", "十八。", "shí bā.", "Dezoito.", { nextNodeId: "aero-slow-2" }),
  npc("aero-slow-2", "登机口。", "dēngjīkǒu.", "Portão de embarque.", { nextNodeId: "aero-number" }),
  npc("aero-number", "好。", "hǎo.", "Certo.", {
    interaction: {
      type: "listen_reply",
      prompt: "Qual é o número do portão?",
      options: ["8", "10", "18", "28"],
      correctAnswer: "18",
      listenAudioText: "十八号登机口",
      correctNextNodeId: "aero-number-answer",
      wrongNextNodeId: "aero-number-retry",
      explanation: "十八号登机口 = portão 18. O número não aparece no título.",
      speechAct: "tell_gate",
      expectedResponseAct: "acknowledge",
      repairType: "confirm_gate",
    },
  }),
  npc("aero-number-retry", "十八吗？", "shí bā ma?", "Dezoito?", { nextNodeId: "aero-number" }, "thinking"),
  lin("aero-number-answer", "好。", "hǎo.", "Certo.", "aero-sign"),
  npc("aero-sign", "好。", "hǎo.", "Certo.", {
    interaction: {
      type: "choose_reply",
      prompt: "Qual placa você procura para o embarque?",
      options: ["登机口", "出口"],
      correctAnswer: "登机口",
      correctNextNodeId: "aero-sign-answer",
      wrongNextNodeId: "aero-sign-retry",
      explanation: "登机口 é o portão. 出口 é saída.",
      speechAct: "tell_location",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("aero-sign-retry", "登机口？", "dēngjīkǒu?", "O portão?", { nextNodeId: "aero-sign" }, "thinking"),
  lin("aero-sign-answer", "登机口。", "dēngjīkǒu.", "Portão de embarque.", "aero-dir"),
  npc("aero-dir", "一直走。在那里。", "yìzhí zǒu. zài nàlǐ.", "Siga em frente. Lá.", {
    interaction: {
      type: "choose_meaning",
      prompt: "O que o funcionário disse?",
      options: ["Siga em frente. Fica lá.", "Vire à esquerda.", "Pare aqui.", "Volte para o hotel."],
      correctAnswer: "Siga em frente. Fica lá.",
      correctNextNodeId: "aero-dir-answer",
      wrongNextNodeId: "aero-dir-retry",
      explanation: "一直走 é seguir em frente. 在那里 aponta o lugar.",
      speechAct: "tell_direction",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("aero-dir-retry", "那里？", "nàlǐ?", "Lá?", { nextNodeId: "aero-dir" }, "thinking"),
  lin("aero-dir-answer", "好。", "hǎo.", "Certo.", "aero-close"),
  npc("aero-close", "好。", "hǎo.", "Certo.", {
    interaction: {
      type: "choose_reply",
      prompt: "Você chegou ao portão. Agradeça ou peça ajuda se ainda precisar.",
      options: ["谢谢", "我需要帮助", "再见"],
      correctAnswer: "谢谢",
      correctNextNodeId: "aero-thanks",
      wrongNextNodeId: "aero-awkward-1",
      decision: true,
      validAnswers: ["谢谢", "我需要帮助"],
      nextByAnswer: { 谢谢: "aero-thanks", 我需要帮助: "aero-help" },
      explanation: "谢谢 fecha. 我需要帮助 pede ajuda e o funcionário ainda aponta o portão.",
      speechAct: "acknowledge",
      expectedResponseAct: "thank",
      repairType: "clarify",
    },
  }),
  lin("aero-thanks", "谢谢！", "xièxie!", "Obrigado!", "aero-end"),
  lin("aero-help", "我需要帮助。", "wǒ xūyào bāngzhù.", "Preciso de ajuda.", "aero-help-react"),
  npc("aero-help-react", "十八号登机口。在那里。", "shí bā hào dēngjīkǒu. zài nàlǐ.", "Portão 18. Lá.", {
    nextNodeId: "aero-end",
  }),
  npc("aero-end", "不客气。", "bú kèqi.", "De nada."),
  lin("aero-awkward-1", "再见。", "zàijiàn.", "Até logo.", "aero-awkward-2", "confused"),
  npc("aero-awkward-2", "好……再见。", "hǎo…… zàijiàn.", "Tudo bem... até logo.", {}, "thinking"),
];
