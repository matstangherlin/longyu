import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.7A restaurant survival scenes.
 * Speech-act pairs, contextual repair, NPC echo, and two immersion endings.
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

/** Choice whose "wrong" option is a live second path, not a retry loop. */
function branchChoice(
  id: string,
  question: { hanzi: string; pinyin: string; pt: string },
  turn: Interaction,
  nextAfterAnswer: string,
  wrongNextNodeId: string,
  reaction?: { hanzi: string; pinyin: string; pt: string }
): ConversationNode[] {
  const answerId = `${id}-answer`;
  const reactId = `${id}-react`;
  const afterAnswer = reaction ? reactId : nextAfterAnswer;
  const nodes: ConversationNode[] = [
    npc(id, question.hanzi, question.pinyin, question.pt, {
      interaction: interactionOf(turn, answerId, wrongNextNodeId),
    }),
    lin(answerId, turn.spokenHanzi ?? turn.answer, turn.spokenPinyin ?? turn.pinyin, turn.spokenPt ?? turn.pt, afterAnswer),
  ];
  if (reaction) {
    nodes.push(npc(reactId, reaction.hanzi, reaction.pinyin, reaction.pt, { nextNodeId: nextAfterAnswer }));
  }
  return nodes;
}

export const PEDIR_CARDAPIO_LEARNED_REFS = [
  "chunk:qingwenjiwei",
  "chunk:yiwei",
  "chunk:liangwei",
  "chunk:qingzuo",
  "chunk:woyaocaidan",
  "chunk:caidan",
  "chunk:woyaomifan",
  "chunk:woyaocai",
  "chunk:woyaoyibeicha",
  "chunk:buyaole",
  "chunk:maidan",
  "chunk:nihao",
  "chunk:zaijian",
  "chunk:haode",
  "chunk:wohenhao",
  "chunk:zheshishenme",
  "char:wei_person",
  "char:yi",
  "char:cai_dish",
  "char:fan_rice",
  "char:yao",
  "char:hao",
  "char:cha_tea",
  "char:ma_question",
];

/** module_review: 14 lines / 5 interventions. */
export const PEDIR_CARDAPIO_NODES: ConversationNode[] = [
  ...ask(
    "cardapio-2",
    { hanzi: "你好，请问几位？", pinyin: "nǐ hǎo, qǐng wèn jǐ wèi?", pt: "Olá, com licença, quantas pessoas?" },
    {
      type: "choose_reply",
      prompt: "Vocês são duas pessoas. Responda ao funcionário.",
      answer: "两位",
      pinyin: "liǎng wèi",
      pt: "Duas pessoas.",
      options: ["两位", "一位", "买单", "我很好"],
      accepts: ["两个人"],
      speechAct: "ask_party_size",
      expectedResponseAct: "tell_party_size",
      repairType: "confirm_quantity",
      repairHanzi: "两位吗？",
      repairPinyin: "liǎng wèi ma?",
      repairPt: "Duas pessoas?",
      explanation: "两位 diz o número de pessoas no restaurante.",
    },
    "cardapio-3",
    { hanzi: "两位，好。请坐。", pinyin: "liǎng wèi, hǎo. qǐng zuò.", pt: "Duas pessoas, certo. Por favor, sentem-se." }
  ),
  ...ask(
    "cardapio-3",
    { hanzi: "你要菜单吗？", pinyin: "nǐ yào càidān ma?", pt: "Você quer o cardápio?" },
    {
      type: "choose_reply",
      prompt: "Peça o cardápio com o padrão que você já usa para pedir.",
      answer: "我要菜单",
      pinyin: "wǒ yào càidān",
      pt: "Quero o cardápio.",
      options: ["我要菜单", "再见", "我很好", "买单"],
      accepts: ["菜单"],
      speechAct: "offer_menu",
      expectedResponseAct: "request_menu",
      repairType: "clarify",
      repairHanzi: "菜单？",
      repairPinyin: "càidān?",
      repairPt: "O cardápio?",
      explanation: "我要菜单 pede o cardápio com 我要 + coisa.",
    },
    "cardapio-4",
    { hanzi: "菜单，好。", pinyin: "càidān, hǎo.", pt: "Cardápio, certo." }
  ),
  ...ask(
    "cardapio-4",
    { hanzi: "你要什么？", pinyin: "nǐ yào shénme?", pt: "O que você quer?" },
    {
      type: "choose_reply",
      prompt: "Peça arroz.",
      answer: "我要米饭",
      pinyin: "wǒ yào mǐfàn",
      pt: "Quero arroz.",
      options: ["我要米饭", "我要菜", "再见", "我很好"],
      accepts: ["我想吃米饭", "我要饭"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "你要什么？",
      repairPinyin: "nǐ yào shénme?",
      repairPt: "O que você quer?",
      explanation: "Troque o objeto: 我要 + arroz.",
    },
    "cardapio-5",
    { hanzi: "米饭，好。", pinyin: "mǐfàn, hǎo.", pt: "Arroz, certo." }
  ),
  ...ask(
    "cardapio-5",
    { hanzi: "你要茶吗？", pinyin: "nǐ yào chá ma?", pt: "Você quer chá?" },
    {
      type: "choose_reply",
      prompt: "Aceite o chá.",
      answer: "我要一杯茶",
      pinyin: "wǒ yào yì bēi chá",
      pt: "Quero um copo de chá.",
      options: ["我要一杯茶", "不要了", "买单", "再见"],
      accepts: ["我想喝茶"],
      speechAct: "ask_order",
      expectedResponseAct: "accept_offer",
      repairType: "clarify",
      repairHanzi: "茶？",
      repairPinyin: "chá?",
      repairPt: "Chá?",
      explanation: "我要一杯茶 aceita o chá.",
    },
    "cardapio-6"
  ),
  ...ask(
    "cardapio-6",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Vocês terminaram. Peça a conta, sem alternativas.",
      answer: "买单",
      pinyin: "mǎidān",
      pt: "A conta, por favor.",
      accepts: ["买单。", "买单谢谢"],
      speechAct: "confirm_order",
      expectedResponseAct: "request_bill",
      repairType: "confirm_bill",
      repairHanzi: "买单？",
      repairPinyin: "mǎidān?",
      repairPt: "A conta?",
      explanation: "买单 pede a conta.",
    },
    undefined,
    { hanzi: "好的！", pinyin: "hǎo de!", pt: "Certo!" }
  ),
];

export const REVISAO_RESTAURANTE_LEARNED_REFS = [
  "chunk:woele",
  "chunk:womenchifanba",
  "chunk:nihao",
  "chunk:woyao",
  "chunk:woxianghe",
  "chunk:haochi",
  "chunk:maidan",
  "chunk:xiexie",
  "chunk:zaijian",
  "chunk:wohenhao",
  "chunk:nihaoma",
  "chunk:taiguile",
  "chunk:zheshishenme",
  "char:cha_tea",
];

export const REVISAO_RESTAURANTE_NODES: ConversationNode[] = [
  lin("rest-1", "我饿了！我们吃饭吧！", "wǒ è le! wǒmen chīfàn ba!", "Estou com fome! Vamos comer!", "rest-2", "thinking"),
  ...ask(
    "rest-2",
    { hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!" },
    {
      type: "choose_reply",
      prompt: "Peça apontando para o prato.",
      answer: "我要这个",
      pinyin: "wǒ yào zhège",
      pt: "Eu quero este.",
      options: ["我要这个", "再见", "你好吗", "太贵了"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "你要什么？",
      repairPinyin: "nǐ yào shénme?",
      repairPt: "O que você quer?",
      explanation: "我要这个 = eu quero este.",
    },
    "rest-4",
    { hanzi: "这个，好。你想喝茶吗？", pinyin: "zhège, hǎo. nǐ xiǎng hē chá ma?", pt: "Este, certo. Quer beber chá?" }
  ),
  ...ask(
    "rest-4",
    { hanzi: "你想喝茶吗？", pinyin: "nǐ xiǎng hē chá ma?", pt: "Quer beber chá?" },
    {
      type: "choose_reply",
      prompt: "Aceite o chá.",
      answer: "我想喝茶",
      pinyin: "wǒ xiǎng hē chá",
      pt: "Quero beber chá.",
      options: ["我想喝茶", "再见", "太贵了", "我很好"],
      accepts: ["我要一杯茶"],
      speechAct: "ask_order",
      expectedResponseAct: "accept_offer",
      repairType: "clarify",
      repairHanzi: "茶？",
      repairPinyin: "chá?",
      repairPt: "Chá?",
      explanation: "我想喝茶 aceita: quero beber chá.",
    },
    "rest-6b",
    { hanzi: "茶，好。", pinyin: "chá, hǎo.", pt: "Chá, certo." }
  ),
  npc("rest-6b", "好吃吗？", "hǎochī ma?", "Está gostoso?", { nextNodeId: "rest-7" }, "thinking"),
  {
    id: "rest-7",
    speakerId: "lin",
    hanzi: "很好吃！",
    pinyin: "hěn hǎochī!",
    pt: "Muito gostoso!",
    emotion: "happy",
    interaction: {
      type: "choose_meaning",
      prompt: "O que Matheus achou da comida?",
      options: ["Muito gostosa.", "Muito cara.", "Ele não entendeu.", "Ele quer três."],
      correctAnswer: "Muito gostosa.",
      correctNextNodeId: "rest-9",
      wrongNextNodeId: "rest-8",
      explanation: "很好吃 elogia comida: muito gostoso.",
      speechAct: "ask_wellbeing",
      expectedResponseAct: "praise_food",
      repairType: "clarify",
    },
  },
  npc("rest-8", "好吃，很好吃。", "hǎochī, hěn hǎochī.", "Gostoso, muito gostoso.", { nextNodeId: "rest-7" }, "thinking"),
  ...ask(
    "rest-9",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Peça a conta.",
      answer: "买单",
      pinyin: "mǎidān",
      pt: "A conta, por favor.",
      accepts: ["买单。", "买单谢谢"],
      speechAct: "confirm_order",
      expectedResponseAct: "request_bill",
      repairType: "confirm_bill",
      repairHanzi: "买单？",
      repairPinyin: "mǎidān?",
      repairPt: "A conta?",
      explanation: "买单 pede a conta.",
    },
    "rest-end"
  ),
  npc("rest-end", "谢谢！再见！", "xièxie! zàijiàn!", "Obrigado! Até logo!"),
];

export const IMERSAO_RESTAURANTE_LEARNED_REFS = [...PEDIR_CARDAPIO_LEARNED_REFS, "chunk:fuwuyuan", "chunk:haochi"];

/**
 * Immersion: 22 main-path lines / 7 interventions.
 * Branches: 一位 (same meal) and 不要了 (second ending after the bill).
 */
export const IMERSAO_RESTAURANTE_NODES: ConversationNode[] = [
  npc("ir-1", "你好！", "nǐ hǎo!", "Olá!", { nextNodeId: "ir-2" }),
  ...branchChoice(
    "ir-2",
    { hanzi: "请问几位？", pinyin: "qǐng wèn jǐ wèi?", pt: "Com licença, quantas pessoas?" },
    {
      type: "choose_reply",
      prompt: "Vocês são duas pessoas. Uma pessoa também é um caminho real.",
      answer: "两位",
      pinyin: "liǎng wèi",
      pt: "Duas pessoas.",
      options: ["两位", "一位"],
      accepts: ["两个人"],
      speechAct: "ask_party_size",
      expectedResponseAct: "tell_party_size",
      repairType: "confirm_quantity",
      repairHanzi: "两位吗？",
      repairPinyin: "liǎng wèi ma?",
      repairPt: "Duas pessoas?",
      explanation: "两位. Uma pessoa seria 一位.",
    },
    "ir-3",
    "ir-2b-one",
    { hanzi: "两位，好。请坐。", pinyin: "liǎng wèi, hǎo. qǐng zuò.", pt: "Duas pessoas, certo. Por favor, sentem-se." }
  ),
  npc("ir-2b-one", "一位，好。请坐。", "yí wèi, hǎo. qǐng zuò.", "Uma pessoa, certo. Por favor, sente-se.", { nextNodeId: "ir-3" }),
  ...ask(
    "ir-3",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "choose_reply",
      prompt: "Chame o atendimento.",
      answer: "服务员",
      pinyin: "fúwùyuán",
      pt: "Garçom!",
      options: ["服务员", "再见", "我很好", "买单"],
      accepts: ["服务员！"],
      speechAct: "greet",
      expectedResponseAct: "get_attention",
      repairType: "clarify",
      repairHanzi: "服务员？",
      repairPinyin: "fúwùyuán?",
      repairPt: "O atendente?",
      explanation: "服务员 chama o atendimento.",
    },
    "ir-4",
    { hanzi: "你好。", pinyin: "nǐ hǎo.", pt: "Olá." }
  ),
  ...ask(
    "ir-4",
    { hanzi: "你要菜单吗？", pinyin: "nǐ yào càidān ma?", pt: "Você quer o cardápio?" },
    {
      type: "choose_reply",
      prompt: "Peça o cardápio.",
      answer: "我要菜单",
      pinyin: "wǒ yào càidān",
      pt: "Quero o cardápio.",
      options: ["我要菜单", "买单", "再见", "我很好"],
      accepts: ["菜单"],
      speechAct: "offer_menu",
      expectedResponseAct: "request_menu",
      repairType: "clarify",
      repairHanzi: "菜单？",
      repairPinyin: "càidān?",
      repairPt: "O cardápio?",
      explanation: "我要菜单 pede o cardápio.",
    },
    "ir-5",
    { hanzi: "菜单，好。", pinyin: "càidān, hǎo.", pt: "Cardápio, certo." }
  ),
  ...ask(
    "ir-5",
    { hanzi: "你要什么？", pinyin: "nǐ yào shénme?", pt: "O que você quer?" },
    {
      type: "choose_reply",
      prompt: "Peça arroz.",
      answer: "我要米饭",
      pinyin: "wǒ yào mǐfàn",
      pt: "Quero arroz.",
      options: ["我要米饭", "我要菜", "再见", "我很好"],
      accepts: ["我想吃米饭", "我要饭"],
      speechAct: "ask_order",
      expectedResponseAct: "place_order",
      repairType: "reask_order",
      repairHanzi: "你要什么？",
      repairPinyin: "nǐ yào shénme?",
      repairPt: "O que você quer?",
      explanation: "Troque o objeto: 我要 + arroz.",
    },
    "ir-6",
    { hanzi: "米饭，好。", pinyin: "mǐfàn, hǎo.", pt: "Arroz, certo." }
  ),
  ...branchChoice(
    "ir-6",
    { hanzi: "你要茶吗？", pinyin: "nǐ yào chá ma?", pt: "Você quer chá?" },
    {
      type: "choose_reply",
      prompt: "Aceite o chá, ou recuse se não quiser mais.",
      answer: "我要一杯茶",
      pinyin: "wǒ yào yì bēi chá",
      pt: "Quero um copo de chá.",
      options: ["我要一杯茶", "不要了"],
      accepts: ["我想喝茶"],
      speechAct: "ask_order",
      expectedResponseAct: "accept_offer",
      repairType: "clarify",
      repairHanzi: "茶？",
      repairPinyin: "chá?",
      repairPt: "Chá?",
      explanation: "我要一杯茶 aceita; 不要了 recusa com educação.",
    },
    "ir-8",
    "ir-6-no",
    { hanzi: "茶，好。", pinyin: "chá, hǎo.", pt: "Chá, certo." }
  ),
  npc("ir-6-no", "好，不要了。", "hǎo, bú yào le.", "Certo, não quer mais.", { nextNodeId: "ir-9-no" }),
  ...ask(
    "ir-8",
    { hanzi: "好吃吗？", pinyin: "hǎochī ma?", pt: "Está gostoso?" },
    {
      type: "choose_reply",
      prompt: "A comida está boa. Responda.",
      answer: "很好吃",
      pinyin: "hěn hǎochī",
      pt: "Muito gostoso.",
      options: ["很好吃", "不要了", "再见", "我很好"],
      speechAct: "ask_wellbeing",
      expectedResponseAct: "praise_food",
      repairType: "clarify",
      repairHanzi: "好吃吗？",
      repairPinyin: "hǎochī ma?",
      repairPt: "Está gostoso?",
      explanation: "很好吃 reage à comida.",
    },
    "ir-9",
    { hanzi: "好吃，好。", pinyin: "hǎochī, hǎo.", pt: "Gostoso, certo." }
  ),
  ...ask(
    "ir-9",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Terminaram. Peça a conta falando ou escrevendo, sem banco de palavras.",
      answer: "买单",
      pinyin: "mǎidān",
      pt: "A conta, por favor.",
      accepts: ["买单。", "买单谢谢"],
      speechAct: "confirm_order",
      expectedResponseAct: "request_bill",
      repairType: "confirm_bill",
      repairHanzi: "买单？",
      repairPinyin: "mǎidān?",
      repairPt: "A conta?",
      explanation: "买单 pede a conta depois de comer.",
    },
    "ir-end"
  ),
  npc("ir-end", "再见！", "zàijiàn!", "Até logo!"),
  ...ask(
    "ir-9-no",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Terminaram. Peça a conta falando ou escrevendo, sem banco de palavras.",
      answer: "买单",
      pinyin: "mǎidān",
      pt: "A conta, por favor.",
      accepts: ["买单。", "买单谢谢"],
      speechAct: "confirm_order",
      expectedResponseAct: "request_bill",
      repairType: "confirm_bill",
      repairHanzi: "买单？",
      repairPinyin: "mǎidān?",
      repairPt: "A conta?",
      explanation: "买单 pede a conta depois de comer.",
    },
    undefined,
    { hanzi: "好的！", pinyin: "hǎo de!", pt: "Certo!" }
  ),
];

export const IMERSAO_RESTAURANTE_BRANCHED_NODES = IMERSAO_RESTAURANTE_NODES;
