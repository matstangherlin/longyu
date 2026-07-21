/**
 * Cenas curtas de conversa entre dois personagens.
 * Vocabulário: só chunks/hànzì já ensinados + no máximo 1 novidade (newRefs).
 */

export type ConversationSetting = "classroom" | "street" | "shop" | "home" | "park" | "school";
export type ConversationEmotion = "neutral" | "happy" | "confused" | "thinking";
export type ConversationCheckpointType = "choose_reply" | "fill_reply" | "choose_meaning" | "order_reply";

/** Papel pedagógico da cena — define quantas falas/intervenções ela deve ter. */
export type ConversationSceneRole = "common" | "module_review" | "immersion";

/** Resultado de uma cena para o histórico do aluno. */
export type ConversationResult = "completed" | "mistake" | "abandoned";

/**
 * Registro no histórico de conversas do aluno. Alimenta a rotação
 * personalizada (diversidade por histórico real) e o nível da variante.
 */
export interface ConversationHistoryEntry {
  sceneId: string;
  intent: string;
  completedAt: number;
  lessonId: string;
  result: ConversationResult;
  attempts: number;
  /** Nível de assistência da variante exibida (guided → audio_first). */
  assistanceLevel?: ConversationVariantLevel;
  /** Resposta principal esperada na cena (quando conhecida). */
  mainAnswer?: string;
  /** Refs `chunk:`/`char:` problemáticos nesta realização. */
  errorRefs?: string[];
  /** Cenário (setting) da cena — ajuda a reabrir a intenção noutro lugar. */
  setting?: ConversationSetting;
}

/** Limite local do histórico de conversas (mais recentes primeiro). */
export const CONVERSATION_HISTORY_LIMIT = 100;

/**
 * Nível de apresentação de uma cena que reaparece — sobe a dificuldade sem
 * mudar o conteúdo pedagógico obrigatório:
 * - guided: com tradução e pinyin (primeira vez / aluno novo);
 * - assisted: com pinyin, sem tradução;
 * - independent: só hànzì + áudio (aluno avançado);
 * - audio_first: áudio primeiro, texto revelado ao tocar.
 */
export type ConversationVariantLevel = "guided" | "assisted" | "independent" | "audio_first";

export const CONVERSATION_VARIANT_LEVELS: readonly ConversationVariantLevel[] = [
  "guided",
  "assisted",
  "independent",
  "audio_first",
];

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
// O catálogo autoral usa só V2; `sceneV2` deriva lines + checkpoint para
// rollback (`VITE_ENABLE_CONVERSATION_V2=false`) e relatórios legados.
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
  /** Papel pedagógico: comum (6–10 falas), revisão de módulo (10–14), imersão (14–24, ramificada). */
  sceneRole?: ConversationSceneRole;
  /**
   * Vocabulário obrigatório: tudo que a cena realmente MOSTRA (caminho principal
   * + ramos) e que precisa ter sido ensinado antes. Controla a elegibilidade —
   * a cena só entra quando todos os requiredRefs estão disponíveis e pelo menos
   * um toca o foco da lição. (Nome histórico do campo: `learnedRefs`.)
   */
  learnedRefs: string[];
  /**
   * Vocabulário auxiliar: pode enriquecer a cena quando já foi aprendido, mas
   * não é necessário para entender a intenção. Não bloqueia a elegibilidade e
   * não aparece no texto renderizado quando ausente — serve de metadado para
   * variantes e para a pontuação (um optionalRef já conhecido soma como
   * revisão). Nunca deve conter frase essencial da intenção.
   */
  optionalRefs?: string[];
  newRefs?: string[];
  /** Lição dedicada pode apresentar mais de 1 novidade. */
  dedicatedLesson?: boolean;
  /**
   * Variantes por estágio da MESMA cena/intenção. O nível de topo (nodes +
   * learnedRefs) é a versão canônica/avançada; as variantes são versões mais
   * simples usadas enquanto o vocabulário mais rico ainda não foi aprendido.
   * A elegibilidade usa a variante mais simples (menor vocabulário exigido),
   * então a versão avançada nunca aparece antes do currículo correspondente.
   */
  variants?: ConversationSceneVariant[];
}

export type ConversationSceneVariantStage = "beginner" | "intermediate" | "advanced";

export interface ConversationSceneVariant {
  /** Estágio: beginner < intermediate < advanced (mais rico). */
  stage: ConversationSceneVariantStage;
  /** Fase mínima do currículo para liberar esta variante (default: sem gate). */
  minPhaseOrder?: number;
  /** requiredRefs desta variante — o que ELA mostra. */
  learnedRefs: string[];
  newRefs?: string[];
  entryNodeId?: string;
  nodes: ConversationNode[];
}

const VARIANT_STAGE_RANK: Record<ConversationSceneVariantStage, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

interface ResolvedConversationScene {
  nodes?: ConversationNode[];
  entryNodeId?: string;
  lines: ConversationLine[];
  learnedRefs: string[];
  newRefs?: string[];
  stage: ConversationSceneVariantStage;
  minPhaseOrder: number;
}

/** Todas as "camadas" renderizáveis da cena: o topo (avançado) + as variantes. */
function conversationSceneLayers(scene: ConversationSceneStep): ResolvedConversationScene[] {
  const base: ResolvedConversationScene = {
    nodes: scene.nodes,
    entryNodeId: scene.entryNodeId,
    lines: scene.lines,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
    stage: "advanced",
    minPhaseOrder: 0,
  };
  const variants = (scene.variants ?? []).map((variant) => ({
    nodes: variant.nodes,
    entryNodeId: variant.entryNodeId,
    lines: linesFromNodes(variant.nodes, variant.entryNodeId),
    learnedRefs: variant.learnedRefs,
    newRefs: variant.newRefs,
    stage: variant.stage,
    minPhaseOrder: variant.minPhaseOrder ?? 0,
  }));
  return [base, ...variants];
}

/** Camada mais simples (menor vocabulário) — a que controla a elegibilidade. */
function simplestConversationLayer(scene: ConversationSceneStep): ResolvedConversationScene {
  const layers = conversationSceneLayers(scene);
  return layers.reduce((best, layer) => (layer.learnedRefs.length < best.learnedRefs.length ? layer : best));
}

/** Menor conjunto de requiredRefs entre as camadas — controla a elegibilidade. */
export function minimalRequiredRefs(scene: ConversationSceneStep): string[] {
  if (!scene.variants?.length) return scene.learnedRefs;
  return simplestConversationLayer(scene).learnedRefs;
}

/** Fase mínima em que a cena pode aparecer (gate da variante mais simples). */
export function minimalRequiredPhase(scene: ConversationSceneStep): number {
  if (!scene.variants?.length) return 0;
  return simplestConversationLayer(scene).minPhaseOrder;
}

export interface ConversationSceneResolveContext {
  /** Refs disponíveis ao aluno (foco + revisão + currículo até aqui). */
  availableRefs?: ReadonlySet<string>;
  phaseOrder?: number;
}

/**
 * Escolhe a camada mais rica cujos requiredRefs já estão disponíveis e cuja
 * fase mínima foi alcançada. Sem variantes, retorna a cena canônica. Nunca
 * apresenta uma versão cujo vocabulário ainda não foi ensinado.
 */
export function resolveConversationScene(
  scene: ConversationSceneStep,
  context: ConversationSceneResolveContext = {}
): ResolvedConversationScene {
  const layers = conversationSceneLayers(scene);
  if (layers.length === 1) return layers[0];
  const available = context.availableRefs;
  const phaseOrder = context.phaseOrder ?? Number.POSITIVE_INFINITY;
  // Uma camada só é renderizável se TODO o seu vocabulário já foi aprendido e a
  // fase mínima foi alcançada — nunca mostramos vocabulário não ensinado.
  const renderable = layers.filter((layer) => {
    if (phaseOrder < layer.minPhaseOrder) return false;
    if (!available) return layer.stage === "beginner";
    return layer.learnedRefs.every((ref) => available.has(ref));
  });
  if (renderable.length > 0) {
    // Entre as renderáveis, a mais rica.
    return renderable.reduce((best, layer) =>
      VARIANT_STAGE_RANK[layer.stage] > VARIANT_STAGE_RANK[best.stage] ? layer : best
    );
  }
  // Nenhuma camada qualifica (ex.: fase muito cedo): caia para a MAIS SIMPLES,
  // nunca para a avançada — o piso seguro é sempre a versão iniciante.
  return layers.reduce((best, layer) =>
    VARIANT_STAGE_RANK[layer.stage] < VARIANT_STAGE_RANK[best.stage] ? layer : best
  );
}

/** Refs obrigatórios de uma cena (o que ela mostra e precisa estar aprendido). */
export function requiredConversationRefs(scene: Pick<ConversationSceneStep, "learnedRefs" | "newRefs">): string[] {
  return [...scene.learnedRefs, ...(scene.newRefs ?? [])];
}

export interface ConversationSceneEligibilityInput {
  /** Refs do foco + revisão da lição atual (type:id). */
  lessonRefs: ReadonlySet<string>;
  /** Vocabulário já ensinado pelo currículo até a lição (type:id). */
  knownRefs?: ReadonlySet<string>;
  /** Revisão de módulo libera cenas module_review. */
  isReviewLesson?: boolean;
  /** Lição de imersão libera cenas immersion e as dedicadas. */
  allowImmersion?: boolean;
  /** Geração comum exclui cenas dedicadas (só entram onde foram inseridas à mão). */
  generatedContext?: boolean;
  /** Fase da lição — barra variantes iniciantes cedo demais (ex.: água exige 水). */
  phaseOrder?: number;
}

/**
 * Uma cena é elegível para uma lição quando:
 * - todos os requiredRefs (learnedRefs) estão disponíveis (foco/revisão OU
 *   currículo até aqui) — a única novidade (newRefs) é apresentada pela cena;
 * - pelo menos um requiredRef toca o foco/revisão da lição;
 * - o papel pedagógico é permitido nessa lição;
 * - cenas dedicadas não vazam para a geração comum.
 * optionalRefs NUNCA entram nessa conta: ausentes, são apenas omitidos.
 */
export function isConversationSceneEligible(
  scene: ConversationSceneStep,
  input: ConversationSceneEligibilityInput
): boolean {
  if (scene.learnedRefs.length === 0) return false;
  const role = scene.sceneRole ?? "common";
  if (role === "immersion" && !input.allowImmersion) return false;
  if (role === "module_review" && !input.isReviewLesson && !input.allowImmersion) return false;
  // Cenas dedicadas (mais de 1 novidade, ou marcadas) são material autoral: só
  // entram na geração comum quando a lição é de imersão/dedicada.
  const dedicated = Boolean(scene.dedicatedLesson) || (scene.newRefs?.length ?? 0) > 1;
  if (dedicated && input.generatedContext && !input.allowImmersion) return false;
  // A elegibilidade usa a variante mais simples: a cena pode entrar cedo na sua
  // forma iniciante; a variante avançada só é renderizada quando seu
  // vocabulário estiver disponível (ver resolveConversationScene). A fase
  // mínima da variante mais simples também é respeitada (ex.: a água só entra
  // a partir da fase em que 水 é ensinado, nunca numa lição de tom).
  if (input.phaseOrder != null && input.phaseOrder < minimalRequiredPhase(scene)) return false;
  const required = minimalRequiredRefs(scene);
  const touchesFocus = required.some((ref) => input.lessonRefs.has(ref));
  if (!touchesFocus) return false;
  return required.every((ref) => input.lessonRefs.has(ref) || Boolean(input.knownRefs?.has(ref)));
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
 * Cena V2: as `lines` (caminho principal) e um `checkpoint` de fallback são
 * derivados dos nós — assim o player V1 (rollback por feature flag) e o
 * histórico por sceneId continuam válidos sem depender do formato antigo.
 */
function sceneV2(scene: Omit<ConversationSceneStep, "kind" | "lines">): ConversationSceneStep {
  const nodes = scene.nodes ?? [];
  const main = conversationSceneMainPath(nodes, scene.entryNodeId);
  const firstInteraction = main.find((node) => node.interaction)?.interaction;
  const checkpoint: ConversationCheckpoint | undefined =
    scene.checkpoint ??
    (firstInteraction
      ? {
          type:
            firstInteraction.type === "listen_reply" || firstInteraction.type === "fill_reply"
              ? "choose_reply"
              : (firstInteraction.type as ConversationCheckpointType),
          prompt: firstInteraction.prompt,
          options: firstInteraction.options,
          correctAnswer: firstInteraction.correctAnswer,
          explanation: firstInteraction.explanation,
        }
      : undefined);
  return {
    kind: "conversation_scene",
    ...scene,
    lines: linesFromNodes(nodes, scene.entryNodeId),
    checkpoint,
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
  // Preferir o papel pedagógico (tamanhos V2); o comprimento só afin…34599 tokens truncated…iàn: wǒ yào zhège.", pt: "Fale de novo: eu quero este.", emotion: "thinking", nextNodeId: "mercado-12" },
    {
      id: "mercado-14",
      speakerId: "wang",
      hanzi: "好！",
      pinyin: "hǎo!",
      pt: "Fechado!",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Agradeça antes de sair.",
        options: ["谢谢", "太贵了", "你好吗", "三"],
        correctAnswer: "谢谢",
        correctNextNodeId: "mercado-14b",
        wrongNextNodeId: "mercado-15",
        explanation: "谢谢 fecha a compra com educação.",
      },
    },
    { id: "mercado-15", speakerId: "wang", hanzi: "谢谢。请再说一遍。", pinyin: "xièxie. qǐng zài shuō yí biàn.", pt: "Obrigado. Tente de novo.", emotion: "thinking", nextNodeId: "mercado-14" },
    { id: "mercado-14b", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "mercado-16" },
    { id: "mercado-16", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy", nextNodeId: "mercado-17" },
    { id: "mercado-17", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:qingwen", "chunk:woxianghe", "char:you", "char:san", "chunk:woyao", "chunk:duoshaoqian", "char:shi10", "chunk:taiguile", "char:bu", "chunk:qingzaishuoyibian", "chunk:xiexie", "chunk:zaijian", "chunk:bukeqi"],
}),
sceneV2({
  sceneId: "imersao-estacao",
  title: "Imersão: na estação de trem",
  intent: "immersion-station",
  setting: "street",
  characters: PAIR_LIN_WANG,
  sceneRole: "immersion",
  entryNodeId: "estacao-0",
  nodes: [
    { id: "estacao-0", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "estacao-1" },
    {
      id: "estacao-1",
      speakerId: "lin",
      hanzi: "请问，火车站在哪里？",
      pinyin: "qǐng wèn, huǒchēzhàn zài nǎlǐ?",
      pt: "Com licença, onde fica a estação de trem?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin está procurando?",
        options: ["A estação de trem.", "Chá.", "A casa da amiga.", "Três amigos."],
        correctAnswer: "A estação de trem.",
        correctNextNodeId: "estacao-3",
        wrongNextNodeId: "estacao-2",
        explanation: "火车站在哪里？ pergunta onde fica a estação de trem.",
      },
    },
    { id: "estacao-2", speakerId: "wang", hanzi: "火车站。请再说一遍。", pinyin: "huǒchēzhàn. qǐng zài shuō yí biàn.", pt: "Estação de trem. Tente de novo.", emotion: "thinking", nextNodeId: "estacao-1" },
    {
      id: "estacao-3",
      speakerId: "wang",
      hanzi: "那是火车站。在那里。",
      pinyin: "nà shì huǒchēzhàn. zài nàlǐ.",
      pt: "Aquilo é a estação de trem. Fica ali.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Wang respondeu?",
        options: ["Fica ali.", "Custa dez.", "Espere um pouco.", "Obrigado."],
        correctAnswer: "Fica ali.",
        correctNextNodeId: "estacao-5",
        wrongNextNodeId: "estacao-4",
        explanation: "在那里 = fica ali.",
      },
    },
    { id: "estacao-4", speakerId: "wang", hanzi: "那是人吗？不！在那里。", pinyin: "nà shì rén ma? bù! zài nàlǐ.", pt: "Aquilo é uma pessoa? Não! Fica ali. (pista)", emotion: "thinking", nextNodeId: "estacao-3" },
    { id: "estacao-5", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Certo, obrigado!", emotion: "happy", nextNodeId: "estacao-6" },
    { id: "estacao-6", speakerId: "wang", hanzi: "不客气。", pinyin: "bú kèqi.", pt: "De nada.", nextNodeId: "estacao-7" },
    {
      id: "estacao-7",
      speakerId: "lin",
      hanzi: "请问，票多少钱？",
      pinyin: "qǐng wèn, piào duōshao qián?",
      pt: "Com licença, quanto custa a passagem?",
      interaction: {
        type: "choose_meaning",
        prompt: "Agora Lin pergunta sobre o quê?",
        options: ["O preço da passagem.", "Onde fica a casa.", "Se tem chá.", "Se Wang está bem."],
        correctAnswer: "O preço da passagem.",
        correctNextNodeId: "estacao-9",
        wrongNextNodeId: "estacao-8",
        explanation: "票多少钱？ = quanto custa a passagem?",
      },
    },
    { id: "estacao-8", speakerId: "wang", hanzi: "票，多少钱。请再说一遍。", pinyin: "piào, duōshao qián. qǐng zài shuō yí biàn.", pt: "Passagem, quanto custa. Tente de novo.", emotion: "thinking", nextNodeId: "estacao-7" },
    { id: "estacao-9", speakerId: "wang", hanzi: "十。", pinyin: "shí.", pt: "Dez.", nextNodeId: "estacao-9b" },
    { id: "estacao-9b", speakerId: "lin", hanzi: "好。", pinyin: "hǎo.", pt: "Está bem.", emotion: "thinking", nextNodeId: "estacao-10" },
    {
      id: "estacao-10",
      speakerId: "lin",
      hanzi: "我要这个。",
      pinyin: "wǒ yào zhège.",
      pt: "Eu quero este.",
      interaction: {
        type: "order_reply",
        prompt: "Compre apontando: eu quero este.",
        options: ["我", "要", "这", "个", "票"],
        correctAnswer: "我要这个",
        correctNextNodeId: "estacao-12",
        wrongNextNodeId: "estacao-11",
        explanation: "我要这个 compra o bilhete apontando.",
      },
    },
    { id: "estacao-11", speakerId: "wang", hanzi: "请再说一遍：我要这个。", pinyin: "qǐng zài shuō yí biàn: wǒ yào zhège.", pt: "Fale de novo: eu quero este.", emotion: "thinking", nextNodeId: "estacao-10" },
    {
      id: "estacao-12",
      speakerId: "wang",
      hanzi: "好，等一下。",
      pinyin: "hǎo, děng yíxià.",
      pt: "Está bem, espere um pouco.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Wang pediu?",
        options: ["Espere um pouco.", "Vá embora.", "Negocie.", "Coma agora."],
        correctAnswer: "Espere um pouco.",
        correctNextNodeId: "estacao-12b",
        wrongNextNodeId: "estacao-13",
        explanation: "等一下 = espere um pouco.",
      },
    },
    { id: "estacao-13", speakerId: "wang", hanzi: "等一下。请再说一遍。", pinyin: "děng yíxià. qǐng zài shuō yí biàn.", pt: "Espere um pouco. Tente de novo.", emotion: "thinking", nextNodeId: "estacao-12" },
    { id: "estacao-12b", speakerId: "lin", hanzi: "好，等一下。", pinyin: "hǎo, děng yíxià.", pt: "Certo, vou esperar um pouco.", emotion: "thinking", nextNodeId: "estacao-14" },
    {
      id: "estacao-14",
      speakerId: "wang",
      hanzi: "票。",
      pinyin: "piào.",
      pt: "A passagem.",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Receba a passagem com educação; ou saia sem agradecer.",
        options: ["谢谢", "再见"],
        correctAnswer: "谢谢",
        correctNextNodeId: "estacao-16",
        wrongNextNodeId: "estacao-awkward-1",
        explanation: "谢谢 agradece; 再见 encerra de forma apressada.",
      },
    },
    { id: "estacao-awkward-1", speakerId: "lin", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo. (saiu sem agradecer)", emotion: "confused", nextNodeId: "estacao-awkward-2" },
    { id: "estacao-awkward-2", speakerId: "wang", hanzi: "好……再见。", pinyin: "hǎo…… zàijiàn.", pt: "Tudo bem... até logo.", emotion: "thinking" },
    { id: "estacao-16", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "estacao-17" },
    { id: "estacao-17", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!", emotion: "happy", nextNodeId: "estacao-18" },
    { id: "estacao-18", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:qingwen", "chunk:nashirenm", "chunk:nihao", "chunk:qingzaishuoyibian", "chunk:xiexie", "chunk:bukeqi", "char:shi10", "chunk:woyao", "chunk:zaijian"],
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
    { id: "visita-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "visita-2" },
    { id: "visita-2", speakerId: "lin", hanzi: "你好！谢谢！", pinyin: "nǐ hǎo! xièxie!", pt: "Olá! Obrigado!", emotion: "happy", nextNodeId: "visita-3" },
    {
      id: "visita-3",
      speakerId: "mei",
      hanzi: "这是我妈妈。",
      pinyin: "zhè shì wǒ māma.",
      pt: "Esta é minha mãe.",
      interaction: {
        type: "choose_reply",
        prompt: "Cumprimente a mãe de Mei com uma frase natural.",
        options: ["认识你很高兴", "再见", "太贵了", "我饿了"],
        correctAnswer: "认识你很高兴",
        correctNextNodeId: "visita-5",
        wrongNextNodeId: "visita-4",
        explanation: "认识你很高兴 = prazer em conhecer.",
      },
    },
    { id: "visita-4", speakerId: "mei", hanzi: "我妈妈。请再说一遍。", pinyin: "wǒ māma. qǐng zài shuō yí biàn.", pt: "Minha mãe. Tente de novo.", emotion: "thinking", nextNodeId: "visita-3" },
    { id: "visita-5", speakerId: "lin", hanzi: "认识你很高兴！", pinyin: "rènshi nǐ hěn gāoxìng!", pt: "Prazer em conhecer!", emotion: "happy", nextNodeId: "visita-6" },
    {
      id: "visita-6",
      speakerId: "mei",
      hanzi: "这是我爸爸。",
      pinyin: "zhè shì wǒ bàba.",
      pt: "Este é meu pai.",
      interaction: {
        type: "choose_meaning",
        prompt: "Quem Mei apresentou agora?",
        options: ["O pai dela.", "A mãe dela.", "Um vendedor.", "Três amigos."],
        correctAnswer: "O pai dela.",
        correctNextNodeId: "visita-8",
        wrongNextNodeId: "visita-7",
        explanation: "爸爸 = pai.",
      },
    },
    { id: "visita-7", speakerId: "mei", hanzi: "爸爸。请再说一遍。", pinyin: "bàba. qǐng zài shuō yí biàn.", pt: "Pai. Tente de novo.", emotion: "thinking", nextNodeId: "visita-6" },
    {
      id: "visita-8",
      speakerId: "mei",
      hanzi: "你想喝茶吗？",
      pinyin: "nǐ xiǎng hē chá ma?",
      pt: "Você quer beber chá?",
      interaction: {
        type: "choose_reply",
        prompt: "Escolha um caminho: aceitar o chá ou recusar com educação.",
        options: ["我想喝茶", "不，谢谢"],
        correctAnswer: "我想喝茶",
        correctNextNodeId: "visita-10",
        wrongNextNodeId: "visita-decline-1",
        explanation: "我想喝茶 aceita; 不，谢谢 recusa educadamente.",
      },
    },
    { id: "visita-decline-1", speakerId: "lin", hanzi: "不，谢谢。", pinyin: "bù, xièxie.", pt: "Não, obrigado.", emotion: "thinking", nextNodeId: "visita-decline-2" },
    { id: "visita-decline-2", speakerId: "mei", hanzi: "好。明天见？", pinyin: "hǎo. míngtiān jiàn?", pt: "Tudo bem. Até amanhã?", emotion: "happy", nextNodeId: "visita-decline-3" },
    { id: "visita-decline-3", speakerId: "lin", hanzi: "明天见！再见！", pinyin: "míngtiān jiàn! zàijiàn!", pt: "Até amanhã! Até logo!", emotion: "happy" },
    { id: "visita-10", speakerId: "lin", hanzi: "我想喝茶。", pinyin: "wǒ xiǎng hē chá.", pt: "Quero beber chá.", emotion: "happy", nextNodeId: "visita-10b" },
    { id: "visita-10b", speakerId: "mei", hanzi: "好。", pinyin: "hǎo.", pt: "Certo.", emotion: "happy", nextNodeId: "visita-11" },
    {
      id: "visita-11",
      speakerId: "mei",
      hanzi: "好，这是茶。",
      pinyin: "hǎo, zhè shì chá.",
      pt: "Certo, isto é chá.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Mei trouxe?",
        options: ["Chá.", "Passagem.", "Água.", "Arroz."],
        correctAnswer: "Chá.",
        correctNextNodeId: "visita-13",
        wrongNextNodeId: "visita-12",
        explanation: "茶 = chá.",
      },
    },
    { id: "visita-12", speakerId: "mei", hanzi: "茶。请再说一遍。", pinyin: "chá. qǐng zài shuō yí biàn.", pt: "Chá. Tente de novo.", emotion: "thinking", nextNodeId: "visita-11" },
    {
      id: "visita-13",
      speakerId: "mei",
      hanzi: "你好吗？",
      pinyin: "nǐ hǎo ma?",
      pt: "Tudo bem?",
      interaction: {
        type: "choose_reply",
        prompt: "Responda que está bem.",
        options: ["我很好", "太贵了", "票多少钱", "再见"],
        correctAnswer: "我很好",
        correctNextNodeId: "visita-15",
        wrongNextNodeId: "visita-14",
        explanation: "我很好 responde 你好吗？",
      },
    },
    { id: "visita-14", speakerId: "mei", hanzi: "你好吗？我很好。", pinyin: "nǐ hǎo ma? wǒ hěn hǎo.", pt: "Tudo bem? Estou bem.", emotion: "thinking", nextNodeId: "visita-13" },
    { id: "visita-15", speakerId: "lin", hanzi: "我很好！", pinyin: "wǒ hěn hǎo!", pt: "Estou bem!", emotion: "happy", nextNodeId: "visita-16" },
    {
      id: "visita-16",
      speakerId: "mei",
      hanzi: "很好！明天见？",
      pinyin: "hěn hǎo! míngtiān jiàn?",
      pt: "Que bom! Até amanhã?",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Confirme o encontro de amanhã.",
        options: ["明天见", "再见", "不，谢谢", "太贵了"],
        correctAnswer: "明天见",
        correctNextNodeId: "visita-18",
        wrongNextNodeId: "visita-17",
        explanation: "明天见 confirma: até amanhã.",
      },
    },
    { id: "visita-17", speakerId: "mei", hanzi: "明天见。请再说一遍。", pinyin: "míngtiān jiàn. qǐng zài shuō yí biàn.", pt: "Até amanhã. Tente de novo.", emotion: "thinking", nextNodeId: "visita-16" },
    { id: "visita-18", speakerId: "lin", hanzi: "明天见！再见！", pinyin: "míngtiān jiàn! zàijiàn!", pt: "Até amanhã! Até logo!", emotion: "happy", nextNodeId: "visita-19" },
    { id: "visita-19", speakerId: "mei", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:xiexie", "chunk:zheshimama", "chunk:qingzaishuoyibian", "chunk:zheshibaba", "chunk:woxianghe", "char:bu", "chunk:nihaoma", "chunk:wohenhao", "chunk:zaijian", "chunk:taiguile", "chunk:woele"],
  newRefs: ["chunk:renshinihengaoxing", "chunk:mingtianjian"],
  dedicatedLesson: true,
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
  // Só os requiredRefs (learnedRefs) precisam estar disponíveis; optionalRefs
  // ausentes são simplesmente omitidos.
  return CONVERSATION_SCENES.filter((scene) => scene.learnedRefs.every((ref) => refSet.has(ref)));
}
