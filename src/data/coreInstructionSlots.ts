import type { JourneyNode } from "./journeyOrchestrator";
import type { LessonCapsule } from "./lessonCapsules";
import { FOUNDATION_TARGET_IDS } from "./pedagogicalSpine";

/**
 * V4.9.3 — Parte A: o lugar da aula explicativa dentro do currículo.
 *
 * A V4.9.2B deu ao catálogo runtime um poder deliberadamente pequeno: uma
 * aula publicada só diz DEPOIS DE QUAL TÓPICO aparecer, e nunca vira
 * pré-requisito de nada. Isso é o que torna publicar sem code review seguro,
 * e não vai mudar.
 *
 * Mas cinco explicações não são enriquecimento — são o currículo. "O que é
 * mandarim?" não pode ser um card opcional que o aluno talvez veja depois de
 * já ter sido cobrado. Ela precisa acontecer ANTES, e o sistema precisa poder
 * afirmar isso.
 *
 * O `CoreInstructionSlot` resolve os dois lados. A IDENTIDADE pedagógica —
 * onde a aula entra, o que ela ensina, o que conta como concluí-la — mora
 * aqui, em código, revisada como código. A APRESENTAÇÃO — qual arquivo toca,
 * qual voz fala, quais legendas aparecem — continua podendo vir do catálogo,
 * sem rebuild.
 *
 * A separação é a coisa toda: quem publica conteúdo ganha o poder de trocar
 * uma animação por um vídeo gravado, e não ganha o poder de mudar o que a
 * aula ensina nem quando ela acontece.
 */

/**
 * Onde o slot entra em relação ao tópico.
 *
 * `BEFORE_TOPIC` é o caso que motiva tudo: a explicação precede a primeira
 * cobrança. Os outros dois existem porque a wave 1 já mostra a necessidade —
 * uma síntese depois do tópico, e a aula de tons partida entre passes para
 * não despejar quatro tons de uma vez (Parte E1).
 */
export type InstructionPlacement = "BEFORE_TOPIC" | "AFTER_TOPIC" | "BETWEEN_PASSES";

/**
 * Concluir uma aula é ter recebido a instrução, não ter provado domínio.
 *
 * Um único valor hoje, e nomeado em vez de booleano de propósito: quando
 * aparecer uma segunda política, o compilador vai apontar cada lugar que
 * assumia esta. E o nome deixa explícito, em cada uso, que assistir não é
 * aprender — quem mede aprendizagem são os exercícios seguintes.
 */
export type InstructionCompletionPolicy = "INSTRUCTION_COMPLETED";

export interface CoreInstructionSlot {
  id: string;
  topicId: string;
  placement: InstructionPlacement;
  /** Só para `BETWEEN_PASSES`: o pass a partir do qual a aula aparece. */
  beforePass?: number;
  /** Cápsula embutida que preenche o slot. Sempre existe: ver `fallbackCapsuleId`. */
  capsuleId: string;
  /**
   * A cápsula a usar se a apresentação publicada falhar.
   *
   * Hoje é sempre a própria embutida, e é esse o ponto: um slot CORE nunca
   * depende de conteúdo remoto para existir. O campo é explícito para que
   * ninguém no futuro preencha um slot com uma cápsula que só chega pela rede.
   */
  fallbackCapsuleId: string;
  knowledgeTargets: string[];
  completionPolicy: InstructionCompletionPolicy;
  /** Sempre falso. Instrução não é avaliação; ver `InstructionCompletionPolicy`. */
  affectsMastery: false;
}

const F = FOUNDATION_TARGET_IDS;

/**
 * Parte B — o mapa de ensino da fundação.
 *
 * A ordem é a ordem em que um ser humano consegue receber isso: o que é a
 * língua, como se escreve o som dela, o que o som carrega, como se escreve a
 * língua, e como essa escrita é construída. Cada aula só pode assumir o que
 * as anteriores ensinaram.
 */
export const FOUNDATION_INSTRUCTION_SLOTS: CoreInstructionSlot[] = [
  {
    id: "instruction:foundation:mandarin",
    topicId: "p1-o-que-e-mandarim",
    placement: "BEFORE_TOPIC",
    capsuleId: "capsule:foundation:mandarin:v1",
    fallbackCapsuleId: "capsule:foundation:mandarin:v1",
    // 你好 entra aqui porque é o que a aula demonstra. Sem declarar, o
    // teach-before-test não saberia que a primeira exposição existiu.
    knowledgeTargets: [F.mandarin, F.greetingIntent, F.nihao],
    completionPolicy: "INSTRUCTION_COMPLETED",
    affectsMastery: false,
  },
  {
    id: "instruction:foundation:pinyin",
    topicId: "p1-o-que-e-pinyin",
    placement: "BEFORE_TOPIC",
    capsuleId: "capsule:foundation:pinyin:v1",
    fallbackCapsuleId: "capsule:foundation:pinyin:v1",
    knowledgeTargets: [F.pinyin],
    completionPolicy: "INSTRUCTION_COMPLETED",
    affectsMastery: false,
  },
  {
    id: "instruction:foundation:tone",
    topicId: "p1-o-que-e-tom",
    placement: "BEFORE_TOPIC",
    capsuleId: "capsule:foundation:tone:v1",
    fallbackCapsuleId: "capsule:foundation:tone:v1",
    // Parte E1 pede progressão, não uma segunda aula: 1º × 3º primeiro,
    // 2º × 4º depois, e só então o mapa dos quatro — tudo dentro desta
    // cápsula, em segmentos. Quatro contornos numa tela só é organizado no
    // papel; em segmentos o aluno recebe dois de cada vez.
    knowledgeTargets: [F.tone, F.tone1, F.tone2, F.tone3, F.tone4],
    completionPolicy: "INSTRUCTION_COMPLETED",
    affectsMastery: false,
  },
  {
    id: "instruction:foundation:hanzi",
    topicId: "p1-o-que-e-hanzi",
    placement: "BEFORE_TOPIC",
    capsuleId: "capsule:foundation:hanzi:v1",
    fallbackCapsuleId: "capsule:foundation:hanzi:v1",
    knowledgeTargets: [F.hanzi],
    completionPolicy: "INSTRUCTION_COMPLETED",
    affectsMastery: false,
  },
  {
    id: "instruction:foundation:hanzi-components",
    topicId: "p1-primeiros-hanzi",
    // Não `BEFORE_TOPIC`, e a diferença é pedagógica, não técnica: a aula
    // ensina composição mostrando 人 + 木 = 休, e 人 e 木 são ensinados nos
    // dois primeiros passes DESTE tópico. Colocada antes do tópico, ela
    // explicaria composição com peças que o aluno ainda não viu — seria a
    // própria surpresa que a Parte N1 manda eliminar.
    placement: "BETWEEN_PASSES",
    beforePass: 3,
    capsuleId: "capsule:foundation:hanzi-components:v1",
    fallbackCapsuleId: "capsule:foundation:hanzi-components:v1",
    knowledgeTargets: [F.components],
    completionPolicy: "INSTRUCTION_COMPLETED",
    affectsMastery: false,
  },
];

export function getCoreInstructionSlot(id: string): CoreInstructionSlot | undefined {
  return FOUNDATION_INSTRUCTION_SLOTS.find((slot) => slot.id === id);
}

/** Slots que precedem um tópico, na ordem declarada. */
export function instructionSlotsBeforeTopic(topicId: string): CoreInstructionSlot[] {
  return FOUNDATION_INSTRUCTION_SLOTS.filter(
    (slot) => slot.topicId === topicId && slot.placement === "BEFORE_TOPIC"
  );
}

export function instructionSlotsAfterTopic(topicId: string): CoreInstructionSlot[] {
  return FOUNDATION_INSTRUCTION_SLOTS.filter(
    (slot) => slot.topicId === topicId && slot.placement === "AFTER_TOPIC"
  );
}

/** Slots que entram no meio do tópico, antes de um pass específico. */
export function instructionSlotsBeforePass(topicId: string, pass: number): CoreInstructionSlot[] {
  return FOUNDATION_INSTRUCTION_SLOTS.filter(
    (slot) =>
      slot.topicId === topicId && slot.placement === "BETWEEN_PASSES" && slot.beforePass === pass
  );
}

/** O slot que uma cápsula preenche, se preencher algum. */
export function slotForCapsuleId(capsuleId: string): CoreInstructionSlot | undefined {
  return FOUNDATION_INSTRUCTION_SLOTS.find((slot) => slot.capsuleId === capsuleId);
}

/**
 * Os ids de cápsula que o currículo reserva.
 *
 * Usado pelo catálogo para recusar qualquer manifesto que tente publicar uma
 * cápsula com um destes ids: seria conteúdo sem revisão ocupando uma posição
 * canônica do currículo — exatamente o que a Parte A1 proíbe.
 */
export function reservedCoreCapsuleIds(): Set<string> {
  return new Set(
    FOUNDATION_INSTRUCTION_SLOTS.flatMap((slot) => [slot.capsuleId, slot.fallbackCapsuleId])
  );
}

/**
 * Os alvos que a instrução CORE apresenta antes do tópico começar.
 *
 * É o que o teach-before-test (Parte M) consulta para saber que a primeira
 * exposição de um alvo aconteceu numa aula, e não num exercício.
 */
export function instructionTargetsBeforeTopic(topicId: string): string[] {
  return instructionSlotsBeforeTopic(topicId).flatMap((slot) => slot.knowledgeTargets);
}

/**
 * O slot como node da Jornada.
 *
 * `priority: "CORE"` porque a aula é currículo, não enriquecimento — ela
 * precisa aparecer com o peso do caminho principal, e não como um card
 * lateral que o aluno pode não ver.
 *
 * E, ao mesmo tempo, sem NENHUM requisito. Um portão numa aula explicativa
 * seria um contrassenso: o pré-requisito da explicação é justamente não saber
 * ainda. Trancar a aula que ensina X atrás de saber X é o defeito que a V4.9.3
 * inteira existe para eliminar.
 *
 * `affectsCoreMastery` é falso pela mesma razão de sempre: assistir ensina,
 * quem mede aprendizagem são os exercícios.
 */
function slotAsJourneyNode(slot: CoreInstructionSlot): JourneyNode {
  return {
    // `slot.id` já começa com "instruction:", então o prefixo é só "node:".
    id: `node:${slot.id}`,
    type: "LESSON_CAPSULE",
    priority: "CORE",
    sourceThemeId: "theme:foundation-instruction",
    sourceId: slot.capsuleId,
    affectsCoreMastery: false,
  };
}

/** Nodes de instrução que precedem o tópico, na ordem de ensino. */
export function instructionNodesBeforeTopic(topicId: string): JourneyNode[] {
  return instructionSlotsBeforeTopic(topicId).map(slotAsJourneyNode);
}

export function instructionNodesAfterTopic(topicId: string): JourneyNode[] {
  return instructionSlotsAfterTopic(topicId).map(slotAsJourneyNode);
}

/**
 * Aulas que acontecem DENTRO do tópico, entre passes.
 *
 * Na trilha elas aparecem logo depois do node do tópico, e não antes: é ali
 * que o aluno as encontra de fato, depois de já ter feito os primeiros passes.
 * Desenhá-las antes prometeria uma aula que ainda não faz sentido para ele.
 */
export function instructionNodesWithinTopic(topicId: string): JourneyNode[] {
  return FOUNDATION_INSTRUCTION_SLOTS.filter(
    (slot) => slot.topicId === topicId && slot.placement === "BETWEEN_PASSES"
  ).map(slotAsJourneyNode);
}

/** O slot por trás de um node de instrução, se for um. */
export function slotForJourneyNodeId(nodeId: string): CoreInstructionSlot | undefined {
  const prefix = "node:";
  if (!nodeId.startsWith(prefix)) return undefined;
  return getCoreInstructionSlot(nodeId.slice(prefix.length));
}

/** Verdadeiro quando a cápsula ocupa um slot canônico do currículo. */
export function isCoreInstructionCapsule(capsule: Pick<LessonCapsule, "id">): boolean {
  return reservedCoreCapsuleIds().has(capsule.id);
}
