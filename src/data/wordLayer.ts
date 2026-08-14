/**
 * Pedagogia V3.8 — camada de PALAVRAS entre caractere e chunk (WORD-001/003/005).
 * Não duplica pinyin/significado: aponta para VOCABULARY / chunks.
 */

export interface WordFamily {
  rootChar: string;
  words: string[];
  productivePriority: number;
  domain: string;
}

/** Famílias produtivas: caractere → palavras úteis (não frases). */
export const WORD_FAMILIES: WordFamily[] = [
  { rootChar: "学", words: ["学习", "学生", "学校", "同学", "中文"], productivePriority: 95, domain: "estudo" },
  { rootChar: "车", words: ["汽车", "火车", "出租车", "公交车", "车站", "火车站", "地铁", "高铁"], productivePriority: 94, domain: "transporte" },
  { rootChar: "店", words: ["商店", "饭店", "酒店", "书店"], productivePriority: 88, domain: "lugar" },
  { rootChar: "吃", words: ["吃饭", "早饭", "午饭", "晚饭", "好吃"], productivePriority: 90, domain: "comida" },
  { rootChar: "喝", words: ["喝水", "喝茶", "好喝"], productivePriority: 86, domain: "bebida" },
  { rootChar: "看", words: ["看病", "看书", "看见"], productivePriority: 80, domain: "verbo" },
  { rootChar: "说", words: ["说话", "听说"], productivePriority: 82, domain: "verbo" },
  { rootChar: "听", words: ["听说", "听不懂"], productivePriority: 84, domain: "verbo" },
  { rootChar: "买", words: ["买单", "买东西"], productivePriority: 85, domain: "compras" },
  { rootChar: "钱", words: ["多少钱", "价钱"], productivePriority: 83, domain: "compras" },
  { rootChar: "人", words: ["中国人", "巴西人", "家人", "大人"], productivePriority: 80, domain: "pessoa" },
  { rootChar: "家", words: ["家人", "回家", "大家"], productivePriority: 88, domain: "familia" },
  { rootChar: "工", words: ["工作", "公司", "上班", "下班"], productivePriority: 87, domain: "trabalho" },
  { rootChar: "医", words: ["医生", "医院", "看病"], productivePriority: 86, domain: "sobrevivencia" },
  { rootChar: "机", words: ["飞机", "机场", "手机"], productivePriority: 85, domain: "transporte" },
  { rootChar: "站", words: ["车站", "火车站", "地铁站"], productivePriority: 84, domain: "transporte" },
  { rootChar: "房", words: ["房间", "房卡"], productivePriority: 82, domain: "sobrevivencia" },
  { rootChar: "天", words: ["今天", "明天", "天气", "昨天"], productivePriority: 90, domain: "tempo" },
  { rootChar: "点", words: ["几点", "八点", "八点半"], productivePriority: 88, domain: "tempo" },
  { rootChar: "水", words: ["喝水", "热水", "水果"], productivePriority: 86, domain: "bebida" },
  { rootChar: "茶", words: ["喝茶", "一杯茶"], productivePriority: 84, domain: "bebida" },
  { rootChar: "饭", words: ["米饭", "吃饭", "早饭", "午饭", "晚饭", "饭店"], productivePriority: 92, domain: "comida" },
  { rootChar: "左", words: ["左边", "左转"], productivePriority: 78, domain: "lugar" },
  { rootChar: "右", words: ["右边", "右转"], productivePriority: 78, domain: "lugar" },
  { rootChar: "热", words: ["很热", "热水"], productivePriority: 76, domain: "tempo" },
  { rootChar: "冷", words: ["很冷", "天气很冷", "今天很冷", "冷水"], productivePriority: 76, domain: "tempo" },
  { rootChar: "病", words: ["生病", "看病", "医院"], productivePriority: 80, domain: "sobrevivencia" },
  { rootChar: "帮", words: ["帮助", "帮忙"], productivePriority: 81, domain: "sobrevivencia" },
  { rootChar: "需", words: ["需要", "我需要帮助"], productivePriority: 80, domain: "sobrevivencia" },
];

export const WORD_LAYER_MIN = 300;
export const WORD_FAMILY_MIN = 20;
