/**
 * RC2.2.6 — Culture Progression Gates.
 *
 * Cultura deixa de ser conteúdo ao lado e passa a ter função de progressão:
 * a Jornada libera Culture, Culture ensina o contexto, a conclusão gera um
 * Seal, e o Seal libera o marco seguinte da Jornada.
 *
 * Três princípios que este arquivo materializa:
 *
 * 1. NENHUMA MOEDA NOVA. A chave é o `CULTURE_SEALS` que já existe. Não há
 *    CultureKey, CultureCoin, DragonToken nem passaporte paralelo.
 * 2. UMA LISTA SÓ. `requiredCultureItemIds` não é mantido aqui — é derivado de
 *    `CULTURE_SEALS`, para que registry e selo nunca divirjam.
 * 3. FORA DO HASH DO CURRÍCULO. `journey.ts`, `cultureNative.ts` e
 *    `cultureLessons.ts` entram no fingerprint da Jornada (516692632525), então
 *    a semântica de gate mora aqui e decora os call sites — nunca dentro deles.
 *
 * Cultura necessária: sim. Cultura o tempo inteiro: não. Três marcos, escolhidos
 * porque o Mandarim seguinte realmente assume aquele contexto.
 */

import { CULTURE_SEALS, type CultureSealId } from "./cultureQuest";

export type CultureProgressionGateId =
  | "gate-social-etiquette"
  | "gate-chinese-table"
  | "gate-urban-china";

export type CultureProgressionGate = {
  id: CultureProgressionGateId;
  /** Selo existente usado como chave. A fonte dos requisitos é ele, não esta linha. */
  requiredSealId: CultureSealId;
  /** Tópico de Mandarim que só abre com o selo na mão. */
  beforeTopicId: string;
  titlePt: string;
  titleEn: string;
  /** Por que o conteúdo seguinte assume esse contexto — o dragão fala isto. */
  reasonPt: string;
  reasonEn: string;
  /** Ordem de apresentação quando mais de um marco estiver visível. */
  priority: number;
};

/**
 * Primeira wave: só três marcos, todos com requisitos Culture CORE que já têm
 * placement na Jornada antes do alvo. `festivals`, `gift-sense`, `work-school` e
 * `visitor-ready` ficam de fora de propósito — misturam conteúdo EXPLORE,
 * hub-only ou mais tardio, e virariam pedágio em vez de preparo.
 */
export const CULTURE_PROGRESSION_GATES: readonly CultureProgressionGate[] = [
  {
    id: "gate-social-etiquette",
    requiredSealId: "social-etiquette",
    // l9 "Me apresentar" abre a fase 3: a partir daí o aluno se apresenta, pergunta
    // nomes, diz que não entendeu e pede para repetir. A interação social deixa de
    // ser frase solta e vira troca — que é exatamente o que este selo prepara.
    beforeTopicId: "l9",
    titlePt: "Selo de Etiqueta Social",
    titleEn: "Social Etiquette Seal",
    reasonPt:
      "Você já sabe as frases. Agora vamos ver como elas aparecem numa conversa de verdade, porque daqui em diante você vai se apresentar e pedir ajuda a pessoas reais.",
    reasonEn:
      "You already know the phrases. Now let's see how they show up in a real exchange, because from here on you'll introduce yourself and ask real people for help.",
    priority: 1,
  },
  {
    id: "gate-urban-china",
    requiredSealId: "urban-china",
    // p6-survival-mandarin "Survival: pagar, hotel, ajuda" assume literalmente
    // pagamento por celular e QR no transporte. Os dois requisitos estão ancorados
    // antes: digital-pay em l27 e metro-qr em p6-cidade-lugares.
    beforeTopicId: "p6-survival-mandarin",
    titlePt: "Selo da China Urbana",
    titleEn: "Urban China Seal",
    reasonPt:
      "O próximo bloco é pagar, se virar no transporte e pedir ajuda na cidade. Vale entender antes como o pagamento por celular e o QR do metrô funcionam no dia a dia.",
    reasonEn:
      "The next block is paying, getting around and asking for help in the city. It's worth understanding first how mobile payment and the metro QR actually work day to day.",
    priority: 2,
  },
  {
    id: "gate-chinese-table",
    requiredSealId: "chinese-table",
    // p7-imersao-casa-amigo é a visita à casa da amiga: pratos no centro, hashi
    // em repouso, anfitriã insistindo. Sem esse contexto a imersão vira só
    // vocabulário. shared-dishes (l26b) e chopsticks-rest (l26c) vêm bem antes.
    beforeTopicId: "p7-imersao-casa-amigo",
    titlePt: "Selo da Mesa Chinesa",
    titleEn: "Chinese Table Seal",
    reasonPt:
      "Você vai ser recebido na casa de alguém. A mesa tem combinados próprios, e conhecê-los antes deixa a visita muito mais leve.",
    reasonEn:
      "You're about to be hosted in someone's home. The table has its own unspoken rules, and knowing them beforehand makes the visit far easier.",
    priority: 3,
  },
] as const;

/**
 * Requisitos do marco. Derivado do selo — jamais uma segunda lista mantida à mão.
 * Se `CULTURE_SEALS` mudar, o gate muda junto, por construção.
 */
export function requiredCultureItemIdsForGate(
  gate: Pick<CultureProgressionGate, "requiredSealId">
): readonly string[] {
  return CULTURE_SEALS.find((seal) => seal.id === gate.requiredSealId)?.requiredItemIds ?? [];
}

export function cultureProgressionGateById(
  id: string | undefined | null
): CultureProgressionGate | undefined {
  return CULTURE_PROGRESSION_GATES.find((gate) => gate.id === id);
}

/** O marco que guarda este tópico, se houver. Chave da leitura por lesson. */
export function cultureProgressionGateBeforeTopic(
  topicId: string | undefined | null
): CultureProgressionGate | undefined {
  if (!topicId) return undefined;
  return CULTURE_PROGRESSION_GATES.find((gate) => gate.beforeTopicId === topicId);
}

/** Todos os tópicos guardados — usado por UI e validadores. */
export const CULTURE_GATED_TOPIC_IDS: readonly string[] = CULTURE_PROGRESSION_GATES.map(
  (gate) => gate.beforeTopicId
);

/** Todo CultureItem que participa de algum marco obrigatório (Hub mostra etiqueta). */
export const CULTURE_GATE_REQUIRED_ITEM_IDS: readonly string[] = [
  ...new Set(CULTURE_PROGRESSION_GATES.flatMap((gate) => requiredCultureItemIdsForGate(gate))),
];

/** O marco que usa este CultureItem — para a etiqueta "Usado na Jornada" no Hub. */
export function cultureProgressionGateForItem(
  itemId: string | undefined | null
): CultureProgressionGate | undefined {
  if (!itemId) return undefined;
  return CULTURE_PROGRESSION_GATES.find((gate) =>
    requiredCultureItemIdsForGate(gate).includes(itemId)
  );
}
