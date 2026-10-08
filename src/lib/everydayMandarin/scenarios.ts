/**
 * RC2.3.2 — banco de micro-situações cotidianas reutilizáveis.
 * Evolui por mastery pass (não 4 cenas redundantes).
 */
import type { EverydayIntent, RealWorldDomain, LearnerAgency } from "./intents";

export interface EverydayScenario {
  id: string;
  domain: RealWorldDomain;
  intent: EverydayIntent;
  locationPt: string;
  participantRolePt: string;
  goalPt: string;
  /** Cena visual âncora (RC2.3.1 PEDAGOGY_VISUAL_SCENES id) quando existir. */
  visualSceneId?: string;
  npcLineHanzi?: string;
  npcLinePinyin?: string;
  learnerGoalPt: string;
  expectedHanzi: string;
  acceptableAlternatives?: readonly string[];
  prerequisiteHanzi?: readonly string[];
  afterUnitIndex: number;
  /** Pass mínimo para aparecer como atividade principal. */
  minMasteryPass: number;
  difficulty: 1 | 2 | 3 | 4;
}

export interface ScenarioPassBehavior {
  agency: LearnerAgency;
  showNpcLine: boolean;
  showTranslation: boolean;
  showOptions: boolean;
  promptPt: string;
}

/** Comportamento do mesmo cenário por mastery pass. */
export function scenarioBehaviorForPass(scenario: EverydayScenario, masteryPass: number): ScenarioPassBehavior {
  const pass = Math.max(1, Math.min(4, masteryPass)) as 1 | 2 | 3 | 4;
  if (pass <= 1) {
    return {
      agency: "CHOOSE",
      showNpcLine: true,
      showTranslation: true,
      showOptions: true,
      promptPt: scenario.learnerGoalPt,
    };
  }
  if (pass === 2) {
    return {
      agency: "CHOOSE",
      showNpcLine: true,
      showTranslation: false,
      showOptions: true,
      promptPt: scenario.learnerGoalPt.replace(/\. Qual.*/, ".").replace(/\?$/, "?"),
    };
  }
  if (pass === 3) {
    return {
      agency: "PRODUCE",
      showNpcLine: true,
      showTranslation: false,
      showOptions: false,
      promptPt: `${scenario.locationPt}: ${scenario.goalPt}. Responda.`,
    };
  }
  return {
    agency: "TRANSFER",
    showNpcLine: true,
    showTranslation: false,
    showOptions: false,
    promptPt: `Nova situação — ${scenario.participantRolePt} em ${scenario.locationPt}. ${scenario.goalPt}.`,
  };
}

export const EVERYDAY_SCENARIOS: readonly EverydayScenario[] = [
  {
    id: "everyday:greet-street",
    domain: "SOCIAL",
    intent: "GREET",
    locationPt: "rua",
    participantRolePt: "conhecido",
    goalPt: "cumprimentar",
    visualSceneId: "scene:greet-street",
    npcLineHanzi: "你好！",
    npcLinePinyin: "nǐ hǎo!",
    learnerGoalPt: "Você encontra alguém. O que diz?",
    expectedHanzi: "你好",
    prerequisiteHanzi: ["你好"],
    afterUnitIndex: 0,
    minMasteryPass: 1,
    difficulty: 1,
  },
  {
    id: "everyday:how-are-you",
    domain: "SOCIAL",
    intent: "ASK_HOW_ARE_YOU",
    locationPt: "rua",
    participantRolePt: "amigo",
    goalPt: "perguntar como está",
    visualSceneId: "scene:greet-street",
    npcLineHanzi: "你好！",
    learnerGoalPt: "Depois do cumprimento, pergunte como a pessoa está.",
    expectedHanzi: "你好吗？",
    acceptableAlternatives: ["你好吗"],
    prerequisiteHanzi: ["你好", "你好吗"],
    afterUnitIndex: 0,
    minMasteryPass: 1,
    difficulty: 2,
  },
  {
    id: "everyday:respond-well",
    domain: "SOCIAL",
    intent: "RESPOND_STATE",
    locationPt: "rua",
    participantRolePt: "amigo",
    goalPt: "responder como está",
    npcLineHanzi: "你好吗？",
    npcLinePinyin: "nǐ hǎo ma?",
    learnerGoalPt: "Alguém pergunta como você está. Responda.",
    expectedHanzi: "我很好",
    acceptableAlternatives: ["我很好。", "我很好，你呢？"],
    prerequisiteHanzi: ["我很好"],
    afterUnitIndex: 0,
    minMasteryPass: 1,
    difficulty: 2,
  },
  {
    id: "everyday:thank",
    domain: "SOCIAL",
    intent: "THANK",
    locationPt: "rua",
    participantRolePt: "pessoa que ajudou",
    goalPt: "agradecer",
    learnerGoalPt: "Alguém ajudou você. O que diz?",
    expectedHanzi: "谢谢",
    prerequisiteHanzi: ["谢谢"],
    afterUnitIndex: 0,
    minMasteryPass: 1,
    difficulty: 1,
  },
  {
    id: "everyday:goodbye",
    domain: "SOCIAL",
    intent: "SAY_GOODBYE",
    locationPt: "rua",
    participantRolePt: "conhecido",
    goalPt: "despedir-se",
    learnerGoalPt: "Vocês se veem amanhã. Qual despedida combina?",
    expectedHanzi: "再见",
    acceptableAlternatives: ["明天见"],
    prerequisiteHanzi: ["再见"],
    afterUnitIndex: 0,
    minMasteryPass: 1,
    difficulty: 1,
  },
  {
    id: "everyday:order-tea",
    domain: "FOOD",
    intent: "ORDER_DRINK",
    locationPt: "restaurante",
    participantRolePt: "atendente",
    goalPt: "pedir chá",
    visualSceneId: "scene:restaurant-tea",
    npcLineHanzi: "你要什么？",
    npcLinePinyin: "nǐ yào shénme?",
    learnerGoalPt: "Você quer chá. Peça.",
    expectedHanzi: "我要茶",
    prerequisiteHanzi: ["我要", "茶"],
    afterUnitIndex: 8,
    minMasteryPass: 1,
    difficulty: 2,
  },
  {
    id: "everyday:order-water",
    domain: "FOOD",
    intent: "ORDER_DRINK",
    locationPt: "restaurante",
    participantRolePt: "atendente",
    goalPt: "pedir água",
    visualSceneId: "scene:restaurant-tea",
    npcLineHanzi: "你要什么？",
    learnerGoalPt: "Você está com sede. Peça água.",
    expectedHanzi: "我要水",
    prerequisiteHanzi: ["我要", "水"],
    afterUnitIndex: 8,
    minMasteryPass: 1,
    difficulty: 2,
  },
  {
    id: "everyday:ask-price",
    domain: "SHOPPING",
    intent: "ASK_PRICE",
    locationPt: "loja",
    participantRolePt: "vendedor",
    goalPt: "perguntar preço",
    visualSceneId: "scene:supermarket-buy",
    learnerGoalPt: "Você quer saber o preço. O que pergunta?",
    expectedHanzi: "多少钱？",
    acceptableAlternatives: ["多少钱", "这个多少钱？"],
    prerequisiteHanzi: ["多少钱"],
    afterUnitIndex: 10,
    minMasteryPass: 1,
    difficulty: 2,
  },
  {
    id: "everyday:buy-this",
    domain: "SHOPPING",
    intent: "BUY",
    locationPt: "loja",
    participantRolePt: "vendedor",
    goalPt: "comprar este item",
    visualSceneId: "scene:supermarket-buy",
    learnerGoalPt: "Você escolheu um item. Como pede?",
    expectedHanzi: "我要这个",
    prerequisiteHanzi: ["我要", "这个"],
    afterUnitIndex: 10,
    minMasteryPass: 2,
    difficulty: 3,
  },
  {
    id: "everyday:where-metro",
    domain: "LOCATION",
    intent: "ASK_WHERE",
    locationPt: "rua",
    participantRolePt: "desconhecido",
    goalPt: "encontrar o metrô",
    visualSceneId: "scene:metro",
    learnerGoalPt: "Você procura o metrô. O que pergunta?",
    expectedHanzi: "地铁站在哪里？",
    acceptableAlternatives: ["地铁在哪里？", "在哪里？"],
    prerequisiteHanzi: ["在哪里", "地铁"],
    afterUnitIndex: 12,
    minMasteryPass: 2,
    difficulty: 3,
  },
  {
    id: "everyday:take-metro",
    domain: "TRANSPORT",
    intent: "TAKE_TRANSPORT",
    locationPt: "estação",
    participantRolePt: "atendente",
    goalPt: "pegar o metrô",
    visualSceneId: "scene:metro",
    learnerGoalPt: "Você precisa ir de metrô. O que diz?",
    expectedHanzi: "我要坐地铁",
    prerequisiteHanzi: ["地铁"],
    afterUnitIndex: 12,
    minMasteryPass: 2,
    difficulty: 3,
  },
  {
    id: "everyday:hotel-checkin",
    domain: "HOTEL",
    intent: "CHECK_IN",
    locationPt: "hotel",
    participantRolePt: "recepcionista",
    goalPt: "fazer check-in",
    visualSceneId: "scene:hotel-checkin",
    npcLineHanzi: "你好！",
    learnerGoalPt: "Você chegou ao hotel. Cumprimente e peça o quarto.",
    expectedHanzi: "你好",
    prerequisiteHanzi: ["你好", "酒店"],
    afterUnitIndex: 14,
    minMasteryPass: 2,
    difficulty: 3,
  },
  {
    id: "everyday:hospital",
    domain: "HEALTH",
    intent: "HEALTH_BASIC",
    locationPt: "rua",
    participantRolePt: "desconhecido",
    goalPt: "encontrar hospital",
    visualSceneId: "scene:hospital",
    learnerGoalPt: "Você precisa de um médico. Qual lugar procura?",
    expectedHanzi: "医院",
    prerequisiteHanzi: ["医院"],
    afterUnitIndex: 14,
    minMasteryPass: 2,
    difficulty: 2,
  },
  {
    id: "everyday:polite-welcome",
    domain: "SOCIAL",
    intent: "SOCIAL_POLITENESS",
    locationPt: "loja",
    participantRolePt: "atendente",
    goalPt: "responder agradecimento",
    npcLineHanzi: "谢谢！",
    learnerGoalPt: "Alguém agradeceu. O que responde?",
    expectedHanzi: "不客气",
    acceptableAlternatives: ["没关系"],
    prerequisiteHanzi: ["不客气"],
    afterUnitIndex: 2,
    minMasteryPass: 1,
    difficulty: 2,
  },
];

export function scenariosForUnit(unitIndex: number, masteryPass: number): EverydayScenario[] {
  return EVERYDAY_SCENARIOS.filter(
    (s) => s.afterUnitIndex <= unitIndex && s.minMasteryPass <= masteryPass
  );
}

export function scenarioById(id: string): EverydayScenario | undefined {
  return EVERYDAY_SCENARIOS.find((s) => s.id === id);
}

export function scenariosByDomain(domain: RealWorldDomain): EverydayScenario[] {
  return EVERYDAY_SCENARIOS.filter((s) => s.domain === domain);
}
