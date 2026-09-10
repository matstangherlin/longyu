import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.8B hotel check-in: receptionist vs traveller.
 * Natural order: reservation → passport → nights → room number by ear → card → ask.
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

export const CHECKIN_HOTEL_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:woyouyuding",
  "chunk:zheshiwodehuzhao",
  "chunk:qinggeiwodehuzhao",
  "chunk:zhujiwan",
  "chunk:liangwan",
  "chunk:yiwan",
  "chunk:sanlingwu",
  "chunk:fangjian",
  "chunk:fangka",
  "chunk:huzhao",
  "chunk:wodefangjianzainali",
  "chunk:youwifima",
  "chunk:xishoujianzainali",
  "chunk:woxuyaobangzhu",
  "chunk:xiexie",
  "chunk:bukeqi",
  "chunk:zaijian",
  "char:hao",
  "char:you",
  "char:ni",
  "char:de",
  "char:shi",
  "char:zai",
  "char:na_that",
  "char:li_inside",
  "char:ma_question",
  "char:san",
  "char:wu",
];

/** Reception: reserve → passport → nights → hear room → card → ask where → Wi-Fi. */
export const CHECKIN_HOTEL_NODES: ConversationNode[] = [
  npc("hotel-greet", "你好。", "nǐ hǎo.", "Olá.", { nextNodeId: "hotel-reserve" }),
  ...ask(
    "hotel-reserve",
    { hanzi: "有预订吗？", pinyin: "yǒu yùdìng ma?", pt: "Tem reserva?" },
    {
      type: "produce_reply",
      prompt: "Você chegou com reserva. Informe isso, falando ou escrevendo, sem alternativas.",
      answer: "我有预订",
      pinyin: "wǒ yǒu yùdìng",
      pt: "Eu tenho reserva.",
      accepts: ["我有预订。", "有预订", "有预订。"],
      speechAct: "ask_reservation",
      expectedResponseAct: "confirm_reservation",
      repairType: "confirm_reservation",
      repairHanzi: "预订？",
      repairPinyin: "yùdìng?",
      repairPt: "Reserva?",
      explanation: "有预订吗？ pergunta pela reserva. 我有预订 responde; entregar o passaporte agora ainda não é a fala desta pergunta.",
    },
    "hotel-passport"
  ),
  ...ask(
    "hotel-passport",
    { hanzi: "请给我护照。", pinyin: "qǐng gěi wǒ hùzhào.", pt: "Por favor, me dê o passaporte." },
    {
      type: "produce_reply",
      prompt: "A recepção pediu o documento. Mostre o passaporte, sem alternativas.",
      answer: "这是我的护照",
      pinyin: "zhè shì wǒ de hùzhào",
      pt: "Este é o meu passaporte.",
      accepts: ["这是我的护照。", "护照", "护照。"],
      speechAct: "request_document",
      expectedResponseAct: "present_document",
      repairType: "confirm_document",
      repairHanzi: "护照？",
      repairPinyin: "hùzhào?",
      repairPt: "O passaporte?",
      explanation: "请给我护照。 pede o documento. 这是我的护照 entrega.",
    },
    "hotel-nights"
  ),
  ...ask(
    "hotel-nights",
    { hanzi: "住几晚？", pinyin: "zhù jǐ wǎn?", pt: "Quantas noites?" },
    {
      type: "choose_reply",
      prompt: "A recepcionista pergunta quantas noites. Você fica duas.",
      answer: "两晚",
      pinyin: "liǎng wǎn",
      pt: "Duas noites.",
      options: ["两晚", "一晚"],
      accepts: ["两晚。", "两晚"],
      speechAct: "ask_nights",
      expectedResponseAct: "tell_nights",
      repairType: "confirm_nights",
      repairHanzi: "两晚吗？",
      repairPinyin: "liǎng wǎn ma?",
      repairPt: "Duas noites?",
      explanation: "几晚 transfere 几 de 几点 / 几位. 两晚 = duas noites.",
    },
    "hotel-room"
  ),
  npc("hotel-room", "三零五。", "sān líng wǔ.", "Trezentos e cinco — falado dígito a dígito.", {
    audioText: "三零五",
    interaction: {
      type: "listen_reply",
      prompt: "Ouça o número do quarto. Qual número você ouviu?",
      options: ["205", "305", "508"],
      correctAnswer: "305",
      listenAudioText: "三零五",
      correctNextNodeId: "hotel-room-answer",
      wrongNextNodeId: "hotel-room-retry",
      explanation: "三零五 é 305 falado. O algarismo não aparece antes da resposta.",
      speechAct: "tell_room_number",
      expectedResponseAct: "acknowledge",
      repairType: "confirm_room",
    },
  }),
  npc("hotel-room-retry", "三零五吗？", "sān líng wǔ ma?", "Trezentos e cinco?", { nextNodeId: "hotel-room" }, "thinking"),
  lin("hotel-room-answer", "好。", "hǎo.", "Certo.", "hotel-card"),
  npc("hotel-card", "这是房卡。", "zhè shì fángkǎ.", "Este é o cartão do quarto.", {
    interaction: {
      type: "choose_meaning",
      prompt: "O que você recebeu?",
      options: ["O cartão do quarto", "O passaporte", "O cardápio", "A bagagem"],
      correctAnswer: "O cartão do quarto",
      correctNextNodeId: "hotel-card-answer",
      wrongNextNodeId: "hotel-card-retry",
      explanation: "房卡 abre o quarto. A imagem e a fala pedem a mesma leitura.",
      speechAct: "confirm_item",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("hotel-card-retry", "房卡？", "fángkǎ?", "O cartão do quarto?", { nextNodeId: "hotel-card" }, "thinking"),
  lin("hotel-card-answer", "好。", "hǎo.", "Certo.", "hotel-where"),
  ...ask(
    "hotel-where",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você não encontra o quarto. Pergunte onde ele fica, sem alternativas.",
      answer: "我的房间在哪里？",
      pinyin: "wǒ de fángjiān zài nǎlǐ?",
      pt: "Onde fica o meu quarto?",
      accepts: ["我的房间在哪里", "房间在哪里？", "房间在哪里"],
      speechAct: "acknowledge",
      expectedResponseAct: "ask_room_location",
      repairType: "confirm_room",
      repairHanzi: "房间？",
      repairPinyin: "fángjiān?",
      repairPt: "O quarto?",
      explanation: "我的房间在哪里？ localiza o quarto.",
    },
    "hotel-point"
  ),
  npc("hotel-point", "在那里。", "zài nàlǐ.", "Lá.", {
    interaction: {
      type: "choose_reply",
      prompt: "Pergunte uma necessidade simples: Wi-Fi ou banheiro. As duas servem.",
      options: ["有Wi-Fi吗？", "洗手间在哪里？"],
      correctAnswer: "有Wi-Fi吗？",
      correctNextNodeId: "hotel-wifi-answer",
      wrongNextNodeId: "hotel-need-retry",
      decision: true,
      validAnswers: ["有Wi-Fi吗？", "洗手间在哪里？"],
      nextByAnswer: { "有Wi-Fi吗？": "hotel-wifi-answer", "洗手间在哪里？": "hotel-bath-answer" },
      explanation: "有Wi-Fi吗？ e 洗手间在哪里？ são pedidos úteis já ensinados.",
      speechAct: "tell_location",
      expectedResponseAct: "ask_wifi",
      repairType: "clarify",
    },
  }),
  npc("hotel-need-retry", "Wi-Fi？", "Wài-Fài?", "Wi-Fi?", { nextNodeId: "hotel-point" }, "thinking"),
  lin("hotel-wifi-answer", "有Wi-Fi吗？", "yǒu Wài-Fài ma?", "Tem Wi-Fi?", "hotel-wifi-yes"),
  lin("hotel-bath-answer", "洗手间在哪里？", "xǐshǒujiān zài nǎlǐ?", "Onde fica o banheiro?", "hotel-bath-yes"),
  npc("hotel-wifi-yes", "有。", "yǒu.", "Tem.", {
    interaction: {
      type: "choose_reply",
      prompt: "A recepcionista confirmou. Encerre com educação.",
      options: ["谢谢", "再见"],
      correctAnswer: "谢谢",
      correctNextNodeId: "hotel-thanks",
      wrongNextNodeId: "hotel-awkward-1",
      explanation: "谢谢 fecha o check-in. 再见 sozinho apressa a saída.",
      speechAct: "acknowledge",
      expectedResponseAct: "thank",
      repairType: "clarify",
    },
  }),
  npc("hotel-bath-yes", "在那里。", "zài nàlǐ.", "Lá.", { nextNodeId: "hotel-wifi-yes" }),
  lin("hotel-thanks", "谢谢！", "xièxie!", "Obrigado!", "hotel-end"),
  npc("hotel-end", "不客气。", "bú kèqi.", "De nada."),
  lin("hotel-awkward-1", "再见。", "zàijiàn.", "Até logo.", "hotel-awkward-2", "confused"),
  npc("hotel-awkward-2", "好……再见。", "hǎo…… zàijiàn.", "Tudo bem... até logo.", {}, "thinking"),
];
