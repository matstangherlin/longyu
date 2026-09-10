import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.7B shopping survival scenes.
 * Valid decisions (accept / bargain / decline), contextual repair, NPC echo.
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

export const CONVERSA_NA_LOJA_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:woyao",
  "chunk:duoshaoqian",
  "chunk:zheshishenme",
  "chunk:taiguile",
  "chunk:buyaole",
  "chunk:xiexie",
  "chunk:zaijian",
  "chunk:bukeqi",
  "char:shi10",
  "char:bu",
  "char:hao",
  "char:ma_question",
];

/** Variant C: tagged-price shop. Haggling is allowed language, not the only path. */
export const CONVERSA_NA_LOJA_NODES: ConversationNode[] = [
  ...ask(
    "loja-1",
    { hanzi: "你好。你要什么？", pinyin: "nǐ hǎo. nǐ yào shénme?", pt: "Olá. O que você quer?" },
    {
      type: "choose_reply",
      prompt: "Aponte o item. Diga que quer este.",
      answer: "我要这个",
      pinyin: "wǒ yào zhège",
      pt: "Eu quero este.",
      options: ["我要这个", "再见", "你好吗", "太贵了"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "这个吗？",
      repairPinyin: "zhège ma?",
      repairPt: "Este?",
      explanation: "我要这个 aponta o item. Não precisa perguntar se o vendedor está bem.",
    },
    "loja-2",
    { hanzi: "这个？好。十。", pinyin: "zhège? hǎo. shí.", pt: "Este? Certo. Dez." }
  ),
  npc("loja-2", "十。", "shí.", "Dez.", {
    interaction: {
      type: "choose_meaning",
      prompt: "Quanto o vendedor cobrou?",
      options: ["10", "18", "28", "50"],
      correctAnswer: "10",
      correctNextNodeId: "loja-3",
      wrongNextNodeId: "loja-2-retry",
      explanation: "十 = dez.",
      speechAct: "tell_price",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("loja-2-retry", "多少钱？十。", "duōshao qián? shí.", "Quanto custa? Dez.", { nextNodeId: "loja-2" }, "thinking"),
  npc("loja-3", "要吗？", "yào ma?", "Você quer?", {
    interaction: {
      type: "choose_reply",
      prompt: "O preço está na etiqueta. Aceitar, achar caro ou desistir são decisões reais — nenhuma é «erro».",
      options: ["好", "太贵了", "不要了"],
      correctAnswer: "好",
      correctNextNodeId: "loja-accept",
      wrongNextNodeId: "loja-3-retry",
      decision: true,
      validAnswers: ["好", "太贵了", "不要了"],
      nextByAnswer: { 好: "loja-accept", 太贵了: "loja-bargain", 不要了: "loja-decline" },
      explanation: "Em loja de rede o preço marcado é o caminho usual. 太贵了 ainda é chinês válido — o vendedor pode não baixar.",
      speechAct: "ask_order",
      expectedResponseAct: "accept_offer",
      repairType: "clarify",
    },
  }),
  npc("loja-3-retry", "要吗？", "yào ma?", "Você quer?", { nextNodeId: "loja-3" }, "thinking"),
  lin("loja-accept", "好。", "hǎo.", "Está bem.", "loja-pay"),
  lin("loja-bargain", "太贵了。", "tài guì le.", "Caro demais.", "loja-fixed"),
  npc("loja-fixed", "不。十。", "bù. shí.", "Não. Dez.", { nextNodeId: "loja-pay" }, "thinking"),
  lin("loja-decline", "不要了。", "bú yào le.", "Não quero mais.", "loja-decline-end"),
  npc("loja-decline-end", "好。再见！", "hǎo. zàijiàn!", "Certo. Até logo!"),
  npc("loja-pay", "好。谢谢！", "hǎo. xièxie!", "Certo. Obrigado!", { nextNodeId: "loja-bye" }),
  lin("loja-bye", "谢谢！再见！", "xièxie! zàijiàn!", "Obrigado! Até logo!", "loja-end"),
  npc("loja-end", "不客气！再见！", "bú kèqi! zàijiàn!", "De nada! Até logo!"),
];

export const COMPRAR_ITENS_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:woyaozheshuangxie",
  "chunk:duoshaoqian",
  "chunk:zheshishenme",
  "chunk:keyishuaka",
  "chunk:xianjinkeyima",
  "chunk:weixinzhifu",
  "chunk:xiexie",
  "chunk:zaijian",
  "chunk:woyao",
  "char:er",
  "char:shi10",
  "char:ba8",
  "char:hao",
  "char:ma_question",
];

/** Variant A: acceptable tagged price, then card. Transfer 我要这双鞋. */
export const COMPRAR_ITENS_NODES: ConversationNode[] = [
  ...ask(
    "comprar-1",
    { hanzi: "你好。你要什么？", pinyin: "nǐ hǎo. nǐ yào shénme?", pt: "Olá. O que você quer?" },
    {
      type: "choose_reply",
      prompt: "Você quer os sapatos. Mesmo frame 我要 + item.",
      answer: "我要这双鞋",
      pinyin: "wǒ yào zhè shuāng xié",
      pt: "Quero estes sapatos.",
      options: ["我要这双鞋", "我要这个", "再见", "你好吗"],
      accepts: ["我要这个"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "这个吗？",
      repairPinyin: "zhège ma?",
      repairPt: "Este?",
      explanation: "我要这双鞋 transfere o frame 我要 para outro objeto.",
    },
    "comprar-2",
    { hanzi: "这个？好。", pinyin: "zhège? hǎo.", pt: "Este? Certo." }
  ),
  ...ask(
    "comprar-2",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Pergunte o preço, falando ou escrevendo, sem alternativas.",
      answer: "多少钱？",
      pinyin: "duōshao qián?",
      pt: "Quanto custa?",
      accepts: ["多少钱", "这个多少钱？", "这个多少钱"],
      speechAct: "confirm_item",
      expectedResponseAct: "ask_price",
      repairType: "clarify",
      repairHanzi: "多少钱？",
      repairPinyin: "duōshao qián?",
      repairPt: "Quanto custa?",
      explanation: "多少钱？ pergunta o preço.",
    },
    "comprar-3"
  ),
  npc("comprar-3", "二十八。", "èrshíbā.", "Vinte e oito.", {
    interaction: {
      type: "choose_meaning",
      prompt: "Quanto o vendedor cobrou?",
      options: ["28", "18", "10", "50"],
      correctAnswer: "28",
      correctNextNodeId: "comprar-4",
      wrongNextNodeId: "comprar-3-retry",
      explanation: "二十八 = 28.",
      speechAct: "tell_price",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("comprar-3-retry", "多少钱？二十八。", "duōshao qián? èrshíbā.", "Quanto custa? Vinte e oito.", { nextNodeId: "comprar-3" }, "thinking"),
  npc("comprar-4", "要吗？", "yào ma?", "Você quer?", {
    interaction: {
      type: "choose_reply",
      prompt: "O preço cabe. Aceite.",
      options: ["好", "不要了", "再见", "你好吗"],
      correctAnswer: "好",
      correctNextNodeId: "comprar-4-answer",
      wrongNextNodeId: "comprar-4-retry",
      explanation: "好 aceita o preço.",
      speechAct: "ask_order",
      expectedResponseAct: "accept_offer",
      repairType: "clarify",
    },
  }),
  npc("comprar-4-retry", "好吗？", "hǎo ma?", "Está bem?", { nextNodeId: "comprar-4" }, "thinking"),
  lin("comprar-4-answer", "好。", "hǎo.", "Está bem.", "comprar-5"),
  npc("comprar-5", "微信支付？", "Wēixìn zhīfù?", "WeChat Pay?", {
    interaction: {
      type: "choose_reply",
      prompt: "Você prefere cartão. Pergunte.",
      options: ["可以刷卡吗？", "现金可以吗？", "再见", "太贵了"],
      correctAnswer: "可以刷卡吗？",
      correctNextNodeId: "comprar-5-answer",
      wrongNextNodeId: "comprar-5-retry",
      decision: true,
      validAnswers: ["可以刷卡吗？", "现金可以吗？"],
      nextByAnswer: { "可以刷卡吗？": "comprar-5-answer", "现金可以吗？": "comprar-5-cash" },
      explanation: "可以刷卡吗？ pergunta por cartão. 现金可以吗？ pergunta por dinheiro. Nenhuma marca é a única opção.",
      speechAct: "ask_payment",
      expectedResponseAct: "ask_card",
      repairType: "clarify",
    },
  }),
  npc("comprar-5-retry", "现金吗？", "xiànjīn ma?", "Dinheiro?", { nextNodeId: "comprar-5" }, "thinking"),
  lin("comprar-5-answer", "可以刷卡吗？", "kěyǐ shuākǎ ma?", "Posso pagar com cartão?", "comprar-6"),
  lin("comprar-5-cash", "现金可以吗？", "xiànjīn kěyǐ ma?", "Dinheiro pode?", "comprar-6"),
  npc("comprar-6", "好。", "hǎo.", "Certo.", { nextNodeId: "comprar-7" }),
  lin("comprar-7", "谢谢！再见！", "xièxie! zàijiàn!", "Obrigado! Até logo!"),
];

export const IMERSAO_MERCADO_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:woyao",
  "chunk:duoshaoqian",
  "chunk:zheshishenme",
  "chunk:taiguile",
  "chunk:pianyiyidian",
  "chunk:buyaole",
  "chunk:keyishuaka",
  "chunk:xianjinkeyima",
  "chunk:weixinzhifu",
  "chunk:woyaoliangge",
  "chunk:xiexie",
  "chunk:zaijian",
  "chunk:bukeqi",
  "char:er",
  "char:shi10",
  "char:ba8",
  "char:hao",
  "char:ma_question",
];

/**
 * Master shopping mission. Main path bargains, then pays.
 * Accept and decline are valid sibling endings — not quiz errors.
 */
export const IMERSAO_MERCADO_NODES: ConversationNode[] = [
  ...ask(
    "mercado-1",
    { hanzi: "你好。你要什么？", pinyin: "nǐ hǎo. nǐ yào shénme?", pt: "Olá. O que você quer?" },
    {
      type: "choose_reply",
      prompt: "Aponte o item. Diga que quer este.",
      answer: "我要这个",
      pinyin: "wǒ yào zhège",
      pt: "Eu quero este.",
      options: ["我要这个", "再见", "你好吗", "我很好"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "这个吗？",
      repairPinyin: "zhège ma?",
      repairPt: "Este?",
      explanation: "我要这个 identifica o produto. Uma loja curta não exige 你好吗？",
    },
    "mercado-2",
    { hanzi: "这个？好。", pinyin: "zhège? hǎo.", pt: "Este? Certo." }
  ),
  ...ask(
    "mercado-2",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Pergunte o preço. Fale ou escreva, sem alternativas.",
      answer: "多少钱？",
      pinyin: "duōshao qián?",
      pt: "Quanto custa?",
      accepts: ["多少钱", "这个多少钱？", "这个多少钱"],
      speechAct: "confirm_item",
      expectedResponseAct: "ask_price",
      repairType: "clarify",
      repairHanzi: "多少钱？",
      repairPinyin: "duōshao qián?",
      repairPt: "Quanto custa?",
      explanation: "多少钱？ pergunta o preço.",
    },
    "mercado-3"
  ),
  npc("mercado-3", "二十八。", "èrshíbā.", "Vinte e oito.", {
    interaction: {
      type: "choose_meaning",
      prompt: "Quanto o vendedor cobrou?",
      options: ["28", "18", "10", "50"],
      correctAnswer: "28",
      correctNextNodeId: "mercado-4",
      wrongNextNodeId: "mercado-3-retry",
      explanation: "二十八 = 28. Entender o número é parte da compra.",
      speechAct: "tell_price",
      expectedResponseAct: "acknowledge",
      repairType: "clarify",
    },
  }),
  npc("mercado-3-retry", "多少钱？二十八。", "duōshao qián? èrshíbā.", "Quanto custa? Vinte e oito.", { nextNodeId: "mercado-3" }, "thinking"),
  npc("mercado-4", "二十八。要吗？", "èrshíbā. yào ma?", "Vinte e oito. Você quer?", {
    interaction: {
      type: "choose_reply",
      prompt: "Banca com preço falado. Aceitar, negociar ou desistir são decisões reais.",
      options: ["好", "太贵了", "不要了"],
      correctAnswer: "太贵了",
      correctNextNodeId: "mercado-bargain",
      wrongNextNodeId: "mercado-4-retry",
      decision: true,
      validAnswers: ["好", "太贵了", "不要了"],
      nextByAnswer: { 好: "mercado-accept", 太贵了: "mercado-bargain", 不要了: "mercado-decline" },
      explanation: "好 aceita. 太贵了 abre negociação nesta banca. 不要了 desiste — o mesmo 不要了 do restaurante.",
      speechAct: "ask_order",
      expectedResponseAct: "refuse_offer",
      repairType: "clarify",
    },
  }),
  npc("mercado-4-retry", "要吗？", "yào ma?", "Você quer?", { nextNodeId: "mercado-4" }, "thinking"),
  lin("mercado-accept", "好。", "hǎo.", "Está bem.", "mercado-qty"),
  lin("mercado-bargain", "太贵了。", "tài guì le.", "Caro demais.", "mercado-5"),
  lin("mercado-decline", "不要了。", "bú yào le.", "Não quero mais.", "mercado-decline-bye"),
  npc("mercado-decline-bye", "好。再见！", "hǎo. zàijiàn!", "Certo. Até logo!"),
  ...ask(
    "mercado-5",
    { hanzi: "太贵了？", pinyin: "tài guì le?", pt: "Caro demais?" },
    {
      type: "produce_reply",
      prompt: "Peça um pouco mais barato. Fale ou escreva.",
      answer: "便宜一点",
      pinyin: "piányi yìdiǎn",
      pt: "Um pouco mais barato.",
      accepts: ["便宜一点", "便宜一点。"],
      speechAct: "confirm_price",
      expectedResponseAct: "request_discount",
      repairType: "clarify",
      repairHanzi: "便宜一点？",
      repairPinyin: "piányi yìdiǎn?",
      repairPt: "Um pouco mais barato?",
      explanation: "便宜一点 pede redução. Uma forma só.",
    },
    "mercado-6"
  ),
  npc("mercado-6", "好，十八。", "hǎo, shíbā.", "Certo, dezoito.", { nextNodeId: "mercado-qty" }),
  npc("mercado-qty", "我要两个？", "wǒ yào liǎng ge?", "Quero dois?", {
    interaction: {
      type: "choose_reply",
      prompt: "Confirme a quantidade: dois.",
      options: ["我要两个", "我要这个", "再见", "太贵了"],
      correctAnswer: "我要两个",
      correctNextNodeId: "mercado-qty-answer",
      wrongNextNodeId: "mercado-qty-retry",
      explanation: "我要两个 reusa número + 我要. Sem tabela de classificadores.",
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "confirm_quantity",
    },
  }),
  npc("mercado-qty-retry", "我要两个？", "wǒ yào liǎng ge?", "Quero dois?", { nextNodeId: "mercado-qty" }, "thinking"),
  lin("mercado-qty-answer", "我要两个。", "wǒ yào liǎng ge.", "Quero dois.", "mercado-qty-echo"),
  npc("mercado-qty-echo", "我要两个，好。", "wǒ yào liǎng ge, hǎo.", "Dois, certo.", { nextNodeId: "mercado-pay" }),
  npc("mercado-pay", "微信支付？", "Wēixìn zhīfù?", "WeChat Pay?", {
    interaction: {
      type: "choose_reply",
      prompt: "O caixa pergunta o método. Cartão e dinheiro continuam perguntas úteis.",
      options: ["可以刷卡吗？", "现金可以吗？", "再见", "太贵了"],
      correctAnswer: "可以刷卡吗？",
      correctNextNodeId: "mercado-pay-card",
      wrongNextNodeId: "mercado-pay-retry",
      decision: true,
      validAnswers: ["可以刷卡吗？", "现金可以吗？"],
      nextByAnswer: { "可以刷卡吗？": "mercado-pay-card", "现金可以吗？": "mercado-pay-cash" },
      explanation: "Reconhecer o QR não obriga a produzir o nome do app. Perguntar cartão ou 现金 é a língua mínima.",
      speechAct: "ask_payment",
      expectedResponseAct: "ask_card",
      repairType: "clarify",
    },
  }),
  npc("mercado-pay-retry", "现金吗？", "xiànjīn ma?", "Dinheiro?", { nextNodeId: "mercado-pay" }, "thinking"),
  lin("mercado-pay-card", "可以刷卡吗？", "kěyǐ shuākǎ ma?", "Posso pagar com cartão?", "mercado-pay-ok"),
  lin("mercado-pay-cash", "现金可以吗？", "xiànjīn kěyǐ ma?", "Dinheiro pode?", "mercado-pay-ok"),
  npc("mercado-pay-ok", "好。", "hǎo.", "Certo.", { nextNodeId: "mercado-thanks" }),
  ...ask(
    "mercado-thanks",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "choose_reply",
      prompt: "Agradeça e feche a compra.",
      answer: "谢谢",
      pinyin: "xièxie",
      pt: "Obrigado.",
      options: ["谢谢", "太贵了", "你好吗", "再见"],
      accepts: ["谢谢。", "谢谢！"],
      speechAct: "thank",
      expectedResponseAct: "acknowledge_thanks",
      repairType: "clarify",
      repairHanzi: "谢谢。",
      repairPinyin: "xièxie.",
      repairPt: "Obrigado.",
      explanation: "谢谢 fecha a compra.",
    },
    undefined,
    { hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!" }
  ),
];
