/**
 * RC2.3.3 — Everyday Mandarin ↔ Culture bridges.
 * Reuses EverydayIntent / EverydayScenario; does not invent a parallel bank.
 */

import type { EverydayIntent } from "../everydayMandarin/intents";
import { EVERYDAY_SCENARIOS, type EverydayScenario } from "../everydayMandarin/scenarios";

/** Explicit CultureItem → EverydayIntent map (Prompt 14). */
export const CULTURE_EVERYDAY_INTENT_MAP: Record<string, EverydayIntent[]> = {
  "digital-pay": ["BUY", "ASK_PRICE"],
  "metro-qr": ["TAKE_TRANSPORT"],
  "hotel-checkin-register": ["CHECK_IN"],
  "bargaining-context": ["BUY", "ASK_PRICE"],
  "greetings-nihao": ["GREET", "ASK_HOW_ARE_YOU"],
  "thanks-keqi": ["THANK", "SOCIAL_POLITENESS"],
  "visiting-home": ["GREET", "THANK", "SOCIAL_POLITENESS"],
  "host-insistence": ["THANK", "SOCIAL_POLITENESS"],
  "shared-dishes": ["ORDER_FOOD", "SOCIAL_POLITENESS"],
  "chopsticks-rest": ["ORDER_FOOD", "SOCIAL_POLITENESS"],
  "gift-receiving": ["THANK", "SOCIAL_POLITENESS"],
  "qingwen-ask": ["ASK_FOR_HELP", "ASK_WHERE"],
  "family-terms": ["TALK_FAMILY"],
  "teacher-title": ["GREET", "SOCIAL_POLITENESS"],
  "office-hours": ["ASK_WHERE", "SOCIAL_POLITENESS"],
};

export function everydayIntentsForCultureItem(itemId: string): EverydayIntent[] {
  return [...(CULTURE_EVERYDAY_INTENT_MAP[itemId] ?? [])];
}

/** CultureItem ↔ EverydayScenario recommendations (Prompt 37). */
export const CULTURE_SCENARIO_BRIDGES: Array<{
  cultureItemId: string;
  scenarioId: string;
  notePt: string;
  noteEn: string;
}> = [
  {
    cultureItemId: "hotel-checkin-register",
    scenarioId: "everyday:hotel-checkin",
    notePt: "Depois do check-in linguístico, aprofunda o registro cultural.",
    noteEn: "After the linguistic check-in, deepen the cultural register.",
  },
  {
    cultureItemId: "shared-dishes",
    scenarioId: "everyday:order-tea",
    notePt: "Na mesa compartilhada, o pedido muda de significado.",
    noteEn: "At a shared table, ordering changes meaning.",
  },
  {
    cultureItemId: "digital-pay",
    scenarioId: "everyday:buy-this",
    notePt: "Pagar com QR é o gesto cotidiano ligado a este item.",
    noteEn: "Paying by QR is the everyday gesture tied to this item.",
  },
  {
    cultureItemId: "metro-qr",
    scenarioId: "everyday:take-metro",
    notePt: "Transporte urbano e o código do metrô.",
    noteEn: "Urban transport and the metro code.",
  },
  {
    cultureItemId: "bargaining-context",
    scenarioId: "everyday:ask-price",
    notePt: "Perguntar preço e negociar com contexto.",
    noteEn: "Ask price and bargain with context.",
  },
  {
    cultureItemId: "greetings-nihao",
    scenarioId: "everyday:greet-street",
    notePt: "Cumprimentar com nuance social.",
    noteEn: "Greet with social nuance.",
  },
  {
    cultureItemId: "gift-receiving",
    scenarioId: "everyday:thank",
    notePt: "Agradecer ao receber um presente.",
    noteEn: "Thank someone when receiving a gift.",
  },
];

export function scenariosForCultureItem(itemId: string): EverydayScenario[] {
  const ids = new Set(
    CULTURE_SCENARIO_BRIDGES.filter((b) => b.cultureItemId === itemId).map((b) => b.scenarioId)
  );
  const intents = new Set(everydayIntentsForCultureItem(itemId));
  return EVERYDAY_SCENARIOS.filter(
    (s) => ids.has(s.id) || intents.has(s.intent)
  );
}

export function cultureItemsForScenario(scenarioId: string): string[] {
  return CULTURE_SCENARIO_BRIDGES.filter((b) => b.scenarioId === scenarioId).map((b) => b.cultureItemId);
}
