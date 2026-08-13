/**
 * Pedagogia V3.2 — Survival Mandarin
 *
 * Vocabulario que um estrangeiro realmente usa: pagamento, celular,
 * hotel e necessidades. Entra como linguagem funcional (nao lista).
 */

export interface SurvivalItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  chunkId: string;
  axis: "payment" | "phone" | "hotel" | "needs";
}

export const SURVIVAL_PAYMENT: SurvivalItem[] = [
  { id: "xianjin", hanzi: "现金", pinyin: "xiànjīn", meaningPt: "dinheiro vivo", chunkId: "xianjin", axis: "payment" },
  { id: "weixinzhifu", hanzi: "微信支付", pinyin: "Wēixìn zhīfù", meaningPt: "WeChat Pay", chunkId: "weixinzhifu", axis: "payment" },
  { id: "zhifubao", hanzi: "支付宝", pinyin: "Zhīfùbǎo", meaningPt: "Alipay", chunkId: "zhifubao", axis: "payment" },
  { id: "keyishuaka", hanzi: "可以刷卡吗？", pinyin: "kěyǐ shuākǎ ma?", meaningPt: "Posso pagar com cartao?", chunkId: "keyishuaka", axis: "payment" },
];

export const SURVIVAL_PHONE: SurvivalItem[] = [
  { id: "shouji", hanzi: "手机", pinyin: "shǒujī", meaningPt: "celular", chunkId: "shouji_device", axis: "phone" },
  { id: "chongdian", hanzi: "充电", pinyin: "chōngdiàn", meaningPt: "carregar (bateria)", chunkId: "chongdian", axis: "phone" },
  { id: "chongdianqi", hanzi: "充电器", pinyin: "chōngdiànqì", meaningPt: "carregador", chunkId: "chongdianqi", axis: "phone" },
  { id: "wifi", hanzi: "Wi-Fi", pinyin: "Wài-Fài", meaningPt: "Wi-Fi", chunkId: "wifi", axis: "phone" },
];

export const SURVIVAL_HOTEL: SurvivalItem[] = [
  { id: "huzhao", hanzi: "护照", pinyin: "hùzhào", meaningPt: "passaporte", chunkId: "huzhao", axis: "hotel" },
  { id: "fangjian", hanzi: "房间", pinyin: "fángjiān", meaningPt: "quarto", chunkId: "fangjian", axis: "hotel" },
  { id: "fangka", hanzi: "房卡", pinyin: "fángkǎ", meaningPt: "cartao do quarto", chunkId: "fangka", axis: "hotel" },
  { id: "qiantai", hanzi: "前台", pinyin: "qiántái", meaningPt: "recepcao", chunkId: "qiantai", axis: "hotel" },
];

export const SURVIVAL_NEEDS: SurvivalItem[] = [
  { id: "xishoujianzainali", hanzi: "洗手间在哪里？", pinyin: "xǐshǒujiān zài nǎlǐ?", meaningPt: "Onde fica o banheiro?", chunkId: "xishoujianzainali", axis: "needs" },
  { id: "woxuyaoBangzhu", hanzi: "我需要帮助", pinyin: "wǒ xūyào bāngzhù", meaningPt: "Preciso de ajuda", chunkId: "woxuyaobangzhu", axis: "needs" },
  { id: "yiyuanzainali", hanzi: "医院在哪里？", pinyin: "yīyuàn zài nǎlǐ?", meaningPt: "Onde fica o hospital?", chunkId: "yiyuanzainali", axis: "needs" },
];

export const ALL_SURVIVAL_ITEMS = [
  ...SURVIVAL_PAYMENT,
  ...SURVIVAL_PHONE,
  ...SURVIVAL_HOTEL,
  ...SURVIVAL_NEEDS,
];

export const SURVIVAL_PILOT_LESSON_IDS = ["p6-survival-mandarin"] as const;

export type SurvivalPilotLessonId = (typeof SURVIVAL_PILOT_LESSON_IDS)[number];

export function isSurvivalPilotLesson(lessonId: string): lessonId is SurvivalPilotLessonId {
  return (SURVIVAL_PILOT_LESSON_IDS as readonly string[]).includes(lessonId);
}

/** Precos pedagogicos para price_task (nao precos reais de loja). */
export const PEDAGOGIC_PRICES = [
  { hanzi: "8元", pinyin: "bā yuán", amount: 8 },
  { hanzi: "18元", pinyin: "shíbā yuán", amount: 18 },
  { hanzi: "28元", pinyin: "èrshíbā yuán", amount: 28 },
  { hanzi: "50元", pinyin: "wǔshí yuán", amount: 50 },
] as const;

export const URBAN_SIGNS = [
  { hanzi: "出口", pinyin: "chūkǒu", meaningPt: "saida", category: "exit" },
  { hanzi: "入口", pinyin: "rùkǒu", meaningPt: "entrada", category: "entrance" },
  { hanzi: "地铁", pinyin: "dìtiě", meaningPt: "metro", category: "metro" },
  { hanzi: "医院", pinyin: "yīyuàn", meaningPt: "hospital", category: "hospital" },
  { hanzi: "洗手间", pinyin: "xǐshǒujiān", meaningPt: "banheiro", category: "restroom" },
] as const;
