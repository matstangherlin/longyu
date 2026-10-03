/**
 * RC2.3.1 — cenas pedagógicas reutilizáveis.
 * RC2.3.2 — evolução por mastery pass (reconhecer → associar → responder → transferir).
 */
import type { VisualStyle, VisualBackground } from "../../data/visualVocabulary";
import { resolveVisualConcept } from "../../data/visualVocabulary";

export interface PedagogyVisualScene {
  id: string;
  intent: string;
  wherePt: string;
  withWhomPt?: string;
  goalPt: string;
  /** Conceito âncora (asset local). */
  anchorConceptId: string;
  npcLineHanzi?: string;
  npcLinePinyin?: string;
  npcLinePt?: string;
  learnerPromptPt: string;
  expectedHanzi?: string;
  imageAltPt: string;
  visualStyle: VisualStyle;
  backgroundStyle: VisualBackground;
  subjectCount: number;
  emoji: string;
  /** Unidade mínima para aparecer. */
  afterUnitIndex: number;
}

export const PEDAGOGY_VISUAL_SCENES: readonly PedagogyVisualScene[] = [
  {
    id: "scene:greet-street",
    intent: "greet",
    wherePt: "rua",
    withWhomPt: "conhecido",
    goalPt: "cumprimentar",
    anchorConceptId: "street",
    npcLineHanzi: "你好！",
    npcLinePinyin: "nǐ hǎo!",
    npcLinePt: "Olá!",
    learnerPromptPt: "Você encontra alguém pela manhã. O que diz?",
    expectedHanzi: "你好",
    imageAltPt: "Cena de rua urbana para cumprimento",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "👋",
    afterUnitIndex: 0,
  },
  {
    id: "scene:restaurant-tea",
    intent: "order",
    wherePt: "restaurante",
    withWhomPt: "atendente",
    goalPt: "pedir chá",
    anchorConceptId: "restaurant",
    npcLineHanzi: "你要什么？",
    npcLinePinyin: "nǐ yào shénme?",
    npcLinePt: "O que você quer?",
    learnerPromptPt: "No restaurante, peça chá.",
    expectedHanzi: "我要茶",
    imageAltPt: "Interior de restaurante para pedido",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🍽️",
    afterUnitIndex: 12,
  },
  {
    id: "scene:cafe-drink",
    intent: "drink",
    wherePt: "café",
    goalPt: "pedir bebida",
    anchorConceptId: "coffee",
    learnerPromptPt: "Qual bebida combina com a cena?",
    expectedHanzi: "咖啡",
    imageAltPt: "Xícara de café na mesa",
    visualStyle: "flat_illustration",
    backgroundStyle: "neutral",
    subjectCount: 1,
    emoji: "☕",
    afterUnitIndex: 12,
  },
  {
    id: "scene:supermarket-buy",
    intent: "buy",
    wherePt: "supermercado",
    goalPt: "identificar item",
    anchorConceptId: "supermarket",
    learnerPromptPt: "No supermercado, o que você vê?",
    imageAltPt: "Corredor de supermercado",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🛒",
    afterUnitIndex: 12,
  },
  {
    id: "scene:hotel-checkin",
    intent: "checkin",
    wherePt: "hotel",
    withWhomPt: "recepcionista",
    goalPt: "chegar ao hotel / pedir quarto",
    anchorConceptId: "hotel",
    npcLineHanzi: "你好！",
    npcLinePinyin: "nǐ hǎo!",
    npcLinePt: "Olá!",
    learnerPromptPt: "Você chegou ao hotel. O que diz?",
    expectedHanzi: "你好",
    imageAltPt: "Fachada de hotel",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🏨",
    afterUnitIndex: 12,
  },
  {
    id: "scene:airport",
    intent: "travel",
    wherePt: "aeroporto",
    goalPt: "reconhecer aeroporto",
    anchorConceptId: "airport",
    learnerPromptPt: "Qual lugar é este?",
    expectedHanzi: "机场",
    imageAltPt: "Terminal de aeroporto",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🛫",
    afterUnitIndex: 12,
  },
  {
    id: "scene:metro",
    intent: "ride",
    wherePt: "metrô",
    goalPt: "escolher transporte",
    anchorConceptId: "metro",
    learnerPromptPt: "Qual transporte aparece na cena?",
    expectedHanzi: "地铁",
    imageAltPt: "Composição de metrô",
    visualStyle: "flat_illustration",
    backgroundStyle: "neutral",
    subjectCount: 1,
    emoji: "🚇",
    afterUnitIndex: 12,
  },
  {
    id: "scene:home-family",
    intent: "home",
    wherePt: "casa",
    goalPt: "reconhecer casa",
    anchorConceptId: "home",
    learnerPromptPt: "Onde é este lugar?",
    expectedHanzi: "家",
    imageAltPt: "Casa com telhado",
    visualStyle: "flat_illustration",
    backgroundStyle: "neutral",
    subjectCount: 1,
    emoji: "🏠",
    afterUnitIndex: 11,
  },
  {
    id: "scene:hospital",
    intent: "health",
    wherePt: "hospital",
    goalPt: "reconhecer hospital",
    anchorConceptId: "hospital",
    learnerPromptPt: "Qual lugar é este?",
    expectedHanzi: "医院",
    imageAltPt: "Fachada de hospital",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🏥",
    afterUnitIndex: 12,
  },
  {
    id: "scene:bank",
    intent: "pay",
    wherePt: "banco",
    goalPt: "reconhecer banco",
    anchorConceptId: "bank",
    learnerPromptPt: "Qual lugar é este?",
    expectedHanzi: "银行",
    imageAltPt: "Agência bancária",
    visualStyle: "flat_illustration",
    backgroundStyle: "contextual",
    subjectCount: 1,
    emoji: "🏦",
    afterUnitIndex: 12,
  },
];

export function resolveScene(sceneId: string): PedagogyVisualScene | undefined {
  return PEDAGOGY_VISUAL_SCENES.find((s) => s.id === sceneId);
}

export function scenesForUnit(unitIndex: number): PedagogyVisualScene[] {
  return PEDAGOGY_VISUAL_SCENES.filter((s) => unitIndex >= s.afterUnitIndex);
}

export function sceneAnchorAsset(scene: PedagogyVisualScene) {
  return resolveVisualConcept(scene.anchorConceptId);
}

/** Prompt da cena conforme mastery pass — mesma cena, menos scaffold. */
export function scenePromptForPass(scene: PedagogyVisualScene, masteryPass: number): {
  promptPt: string;
  showNpc: boolean;
  agency: "RECOGNIZE" | "CHOOSE" | "PRODUCE" | "TRANSFER";
} {
  if (masteryPass <= 1) {
    return { promptPt: scene.learnerPromptPt, showNpc: true, agency: "RECOGNIZE" };
  }
  if (masteryPass === 2) {
    return {
      promptPt: scene.expectedHanzi
        ? `Associe a cena a ${scene.expectedHanzi}.`
        : scene.learnerPromptPt,
      showNpc: Boolean(scene.npcLineHanzi),
      agency: "CHOOSE",
    };
  }
  if (masteryPass === 3) {
    return {
      promptPt: scene.npcLineHanzi
        ? `${scene.withWhomPt ?? "Alguém"}: ${scene.npcLineHanzi} — o que você responde?`
        : `Em ${scene.wherePt}: ${scene.goalPt}. Responda.`,
      showNpc: true,
      agency: "PRODUCE",
    };
  }
  return {
    promptPt: `Você chegou a ${scene.wherePt}. Objetivo: ${scene.goalPt}.`,
    showNpc: true,
    agency: "TRANSFER",
  };
}
