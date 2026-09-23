/**
 * Pedagogia V3.7 — mapa de capacidades conversacionais (COMM-001/002/019/020).
 * READY só com vocabulário + pergunta + resposta + prática produtiva + conversa + transferência.
 *
 * RC2.2.9 — o status é calculado a partir de evidência de runtime (lições e
 * passos que o planner real entrega), nunca de metadados. `hasConversation`,
 * `hasProductivePractice` e `transferScenarios` continuam aqui como
 * DECLARAÇÕES: validate:capability-runtime-evidence falha se o runtime não as
 * confirmar.
 */

import type { CapabilityRuntimeEvidence } from "../lib/capabilityRuntimeEvidence";

export type CapabilityStatus = "READY" | "PARTIAL" | "PLANNED" | "MISSING";

export interface CapabilityCoverageScores {
  lexicalCoverage: number;
  structuralCoverage: number;
  productiveCoverage: number;
  listeningCoverage: number;
  conversationCoverage: number;
  transferCoverage: number;
  /** Média 0–1 das seis dimensões — informativa; READY nunca sai da média. */
  readinessScore: number;
}

export interface ConversationCapability {
  id: string;
  labelPt: string;
  requiredVocabulary: string[];
  requiredStructures: string[];
  requiredChunks: string[];
  requiredQuestions: string[];
  requiredAnswers: string[];
  journeyLessons: string[];
  /** @deprecated Prefer requiredChunks — kept for validators V3.7 early. */
  requiredRefs: string[];
  structures: string[];
  intents: string[];
  readyAt?: string;
  /** Declared target; runtime may downgrade if scores incomplete. */
  status: CapabilityStatus;
  domain: string;
  survivalChina?: boolean;
  multiIntentBundle?: string[];
  /** Explicit transfer scenarios (COMM-020). Declaração: o runtime precisa provar. */
  transferScenarios: string[];
  /** Declara cena de conversa; validate:capability-runtime-evidence exige a cena real. */
  hasConversation: boolean;
  /** Declara prática produtiva; validate:capability-runtime-evidence exige a tarefa real. */
  hasProductivePractice: boolean;
}

/** Benchmark LONGYU_MINIMAL_CHINA_CONVERSATION (COMM-030). */
export const CHINA_SURVIVAL_SCENARIOS = [
  "airport",
  "transport",
  "hotel",
  "restaurant",
  "shopping",
  "directions",
  "small-talk",
  "communication-repair",
  "health-basic",
] as const;

export type ChinaSurvivalScenario = (typeof CHINA_SURVIVAL_SCENARIOS)[number];

/** Capability ids required per survival scenario. */
export const LONGYU_MINIMAL_CHINA_CONVERSATION: Record<
  ChinaSurvivalScenario,
  string[]
> = {
  airport: ["airport_basic", "say_dont_understand", "ask_repeat"],
  transport: ["use_metro", "use_taxi", "ask_location"],
  hotel: ["hotel_checkin"],
  restaurant: ["order_food", "order_drink", "ask_price", "pay"],
  shopping: ["buy_item", "ask_price", "negotiate_basic"],
  directions: ["ask_directions", "ask_location"],
  "small-talk": ["greet", "introduce_self", "ask_name", "express_preference"],
  "communication-repair": ["say_dont_understand", "ask_repeat", "ask_for_help"],
  "health-basic": ["health_basic", "ask_for_help"],
};

/** @deprecated alias — keep validators that still import CHINA_CONVERSATION_BENCHMARK_IDS. */
export const CHINA_CONVERSATION_BENCHMARK_IDS = [
  "order_food",
  "buy_item",
  "ask_directions",
  "use_metro",
  "hotel_checkin",
  "greet",
  "say_dont_understand",
  "health_basic",
  "airport_basic",
  "pay",
] as const;

function cap(
  partial: Omit<ConversationCapability, "requiredRefs" | "structures"> & {
    requiredRefs?: string[];
    structures?: string[];
  }
): ConversationCapability {
  const requiredChunks = partial.requiredChunks;
  return {
    ...partial,
    requiredRefs: partial.requiredRefs ?? requiredChunks,
    structures: partial.structures ?? partial.requiredStructures,
  };
}

export const CONVERSATION_CAPABILITIES: ConversationCapability[] = [
  cap({
    id: "greet",
    labelPt: "Cumprimentar",
    requiredVocabulary: ["你好", "你好吗", "我很好"],
    requiredStructures: ["你好", "你好吗？"],
    requiredChunks: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"],
    requiredQuestions: ["你好吗？"],
    requiredAnswers: ["我很好"],
    journeyLessons: ["l2", "l3", "l13-dialogo-ola"],
    intents: ["greet", "ask-wellbeing"],
    readyAt: "l13-dialogo-ola",
    status: "READY",
    domain: "greetings",
    survivalChina: true,
    transferScenarios: ["street-hello", "shop-hello"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "introduce_self",
    labelPt: "Apresentar-se",
    requiredVocabulary: ["我叫", "我是"],
    requiredStructures: ["我叫 + NAME", "我是 + NOUN"],
    requiredChunks: ["chunk:wojiao", "chunk:nihao"],
    requiredQuestions: [],
    requiredAnswers: ["我叫…", "我是学生"],
    journeyLessons: ["l9", "l10"],
    intents: ["introduce-self"],
    readyAt: "l9",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
    transferScenarios: ["meet-classmate"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_name",
    labelPt: "Perguntar o nome",
    requiredVocabulary: ["你叫什么"],
    requiredStructures: ["你叫什么？"],
    requiredChunks: ["chunk:nijiaoshenme"],
    requiredQuestions: ["你叫什么？"],
    requiredAnswers: ["我叫…"],
    journeyLessons: ["p1-primeira-conversa", "l9-qual-nome"],
    intents: ["ask-name"],
    readyAt: "p1-primeira-conversa",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
    transferScenarios: ["meet-stranger"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "say_origin",
    labelPt: "Dizer origem",
    requiredVocabulary: ["我是", "巴西人"],
    requiredStructures: ["我是 + COUNTRY人"],
    requiredChunks: ["chunk:wature"],
    requiredQuestions: [],
    requiredAnswers: ["我是巴西人"],
    journeyLessons: ["l10"],
    intents: ["say-origin"],
    readyAt: "l10",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
    transferScenarios: ["meet-stranger"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_origin",
    labelPt: "Perguntar origem",
    requiredVocabulary: ["你是哪国人"],
    requiredStructures: ["你是哪国人？"],
    requiredChunks: ["chunk:nishinaiguoren"],
    requiredQuestions: ["你是哪国人？"],
    requiredAnswers: ["我是巴西人"],
    journeyLessons: ["l9", "l10"],
    intents: ["ask-origin"],
    readyAt: "l10",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
    transferScenarios: ["meet-stranger"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "talk_family",
    labelPt: "Falar da família",
    // RC2.2.9 — 弟弟/妹妹 saíram: nenhuma lição os ensina, e o núcleo que a
    // Jornada realmente pratica é pai, mãe, irmão/irmã mais velhos e casa.
    requiredVocabulary: ["爸爸", "妈妈", "哥哥", "姐姐", "家"],
    requiredStructures: ["这是我…", "我有…", "我没有…"],
    requiredChunks: [
      "chunk:zheshibaba",
      "chunk:zheshimama",
      "chunk:woyoujiejie",
      "chunk:woyouyigegege",
      "chunk:womeiyoujiejie",
      "chunk:zheshiwodejia",
    ],
    requiredQuestions: ["你有兄弟姐妹吗？"],
    requiredAnswers: ["我有姐姐", "我有一个哥哥", "我没有姐姐"],
    journeyLessons: ["l24", "l25"],
    intents: ["identify_family"],
    readyAt: "l24",
    status: "READY",
    domain: "family",
    transferScenarios: ["show-photo", "visit-home"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "talk_study",
    labelPt: "Falar de estudo",
    requiredVocabulary: ["学生", "老师", "学校", "学习", "中文"],
    requiredStructures: ["我是学生", "我在学中文", "我去学校"],
    requiredChunks: ["chunk:woshixuesheng", "chunk:wozaixuezhongwen", "chunk:woquxuexiao", "chunk:nixuexizhongwenma", "chunk:nishixueshengma", "chunk:woxuexizhongwen", "chunk:wozaixuexiaoxuexi"],
    requiredQuestions: ["你学习中文吗？", "你是学生吗？", "你学习什么？"],
    requiredAnswers: ["我在学中文", "我是学生", "我学习中文", "我在学校学习"],
    journeyLessons: ["l10", "l11-falo-pouco", "l28"],
    intents: ["study"],
    readyAt: "l11-falo-pouco",
    status: "READY",
    domain: "study",
    transferScenarios: ["classroom", "campus"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "talk_work",
    labelPt: "Falar de trabalho",
    requiredVocabulary: ["工作", "公司", "上班", "下班", "老师", "医生", "学生"],
    requiredStructures: ["我要工作", "上班 / 下班", "你做什么工作？", "你在哪里工作？"],
    requiredChunks: ["chunk:woyaogongzuo", "chunk:shangban", "chunk:xiaban", "chunk:nizuoshenmegongzuo", "chunk:nizainagongzuo", "chunk:wozaigongsishangban", "chunk:nijidianshangban"],
    requiredQuestions: ["你做什么工作？", "你在哪儿工作？", "你几点上班？"],
    requiredAnswers: ["我要工作", "我上班", "我在公司上班"],
    journeyLessons: ["p6-rotina-trabalho"],
    intents: ["work"],
    readyAt: "p6-rotina-trabalho",
    status: "READY",
    domain: "work",
    transferScenarios: ["office", "meet-coworker"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "talk_routine",
    labelPt: "Falar da rotina",
    requiredVocabulary: ["起床", "睡觉", "上班", "回家", "早饭", "晚饭"],
    requiredStructures: ["我起床", "我睡觉", "你几点起床？"],
    requiredChunks: ["chunk:woqichuang", "chunk:woshujiao", "chunk:shangban", "chunk:wohuijia", "chunk:nijidianqichuang", "chunk:woqidianqichuang", "chunk:wochizaofan"],
    requiredQuestions: ["你什么时候上班？", "你几点起床？"],
    requiredAnswers: ["我起床", "我下班", "我七点起床"],
    journeyLessons: ["p6-rotina-trabalho"],
    intents: ["routine"],
    readyAt: "p6-rotina-trabalho",
    status: "READY",
    domain: "routine",
    transferScenarios: ["weekday", "morning"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "tell_time",
    labelPt: "Dizer horas",
    requiredVocabulary: ["现在", "点", "半", "分"],
    requiredStructures: ["现在八点", "八点半", "下午三点"],
    requiredChunks: ["chunk:xianzaibadian", "chunk:xianzaijiudian", "chunk:badianban", "chunk:xiawusandian", "chunk:jiudianshifen"],
    requiredQuestions: [],
    requiredAnswers: ["现在八点", "现在九点", "八点半"],
    journeyLessons: ["p6-horarios"],
    intents: ["tell-time"],
    readyAt: "p6-horarios",
    status: "READY",
    domain: "time",
    survivalChina: true,
    transferScenarios: ["appointment", "schedule"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_time",
    labelPt: "Perguntar horas",
    requiredVocabulary: ["几点", "现在"],
    requiredStructures: ["现在几点？", "什么时候？", "你几点上班？"],
    requiredChunks: ["chunk:xianzaijidian", "chunk:shenmeshihou", "chunk:nijidianshangban"],
    requiredQuestions: ["现在几点？", "什么时候？"],
    requiredAnswers: ["现在八点", "八点半"],
    journeyLessons: ["p6-horarios"],
    intents: ["ask-time"],
    readyAt: "p6-horarios",
    status: "READY",
    domain: "time",
    survivalChina: true,
    transferScenarios: ["appointment", "street-clock"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "order_food",
    labelPt: "Pedir comida",
    requiredVocabulary: ["饭", "米饭", "菜", "肉", "鱼", "面", "辣"],
    requiredStructures: ["我要…", "我想吃…", "不要辣"],
    // RC2.2.9 — chunk:woyaofan saiu: 要饭 é "pedir esmola" no uso corrente;
    // o pedido natural que a Jornada ensina é 我要米饭.
    requiredChunks: [
      "chunk:woyaomifan",
      "chunk:woxiangchimifan",
      "chunk:buyaola",
      "chunk:fuwuyuan",
      "chunk:caidan",
    ],
    requiredQuestions: ["你想吃什么？"],
    requiredAnswers: ["我要米饭", "我想吃米饭", "不要辣"],
    journeyLessons: ["l26b"],
    intents: ["order-food"],
    readyAt: "l26b",
    status: "READY",
    domain: "restaurant",
    survivalChina: true,
    multiIntentBundle: ["greet", "order_drink", "ask_price", "pay"],
    transferScenarios: ["entry-order-bill"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "order_drink",
    labelPt: "Pedir bebida",
    requiredVocabulary: ["水", "茶"],
    requiredStructures: ["我想喝…", "我要一杯茶"],
    requiredChunks: ["chunk:woxiangheshui", "chunk:woyaoshui", "chunk:woyaoyibeicha", "chunk:yibeicha"],
    requiredQuestions: ["你想喝什么？"],
    requiredAnswers: ["我想喝水", "我要一杯茶"],
    journeyLessons: ["l26b"],
    intents: ["order-drink"],
    readyAt: "l26b",
    status: "READY",
    domain: "restaurant",
    survivalChina: true,
    transferScenarios: ["cafe", "restaurant"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_price",
    labelPt: "Perguntar preço",
    requiredVocabulary: ["多少钱"],
    requiredStructures: ["多少钱？", "这个多少钱？"],
    requiredChunks: ["chunk:duoshaoqian", "chunk:zhegeduoshaoqian"],
    requiredQuestions: ["多少钱？", "这个多少钱？"],
    requiredAnswers: ["二十八元", "十"],
    journeyLessons: ["l27", "l26b"],
    intents: ["ask-price"],
    readyAt: "l27",
    status: "READY",
    domain: "shopping",
    survivalChina: true,
    transferScenarios: ["market", "restaurant"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "buy_item",
    labelPt: "Comprar item",
    requiredVocabulary: ["我要", "这个"],
    requiredStructures: ["我要这个", "多少钱？"],
    requiredChunks: ["chunk:duoshaoqian", "chunk:woyao", "chunk:taiguile", "chunk:pianyiyidian"],
    requiredQuestions: ["多少钱？"],
    requiredAnswers: ["我要这个", "太贵了"],
    journeyLessons: ["l27"],
    intents: ["buy"],
    readyAt: "l27",
    status: "READY",
    domain: "shopping",
    survivalChina: true,
    transferScenarios: ["market", "clothing-shop"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "negotiate_basic",
    labelPt: "Negociar preço básico",
    requiredVocabulary: ["太贵了", "便宜一点"],
    requiredStructures: ["太贵了", "便宜一点"],
    requiredChunks: ["chunk:taiguile", "chunk:pianyiyidian"],
    requiredQuestions: [],
    requiredAnswers: ["太贵了", "便宜一点"],
    journeyLessons: ["l27"],
    intents: ["bargain"],
    readyAt: "l27",
    status: "READY",
    domain: "shopping",
    survivalChina: true,
    transferScenarios: ["market"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "pay",
    labelPt: "Pagar / pedir conta",
    requiredVocabulary: ["买单", "微信支付", "现金"],
    requiredStructures: ["买单", "可以刷卡吗？"],
    // RC2.2.9 — chunk:zhifubao saiu: nenhuma lição da Jornada o ensina; a
    // capacidade básica é pedir a conta e escolher entre WeChat, dinheiro ou
    // cartão. Nenhum meio de pagamento é apresentado como universal.
    requiredChunks: ["chunk:maidan", "chunk:weixinzhifu", "chunk:keyishuaka", "chunk:xianjin"],
    requiredQuestions: ["可以刷卡吗？"],
    requiredAnswers: ["买单", "微信支付"],
    journeyLessons: ["l26b", "p6-survival-mandarin"],
    intents: ["pay", "ask-bill"],
    readyAt: "p6-survival-mandarin",
    status: "READY",
    domain: "payment",
    survivalChina: true,
    transferScenarios: ["checkout", "restaurant"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_location",
    labelPt: "Perguntar onde fica",
    requiredVocabulary: ["在哪里"],
    requiredStructures: ["X 在哪里？"],
    requiredChunks: ["chunk:zaina", "chunk:chaoshizainali", "chunk:xishoujianzainali"],
    requiredQuestions: ["在哪里？", "超市在哪里？"],
    requiredAnswers: ["在那里", "往左走"],
    journeyLessons: ["p6-cidade-lugares"],
    intents: ["ask-location"],
    readyAt: "p6-cidade-lugares",
    status: "READY",
    domain: "directions",
    survivalChina: true,
    transferScenarios: ["find-bank", "find-hospital"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_directions",
    labelPt: "Pedir direção",
    requiredVocabulary: ["左", "右", "前", "后", "怎么走", "一直走"],
    requiredStructures: ["怎么走？", "往左/右走", "一直走", "左转/右转"],
    requiredChunks: [
      "chunk:zenmezou",
      "chunk:zuobian",
      "chunk:youbian",
      "chunk:yizhizou",
      "chunk:zuozhuan",
      "chunk:youzhuan",
    ],
    requiredQuestions: ["怎么走？"],
    requiredAnswers: ["往左走", "一直走", "左转"],
    journeyLessons: ["p6-direcoes"],
    intents: ["ask-route"],
    readyAt: "p6-direcoes",
    status: "READY",
    domain: "directions",
    survivalChina: true,
    transferScenarios: ["street-help"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "use_metro",
    labelPt: "Usar metrô",
    requiredVocabulary: ["地铁", "站", "票"],
    // RC2.2.9 — "我要一张票" virou "我要票": o classificador 张 não é ensinado
    // em nenhuma lição; o pedido de bilhete da Jornada é 我要票.
    requiredStructures: ["我坐地铁", "地铁站在哪里？", "我要票"],
    requiredChunks: ["chunk:ditie", "chunk:wozuoditie", "chunk:ditiezhan", "chunk:ditiezhanzainali", "chunk:woyaopiao"],
    requiredQuestions: ["地铁站在哪里？", "票多少钱？"],
    requiredAnswers: ["我坐地铁", "我要票"],
    journeyLessons: ["p7-imersao-estacao", "p6-china-cidades-2"],
    intents: ["transport-metro"],
    readyAt: "p7-imersao-estacao",
    status: "READY",
    domain: "transport",
    survivalChina: true,
    transferScenarios: ["subway"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "use_train",
    labelPt: "Usar trem",
    requiredVocabulary: ["火车", "火车站", "票"],
    requiredStructures: ["火车站在哪里？", "我要票"],
    requiredChunks: ["chunk:huoche", "chunk:huochezhanzainali", "chunk:woyaopiao", "chunk:piaoduoshaoqian"],
    requiredQuestions: ["火车站在哪里？", "票多少钱？"],
    requiredAnswers: ["我要票"],
    journeyLessons: ["p7-imersao-estacao", "l30"],
    intents: ["transport-train"],
    readyAt: "p7-imersao-estacao",
    status: "READY",
    domain: "transport",
    survivalChina: true,
    transferScenarios: ["train-station"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "use_taxi",
    labelPt: "Usar táxi",
    requiredVocabulary: ["出租车", "停车", "酒店"],
    requiredStructures: ["我坐出租车", "我要去酒店", "去北京路", "在这里停车"],
    requiredChunks: ["chunk:wozuochuzuche", "chunk:woyaoqujiudian", "chunk:qubeijinglu", "chunk:zaizhelictingche", "chunk:duoshaoqian"],
    requiredQuestions: ["多少钱？"],
    requiredAnswers: ["我坐出租车", "我要去酒店", "去北京路"],
    journeyLessons: ["p7-imersao-estacao", "p6-china-ruas"],
    intents: ["transport-taxi"],
    readyAt: "p6-china-ruas",
    status: "READY",
    domain: "transport",
    survivalChina: true,
    transferScenarios: ["taxi", "hotel-run"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "airport_basic",
    labelPt: "Aeroporto básico",
    requiredVocabulary: ["飞机", "机场", "护照", "登机口", "航班"],
    requiredStructures: ["机场在哪里？", "我坐飞机", "这是我的护照", "登机口在哪里？"],
    requiredChunks: ["chunk:feijichangzainali", "chunk:wozuofeiji", "chunk:huzhao", "chunk:jichangzainali", "chunk:dengjikouzainali", "chunk:wodehangbanzainali", "chunk:zheshiwodehuzhao"],
    requiredQuestions: ["飞机场在哪里？", "机场在哪里？", "登机口在哪里？"],
    requiredAnswers: ["我坐飞机", "这是我的护照"],
    journeyLessons: ["p6-china-cidades-2", "p7-imersao-aeroporto"],
    intents: ["airport"],
    readyAt: "p7-imersao-aeroporto",
    status: "READY",
    domain: "airport",
    survivalChina: true,
    transferScenarios: ["arrival", "gate"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "hotel_checkin",
    labelPt: "Hotel / check-in",
    requiredVocabulary: ["酒店", "房间", "房卡", "护照", "前台", "预订"],
    requiredStructures: ["我有预订", "这是我的护照", "我的房间在哪里？"],
    requiredChunks: [
      "chunk:jiudianzainali",
      "chunk:huzhao",
      "chunk:fangjian",
      "chunk:qiantai",
      "chunk:fangka",
      "chunk:woyouyuding",
      "chunk:zheshiwodehuzhao",
      "chunk:wodefangjianzainali",
      "chunk:youwifima",
      "chunk:qinggeiwodehuzhao",
    ],
    requiredQuestions: ["酒店在哪里？", "我的房间在哪里？"],
    requiredAnswers: ["我有预订", "这是我的护照"],
    journeyLessons: ["p6-survival-mandarin", "p7-imersao-hotel"],
    intents: ["hotel"],
    readyAt: "p6-survival-mandarin",
    status: "READY",
    domain: "hotel",
    survivalChina: true,
    transferScenarios: ["check-in", "wifi"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_for_help",
    labelPt: "Pedir ajuda",
    requiredVocabulary: ["帮助", "需要"],
    requiredStructures: ["我需要帮助"],
    requiredChunks: ["chunk:woxuyaobangzhu"],
    requiredQuestions: [],
    requiredAnswers: ["我需要帮助"],
    journeyLessons: ["p6-survival-mandarin", "p6-saude"],
    intents: ["ask-help"],
    readyAt: "p6-survival-mandarin",
    status: "READY",
    domain: "repair",
    survivalChina: true,
    transferScenarios: ["street-emergency"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "say_dont_understand",
    labelPt: "Dizer que não entendeu",
    requiredVocabulary: ["听不懂", "不会说"],
    requiredStructures: ["我听不懂", "我不会说中文", "我会说一点中文"],
    requiredChunks: ["chunk:tingbudong", "chunk:wobuhui", "chunk:wohuishuoyidian"],
    requiredQuestions: [],
    requiredAnswers: ["我听不懂", "我不会说中文"],
    journeyLessons: ["l11", "l11-falo-pouco"],
    intents: ["cannot-speak", "repair-not-understood"],
    readyAt: "l11",
    status: "READY",
    domain: "repair",
    survivalChina: true,
    transferScenarios: ["fast-speech", "noise"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "ask_repeat",
    labelPt: "Pedir para repetir",
    requiredVocabulary: ["再说一遍", "慢一点"],
    requiredStructures: ["请再说一遍", "请慢一点"],
    requiredChunks: ["chunk:qingzaishuoyibian", "chunk:qingmanyidian"],
    requiredQuestions: [],
    requiredAnswers: ["请再说一遍", "请慢一点"],
    journeyLessons: ["l11"],
    intents: ["ask-repeat"],
    readyAt: "l11",
    status: "READY",
    domain: "repair",
    survivalChina: true,
    transferScenarios: ["fast-speech"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "health_basic",
    labelPt: "Saúde básica",
    requiredVocabulary: ["病了", "头疼", "医生", "医院", "不舒服", "发烧"],
    requiredStructures: ["我病了", "我不舒服", "我头疼", "我肚子疼", "我发烧了", "我要看医生", "医院在哪里？"],
    requiredChunks: ["chunk:wobingle", "chunk:wotouteng", "chunk:woduziteng", "chunk:wofashao", "chunk:woyaokanyisheng", "chunk:yiyuanzainali", "chunk:wobushufu", "chunk:woxuyaoyisheng"],
    requiredQuestions: ["医院在哪里？"],
    requiredAnswers: ["我病了", "我不舒服", "我头疼", "我要看医生", "我需要医生"],
    journeyLessons: ["p6-saude", "p7-imersao-saude"],
    intents: ["health"],
    readyAt: "p6-saude",
    status: "READY",
    domain: "health",
    survivalChina: true,
    transferScenarios: ["pharmacy", "clinic"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "weather_smalltalk",
    labelPt: "Small talk do clima",
    requiredVocabulary: ["天气", "热", "冷", "下雨"],
    requiredStructures: ["今天天气很好", "天气很热/冷", "今天天气怎么样？"],
    requiredChunks: ["chunk:jintiantianqihenhao", "chunk:tianqihenre", "chunk:tianqihenleng", "chunk:xiayule", "chunk:jintiantianqizenmeyang", "chunk:jintianhenre", "chunk:jintianhenleng"],
    requiredQuestions: ["今天天气怎么样？"],
    requiredAnswers: ["很热", "下雨了", "今天天气很好", "今天很热", "今天很冷"],
    journeyLessons: ["p6-clima"],
    intents: ["weather"],
    readyAt: "p6-clima",
    status: "READY",
    domain: "weather",
    transferScenarios: ["small-talk-weather", "beijing-shanghai-weather"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "express_preference",
    labelPt: "Expressar preferência",
    requiredVocabulary: ["喜欢"],
    requiredStructures: ["我喜欢…", "我不喜欢…"],
    requiredChunks: ["chunk:woxihuan"],
    requiredQuestions: ["你喜欢什么？", "你喜欢吃什么？"],
    requiredAnswers: ["我喜欢中文", "我喜欢茶"],
    journeyLessons: ["l28"],
    intents: ["preference"],
    readyAt: "l28",
    status: "READY",
    domain: "preferences",
    survivalChina: true,
    transferScenarios: ["likes"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
  cap({
    id: "make_simple_plan",
    labelPt: "Fazer plano simples",
    requiredVocabulary: ["明天", "走吧"],
    requiredStructures: ["明天见", "我们走吧", "我要去…"],
    requiredChunks: ["chunk:mingtianjian", "chunk:womenzouba", "chunk:woyaoqubeijing"],
    requiredQuestions: ["什么时候？"],
    requiredAnswers: ["明天见", "我要去北京"],
    journeyLessons: ["p1-ate-logo", "p6-china-cidades"],
    intents: ["plan-tomorrow"],
    readyAt: "p6-china-cidades",
    status: "READY",
    domain: "plans",
    transferScenarios: ["make-plan"],
    hasConversation: true,
    hasProductivePractice: true,
  }),
];

export const SIMULATED_CHINA_JOURNEY = [
  { step: 1, scene: "aeroporto", capabilityIds: ["airport_basic", "say_dont_understand", "ask_repeat"] },
  { step: 2, scene: "transporte", capabilityIds: ["use_metro", "use_taxi", "ask_location"] },
  { step: 3, scene: "hotel", capabilityIds: ["hotel_checkin"] },
  { step: 4, scene: "restaurante", capabilityIds: ["order_food", "order_drink", "ask_price", "pay"] },
  { step: 5, scene: "loja", capabilityIds: ["buy_item", "negotiate_basic"] },
  { step: 6, scene: "metrô", capabilityIds: ["use_metro"] },
  { step: 7, scene: "pedir informação", capabilityIds: ["ask_directions", "ask_repeat"] },
  { step: 8, scene: "conhecer alguém", capabilityIds: ["introduce_self", "ask_name", "say_origin", "ask_origin"] },
  { step: 9, scene: "falar de si", capabilityIds: ["greet", "talk_family", "express_preference"] },
  { step: 10, scene: "emergência simples", capabilityIds: ["health_basic", "ask_for_help"] },
] as const;

/**
 * RC2.2.9 — capacidades que saíram de PARTIAL nesta remessa. Para elas o
 * contrato é o estrito: as seis dimensões em 1, sem média escondendo buraco.
 */
export const RC2_2_9_CLOSURE_CAPABILITY_IDS = [
  "talk_family",
  "order_food",
  "order_drink",
  "negotiate_basic",
  "pay",
  "use_metro",
  "use_train",
  "ask_for_help",
  "ask_repeat",
  "express_preference",
  "make_simple_plan",
] as const;

/**
 * Contrato de READY em runtime:
 * - `strict`: léxico e estruturas 100% (ensinados antes de cobrados) e as
 *   quatro dimensões de uso com evidência real;
 * - `presence`: capacidades READY antes da RC2.2.9 — cada dimensão precisa de
 *   evidência de runtime (nenhuma ausente) e todo chunk exigido precisa
 *   aparecer na Jornada. Dívidas de ordem/cobertura parcial ficam no relatório.
 */
export type CapabilityRuntimeContract = "strict" | "presence";

export function capabilityRuntimeContract(cap: Pick<ConversationCapability, "id">): CapabilityRuntimeContract {
  return (RC2_2_9_CLOSURE_CAPABILITY_IDS as readonly string[]).includes(cap.id) ? "strict" : "presence";
}

/**
 * Pontua a capacidade a partir da evidência de runtime (ver
 * src/lib/capabilityRuntimeEvidence.ts). Metadados como `hasConversation`,
 * `hasProductivePractice`, `transferScenarios` ou `journeyLessons` não entram
 * na conta: sem evidência, a dimensão é 0.
 */
export function scoreCapability(
  cap: ConversationCapability,
  availableRefs: ReadonlySet<string>,
  evidence?: CapabilityRuntimeEvidence
): CapabilityCoverageScores {
  const lexicalRows = evidence?.lexical ?? [];
  const vocabularyRows = evidence?.vocabulary ?? [];
  const lexicalNeeded = cap.requiredChunks.length + cap.requiredVocabulary.length;
  const lexicalHit =
    lexicalRows.filter((row) => row.ok && availableRefs.has(row.ref)).length +
    vocabularyRows.filter((row) => row.ok).length;
  const lexicalCoverage = evidence && lexicalNeeded ? lexicalHit / lexicalNeeded : 0;
  const structuralRows = evidence?.structural ?? [];
  const structuralCoverage =
    evidence && cap.requiredStructures.length
      ? structuralRows.filter((row) => row.ok).length / cap.requiredStructures.length
      : 0;
  const present = (refs: readonly unknown[] | undefined) => (refs && refs.length > 0 ? 1 : 0);
  const productiveCoverage = present(evidence?.productive);
  const listeningCoverage = present(evidence?.listening);
  const conversationCoverage = present(evidence?.conversation);
  const transferCoverage = present(evidence?.transfer);
  const readinessScore =
    (lexicalCoverage +
      structuralCoverage +
      productiveCoverage +
      listeningCoverage +
      conversationCoverage +
      transferCoverage) /
    6;
  return {
    lexicalCoverage,
    structuralCoverage,
    productiveCoverage,
    listeningCoverage,
    conversationCoverage,
    transferCoverage,
    readinessScore,
  };
}

/** Dimensões faltantes para READY, segundo o contrato da capacidade. */
export function capabilityReadyGaps(
  cap: ConversationCapability,
  availableRefs: ReadonlySet<string>,
  evidence?: CapabilityRuntimeEvidence
): string[] {
  if (!evidence) return ["runtime-evidence"];
  const scores = scoreCapability(cap, availableRefs, evidence);
  const gaps: string[] = [];
  if (!evidence.reachable) gaps.push("reachable");
  if (capabilityRuntimeContract(cap) === "strict") {
    if (scores.lexicalCoverage < 1) gaps.push("lexical");
    if (scores.structuralCoverage < 1) gaps.push("structural");
  } else {
    // Presença: todo chunk exigido existe no registry e aparece na Jornada;
    // toda estrutura tem ao menos um passo real.
    const lexicalPresent = evidence.lexical.every(
      (row) => row.inRegistry && availableRefs.has(row.ref) && (row.firstTeach != null || row.firstTest != null)
    );
    if (!lexicalPresent) gaps.push("lexical");
    const structuralPresent = evidence.structural.every(
      (row) => row.fragments.length > 0 && (row.teach != null || row.productive != null || row.use != null)
    );
    if (!structuralPresent || cap.requiredStructures.length === 0) gaps.push("structural");
  }
  if (scores.productiveCoverage < 1) gaps.push("productive");
  if (scores.listeningCoverage < 1) gaps.push("listening");
  if (scores.conversationCoverage < 1) gaps.push("conversation");
  if (scores.transferCoverage < 1) gaps.push("transfer");
  return gaps;
}

/** READY só com evidência de runtime em todas as dimensões — nunca por média. */
export function computeCapabilityStatus(
  cap: ConversationCapability,
  availableRefs: ReadonlySet<string>,
  evidence?: CapabilityRuntimeEvidence
): CapabilityStatus {
  const missing = cap.requiredChunks.filter((r) => !availableRefs.has(r));
  if (cap.requiredChunks.length > 0 && missing.length === cap.requiredChunks.length) return "MISSING";
  if (capabilityReadyGaps(cap, availableRefs, evidence).length === 0) return "READY";
  const scores = scoreCapability(cap, availableRefs, evidence);
  if (scores.readinessScore > 0) return "PARTIAL";
  return cap.status === "PLANNED" ? "PLANNED" : "PARTIAL";
}

export function capabilityCoverage(
  availableRefs: ReadonlySet<string>,
  evidenceById?: ReadonlyMap<string, CapabilityRuntimeEvidence>
): Array<
  ConversationCapability & {
    coveredRequired: number;
    missingRefs: string[];
    scores: CapabilityCoverageScores;
    computedStatus: CapabilityStatus;
    declaredStatus: CapabilityStatus;
    readyGaps: string[];
  }
> {
  return CONVERSATION_CAPABILITIES.map((capability) => {
    const evidence = evidenceById?.get(capability.id);
    const missing = capability.requiredChunks.filter((ref) => !availableRefs.has(ref));
    const scores = scoreCapability(capability, availableRefs, evidence);
    const computedStatus = computeCapabilityStatus(capability, availableRefs, evidence);
    return {
      ...capability,
      coveredRequired: capability.requiredChunks.length - missing.length,
      missingRefs: missing,
      scores,
      computedStatus,
      declaredStatus: capability.status,
      readyGaps: capabilityReadyGaps(capability, availableRefs, evidence),
      status: computedStatus,
    };
  });
}

export interface SurvivalScenarioReadiness {
  scenario: ChinaSurvivalScenario;
  capabilityIds: string[];
  lexicalReady: boolean;
  communicativeReady: boolean;
  untaughtRefs: string[];
  missingCommunicative: string[];
}

/**
 * BENCH-020/021 — lexicalReady = refs taught; communicativeReady = READY em
 * runtime (RC2.2.9: evidência real, não metadado) para todas as capacidades
 * do cenário.
 */
export function evaluateChinaSurvivalV2(
  availableRefs: ReadonlySet<string>,
  evidenceById?: ReadonlyMap<string, CapabilityRuntimeEvidence>
): SurvivalScenarioReadiness[] {
  const coverage = capabilityCoverage(availableRefs, evidenceById);
  return CHINA_SURVIVAL_SCENARIOS.map((scenario) => {
    const capabilityIds = [...(LONGYU_MINIMAL_CHINA_CONVERSATION[scenario] ?? [])];
    const rows = capabilityIds.map((id) => coverage.find((c) => c.id === id));
    const missingCommunicative = capabilityIds.filter((id) => {
      const row = coverage.find((c) => c.id === id);
      return !row || row.computedStatus !== "READY";
    });
    return {
      scenario,
      capabilityIds,
      lexicalReady: rows.every((row) => row && row.missingRefs.length === 0),
      communicativeReady: missingCommunicative.length === 0,
      untaughtRefs: rows.flatMap((row) => row?.missingRefs ?? []),
      missingCommunicative,
    };
  });
}

export function chinaSurvivalV2Totals(rows: SurvivalScenarioReadiness[]) {
  return {
    lexicalReady: rows.filter((r) => r.lexicalReady).length,
    communicativeReady: rows.filter((r) => r.communicativeReady).length,
    total: rows.length,
  };
}
