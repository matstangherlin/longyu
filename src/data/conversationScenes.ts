/**
 * Cenas curtas de conversa entre dois personagens.
 * Vocabulário: só chunks/hànzì já ensinados + no máximo 1 novidade (newRefs).
 */

export type ConversationSetting = "classroom" | "street" | "shop" | "home" | "park" | "school";
export type ConversationEmotion = "neutral" | "happy" | "confused" | "thinking";
export type ConversationCheckpointType = "choose_reply" | "fill_reply" | "choose_meaning" | "order_reply";

/** Papel pedagógico da cena — define quantas falas/intervenções ela deve ter. */
export type ConversationSceneRole = "common" | "module_review" | "immersion";

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

// ————————————————————————————————————————————————————————————————
// Conversation Scene V2: estrutura por nós.
//
// Cada nó é uma fala; um nó pode terminar com uma intervenção do aluno
// (interaction). O fluxo segue nextNodeId / correctNextNodeId /
// wrongNextNodeId — o erro nunca encerra a conversa: o ramo errado leva a um
// nó em que o personagem repete, corrige, demonstra confusão ou dá uma
// pista curta, e o fluxo volta (ou segue) até um nó terminal.
// As cenas V1 (lines + checkpoint) continuam funcionando sem alteração.
// ————————————————————————————————————————————————————————————————

export type ConversationInteractionType =
  | "choose_reply"
  | "order_reply"
  | "choose_meaning"
  | "fill_reply"
  | "listen_reply";

export interface ConversationInteraction {
  type: ConversationInteractionType;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  correctNextNodeId: string;
  wrongNextNodeId?: string;
  explanation?: string;
}

export interface ConversationNode {
  id: string;
  speakerId: string;
  hanzi: string;
  pinyin: string;
  pt?: string;
  audioText?: string;
  emotion?: ConversationEmotion;
  /** Próximo nó; ausente e sem interação = fim da conversa. */
  nextNodeId?: string;
  interaction?: ConversationInteraction;
}

export interface ConversationSceneStep {
  kind: "conversation_scene";
  title: string;
  sceneId: string;
  setting: ConversationSetting;
  characters: ConversationCharacter[];
  lines: ConversationLine[];
  checkpoint?: ConversationCheckpoint;
  /** V2 (opcional): fluxo por nós com múltiplas intervenções e ramificação. Tem precedência sobre lines+checkpoint no player. */
  nodes?: ConversationNode[];
  /** Nó inicial do fluxo V2 (default: primeiro nó da lista). */
  entryNodeId?: string;
  /** Intenção comunicativa da cena (cumprimentar, agradecer, pedir-chá…) — usada na seleção. */
  intent: string;
  /** Dificuldade 1–3; ausente = derivada do número de falas. */
  difficulty?: 1 | 2 | 3;
  /** Papel pedagógico: comum (3–6 falas), revisão de módulo (5–10), imersão (8–16, ramificada). */
  sceneRole?: ConversationSceneRole;
  learnedRefs: string[];
  newRefs?: string[];
  /** Lição dedicada pode apresentar mais de 1 novidade. */
  dedicatedLesson?: boolean;
}

const PAIR_LIN_MEI: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "mei", name: "Mei", avatar: "mei", side: "right" },
];

const PAIR_LIN_WANG: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "wang", name: "Wang", avatar: "wang", side: "right" },
];

const PAIR_LIN_HUA: ConversationCharacter[] = [
  { id: "lin", name: "Lin", avatar: "lin", side: "left" },
  { id: "hua", name: "Prof. Hua", avatar: "hua", side: "right" },
];

/** Caminho principal de uma cena V2: entry → nextNodeId/correctNextNodeId até o terminal. */
export function conversationSceneMainPath(nodes: readonly ConversationNode[], entryNodeId?: string): ConversationNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const path: ConversationNode[] = [];
  let current = byId.get(entryNodeId ?? nodes[0]?.id ?? "");
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.push(current);
    const nextId = current.interaction?.correctNextNodeId ?? current.nextNodeId;
    current = nextId ? byId.get(nextId) : undefined;
  }
  return path;
}

function linesFromNodes(nodes: readonly ConversationNode[], entryNodeId?: string): ConversationLine[] {
  return conversationSceneMainPath(nodes, entryNodeId).map((node) => ({
    speakerId: node.speakerId,
    hanzi: node.hanzi,
    pinyin: node.pinyin,
    pt: node.pt,
    emotion: node.emotion,
    audioText: node.audioText,
  }));
}

/**
 * Cena V2: as `lines` (caminho principal) são derivadas dos nós, mantendo a
 * compatibilidade com o player V1, os validadores e o contexto de erro.
 */
function sceneV2(scene: Omit<ConversationSceneStep, "kind" | "lines">): ConversationSceneStep {
  return {
    kind: "conversation_scene",
    ...scene,
    lines: linesFromNodes(scene.nodes ?? [], scene.entryNodeId),
  };
}

export interface ConversationSceneStats {
  /** Falas do caminho principal (V2) ou lines (V1). */
  lineCount: number;
  /** Intervenções do aluno no caminho principal (V2) ou checkpoint (V1). */
  interactionCount: number;
  /** Há ramo de erro que não apenas repete o mesmo nó. */
  branching: boolean;
  /** Nós terminais distintos alcançáveis (conclusões diferentes). */
  endingCount: number;
}

export function conversationSceneStats(scene: ConversationSceneStep): ConversationSceneStats {
  if (scene.nodes?.length) {
    const byId = new Map(scene.nodes.map((node) => [node.id, node]));
    const main = conversationSceneMainPath(scene.nodes, scene.entryNodeId);
    const terminals = new Set<string>();
    for (const node of scene.nodes) {
      const exits = [node.nextNodeId, node.interaction?.correctNextNodeId, node.interaction?.wrongNextNodeId].filter(
        (id): id is string => Boolean(id && byId.has(id))
      );
      if (exits.length === 0) terminals.add(node.id);
    }
    return {
      lineCount: main.length,
      interactionCount: main.filter((node) => node.interaction).length,
      branching: scene.nodes.some((node) => Boolean(node.interaction?.wrongNextNodeId)),
      endingCount: terminals.size,
    };
  }
  return {
    lineCount: scene.lines.length,
    interactionCount: scene.checkpoint ? 1 : 0,
    branching: false,
    endingCount: 1,
  };
}

export function conversationSceneDifficulty(scene: ConversationSceneStep): 1 | 2 | 3 {
  if (scene.difficulty) return scene.difficulty;
  const { lineCount } = conversationSceneStats(scene);
  return lineCount <= 4 ? 1 : lineCount <= 8 ? 2 : 3;
}

/** Resposta principal da cena: checkpoint (V1) ou primeira interação (V2). */
export function conversationSceneMainAnswer(scene: ConversationSceneStep): string | undefined {
  if (scene.nodes?.length) {
    const withInteraction = conversationSceneMainPath(scene.nodes, scene.entryNodeId).find((node) => node.interaction);
    return withInteraction?.interaction?.correctAnswer ?? scene.checkpoint?.correctAnswer;
  }
  return scene.checkpoint?.correctAnswer;
}

// ————————————————————————————————————————————————————————————————
// Seleção de cena: pontuação em vez de "primeira candidata".
// ————————————————————————————————————————————————————————————————

export interface ConversationSceneLessonInfo {
  phaseOrder?: number;
  /** Refs (type:id) do foco atual da lição. */
  focusRefs: ReadonlySet<string>;
  /** Refs de vocabulário antigo (revisão) da lição. */
  reviewRefs: ReadonlySet<string>;
  /** Cenas já presentes na lição (passos autorais). */
  usedSceneIds?: ReadonlySet<string>;
  /** Intenções já trabalhadas na lição. */
  usedIntents?: ReadonlySet<string>;
  /** Respostas principais já usadas na lição (normalizadas). */
  usedAnswers?: ReadonlySet<string>;
}

export interface ConversationSceneSelectionContext {
  /** Últimas cenas vistas pelo aluno, mais recente primeiro (persistido). */
  recentConversationSceneIds?: readonly string[];
  /** Últimas intenções vistas pelo aluno, mais recente primeiro (persistido). */
  recentConversationIntentIds?: readonly string[];
}

export function normalizeConversationAnswer(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/[，。！？、,.!?\s]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function scoreConversationScene(
  scene: ConversationSceneStep,
  lesson: ConversationSceneLessonInfo,
  context: ConversationSceneSelectionContext = {}
): number {
  let score = 0;
  const refs = [...scene.learnedRefs, ...(scene.newRefs ?? [])];

  // +40: trabalha o foco atual da lição (com desempate: quanto mais refs do
  // foco a cena cobre, melhor ela "trabalha" o foco).
  const matchedFocus = refs.filter((ref) => lesson.focusRefs.has(ref)).length;
  if (matchedFocus > 0) score += 40 + Math.min(8, (matchedFocus - 1) * 2);
  // +25: reutiliza vocabulário antigo (revisão) além do foco.
  const matchedReview = refs.filter((ref) => lesson.reviewRefs.has(ref) && !lesson.focusRefs.has(ref)).length;
  if (matchedReview > 0) score += 25 + Math.min(5, matchedReview - 1);
  // +20: a intenção ainda não apareceu na lição.
  if (!lesson.usedIntents?.has(scene.intent)) score += 20;
  // +15: dificuldade adequada à fase — cedo pede cenas curtas; fases
  // avançadas pedem conversas mais longas (2 falas já não desafiam).
  const difficulty = conversationSceneDifficulty(scene);
  const phaseOrder = lesson.phaseOrder ?? 1;
  const adequate = phaseOrder <= 2 ? difficulty === 1 : phaseOrder <= 5 ? difficulty <= 2 : difficulty >= 2;
  if (adequate) score += 15;
  // +10: cenário diferente da última cena vista.
  const recentScenes = context.recentConversationSceneIds ?? [];
  const lastScene = recentScenes[0] ? conversationSceneById[recentScenes[0]] : undefined;
  if (!lastScene || lastScene.setting !== scene.setting) score += 10;
  // -80: apareceu entre as três cenas mais recentes (ou já está na lição).
  if (recentScenes.slice(0, 3).includes(scene.sceneId)) score -= 80;
  if (lesson.usedSceneIds?.has(scene.sceneId)) score -= 80;
  // -50: repete a mesma intenção das cenas recentes.
  if ((context.recentConversationIntentIds ?? []).slice(0, 3).includes(scene.intent)) score -= 50;
  // -30: repete a mesma resposta principal já usada na lição.
  const mainAnswer = normalizeConversationAnswer(conversationSceneMainAnswer(scene));
  if (mainAnswer && lesson.usedAnswers?.has(mainAnswer)) score -= 30;

  return score;
}

/** Melhor cena entre as candidatas — pontuação desc., empate resolve pela ordem do catálogo. */
export function pickBestConversationScene(
  candidates: readonly ConversationSceneStep[],
  lesson: ConversationSceneLessonInfo,
  context: ConversationSceneSelectionContext = {}
): ConversationSceneStep | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = scoreConversationScene(best, lesson, context);
  for (const scene of candidates.slice(1)) {
    const score = scoreConversationScene(scene, lesson, context);
    if (score > bestScore) {
      best = scene;
      bestScore = score;
    }
  }
  return best;
}

export const CONVERSATION_SCENES: ConversationSceneStep[] = [
  {
    kind: "conversation_scene",
    sceneId: "primeiro-cumprimento",
    title: "Primeiro cumprimento",
    intent: "greet",
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
    intent: "ask-wellbeing",
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
    intent: "thank",
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
    intent: "farewell",
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
    intent: "introduce-self",
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
    intent: "greet-review",
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
    intent: "ask-repeat",
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
    intent: "polite-question",
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
    intent: "ask-origin",
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
    intent: "repair-not-understood",
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
    intent: "cannot-speak",
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
    intent: "ask-name",
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
  // ————————————————————————————————————————————————————————————————
  // Cenas V2 (nós + interações). O erro não encerra a conversa: o ramo
  // errado leva a repetição, correção, confusão ou uma pista curta.
  // ————————————————————————————————————————————————————————————————
  sceneV2({
    sceneId: "pedir-agua",
    title: "Pedir água",
    intent: "ask-water",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "common",
    entryNodeId: "agua-1",
    nodes: [
      { id: "agua-1", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "agua-2" },
      { id: "agua-2", speakerId: "lin", hanzi: "请问，我要水。", pinyin: "qǐng wèn, wǒ yào shuǐ.", pt: "Com licença, eu quero água.", nextNodeId: "agua-3" },
      {
        id: "agua-3",
        speakerId: "wang",
        hanzi: "好！",
        pinyin: "hǎo!",
        pt: "Está bem!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Wang te entrega a água. O que você diz?",
          options: ["谢谢", "再见", "你好", "我要这个"],
          correctAnswer: "谢谢",
          correctNextNodeId: "agua-5",
          wrongNextNodeId: "agua-4",
          explanation: "谢谢 agradece — Wang acabou de te ajudar.",
        },
      },
      { id: "agua-4", speakerId: "wang", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "confused", nextNodeId: "agua-3" },
      { id: "agua-5", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:qingwen", "chunk:woyao", "char:shui", "chunk:xiexie", "chunk:qingzaishuoyibian", "chunk:bukeqi", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "pedir-cha",
    title: "Pedir chá",
    intent: "ask-tea",
    setting: "home",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "cha-1",
    nodes: [
      { id: "cha-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá! Fique à vontade!", emotion: "happy", nextNodeId: "cha-2" },
      { id: "cha-2", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", nextNodeId: "cha-3" },
      {
        id: "cha-3",
        speakerId: "mei",
        hanzi: "你想喝茶吗？",
        pinyin: "nǐ xiǎng hē chá ma?",
        pt: "Você quer beber chá?",
        interaction: {
          type: "order_reply",
          prompt: "Responda: quero beber chá.",
          options: ["我", "想", "喝", "茶", "好"],
          correctAnswer: "我想喝茶",
          correctNextNodeId: "cha-5",
          wrongNextNodeId: "cha-4",
          explanation: "我想喝茶 = quero beber chá — aceita a oferta.",
        },
      },
      { id: "cha-4", speakerId: "mei", hanzi: "什么？请再说一遍。", pinyin: "shénme? qǐng zài shuō yí biàn.", pt: "O quê? Fale de novo, por favor.", emotion: "confused", nextNodeId: "cha-3" },
      { id: "cha-5", speakerId: "mei", hanzi: "好！", pinyin: "hǎo!", pt: "Está bem!", emotion: "happy", nextNodeId: "cha-6" },
      { id: "cha-6", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "cha-7" },
      { id: "cha-7", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!" },
    ],
    learnedRefs: ["chunk:xiexie", "chunk:nihao", "chunk:nihaoma", "chunk:woxianghe", "chunk:zheshishenme", "chunk:qingzaishuoyibian", "chunk:bukeqi"],
  }),
  sceneV2({
    sceneId: "perguntar-quantidade",
    title: "Quantos você quer?",
    intent: "ask-quantity",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "common",
    entryNodeId: "qtd-1",
    nodes: [
      { id: "qtd-1", speakerId: "wang", hanzi: "你好！你要什么？", pinyin: "nǐ hǎo! nǐ yào shénme?", pt: "Olá! O que você quer?", emotion: "happy", nextNodeId: "qtd-2" },
      { id: "qtd-2", speakerId: "lin", hanzi: "我要茶。", pinyin: "wǒ yào chá.", pt: "Eu quero chá.", nextNodeId: "qtd-3" },
      {
        id: "qtd-3",
        speakerId: "wang",
        hanzi: "好！",
        pinyin: "hǎo!",
        pt: "Está bem! (esperando a quantidade)",
        interaction: {
          type: "choose_reply",
          prompt: "Você quer TRÊS chás. Diga a quantidade.",
          options: ["我要三个", "我要这个", "太贵了", "谢谢"],
          correctAnswer: "我要三个",
          correctNextNodeId: "qtd-5",
          wrongNextNodeId: "qtd-4",
          explanation: "我要三个 diz a quantidade: quero três (三个).",
        },
      },
      { id: "qtd-4", speakerId: "wang", hanzi: "什么？", pinyin: "shénme?", pt: "O quê? Quantos?", emotion: "thinking", nextNodeId: "qtd-3" },
      { id: "qtd-5", speakerId: "wang", hanzi: "好！三个！", pinyin: "hǎo! sān ge!", pt: "Está bem, três!", emotion: "happy", nextNodeId: "qtd-6" },
      { id: "qtd-6", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", nextNodeId: "qtd-7" },
      { id: "qtd-7", speakerId: "wang", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:woyao", "chunk:zheshishenme", "chunk:woxianghe", "char:san", "chunk:xiexie", "chunk:bukeqi", "chunk:taiguile"],
  }),
  sceneV2({
    sceneId: "comprar-itens",
    title: "Comprando e negociando",
    intent: "buy-items",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "module_review",
    entryNodeId: "comprar-1",
    nodes: [
      { id: "comprar-1", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "comprar-2" },
      { id: "comprar-2", speakerId: "lin", hanzi: "你好！请问，多少钱？", pinyin: "nǐ hǎo! qǐng wèn, duōshao qián?", pt: "Olá! Com licença, quanto custa?", nextNodeId: "comprar-3" },
      {
        id: "comprar-3",
        speakerId: "wang",
        hanzi: "十！",
        pinyin: "shí!",
        pt: "Dez!",
        interaction: {
          type: "choose_reply",
          prompt: "Ficou caro para você. Como reage?",
          options: ["太贵了", "太好了", "好的", "谢谢"],
          correctAnswer: "太贵了",
          correctNextNodeId: "comprar-5",
          wrongNextNodeId: "comprar-4",
          explanation: "太贵了 abre a negociação: caro demais!",
        },
      },
      { id: "comprar-4", speakerId: "wang", hanzi: "什么？", pinyin: "shénme?", pt: "O quê?", emotion: "confused", nextNodeId: "comprar-3" },
      { id: "comprar-5", speakerId: "wang", hanzi: "好，好！不贵！", pinyin: "hǎo, hǎo! bú guì!", pt: "Está bem, está bem! Faço mais barato — assim não fica caro!", emotion: "thinking", nextNodeId: "comprar-6" },
      {
        id: "comprar-6",
        speakerId: "lin",
        hanzi: "太好了！",
        pinyin: "tài hǎo le!",
        pt: "Que ótimo!",
        emotion: "happy",
        interaction: {
          type: "order_reply",
          prompt: "Monte: eu quero este.",
          options: ["我", "要", "这", "个", "太"],
          correctAnswer: "我要这个",
          correctNextNodeId: "comprar-8",
          wrongNextNodeId: "comprar-7",
          explanation: "我要这个 fecha a compra: eu quero este.",
        },
      },
      { id: "comprar-7", speakerId: "wang", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "confused", nextNodeId: "comprar-6" },
      { id: "comprar-8", speakerId: "wang", hanzi: "好！谢谢！", pinyin: "hǎo! xièxie!", pt: "Está bem! Obrigado!", emotion: "happy", nextNodeId: "comprar-9" },
      { id: "comprar-9", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", nextNodeId: "comprar-10" },
      { id: "comprar-10", speakerId: "wang", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:qingwen", "chunk:duoshaoqian", "char:shi10", "char:bu", "chunk:taiguile", "chunk:woyao", "chunk:qingzaishuoyibian", "chunk:xiexie", "chunk:zaijian", "chunk:zheshishenme"],
  }),
  sceneV2({
    sceneId: "identificar-pessoa",
    title: "Quem é aquela pessoa?",
    intent: "identify-person",
    setting: "park",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "pessoa-1",
    nodes: [
      { id: "pessoa-1", speakerId: "lin", hanzi: "那是人吗？", pinyin: "nà shì rén ma?", pt: "Aquilo ali é uma pessoa? Quem é?", emotion: "thinking", nextNodeId: "pessoa-2" },
      {
        id: "pessoa-2",
        speakerId: "mei",
        hanzi: "那是我妈妈！",
        pinyin: "nà shì wǒ māma!",
        pt: "Aquela é a minha mãe!",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Mei disse?",
          options: ["Aquela é a minha mãe.", "Aquele é o meu pai.", "Aquilo é uma árvore.", "Não entendi."],
          correctAnswer: "Aquela é a minha mãe.",
          correctNextNodeId: "pessoa-4",
          wrongNextNodeId: "pessoa-3",
          explanation: "妈妈 = mãe; 那是我妈妈 apresenta alguém de longe.",
        },
      },
      { id: "pessoa-3", speakerId: "mei", hanzi: "我妈妈！", pinyin: "wǒ māma!", pt: "Minha mãe!", emotion: "thinking", nextNodeId: "pessoa-2" },
      { id: "pessoa-4", speakerId: "lin", hanzi: "你妈妈很好！", pinyin: "nǐ māma hěn hǎo!", pt: "Sua mãe é muito legal!", emotion: "happy", nextNodeId: "pessoa-5" },
      { id: "pessoa-5", speakerId: "mei", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigada!" },
    ],
    learnedRefs: ["chunk:nashirenm", "chunk:zheshimama", "chunk:wohenhao", "chunk:nihao", "chunk:xiexie"],
  }),
  sceneV2({
    sceneId: "encontrar-amigo",
    title: "Encontrando um amigo",
    intent: "meet-friend",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "amigo-1",
    nodes: [
      { id: "amigo-1", speakerId: "lin", hanzi: "你好，朋友！", pinyin: "nǐ hǎo, péngyou!", pt: "Olá, amigo!", emotion: "happy", nextNodeId: "amigo-2" },
      { id: "amigo-2", speakerId: "mei", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "amigo-3" },
      {
        id: "amigo-3",
        speakerId: "lin",
        hanzi: "我很好！",
        pinyin: "wǒ hěn hǎo!",
        pt: "Estou bem!",
        interaction: {
          type: "choose_reply",
          prompt: "Convide seu amigo para irem juntos.",
          options: ["我们走吧", "再见", "我听不懂", "太贵了"],
          correctAnswer: "我们走吧",
          correctNextNodeId: "amigo-5",
          wrongNextNodeId: "amigo-4",
          explanation: "我们走吧 = vamos! Convite direto para sair juntos.",
        },
      },
      { id: "amigo-4", speakerId: "mei", hanzi: "什么？", pinyin: "shénme?", pt: "O quê?", emotion: "confused", nextNodeId: "amigo-3" },
      { id: "amigo-5", speakerId: "mei", hanzi: "很好！我们走吧！", pinyin: "hěn hǎo! wǒmen zǒu ba!", pt: "Que ótimo! Vamos!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:pengyou", "chunk:nihaoma", "chunk:wohenhao", "chunk:womenzouba", "chunk:zheshishenme"],
  }),
  sceneV2({
    sceneId: "onde-esta",
    title: "Onde fica?",
    intent: "ask-where",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "onde-1",
    nodes: [
      { id: "onde-1", speakerId: "lin", hanzi: "请问，山在哪里？", pinyin: "qǐng wèn, shān zài nǎlǐ?", pt: "Com licença, onde fica a montanha?", emotion: "thinking", nextNodeId: "onde-2" },
      {
        id: "onde-2",
        speakerId: "mei",
        hanzi: "在那里！",
        pinyin: "zài nàlǐ!",
        pt: "Fica ali!",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Mei respondeu?",
          options: ["Fica ali.", "Custa dez.", "Não sei.", "Espere um pouco."],
          correctAnswer: "Fica ali.",
          correctNextNodeId: "onde-4",
          wrongNextNodeId: "onde-3",
          explanation: "在那里 = fica ali (apontando).",
        },
      },
      { id: "onde-3", speakerId: "mei", hanzi: "在——那——里！", pinyin: "zài — nà — lǐ!", pt: "Fi-ca a-li! (repetindo devagar)", emotion: "thinking", nextNodeId: "onde-2" },
      { id: "onde-4", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Está bem, obrigado!", emotion: "happy", nextNodeId: "onde-5" },
      { id: "onde-5", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!" },
    ],
    learnedRefs: ["chunk:qingwen", "char:shan", "chunk:zaina", "chunk:nashirenm", "chunk:nihao", "chunk:xiexie", "chunk:bukeqi"],
  }),
  sceneV2({
    sceneId: "apontar-natureza",
    title: "Apontando a paisagem",
    intent: "point-nature",
    setting: "park",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "natureza-1",
    nodes: [
      { id: "natureza-1", speakerId: "lin", hanzi: "那是山！", pinyin: "nà shì shān!", pt: "Olha, aquilo é uma montanha!", emotion: "happy", nextNodeId: "natureza-2" },
      { id: "natureza-2", speakerId: "mei", hanzi: "这是什么？", pinyin: "zhè shì shénme?", pt: "O que é isto?", emotion: "thinking", nextNodeId: "natureza-3" },
      {
        id: "natureza-3",
        speakerId: "lin",
        hanzi: "这是木。",
        pinyin: "zhè shì mù.",
        pt: "Isto é uma árvore.",
        interaction: {
          type: "choose_reply",
          prompt: "Mei aponta para o SOL. O que ela diz?",
          options: ["那是日", "那是月", "那是山", "那是木"],
          correctAnswer: "那是日",
          correctNextNodeId: "natureza-5",
          wrongNextNodeId: "natureza-4",
          explanation: "日 = sol. 月 é a lua, 山 a montanha, 木 a árvore.",
        },
      },
      { id: "natureza-4", speakerId: "lin", hanzi: "不是！", pinyin: "bú shì!", pt: "Não é! Olhe de novo!", emotion: "confused", nextNodeId: "natureza-3" },
      { id: "natureza-5", speakerId: "mei", hanzi: "那是日！", pinyin: "nà shì rì!", pt: "Aquilo é o sol!", emotion: "happy", nextNodeId: "natureza-6" },
      { id: "natureza-6", speakerId: "lin", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Isso! Muito bem!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:wohenhao", "chunk:nashirenm", "char:shan", "chunk:zheshishenme", "char:mu", "char:bu", "char:shi", "char:ri", "char:yue"],
  }),
  sceneV2({
    sceneId: "sala-de-aula",
    title: "Primeiro dia de aula",
    intent: "classroom-intro",
    setting: "classroom",
    characters: PAIR_LIN_HUA,
    sceneRole: "common",
    entryNodeId: "aula-1",
    nodes: [
      { id: "aula-1", speakerId: "hua", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá! Bem-vindo à aula!", emotion: "happy", nextNodeId: "aula-2" },
      { id: "aula-2", speakerId: "lin", hanzi: "你好！我是学生。", pinyin: "nǐ hǎo! wǒ shì xuésheng.", pt: "Olá! Sou estudante.", nextNodeId: "aula-3" },
      {
        id: "aula-3",
        speakerId: "hua",
        hanzi: "你叫什么？",
        pinyin: "nǐ jiào shénme?",
        pt: "Como você se chama?",
        interaction: {
          type: "order_reply",
          prompt: "Apresente-se ao professor: meu nome é Matheus.",
          options: ["我", "叫", "马修", "好"],
          correctAnswer: "我叫马修",
          correctNextNodeId: "aula-5",
          wrongNextNodeId: "aula-4",
          explanation: "我叫 + nome responde 你叫什么？",
        },
      },
      { id: "aula-4", speakerId: "hua", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "confused", nextNodeId: "aula-3" },
      { id: "aula-5", speakerId: "hua", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wojiao", "chunk:qingzaishuoyibian", "chunk:wohenhao"],
    newRefs: ["chunk:woshixuesheng"],
  }),
  sceneV2({
    sceneId: "pedir-ajuda",
    title: "Pedindo ajuda",
    intent: "ask-help",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "ajuda-1",
    nodes: [
      { id: "ajuda-1", speakerId: "lin", hanzi: "请问！", pinyin: "qǐng wèn!", pt: "Com licença!", emotion: "confused", nextNodeId: "ajuda-2" },
      { id: "ajuda-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá! O que houve?", nextNodeId: "ajuda-3" },
      { id: "ajuda-3", speakerId: "lin", hanzi: "我听不懂中文。", pinyin: "wǒ tīng bù dǒng Zhōngwén.", pt: "Não estou entendendo o chinês.", emotion: "confused", nextNodeId: "ajuda-4" },
      {
        id: "ajuda-4",
        speakerId: "mei",
        hanzi: "我会说一点！",
        pinyin: "wǒ huì shuō yìdiǎn!",
        pt: "Eu falo um pouco!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Mei vai te ajudar. O que você diz?",
          options: ["谢谢", "太贵了", "再见", "我要米饭"],
          correctAnswer: "谢谢",
          correctNextNodeId: "ajuda-6",
          wrongNextNodeId: "ajuda-5",
          explanation: "谢谢 agradece a ajuda que Mei ofereceu.",
        },
      },
      { id: "ajuda-5", speakerId: "mei", hanzi: "什么？", pinyin: "shénme?", pt: "O quê?", emotion: "confused", nextNodeId: "ajuda-4" },
      { id: "ajuda-6", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "ajuda-7" },
      { id: "ajuda-7", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!" },
    ],
    learnedRefs: ["chunk:qingwen", "chunk:nihao", "chunk:tingbudong", "chunk:wobuhui", "chunk:wohuishuoyidian", "chunk:zheshishenme", "chunk:xiexie", "chunk:bukeqi"],
  }),
  sceneV2({
    sceneId: "fale-de-novo",
    title: "Fale de novo, por favor",
    intent: "ask-slow-repeat",
    setting: "classroom",
    characters: PAIR_LIN_HUA,
    sceneRole: "common",
    entryNodeId: "devagar-1",
    nodes: [
      { id: "devagar-1", speakerId: "hua", hanzi: "你好！你叫什么？", pinyin: "nǐ hǎo! nǐ jiào shénme?", pt: "Olá! Como você se chama? (falando rápido)", nextNodeId: "devagar-2" },
      {
        id: "devagar-2",
        speakerId: "lin",
        hanzi: "我会说一点中文。",
        pinyin: "wǒ huì shuō yìdiǎn Zhōngwén.",
        pt: "Eu falo só um pouco de chinês.",
        emotion: "confused",
        interaction: {
          type: "order_reply",
          prompt: "Peça para o professor falar de novo, com calma.",
          options: ["请", "再", "说", "一", "遍"],
          correctAnswer: "请再说一遍",
          correctNextNodeId: "devagar-4",
          wrongNextNodeId: "devagar-3",
          explanation: "请再说一遍 pede a repetição com educação — seu melhor aliado no começo.",
        },
      },
      { id: "devagar-3", speakerId: "hua", hanzi: "请——再——说——一——遍！", pinyin: "qǐng — zài — shuō — yí — biàn!", pt: "Por favor — fale — de — novo! (modelando a frase)", emotion: "happy", nextNodeId: "devagar-2" },
      { id: "devagar-4", speakerId: "hua", hanzi: "好！你——叫——什——么？", pinyin: "hǎo! nǐ — jiào — shén — me?", pt: "Está bem! Como — você — se — chama? (bem devagar)", emotion: "thinking", nextNodeId: "devagar-5" },
      { id: "devagar-5", speakerId: "lin", hanzi: "我叫马修！", pinyin: "wǒ jiào Mǎxiū!", pt: "Meu nome é Matheus!", emotion: "happy", nextNodeId: "devagar-6" },
      { id: "devagar-6", speakerId: "hua", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wohuishuoyidian", "chunk:qingzaishuoyibian", "chunk:wojiao", "chunk:wohenhao"],
  }),
  sceneV2({
    sceneId: "encontro-amanha",
    title: "Até amanhã!",
    intent: "plan-tomorrow",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "amanha-1",
    nodes: [
      { id: "amanha-1", speakerId: "lin", hanzi: "明天见？", pinyin: "míngtiān jiàn?", pt: "Até amanhã? (propondo o encontro)", emotion: "thinking", nextNodeId: "amanha-2" },
      {
        id: "amanha-2",
        speakerId: "mei",
        hanzi: "好！明天见！",
        pinyin: "hǎo! míngtiān jiàn!",
        pt: "Combinado! Até amanhã!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Confirme o combinado de amanhã.",
          options: ["明天见", "你好", "谢谢", "我饿了"],
          correctAnswer: "明天见",
          correctNextNodeId: "amanha-4",
          wrongNextNodeId: "amanha-3",
          explanation: "明天见 = até amanhã — confirma o encontro.",
        },
      },
      { id: "amanha-3", speakerId: "mei", hanzi: "明天……？", pinyin: "míngtiān……?", pt: "Amanhã...?", emotion: "confused", nextNodeId: "amanha-2" },
      { id: "amanha-4", speakerId: "mei", hanzi: "很好！再见！", pinyin: "hěn hǎo! zàijiàn!", pt: "Ótimo! Tchau!", emotion: "happy", nextNodeId: "amanha-5" },
      { id: "amanha-5", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:mingtianjian", "chunk:nihao", "chunk:wohenhao", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "o-que-e-isto",
    title: "O que é isto?",
    intent: "ask-what-object",
    setting: "home",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "isto-1",
    nodes: [
      { id: "isto-1", speakerId: "lin", hanzi: "这是什么？", pinyin: "zhè shì shénme?", pt: "O que é isto?", emotion: "thinking", nextNodeId: "isto-2" },
      { id: "isto-2", speakerId: "mei", hanzi: "这是茶。", pinyin: "zhè shì chá.", pt: "Isto é chá.", nextNodeId: "isto-3" },
      { id: "isto-3", speakerId: "lin", hanzi: "这是水吗？", pinyin: "zhè shì shuǐ ma?", pt: "E isto é água?", emotion: "thinking", nextNodeId: "isto-4" },
      {
        id: "isto-4",
        speakerId: "mei",
        hanzi: "是！这是水！",
        pinyin: "shì! zhè shì shuǐ!",
        pt: "Sim! Isto é água!",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Mei confirmou?",
          options: ["Isto é água.", "Isto é chá.", "Isto é arroz.", "Isto é caro."],
          correctAnswer: "Isto é água.",
          correctNextNodeId: "isto-6",
          wrongNextNodeId: "isto-5",
          explanation: "水 = água; 是 confirma: sim, é isso.",
        },
      },
      { id: "isto-5", speakerId: "mei", hanzi: "这是水。", pinyin: "zhè shì shuǐ.", pt: "Isto é água. (repetindo devagar)", emotion: "thinking", nextNodeId: "isto-4" },
      { id: "isto-6", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Entendi! Obrigado!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:zheshishenme", "chunk:woxianghe", "chunk:zheshishui", "chunk:nihaoma", "chunk:nihao", "chunk:xiexie"],
  }),
  sceneV2({
    sceneId: "conversa-em-casa",
    title: "Visita rápida em casa",
    intent: "home-chat",
    setting: "home",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "casa-1",
    nodes: [
      { id: "casa-1", speakerId: "mei", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "casa-2" },
      { id: "casa-2", speakerId: "lin", hanzi: "我很好！你呢？", pinyin: "wǒ hěn hǎo! nǐ ne?", pt: "Estou bem! E você?", nextNodeId: "casa-3" },
      {
        id: "casa-3",
        speakerId: "mei",
        hanzi: "我很好！",
        pinyin: "wǒ hěn hǎo!",
        pt: "Estou bem!",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que 你呢 fez na conversa?",
          options: ["Devolveu a pergunta: e você?", "Pediu para repetir.", "Encerrou a conversa.", "Pediu chá."],
          correctAnswer: "Devolveu a pergunta: e você?",
          correctNextNodeId: "casa-5",
          wrongNextNodeId: "casa-4",
          explanation: "你呢 devolve a pergunta que acabaram de te fazer: e você?",
        },
      },
      { id: "casa-4", speakerId: "mei", hanzi: "你呢？——我很好！", pinyin: "nǐ ne? — wǒ hěn hǎo!", pt: "\"E você?\" — e eu respondi: estou bem! (pista)", emotion: "thinking", nextNodeId: "casa-3" },
      { id: "casa-5", speakerId: "lin", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Que bom!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"],
    newRefs: ["chunk:nine"],
  }),
  sceneV2({
    sceneId: "conversa-na-loja",
    title: "Conversa rápida na loja",
    intent: "shop-chat",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "common",
    entryNodeId: "loja-1",
    nodes: [
      { id: "loja-1", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "loja-2" },
      { id: "loja-2", speakerId: "lin", hanzi: "你好！我要这个。", pinyin: "nǐ hǎo! wǒ yào zhège.", pt: "Olá! Eu quero este.", nextNodeId: "loja-3" },
      {
        id: "loja-3",
        speakerId: "wang",
        hanzi: "好！",
        pinyin: "hǎo!",
        pt: "Está bem!",
        interaction: {
          type: "choose_reply",
          prompt: "Pergunte o preço antes de fechar.",
          options: ["多少钱？", "你好吗？", "我们走吧", "明天见"],
          correctAnswer: "多少钱？",
          correctNextNodeId: "loja-5",
          wrongNextNodeId: "loja-4",
          explanation: "多少钱 pergunta o preço.",
        },
      },
      { id: "loja-4", speakerId: "wang", hanzi: "什么？", pinyin: "shénme?", pt: "O quê?", emotion: "confused", nextNodeId: "loja-3" },
      { id: "loja-5", speakerId: "wang", hanzi: "不贵！", pinyin: "bú guì!", pt: "Não é caro!", emotion: "happy", nextNodeId: "loja-6" },
      { id: "loja-6", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Está bem, obrigado!", nextNodeId: "loja-7" },
      { id: "loja-7", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:woyao", "chunk:duoshaoqian", "chunk:zheshishenme", "char:bu", "chunk:taiguile", "chunk:xiexie", "chunk:bukeqi", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "revisao-restaurante",
    title: "No restaurante",
    intent: "restaurant-review",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "module_review",
    entryNodeId: "rest-1",
    nodes: [
      { id: "rest-1", speakerId: "lin", hanzi: "我饿了！我们吃饭吧！", pinyin: "wǒ è le! wǒmen chīfàn ba!", pt: "Estou com fome! Vamos comer!", emotion: "thinking", nextNodeId: "rest-2" },
      {
        id: "rest-2",
        speakerId: "wang",
        hanzi: "你好！你要什么？",
        pinyin: "nǐ hǎo! nǐ yào shénme?",
        pt: "Olá! O que você deseja?",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Peça este prato, apontando para ele.",
          options: ["我要这个", "再见", "你好吗？", "我听不懂"],
          correctAnswer: "我要这个",
          correctNextNodeId: "rest-4",
          wrongNextNodeId: "rest-3",
          explanation: "我要这个 pede apontando: eu quero este.",
        },
      },
      { id: "rest-3", speakerId: "wang", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "confused", nextNodeId: "rest-2" },
      {
        id: "rest-4",
        speakerId: "wang",
        hanzi: "好！你想喝茶吗？",
        pinyin: "hǎo! nǐ xiǎng hē chá ma?",
        pt: "Está bem! Quer beber chá?",
        interaction: {
          type: "choose_reply",
          prompt: "Aceite o chá.",
          options: ["我想喝茶", "太贵了", "明天见", "我听不懂"],
          correctAnswer: "我想喝茶",
          correctNextNodeId: "rest-6",
          wrongNextNodeId: "rest-5",
          explanation: "我想喝茶 aceita: quero beber chá.",
        },
      },
      { id: "rest-5", speakerId: "wang", hanzi: "什么？", pinyin: "shénme?", pt: "O quê?", emotion: "confused", nextNodeId: "rest-4" },
      { id: "rest-6", speakerId: "lin", hanzi: "很好吃！", pinyin: "hěn hǎochī!", pt: "Muito gostoso!", emotion: "happy", nextNodeId: "rest-7" },
      { id: "rest-7", speakerId: "lin", hanzi: "多少钱？", pinyin: "duōshao qián?", pt: "Quanto ficou?", nextNodeId: "rest-8" },
      {
        id: "rest-8",
        speakerId: "wang",
        hanzi: "十！",
        pinyin: "shí!",
        pt: "Dez!",
        interaction: {
          type: "choose_meaning",
          prompt: "O que o atendente respondeu?",
          options: ["Custa dez.", "A conta chegou.", "Não tem chá.", "Está fechado."],
          correctAnswer: "Custa dez.",
          correctNextNodeId: "rest-10",
          wrongNextNodeId: "rest-9",
          explanation: "十 = dez. Ele disse o preço da refeição.",
        },
      },
      { id: "rest-9", speakerId: "wang", hanzi: "十！", pinyin: "shí!", pt: "Dez! (repetindo devagar, mostrando os dedos)", emotion: "thinking", nextNodeId: "rest-8" },
      { id: "rest-10", speakerId: "lin", hanzi: "好，谢谢！再见！", pinyin: "hǎo, xièxie! zàijiàn!", pt: "Está bem, obrigado! Até logo!", emotion: "happy", nextNodeId: "rest-11" },
      { id: "rest-11", speakerId: "wang", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!" },
    ],
    learnedRefs: ["chunk:woele", "chunk:womenchifanba", "chunk:nihao", "chunk:woyao", "chunk:zheshishenme", "chunk:qingzaishuoyibian", "chunk:woxianghe", "chunk:nihaoma", "chunk:haochi", "chunk:duoshaoqian", "char:shi10", "chunk:xiexie", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "revisao-numeros",
    title: "Contando com o professor",
    intent: "numbers-review",
    setting: "classroom",
    characters: PAIR_LIN_HUA,
    sceneRole: "module_review",
    entryNodeId: "num-1",
    nodes: [
      { id: "num-1", speakerId: "hua", hanzi: "你好！一，二，三……", pinyin: "nǐ hǎo! yī, èr, sān……", pt: "Olá! Um, dois, três...", emotion: "happy", nextNodeId: "num-2" },
      {
        id: "num-2",
        speakerId: "lin",
        hanzi: "四，五，六！",
        pinyin: "sì, wǔ, liù!",
        pt: "Quatro, cinco, seis!",
        interaction: {
          type: "choose_reply",
          prompt: "Qual número continua a sequência?",
          options: ["七", "九", "十", "二"],
          correctAnswer: "七",
          correctNextNodeId: "num-4",
          wrongNextNodeId: "num-3",
          explanation: "Depois de 六 (seis) vem 七 (sete).",
        },
      },
      { id: "num-3", speakerId: "hua", hanzi: "不是！四，五，六……", pinyin: "bú shì! sì, wǔ, liù……", pt: "Não! Quatro, cinco, seis... (e depois?)", emotion: "confused", nextNodeId: "num-2" },
      { id: "num-4", speakerId: "hua", hanzi: "七，八，九，十！", pinyin: "qī, bā, jiǔ, shí!", pt: "Isso! Sete, oito, nove, dez!", emotion: "happy", nextNodeId: "num-5" },
      {
        id: "num-5",
        speakerId: "hua",
        hanzi: "你有三个朋友吗？",
        pinyin: "nǐ yǒu sān ge péngyou ma?",
        pt: "Você tem três amigos?",
        emotion: "thinking",
        interaction: {
          type: "order_reply",
          prompt: "Responda: tenho três amigos.",
          options: ["我", "有", "三", "个", "朋", "友"],
          correctAnswer: "我有三个朋友",
          correctNextNodeId: "num-7",
          wrongNextNodeId: "num-6",
          explanation: "我有三个朋友 = tenho três amigos — 三个 conta pessoas e coisas.",
        },
      },
      { id: "num-6", speakerId: "hua", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "thinking", nextNodeId: "num-5" },
      { id: "num-7", speakerId: "lin", hanzi: "我有三个朋友！", pinyin: "wǒ yǒu sān ge péngyou!", pt: "Tenho três amigos!", emotion: "happy", nextNodeId: "num-8" },
      { id: "num-8", speakerId: "hua", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "char:yi", "char:er", "char:san", "char:si", "char:wu", "char:liu", "char:qi", "char:ba8", "char:jiu", "char:shi10", "char:bu", "char:shi", "char:you", "chunk:nihaoma", "chunk:pengyou", "chunk:woyousangepengyou", "chunk:qingzaishuoyibian", "chunk:wohenhao"],
  }),
  sceneV2({
    sceneId: "revisao-hanzi-natureza",
    title: "Hànzì na paisagem",
    intent: "hanzi-nature-review",
    setting: "park",
    characters: PAIR_LIN_MEI,
    sceneRole: "module_review",
    entryNodeId: "hanzi-1",
    nodes: [
      { id: "hanzi-1", speakerId: "mei", hanzi: "这是什么？", pinyin: "zhè shì shénme?", pt: "Olha ali! O que é aquilo?", emotion: "happy", nextNodeId: "hanzi-2" },
      {
        id: "hanzi-2",
        speakerId: "lin",
        hanzi: "这是木！",
        pinyin: "zhè shì mù!",
        pt: "Isto é uma árvore!",
        interaction: {
          type: "choose_reply",
          prompt: "Duas árvores (木 + 木) formam qual caractere?",
          options: ["林", "森", "山", "明"],
          correctAnswer: "林",
          correctNextNodeId: "hanzi-4",
          wrongNextNodeId: "hanzi-3",
          explanation: "木 + 木 = 林 (bosque). Três árvores formam 森 (floresta densa).",
        },
      },
      { id: "hanzi-3", speakerId: "mei", hanzi: "木，木！", pinyin: "mù, mù!", pt: "Árvore e árvore! (pista)", emotion: "thinking", nextNodeId: "hanzi-2" },
      { id: "hanzi-4", speakerId: "mei", hanzi: "这是林！", pinyin: "zhè shì lín!", pt: "Isso! Isto é um bosque!", emotion: "happy", nextNodeId: "hanzi-5" },
      { id: "hanzi-5", speakerId: "lin", hanzi: "这是山吗？", pinyin: "zhè shì shān ma?", pt: "E isto é uma montanha?", emotion: "thinking", nextNodeId: "hanzi-6" },
      {
        id: "hanzi-6",
        speakerId: "mei",
        hanzi: "是！这是山！",
        pinyin: "shì! zhè shì shān!",
        pt: "Sim! Isto é uma montanha!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "日 (sol) + 月 (lua) formam qual caractere?",
          options: ["明", "森", "好", "什"],
          correctAnswer: "明",
          correctNextNodeId: "hanzi-8",
          wrongNextNodeId: "hanzi-7",
          explanation: "日 + 月 = 明 (claro, brilhante): as duas maiores luzes juntas.",
        },
      },
      { id: "hanzi-7", speakerId: "mei", hanzi: "日，月！", pinyin: "rì, yuè!", pt: "Sol e lua! (pista)", emotion: "thinking", nextNodeId: "hanzi-6" },
      { id: "hanzi-8", speakerId: "mei", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:wohenhao", "chunk:zheshishenme", "char:mu", "char:lin", "char:sen", "char:ming", "char:shan", "chunk:nihaoma", "char:ri", "char:yue", "char:shi"],
  }),
  sceneV2({
    sceneId: "imersao-mercado",
    title: "Imersão: no mercado",
    intent: "immersion-market",
    setting: "shop",
    characters: PAIR_LIN_WANG,
    sceneRole: "immersion",
    entryNodeId: "mercado-1",
    nodes: [
      { id: "mercado-1", speakerId: "wang", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "mercado-2" },
      { id: "mercado-2", speakerId: "lin", hanzi: "我很好！请问，你有茶吗？", pinyin: "wǒ hěn hǎo! qǐng wèn, nǐ yǒu chá ma?", pt: "Estou bem! Com licença, você tem chá?", nextNodeId: "mercado-3" },
      {
        id: "mercado-3",
        speakerId: "wang",
        hanzi: "有！你要什么？",
        pinyin: "yǒu! nǐ yào shénme?",
        pt: "Tenho! O que você vai levar?",
        interaction: {
          type: "choose_reply",
          prompt: "Você quer TRÊS chás. O que diz?",
          options: ["我要三个", "我要这个", "太贵了", "谢谢"],
          correctAnswer: "我要三个",
          correctNextNodeId: "mercado-5",
          wrongNextNodeId: "mercado-4",
          explanation: "我要三个 = quero três (三个). Você levou três chás.",
        },
      },
      { id: "mercado-4", speakerId: "wang", hanzi: "什么？", pinyin: "shénme?", pt: "O quê? Quantos?", emotion: "confused", nextNodeId: "mercado-3" },
      { id: "mercado-5", speakerId: "wang", hanzi: "好！三个！", pinyin: "hǎo! sān ge!", pt: "Está bem, três!", emotion: "happy", nextNodeId: "mercado-6" },
      { id: "mercado-6", speakerId: "lin", hanzi: "多少钱？", pinyin: "duōshao qián?", pt: "Quanto custa?", nextNodeId: "mercado-7" },
      {
        id: "mercado-7",
        speakerId: "wang",
        hanzi: "十！",
        pinyin: "shí!",
        pt: "Dez!",
        interaction: {
          type: "choose_reply",
          prompt: "Achou caro! Qual reação abre a negociação?",
          options: ["太贵了", "太好了", "谢谢", "好的"],
          correctAnswer: "太贵了",
          correctNextNodeId: "mercado-9",
          wrongNextNodeId: "mercado-8",
          explanation: "太贵了 = caro demais — no mercado, negociar faz parte.",
        },
      },
      { id: "mercado-8", speakerId: "wang", hanzi: "谢谢！再见！", pinyin: "xièxie! zàijiàn!", pt: "Obrigado! Até logo! (você pagou o preço cheio)", emotion: "happy", nextNodeId: "mercado-8b" },
      { id: "mercado-8b", speakerId: "lin", hanzi: "好……再见！", pinyin: "hǎo…… zàijiàn!", pt: "Tá bom... tchau! (fim alternativo: sem desconto)", emotion: "confused" },
      { id: "mercado-9", speakerId: "wang", hanzi: "好，好！不贵！", pinyin: "hǎo, hǎo! bú guì!", pt: "Está bem, está bem! Faço mais barato!", emotion: "thinking", nextNodeId: "mercado-10" },
      { id: "mercado-10", speakerId: "lin", hanzi: "太好了！我要这个！", pinyin: "tài hǎo le! wǒ yào zhège!", pt: "Ótimo! Eu quero este!", emotion: "happy", nextNodeId: "mercado-11" },
      { id: "mercado-11", speakerId: "wang", hanzi: "好！谢谢！", pinyin: "hǎo! xièxie!", pt: "Fechado! Obrigado!", emotion: "happy", nextNodeId: "mercado-12" },
      { id: "mercado-12", speakerId: "lin", hanzi: "谢谢！再见！", pinyin: "xièxie! zàijiàn!", pt: "Obrigado! Até logo!", nextNodeId: "mercado-13" },
      { id: "mercado-13", speakerId: "wang", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:qingwen", "char:you", "chunk:woxianghe", "chunk:woyao", "char:san", "char:bu", "chunk:duoshaoqian", "char:shi10", "chunk:taiguile", "chunk:zheshishenme", "chunk:xiexie", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "imersao-estacao",
    title: "Imersão: na estação de trem",
    intent: "immersion-station",
    setting: "street",
    characters: PAIR_LIN_WANG,
    sceneRole: "immersion",
    entryNodeId: "estacao-1",
    nodes: [
      { id: "estacao-1", speakerId: "lin", hanzi: "请问，火车站在哪里？", pinyin: "qǐng wèn, huǒchēzhàn zài nǎlǐ?", pt: "Com licença, onde fica a estação de trem?", emotion: "thinking", nextNodeId: "estacao-2" },
      {
        id: "estacao-2",
        speakerId: "wang",
        hanzi: "在那里！",
        pinyin: "zài nàlǐ!",
        pt: "Fica ali! Olhe!",
        interaction: {
          type: "choose_meaning",
          prompt: "O que ele respondeu?",
          options: ["Fica ali.", "Custa dez.", "Espere um pouco.", "Não sei."],
          correctAnswer: "Fica ali.",
          correctNextNodeId: "estacao-4",
          wrongNextNodeId: "estacao-3",
          explanation: "在那里 = ali; 你看 = olhe para lá.",
        },
      },
      { id: "estacao-3", speakerId: "wang", hanzi: "在——那——里！", pinyin: "zài — nà — lǐ!", pt: "Fi-ca a-li! (repetindo devagar)", emotion: "thinking", nextNodeId: "estacao-2" },
      { id: "estacao-4", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Está bem, obrigado!", emotion: "happy", nextNodeId: "estacao-5" },
      { id: "estacao-5", speakerId: "wang", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!", nextNodeId: "estacao-6" },
      { id: "estacao-6", speakerId: "lin", hanzi: "请问，票多少钱？", pinyin: "qǐng wèn, piào duōshao qián?", pt: "Com licença, quanto custa a passagem?", nextNodeId: "estacao-7" },
      {
        id: "estacao-7",
        speakerId: "wang",
        hanzi: "十！",
        pinyin: "shí!",
        pt: "Dez!",
        interaction: {
          type: "order_reply",
          prompt: "Monte: eu quero este.",
          options: ["我", "要", "这", "个", "票"],
          correctAnswer: "我要这个",
          correctNextNodeId: "estacao-9",
          wrongNextNodeId: "estacao-8",
          explanation: "我要这个 compra o bilhete apontando: quero este.",
        },
      },
      { id: "estacao-8", speakerId: "wang", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "confused", nextNodeId: "estacao-7" },
      { id: "estacao-9", speakerId: "wang", hanzi: "好！等一下！", pinyin: "hǎo! děng yíxià!", pt: "Está bem! Espere um pouco!", nextNodeId: "estacao-10" },
      {
        id: "estacao-10",
        speakerId: "wang",
        hanzi: "票！",
        pinyin: "piào!",
        pt: "Sua passagem!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Receba o bilhete com educação.",
          options: ["谢谢", "你好", "我饿了", "我们走吧"],
          correctAnswer: "谢谢",
          correctNextNodeId: "estacao-12",
          wrongNextNodeId: "estacao-11",
          explanation: "谢谢 fecha a compra com cortesia.",
        },
      },
      { id: "estacao-11", speakerId: "wang", hanzi: "什么？……好，再见！", pinyin: "shénme?…… hǎo, zàijiàn!", pt: "O quê?... Tá bom, tchau! (despedida atrapalhada — fim alternativo)", emotion: "confused" },
      { id: "estacao-12", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Boa viagem!", emotion: "happy", nextNodeId: "estacao-13" },
      { id: "estacao-13", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:qingwen", "chunk:zaina", "chunk:nashirenm", "chunk:nihao", "chunk:xiexie", "chunk:bukeqi", "char:shi10", "chunk:woyao", "chunk:qingzaishuoyibian", "chunk:zheshishenme", "chunk:zaijian"],
    // Estação, passagem e "espere um pouco" são as novidades desta imersão —
    // reservada para lição dedicada de imersão (não entra na geração comum).
    newRefs: ["chunk:huochezhanzainali", "chunk:piaoduoshaoqian", "chunk:dengyixia"],
    dedicatedLesson: true,
  }),
  sceneV2({
    sceneId: "imersao-casa-amigo",
    title: "Imersão: visita à casa da amiga",
    intent: "immersion-visit",
    setting: "home",
    characters: PAIR_LIN_MEI,
    sceneRole: "immersion",
    entryNodeId: "visita-1",
    nodes: [
      { id: "visita-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá! Entre, fique à vontade!", emotion: "happy", nextNodeId: "visita-2" },
      { id: "visita-2", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", nextNodeId: "visita-3" },
      {
        id: "visita-3",
        speakerId: "mei",
        hanzi: "这是我妈妈！",
        pinyin: "zhè shì wǒ māma!",
        pt: "Esta é a minha mãe!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Cumprimente a mãe de Mei com cortesia.",
          options: ["认识你很高兴", "再见", "买单", "我饿了"],
          correctAnswer: "认识你很高兴",
          correctNextNodeId: "visita-5",
          wrongNextNodeId: "visita-4",
          explanation: "认识你很高兴 = prazer em conhecer — o cumprimento ideal em apresentações.",
        },
      },
      { id: "visita-4", speakerId: "mei", hanzi: "什么？这是我妈妈！", pinyin: "shénme? zhè shì wǒ māma!", pt: "O quê? Esta é a minha mãe!", emotion: "confused", nextNodeId: "visita-3" },
      { id: "visita-5", speakerId: "lin", hanzi: "认识你很高兴！", pinyin: "rènshi nǐ hěn gāoxìng!", pt: "Prazer em conhecer!", emotion: "happy", nextNodeId: "visita-6" },
      { id: "visita-6", speakerId: "mei", hanzi: "这是我爸爸！", pinyin: "zhè shì wǒ bàba!", pt: "Este é o meu pai!", emotion: "happy", nextNodeId: "visita-7" },
      { id: "visita-7", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "visita-8" },
      {
        id: "visita-8",
        speakerId: "mei",
        hanzi: "你想喝茶吗？",
        pinyin: "nǐ xiǎng hē chá ma?",
        pt: "Sente-se! Quer beber chá?",
        interaction: {
          type: "choose_reply",
          prompt: "Aceite o chá da anfitriã.",
          options: ["我想喝茶", "太贵了", "票多少钱？", "我听不懂"],
          correctAnswer: "我想喝茶",
          correctNextNodeId: "visita-10",
          wrongNextNodeId: "visita-9",
          explanation: "我想喝茶 aceita a oferta: quero beber chá.",
        },
      },
      { id: "visita-9", speakerId: "mei", hanzi: "你不想喝茶吗？", pinyin: "nǐ bù xiǎng hē chá ma?", pt: "Você não quer chá? (tente de novo)", emotion: "thinking", nextNodeId: "visita-8" },
      { id: "visita-10", speakerId: "mei", hanzi: "好！", pinyin: "hǎo!", pt: "Está bem!", emotion: "happy", nextNodeId: "visita-11" },
      { id: "visita-11", speakerId: "lin", hanzi: "谢谢！你妈妈很好！", pinyin: "xièxie! nǐ māma hěn hǎo!", pt: "Obrigado! Sua mãe é muito gentil!", emotion: "happy", nextNodeId: "visita-12" },
      {
        id: "visita-12",
        speakerId: "mei",
        hanzi: "很好！",
        pinyin: "hěn hǎo!",
        pt: "Que bom!",
        emotion: "happy",
        interaction: {
          type: "choose_reply",
          prompt: "Já é tarde. Despeça-se combinando o dia de amanhã.",
          options: ["明天见", "服务员", "这是什么", "我要米饭"],
          correctAnswer: "明天见",
          correctNextNodeId: "visita-14",
          wrongNextNodeId: "visita-13",
          explanation: "明天见 despede e já marca: até amanhã!",
        },
      },
      { id: "visita-13", speakerId: "mei", hanzi: "……再见？", pinyin: "…… zàijiàn?", pt: "...Tchau? (despedida confusa — fim alternativo)", emotion: "confused" },
      { id: "visita-14", speakerId: "mei", hanzi: "好！明天见！", pinyin: "hǎo! míngtiān jiàn!", pt: "Combinado! Até amanhã!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:xiexie", "chunk:zheshimama", "chunk:zheshishenme", "chunk:zheshibaba", "chunk:woxianghe", "chunk:nihaoma", "char:bu", "chunk:wohenhao", "chunk:zaijian", "chunk:mingtianjian"],
    newRefs: ["chunk:renshinihengaoxing"],
  }),
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
  wang: { bg: "bg-[rgb(138_90_23/0.14)]", fg: "text-[rgb(138_90_23)]" },
  hua: { bg: "bg-[rgb(59_98_166/0.14)]", fg: "text-[rgb(59_98_166)]" },
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
