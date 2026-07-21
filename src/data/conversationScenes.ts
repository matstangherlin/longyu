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
  // Preferir o papel pedagógico (tamanhos V2); o comprimento só afina dentro do papel.
  const role = scene.sceneRole;
  if (role === "immersion") return 3;
  if (role === "module_review") return 2;
  const { lineCount, interactionCount } = conversationSceneStats(scene);
  // Comum: piso 6 falas / 2 intervenções → 1; cenas mais densas sobem para 2.
  if (lineCount >= 9 || interactionCount >= 3) return 2;
  return 1;
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
  // ————— Sinais derivados do histórico real do aluno (diversidade) —————
  /** Cenas mostradas na lição imediatamente anterior (para −100). */
  lastLessonSceneIds?: readonly string[];
  /** Cenários (settings) recentes, mais recente primeiro (para −25). */
  recentSettings?: readonly string[];
  /** Toda cena que o aluno JÁ realizou (para +35 quando nunca realizada). */
  playedSceneIds?: ReadonlySet<string>;
  /** Quantas vezes cada intenção foi praticada (para +20 pouco praticada). */
  intentPracticeCount?: ReadonlyMap<string, number>;
  /** Quantas vezes cada cenário foi usado (para +15 pouco utilizado). */
  settingUsageCount?: ReadonlyMap<string, number>;
  /** Refs (chunk:/char:) de erro recente do aluno (para +20 trabalha erro). */
  recentErrorRefs?: ReadonlySet<string>;
}

/**
 * Deriva os sinais de diversidade a partir do histórico real do aluno. Sem
 * histórico, retorna apenas as listas de recência (comportamento anterior).
 */
export function conversationSelectionContextFromHistory(
  history: readonly ConversationHistoryEntry[] | undefined,
  base: Pick<ConversationSceneSelectionContext, "recentConversationSceneIds" | "recentConversationIntentIds" | "recentErrorRefs"> = {}
): ConversationSceneSelectionContext {
  const entries = [...(history ?? [])].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const playedSceneIds = new Set<string>();
  const intentPracticeCount = new Map<string, number>();
  const settingUsageCount = new Map<string, number>();
  const recentSettings: string[] = [];
  for (const entry of entries) {
    if (entry.result === "completed") playedSceneIds.add(entry.sceneId);
    intentPracticeCount.set(entry.intent, (intentPracticeCount.get(entry.intent) ?? 0) + 1);
    const setting = conversationSceneById[entry.sceneId]?.setting;
    if (setting) {
      settingUsageCount.set(setting, (settingUsageCount.get(setting) ?? 0) + 1);
      if (recentSettings.length < 10) recentSettings.push(setting);
    }
  }
  // Cenas da lição imediatamente anterior (mesmo lessonId mais recente).
  const lastLessonId = entries[0]?.lessonId;
  const lastLessonSceneIds = lastLessonId
    ? entries.filter((entry) => entry.lessonId === lastLessonId).map((entry) => entry.sceneId)
    : [];
  return {
    ...base,
    lastLessonSceneIds,
    recentSettings,
    playedSceneIds,
    intentPracticeCount,
    settingUsageCount,
  };
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
  // optionalRefs só contam para revisão quando já estão disponíveis; nunca
  // pesam no foco (a elegibilidade já garante que um requiredRef toca o foco).
  const optional = scene.optionalRefs ?? [];

  // +40: trabalha o foco atual da lição (com desempate: quanto mais refs do
  // foco a cena cobre, melhor ela "trabalha" o foco).
  const matchedFocus = refs.filter((ref) => lesson.focusRefs.has(ref)).length;
  if (matchedFocus > 0) score += 40 + Math.min(8, (matchedFocus - 1) * 2);
  // +25: reutiliza vocabulário antigo (revisão) além do foco — inclui
  // optionalRefs já aprendidos (enriquecem a cena sem serem obrigatórios).
  const matchedReview = [...refs, ...optional].filter(
    (ref) => lesson.reviewRefs.has(ref) && !lesson.focusRefs.has(ref)
  ).length;
  if (matchedReview > 0) score += 25 + Math.min(5, matchedReview - 1);
  // +20: a intenção ainda não apareceu na lição.
  if (!lesson.usedIntents?.has(scene.intent)) score += 20;
  // +15: dificuldade adequada à fase — cedo pede cenas comuns mais leves;
  // fases avançadas pedem revisões/imersões (e comuns mais densas).
  const difficulty = conversationSceneDifficulty(scene);
  const phaseOrder = lesson.phaseOrder ?? 1;
  const adequate = phaseOrder <= 2 ? difficulty === 1 : phaseOrder <= 5 ? difficulty <= 2 : difficulty >= 2;
  if (adequate) score += 15;
  // +15: combina conteúdo atual (foco) com conteúdo antigo (revisão).
  if (matchedFocus > 0 && matchedReview > 0) score += 15;

  // ————— Diversidade pelo histórico real do aluno —————
  const recentScenes = context.recentConversationSceneIds ?? [];
  const recentIntents = context.recentConversationIntentIds ?? [];
  // "Última lição": as cenas da lição anterior quando há histórico; senão a
  // cena mais recente da lista de recência (proxy usado na rotação/validação).
  const lastLessonSceneIds = context.lastLessonSceneIds ?? recentScenes.slice(0, 1);
  // −100: a mesma cena apareceu na última lição.
  if (lastLessonSceneIds.includes(scene.sceneId)) score -= 100;
  // −70: apareceu nas últimas três conversas.
  else if (recentScenes.slice(0, 3).includes(scene.sceneId)) score -= 70;
  // −25: apareceu na janela mais ampla (posições 3–9). Faz a cena "esperar a
  // vez" e impede que uma única cena domine a rotação (teto ~1 a cada 10).
  else if (recentScenes.slice(3, 10).includes(scene.sceneId)) score -= 25;
  if (lesson.usedSceneIds?.has(scene.sceneId)) score -= 100;
  // −40: a intenção apareceu nas últimas duas conversas.
  if (recentIntents.slice(0, 2).includes(scene.intent)) score -= 40;
  // −15: mesma intenção na janela ampla (espalha também por intenção).
  else if (recentIntents.slice(2, 10).includes(scene.intent)) score -= 15;
  // −25: o mesmo cenário apareceu duas vezes seguidas.
  const recentSettings = context.recentSettings ?? recentScenes.slice(0, 2).map((id) => conversationSceneById[id]?.setting ?? "");
  if (recentSettings.slice(0, 2).length === 2 && recentSettings.slice(0, 2).every((s) => s === scene.setting)) {
    score -= 25;
  }

  // +35: cena nunca realizada pelo aluno (só quando há histórico conhecido).
  if (context.playedSceneIds && !context.playedSceneIds.has(scene.sceneId)) score += 35;
  // +20: intenção pouco praticada.
  if (context.intentPracticeCount && (context.intentPracticeCount.get(scene.intent) ?? 0) <= 1) score += 20;
  // +15: cenário pouco utilizado.
  if (context.settingUsageCount && (context.settingUsageCount.get(scene.setting) ?? 0) <= 1) score += 15;
  // +20: trabalha um erro recente do aluno (revisa o chunk/intenção errado).
  if (context.recentErrorRefs && refs.some((ref) => context.recentErrorRefs!.has(ref))) score += 20;

  // −30: repete a mesma resposta principal já usada na lição.
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

/**
 * Nível da variante de apresentação para uma cena, a partir do histórico:
 * quanto mais o aluno já praticou a cena (ou quanto mais avançado ele é),
 * mais a apresentação sobe de dificuldade — sem mudar o conteúdo. Uma cena que
 * REAPARECE volta num nível acima (não exatamente a mesma versão).
 */
export function conversationVariantLevelFor(
  scene: Pick<ConversationSceneStep, "sceneId" | "intent">,
  history: readonly ConversationHistoryEntry[] | undefined
): ConversationVariantLevel {
  const entries = history ?? [];
  const timesScene = entries.filter((entry) => entry.sceneId === scene.sceneId && entry.result === "completed").length;
  const timesIntent = entries.filter((entry) => entry.intent === scene.intent && entry.result === "completed").length;
  const totalCompleted = entries.filter((entry) => entry.result === "completed").length;
  // Sobe um degrau por repetição da própria cena; intenção bem praticada e
  // aluno avançado elevam o piso mesmo numa cena nova.
  let level = timesScene;
  if (timesIntent >= 2) level = Math.max(level, 1);
  if (totalCompleted >= 6) level = Math.max(level, 1);
  if (totalCompleted >= 12) level = Math.max(level, 2);
  const index = Math.min(level, CONVERSATION_VARIANT_LEVELS.length - 1);
  return CONVERSATION_VARIANT_LEVELS[index];
}

export const CONVERSATION_SCENES: ConversationSceneStep[] = [
  // ————————————————————————————————————————————————————————————————
  // Catálogo V2 expandido: comum 6–10 falas / 2–3 intervenções;
  // revisão 10–14 / 3–5; imersão 14–24 / 5–8 (ramificada, ≥2 finais).
  // sceneIds preservados para histórico e progresso do aluno.
  // ————————————————————————————————————————————————————————————————
  sceneV2({
    sceneId: "primeiro-cumprimento",
    title: "Primeiro cumprimento",
    intent: "greet",
    setting: "school",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "primeiro-cumprimento-1",
    nodes: [
      { id: "primeiro-cumprimento-1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "primeiro-cumprimento-2" },
      { id: "primeiro-cumprimento-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "primeiro-cumprimento-3" },
      {
        id: "primeiro-cumprimento-3",
        speakerId: "mei",
        hanzi: "你？",
        pinyin: "nǐ?",
        pt: "Você?",
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: "Mei olha para você no pátio. Como você cumprimenta?",
          options: ["你好", "谢谢", "再见", "不客气"],
          correctAnswer: "你好",
          correctNextNodeId: "primeiro-cumprimento-5",
          wrongNextNodeId: "primeiro-cumprimento-4",
          explanation: "你好 é o cumprimento básico: olá.",
        },
      },
      { id: "primeiro-cumprimento-4", speakerId: "mei", hanzi: "你好？", pinyin: "nǐ hǎo?", pt: "Olá?", emotion: "confused", nextNodeId: "primeiro-cumprimento-3" },
      { id: "primeiro-cumprimento-5", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "primeiro-cumprimento-6" },
      {
        id: "primeiro-cumprimento-6",
        speakerId: "mei",
        hanzi: "好！",
        pinyin: "hǎo!",
        pt: "Bem!",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "Neste cumprimento, o que 你好 quer dizer?",
          options: ["Olá.", "Obrigado(a).", "Até logo.", "De nada."],
          correctAnswer: "Olá.",
          correctNextNodeId: "primeiro-cumprimento-8",
          wrongNextNodeId: "primeiro-cumprimento-7",
          explanation: "你好 junto funciona como olá.",
        },
      },
      { id: "primeiro-cumprimento-7", speakerId: "mei", hanzi: "你好？", pinyin: "nǐ hǎo?", pt: "Olá?", emotion: "confused", nextNodeId: "primeiro-cumprimento-6" },
      { id: "primeiro-cumprimento-8", speakerId: "lin", hanzi: "好！", pinyin: "hǎo!", pt: "Bem!", emotion: "happy", nextNodeId: "primeiro-cumprimento-9" },
      { id: "primeiro-cumprimento-9", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao"],
  }),
  sceneV2({
    sceneId: "perguntando-se-esta-bem",
    title: "Perguntando se está bem",
    intent: "ask-wellbeing",
    setting: "park",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "perguntando-se-esta-bem-1",
    nodes: [
      { id: "perguntando-se-esta-bem-1", speakerId: "lin", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "neutral", nextNodeId: "perguntando-se-esta-bem-2" },
      { id: "perguntando-se-esta-bem-2", speakerId: "mei", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "perguntando-se-esta-bem-3" },
      {
        id: "perguntando-se-esta-bem-3",
        speakerId: "mei",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "neutral",
        interaction: {
          type: "choose_reply",
          prompt: "Mei pergunta de volta. Como você responde que está bem?",
          options: ["我很好", "你好吗", "谢谢", "再见"],
          correctAnswer: "我很好",
          correctNextNodeId: "perguntando-se-esta-bem-5",
          wrongNextNodeId: "perguntando-se-esta-bem-4",
          explanation: "我很好 responde 你好吗？ dizendo que você está bem.",
        },
      },
      { id: "perguntando-se-esta-bem-4", speakerId: "mei", hanzi: "我很好？", pinyin: "wǒ hěn hǎo?", pt: "Estou bem?", emotion: "confused", nextNodeId: "perguntando-se-esta-bem-3" },
      { id: "perguntando-se-esta-bem-5", speakerId: "lin", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "perguntando-se-esta-bem-6" },
      {
        id: "perguntando-se-esta-bem-6",
        speakerId: "mei",
        hanzi: "我很好。",
        pinyin: "wǒ hěn hǎo.",
        pt: "Estou bem.",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que 我很好 comunica nesta conversa?",
          options: ["Estou bem.", "Tudo bem?", "Olá.", "Até logo."],
          correctAnswer: "Estou bem.",
          correctNextNodeId: "perguntando-se-esta-bem-8",
          wrongNextNodeId: "perguntando-se-esta-bem-7",
          explanation: "我很好 = estou bem.",
        },
      },
      { id: "perguntando-se-esta-bem-7", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "thinking", nextNodeId: "perguntando-se-esta-bem-6" },
      { id: "perguntando-se-esta-bem-8", speakerId: "mei", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihaoma", "chunk:wohenhao"],
  }),
  sceneV2({
    sceneId: "agradecendo",
    title: "Agradecendo",
    intent: "thank",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "agradecendo-1",
    nodes: [
      { id: "agradecendo-1", speakerId: "lin", hanzi: "谢谢。", pinyin: "xièxie.", pt: "Obrigado(a).", emotion: "happy", nextNodeId: "agradecendo-2" },
      { id: "agradecendo-2", speakerId: "mei", hanzi: "不客气。", pinyin: "bú kèqi.", pt: "De nada.", emotion: "happy", nextNodeId: "agradecendo-3" },
      {
        id: "agradecendo-3",
        speakerId: "mei",
        hanzi: "谢谢？",
        pinyin: "xièxie?",
        pt: "Obrigado(a)?",
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: "Mei agradece no caixa. Qual resposta educada combina?",
          options: ["不客气", "你好", "再见", "我很好"],
          correctAnswer: "不客气",
          correctNextNodeId: "agradecendo-5",
          wrongNextNodeId: "agradecendo-4",
          explanation: "不客气 responde a 谢谢: de nada.",
        },
      },
      { id: "agradecendo-4", speakerId: "mei", hanzi: "不客气？", pinyin: "bú kèqi?", pt: "De nada?", emotion: "confused", nextNodeId: "agradecendo-3" },
      { id: "agradecendo-5", speakerId: "lin", hanzi: "不客气。", pinyin: "bú kèqi.", pt: "De nada.", emotion: "happy", nextNodeId: "agradecendo-6" },
      {
        id: "agradecendo-6",
        speakerId: "mei",
        hanzi: "谢谢。",
        pinyin: "xièxie.",
        pt: "Obrigado(a).",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que 谢谢 expressa?",
          options: ["Obrigado(a).", "De nada.", "Até logo.", "Tudo bem?"],
          correctAnswer: "Obrigado(a).",
          correctNextNodeId: "agradecendo-8",
          wrongNextNodeId: "agradecendo-7",
          explanation: "谢谢 agradece uma ajuda ou gentileza.",
        },
      },
      { id: "agradecendo-7", speakerId: "mei", hanzi: "谢谢？", pinyin: "xièxie?", pt: "Obrigado(a)?", emotion: "confused", nextNodeId: "agradecendo-6" },
      { id: "agradecendo-8", speakerId: "lin", hanzi: "谢谢。", pinyin: "xièxie.", pt: "Obrigado(a).", emotion: "happy" },
    ],
    learnedRefs: ["chunk:xiexie", "chunk:bukeqi"],
  }),
  sceneV2({
    sceneId: "despedida",
    title: "Despedida",
    intent: "farewell",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "despedida-1",
    nodes: [
      { id: "despedida-1", speakerId: "lin", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "neutral", nextNodeId: "despedida-2" },
      { id: "despedida-2", speakerId: "mei", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "happy", nextNodeId: "despedida-3" },
      {
        id: "despedida-3",
        speakerId: "mei",
        hanzi: "再见？",
        pinyin: "zàijiàn?",
        pt: "Até logo?",
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: "Mei precisa sair. Como você encerra a conversa?",
          options: ["再见", "你好", "谢谢", "不客气"],
          correctAnswer: "再见",
          correctNextNodeId: "despedida-5",
          wrongNextNodeId: "despedida-4",
          explanation: "再见 fecha a conversa: até logo.",
        },
      },
      { id: "despedida-4", speakerId: "mei", hanzi: "再见？", pinyin: "zàijiàn?", pt: "Até logo?", emotion: "confused", nextNodeId: "despedida-3" },
      { id: "despedida-5", speakerId: "lin", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "happy", nextNodeId: "despedida-6" },
      {
        id: "despedida-6",
        speakerId: "mei",
        hanzi: "再见。",
        pinyin: "zàijiàn.",
        pt: "Até logo.",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "Qual é o sentido de 再见 na rua?",
          options: ["Até logo.", "Obrigado(a).", "Olá.", "Estou bem."],
          correctAnswer: "Até logo.",
          correctNextNodeId: "despedida-8",
          wrongNextNodeId: "despedida-7",
          explanation: "再见 é usado para se despedir.",
        },
      },
      { id: "despedida-7", speakerId: "mei", hanzi: "再见？", pinyin: "zàijiàn?", pt: "Até logo?", emotion: "confused", nextNodeId: "despedida-6" },
      { id: "despedida-8", speakerId: "lin", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "me-apresentando",
    title: "Me apresentando",
    intent: "introduce-self",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "me-apresentando-1",
    nodes: [
      { id: "me-apresentando-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "me-apresentando-2" },
      { id: "me-apresentando-2", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "me-apresentando-3" },
      {
        id: "me-apresentando-3",
        speakerId: "mei",
        hanzi: "你？",
        pinyin: "nǐ?",
        pt: "Você?",
        emotion: "thinking",
        interaction: {
          type: "order_reply",
          prompt: "Apresente-se para Mei: meu nome é Matheus.",
          options: ["我", "叫", "马修", "你好"],
          correctAnswer: "我叫马修",
          correctNextNodeId: "me-apresentando-5",
          wrongNextNodeId: "me-apresentando-4",
          explanation: "我叫马修 = meu nome é Matheus.",
        },
      },
      { id: "me-apresentando-4", speakerId: "mei", hanzi: "我叫马修？", pinyin: "wǒ jiào Mǎxiū?", pt: "Meu nome é Matheus?", emotion: "confused", nextNodeId: "me-apresentando-3" },
      { id: "me-apresentando-5", speakerId: "lin", hanzi: "我叫马修。", pinyin: "wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus.", emotion: "happy", nextNodeId: "me-apresentando-6" },
      {
        id: "me-apresentando-6",
        speakerId: "mei",
        hanzi: "你好，马修！",
        pinyin: "nǐ hǎo, Mǎxiū!",
        pt: "Olá, Matheus!",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que 我叫马修 comunica?",
          options: ["Meu nome é Matheus.", "Tudo bem?", "Até logo.", "De nada."],
          correctAnswer: "Meu nome é Matheus.",
          correctNextNodeId: "me-apresentando-8",
          wrongNextNodeId: "me-apresentando-7",
          explanation: "我叫 + nome apresenta quem fala.",
        },
      },
      { id: "me-apresentando-7", speakerId: "mei", hanzi: "我叫马修。", pinyin: "wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus.", emotion: "thinking", nextNodeId: "me-apresentando-6" },
      { id: "me-apresentando-8", speakerId: "lin", hanzi: "你好。", pinyin: "nǐ hǎo.", pt: "Olá.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:wojiao"],
  }),
  sceneV2({
    sceneId: "revisao-cumprimento-completo",
    title: "Primeira conversa completa",
    intent: "greet-review",
    setting: "school",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "revisao-cumprimento-completo-1",
    nodes: [
      { id: "revisao-cumprimento-completo-1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "revisao-cumprimento-completo-2" },
      { id: "revisao-cumprimento-completo-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "revisao-cumprimento-completo-3" },
      {
        id: "revisao-cumprimento-completo-3",
        speakerId: "mei",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "neutral",
        interaction: {
          type: "choose_reply",
          prompt: "Mei pergunta como você está. Responda positivamente.",
          options: ["我很好", "你好", "谢谢", "再见"],
          correctAnswer: "我很好",
          correctNextNodeId: "revisao-cumprimento-completo-5",
          wrongNextNodeId: "revisao-cumprimento-completo-4",
          explanation: "我很好 responde que você está bem.",
        },
      },
      { id: "revisao-cumprimento-completo-4", speakerId: "mei", hanzi: "我很好？", pinyin: "wǒ hěn hǎo?", pt: "Estou bem?", emotion: "confused", nextNodeId: "revisao-cumprimento-completo-3" },
      { id: "revisao-cumprimento-completo-5", speakerId: "lin", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "revisao-cumprimento-completo-6" },
      {
        id: "revisao-cumprimento-completo-6",
        speakerId: "mei",
        hanzi: "我很好，谢谢。",
        pinyin: "wǒ hěn hǎo, xièxie.",
        pt: "Estou bem, obrigado(a).",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Mei disse com 我很好，谢谢?",
          options: ["Estou bem, obrigado(a).", "Até logo.", "Olá.", "De nada."],
          correctAnswer: "Estou bem, obrigado(a).",
          correctNextNodeId: "revisao-cumprimento-completo-8",
          wrongNextNodeId: "revisao-cumprimento-completo-7",
          explanation: "我很好 diz estado; 谢谢 agradece.",
        },
      },
      { id: "revisao-cumprimento-completo-7", speakerId: "mei", hanzi: "谢谢？", pinyin: "xièxie?", pt: "Obrigado(a)?", emotion: "confused", nextNodeId: "revisao-cumprimento-completo-6" },
      { id: "revisao-cumprimento-completo-8", speakerId: "lin", hanzi: "谢谢。", pinyin: "xièxie.", pt: "Obrigado(a).", emotion: "happy", nextNodeId: "revisao-cumprimento-completo-9" },
      {
        id: "revisao-cumprimento-completo-9",
        speakerId: "mei",
        hanzi: "再见？",
        pinyin: "zàijiàn?",
        pt: "Até logo?",
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: "A conversa terminou. Como você se despede?",
          options: ["再见", "你好", "谢谢", "我很好"],
          correctAnswer: "再见",
          correctNextNodeId: "revisao-cumprimento-completo-11",
          wrongNextNodeId: "revisao-cumprimento-completo-10",
          explanation: "再见 encerra a conversa.",
        },
      },
      { id: "revisao-cumprimento-completo-10", speakerId: "mei", hanzi: "再见？", pinyin: "zàijiàn?", pt: "Até logo?", emotion: "confused", nextNodeId: "revisao-cumprimento-completo-9" },
      { id: "revisao-cumprimento-completo-11", speakerId: "lin", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "happy", nextNodeId: "revisao-cumprimento-completo-12" },
      { id: "revisao-cumprimento-completo-12", speakerId: "mei", hanzi: "再见。", pinyin: "zàijiàn.", pt: "Até logo.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:zaijian"],
  }),
  sceneV2({
    sceneId: "pedir-repeticao",
    title: "Pedir para repetir",
    intent: "ask-repeat",
    setting: "classroom",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "pedir-repeticao-1",
    nodes: [
      { id: "pedir-repeticao-1", speakerId: "lin", hanzi: "你好吗？我叫马修。", pinyin: "nǐ hǎo ma? wǒ jiào Mǎxiū.", pt: "Tudo bem? Meu nome é Matheus.", emotion: "happy", nextNodeId: "pedir-repeticao-2" },
      {
        id: "pedir-repeticao-2",
        speakerId: "mei",
        hanzi: "我听不懂。",
        pinyin: "wǒ tīng bù dǒng.",
        pt: "Não entendi.",
        emotion: "confused",
        interaction: {
          type: "choose_reply",
          prompt: "Mei não entendeu. O que ela pede com educação?",
          options: ["请再说一遍", "我很好", "谢谢", "再见"],
          correctAnswer: "请再说一遍",
          correctNextNodeId: "pedir-repeticao-4",
          wrongNextNodeId: "pedir-repeticao-3",
          explanation: "请再说一遍 pede para a pessoa falar de novo.",
        },
      },
      { id: "pedir-repeticao-3", speakerId: "mei", hanzi: "请再说一遍？", pinyin: "qǐng zài shuō yí biàn?", pt: "Por favor, fale de novo?", emotion: "confused", nextNodeId: "pedir-repeticao-2" },
      { id: "pedir-repeticao-4", speakerId: "mei", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "thinking", nextNodeId: "pedir-repeticao-5" },
      { id: "pedir-repeticao-5", speakerId: "lin", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "neutral", nextNodeId: "pedir-repeticao-6" },
      { id: "pedir-repeticao-6", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "thinking", nextNodeId: "pedir-repeticao-7" },
      {
        id: "pedir-repeticao-7",
        speakerId: "lin",
        hanzi: "我叫马修。",
        pinyin: "wǒ jiào Mǎxiū.",
        pt: "Meu nome é Matheus.",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "Depois da repetição, o que Lin acrescenta?",
          options: ["Meu nome é Matheus.", "Estou bem.", "Por favor, fale de novo.", "Tudo bem?"],
          correctAnswer: "Meu nome é Matheus.",
          correctNextNodeId: "pedir-repeticao-9",
          wrongNextNodeId: "pedir-repeticao-8",
          explanation: "我叫马修 apresenta o nome Matheus.",
        },
      },
      { id: "pedir-repeticao-8", speakerId: "mei", hanzi: "我听不懂。", pinyin: "wǒ tīng bù dǒng.", pt: "Não entendi.", emotion: "confused", nextNodeId: "pedir-repeticao-7" },
      { id: "pedir-repeticao-9", speakerId: "mei", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:nihaoma", "chunk:wojiao"],
  }),
  sceneV2({
    sceneId: "cortesia-loja",
    title: "Cortesia na loja",
    intent: "polite-question",
    setting: "shop",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "cortesia-loja-1",
    nodes: [
      { id: "cortesia-loja-1", speakerId: "lin", hanzi: "请问。", pinyin: "qǐng wèn.", pt: "Com licença.", emotion: "neutral", nextNodeId: "cortesia-loja-2" },
      { id: "cortesia-loja-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "cortesia-loja-3" },
      {
        id: "cortesia-loja-3",
        speakerId: "lin",
        hanzi: "请问，你好吗？",
        pinyin: "qǐng wèn, nǐ hǎo ma?",
        pt: "Com licença, tudo bem?",
        emotion: "neutral",
        interaction: {
          type: "choose_meaning",
          prompt: "O que 请问，你好吗？ faz na loja?",
          options: ["Pergunta tudo bem com cortesia.", "Diz até logo.", "Agradece.", "Diz de nada."],
          correctAnswer: "Pergunta tudo bem com cortesia.",
          correctNextNodeId: "cortesia-loja-5",
          wrongNextNodeId: "cortesia-loja-4",
          explanation: "请问 deixa a pergunta mais educada; 你好吗？ pergunta tudo bem.",
        },
      },
      { id: "cortesia-loja-4", speakerId: "mei", hanzi: "请问，你好吗？", pinyin: "qǐng wèn, nǐ hǎo ma?", pt: "Com licença, tudo bem?", emotion: "thinking", nextNodeId: "cortesia-loja-3" },
      { id: "cortesia-loja-5", speakerId: "mei", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "cortesia-loja-6" },
      {
        id: "cortesia-loja-6",
        speakerId: "mei",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "neutral",
        interaction: {
          type: "choose_reply",
          prompt: "Mei pergunta de volta no balcão. Como você responde?",
          options: ["我很好", "请问", "你好", "再见"],
          correctAnswer: "我很好",
          correctNextNodeId: "cortesia-loja-8",
          wrongNextNodeId: "cortesia-loja-7",
          explanation: "我很好 responde que está tudo bem.",
        },
      },
      { id: "cortesia-loja-7", speakerId: "mei", hanzi: "我很好？", pinyin: "wǒ hěn hǎo?", pt: "Estou bem?", emotion: "confused", nextNodeId: "cortesia-loja-6" },
      { id: "cortesia-loja-8", speakerId: "lin", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "cortesia-loja-9" },
      { id: "cortesia-loja-9", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:qingwen", "chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"],
    newRefs: ["chunk:qingwen_nihaoma"],
  }),
  sceneV2({
    sceneId: "de-onde-sou",
    title: "De onde sou",
    intent: "ask-origin",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "de-onde-sou-1",
    nodes: [
      { id: "de-onde-sou-1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "de-onde-sou-2" },
      { id: "de-onde-sou-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "de-onde-sou-3" },
      {
        id: "de-onde-sou-3",
        speakerId: "mei",
        hanzi: "你是哪国人？",
        pinyin: "nǐ shì nǎ guó rén?",
        pt: "De que país você é?",
        emotion: "neutral",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Mei pergunta com 你是哪国人？",
          options: ["De que país você é?", "Meu nome é Matheus.", "Estou bem.", "Por favor, fale de novo."],
          correctAnswer: "De que país você é?",
          correctNextNodeId: "de-onde-sou-5",
          wrongNextNodeId: "de-onde-sou-4",
          explanation: "你是哪国人？ pergunta a origem/país da pessoa.",
        },
      },
      { id: "de-onde-sou-4", speakerId: "mei", hanzi: "你是哪国人？", pinyin: "nǐ shì nǎ guó rén?", pt: "De que país você é?", emotion: "confused", nextNodeId: "de-onde-sou-3" },
      { id: "de-onde-sou-5", speakerId: "lin", hanzi: "我是巴西人。", pinyin: "wǒ shì Bāxī rén.", pt: "Sou brasileiro(a).", emotion: "happy", nextNodeId: "de-onde-sou-6" },
      {
        id: "de-onde-sou-6",
        speakerId: "lin",
        hanzi: "你是哪国人？",
        pinyin: "nǐ shì nǎ guó rén?",
        pt: "De que país você é?",
        emotion: "neutral",
        interaction: {
          type: "choose_reply",
          prompt: "Agora Lin pergunta a Mei. Como Mei responde que é brasileira?",
          options: ["我是巴西人", "我叫马修", "我听不懂", "谢谢"],
          correctAnswer: "我是巴西人",
          correctNextNodeId: "de-onde-sou-8",
          wrongNextNodeId: "de-onde-sou-7",
          explanation: "我是巴西人 responde: sou brasileiro(a).",
        },
      },
      { id: "de-onde-sou-7", speakerId: "mei", hanzi: "我是巴西人？", pinyin: "wǒ shì Bāxī rén?", pt: "Sou brasileiro(a)?", emotion: "confused", nextNodeId: "de-onde-sou-6" },
      { id: "de-onde-sou-8", speakerId: "mei", hanzi: "我是巴西人。", pinyin: "wǒ shì Bāxī rén.", pt: "Sou brasileiro(a).", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:wature", "char:ni", "char:ren", "char:shi"],
    newRefs: ["chunk:nishinaiguoren"],
    dedicatedLesson: true,
  }),
  sceneV2({
    sceneId: "nao-entendi-reparo",
    title: "Não entendi — peça reparo",
    intent: "repair-not-understood",
    setting: "park",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "nao-entendi-reparo-1",
    nodes: [
      { id: "nao-entendi-reparo-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "nao-entendi-reparo-2" },
      { id: "nao-entendi-reparo-2", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "neutral", nextNodeId: "nao-entendi-reparo-3" },
      {
        id: "nao-entendi-reparo-3",
        speakerId: "lin",
        hanzi: "我听不懂。",
        pinyin: "wǒ tīng bù dǒng.",
        pt: "Não entendi.",
        emotion: "confused",
        interaction: {
          type: "choose_reply",
          prompt: "Lin não entendeu no parque. O que ele pede para reparar a conversa?",
          options: ["请再说一遍", "我很好", "你好", "谢谢"],
          correctAnswer: "请再说一遍",
          correctNextNodeId: "nao-entendi-reparo-5",
          wrongNextNodeId: "nao-entendi-reparo-4",
          explanation: "请再说一遍 pede repetição com educação.",
        },
      },
      { id: "nao-entendi-reparo-4", speakerId: "mei", hanzi: "请再说一遍？", pinyin: "qǐng zài shuō yí biàn?", pt: "Por favor, fale de novo?", emotion: "confused", nextNodeId: "nao-entendi-reparo-3" },
      { id: "nao-entendi-reparo-5", speakerId: "lin", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "thinking", nextNodeId: "nao-entendi-reparo-6" },
      { id: "nao-entendi-reparo-6", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "neutral", nextNodeId: "nao-entendi-reparo-7" },
      {
        id: "nao-entendi-reparo-7",
        speakerId: "lin",
        hanzi: "我不会说中文。",
        pinyin: "wǒ bú huì shuō Zhōngwén.",
        pt: "Não sei falar chinês.",
        emotion: "confused",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Lin esclarece com 我不会说中文?",
          options: ["Não sei falar chinês.", "Estou bem.", "Tudo bem?", "Obrigado(a)."],
          correctAnswer: "Não sei falar chinês.",
          correctNextNodeId: "nao-entendi-reparo-9",
          wrongNextNodeId: "nao-entendi-reparo-8",
          explanation: "我不会说中文 explica uma limitação de fala.",
        },
      },
      { id: "nao-entendi-reparo-8", speakerId: "mei", hanzi: "我不会说中文？", pinyin: "wǒ bú huì shuō Zhōngwén?", pt: "Não sei falar chinês?", emotion: "confused", nextNodeId: "nao-entendi-reparo-7" },
      {
        id: "nao-entendi-reparo-9",
        speakerId: "mei",
        hanzi: "请再说一遍。",
        pinyin: "qǐng zài shuō yí biàn.",
        pt: "Por favor, fale de novo.",
        emotion: "thinking",
        interaction: {
          type: "choose_meaning",
          prompt: "Qual frase pede para a outra pessoa repetir?",
          options: ["Por favor, fale de novo.", "Não entendi.", "Não sei falar chinês.", "Tudo bem?"],
          correctAnswer: "Por favor, fale de novo.",
          correctNextNodeId: "nao-entendi-reparo-11",
          wrongNextNodeId: "nao-entendi-reparo-10",
          explanation: "请再说一遍 é a frase de reparo para pedir repetição.",
        },
      },
      { id: "nao-entendi-reparo-10", speakerId: "mei", hanzi: "我听不懂。", pinyin: "wǒ tīng bù dǒng.", pt: "Não entendi.", emotion: "confused", nextNodeId: "nao-entendi-reparo-9" },
      { id: "nao-entendi-reparo-11", speakerId: "lin", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Por favor, fale de novo.", emotion: "happy" },
    ],
    learnedRefs: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:wobuhui", "chunk:nihao", "chunk:nihaoma"],
    dedicatedLesson: true,
  }),
  sceneV2({
    sceneId: "nao-falo-chinês",
    title: "Não falo chinês",
    intent: "cannot-speak",
    setting: "street",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "nao-falo-chinês-1",
    nodes: [
      { id: "nao-falo-chinês-1", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "nao-falo-chinês-2" },
      { id: "nao-falo-chinês-2", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "neutral", nextNodeId: "nao-falo-chinês-3" },
      {
        id: "nao-falo-chinês-3",
        speakerId: "lin",
        hanzi: "我不会说中文。",
        pinyin: "wǒ bú huì shuō Zhōngwén.",
        pt: "Não sei falar chinês.",
        emotion: "confused",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Lin comunica com 我不会说中文?",
          options: ["Não sei falar chinês.", "Estou bem.", "Tudo bem?", "Até logo."],
          correctAnswer: "Não sei falar chinês.",
          correctNextNodeId: "nao-falo-chinês-5",
          wrongNextNodeId: "nao-falo-chinês-4",
          explanation: "我不会说中文 é uma frase de limite: não sei falar chinês.",
        },
      },
      { id: "nao-falo-chinês-4", speakerId: "mei", hanzi: "我不会说中文？", pinyin: "wǒ bú huì shuō Zhōngwén?", pt: "Não sei falar chinês?", emotion: "confused", nextNodeId: "nao-falo-chinês-3" },
      {
        id: "nao-falo-chinês-5",
        speakerId: "mei",
        hanzi: "你好吗？",
        pinyin: "nǐ hǎo ma?",
        pt: "Tudo bem?",
        emotion: "thinking",
        interaction: {
          type: "choose_reply",
          prompt: "A conversa ainda está difícil. Qual frase protege seu limite?",
          options: ["我不会说中文", "我很好", "谢谢", "再见"],
          correctAnswer: "我不会说中文",
          correctNextNodeId: "nao-falo-chinês-7",
          wrongNextNodeId: "nao-falo-chinês-6",
          explanation: "Repita 我不会说中文 quando não conseguir falar chinês.",
        },
      },
      { id: "nao-falo-chinês-6", speakerId: "mei", hanzi: "我不会说中文？", pinyin: "wǒ bú huì shuō Zhōngwén?", pt: "Não sei falar chinês?", emotion: "confused", nextNodeId: "nao-falo-chinês-5" },
      { id: "nao-falo-chinês-7", speakerId: "lin", hanzi: "我不会说中文。", pinyin: "wǒ bú huì shuō Zhōngwén.", pt: "Não sei falar chinês.", emotion: "thinking", nextNodeId: "nao-falo-chinês-8" },
      { id: "nao-falo-chinês-8", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:wobuhui", "chunk:nihaoma"],
  }),
  sceneV2({
    sceneId: "como-se-chama",
    title: "Como você se chama?",
    intent: "ask-name",
    setting: "school",
    characters: PAIR_LIN_MEI,
    sceneRole: "common",
    entryNodeId: "como-se-chama-1",
    nodes: [
      { id: "como-se-chama-1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "como-se-chama-2" },
      { id: "como-se-chama-2", speakerId: "mei", hanzi: "你叫什么？", pinyin: "nǐ jiào shénme?", pt: "Como você se chama?", emotion: "neutral", nextNodeId: "como-se-chama-3" },
      {
        id: "como-se-chama-3",
        speakerId: "lin",
        hanzi: "我叫马修。",
        pinyin: "wǒ jiào Mǎxiū.",
        pt: "Meu nome é Matheus.",
        emotion: "happy",
        interaction: {
          type: "choose_meaning",
          prompt: "O que Lin responde com 我叫马修?",
          options: ["Meu nome é Matheus.", "Como você se chama?", "Tudo bem?", "Até logo."],
          correctAnswer: "Meu nome é Matheus.",
          correctNextNodeId: "como-se-chama-5",
          wrongNextNodeId: "como-se-chama-4",
          explanation: "我叫马修 apresenta o nome Matheus.",
        },
      },
      { id: "como-se-chama-4", speakerId: "mei", hanzi: "我叫马修？", pinyin: "wǒ jiào Mǎxiū?", pt: "Meu nome é Matheus?", emotion: "confused", nextNodeId: "como-se-chama-3" },
      {
        id: "como-se-chama-5",
        speakerId: "mei",
        hanzi: "你叫什么？",
        pinyin: "nǐ jiào shénme?",
        pt: "Como você se chama?",
        emotion: "thinking",
        interaction: {
          type: "order_reply",
          prompt: "Responda à pergunta com o nome Matheus.",
          options: ["我", "叫", "马修", "你好"],
          correctAnswer: "我叫马修",
          correctNextNodeId: "como-se-chama-7",
          wrongNextNodeId: "como-se-chama-6",
          explanation: "我叫马修 responde 你叫什么？",
        },
      },
      { id: "como-se-chama-6", speakerId: "mei", hanzi: "你叫什么？", pinyin: "nǐ jiào shénme?", pt: "Como você se chama?", emotion: "confused", nextNodeId: "como-se-chama-5" },
      { id: "como-se-chama-7", speakerId: "lin", hanzi: "我叫马修。", pinyin: "wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus.", emotion: "happy", nextNodeId: "como-se-chama-8" },
      { id: "como-se-chama-8", speakerId: "mei", hanzi: "你好，马修！", pinyin: "nǐ hǎo, Mǎxiū!", pt: "Olá, Matheus!", emotion: "happy" },
    ],
    learnedRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wojiao"],
  }),
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
    { id: "agua-2", speakerId: "lin", hanzi: "你好！请问。", pinyin: "nǐ hǎo! qǐng wèn.", pt: "Olá! Com licença.", nextNodeId: "agua-3" },
    {
      id: "agua-3",
      speakerId: "wang",
      hanzi: "你好！",
      pinyin: "nǐ hǎo!",
      pt: "Olá! Pode pedir.",
      interaction: {
        type: "order_reply",
        prompt: "Peça água: eu quero água.",
        options: ["我", "要", "水", "这个"],
        correctAnswer: "我要水",
        correctNextNodeId: "agua-5",
        wrongNextNodeId: "agua-4",
        explanation: "我要水 = eu quero água.",
      },
    },
    { id: "agua-4", speakerId: "wang", hanzi: "请再说一遍。我要这个？水？", pinyin: "qǐng zài shuō yí biàn. wǒ yào zhège? shuǐ?", pt: "Fale de novo, por favor. 我要这个 ajuda com eu quero; a pista é 水.", emotion: "confused", nextNodeId: "agua-3" },
    { id: "agua-5", speakerId: "wang", hanzi: "好！水。", pinyin: "hǎo! shuǐ.", pt: "Certo! Água.", emotion: "happy", nextNodeId: "agua-6" },
    {
      id: "agua-6",
      speakerId: "wang",
      hanzi: "水。",
      pinyin: "shuǐ.",
      pt: "Aqui está a água.",
      interaction: {
        type: "choose_reply",
        prompt: "Wang te entrega a água. O que você diz?",
        options: ["谢谢", "再见", "你好", "水"],
        correctAnswer: "谢谢",
        correctNextNodeId: "agua-8",
        wrongNextNodeId: "agua-7",
        explanation: "谢谢 agradece pela água.",
      },
    },
    { id: "agua-7", speakerId: "wang", hanzi: "请再说一遍。谢谢？", pinyin: "qǐng zài shuō yí biàn. xièxie?", pt: "Fale de novo, por favor. Para agradecer, diga 谢谢.", emotion: "thinking", nextNodeId: "agua-6" },
    { id: "agua-8", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "agua-9" },
    {
      id: "agua-9",
      speakerId: "wang",
      hanzi: "不客气！再见！",
      pinyin: "bú kèqi! zàijiàn!",
      pt: "De nada! Até logo!",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Responda à despedida.",
        options: ["再见", "谢谢", "水", "你好"],
        correctAnswer: "再见",
        correctNextNodeId: "agua-11",
        wrongNextNodeId: "agua-10",
        explanation: "再见 fecha a conversa: até logo.",
      },
    },
    { id: "agua-10", speakerId: "wang", hanzi: "请再说一遍。再见？", pinyin: "qǐng zài shuō yí biàn. zàijiàn?", pt: "Repita, por favor. Para se despedir, use 再见.", emotion: "thinking", nextNodeId: "agua-9" },
    { id: "agua-11", speakerId: "lin", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:qingwen", "chunk:woyao", "char:shui", "chunk:xiexie", "chunk:qingzaishuoyibian", "chunk:bukeqi", "chunk:zaijian"],
  optionalRefs: ["chunk:qingwen", "chunk:woyao", "chunk:xiexie", "chunk:qingzaishuoyibian", "chunk:bukeqi", "chunk:zaijian"],
  variants: [
    {
      stage: "beginner",
      minPhaseOrder: 4,
      learnedRefs: ["chunk:nihao", "char:shui"],
      entryNodeId: "agua-b1",
      nodes: [
        { id: "agua-b1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "agua-b2" },
        { id: "agua-b2", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "agua-b3" },
        {
          id: "agua-b3",
          speakerId: "wang",
          hanzi: "水？",
          pinyin: "shuǐ?",
          pt: "Água?",
          interaction: {
            type: "choose_reply",
            prompt: "Você quer água. Escolha o caractere de água.",
            options: ["水", "你好"],
            correctAnswer: "水",
            correctNextNodeId: "agua-b5",
            wrongNextNodeId: "agua-b4",
            explanation: "水 quer dizer água.",
          },
        },
        { id: "agua-b4", speakerId: "wang", hanzi: "你好？水？", pinyin: "nǐ hǎo? shuǐ?", pt: "Hã? A pista é água: 水.", emotion: "confused", nextNodeId: "agua-b3" },
        { id: "agua-b5", speakerId: "wang", hanzi: "水。", pinyin: "shuǐ.", pt: "Água.", emotion: "happy", nextNodeId: "agua-b6" },
        {
          id: "agua-b6",
          speakerId: "lin",
          hanzi: "水。",
          pinyin: "shuǐ.",
          pt: "Água.",
          interaction: {
            type: "choose_meaning",
            prompt: "O que 水 quer dizer?",
            options: ["água", "olá", "amigo", "amanhã"],
            correctAnswer: "água",
            correctNextNodeId: "agua-b8",
            wrongNextNodeId: "agua-b7",
            explanation: "水 é água.",
          },
        },
        { id: "agua-b7", speakerId: "wang", hanzi: "水？", pinyin: "shuǐ?", pt: "Pense na água que você pediu: 水.", emotion: "thinking", nextNodeId: "agua-b6" },
        { id: "agua-b8", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Tudo certo!", emotion: "happy" },
      ],
    },
    {
      stage: "intermediate",
      minPhaseOrder: 6,
      learnedRefs: ["chunk:nihao", "chunk:qingwen", "chunk:woyao", "char:shui"],
      entryNodeId: "agua-i1",
      nodes: [
        { id: "agua-i1", speakerId: "lin", hanzi: "你好！请问。", pinyin: "nǐ hǎo! qǐng wèn.", pt: "Olá! Com licença.", emotion: "neutral", nextNodeId: "agua-i2" },
        { id: "agua-i2", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "agua-i3" },
        {
          id: "agua-i3",
          speakerId: "wang",
          hanzi: "水？",
          pinyin: "shuǐ?",
          pt: "Água?",
          interaction: {
            type: "order_reply",
            prompt: "Peça água: eu quero água.",
            options: ["我", "要", "水", "这个"],
            correctAnswer: "我要水",
            correctNextNodeId: "agua-i5",
            wrongNextNodeId: "agua-i4",
            explanation: "我要水 = eu quero água.",
          },
        },
        { id: "agua-i4", speakerId: "wang", hanzi: "我要这个？水？", pinyin: "wǒ yào zhège? shuǐ?", pt: "Use 我要 de 我要这个 e termine com 水. Tente de novo.", emotion: "confused", nextNodeId: "agua-i3" },
        { id: "agua-i5", speakerId: "wang", hanzi: "好！水。", pinyin: "hǎo! shuǐ.", pt: "Certo! Água.", emotion: "happy", nextNodeId: "agua-i6" },
        {
          id: "agua-i6",
          speakerId: "lin",
          hanzi: "我要水。",
          pinyin: "wǒ yào shuǐ.",
          pt: "Eu quero água.",
          interaction: {
            type: "choose_meaning",
            prompt: "O que Lin pediu?",
            options: ["água", "chá", "este", "olá"],
            correctAnswer: "água",
            correctNextNodeId: "agua-i8",
            wrongNextNodeId: "agua-i7",
            explanation: "水 = água; 我要水 pede água.",
          },
        },
        { id: "agua-i7", speakerId: "wang", hanzi: "水？", pinyin: "shuǐ?", pt: "A pista está no final da frase: 水.", emotion: "thinking", nextNodeId: "agua-i6" },
        { id: "agua-i8", speakerId: "wang", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Tudo certo!", emotion: "happy" },
      ],
    },
  ],
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
    { id: "cha-1", speakerId: "mei", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "cha-2" },
    { id: "cha-2", speakerId: "lin", hanzi: "你好！谢谢！", pinyin: "nǐ hǎo! xièxie!", pt: "Olá! Obrigado!", emotion: "happy", nextNodeId: "cha-3" },
    {
      id: "cha-3",
      speakerId: "mei",
      hanzi: "你想喝茶吗？",
      pinyin: "nǐ xiǎng hē chá ma?",
      pt: "Você quer beber chá?",
      interaction: {
        type: "order_reply",
        prompt: "Responda: quero beber chá.",
        options: ["我", "想", "喝", "茶", "谢谢"],
        correctAnswer: "我想喝茶",
        correctNextNodeId: "cha-5",
        wrongNextNodeId: "cha-4",
        explanation: "我想喝茶 aceita a oferta: quero beber chá.",
      },
    },
    { id: "cha-4", speakerId: "mei", hanzi: "什么？请再说一遍。", pinyin: "shénme? qǐng zài shuō yí biàn.", pt: "O quê? Fale de novo, por favor. Use 我想喝茶.", emotion: "confused", nextNodeId: "cha-3" },
    { id: "cha-5", speakerId: "lin", hanzi: "我想喝茶。", pinyin: "wǒ xiǎng hē chá.", pt: "Quero beber chá.", nextNodeId: "cha-6" },
    {
      id: "cha-6",
      speakerId: "mei",
      hanzi: "这是什么？",
      pinyin: "zhè shì shénme?",
      pt: "O que é isto?",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Mei perguntou ao mostrar a xícara?",
        options: ["O que é isto?", "Você quer beber chá?", "Obrigado!", "De nada!"],
        correctAnswer: "O que é isto?",
        correctNextNodeId: "cha-8",
        wrongNextNodeId: "cha-7",
        explanation: "这是什么？ pergunta o que é algo próximo.",
      },
    },
    { id: "cha-7", speakerId: "mei", hanzi: "这是什么？请再说一遍。", pinyin: "zhè shì shénme? qǐng zài shuō yí biàn.", pt: "É a pergunta O que é isto? Tente de novo.", emotion: "thinking", nextNodeId: "cha-6" },
    { id: "cha-8", speakerId: "lin", hanzi: "茶。谢谢！", pinyin: "chá. xièxie!", pt: "Chá. Obrigado!", emotion: "happy", nextNodeId: "cha-9" },
    { id: "cha-9", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:xiexie", "chunk:woxianghe", "chunk:zheshishenme", "chunk:qingzaishuoyibian", "chunk:bukeqi"],
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
    { id: "qtd-2", speakerId: "lin", hanzi: "我想喝茶。", pinyin: "wǒ xiǎng hē chá.", pt: "Quero beber chá.", nextNodeId: "qtd-3" },
    {
      id: "qtd-3",
      speakerId: "wang",
      hanzi: "三？",
      pinyin: "sān?",
      pt: "Três?",
      interaction: {
        type: "choose_reply",
        prompt: "Você quer três. Como responde?",
        options: ["我要三", "我要这个", "这是什么？", "太贵了"],
        correctAnswer: "我要三",
        correctNextNodeId: "qtd-5",
        wrongNextNodeId: "qtd-4",
        explanation: "我要三 = quero três.",
      },
    },
    { id: "qtd-4", speakerId: "wang", hanzi: "什么？三？", pinyin: "shénme? sān?", pt: "Quantos? A pista é 三, três.", emotion: "confused", nextNodeId: "qtd-3" },
    { id: "qtd-5", speakerId: "wang", hanzi: "好，三。", pinyin: "hǎo, sān.", pt: "Certo, três.", emotion: "happy", nextNodeId: "qtd-6" },
    {
      id: "qtd-6",
      speakerId: "lin",
      hanzi: "多少钱？",
      pinyin: "duōshao qián?",
      pt: "Quanto custa?",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou?",
        options: ["Quanto custa?", "O que é isto?", "Quero três.", "Caro demais."],
        correctAnswer: "Quanto custa?",
        correctNextNodeId: "qtd-8",
        wrongNextNodeId: "qtd-7",
        explanation: "多少钱？ pergunta o preço.",
      },
    },
    { id: "qtd-7", speakerId: "wang", hanzi: "多少钱？三？", pinyin: "duōshao qián? sān?", pt: "A pergunta é de preço: 多少钱？ Tente outra vez.", emotion: "thinking", nextNodeId: "qtd-6" },
    {
      id: "qtd-8",
      speakerId: "wang",
      hanzi: "三。",
      pinyin: "sān.",
      pt: "Três.",
      interaction: {
        type: "choose_reply",
        prompt: "Você achou caro. Como reage?",
        options: ["太贵了", "谢谢", "你好", "我要三"],
        correctAnswer: "太贵了",
        correctNextNodeId: "qtd-10",
        wrongNextNodeId: "qtd-9",
        explanation: "太贵了 = caro demais.",
      },
    },
    { id: "qtd-9", speakerId: "wang", hanzi: "什么？太贵了？", pinyin: "shénme? tài guì le?", pt: "O quê? Para dizer caro demais, use 太贵了.", emotion: "confused", nextNodeId: "qtd-8" },
    { id: "qtd-10", speakerId: "lin", hanzi: "太贵了。谢谢。", pinyin: "tài guì le. xièxie.", pt: "Está caro demais. Obrigado.", emotion: "thinking", nextNodeId: "qtd-11" },
    { id: "qtd-11", speakerId: "wang", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:woyao", "chunk:zheshishenme", "chunk:woxianghe", "char:san", "chunk:duoshaoqian", "chunk:taiguile", "chunk:xiexie", "chunk:bukeqi"],
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
    { id: "pessoa-1", speakerId: "lin", hanzi: "你好！那是人吗？", pinyin: "nǐ hǎo! nà shì rén ma?", pt: "Olá! Aquilo é uma pessoa?", emotion: "thinking", nextNodeId: "pessoa-2" },
    {
      id: "pessoa-2",
      speakerId: "mei",
      hanzi: "是。",
      pinyin: "shì.",
      pt: "Sim.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou?",
        options: ["Aquilo é uma pessoa?", "Isto é água.", "Estou bem.", "Obrigado."],
        correctAnswer: "Aquilo é uma pessoa?",
        correctNextNodeId: "pessoa-4",
        wrongNextNodeId: "pessoa-3",
        explanation: "那是人吗？ pergunta se aquilo ali é uma pessoa.",
      },
    },
    { id: "pessoa-3", speakerId: "mei", hanzi: "那是人吗？", pinyin: "nà shì rén ma?", pt: "A pergunta foi: aquilo é uma pessoa? Tente de novo.", emotion: "thinking", nextNodeId: "pessoa-2" },
    { id: "pessoa-4", speakerId: "mei", hanzi: "这是我妈妈。", pinyin: "zhè shì wǒ māma.", pt: "Esta é minha mãe.", emotion: "happy", nextNodeId: "pessoa-5" },
    {
      id: "pessoa-5",
      speakerId: "lin",
      hanzi: "你妈妈很好！",
      pinyin: "nǐ māma hěn hǎo!",
      pt: "Sua mãe é muito legal!",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Cumprimente a mãe da Mei.",
        options: ["你好", "谢谢", "我很好", "那是人吗"],
        correctAnswer: "你好",
        correctNextNodeId: "pessoa-7",
        wrongNextNodeId: "pessoa-6",
        explanation: "你好 é o cumprimento simples para conhecer alguém.",
      },
    },
    { id: "pessoa-6", speakerId: "mei", hanzi: "你好？", pinyin: "nǐ hǎo?", pt: "Use o cumprimento: 你好. Tente de novo.", emotion: "thinking", nextNodeId: "pessoa-5" },
    { id: "pessoa-7", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "pessoa-8" },
    { id: "pessoa-8", speakerId: "mei", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigada!", emotion: "happy" },
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
      emotion: "happy",
      interaction: {
        type: "choose_meaning",
        prompt: "Como Lin está?",
        options: ["Estou bem.", "O que é isto?", "Até amanhã.", "Caro demais."],
        correctAnswer: "Estou bem.",
        correctNextNodeId: "amigo-5",
        wrongNextNodeId: "amigo-4",
        explanation: "我很好 = estou bem.",
      },
    },
    { id: "amigo-4", speakerId: "mei", hanzi: "我很好？", pinyin: "wǒ hěn hǎo?", pt: "A pista é 我很好: estou bem. Tente de novo.", emotion: "thinking", nextNodeId: "amigo-3" },
    { id: "amigo-5", speakerId: "mei", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Que bom!", emotion: "happy", nextNodeId: "amigo-6" },
    {
      id: "amigo-6",
      speakerId: "lin",
      hanzi: "朋友！",
      pinyin: "péngyou!",
      pt: "Amigo!",
      interaction: {
        type: "choose_reply",
        prompt: "Convide Mei para irem juntos.",
        options: ["我们走吧", "这是什么？", "你好", "我很好"],
        correctAnswer: "我们走吧",
        correctNextNodeId: "amigo-8",
        wrongNextNodeId: "amigo-7",
        explanation: "我们走吧 convida: vamos.",
      },
    },
    { id: "amigo-7", speakerId: "mei", hanzi: "什么？我们走吧？", pinyin: "shénme? wǒmen zǒu ba?", pt: "O quê? Para convidar, diga 我们走吧.", emotion: "confused", nextNodeId: "amigo-6" },
    { id: "amigo-8", speakerId: "mei", hanzi: "很好！我们走吧！", pinyin: "hěn hǎo! wǒmen zǒu ba!", pt: "Ótimo! Vamos!", emotion: "happy" },
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
    { id: "onde-1", speakerId: "lin", hanzi: "你好！请问。", pinyin: "nǐ hǎo! qǐng wèn.", pt: "Olá! Com licença.", emotion: "thinking", nextNodeId: "onde-2" },
    { id: "onde-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "onde-3" },
    {
      id: "onde-3",
      speakerId: "lin",
      hanzi: "山？",
      pinyin: "shān?",
      pt: "A montanha?",
      interaction: {
        type: "order_reply",
        prompt: "Pergunte onde fica a montanha.",
        options: ["山", "在", "哪里"],
        correctAnswer: "山在哪里？",
        correctNextNodeId: "onde-5",
        wrongNextNodeId: "onde-4",
        explanation: "山在哪里？ = onde fica a montanha?",
      },
    },
    { id: "onde-4", speakerId: "mei", hanzi: "请问，山在哪里？", pinyin: "qǐng wèn, shān zài nǎlǐ?", pt: "Use 请问 e 在哪里 para perguntar: onde fica a montanha?", emotion: "thinking", nextNodeId: "onde-3" },
    { id: "onde-5", speakerId: "mei", hanzi: "在那里。", pinyin: "zài nàlǐ.", pt: "Fica ali.", emotion: "happy", nextNodeId: "onde-6" },
    {
      id: "onde-6",
      speakerId: "lin",
      hanzi: "那是人吗？",
      pinyin: "nà shì rén ma?",
      pt: "Aquilo é uma pessoa?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou ao olhar para a trilha?",
        options: ["Aquilo é uma pessoa?", "Onde fica a montanha?", "Obrigado.", "De nada."],
        correctAnswer: "Aquilo é uma pessoa?",
        correctNextNodeId: "onde-8",
        wrongNextNodeId: "onde-7",
        explanation: "那是人吗？ pergunta se aquilo ali é uma pessoa.",
      },
    },
    { id: "onde-7", speakerId: "mei", hanzi: "那是人吗？", pinyin: "nà shì rén ma?", pt: "A pista é 那是人吗？ Tente de novo.", emotion: "thinking", nextNodeId: "onde-6" },
    { id: "onde-8", speakerId: "mei", hanzi: "是。人。", pinyin: "shì. rén.", pt: "Sim. Uma pessoa.", emotion: "happy", nextNodeId: "onde-9" },
    { id: "onde-9", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "onde-10" },
    { id: "onde-10", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!", emotion: "happy" },
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
    { id: "natureza-1", speakerId: "lin", hanzi: "那是山。", pinyin: "nà shì shān.", pt: "Aquilo é uma montanha.", emotion: "happy", nextNodeId: "natureza-2" },
    {
      id: "natureza-2",
      speakerId: "mei",
      hanzi: "这是什么？",
      pinyin: "zhè shì shénme?",
      pt: "O que é isto?",
      emotion: "thinking",
      interaction: {
        type: "choose_reply",
        prompt: "Responda que isto é 木.",
        options: ["这是木", "那是人吗", "我很好", "不是"],
        correctAnswer: "这是木",
        correctNextNodeId: "natureza-4",
        wrongNextNodeId: "natureza-3",
        explanation: "这是木 = isto é 木, árvore/madeira.",
      },
    },
    { id: "natureza-3", speakerId: "lin", hanzi: "不是。木。", pinyin: "bú shì. mù.", pt: "Não é. A pista é 木.", emotion: "confused", nextNodeId: "natureza-2" },
    { id: "natureza-4", speakerId: "lin", hanzi: "这是木。", pinyin: "zhè shì mù.", pt: "Isto é 木.", emotion: "happy", nextNodeId: "natureza-5" },
    {
      id: "natureza-5",
      speakerId: "mei",
      hanzi: "那是日吗？",
      pinyin: "nà shì rì ma?",
      pt: "Aquilo é o sol?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Mei perguntou?",
        options: ["Aquilo é o sol?", "Aquilo é a lua?", "Aquilo é uma montanha?", "Isto é uma árvore."],
        correctAnswer: "Aquilo é o sol?",
        correctNextNodeId: "natureza-7",
        wrongNextNodeId: "natureza-6",
        explanation: "日 é sol/dia; 那是日吗？ pergunta se aquilo é o sol.",
      },
    },
    { id: "natureza-6", speakerId: "lin", hanzi: "日，不是月。", pinyin: "rì, bú shì yuè.", pt: "日, não 月. Tente de novo.", emotion: "thinking", nextNodeId: "natureza-5" },
    { id: "natureza-7", speakerId: "lin", hanzi: "是，那是日。", pinyin: "shì, nà shì rì.", pt: "Sim, aquilo é o sol.", emotion: "happy", nextNodeId: "natureza-8" },
    {
      id: "natureza-8",
      speakerId: "mei",
      hanzi: "月？",
      pinyin: "yuè?",
      pt: "Lua?",
      interaction: {
        type: "choose_reply",
        prompt: "Agora aponte para a lua.",
        options: ["那是月", "那是日", "那是山", "这是木"],
        correctAnswer: "那是月",
        correctNextNodeId: "natureza-10",
        wrongNextNodeId: "natureza-9",
        explanation: "月 é lua; 那是月 aponta para ela.",
      },
    },
    { id: "natureza-9", speakerId: "lin", hanzi: "不是。月。", pinyin: "bú shì. yuè.", pt: "Não é isso. A pista é 月.", emotion: "confused", nextNodeId: "natureza-8" },
    { id: "natureza-10", speakerId: "mei", hanzi: "那是月。", pinyin: "nà shì yuè.", pt: "Aquilo é a lua.", emotion: "happy" },
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
    { id: "aula-2", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "aula-3" },
    {
      id: "aula-3",
      speakerId: "hua",
      hanzi: "你叫什么？",
      pinyin: "nǐ jiào shénme?",
      pt: "Como você se chama?",
      interaction: {
        type: "order_reply",
        prompt: "Apresente-se ao professor: meu nome é Matheus.",
        options: ["我", "叫", "马修", "你好"],
        correctAnswer: "我叫马修",
        correctNextNodeId: "aula-5",
        wrongNextNodeId: "aula-4",
        explanation: "我叫马修 responde: meu nome é Matheus.",
      },
    },
    { id: "aula-4", speakerId: "hua", hanzi: "请再说一遍。你叫什么？", pinyin: "qǐng zài shuō yí biàn. nǐ jiào shénme?", pt: "Fale de novo, por favor. Responda 你叫什么？", emotion: "thinking", nextNodeId: "aula-3" },
    { id: "aula-5", speakerId: "lin", hanzi: "我叫马修。", pinyin: "wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus.", emotion: "happy", nextNodeId: "aula-6" },
    {
      id: "aula-6",
      speakerId: "hua",
      hanzi: "很好！",
      pinyin: "hěn hǎo!",
      pt: "Muito bem!",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Diga que você está bem para encerrar a apresentação.",
        options: ["我很好", "你好", "请再说一遍", "你叫什么？"],
        correctAnswer: "我很好",
        correctNextNodeId: "aula-8",
        wrongNextNodeId: "aula-7",
        explanation: "我很好 = estou bem.",
      },
    },
    { id: "aula-7", speakerId: "hua", hanzi: "请再说一遍。我很好？", pinyin: "qǐng zài shuō yí biàn. wǒ hěn hǎo?", pt: "Tente de novo. A frase é 我很好.", emotion: "thinking", nextNodeId: "aula-6" },
    { id: "aula-8", speakerId: "lin", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy", nextNodeId: "aula-9" },
    { id: "aula-9", speakerId: "hua", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wojiao", "chunk:qingzaishuoyibian", "chunk:wohenhao"],
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
    { id: "ajuda-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "ajuda-3" },
    {
      id: "ajuda-3",
      speakerId: "lin",
      hanzi: "我听不懂。",
      pinyin: "wǒ tīng bù dǒng.",
      pt: "Não entendi.",
      emotion: "confused",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin disse?",
        options: ["Não entendi.", "Falo um pouco de chinês.", "O que é isto?", "Obrigado."],
        correctAnswer: "Não entendi.",
        correctNextNodeId: "ajuda-5",
        wrongNextNodeId: "ajuda-4",
        explanation: "我听不懂 = não entendi o que ouvi.",
      },
    },
    { id: "ajuda-4", speakerId: "mei", hanzi: "我听不懂？请问？", pinyin: "wǒ tīng bù dǒng? qǐng wèn?", pt: "A pista é 我听不懂: não entendi. Tente de novo.", emotion: "thinking", nextNodeId: "ajuda-3" },
    { id: "ajuda-5", speakerId: "lin", hanzi: "我不会说中文。", pinyin: "wǒ bú huì shuō Zhōngwén.", pt: "Não falo chinês.", emotion: "confused", nextNodeId: "ajuda-6" },
    {
      id: "ajuda-6",
      speakerId: "mei",
      hanzi: "我会说一点中文。",
      pinyin: "wǒ huì shuō yìdiǎn Zhōngwén.",
      pt: "Eu falo um pouco de chinês.",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Mei vai te ajudar. O que você diz?",
        options: ["谢谢", "这是什么？", "你好", "我听不懂"],
        correctAnswer: "谢谢",
        correctNextNodeId: "ajuda-8",
        wrongNextNodeId: "ajuda-7",
        explanation: "谢谢 agradece a ajuda oferecida.",
      },
    },
    { id: "ajuda-7", speakerId: "mei", hanzi: "什么？谢谢？", pinyin: "shénme? xièxie?", pt: "O quê? Para agradecer a ajuda, diga 谢谢.", emotion: "thinking", nextNodeId: "ajuda-6" },
    { id: "ajuda-8", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy", nextNodeId: "ajuda-9" },
    { id: "ajuda-9", speakerId: "mei", hanzi: "不客气！", pinyin: "bú kèqi!", pt: "De nada!", emotion: "happy" },
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
    { id: "devagar-1", speakerId: "hua", hanzi: "你好！你叫什么？", pinyin: "nǐ hǎo! nǐ jiào shénme?", pt: "Olá! Como você se chama?", emotion: "neutral", nextNodeId: "devagar-2" },
    {
      id: "devagar-2",
      speakerId: "lin",
      hanzi: "我会说一点中文。",
      pinyin: "wǒ huì shuō yìdiǎn Zhōngwén.",
      pt: "Eu falo um pouco de chinês.",
      emotion: "confused",
      interaction: {
        type: "order_reply",
        prompt: "Peça para o professor falar de novo.",
        options: ["请", "再", "说", "一", "遍"],
        correctAnswer: "请再说一遍",
        correctNextNodeId: "devagar-4",
        wrongNextNodeId: "devagar-3",
        explanation: "请再说一遍 pede repetição com educação.",
      },
    },
    { id: "devagar-3", speakerId: "hua", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "A frase é 请再说一遍. Tente de novo.", emotion: "thinking", nextNodeId: "devagar-2" },
    { id: "devagar-4", speakerId: "lin", hanzi: "请再说一遍。", pinyin: "qǐng zài shuō yí biàn.", pt: "Fale de novo, por favor.", emotion: "happy", nextNodeId: "devagar-5" },
    {
      id: "devagar-5",
      speakerId: "hua",
      hanzi: "你叫什么？",
      pinyin: "nǐ jiào shénme?",
      pt: "Como você se chama?",
      interaction: {
        type: "order_reply",
        prompt: "Agora responda com seu nome: meu nome é Matheus.",
        options: ["我", "叫", "马修", "你好"],
        correctAnswer: "我叫马修",
        correctNextNodeId: "devagar-7",
        wrongNextNodeId: "devagar-6",
        explanation: "我叫马修 = meu nome é Matheus.",
      },
    },
    { id: "devagar-6", speakerId: "hua", hanzi: "请再说一遍。我叫马修？", pinyin: "qǐng zài shuō yí biàn. wǒ jiào Mǎxiū?", pt: "Tente de novo. Use 我叫马修.", emotion: "thinking", nextNodeId: "devagar-5" },
    { id: "devagar-7", speakerId: "lin", hanzi: "我叫马修。", pinyin: "wǒ jiào Mǎxiū.", pt: "Meu nome é Matheus.", emotion: "happy", nextNodeId: "devagar-8" },
    {
      id: "devagar-8",
      speakerId: "hua",
      hanzi: "很好！",
      pinyin: "hěn hǎo!",
      pt: "Muito bem!",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Diga que você está bem.",
        options: ["我很好", "你好", "请再说一遍", "你叫什么？"],
        correctAnswer: "我很好",
        correctNextNodeId: "devagar-10",
        wrongNextNodeId: "devagar-9",
        explanation: "我很好 = estou bem.",
      },
    },
    { id: "devagar-9", speakerId: "hua", hanzi: "我很好？", pinyin: "wǒ hěn hǎo?", pt: "A pista é 我很好. Tente novamente.", emotion: "thinking", nextNodeId: "devagar-8" },
    { id: "devagar-10", speakerId: "lin", hanzi: "我很好。", pinyin: "wǒ hěn hǎo.", pt: "Estou bem.", emotion: "happy" },
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
    { id: "amanha-1", speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "amanha-2" },
    { id: "amanha-2", speakerId: "mei", hanzi: "你好！我很好。", pinyin: "nǐ hǎo! wǒ hěn hǎo.", pt: "Olá! Estou bem.", emotion: "happy", nextNodeId: "amanha-3" },
    {
      id: "amanha-3",
      speakerId: "lin",
      hanzi: "明天见？",
      pinyin: "míngtiān jiàn?",
      pt: "Até amanhã?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin propôs?",
        options: ["Até amanhã?", "Tudo bem?", "Obrigado.", "De nada."],
        correctAnswer: "Até amanhã?",
        correctNextNodeId: "amanha-5",
        wrongNextNodeId: "amanha-4",
        explanation: "明天见 combina ou confirma: até amanhã.",
      },
    },
    { id: "amanha-4", speakerId: "mei", hanzi: "明天见？", pinyin: "míngtiān jiàn?", pt: "A pista é 明天见: até amanhã. Tente de novo.", emotion: "thinking", nextNodeId: "amanha-3" },
    { id: "amanha-5", speakerId: "mei", hanzi: "明天见！", pinyin: "míngtiān jiàn!", pt: "Até amanhã!", emotion: "happy", nextNodeId: "amanha-6" },
    {
      id: "amanha-6",
      speakerId: "lin",
      hanzi: "再见！",
      pinyin: "zàijiàn!",
      pt: "Até logo!",
      interaction: {
        type: "choose_reply",
        prompt: "Responda ao tchau da Mei.",
        options: ["再见", "明天见", "你好", "我很好"],
        correctAnswer: "再见",
        correctNextNodeId: "amanha-8",
        wrongNextNodeId: "amanha-7",
        explanation: "再见 é a despedida: até logo.",
      },
    },
    { id: "amanha-7", speakerId: "mei", hanzi: "再见？", pinyin: "zàijiàn?", pt: "Para dizer tchau agora, use 再见. Tente de novo.", emotion: "thinking", nextNodeId: "amanha-6" },
    { id: "amanha-8", speakerId: "mei", hanzi: "再见！", pinyin: "zàijiàn!", pt: "Até logo!", emotion: "happy" },
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
    { id: "isto-1", speakerId: "lin", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "isto-2" },
    { id: "isto-2", speakerId: "mei", hanzi: "你好！", pinyin: "nǐ hǎo!", pt: "Olá!", emotion: "happy", nextNodeId: "isto-3" },
    {
      id: "isto-3",
      speakerId: "lin",
      hanzi: "这是什么？",
      pinyin: "zhè shì shénme?",
      pt: "O que é isto?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou?",
        options: ["O que é isto?", "Isto é água.", "Quero beber chá.", "Tudo bem?"],
        correctAnswer: "O que é isto?",
        correctNextNodeId: "isto-5",
        wrongNextNodeId: "isto-4",
        explanation: "这是什么？ pergunta o que é algo próximo.",
      },
    },
    { id: "isto-4", speakerId: "mei", hanzi: "这是什么？", pinyin: "zhè shì shénme?", pt: "A pergunta foi 这是什么？ Tente de novo.", emotion: "thinking", nextNodeId: "isto-3" },
    { id: "isto-5", speakerId: "mei", hanzi: "这是水。", pinyin: "zhè shì shuǐ.", pt: "Isto é água.", emotion: "happy", nextNodeId: "isto-6" },
    {
      id: "isto-6",
      speakerId: "lin",
      hanzi: "我想喝茶。",
      pinyin: "wǒ xiǎng hē chá.",
      pt: "Quero beber chá.",
      interaction: {
        type: "choose_reply",
        prompt: "Você quer chá, não água. Como diz isso?",
        options: ["我想喝茶", "这是水", "你好吗？", "谢谢"],
        correctAnswer: "我想喝茶",
        correctNextNodeId: "isto-8",
        wrongNextNodeId: "isto-7",
        explanation: "我想喝茶 = quero beber chá.",
      },
    },
    { id: "isto-7", speakerId: "mei", hanzi: "这是水。茶？", pinyin: "zhè shì shuǐ. chá?", pt: "Isto é água. Se quer chá, diga 我想喝茶.", emotion: "thinking", nextNodeId: "isto-6" },
    { id: "isto-8", speakerId: "mei", hanzi: "好。", pinyin: "hǎo.", pt: "Está bem.", emotion: "happy", nextNodeId: "isto-9" },
    { id: "isto-9", speakerId: "lin", hanzi: "谢谢！", pinyin: "xièxie!", pt: "Obrigado!", emotion: "happy" },
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
    {
      id: "casa-2",
      speakerId: "lin",
      hanzi: "我很好。",
      pinyin: "wǒ hěn hǎo.",
      pt: "Estou bem.",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Devolva a pergunta: e você?",
        options: ["你呢？", "你好吗？", "你好", "我很好"],
        correctAnswer: "你呢？",
        correctNextNodeId: "casa-4",
        wrongNextNodeId: "casa-3",
        explanation: "你呢？ devolve a pergunta: e você?",
      },
    },
    { id: "casa-3", speakerId: "mei", hanzi: "你呢？", pinyin: "nǐ ne?", pt: "A pista é 你呢？, e você? Tente de novo.", emotion: "thinking", nextNodeId: "casa-2" },
    { id: "casa-4", speakerId: "lin", hanzi: "你呢？", pinyin: "nǐ ne?", pt: "E você?", emotion: "happy", nextNodeId: "casa-5" },
    {
      id: "casa-5",
      speakerId: "mei",
      hanzi: "我很好。",
      pinyin: "wǒ hěn hǎo.",
      pt: "Estou bem.",
      emotion: "happy",
      interaction: {
        type: "choose_meaning",
        prompt: "O que 你呢 fez na conversa?",
        options: ["Devolveu a pergunta: e você?", "Pediu para repetir.", "Encerrou a conversa.", "Pediu chá."],
        correctAnswer: "Devolveu a pergunta: e você?",
        correctNextNodeId: "casa-7",
        wrongNextNodeId: "casa-6",
        explanation: "你呢？ devolve ao outro a pergunta anterior.",
      },
    },
    { id: "casa-6", speakerId: "mei", hanzi: "你呢？我很好。", pinyin: "nǐ ne? wǒ hěn hǎo.", pt: "Você perguntou e eu respondi: estou bem. Tente de novo.", emotion: "thinking", nextNodeId: "casa-5" },
    { id: "casa-7", speakerId: "lin", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Que bom!", emotion: "happy", nextNodeId: "casa-8" },
    { id: "casa-8", speakerId: "mei", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Que bom!", emotion: "happy" },
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
    { id: "loja-2", speakerId: "lin", hanzi: "你好！我要这个。", pinyin: "nǐ hǎo! wǒ yào zhège.", pt: "Olá! Eu quero este.", emotion: "happy", nextNodeId: "loja-3" },
    {
      id: "loja-3",
      speakerId: "wang",
      hanzi: "这是什么？",
      pinyin: "zhè shì shénme?",
      pt: "O que é isto?",
      emotion: "thinking",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Wang perguntou sobre o item?",
        options: ["O que é isto?", "Quanto custa?", "Caro demais.", "Até logo."],
        correctAnswer: "O que é isto?",
        correctNextNodeId: "loja-5",
        wrongNextNodeId: "loja-4",
        explanation: "这是什么？ pergunta o que é o objeto.",
      },
    },
    { id: "loja-4", speakerId: "wang", hanzi: "这是什么？", pinyin: "zhè shì shénme?", pt: "A pergunta foi 这是什么？ Tente de novo.", emotion: "thinking", nextNodeId: "loja-3" },
    {
      id: "loja-5",
      speakerId: "lin",
      hanzi: "多少钱？",
      pinyin: "duōshao qián?",
      pt: "Quanto custa?",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou?",
        options: ["Quanto custa?", "O que é isto?", "Obrigado.", "De nada."],
        correctAnswer: "Quanto custa?",
        correctNextNodeId: "loja-7",
        wrongNextNodeId: "loja-6",
        explanation: "多少钱？ pergunta o preço.",
      },
    },
    { id: "loja-6", speakerId: "wang", hanzi: "多少钱？", pinyin: "duōshao qián?", pt: "A pergunta de preço é 多少钱？ Tente de novo.", emotion: "thinking", nextNodeId: "loja-5" },
    { id: "loja-7", speakerId: "wang", hanzi: "不贵。", pinyin: "bú guì.", pt: "Não é caro.", emotion: "happy", nextNodeId: "loja-8" },
    {
      id: "loja-8",
      speakerId: "lin",
      hanzi: "太贵了？",
      pinyin: "tài guì le?",
      pt: "Caro demais?",
      emotion: "thinking",
      interaction: {
        type: "choose_reply",
        prompt: "Se ainda achou caro, como diz isso?",
        options: ["太贵了", "谢谢", "再见", "不要"],
        correctAnswer: "太贵了",
        correctNextNodeId: "loja-10",
        wrongNextNodeId: "loja-9",
        explanation: "太贵了 = caro demais.",
      },
    },
    { id: "loja-9", speakerId: "wang", hanzi: "太贵了？", pinyin: "tài guì le?", pt: "A pista para caro demais é 太贵了. Tente de novo.", emotion: "thinking", nextNodeId: "loja-8" },
    { id: "loja-10", speakerId: "lin", hanzi: "太贵了。谢谢。", pinyin: "tài guì le. xièxie.", pt: "Está caro demais. Obrigado.", emotion: "thinking", nextNodeId: "loja-11" },
    { id: "loja-11", speakerId: "wang", hanzi: "不客气！再见！", pinyin: "bú kèqi! zàijiàn!", pt: "De nada! Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:woyao", "chunk:duoshaoqian", "chunk:zheshishenme", "char:bu", "chunk:taiguile", "chunk:xiexie", "chunk:bukeqi", "chunk:zaijian"],
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
    { id: "comprar-1", speakerId: "wang", hanzi: "你好！你好吗？", pinyin: "nǐ hǎo! nǐ hǎo ma?", pt: "Olá! Tudo bem?", emotion: "happy", nextNodeId: "comprar-2" },
    {
      id: "comprar-2",
      speakerId: "lin",
      hanzi: "我很好！请问，我想喝茶。",
      pinyin: "wǒ hěn hǎo! qǐng wèn, wǒ xiǎng hē chá.",
      pt: "Estou bem! Com licença, eu quero beber chá.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin disse que quer?",
        options: ["Beber chá.", "Ir embora.", "Três amigos.", "A montanha."],
        correctAnswer: "Beber chá.",
        correctNextNodeId: "comprar-4",
        wrongNextNodeId: "comprar-3",
        explanation: "我想喝茶 = eu quero beber chá.",
      },
    },
    { id: "comprar-3", speakerId: "wang", hanzi: "请再说一遍：茶。", pinyin: "qǐng zài shuō yí biàn: chá.", pt: "Tente de novo: chá.", emotion: "thinking", nextNodeId: "comprar-2" },
    { id: "comprar-4", speakerId: "wang", hanzi: "有！多少钱？十。", pinyin: "yǒu! duōshao qián? shí.", pt: "Tem! Quanto custa? Dez.", nextNodeId: "comprar-5" },
    {
      id: "comprar-5",
      speakerId: "lin",
      hanzi: "太贵了！",
      pinyin: "tài guì le!",
      pt: "Caro demais!",
      emotion: "confused",
      interaction: {
        type: "choose_reply",
        prompt: "Wang fez preço alto. Qual frase abre uma negociação?",
        options: ["太贵了", "谢谢", "再见", "我很好"],
        correctAnswer: "太贵了",
        correctNextNodeId: "comprar-7",
        wrongNextNodeId: "comprar-6",
        explanation: "太贵了 mostra que o preço está caro demais.",
      },
    },
    { id: "comprar-6", speakerId: "wang", hanzi: "不是。贵，太贵了。", pinyin: "bú shì. guì, tài guì le.", pt: "Não. Pense em caro: caro demais.", emotion: "thinking", nextNodeId: "comprar-5" },
    { id: "comprar-7", speakerId: "wang", hanzi: "好，好！不贵。", pinyin: "hǎo, hǎo! bú guì.", pt: "Está bem, está bem! Não fica caro.", emotion: "thinking", nextNodeId: "comprar-8" },
    {
      id: "comprar-8",
      speakerId: "lin",
      hanzi: "我要这个。",
      pinyin: "wǒ yào zhège.",
      pt: "Eu quero este.",
      interaction: {
        type: "order_reply",
        prompt: "Monte: eu quero este.",
        options: ["我", "要", "这", "个", "三"],
        correctAnswer: "我要这个",
        correctNextNodeId: "comprar-10",
        wrongNextNodeId: "comprar-9",
        explanation: "我要这个 compra apontando: eu quero este.",
      },
    },
    { id: "comprar-9", speakerId: "wang", hanzi: "请再说一遍：我要这个。", pinyin: "qǐng zài shuō yí biàn: wǒ yào zhège.", pt: "Fale de novo: eu quero este.", emotion: "thinking", nextNodeId: "comprar-8" },
    { id: "comprar-10", speakerId: "wang", hanzi: "好！你要三吗？", pinyin: "hǎo! nǐ yào sān ma?", pt: "Tudo bem! Você quer três?", nextNodeId: "comprar-11" },
    {
      id: "comprar-11",
      speakerId: "lin",
      hanzi: "不，我要这个。",
      pinyin: "bù, wǒ yào zhège.",
      pt: "Não, eu quero este.",
      interaction: {
        type: "choose_meaning",
        prompt: "Lin aceitou três itens?",
        options: ["Não, ele quer este.", "Sim, ele quer três.", "Ele quer sair.", "Ele pediu água."],
        correctAnswer: "Não, ele quer este.",
        correctNextNodeId: "comprar-13",
        wrongNextNodeId: "comprar-12",
        explanation: "不 nega a quantidade três; 我要这个 mantém o pedido.",
      },
    },
    { id: "comprar-12", speakerId: "wang", hanzi: "不，三？请再说一遍。", pinyin: "bù, sān? qǐng zài shuō yí biàn.", pt: "Não, três? Tente de novo.", emotion: "confused", nextNodeId: "comprar-11" },
    { id: "comprar-13", speakerId: "wang", hanzi: "好！谢谢！", pinyin: "hǎo! xièxie!", pt: "Certo! Obrigado!", emotion: "happy", nextNodeId: "comprar-14" },
    { id: "comprar-14", speakerId: "lin", hanzi: "谢谢！再见！", pinyin: "xièxie! zàijiàn!", pt: "Obrigado! Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:qingwen", "chunk:woxianghe", "char:you", "chunk:duoshaoqian", "char:shi10", "chunk:taiguile", "char:bu", "char:shi", "chunk:woyao", "char:san", "chunk:qingzaishuoyibian", "chunk:xiexie", "chunk:zaijian"],
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
      hanzi: "你好！",
      pinyin: "nǐ hǎo!",
      pt: "Olá! O que você quer?",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Peça apontando para o prato.",
        options: ["我要这个", "再见", "你好吗", "太贵了"],
        correctAnswer: "我要这个",
        correctNextNodeId: "rest-4",
        wrongNextNodeId: "rest-3",
        explanation: "我要这个 = eu quero este.",
      },
    },
    { id: "rest-3", speakerId: "wang", hanzi: "请再说一遍：我要这个。", pinyin: "qǐng zài shuō yí biàn: wǒ yào zhège.", pt: "Tente de novo: eu quero este.", emotion: "thinking", nextNodeId: "rest-2" },
    {
      id: "rest-4",
      speakerId: "wang",
      hanzi: "好！你想喝茶吗？",
      pinyin: "hǎo! nǐ xiǎng hē chá ma?",
      pt: "Está bem! Quer beber chá?",
      interaction: {
        type: "choose_reply",
        prompt: "Aceite o chá.",
        options: ["我想喝茶", "再见", "太贵了", "我很好"],
        correctAnswer: "我想喝茶",
        correctNextNodeId: "rest-6",
        wrongNextNodeId: "rest-5",
        explanation: "我想喝茶 aceita: quero beber chá.",
      },
    },
    { id: "rest-5", speakerId: "wang", hanzi: "茶。请再说一遍。", pinyin: "chá. qǐng zài shuō yí biàn.", pt: "Chá. Tente de novo.", emotion: "thinking", nextNodeId: "rest-4" },
    { id: "rest-6", speakerId: "lin", hanzi: "我想喝茶。", pinyin: "wǒ xiǎng hē chá.", pt: "Quero beber chá.", nextNodeId: "rest-6b" },
    { id: "rest-6b", speakerId: "wang", hanzi: "好吃吗？", pinyin: "hǎochī ma?", pt: "Está gostoso?", emotion: "thinking", nextNodeId: "rest-7" },
    {
      id: "rest-7",
      speakerId: "lin",
      hanzi: "很好吃！",
      pinyin: "hěn hǎochī!",
      pt: "Muito gostoso!",
      emotion: "happy",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin achou da comida?",
        options: ["Muito gostosa.", "Muito cara.", "Ele não entendeu.", "Ele quer três."],
        correctAnswer: "Muito gostosa.",
        correctNextNodeId: "rest-9",
        wrongNextNodeId: "rest-8",
        explanation: "很好吃 elogia comida: muito gostoso.",
      },
    },
    { id: "rest-8", speakerId: "wang", hanzi: "好吃，很好吃。", pinyin: "hǎochī, hěn hǎochī.", pt: "Gostoso, muito gostoso.", emotion: "thinking", nextNodeId: "rest-7" },
    { id: "rest-9", speakerId: "lin", hanzi: "多少钱？", pinyin: "duōshao qián?", pt: "Quanto custa?", nextNodeId: "rest-10" },
    {
      id: "rest-10",
      speakerId: "wang",
      hanzi: "十。",
      pinyin: "shí.",
      pt: "Dez.",
      interaction: {
        type: "choose_meaning",
        prompt: "Qual foi o preço?",
        options: ["Dez.", "Três.", "Muito caro.", "Chá."],
        correctAnswer: "Dez.",
        correctNextNodeId: "rest-12",
        wrongNextNodeId: "rest-11",
        explanation: "十 = dez.",
      },
    },
    { id: "rest-11", speakerId: "wang", hanzi: "十。请再说一遍。", pinyin: "shí. qǐng zài shuō yí biàn.", pt: "Dez. Tente de novo.", emotion: "thinking", nextNodeId: "rest-10" },
    { id: "rest-12", speakerId: "lin", hanzi: "好，谢谢！", pinyin: "hǎo, xièxie!", pt: "Está bem, obrigado!", emotion: "happy", nextNodeId: "rest-13" },
    { id: "rest-13", speakerId: "wang", hanzi: "谢谢！再见！", pinyin: "xièxie! zàijiàn!", pt: "Obrigado! Até logo!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:woele", "chunk:nihao", "chunk:woyao", "chunk:qingzaishuoyibian", "chunk:woxianghe", "chunk:haochi", "chunk:duoshaoqian", "char:shi10", "chunk:xiexie", "chunk:zaijian", "chunk:nihaoma", "chunk:taiguile", "chunk:wohenhao"],
  newRefs: ["chunk:womenchifanba"],
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
    { id: "num-1", speakerId: "hua", hanzi: "你好！一，二，三。", pinyin: "nǐ hǎo! yī, èr, sān.", pt: "Olá! Um, dois, três.", emotion: "happy", nextNodeId: "num-2" },
    {
      id: "num-2",
      speakerId: "lin",
      hanzi: "四，五，六。",
      pinyin: "sì, wǔ, liù.",
      pt: "Quatro, cinco, seis.",
      interaction: {
        type: "choose_reply",
        prompt: "Qual número vem depois de 六?",
        options: ["七", "九", "十", "二"],
        correctAnswer: "七",
        correctNextNodeId: "num-4",
        wrongNextNodeId: "num-3",
        explanation: "Depois de 六 (seis) vem 七 (sete).",
      },
    },
    { id: "num-3", speakerId: "hua", hanzi: "不是。六，七。", pinyin: "bú shì. liù, qī.", pt: "Não. Seis, sete.", emotion: "thinking", nextNodeId: "num-2" },
    {
      id: "num-4",
      speakerId: "hua",
      hanzi: "七，八，九，十！",
      pinyin: "qī, bā, jiǔ, shí!",
      pt: "Sete, oito, nove, dez!",
      emotion: "happy",
      interaction: {
        type: "choose_meaning",
        prompt: "Que sequência o professor completou?",
        options: ["7, 8, 9, 10", "1, 2, 3, 4", "3 amigos", "10 yuan"],
        correctAnswer: "7, 8, 9, 10",
        correctNextNodeId: "num-4b",
        wrongNextNodeId: "num-5",
        explanation: "七八九十 fecha a contagem até dez.",
      },
    },
    { id: "num-5", speakerId: "hua", hanzi: "七，八，九，十。请再说一遍。", pinyin: "qī, bā, jiǔ, shí. qǐng zài shuō yí biàn.", pt: "Sete, oito, nove, dez. Tente de novo.", emotion: "thinking", nextNodeId: "num-4" },
    { id: "num-4b", speakerId: "lin", hanzi: "七，八，九，十。", pinyin: "qī, bā, jiǔ, shí.", pt: "Sete, oito, nove, dez.", emotion: "happy", nextNodeId: "num-6" },
    {
      id: "num-6",
      speakerId: "hua",
      hanzi: "你有三个朋友吗？",
      pinyin: "nǐ yǒu sān ge péngyou ma?",
      pt: "Você tem três amigos?",
      interaction: {
        type: "order_reply",
        prompt: "Responda: tenho três amigos.",
        options: ["我", "有", "三", "个", "朋", "友"],
        correctAnswer: "我有三个朋友",
        correctNextNodeId: "num-8",
        wrongNextNodeId: "num-7",
        explanation: "我有三个朋友 = tenho três amigos.",
      },
    },
    { id: "num-7", speakerId: "hua", hanzi: "三，朋友。请再说一遍。", pinyin: "sān, péngyou. qǐng zài shuō yí biàn.", pt: "Três, amigos. Fale de novo.", emotion: "thinking", nextNodeId: "num-6" },
    { id: "num-8", speakerId: "lin", hanzi: "我有三个朋友！", pinyin: "wǒ yǒu sān ge péngyou!", pt: "Tenho três amigos!", emotion: "happy", nextNodeId: "num-8b" },
    { id: "num-8b", speakerId: "hua", hanzi: "三个朋友，很好！", pinyin: "sān ge péngyou, hěn hǎo!", pt: "Três amigos, muito bem!", emotion: "happy", nextNodeId: "num-9" },
    {
      id: "num-9",
      speakerId: "hua",
      hanzi: "很好！你好吗？",
      pinyin: "hěn hǎo! nǐ hǎo ma?",
      pt: "Muito bem! Tudo bem?",
      emotion: "happy",
      interaction: {
        type: "choose_reply",
        prompt: "Responda que você está bem.",
        options: ["我很好", "不是", "再见", "十"],
        correctAnswer: "我很好",
        correctNextNodeId: "num-11",
        wrongNextNodeId: "num-10",
        explanation: "我很好 responde 你好吗？ com 'estou bem'.",
      },
    },
    { id: "num-10", speakerId: "hua", hanzi: "你好吗？我很好。", pinyin: "nǐ hǎo ma? wǒ hěn hǎo.", pt: "Tudo bem? Estou bem.", emotion: "thinking", nextNodeId: "num-9" },
    { id: "num-11", speakerId: "lin", hanzi: "我很好！", pinyin: "wǒ hěn hǎo!", pt: "Estou bem!", emotion: "happy", nextNodeId: "num-12" },
    { id: "num-12", speakerId: "hua", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihao", "char:yi", "char:er", "char:san", "char:si", "char:wu", "char:liu", "char:qi", "char:ba8", "char:jiu", "char:shi10", "char:bu", "char:shi", "chunk:woyousangepengyou", "chunk:qingzaishuoyibian", "chunk:wohenhao", "chunk:nihaoma"],
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
    { id: "hanzi-1", speakerId: "mei", hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", pt: "Tudo bem?", emotion: "happy", nextNodeId: "hanzi-2" },
    { id: "hanzi-2", speakerId: "lin", hanzi: "我很好！这是什么？", pinyin: "wǒ hěn hǎo! zhè shì shénme?", pt: "Estou bem! O que é isto?", nextNodeId: "hanzi-3" },
    {
      id: "hanzi-3",
      speakerId: "mei",
      hanzi: "这是木。",
      pinyin: "zhè shì mù.",
      pt: "Isto é madeira/árvore.",
      interaction: {
        type: "choose_reply",
        prompt: "Duas árvores 木 + 木 formam qual caractere?",
        options: ["林", "森", "山", "明"],
        correctAnswer: "林",
        correctNextNodeId: "hanzi-5",
        wrongNextNodeId: "hanzi-4",
        explanation: "木 + 木 = 林, bosque.",
      },
    },
    { id: "hanzi-4", speakerId: "mei", hanzi: "不是。木，木，林。", pinyin: "bú shì. mù, mù, lín.", pt: "Não. Árvore, árvore: bosque.", emotion: "thinking", nextNodeId: "hanzi-3" },
    { id: "hanzi-5", speakerId: "lin", hanzi: "这是林！", pinyin: "zhè shì lín!", pt: "Isto é um bosque!", emotion: "happy", nextNodeId: "hanzi-5b" },
    { id: "hanzi-5b", speakerId: "mei", hanzi: "林，很好！", pinyin: "lín, hěn hǎo!", pt: "Bosque, muito bem!", emotion: "happy", nextNodeId: "hanzi-6" },
    {
      id: "hanzi-6",
      speakerId: "mei",
      hanzi: "三木是什么？",
      pinyin: "sān mù shì shénme?",
      pt: "Três árvores formam o quê?",
      interaction: {
        type: "choose_reply",
        prompt: "Três 木 formam qual caractere?",
        options: ["森", "林", "明", "山"],
        correctAnswer: "森",
        correctNextNodeId: "hanzi-8",
        wrongNextNodeId: "hanzi-7",
        explanation: "木 + 木 + 木 = 森, floresta densa.",
      },
    },
    { id: "hanzi-7", speakerId: "mei", hanzi: "木，木，木，森。", pinyin: "mù, mù, mù, sēn.", pt: "Árvore, árvore, árvore: floresta.", emotion: "thinking", nextNodeId: "hanzi-6" },
    { id: "hanzi-8", speakerId: "lin", hanzi: "森。很好！", pinyin: "sēn. hěn hǎo!", pt: "森. Muito bem!", emotion: "happy", nextNodeId: "hanzi-9" },
    {
      id: "hanzi-9",
      speakerId: "mei",
      hanzi: "这是山吗？",
      pinyin: "zhè shì shān ma?",
      pt: "Isto é uma montanha?",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Mei perguntou?",
        options: ["Se isto é uma montanha.", "Se isto é chá.", "Se custa dez.", "Se é amanhã."],
        correctAnswer: "Se isto é uma montanha.",
        correctNextNodeId: "hanzi-11",
        wrongNextNodeId: "hanzi-10",
        explanation: "山 = montanha; 吗 transforma em pergunta.",
      },
    },
    { id: "hanzi-10", speakerId: "mei", hanzi: "山。请再说一遍。", pinyin: "shān. qǐng zài shuō yí biàn.", pt: "Montanha. Tente de novo.", emotion: "thinking", nextNodeId: "hanzi-9" },
    {
      id: "hanzi-11",
      speakerId: "lin",
      hanzi: "日，月，明。",
      pinyin: "rì, yuè, míng.",
      pt: "Sol, lua, claro.",
      interaction: {
        type: "choose_reply",
        prompt: "日 + 月 formam qual caractere?",
        options: ["明", "森", "林", "木"],
        correctAnswer: "明",
        correctNextNodeId: "hanzi-13",
        wrongNextNodeId: "hanzi-12",
        explanation: "日 + 月 = 明.",
      },
    },
    { id: "hanzi-12", speakerId: "mei", hanzi: "日，月，明。", pinyin: "rì, yuè, míng.", pt: "Sol, lua: 明.", emotion: "thinking", nextNodeId: "hanzi-11" },
    { id: "hanzi-13", speakerId: "mei", hanzi: "很好！", pinyin: "hěn hǎo!", pt: "Muito bem!", emotion: "happy" },
  ],
  learnedRefs: ["chunk:nihaoma", "chunk:wohenhao", "chunk:zheshishenme", "char:mu", "char:lin", "char:sen", "char:shan", "char:ri", "char:yue", "char:ming", "char:bu", "char:shi", "char:san", "chunk:qingzaishuoyibian"],
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
    {
      id: "mercado-2",
      speakerId: "lin",
      hanzi: "我很好！请问，我想喝茶。",
      pinyin: "wǒ hěn hǎo! qǐng wèn, wǒ xiǎng hē chá.",
      pt: "Estou bem! Com licença, quero beber chá.",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin procura no mercado?",
        options: ["Chá.", "Uma passagem.", "Uma montanha.", "A mãe de Wang."],
        correctAnswer: "Chá.",
        correctNextNodeId: "mercado-4",
        wrongNextNodeId: "mercado-3",
        explanation: "我想喝茶 mostra que ele quer chá.",
      },
    },
    { id: "mercado-3", speakerId: "wang", hanzi: "茶。请再说一遍。", pinyin: "chá. qǐng zài shuō yí biàn.", pt: "Chá. Tente de novo.", emotion: "thinking", nextNodeId: "mercado-2" },
    {
      id: "mercado-4",
      speakerId: "wang",
      hanzi: "有！你要三吗？",
      pinyin: "yǒu! nǐ yào sān ma?",
      pt: "Tem! Você quer três?",
      interaction: {
        type: "choose_reply",
        prompt: "Você quer três unidades.",
        options: ["我要三", "我要这个", "太贵了", "再见"],
        correctAnswer: "我要三",
        correctNextNodeId: "mercado-6",
        wrongNextNodeId: "mercado-5",
        explanation: "我要三 = quero três.",
      },
    },
    { id: "mercado-5", speakerId: "wang", hanzi: "三。请再说一遍。", pinyin: "sān. qǐng zài shuō yí biàn.", pt: "Três. Tente de novo.", emotion: "thinking", nextNodeId: "mercado-4" },
    { id: "mercado-6", speakerId: "wang", hanzi: "好，三。", pinyin: "hǎo, sān.", pt: "Certo, três.", emotion: "happy", nextNodeId: "mercado-6b" },
    { id: "mercado-6b", speakerId: "lin", hanzi: "好，三。", pinyin: "hǎo, sān.", pt: "Certo, três.", emotion: "happy", nextNodeId: "mercado-7" },
    {
      id: "mercado-7",
      speakerId: "lin",
      hanzi: "多少钱？",
      pinyin: "duōshao qián?",
      pt: "Quanto custa?",
      interaction: {
        type: "choose_meaning",
        prompt: "O que Lin perguntou?",
        options: ["O preço.", "O nome.", "Onde fica.", "Se está tudo bem."],
        correctAnswer: "O preço.",
        correctNextNodeId: "mercado-9",
        wrongNextNodeId: "mercado-8",
        explanation: "多少钱 pergunta quanto custa.",
      },
    },
    { id: "mercado-8", speakerId: "wang", hanzi: "多少钱，钱。请再说一遍。", pinyin: "duōshao qián, qián. qǐng zài shuō yí biàn.", pt: "Preço, dinheiro. Tente de novo.", emotion: "thinking", nextNodeId: "mercado-7" },
    {
      id: "mercado-9",
      speakerId: "wang",
      hanzi: "十。",
      pinyin: "shí.",
      pt: "Dez.",
      interaction: {
        type: "choose_reply",
        prompt: "Escolha uma estratégia: negociar ou pagar cheio.",
        options: ["太贵了", "好"],
        correctAnswer: "太贵了",
        correctNextNodeId: "mercado-11",
        wrongNextNodeId: "mercado-cheio-1",
        explanation: "太贵了 negocia; 好 aceita pagar o preço cheio.",
      },
    },
    { id: "mercado-cheio-1", speakerId: "wang", hanzi: "好，十。谢谢！", pinyin: "hǎo, shí. xièxie!", pt: "Certo, dez. Obrigado!", emotion: "happy", nextNodeId: "mercado-cheio-2" },
    { id: "mercado-cheio-2", speakerId: "lin", hanzi: "好……再见！", pinyin: "hǎo…… zàijiàn!", pt: "Está bem... até logo. (pagou o preço cheio)", emotion: "thinking" },
    { id: "mercado-11", speakerId: "wang", hanzi: "好，好！不贵。", pinyin: "hǎo, hǎo! bú guì.", pt: "Está bem, está bem! Não fica caro.", emotion: "thinking", nextNodeId: "mercado-11b" },
    { id: "mercado-11b", speakerId: "lin", hanzi: "太好了！", pinyin: "tài hǎo le!", pt: "Ótimo!", emotion: "happy", nextNodeId: "mercado-12" },
    {
      id: "mercado-12",
      speakerId: "lin",
      hanzi: "我要这个。",
      pinyin: "wǒ yào zhège.",
      pt: "Eu quero este.",
      emotion: "happy",
      interaction: {
        type: "order_reply",
        prompt: "Monte a compra: eu quero este.",
        options: ["我", "要", "这", "个", "三"],
        correctAnswer: "我要这个",
        correctNextNodeId: "mercado-14",
        wrongNextNodeId: "mercado-13",
        explanation: "我要这个 confirma a compra apontando para o item.",
      },
    },
    { id: "mercado-13", speakerId: "wang", hanzi: "请再说一遍：我要这个。", pinyin: "qǐng zài shuō yí biàn: wǒ yào zhège.", pt: "Fale de novo: eu quero este.", emotion: "thinking", nextNodeId: "mercado-12" },
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
  learnedRefs: ["chunk:nihao", "chunk:xiexie", "chunk:zheshimama", "chunk:qingzaishuoyibian", "chunk:zheshibaba", "chunk:woxianghe", "char:bu", "chunk:nihaoma", "chunk:wohenhao", "chunk:mingtianjian", "chunk:zaijian", "chunk:taiguile", "chunk:woele"],
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
  // Só os requiredRefs (learnedRefs) precisam estar disponíveis; optionalRefs
  // ausentes são simplesmente omitidos.
  return CONVERSATION_SCENES.filter((scene) => scene.learnedRefs.every((ref) => refSet.has(ref)));
}
