/**
 * Cenas curtas de conversa entre dois personagens.
 * Vocabulário: só chunks/hànzì já ensinados + no máximo 1 novidade (newRefs).
 */

export type ConversationSetting = "classroom" | "street" | "shop" | "home" | "park" | "school";
export type ConversationEmotion = "neutral" | "happy" | "confused" | "thinking";
export type ConversationCheckpointType =
  | "choose_reply"
  | "fill_reply"
  | "choose_meaning"
  | "order_reply"
  | "choose_intent"
  | "complete_reply";

/** Situações pedagógicas principais (validação: ≥2 cenas por grupo). */
export type ConversationSituationGroup =
  | "greeting"
  | "introduction"
  | "learning"
  | "needs"
  | "numbers"
  | "time";

export type ConversationDifficulty = "beginner" | "intermediate" | "advanced";

export interface ConversationCharacter {
  id: string;
  name: string;
  avatar: string;
  side: "left" | "right";
}

export interface ConversationLine {
  speakerId: string;
  hanzi: string;
  pinyin: string;
  pt?: string;
  emotion?: ConversationEmotion;
  audioText?: string;
  revealMode?: "auto" | "tap";
}

export interface ConversationCheckpoint {
  type: ConversationCheckpointType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ConversationSceneStep {
  kind: "conversation_scene";
  title: string;
  sceneId: string;
  setting: ConversationSetting;
  characters: ConversationCharacter[];
  lines: ConversationLine[];
  checkpoint?: ConversationCheckpoint;
  learnedRefs: string[];
  newRefs?: string[];
  /** Lição dedicada pode apresentar mais de 1 novidade. */
  dedicatedLesson?: boolean;
  situationGroup: ConversationSituationGroup;
  /** Intenção comunicativa (ex.: greeting, request-repeat). */
  intent: string;
  difficulty: ConversationDifficulty;
}

const PAIR_LIN_MEI: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "mei", name: "Mei", avatar: "mei", side: "right" },
];

function line(
  speakerId: string,
  hanzi: string,
  pinyin: string,
  pt: string | undefined,
  emotion: ConversationEmotion = "neutral",
  revealMode?: ConversationLine["revealMode"]
): ConversationLine {
  return {
    speakerId,
    hanzi,
    pinyin,
    pt,
    emotion,
    audioText: hanzi.replace(/[！？。，、]/g, ""),
    revealMode,
  };
}

export const CONVERSATION_SCENES: ConversationSceneStep[] = [
  // ── Cumprimentos ──────────────────────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "primeiro-cumprimento",
    title: "Primeiro cumprimento",
    setting: "school",
    characters: PAIR_LIN_MEI,
    situationGroup: "greeting",
    intent: "greeting",
    difficulty: "beginner",
    lines: [
      line("lin", "你好！", "nǐ hǎo!", "Olá!", "happy"),
      line("mei", "你好！", "nǐ hǎo!", "Olá!", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Alguém te cumprimenta. Qual resposta combina?",
      options: ["你好", "谢谢", "再见", "不客气"],
      correctAnswer: "你好",
      explanation: "你好 também responde a um cumprimento: olá.",
    },
    learnedRefs: ["chunk:nihao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "perguntando-se-esta-bem",
    title: "Perguntando se está bem",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "greeting",
    intent: "ask-wellbeing",
    difficulty: "beginner",
    lines: [
      line("lin", "你好吗？", "nǐ hǎo ma?", "Tudo bem?"),
      line("mei", "我很好。", "wǒ hěn hǎo.", "Estou bem.", "happy"),
    ],
    checkpoint: {
      type: "choose_meaning",
      prompt: "O que significa 我很好?",
      options: ["Estou bem.", "De nada.", "Até logo.", "Obrigado(a)."],
      correctAnswer: "Estou bem.",
      explanation: "我很好 = estou bem — resposta natural para 你好吗？",
    },
    learnedRefs: ["chunk:nihaoma", "chunk:wohenhao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "agradecendo",
    title: "Agradecendo",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "greeting",
    intent: "thanks",
    difficulty: "beginner",
    lines: [
      line("lin", "谢谢。", "xièxie.", "Obrigado(a).", "happy"),
      line("mei", "不客气。", "bú kèqi.", "De nada."),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Alguém diz 谢谢. Qual resposta combina?",
      options: ["不客气", "你好", "再见", "我很好"],
      correctAnswer: "不客气",
      explanation: "不客气 é a resposta natural para 谢谢: de nada.",
    },
    learnedRefs: ["chunk:xiexie", "chunk:bukeqi"],
  },
  {
    kind: "conversation_scene",
    sceneId: "despedida",
    title: "Despedida",
    setting: "street",
    characters: PAIR_LIN_MEI,
    situationGroup: "greeting",
    intent: "farewell",
    difficulty: "beginner",
    lines: [
      line("lin", "再见。", "zàijiàn.", "Até logo."),
      line("mei", "再见。", "zàijiàn.", "Até logo.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Qual hànzì significa “tchau” / até logo?",
      options: ["再见", "你好", "谢谢", "不客气"],
      correctAnswer: "再见",
      explanation: "再见 fecha a conversa: até logo.",
    },
    learnedRefs: ["chunk:zaijian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "revisao-cumprimento-completo",
    title: "Primeira conversa completa",
    setting: "school",
    characters: PAIR_LIN_MEI,
    situationGroup: "greeting",
    intent: "greeting-review",
    difficulty: "intermediate",
    lines: [
      line("lin", "你好！", "nǐ hǎo!", "Olá!", "happy", "tap"),
      line("mei", "你好！", "nǐ hǎo!", "Olá!", "happy", "tap"),
      line("lin", "你好吗？", "nǐ hǎo ma?", "Tudo bem?", "neutral", "tap"),
      line("mei", "我很好，谢谢。", "wǒ hěn hǎo, xièxie.", "Estou bem, obrigado(a).", "happy", "tap"),
      line("lin", "再见！", "zàijiàn!", "Até logo!"),
      line("mei", "再见！", "zàijiàn!", "Até logo!", "happy"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte a despedida que fecha a conversa.",
      options: ["再", "见", "你", "好", "谢"],
      correctAnswer: "再见",
      explanation: "再见 responde a uma despedida: até logo.",
    },
    learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaijian"],
  },

  // ── Apresentação ──────────────────────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "me-apresentando",
    title: "Me apresentando",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "introduction",
    intent: "introduce-self",
    difficulty: "intermediate",
    lines: [
      line("lin", "你好，我叫马修。", "nǐ hǎo, wǒ jiào Mǎxiū.", "Olá, meu nome é Matheus.", "happy", "tap"),
      line("mei", "你好！", "nǐ hǎo!", "Olá!", "happy", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte: eu me chamo Matheus.",
      options: ["我", "叫", "马修", "谢谢", "再见"],
      correctAnswer: "我叫马修",
      explanation: "我叫 + nome é a forma curta para se apresentar.",
    },
    learnedRefs: ["chunk:nihao", "chunk:wojiao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "perguntando-o-nome",
    title: "Perguntando o nome",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "introduction",
    intent: "ask-name",
    difficulty: "beginner",
    lines: [
      line("lin", "你叫什么？", "nǐ jiào shénme?", "Como você se chama?"),
      line("mei", "我叫马修。", "wǒ jiào Mǎxiū.", "Meu nome é Matheus.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Como perguntar o nome de alguém?",
      options: ["你叫什么？", "你好吗？", "谢谢", "再见"],
      correctAnswer: "你叫什么？",
      explanation: "你叫什么？ pergunta o nome.",
    },
    learnedRefs: ["chunk:nijiaoshenme", "chunk:wojiao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "dizer-de-onde-sou",
    title: "Dizer de onde sou",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "introduction",
    intent: "say-origin",
    difficulty: "intermediate",
    lines: [
      line("lin", "你是哪国人？", "nǐ shì nǎ guó rén?", "De que país você é?", "neutral", "tap"),
      line("mei", "我是巴西人。", "wǒ shì Bāxī rén.", "Sou brasileiro.", "happy", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte: sou brasileiro.",
      options: ["我", "是", "巴西", "人", "学生"],
      correctAnswer: "我是巴西人",
      explanation: "我是 + país + 人 conta a origem.",
    },
    learnedRefs: ["chunk:nishinaguoren", "chunk:wature"],
  },
  {
    kind: "conversation_scene",
    sceneId: "perguntar-de-onde",
    title: "Perguntar de onde alguém é",
    setting: "street",
    characters: PAIR_LIN_MEI,
    situationGroup: "introduction",
    intent: "ask-origin",
    difficulty: "beginner",
    lines: [
      line("mei", "你好！", "nǐ hǎo!", "Olá!", "happy"),
      line("lin", "你是哪国人？", "nǐ shì nǎ guó rén?", "De que país você é?"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Qual pergunta pede a origem?",
      options: ["你是哪国人？", "你好吗？", "再见", "谢谢"],
      correctAnswer: "你是哪国人？",
      explanation: "你是哪国人？ pergunta de onde a pessoa é.",
    },
    learnedRefs: ["chunk:nihao", "chunk:nishinaguoren"],
  },

  // ── Aprendizado / sobrevivência ───────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "nao-entendi",
    title: "Não entendi",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "not-understand",
    difficulty: "beginner",
    lines: [
      line("lin", "你好吗？", "nǐ hǎo ma?", "Tudo bem?"),
      line("mei", "我听不懂。", "wǒ tīng bù dǒng.", "Não entendi.", "confused"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Você não entendeu. O que diz?",
      options: ["我听不懂", "我很好", "谢谢", "再见"],
      correctAnswer: "我听不懂",
      explanation: "我听不懂 = não entendi (ouvindo).",
    },
    learnedRefs: ["chunk:nihaoma", "chunk:tingbudong"],
  },
  {
    kind: "conversation_scene",
    sceneId: "repita-por-favor",
    title: "Repita, por favor",
    setting: "school",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "request-repeat",
    difficulty: "beginner",
    lines: [
      line("lin", "我叫马修。", "wǒ jiào Mǎxiū.", "Meu nome é Matheus."),
      line("mei", "请再说一遍。", "qǐng zài shuō yí biàn.", "Por favor, fale de novo.", "thinking"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Peça para repetir com educação.",
      options: ["请再说一遍", "再见", "我很好", "不客气"],
      correctAnswer: "请再说一遍",
      explanation: "请再说一遍 pede uma repetição educada.",
    },
    learnedRefs: ["chunk:wojiao", "chunk:qingzaishuoyibian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "falar-mais-devagar",
    title: "Falar mais devagar",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "request-slower",
    difficulty: "intermediate",
    lines: [
      line("lin", "我会说一点中文。", "wǒ huì shuō yìdiǎn Zhōngwén.", undefined, "happy", "tap"),
      line("mei", "请说慢一点。", "qǐng shuō màn yìdiǎn.", "Fale mais devagar, por favor.", "confused", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte o pedido: fale mais devagar.",
      options: ["请", "说", "慢", "一点", "再见"],
      correctAnswer: "请说慢一点",
      explanation: "请说慢一点 pede ritmo mais lento.",
    },
    learnedRefs: ["chunk:wohuishuoyidian", "chunk:shuomanyidian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "nao-falo-chines",
    title: "Não falo chinês",
    setting: "street",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "no-chinese",
    difficulty: "beginner",
    lines: [
      line("lin", "你好！", "nǐ hǎo!", "Olá!", "happy"),
      line("mei", "我不会说中文。", "wǒ bú huì shuō Zhōngwén.", "Não falo chinês.", "confused"),
    ],
    checkpoint: {
      type: "choose_meaning",
      prompt: "O que significa 我不会说中文?",
      options: ["Não falo chinês.", "Sei falar um pouco.", "Estou bem.", "De nada."],
      correctAnswer: "Não falo chinês.",
      explanation: "不会 nega a habilidade: não sei falar chinês.",
    },
    learnedRefs: ["chunk:nihao", "chunk:wobuhui"],
  },
  {
    kind: "conversation_scene",
    sceneId: "falo-um-pouco",
    title: "Falo um pouco",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "speak-a-little",
    difficulty: "advanced",
    lines: [
      line("lin", "你好！", "nǐ hǎo!", undefined, "neutral"),
      line("mei", "我会说一点中文。", "wǒ huì shuō yìdiǎn Zhōngwén.", undefined, "happy"),
    ],
    checkpoint: {
      type: "choose_intent",
      prompt: "Qual intenção Mei expressa?",
      options: ["Fala um pouco de chinês", "Não entende nada", "Pede a conta", "Se despede"],
      correctAnswer: "Fala um pouco de chinês",
      explanation: "一点 suaviza: sei falar um pouco.",
    },
    learnedRefs: ["chunk:nihao", "chunk:wohuishuoyidian"],
  },

  // ── Objetos e necessidades ────────────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "pedir-agua",
    title: "Pedir água",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "request-water",
    difficulty: "beginner",
    lines: [
      line("lin", "这是什么？", "zhè shì shénme?", "O que é isto?"),
      line("mei", "这是水。", "zhè shì shuǐ.", "Isto é água.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "O que é água em mandarim?",
      options: ["这是水", "这是人", "再见", "谢谢"],
      correctAnswer: "这是水",
      explanation: "这是水 identifica água.",
    },
    learnedRefs: ["chunk:zheshishenme", "chunk:zheshishui", "char:shui"],
  },
  {
    kind: "conversation_scene",
    sceneId: "identificar-pessoa",
    title: "Identificar uma pessoa",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "identify-person",
    difficulty: "beginner",
    lines: [
      line("lin", "那是人吗？", "nà shì rén ma?", "Aquilo é uma pessoa?"),
      line("mei", "是，那是人。", "shì, nà shì rén.", "Sim, aquilo é uma pessoa.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Qual hànzì é “pessoa”?",
      options: ["人", "木", "山", "水"],
      correctAnswer: "人",
      explanation: "人 = pessoa.",
    },
    learnedRefs: ["chunk:nashirenm", "char:ren"],
  },
  {
    kind: "conversation_scene",
    sceneId: "identificar-arvore-montanha",
    title: "Árvore e montanha",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "identify-nature",
    difficulty: "intermediate",
    lines: [
      line("lin", "这是木。", "zhè shì mù.", "Isto é árvore/madeira.", "neutral", "tap"),
      line("mei", "那是山。", "nà shì shān.", "Aquilo é montanha.", "happy", "tap"),
    ],
    checkpoint: {
      type: "complete_reply",
      prompt: "Complete: isto é ___ (árvore).",
      options: ["木", "山", "人", "水"],
      correctAnswer: "木",
      explanation: "木 é árvore/madeira; 山 é montanha.",
    },
    learnedRefs: ["chunk:zheshishui", "chunk:nashirenm", "char:mu", "char:shan"],
  },
  {
    kind: "conversation_scene",
    sceneId: "escolher-objeto",
    title: "Escolher um objeto",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "choose-object",
    difficulty: "intermediate",
    lines: [
      line("lin", "这个多少钱？", "zhège duōshao qián?", "Quanto custa este?", "neutral", "tap"),
      line("mei", "我要这个。", "wǒ yào zhège.", "Eu quero este.", "happy", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte: eu quero este.",
      options: ["我", "要", "这个", "山", "再见"],
      correctAnswer: "我要这个",
      explanation: "我要这个 escolhe o objeto na hora da compra.",
    },
    learnedRefs: ["chunk:zhegeduoshaoqian", "chunk:woyao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "grande-ou-pequeno",
    title: "Grande ou pequeno",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "describe-size",
    difficulty: "advanced",
    lines: [
      line("lin", "这是大。", "zhè shì dà.", undefined),
      line("mei", "那是小。", "nà shì xiǎo.", undefined, "thinking"),
    ],
    checkpoint: {
      type: "choose_intent",
      prompt: "Mei fala de algo…",
      options: ["pequeno", "água", "despedida", "agradecimento"],
      correctAnswer: "pequeno",
      explanation: "小 = pequeno; 大 = grande.",
    },
    learnedRefs: ["chunk:zheshishui", "chunk:nashirenm", "char:da", "char:xiao"],
  },

  // ── Números ───────────────────────────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "perguntar-quantidade",
    title: "Perguntar quantidade",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "numbers",
    intent: "ask-quantity",
    difficulty: "beginner",
    lines: [
      line("lin", "多少？", "duōshao?", "Quanto? Quantos?"),
      line("mei", "三。", "sān.", "Três.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Como perguntar a quantidade?",
      options: ["多少？", "你好", "再见", "谢谢"],
      correctAnswer: "多少？",
      explanation: "多少？ pergunta quantidade.",
    },
    learnedRefs: ["chunk:duoshao", "char:san"],
  },
  {
    kind: "conversation_scene",
    sceneId: "escolher-numero",
    title: "Escolher um número",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "numbers",
    intent: "choose-number",
    difficulty: "beginner",
    lines: [
      line("lin", "一、二、三？", "yī, èr, sān?", "Um, dois ou três?"),
      line("mei", "二。", "èr.", "Dois.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Mei escolheu qual número?",
      options: ["二", "一", "三", "四"],
      correctAnswer: "二",
      explanation: "二 = dois.",
    },
    learnedRefs: ["char:yi", "char:er", "char:san"],
  },
  {
    kind: "conversation_scene",
    sceneId: "informar-idade",
    title: "Informar a idade",
    setting: "home",
    characters: PAIR_LIN_MEI,
    situationGroup: "numbers",
    intent: "say-age",
    difficulty: "intermediate",
    lines: [
      line("lin", "你几岁？", "nǐ jǐ suì?", "Quantos anos você tem?", "neutral", "tap"),
      line("mei", "我五岁。", "wǒ wǔ suì.", "Tenho cinco anos.", "happy", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte: tenho cinco anos.",
      options: ["我", "五", "岁", "你", "叫"],
      correctAnswer: "我五岁",
      explanation: "我 + número + 岁 informa a idade.",
    },
    learnedRefs: ["chunk:nijisui", "chunk:wowusui", "char:wu", "char:sui_age"],
  },
  {
    kind: "conversation_scene",
    sceneId: "comprar-duas-unidades",
    title: "Comprar duas unidades",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "numbers",
    intent: "buy-two",
    difficulty: "advanced",
    lines: [
      line("lin", "多少钱？", "duōshao qián?", undefined),
      line("mei", "我要两个。", "wǒ yào liǎng ge.", undefined, "happy"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte com o banco: eu quero dois.",
      options: ["我", "要", "两", "个", "三", "谢谢"],
      correctAnswer: "我要两个",
      explanation: "两个 = duas unidades (两 antes do classificador).",
    },
    learnedRefs: ["chunk:duoshaoqian", "chunk:woyaoliangge", "chunk:woyao"],
  },

  // ── Tempo e encontro ──────────────────────────────────────────────────────
  {
    kind: "conversation_scene",
    sceneId: "hoje",
    title: "Hoje",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "time",
    intent: "talk-today",
    difficulty: "beginner",
    lines: [
      line("lin", "今天很好。", "jīntiān hěn hǎo.", "Hoje está ótimo.", "happy"),
      line("mei", "太好了！", "tài hǎo le!", "Que ótimo!", "happy"),
    ],
    checkpoint: {
      type: "choose_meaning",
      prompt: "O que significa 今天很好?",
      options: ["Hoje está ótimo.", "Até amanhã.", "De nada.", "Quantos anos?"],
      correctAnswer: "Hoje está ótimo.",
      explanation: "今天 = hoje; 很好 = muito bom.",
    },
    learnedRefs: ["chunk:jintianhenhao", "chunk:taihaole"],
  },
  {
    kind: "conversation_scene",
    sceneId: "amanha",
    title: "Amanhã",
    setting: "school",
    characters: PAIR_LIN_MEI,
    situationGroup: "time",
    intent: "talk-tomorrow",
    difficulty: "intermediate",
    lines: [
      line("lin", "什么时候？", "shénme shíhou?", "Quando?", "neutral", "tap"),
      line("mei", "明天。", "míngtiān.", "Amanhã.", "happy", "tap"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Qual palavra significa amanhã?",
      options: ["明天", "今天", "再见", "谢谢"],
      correctAnswer: "明天",
      explanation: "明天 = amanhã (parte de 明天见).",
    },
    learnedRefs: ["chunk:shenmeshihou", "chunk:mingtianjian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "ate-amanha",
    title: "Até amanhã",
    setting: "street",
    characters: PAIR_LIN_MEI,
    situationGroup: "time",
    intent: "see-tomorrow",
    difficulty: "beginner",
    lines: [
      line("lin", "明天见。", "míngtiān jiàn.", "Até amanhã."),
      line("mei", "明天见！", "míngtiān jiàn!", "Até amanhã!", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Como dizer “até amanhã”?",
      options: ["明天见", "再见你好", "谢谢", "我很好"],
      correctAnswer: "明天见",
      explanation: "明天见 combina amanhã + ver.",
    },
    learnedRefs: ["chunk:mingtianjian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "marcar-encontro",
    title: "Marcar um encontro",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "time",
    intent: "schedule-meet",
    difficulty: "advanced",
    lines: [
      line("lin", "什么时候？", "shénme shíhou?", undefined),
      line("mei", "明天。", "míngtiān.", undefined, "thinking"),
      line("lin", "好的，明天见。", "hǎo de, míngtiān jiàn.", undefined, "happy"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte o combinado: até amanhã.",
      options: ["明天", "见", "好的", "多少", "水"],
      correctAnswer: "明天见",
      explanation: "明天见 fecha um encontro simples para o dia seguinte.",
    },
    learnedRefs: ["chunk:shenmeshihou", "chunk:mingtianjian", "chunk:haode"],
  },

  // ── Extensões para fases com frases (amigos, gostos, movimento) ───────────
  {
    kind: "conversation_scene",
    sceneId: "falar-de-amigos",
    title: "Falar de amigos",
    setting: "park",
    characters: PAIR_LIN_MEI,
    situationGroup: "introduction",
    intent: "talk-friends",
    difficulty: "intermediate",
    lines: [
      line("lin", "你好！", "nǐ hǎo!", "Olá!", "happy", "tap"),
      line("mei", "我有三个朋友。", "wǒ yǒu sān ge péngyou.", "Tenho três amigos.", "happy", "tap"),
    ],
    checkpoint: {
      type: "choose_meaning",
      prompt: "O que significa 我有三个朋友?",
      options: ["Tenho três amigos.", "Sou brasileiro.", "Até amanhã.", "Não entendi."],
      correctAnswer: "Tenho três amigos.",
      explanation: "朋友 = amigo; 三个 marca a quantidade.",
    },
    learnedRefs: ["chunk:nihao", "chunk:woyousangepengyou", "chunk:pengyou"],
  },
  {
    kind: "conversation_scene",
    sceneId: "gosto-de-chines",
    title: "Gosto de chinês",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    situationGroup: "learning",
    intent: "like-chinese",
    difficulty: "intermediate",
    lines: [
      line("lin", "你呢？", "nǐ ne?", "E você?", "neutral", "tap"),
      line("mei", "我喜欢中文。", "wǒ xǐhuan Zhōngwén.", "Eu gosto de chinês.", "happy", "tap"),
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte: eu gosto de chinês.",
      options: ["我", "喜欢", "中文", "喝茶", "走"],
      correctAnswer: "我喜欢中文",
      explanation: "我喜欢中文 expressa gosto pelo idioma.",
    },
    learnedRefs: ["chunk:nine", "chunk:woxihuan"],
  },
  {
    kind: "conversation_scene",
    sceneId: "quero-cha",
    title: "Quero chá",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    situationGroup: "needs",
    intent: "want-tea",
    difficulty: "beginner",
    lines: [
      line("lin", "你呢？", "nǐ ne?", "E você?"),
      line("mei", "我想喝茶。", "wǒ xiǎng hē chá.", "Quero beber chá.", "happy"),
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Como dizer que quer beber chá?",
      options: ["我想喝茶", "我们走吧", "谢谢", "再见"],
      correctAnswer: "我想喝茶",
      explanation: "我想喝茶 = quero beber chá.",
    },
    learnedRefs: ["chunk:nine", "chunk:woxianghe"],
  },
  {
    kind: "conversation_scene",
    sceneId: "vamos-embora",
    title: "Vamos embora",
    setting: "street",
    characters: PAIR_LIN_MEI,
    situationGroup: "time",
    intent: "lets-go",
    difficulty: "advanced",
    lines: [
      line("lin", "什么时候？", "shénme shíhou?", undefined),
      line("mei", "我们走吧。", "wǒmen zǒu ba.", undefined, "happy"),
    ],
    checkpoint: {
      type: "choose_intent",
      prompt: "Qual intenção Mei expressa?",
      options: ["Convidar para ir embora", "Pedir água", "Perguntar o nome", "Agradecer"],
      correctAnswer: "Convidar para ir embora",
      explanation: "我们走吧 sugere ir embora juntos.",
    },
    learnedRefs: ["chunk:shenmeshihou", "chunk:womenzouba"],
  },
];

export const conversationSceneById = Object.fromEntries(
  CONVERSATION_SCENES.map((scene) => [scene.sceneId, scene])
) as Record<string, ConversationSceneStep>;

export const SETTING_LABELS: Record<ConversationSetting, string> = {
  classroom: "Sala de aula",
  street: "Rua",
  shop: "Loja",
  home: "Casa",
  park: "Parque",
  school: "Escola",
};

export const SITUATION_GROUP_LABELS: Record<ConversationSituationGroup, string> = {
  greeting: "Cumprimentos",
  introduction: "Apresentação",
  learning: "Aprendizado",
  needs: "Objetos e necessidades",
  numbers: "Números",
  time: "Tempo e encontro",
};

export const AVATAR_TONES: Record<string, { bg: string; fg: string }> = {
  lin: { bg: "bg-[rgb(185_65_46/0.14)]", fg: "text-accent" },
  mei: { bg: "bg-[rgb(47_133_90/0.14)]", fg: "text-[rgb(var(--good))]" },
  default: { bg: "bg-surface-2", fg: "text-ink-soft" },
};

/** Converte a cena canônica em um LessonStep plano para o motor. */
export function conversationSceneStepFromId(sceneId: string): ConversationSceneStep | null {
  return conversationSceneById[sceneId] ?? null;
}

export function conversationScenesForRefs(refs: readonly string[]): ConversationSceneStep[] {
  const refSet = new Set(refs);
  return CONVERSATION_SCENES.filter((scene) => {
    const needed = [...scene.learnedRefs, ...(scene.newRefs ?? [])];
    return needed.every((ref) => refSet.has(ref));
  });
}

export interface ConversationSceneScoreContext {
  focusRefs: readonly string[];
  reviewRefs?: readonly string[];
  usedSceneIds?: readonly string[];
  usedIntents?: readonly string[];
  recentSceneIds?: readonly string[];
  /** Dificuldade alvo do aluno/lição. */
  targetDifficulty?: ConversationDifficulty;
  lessonId?: string;
}

/**
 * Pontua uma cena candidata. Critérios pedagógicos + anti-repetição.
 * Nunca use só candidates[0].
 */
export function scoreConversationScene(
  scene: ConversationSceneStep,
  context: ConversationSceneScoreContext
): number {
  const focus = new Set(context.focusRefs);
  const review = new Set(context.reviewRefs ?? []);
  const usedScenes = new Set(context.usedSceneIds ?? []);
  const usedIntents = new Set(context.usedIntents ?? []);
  const recent = context.recentSceneIds ?? [];
  const lastThree = recent.slice(0, 3);

  let score = 0;

  const focusHits = scene.learnedRefs.filter((ref) => focus.has(ref)).length;
  if (focusHits > 0) score += 40 + Math.min(20, focusHits * 5);
  else score -= 50;

  const reusesOld = scene.learnedRefs.some((ref) => review.has(ref) && !focus.has(ref));
  if (reusesOld) score += 30;

  if (!usedScenes.has(scene.sceneId)) score += 25;
  else score -= 100;

  if (lastThree.includes(scene.sceneId)) score -= 80;
  else if (!recent.includes(scene.sceneId)) score += 20;
  else score += 5;

  const target = context.targetDifficulty ?? "beginner";
  const rank = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  const delta = Math.abs(rank[scene.difficulty] - rank[target]);
  if (delta === 0) score += 15;
  else if (delta === 1) score -= 10;
  else score -= 25;

  if (!usedIntents.has(scene.intent)) score += 25;
  else score -= 20;

  // Desempate estável por lição — evita sempre o primeiro do catálogo.
  if (context.lessonId) {
    let hash = 0;
    const key = `${context.lessonId}:${scene.sceneId}`;
    for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    score += (Math.abs(hash) % 7) * 0.01;
  }

  return score;
}

export function selectConversationScene(
  candidates: readonly ConversationSceneStep[],
  context: ConversationSceneScoreContext
): ConversationSceneStep | null {
  if (candidates.length === 0) return null;
  let best: ConversationSceneStep | null = null;
  let bestScore = -Infinity;
  for (const scene of candidates) {
    const score = scoreConversationScene(scene, context);
    if (score > bestScore) {
      bestScore = score;
      best = scene;
    }
  }
  return best;
}

export function conversationDifficultyForLessonPhase(phaseOrder: number): ConversationDifficulty {
  if (phaseOrder <= 2) return "beginner";
  if (phaseOrder <= 5) return "intermediate";
  return "advanced";
}
