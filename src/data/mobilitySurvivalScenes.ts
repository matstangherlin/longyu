import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.8A mobility scenes: station + taxi.
 * Contextual repair, destination echo, valid street decisions, slower-chunk branch.
 */

type Interaction = {
  type: "choose_reply" | "choose_meaning" | "produce_reply";
  prompt: string;
  answer: string;
  pinyin: string;
  pt: string;
  spokenHanzi?: string;
  spokenPinyin?: string;
  spokenPt?: string;
  options?: string[];
  accepts?: string[];
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
    decision: turn.decision,
    validAnswers: turn.validAnswers,
    nextByAnswer: turn.nextByAnswer,
  };
}

function ask(
  id: string,
  question: { hanzi: string; pinyin: string; pt: string },
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

export const IMERSAO_ESTACAO_LEARNED_REFS = [
  "chunk:qingwen",
  "chunk:nihao",
  "chunk:qingzaishuoyibian",
  "chunk:qingmanyidian",
  "chunk:xiexie",
  "chunk:bukeqi",
  "chunk:zaijian",
  "chunk:woyao",
  "chunk:ditiezhanzainali",
  "chunk:piaoduoshaoqian",
  "chunk:yizhizou",
  "chunk:zuozhuan",
  "chunk:zuobian",
  "chunk:ruko",
  "char:shi10",
  "char:zuo_left",
  "char:ma_question",
];

export const IMERSAO_ESTACAO_NEW_REFS = [];

/** Station: ask where, follow a short route, read 入口, buy a ticket, close. */
export const IMERSAO_ESTACAO_NODES: ConversationNode[] = [
  npc("estacao-0", "你好！", "nǐ hǎo!", "Olá!", { nextNodeId: "estacao-1" }),
  ...ask(
    "estacao-1",
    { hanzi: "你好。", pinyin: "nǐ hǎo.", pt: "Olá." },
    {
      type: "produce_reply",
      prompt: "Pergunte onde fica a estação de metrô, falando ou escrevendo, sem alternativas.",
      answer: "地铁站在哪里？",
      pinyin: "dìtiězhàn zài nǎlǐ?",
      pt: "Onde fica a estação de metrô?",
      accepts: ["地铁站在哪里", "请问，地铁站在哪里？", "请问地铁站在哪里？", "火车站在哪里？", "火车站在哪里"],
      speechAct: "greet",
      expectedResponseAct: "ask_location",
      repairType: "reask",
      repairHanzi: "地铁站吗？",
      repairPinyin: "dìtiězhàn ma?",
      repairPt: "A estação de metrô?",
      explanation: "地铁站在哪里？ localiza a estação. 请问 cabe na frente.",
    },
    "estacao-fast"
  ),
  npc("estacao-fast", "一直走。左转。", "yìzhí zǒu. zuǒ zhuǎn.", "Siga em frente. Vire à esquerda.", {
    interaction: {
      type: "choose_reply",
      prompt: "A pessoa falou rápido. Peça para repetir ou para ir mais devagar — as duas ajudam.",
      options: ["请再说一遍", "请慢一点"],
      correctAnswer: "请再说一遍",
      correctNextNodeId: "estacao-repeat",
      wrongNextNodeId: "estacao-fast-retry",
      decision: true,
      validAnswers: ["请再说一遍", "请慢一点"],
      nextByAnswer: { 请再说一遍: "estacao-repeat", 请慢一点: "estacao-slow-1" },
      explanation: "请再说一遍 pede a mesma fala. 请慢一点 pede em pedaços.",
      speechAct: "tell_direction",
      expectedResponseAct: "ask_route",
      repairType: "repeat",
    },
  }),
  npc("estacao-fast-retry", "左边？", "zuǒbiān?", "À esquerda?", { nextNodeId: "estacao-fast" }, "thinking"),
  npc("estacao-repeat", "一直走。左转。", "yìzhí zǒu. zuǒ zhuǎn.", "Siga em frente. Vire à esquerda.", {
    nextNodeId: "estacao-thanks",
  }),
  npc("estacao-slow-1", "一直走。", "yìzhí zǒu.", "Siga em frente.", { nextNodeId: "estacao-slow-2" }),
  npc("estacao-slow-2", "左转。", "zuǒ zhuǎn.", "Vire à esquerda.", { nextNodeId: "estacao-slow-3" }),
  npc("estacao-slow-3", "好。", "hǎo.", "Certo.", { nextNodeId: "estacao-thanks" }),
  lin("estacao-thanks", "好，谢谢！", "hǎo, xièxie!", "Certo, obrigado!", "estacao-sign"),
  npc("estacao-sign", "好。", "hǎo.", "Certo.", {
    interaction: {
      type: "choose_reply",
      prompt: "Você saiu da rua e precisa entrar. Seguir a placa ou perguntar são os dois caminhos.",
      options: ["入口", "请问，入口在哪里？"],
      correctAnswer: "入口",
      correctNextNodeId: "estacao-in",
      wrongNextNodeId: "estacao-sign-retry",
      decision: true,
      validAnswers: ["入口", "请问，入口在哪里？"],
      nextByAnswer: { 入口: "estacao-in", "请问，入口在哪里？": "estacao-ask-in" },
      explanation: "入口 é a placa de entrar. Perguntar também chega.",
      speechAct: "tell_location",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("estacao-sign-retry", "入口？", "rùkǒu?", "A entrada?", { nextNodeId: "estacao-sign" }, "thinking"),
  lin("estacao-in", "入口。", "rùkǒu.", "Entrada.", "estacao-ticket"),
  lin("estacao-ask-in", "请问，入口在哪里？", "qǐng wèn, rùkǒu zài nǎlǐ?", "Com licença, onde fica a entrada?", "estacao-ticket"),
  ...ask(
    "estacao-ticket",
    { hanzi: "你好。", pinyin: "nǐ hǎo.", pt: "Olá." },
    {
      type: "produce_reply",
      prompt: "Na bilheteria, pergunte o preço da passagem, sem alternativas.",
      answer: "票多少钱？",
      pinyin: "piào duōshao qián?",
      pt: "Quanto custa a passagem?",
      accepts: ["票多少钱", "多少钱？", "多少钱"],
      speechAct: "greet",
      expectedResponseAct: "ask_price",
      repairType: "clarify",
      repairHanzi: "十？",
      repairPinyin: "shí?",
      repairPt: "Dez?",
      explanation: "票多少钱？ pergunta o preço do bilhete.",
    },
    "estacao-buy",
    { hanzi: "十。", pinyin: "shí.", pt: "Dez." }
  ),
  ...ask(
    "estacao-buy",
    { hanzi: "这个？", pinyin: "zhège?", pt: "Este?" },
    {
      type: "produce_reply",
      prompt: "Compre apontando, sem alternativas.",
      answer: "我要这个",
      pinyin: "wǒ yào zhège",
      pt: "Eu quero este.",
      accepts: ["我要这个。", "我要票", "我要票。"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "这个？",
      repairPinyin: "zhège?",
      repairPt: "Este?",
      explanation: "我要这个 fecha a compra apontando.",
    },
    "estacao-ticket-hand"
  ),
  npc("estacao-ticket-hand", "票。", "piào.", "A passagem.", {
    interaction: {
      type: "choose_reply",
      prompt: "Receba a passagem e encerre.",
      options: ["谢谢", "再见"],
      correctAnswer: "谢谢",
      correctNextNodeId: "estacao-end-thanks",
      wrongNextNodeId: "estacao-awkward-1",
      explanation: "谢谢 agradece; 再见 sozinho apressa a saída.",
      speechAct: "confirm_item",
      expectedResponseAct: "thank",
      repairType: "clarify",
    },
  }),
  lin("estacao-awkward-1", "再见。", "zàijiàn.", "Até logo.", "estacao-awkward-2", "confused"),
  npc("estacao-awkward-2", "好……再见。", "hǎo…… zàijiàn.", "Tudo bem... até logo.", {}, "thinking"),
  lin("estacao-end-thanks", "谢谢！", "xièxie!", "Obrigado!", "estacao-bye"),
  npc("estacao-bye", "不客气！再见！", "bú kèqi! zàijiàn!", "De nada! Até logo!", { nextNodeId: "estacao-end" }),
  lin("estacao-end", "再见！", "zàijiàn!", "Até logo!"),
];

export const PEGAR_TAXI_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:qunali",
  "chunk:woyaoqujiudian",
  "chunk:qubeijinglu",
  "chunk:zaizhelictingche",
  "chunk:xiexie",
  "char:hao",
  "char:ma_question",
];

/** Taxi: greet → destination → echo → stop. Hotel is a destination, not check-in. */
export const PEGAR_TAXI_NODES: ConversationNode[] = [
  ...ask(
    "taxi-1",
    { hanzi: "你好。去哪里？", pinyin: "nǐ hǎo. qù nǎlǐ?", pt: "Olá. Para onde?" },
    {
      type: "choose_reply",
      prompt: "Diga o destino. Hotel ou Beijing Road — os dois fecham a corrida.",
      answer: "我要去酒店",
      pinyin: "wǒ yào qù jiǔdiàn",
      pt: "Quero ir ao hotel.",
      options: ["我要去酒店", "去北京路"],
      accepts: ["我要去酒店。", "去酒店", "去酒店。", "去北京路", "去北京路。"],
      speechAct: "ask_location",
      expectedResponseAct: "state_destination",
      repairType: "clarify",
      repairHanzi: "酒店吗？",
      repairPinyin: "jiǔdiàn ma?",
      repairPt: "O hotel?",
      explanation: "我要去酒店 reusa 我要. 去北京路 transfere o mesmo frame para a rua.",
      decision: true,
      validAnswers: ["我要去酒店", "去北京路"],
      nextByAnswer: { 我要去酒店: "taxi-1-answer", 去北京路: "taxi-road" },
    },
    "taxi-hotel-echo"
  ),
  lin("taxi-road", "去北京路。", "qù Běijīng lù.", "Vá para a Beijing Road.", "taxi-road-echo"),
  npc("taxi-hotel-echo", "酒店，好。", "jiǔdiàn, hǎo.", "Hotel, certo.", { nextNodeId: "taxi-stop" }),
  npc("taxi-road-echo", "北京路，好。", "Běijīng lù, hǎo.", "Beijing Road, certo.", { nextNodeId: "taxi-stop" }),
  ...ask(
    "taxi-stop",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você chegou. Peça ao motorista para parar aqui, sem alternativas.",
      answer: "在这里停车",
      pinyin: "zài zhèlǐ tíngchē",
      pt: "Pare aqui.",
      accepts: ["在这里停车。", "在这里停车。谢谢", "在这里停车。谢谢！"],
      speechAct: "acknowledge",
      expectedResponseAct: "request_stop",
      repairType: "clarify",
      repairHanzi: "这里？",
      repairPinyin: "zhèlǐ?",
      repairPt: "Aqui?",
      explanation: "在这里停车 pede a parada. Não é hora de 你好吗.",
    },
    "taxi-end",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." }
  ),
  lin("taxi-end", "谢谢！", "xièxie!", "Obrigado!"),
];
