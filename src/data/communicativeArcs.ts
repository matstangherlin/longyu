/**
 * V4.9.4 — Parte A: o arco comunicativo.
 *
 * A pergunta que este arquivo responde não é "quais lições existem", e sim
 * "o que o aluno CONSEGUE FAZER depois de passar por elas". São coisas
 * diferentes, e até aqui o Longyu só sabia responder a primeira.
 *
 * Por que um conceito novo em vez de um `Theme`: os temas são derivados 1:1
 * das units da Jornada (`journeyThemes.ts`), e alimentam gates que dependem
 * dessa correspondência. "Primeiros contatos" não é uma unit — é um arco que
 * atravessa duas (u1-1 e u1-2). Criar um tema gigante para acomodá-lo
 * significaria reorganizar as units, e a Fase 0 é explícita em não
 * reorganizar 113 tópicos cegamente. O arco é uma camada ADITIVA: ele não
 * move nenhum tópico, não renomeia nada e não muda a ordem de ninguém.
 *
 * Cada capability aponta para evidência REAL, verificada pelo gate: o tópico
 * existe, os refs existem, e o tópico realmente os contém. Uma capability sem
 * evidência é uma promessa ao aluno que ninguém checou.
 */

export type ArcRequirementLevel = "CORE_REQUIRED" | "RECOMMENDED" | "OPTIONAL";

export interface CommunicativeCapability {
  id: string;
  labelPt: string;
  labelEn: string;
  /**
   * Onde o currículo REALMENTE ensina isto. Não é aspiração: o gate confere
   * que cada ref aparece nos `libraryItems` do tópico declarado.
   */
  evidenceTopicId: string;
  evidenceRefs: string[];
  level: ArcRequirementLevel;
}

export interface CommunicativeArc {
  id: string;
  titlePt: string;
  titleEn: string;
  outcomePt: string;
  outcomeEn: string;
  /** Tópicos do arco, na ordem real da Jornada. Nenhum é movido. */
  topicIds: string[];
  capabilities: CommunicativeCapability[];
  /** Reforços sugeridos. Nunca CORE: booster não bloqueia caminho. */
  recommendedBoosterIds: string[];
}

/**
 * `first_contacts` — o primeiro arco realmente comunicativo do Longyu.
 *
 * Uma decisão que a auditoria tomou por mim: **origem ficou de fora.**
 * `chunk:nishinaiguoren` (你是哪国人?) só aparece em `l9` e `l10`, cerca de
 * vinte lições adiante, dentro do bloco de apresentação. Incluí-la aqui
 * exigiria arrastar essas lições para frente — reorganização cega — ou
 * inventar uma formulação paralela para dizer a mesma coisa. As duas coisas
 * são proibidas, e as duas seriam piores para o aluno do que um arco honesto
 * que termina onde o currículo termina.
 *
 * O arco entrega cumprimento, nome, cortesia, despedida e a primeira conversa.
 * Origem é o arco seguinte, e é assim que deve ser.
 */
export const FIRST_CONTACTS_ARC: CommunicativeArc = {
  id: "arc:first-contacts",
  titlePt: "Primeiros contatos",
  titleEn: "First Contacts",
  outcomePt:
    "Cumprimente alguém, diga seu nome, pergunte o nome do outro, use cortesias e encerre a conversa.",
  outcomeEn:
    "Greet someone, say your name, ask for theirs, use basic courtesy and close the conversation.",
  topicIds: [
    "l1",
    "l2",
    "l3",
    "l4",
    "p1-ate-logo",
    "p1-primeira-conversa",
    "p1-qingwen-cortesia",
  ],
  capabilities: [
    {
      id: "FC01_GREET",
      labelPt: "Cumprimentar",
      labelEn: "Greet someone",
      evidenceTopicId: "l2",
      evidenceRefs: ["chunk:nihao", "chunk:zaoshanghao"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC02_REPLY_TO_GREETING",
      labelPt: "Responder a um cumprimento",
      labelEn: "Reply to a greeting",
      evidenceTopicId: "l3",
      evidenceRefs: ["chunk:nihaoma", "chunk:wohenhao"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC03_SAY_NAME",
      labelPt: "Dizer seu nome",
      labelEn: "Say your name",
      evidenceTopicId: "l2",
      evidenceRefs: ["chunk:wojiao"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC04_ASK_NAME",
      labelPt: "Perguntar o nome de alguém",
      labelEn: "Ask someone's name",
      evidenceTopicId: "p1-primeira-conversa",
      evidenceRefs: ["chunk:nijiaoshenme"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC05_BASIC_COURTESY",
      labelPt: "Agradecer e responder",
      labelEn: "Thank someone and reply",
      evidenceTopicId: "l4",
      evidenceRefs: ["chunk:xiexie", "chunk:bukeqi"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC06_POLITE_APPROACH",
      labelPt: "Abordar alguém com licença",
      labelEn: "Approach someone politely",
      evidenceTopicId: "p1-qingwen-cortesia",
      evidenceRefs: ["chunk:qingwen"],
      level: "RECOMMENDED",
    },
    {
      id: "FC07_CLOSE_CONVERSATION",
      labelPt: "Encerrar a conversa",
      labelEn: "Close the conversation",
      evidenceTopicId: "p1-ate-logo",
      evidenceRefs: ["chunk:zaijian", "chunk:mingtianjian"],
      level: "CORE_REQUIRED",
    },
    {
      id: "FC08_FIRST_CONTACT_CONVERSATION",
      labelPt: "Conduzir uma primeira conversa",
      labelEn: "Hold a first conversation",
      evidenceTopicId: "p1-primeira-conversa",
      evidenceRefs: ["chunk:nihao", "chunk:nijiaoshenme", "chunk:wojiao", "chunk:zaijian"],
      level: "CORE_REQUIRED",
    },
  ],
  // Blitz e revisão reforçam; nenhum deles tranca o arco (Parte S).
  recommendedBoosterIds: ["booster:foundations-blitz:v1", "booster:shared-srs-review:v1"],
};

export const COMMUNICATIVE_ARCS: CommunicativeArc[] = [FIRST_CONTACTS_ARC];

export function arcForTopic(topicId: string): CommunicativeArc | undefined {
  return COMMUNICATIVE_ARCS.find((arc) => arc.topicIds.includes(topicId));
}

export function getCommunicativeArc(id: string): CommunicativeArc | undefined {
  return COMMUNICATIVE_ARCS.find((arc) => arc.id === id);
}

/**
 * O que o arco EXIGE para ser considerado concluído (Parte S).
 *
 * Concluir não é "assistiu tudo": é ter alcançado as capabilities marcadas
 * como `CORE_REQUIRED`. Um booster opcional não pode segurar ninguém, e uma
 * capability recomendada — abordar alguém com 请问 — enriquece sem bloquear.
 */
export function coreRequiredCapabilities(arc: CommunicativeArc): CommunicativeCapability[] {
  return arc.capabilities.filter((capability) => capability.level === "CORE_REQUIRED");
}

/**
 * Progresso do arco, derivado dos tópicos já concluídos.
 *
 * Deriva de `completedTopicIds` de propósito: a Parte R1 pede progresso
 * visível e proíbe inventar outro sistema de mastery. Uma capability conta
 * como alcançada quando o tópico que a ensina foi concluído — a mesma
 * verdade que a Jornada já mostra, sem uma segunda fonte para discordar dela.
 */
export function arcCapabilityProgress(
  arc: CommunicativeArc,
  completedTopicIds: readonly string[]
): { reached: CommunicativeCapability[]; total: CommunicativeCapability[] } {
  const done = new Set(completedTopicIds);
  const total = coreRequiredCapabilities(arc);
  return { reached: total.filter((capability) => done.has(capability.evidenceTopicId)), total };
}
