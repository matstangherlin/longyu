/**
 * Pedagogia V3.7 — roadmap lexical lições 51–100 (LEX-063 / COMM-028).
 * Plano antecipado; não reescreve todas as lições nesta remessa.
 */

export interface LexicalRoadmapBlock {
  lessonRange: string;
  focusPackets: string[];
  newStructures: string[];
  conversationGoals: string[];
  /** Words / chunks planned for introduction in this band. */
  wordsIntroduced: string[];
  notes: string;
}

export const LESSONS_51_100_ROADMAP: LexicalRoadmapBlock[] = [
  {
    lessonRange: "51–60",
    focusPackets: ["family", "basic_questions", "social"],
    newStructures: ["这是我…", "我有 / 我没有…", "你有…吗？"],
    conversationGoals: ["talk_family", "ask_name", "greet"],
    wordsIntroduced: ["哥哥", "姐姐", "弟弟", "妹妹", "爷爷", "奶奶", "家人", "你忙吗"],
    notes: "Consolidar família + perguntas 谁/什么; mini-conversa 4 turnos (COMM-029).",
  },
  {
    lessonRange: "61–70",
    focusPackets: ["restaurant", "food_drink", "preferences", "payment"],
    newStructures: ["我想 + VERB", "我要 + NOUN", "不要辣", "买单", "这个多少钱？"],
    conversationGoals: ["order_food", "order_drink", "ask_price", "pay"],
    wordsIntroduced: ["服务员", "菜单", "米饭", "面", "辣", "买单", "一杯茶"],
    notes: "Cena multi-intent restaurante (cumprimento → pedido → preço → conta).",
  },
  {
    lessonRange: "71–80",
    focusPackets: ["shopping", "payment", "numbers_dates", "preferences"],
    newStructures: ["多少钱？", "太贵了", "便宜一点", "可以刷卡吗？"],
    conversationGoals: ["buy_item", "negotiate_basic", "pay"],
    wordsIntroduced: ["便宜", "贵", "微信", "支付宝", "现金", "刷卡"],
    notes: "Compras + pagamento digital como receptive→productive.",
  },
  {
    lessonRange: "81–90",
    focusPackets: ["transport", "directions", "city", "airport"],
    newStructures: ["X在哪里？", "我坐 + VEHICLE", "怎么走？", "往左/右走"],
    conversationGoals: ["ask_directions", "use_metro", "use_train", "use_taxi", "airport_basic"],
    wordsIntroduced: ["地铁", "火车", "公交车", "出租车", "票", "站", "机场"],
    notes: "Abandonar dependência de 车在哪里？; metrô/táxi/estação/ônibus.",
  },
  {
    lessonRange: "91–100",
    focusPackets: ["hotel", "airport", "health", "emergency", "survival", "weather"],
    newStructures: ["我有预订", "这是我的护照", "我需要帮助", "我病了", "请慢一点"],
    conversationGoals: ["hotel_checkin", "airport_basic", "health_basic", "ask_for_help", "weather_smalltalk"],
    wordsIntroduced: ["预订", "房卡", "前台", "一晚", "帮助", "医生", "天气"],
    notes: "Fechar Survival China minimum + Simulated China Journey completo.",
  },
];

export const FIRST_50_REBALANCE_NOTES = [
  "V3.6 já ativou cumprimentos/cortesia/apresentação/reparo nas primeiras ~30.",
  "V3.7 classifica esses itens em tiers + packets completos e agenda família/restaurante/transporte.",
  "Labs de tom/Hànzì continuam com crescimento lexical 0 (perceptual).",
  "Itens sociais curtos (好的/没问题/我也是) entram como reinforce em diálogos existentes.",
  "COMM-027: auditoria das primeiras 50 lições de aquisição em first-50-acquisition-audit.md.",
] as const;
