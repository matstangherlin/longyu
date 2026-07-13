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
  /** Nível de dificuldade pedagógica (1 = mais apoio, 5 = montar resposta). */
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
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
