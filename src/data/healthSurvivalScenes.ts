import type {
  ConversationEmotion,
  ConversationNode,
  ConversationRepairType,
  ConversationSpeechAct,
} from "./conversationScenes";

/**
 * V4.9.9A health conversations.
 * Friend street scene vs clinic attendance — one role per scene.
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

export const NAO_ME_SINTO_BEM_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:zenmeyang",
  "chunk:wobushufu",
  "chunk:wotouteng",
  "chunk:woxuyaoyisheng",
  "chunk:yiyuanzainali",
  "char:hao",
  "char:bu",
  "char:ma_question",
];

/** Friend on the street notices you are unwell. Not a clinic. */
export const NAO_ME_SINTO_BEM_NODES: ConversationNode[] = [
  npc("mei", "saude-greet", "你好！你怎么样？", "nǐ hǎo! nǐ zěnmeyàng?", "Olá! Como vai?", { nextNodeId: "saude-unwell" }),
  ...ask(
    "mei",
    "saude-unwell",
    { hanzi: "你好！你怎么样？", pinyin: "nǐ hǎo! nǐ zěnmeyàng?", pt: "Olá! Como vai?" },
    {
      type: "produce_reply",
      prompt: "Você não está se sentindo bem. Diga isso.",
      answer: "我不舒服",
      pinyin: "wǒ bù shūfu",
      pt: "Não me sinto bem.",
      accepts: ["我不舒服。", "不舒服", "不舒服。"],
      productionScaffold: "first",
      capabilityId: "wobushufu",
      productionPattern: "我不 ______",
      productionHelpBuildBank: ["我", "不", "舒服"],
      productionHelpPiecePinyin: { 我: "wǒ", 不: "bù", 舒服: "shūfu" },
      productionHelpVocab: [
        { hanzi: "我", pinyin: "wǒ", meaningPt: "eu" },
        { hanzi: "不", pinyin: "bù", meaningPt: "não" },
        { hanzi: "舒服", pinyin: "shūfu", meaningPt: "bem / confortável" },
      ],
      speechAct: "ask_wellbeing",
      expectedResponseAct: "tell_wellbeing",
      repairType: "confirm_symptom",
      repairHanzi: "不舒服？",
      repairPinyin: "bù shūfu?",
      repairPt: "Indisposto?",
      explanation: "你怎么样？ pergunta como você está. 我不舒服 responde sem diagnóstico.",
    },
    "saude-head"
  ),
  ...ask(
    "mei",
    "saude-head",
    { hanzi: "头疼吗？", pinyin: "tóu téng ma?", pt: "Dor de cabeça?", audioText: "头疼吗" },
    {
      type: "produce_reply",
      prompt: "Ela perguntou da dor de cabeça. Confirme.",
      answer: "我头疼",
      pinyin: "wǒ tóu téng",
      pt: "Estou com dor de cabeça.",
      accepts: ["我头疼。", "头疼", "头疼。"],
      productionScaffold: "first",
      capabilityId: "wotouteng",
      productionPattern: "我 ______",
      productionHelpBuildBank: ["我", "头疼", "发烧"],
      productionHelpPiecePinyin: { 我: "wǒ", 头疼: "tóu téng", 发烧: "fāshāo" },
      productionHelpVocab: [
        { hanzi: "我", pinyin: "wǒ", meaningPt: "eu" },
        { hanzi: "头疼", pinyin: "tóu téng", meaningPt: "dor de cabeça" },
      ],
      speechAct: "ask_symptom",
      expectedResponseAct: "tell_symptom",
      repairType: "confirm_symptom",
      repairHanzi: "头？",
      repairPinyin: "tóu?",
      repairPt: "A cabeça?",
      explanation: "头疼吗？ confirma a dor. 我头疼 responde.",
    },
    "saude-doctor"
  ),
  ...ask(
    "mei",
    "saude-doctor",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você precisa de um médico agora. Peça isso.",
      answer: "我需要医生",
      pinyin: "wǒ xūyào yīshēng",
      pt: "Preciso de um médico.",
      accepts: ["我需要医生。", "需要医生", "需要医生。"],
      productionScaffold: "first",
      capabilityId: "woxuyaoyisheng",
      productionPattern: "我需要 ______",
      productionHelpBuildBank: ["我", "需要", "医生"],
      productionHelpPiecePinyin: { 我: "wǒ", 需要: "xūyào", 医生: "yīshēng" },
      productionHelpVocab: [
        { hanzi: "需要", pinyin: "xūyào", meaningPt: "precisar" },
        { hanzi: "医生", pinyin: "yīshēng", meaningPt: "médico" },
      ],
      speechAct: "acknowledge",
      expectedResponseAct: "request_doctor",
      repairType: "confirm_doctor",
      repairHanzi: "医生？",
      repairPinyin: "yīshēng?",
      repairPt: "Um médico?",
      explanation: "Com um amigo na rua, 我需要医生 pede o profissional. Não é a fala de consulta 我要看医生.",
    },
    "saude-hospital"
  ),
  ...ask(
    "mei",
    "saude-hospital",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você está na rua e precisa do hospital. Pergunte onde ele fica.",
      answer: "医院在哪里？",
      pinyin: "yīyuàn zài nǎlǐ?",
      pt: "Onde fica o hospital?",
      accepts: ["医院在哪里", "医院在哪里？", "请问，医院在哪里？"],
      productionScaffold: "transfer",
      capabilityId: "yiyuanzainali",
      productionPattern: "______ 在哪里？",
      productionHelpBuildBank: ["医院", "在哪里", "银行"],
      productionHelpPiecePinyin: { 医院: "yīyuàn", 在哪里: "zài nǎlǐ", 银行: "yínháng" },
      productionHelpVocab: [
        { hanzi: "医院", pinyin: "yīyuàn", meaningPt: "hospital" },
        { hanzi: "在哪里", pinyin: "zài nǎlǐ", meaningPt: "onde" },
      ],
      speechAct: "acknowledge",
      expectedResponseAct: "ask_location",
      repairType: "confirm_help",
      repairHanzi: "医院？",
      repairPinyin: "yīyuàn?",
      repairPt: "O hospital?",
      explanation: "医院在哪里？ transfere 在哪里 da cidade. Mei não pergunta isso a você.",
    },
    undefined,
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo — ela entendeu e vai ajudar." }
  ),
];

export const NA_CLINICA_LEARNED_REFS = [
  "chunk:nihao",
  "chunk:wobushufu",
  "chunk:wotouteng",
  "chunk:woduziteng",
  "chunk:wofashao",
  "chunk:woyaokanyisheng",
  "chunk:woxuyaoyisheng",
  "chunk:woxuyaobangzhu",
  "chunk:yizhizou",
  "chunk:qingzaishuoyibian",
  "chunk:qingmanyidian",
  "chunk:xiexie",
  "chunk:bukeqi",
  "char:hao",
  "char:ma_question",
];

/** Clinic desk: patient and attendant. Symptom variants stay inside known vocab. */
export const NA_CLINICA_NODES: ConversationNode[] = [
  npc("wang", "clinic-greet", "你好。", "nǐ hǎo.", "Olá.", { nextNodeId: "clinic-unwell" }),
  ...ask(
    "wang",
    "clinic-unwell",
    { hanzi: "你好。", pinyin: "nǐ hǎo.", pt: "Olá." },
    {
      type: "produce_reply",
      prompt: "Você chegou ao atendimento. Diga que não está se sentindo bem.",
      answer: "我不舒服",
      pinyin: "wǒ bù shūfu",
      pt: "Não me sinto bem.",
      accepts: ["我不舒服。", "不舒服", "不舒服。"],
      productionScaffold: "transfer",
      capabilityId: "wobushufu",
      productionPattern: "我不 ______",
      productionHelpBuildBank: ["我", "不", "舒服"],
      productionHelpPiecePinyin: { 我: "wǒ", 不: "bù", 舒服: "shūfu" },
      productionHelpVocab: [
        { hanzi: "不", pinyin: "bù", meaningPt: "não" },
        { hanzi: "舒服", pinyin: "shūfu", meaningPt: "bem / confortável" },
      ],
      speechAct: "greet",
      expectedResponseAct: "tell_wellbeing",
      repairType: "confirm_symptom",
      repairHanzi: "不舒服？",
      repairPinyin: "bù shūfu?",
      repairPt: "Indisposto?",
      explanation: "Na clínica, 我不舒服 abre o atendimento. A atendente ainda não pediu o sintoma.",
    },
    "clinic-ask"
  ),
  npc("wang", "clinic-ask", "头疼吗？", "tóu téng ma?", "Dor de cabeça?", {
    audioText: "头疼吗",
    interaction: {
      type: "listen_reply",
      prompt: "Sobre o que ela perguntou?",
      options: ["dor de cabeça", "o hospital", "o preço", "o quarto"],
      correctAnswer: "dor de cabeça",
      listenAudioText: "头疼吗",
      correctNextNodeId: "clinic-ask-answer",
      wrongNextNodeId: "clinic-ask-retry",
      explanation: "头疼吗？ pergunta da dor de cabeça. O hànzì da pergunta não aparece no título.",
      speechAct: "ask_symptom",
      expectedResponseAct: "acknowledge",
      repairType: "confirm_symptom",
    },
  }),
  npc("wang", "clinic-ask-retry", "头？", "tóu?", "A cabeça?", { nextNodeId: "clinic-ask" }, "thinking"),
  lin("clinic-ask-answer", "好。", "hǎo.", "Certo.", "clinic-symptom"),
  npc("wang", "clinic-symptom", "头疼吗？", "tóu téng ma?", "Dor de cabeça?", {
    interaction: {
      type: "choose_reply",
      prompt: "Explique o sintoma. Cabeça, barriga ou febre — as três já foram ensinadas.",
      options: ["我头疼", "我肚子疼", "我发烧了"],
      correctAnswer: "我头疼",
      correctNextNodeId: "clinic-head-answer",
      wrongNextNodeId: "clinic-symptom-retry",
      decision: true,
      validAnswers: ["我头疼", "我肚子疼", "我发烧了"],
      nextByAnswer: {
        我头疼: "clinic-head-answer",
        我肚子疼: "clinic-stomach-answer",
        我发烧了: "clinic-fever-answer",
      },
      explanation: "Três variantes autorais. Nenhuma pede diagnóstico.",
      speechAct: "ask_symptom",
      expectedResponseAct: "tell_symptom",
      repairType: "confirm_symptom",
    },
  }),
  npc("wang", "clinic-symptom-retry", "疼？", "téng?", "Dói?", { nextNodeId: "clinic-symptom" }, "thinking"),
  lin("clinic-head-answer", "我头疼。", "wǒ tóu téng.", "Estou com dor de cabeça.", "clinic-head-react"),
  npc("wang", "clinic-head-react", "好。", "hǎo.", "Certo.", { nextNodeId: "clinic-consult" }),
  lin("clinic-stomach-answer", "我肚子疼。", "wǒ dùzi téng.", "Estou com dor de barriga.", "clinic-stomach-react"),
  npc("wang", "clinic-stomach-react", "好。", "hǎo.", "Certo.", { nextNodeId: "clinic-consult" }),
  lin("clinic-fever-answer", "我发烧了。", "wǒ fāshāo le.", "Estou com febre.", "clinic-fever-react"),
  npc("wang", "clinic-fever-react", "好。", "hǎo.", "Certo.", { nextNodeId: "clinic-consult" }),
  ...ask(
    "wang",
    "clinic-consult",
    { hanzi: "好。", pinyin: "hǎo.", pt: "Certo." },
    {
      type: "produce_reply",
      prompt: "Você quer consulta. Peça para ver o médico.",
      answer: "我要看医生",
      pinyin: "wǒ yào kàn yīshēng",
      pt: "Quero ver um médico.",
      accepts: ["我要看医生。", "要看医生", "我需要医生", "我需要医生。"],
      productionScaffold: "first",
      capabilityId: "woyaokanyisheng",
      productionPattern: "我要看 ______",
      productionHelpBuildBank: ["我要", "看", "医生"],
      productionHelpPiecePinyin: { 我要: "wǒ yào", 看: "kàn", 医生: "yīshēng" },
      productionHelpVocab: [
        { hanzi: "我要", pinyin: "wǒ yào", meaningPt: "eu quero" },
        { hanzi: "看", pinyin: "kàn", meaningPt: "ver / consultar" },
        { hanzi: "医生", pinyin: "yīshēng", meaningPt: "médico" },
      ],
      speechAct: "acknowledge",
      expectedResponseAct: "request_doctor",
      repairType: "confirm_doctor",
      repairHanzi: "看医生？",
      repairPinyin: "kàn yīshēng?",
      repairPt: "Ver o médico?",
      explanation: "No balcão, 我要看医生 pede consulta. 我需要医生 também vale se a necessidade for direta.",
    },
    "clinic-dir"
  ),
  npc("wang", "clinic-dir", "一直走。", "yìzhí zǒu.", "Siga em frente.", {
    audioText: "一直走",
    interaction: {
      type: "choose_reply",
      prompt: "A orientação foi rápida. Peça para repetir ou para ir mais devagar — as duas mudam a conversa.",
      options: ["请再说一遍", "请慢一点"],
      correctAnswer: "请再说一遍",
      correctNextNodeId: "clinic-repeat",
      wrongNextNodeId: "clinic-dir-retry",
      decision: true,
      validAnswers: ["请再说一遍", "请慢一点"],
      nextByAnswer: { 请再说一遍: "clinic-repeat", 请慢一点: "clinic-slow-1" },
      explanation: "请再说一遍 pede a mesma fala. 请慢一点 pede em pedaços.",
      speechAct: "tell_direction",
      expectedResponseAct: "ask_repeat",
      repairType: "repeat",
    },
  }),
  npc("wang", "clinic-dir-retry", "走？", "zǒu?", "Ir?", { nextNodeId: "clinic-dir" }, "thinking"),
  npc("wang", "clinic-repeat", "一直走。", "yìzhí zǒu.", "Siga em frente.", {
    audioText: "一直走",
    nextNodeId: "clinic-arrive",
  }),
  npc("wang", "clinic-slow-1", "一直。", "yìzhí.", "Em frente.", { nextNodeId: "clinic-slow-2" }),
  npc("wang", "clinic-slow-2", "走。", "zǒu.", "Vá.", { nextNodeId: "clinic-arrive" }),
  npc("wang", "clinic-arrive", "好。", "hǎo.", "Certo.", {
    interaction: {
      type: "choose_reply",
      prompt: "Você chegou ao atendimento. Agradeça ou peça ajuda se ainda precisar.",
      options: ["谢谢", "我需要帮助"],
      correctAnswer: "谢谢",
      correctNextNodeId: "clinic-thanks",
      wrongNextNodeId: "clinic-arrive-retry",
      decision: true,
      validAnswers: ["谢谢", "我需要帮助"],
      nextByAnswer: { 谢谢: "clinic-thanks", 我需要帮助: "clinic-help" },
      explanation: "谢谢 fecha. 我需要帮助 pede ajuda urgente sem vocabulário dramático.",
      speechAct: "acknowledge",
      expectedResponseAct: "thank",
      repairType: "confirm_help",
    },
  }),
  npc("wang", "clinic-arrive-retry", "好？", "hǎo?", "Certo?", { nextNodeId: "clinic-arrive" }, "thinking"),
  lin("clinic-thanks", "谢谢。", "xièxie.", "Obrigado.", "clinic-end"),
  lin("clinic-help", "我需要帮助。", "wǒ xūyào bāngzhù.", "Preciso de ajuda.", "clinic-help-react"),
  npc("wang", "clinic-help-react", "好。一直走。", "hǎo. yìzhí zǒu.", "Certo. Siga em frente."),
  npc("wang", "clinic-end", "不客气。", "bú kèqi.", "De nada."),
];
