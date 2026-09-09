/**
 * V4.9.7A — China Survival I: restaurant experience contract.
 * Capabilities in use, not a food-vocab unit.
 */
export const CHINA_SURVIVAL_RESTAURANT_ARC = {
  id: "china-survival-restaurant",
  remessa: "V4.9.7A",
  objectivePt: "Consigo entrar num restaurante na China, entender a situação básica, pedir comida e bebida, reagir ao pedido e pagar.",
  objectiveEn: "I can walk into a restaurant in China, understand the basic situation, order food and drink, react, and ask for the bill.",
  lessonIds: ["l26", "l26b", "l26c", "l27"] as const,
  sceneIds: ["pedir-cardapio", "revisao-restaurante", "imersao-restaurante"] as const,
  missionLessonId: "l26c",
  cultureItemIds: ["host-insistence", "shared-dishes", "chopsticks-rest"] as const,
  capabilities: [
    "enter_restaurant",
    "get_attention",
    "ask_menu",
    "order_food",
    "order_drink",
    "specify_quantity",
    "accept_or_refuse",
    "react_to_food",
    "ask_price_or_bill",
    "understand_bill_context",
    "close_interaction",
  ] as const,
} as const;

export const RESTAURANT_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_RESTAURANT_ARC.lessonIds;
