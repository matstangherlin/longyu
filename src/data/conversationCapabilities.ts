/**
 * Pedagogia V3.7 — mapa de capacidades conversacionais (LEX-050/051/066).
 */

export type CapabilityStatus = "READY" | "PARTIAL" | "PLANNED" | "MISSING";

export interface ConversationCapability {
  id: string;
  labelPt: string;
  requiredRefs: string[];
  structures: string[];
  intents: string[];
  /** Lesson id where capability becomes usable, if known. */
  readyAt?: string;
  status: CapabilityStatus;
  domain: string;
  survivalChina?: boolean;
}

/** Benchmark LONGYU_MINIMAL_CHINA_CONVERSATION (LEX-066). */
export const CHINA_CONVERSATION_BENCHMARK_IDS = [
  "restaurant_basic",
  "buy_item",
  "ask_directions",
  "take_transport",
  "hotel_checkin",
  "small_talk",
  "communication_repair",
  "emergency_basic",
] as const;

export const CONVERSATION_CAPABILITIES: ConversationCapability[] = [
  {
    id: "introduce_self",
    labelPt: "Apresentar-se",
    requiredRefs: ["chunk:wojiao", "chunk:nihao"],
    structures: ["我叫 + NAME"],
    intents: ["introduce-self"],
    readyAt: "l9",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
  },
  {
    id: "ask_name",
    labelPt: "Perguntar o nome",
    requiredRefs: ["chunk:nijiaoshenme"],
    structures: ["你叫什么？"],
    intents: ["ask-name"],
    readyAt: "p1-primeira-conversa",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
  },
  {
    id: "say_origin",
    labelPt: "Dizer origem",
    requiredRefs: ["chunk:wature", "chunk:nishinaiguoren"],
    structures: ["我是 + COUNTRY人", "你是哪国人？"],
    intents: ["ask-origin"],
    readyAt: "l10",
    status: "READY",
    domain: "introductions",
    survivalChina: true,
  },
  {
    id: "communication_repair",
    labelPt: "Reparo comunicativo",
    requiredRefs: ["chunk:tingbudong", "chunk:qingzaishuoyibian", "chunk:wobuhui"],
    structures: ["我听不懂", "请再说一遍", "我不会说中文"],
    intents: ["ask-repeat", "cannot-speak"],
    readyAt: "l11",
    status: "READY",
    domain: "repair",
    survivalChina: true,
  },
  {
    id: "small_talk",
    labelPt: "Small talk básico",
    requiredRefs: ["chunk:nihaoma", "chunk:wohenhao", "chunk:zenmeyang", "chunk:jintianhenhao"],
    structures: ["你好吗？", "怎么样？", "今天很好"],
    intents: ["ask-wellbeing", "greet"],
    readyAt: "l13-dialogo-ola",
    status: "READY",
    domain: "greetings",
    survivalChina: true,
  },
  {
    id: "restaurant_basic",
    labelPt: "Restaurante básico",
    requiredRefs: [
      "chunk:woxiangheshui",
      "chunk:woyaofan",
      "chunk:woyaomifan",
      "chunk:maidan",
      "chunk:buyaola",
      "chunk:caidan",
    ],
    structures: ["我想喝…", "我要…", "买单", "不要辣"],
    intents: ["order-food", "order-drink", "ask-bill"],
    readyAt: "l26b",
    status: "PARTIAL",
    domain: "restaurant",
    survivalChina: true,
  },
  {
    id: "buy_item",
    labelPt: "Comprar item",
    requiredRefs: ["chunk:duoshaoqian", "chunk:woyao", "chunk:taiguile", "chunk:pianyiyidian"],
    structures: ["多少钱？", "我要这个", "太贵了", "便宜一点"],
    intents: ["ask-price", "buy"],
    readyAt: "l27",
    status: "READY",
    domain: "shopping",
    survivalChina: true,
  },
  {
    id: "ask_directions",
    labelPt: "Pedir direção",
    requiredRefs: ["chunk:zaina", "chunk:zenmezou", "chunk:zuobian", "chunk:youbian", "chunk:yizhizou"],
    structures: ["X在哪里？", "怎么走？", "往左/右走"],
    intents: ["ask-location", "ask-route"],
    readyAt: "p6-direcoes",
    status: "READY",
    domain: "directions",
    survivalChina: true,
  },
  {
    id: "take_transport",
    labelPt: "Usar transporte",
    requiredRefs: ["chunk:ditie", "chunk:wozuochuzuche", "chunk:woyaopiao", "chunk:piaoduoshaoqian", "chunk:ditiezhan"],
    structures: ["我坐地铁/出租车", "我要票", "票多少钱？"],
    intents: ["transport"],
    readyAt: "p6-cidade-lugares",
    status: "PARTIAL",
    domain: "transport",
    survivalChina: true,
  },
  {
    id: "hotel_checkin",
    labelPt: "Hotel / check-in",
    requiredRefs: ["chunk:jiudianzainali", "chunk:huzhao", "chunk:fangjian", "chunk:qiantai", "chunk:fangka"],
    structures: ["酒店在哪里？", "护照", "房间", "前台"],
    intents: ["hotel"],
    readyAt: "p6-survival-mandarin",
    status: "PARTIAL",
    domain: "hotel",
    survivalChina: true,
  },
  {
    id: "emergency_basic",
    labelPt: "Emergência simples",
    requiredRefs: ["chunk:woxuyaobangzhu", "chunk:wobingle", "chunk:woyaokanyisheng", "chunk:yiyuanzainali"],
    structures: ["我需要帮助", "我病了", "我要看医生", "医院在哪里？"],
    intents: ["ask-help", "health"],
    readyAt: "p6-saude",
    status: "PARTIAL",
    domain: "health",
    survivalChina: true,
  },
  {
    id: "talk_family",
    labelPt: "Falar da família",
    requiredRefs: ["chunk:zheshibaba", "chunk:zheshimama", "chunk:woyoujiejie", "chunk:zheshiwodejia"],
    structures: ["这是我…", "我有…", "这是我家"],
    intents: ["identify_family"],
    readyAt: "l24",
    status: "PARTIAL",
    domain: "family",
  },
  {
    id: "pay",
    labelPt: "Pagar",
    requiredRefs: ["chunk:maidan", "chunk:weixinzhifu", "chunk:zhifubao", "chunk:keyishuaka", "chunk:xianjin"],
    structures: ["买单", "微信支付", "可以刷卡吗？"],
    intents: ["pay"],
    readyAt: "p6-survival-mandarin",
    status: "PARTIAL",
    domain: "payment",
    survivalChina: true,
  },
  {
    id: "tell_time",
    labelPt: "Horário",
    requiredRefs: ["chunk:xianzaijidian", "chunk:xianzaibadian", "chunk:shenmeshihou"],
    structures: ["现在几点？", "现在八点", "什么时候？"],
    intents: ["ask-time"],
    readyAt: "p6-horarios",
    status: "PARTIAL",
    domain: "time",
    survivalChina: true,
  },
  {
    id: "airport",
    labelPt: "Aeroporto",
    requiredRefs: ["chunk:feijichangzainali", "chunk:wozuofeiji", "chunk:huzhao"],
    structures: ["飞机场在哪里？", "我坐飞机"],
    intents: ["airport"],
    readyAt: "p6-china-cidades-2",
    status: "PARTIAL",
    domain: "airport",
    survivalChina: true,
  },
];

export const SIMULATED_CHINA_JOURNEY = [
  { step: 1, scene: "aeroporto", capabilityIds: ["airport", "communication_repair"] },
  { step: 2, scene: "transporte", capabilityIds: ["take_transport", "ask_directions"] },
  { step: 3, scene: "hotel", capabilityIds: ["hotel_checkin"] },
  { step: 4, scene: "restaurante", capabilityIds: ["restaurant_basic", "pay"] },
  { step: 5, scene: "loja", capabilityIds: ["buy_item"] },
  { step: 6, scene: "metrô", capabilityIds: ["take_transport"] },
  { step: 7, scene: "pedir informação", capabilityIds: ["ask_directions", "communication_repair"] },
  { step: 8, scene: "conhecer alguém", capabilityIds: ["introduce_self", "ask_name", "say_origin"] },
  { step: 9, scene: "falar de si", capabilityIds: ["small_talk", "talk_family"] },
  { step: 10, scene: "emergência simples", capabilityIds: ["emergency_basic"] },
] as const;

export function capabilityCoverage(
  availableRefs: ReadonlySet<string>
): Array<ConversationCapability & { coveredRequired: number; missingRefs: string[] }> {
  return CONVERSATION_CAPABILITIES.map((cap) => {
    const missing = cap.requiredRefs.filter((ref) => !availableRefs.has(ref));
    return {
      ...cap,
      coveredRequired: cap.requiredRefs.length - missing.length,
      missingRefs: missing,
    };
  });
}
