/**
 * V4.9.7B — China Survival I: shopping, market, and payments.
 * Capabilities in use, not a product-catalogue unit.
 */
export const CHINA_SURVIVAL_SHOPPING_ARC = {
  id: "china-survival-shopping",
  remessa: "V4.9.7B",
  objectivePt: "Consigo fazer uma compra simples na China sem depender inteiramente de inglês: ver, perguntar, entender, decidir, pagar e sair.",
  objectiveEn: "I can complete a simple purchase in China without relying entirely on English: see, ask, understand, decide, pay, and leave.",
  lessonIds: ["l27", "p6-compras", "p6-survival-mandarin", "p7-imersao-mercado"] as const,
  sceneIds: ["conversa-na-loja", "comprar-itens", "imersao-mercado"] as const,
  missionLessonId: "p7-imersao-mercado",
  cultureItemIds: ["digital-pay", "bargaining-context"] as const,
  capabilities: [
    "identify_item",
    "ask_price",
    "understand_price",
    "react_to_price",
    "choose_item",
    "choose_quantity",
    "accept_price",
    "decline_purchase",
    "bargain_when_appropriate",
    "ask_payment_method",
    "pay_mobile",
    "ask_card",
    "ask_cash",
    "complete_purchase",
    "close_interaction",
  ] as const,
} as const;

export const SHOPPING_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_SHOPPING_ARC.lessonIds;
