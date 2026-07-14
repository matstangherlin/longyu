/**
 * Cenas curtas de conversa entre dois personagens.
 * Vocabulário: só chunks/hànzì já ensinados + no máximo 1 novidade (newRefs).
 */

export type ConversationSetting = "classroom" | "street" | "shop" | "home" | "park" | "school";
export type ConversationEmotion = "neutral" | "happy" | "confused" | "thinking";
export type ConversationCheckpointType = "choose_reply" | "fill_reply" | "choose_meaning" | "order_reply";

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
}

const PAIR_LIN_MEI: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "mei", name: "Mei", avatar: "mei", side: "right" },
];

export const CONVERSATION_SCENES: ConversationSceneStep[] = [
  {
    kind: "conversation_scene",
    sceneId: "primeiro-cumprimento",
    title: "Primeiro cumprimento",
    setting: "school",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好！",
        pinyin: "nǐ hǎo!",
        pt: "Olá!",
        emotion: "happy",
        audioText: "你好",
      },
      {
        speakerId: "mei",
        hanzi: "你好！",
        pinyin: "nǐ hǎo!",
        pt: "Olá!",
        emotion: "happy",
        audioText: "你好",
      },
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
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "neutral",
        audioText: "你好吗",
      },
      {
        speakerId: "mei",
        hanzi: "我很好。",
        pinyin: "wǒ hěn hǎo.",
        pt: "Estou bem.",
        emotion: "happy",
        audioText: "我很好",
      },
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
    lines: [
      {
        speakerId: "lin",
        hanzi: "谢谢。",
        pinyin: "xièxie.",
        pt: "Obrigado(a).",
        emotion: "happy",
        audioText: "谢谢",
      },
      {
        speakerId: "mei",
        hanzi: "不客气。",
        pinyin: "bú kèqi.",
        pt: "De nada.",
        emotion: "neutral",
        audioText: "不客气",
      },
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
    lines: [
      {
        speakerId: "lin",
        hanzi: "再见。",
        pinyin: "zàijiàn.",
        pt: "Até logo.",
        emotion: "neutral",
        audioText: "再见",
      },
      {
        speakerId: "mei",
        hanzi: "再见。",
        pinyin: "zàijiàn.",
        pt: "Até logo.",
        emotion: "happy",
        audioText: "再见",
      },
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
    sceneId: "me-apresentando",
    title: "Me apresentando",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好，我叫马修。",
        pinyin: "nǐ hǎo, wǒ jiào Mǎxiū.",
        pt: "Olá, meu nome é Matheus.",
        emotion: "happy",
        audioText: "你好，我叫马修",
      },
      {
        speakerId: "mei",
        hanzi: "你好！",
        pinyin: "nǐ hǎo!",
        pt: "Olá!",
        emotion: "happy",
        audioText: "你好",
      },
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
    sceneId: "revisao-cumprimento-completo",
    title: "Primeira conversa completa",
    setting: "school",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好！",
        pinyin: "nǐ hǎo!",
        pt: "Olá!",
        emotion: "happy",
        audioText: "你好",
      },
      {
        speakerId: "mei",
        hanzi: "你好！",
        pinyin: "nǐ hǎo!",
        pt: "Olá!",
        emotion: "happy",
        audioText: "你好",
      },
      {
        speakerId: "lin",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "neutral",
        audioText: "你好吗",
      },
      {
        speakerId: "mei",
        hanzi: "我很好，谢谢。",
        pinyin: "wǒ hěn hǎo, xièxie.",
        pt: "Estou bem, obrigado(a).",
        emotion: "happy",
        audioText: "我很好，谢谢",
      },
      {
        speakerId: "lin",
        hanzi: "再见！",
        pinyin: "zàijiàn!",
        pt: "Até logo!",
        emotion: "neutral",
        audioText: "再见",
      },
      {
        speakerId: "mei",
        hanzi: "再见！",
        pinyin: "zàijiàn!",
        pt: "Até logo!",
        emotion: "happy",
        audioText: "再见",
      },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Lin diz 再见. Como Mei encerra a conversa?",
      options: ["再见", "你好", "谢谢", "不客气"],
      correctAnswer: "再见",
      explanation: "再见 responde a uma despedida: até logo.",
    },
    learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaijian"],
  },
  {
    kind: "conversation_scene",
    sceneId: "pedir-repeticao",
    title: "Pedir para repetir",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好吗？我叫马修。",
        pinyin: "nǐ hǎo ma? wǒ jiào Mǎxiū.",
        pt: "Tudo bem? Meu nome é Matheus.",
        emotion: "happy",
        audioText: "你好吗？我叫马修",
      },
      {
        speakerId: "mei",
        hanzi: "我听不懂。",
        pinyin: "wǒ tīng bù dǒng.",
        pt: "Não entendi.",
        emotion: "confused",
        audioText: "我听不懂",
      },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Mei não entendeu. O que ela pede em seguida?",
      options: ["请再说一遍", "我很好", "谢谢", "再见"],
      correctAnswer: "请再说一遍",
      explanation: "请再说一遍 pede para a pessoa falar de novo, com educação.",
    },
    learnedRefs: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:nihaoma", "chunk:wojiao"],
  },
  {
    kind: "conversation_scene",
    sceneId: "cortesia-loja",
    title: "Cortesia na loja",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "请问，你好吗？",
        pinyin: "qǐng wèn, nǐ hǎo ma?",
        pt: "Com licença, tudo bem?",
        emotion: "neutral",
        audioText: "请问，你好吗",
      },
      {
        speakerId: "mei",
        hanzi: "你好！我很好。",
        pinyin: "nǐ hǎo! wǒ hěn hǎo.",
        pt: "Olá! Estou bem.",
        emotion: "happy",
        audioText: "你好！我很好",
      },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Você quer abrir uma pergunta com educação. O que combina?",
      options: ["请问", "再见", "不客气", "我听不懂"],
      correctAnswer: "请问",
      explanation: "请问 abre a pergunta: com licença, posso perguntar?",
    },
    learnedRefs: ["chunk:qingwen", "chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"],
    newRefs: ["chunk:qingwen_nihaoma"],
  },
  {
    kind: "conversation_scene",
    sceneId: "de-onde-sou",
    title: "De onde sou",
    setting: "street",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好！你是哪国人？",
        pinyin: "nǐ hǎo! nǐ shì nǎ guó rén?",
        pt: "Olá! De que país você é?",
        emotion: "happy",
        audioText: "你好！你是哪国人？",
      },
      {
        speakerId: "mei",
        hanzi: "我是巴西人。",
        pinyin: "wǒ shì Bāxī rén.",
        pt: "Sou brasileiro(a).",
        emotion: "happy",
        audioText: "我是巴西人",
      },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Alguém pergunta 你是哪国人？ Como você responde?",
      options: ["我是巴西人", "谢谢", "再见", "我听不懂"],
      correctAnswer: "我是巴西人",
      explanation: "我是巴西人 responde a origem: sou brasileiro.",
    },
    learnedRefs: ["chunk:nihao", "chunk:wature", "char:ni", "char:ren", "char:shi"],
    newRefs: ["chunk:nishinaiguoren"],
    dedicatedLesson: true,
  },
  {
    kind: "conversation_scene",
    sceneId: "nao-entendi-reparo",
    title: "Não entendi — peça reparo",
    setting: "park",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你会说中文吗？",
        pinyin: "nǐ huì shuō Zhōngwén ma?",
        pt: "Você fala chinês?",
        emotion: "neutral",
        audioText: "你会说中文吗",
      },
      {
        speakerId: "mei",
        hanzi: "我听不懂。请再说一遍。",
        pinyin: "wǒ tīng bù dǒng. qǐng zài shuō yí biàn.",
        pt: "Não entendi. Por favor, fale de novo.",
        emotion: "confused",
        audioText: "我听不懂。请再说一遍",
      },
    ],
    checkpoint: {
      type: "choose_meaning",
      prompt: "Qual é a intenção de 我听不懂?",
      options: ["Não entendi o que ouvi.", "Não sei falar chinês.", "Por favor, fale de novo.", "Estou bem."],
      correctAnswer: "Não entendi o que ouvi.",
      explanation: "听不懂 = não entendi ao ouvir. 请再说一遍 pede repetição; 我不会说中文 = não sei falar.",
    },
    learnedRefs: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:wobuhui", "chunk:nihao", "chunk:nihaoma"],
    dedicatedLesson: true,
  },
  {
    kind: "conversation_scene",
    sceneId: "nao-falo-chinês",
    title: "Não falo chinês",
    setting: "street",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好！你会说中文吗？",
        pinyin: "nǐ hǎo! nǐ huì shuō Zhōngwén ma?",
        pt: "Olá! Você fala chinês?",
        emotion: "happy",
        audioText: "你好！你会说中文吗",
      },
      {
        speakerId: "mei",
        hanzi: "我不会说中文。",
        pinyin: "wǒ bú huì shuō Zhōngwén.",
        pt: "Não falo chinês.",
        emotion: "confused",
        audioText: "我不会说中文",
      },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "A conversa acelerou e você não sabe falar chinês. O que diz?",
      options: ["我不会说中文", "谢谢", "再见", "我很好"],
      correctAnswer: "我不会说中文",
      explanation: "我不会说中文 protege você: não sei falar chinês.",
    },
    learnedRefs: ["chunk:nihao", "chunk:wobuhui", "chunk:nihaoma"],
  },
  {
    kind: "conversation_scene",
    sceneId: "como-se-chama",
    title: "Como você se chama?",
    setting: "school",
    characters: PAIR_LIN_MEI,
    lines: [
      {
        speakerId: "lin",
        hanzi: "你好！你叫什么？",
        pinyin: "nǐ hǎo! nǐ jiào shénme?",
        pt: "Olá! Como você se chama?",
        emotion: "happy",
        audioText: "你好！你叫什么？",
      },
      {
        speakerId: "mei",
        hanzi: "我叫马修。",
        pinyin: "wǒ jiào Mǎxiū.",
        pt: "Meu nome é Matheus.",
        emotion: "happy",
        audioText: "我叫马修",
      },
    ],
    checkpoint: {
      type: "order_reply",
      prompt: "Monte a resposta: meu nome é Matheus.",
      options: ["我", "叫", "马修", "你好", "谢谢"],
      correctAnswer: "我叫马修",
      explanation: "我叫 + nome responde 你叫什么？",
    },
    learnedRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wojiao"],
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
