/**
 * Pedagogia V3.7 — roadmap lexical lições 51–100 (LEX-063).
 * Plano antecipado; não reescreve todas as lições nesta remessa.
 */

export interface LexicalRoadmapBlock {
  lessonRange: string;
  focusPackets: string[];
  newStructures: string[];
  conversationGoals: string[];
  notes: string;
}

export const LESSONS_51_100_ROADMAP: LexicalRoadmapBlock[] = [
  {
    lessonRange: "51–60",
    focusPackets: ["family", "basic_questions", "social"],
    newStructures: ["这是我…", "我有 / 我没有…", "你有…吗？"],
    conversationGoals: ["identify_family", "ask_siblings"],
    notes: "Consolidar família + perguntas 谁/什么; mini-conversa 4 turnos.",
  },
  {
    lessonRange: "61–70",
    focusPackets: ["restaurant", "food_drink", "preferences"],
    newStructures: ["我想 + VERB", "我要 + NOUN", "不要辣", "买单"],
    conversationGoals: ["order-food", "order-drink", "ask-bill"],
    notes: "Cena multi-intent de restaurante (entrada → pedido → conta).",
  },
  {
    lessonRange: "71–80",
    focusPackets: ["shopping", "payment", "numbers_dates"],
    newStructures: ["多少钱？", "太贵了", "便宜一点", "可以刷卡吗？"],
    conversationGoals: ["buy_item", "pay"],
    notes: "Compras + pagamento digital (WeChat/Alipay) como receptive→productive.",
  },
  {
    lessonRange: "81–90",
    focusPackets: ["transport", "directions", "city"],
    newStructures: ["X在哪里？", "我坐 + VEHICLE", "怎么走？", "往左/右走"],
    conversationGoals: ["ask_directions", "take_transport"],
    notes: "Abandonar dependência de 车在哪里？; metrô/táxi/estação.",
  },
  {
    lessonRange: "91–100",
    focusPackets: ["hotel", "airport", "health", "emergency", "survival"],
    newStructures: ["酒店在哪里？", "护照", "我需要帮助", "我病了"],
    conversationGoals: ["hotel_checkin", "airport", "emergency_basic"],
    notes: "Fechar Survival China minimum + preparar Simulated China Journey.",
  },
];

export const FIRST_50_REBALANCE_NOTES = [
  "V3.6 já ativou cumprimentos/cortesia/apresentação/reparo nas primeiras ~30.",
  "V3.7 classifica esses itens em tiers + packets completos e agenda família/restaurante/transporte.",
  "Labs de tom/Hànzì continuam com crescimento lexical 0 (perceptual).",
  "Itens sociais curtos (好的/没问题/我也是) entram como reinforce em diálogos existentes.",
] as const;
