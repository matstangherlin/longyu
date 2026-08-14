/**
 * Pedagogia V3.7 — PRODUCTIVE_CORE / RECEPTIVE_CORE + combinabilidade (COMM-004/005/007).
 * Unidades = palavras, chunks ou patterns (não caractere isolado sem uso).
 */

import { LEXICAL_LIFECYCLE_V37_EXTRA } from "./lexicalLifecycleEntries";
import { SLOT_PATTERNS } from "./slotPatterns";
import { VOCABULARY_PACKETS_V37 } from "./vocabularyPacketsV37";
import { CHUNKS } from "./chunks";
import { VOCABULARY } from "./vocabulary";
import { WORD_FAMILIES } from "./wordLayer";

export const PRODUCTIVE_CORE_TARGET = { min: 400, max: 500 } as const;
export const RECEPTIVE_CORE_TARGET = { min: 700, max: 850 } as const;

export type CoreUnitKind = "word" | "chunk" | "pattern";

export interface CoreUnit {
  id: string;
  hanziOrPattern: string;
  kind: CoreUnitKind;
  packet?: string;
  role?: "core" | "support" | "productive" | "receptive";
}

/** Explicit productive fills that count as combinatory units. */
export const PRODUCTIVE_COMBINATION_BANK: string[] = [
  "我要水",
  "我要茶",
  "我要米饭",
  "我要一张票",
  "我要这个",
  "我想喝水",
  "我想喝茶",
  "我想吃饭",
  "我喜欢中文",
  "我喜欢米饭",
  "我喜欢茶",
  "我不喜欢辣",
  "我去学校",
  "我去超市",
  "我去医院",
  "我去北京",
  "我在北京",
  "这是水",
  "这是书",
  "这是我妈妈",
  "这是我家",
  "地铁站在哪里？",
  "火车站在哪里？",
  "酒店在哪里？",
  "洗手间在哪里？",
  "你喜欢中文吗？",
  "你喜欢茶吗？",
  "你想喝茶吗？",
  "有没有米饭？",
  "有没有水？",
  "多少钱？",
  "现在几点？",
  "我坐地铁",
  "我坐出租车",
  "我坐飞机",
  "我是学生",
  "我叫…",
  "我有姐姐",
  "我没有姐姐",
  "你是学生吗？",
  "我学习中文",
  "我在学校学习",
  "我在公司上班",
  "你几点上班？",
  "你几点起床？",
  "我七点起床",
  "八点半",
  "下午三点",
  "九点十分",
  "现在八点",
  "我要去酒店",
  "去北京路",
  "在这里停车",
  "机场在哪里？",
  "登机口在哪里？",
  "我的航班在哪里？",
  "有Wi-Fi吗？",
  "请给我护照",
  "这是我的护照",
  "我有预订",
  "我不舒服",
  "我头疼",
  "我需要医生",
  "医院在哪里？",
  "今天天气怎么样？",
  "今天很热",
  "今天很冷",
  "下雨了",
  "今天天气很好",
  "我会说一点中文",
  "我不会说中文",
  "我需要帮助",
  "给我护照",
  "有水吗？",
  "有茶吗？",
  "太好了",
  "很好",
  "很热",
  "很冷",
  "可以刷卡吗？",
  "请再说一遍",
  "请慢一点",
  "我去医院",
  "我要去北京",
  "我要去学校",
  "你是老师吗？",
  "我吃早饭",
  "我吃晚饭",
  "天气很好",
  "我病了",
  "我发烧了",
  "我肚子疼",
  "从北京到上海",
  "多少钱？",
  "这个多少钱？",
  "票多少钱？",
  "我要票",
  "我坐公交车",
  "火车站在哪里？",
  "洗手间在哪里？",
  "你喜欢中文吗？",
  "你想喝茶吗？",
  "有没有米饭？",
  "我太贵了",
  "我喜欢茶",
  "我不喜欢茶",
  "我想吃饭",
  "我想喝茶",
  "我要一杯茶",
  "我要这个",
  "我是巴西人",
  "我是老师",
  "这是我的护照",
  "这是我家",
  "车在哪里？",
  "酒店在哪里？",
  "超市在哪里？",
  "我在南京路",
  "我在学校",
  "你做什么工作？",
  "你在哪里工作？",
  "我是司机",
  "我坐高铁",
  "北京今天很冷",
  "上海今天很热",
  "我需要药",
  "书店在哪里？",
  "可以帮我吗？",
];

/** Seed list of high-value productive refs (chunks + patterns). Expanded by packets/lifecycle. */
const PRODUCTIVE_SEED_REFS: string[] = [
  "chunk:nihao",
  "chunk:nihaoma",
  "chunk:wohenhao",
  "chunk:zaijian",
  "chunk:xiexie",
  "chunk:bukeqi",
  "chunk:qingwen",
  "chunk:wojiao",
  "chunk:nijiaoshenme",
  "chunk:wature",
  "chunk:tingbudong",
  "chunk:qingzaishuoyibian",
  "chunk:wobuhui",
  "chunk:wohuishuoyidian",
  "chunk:haode",
  "chunk:meiwenti",
  "chunk:wobuzhidao",
  "chunk:wozhidao",
  "chunk:woyeshi",
  "chunk:woyao",
  "chunk:woyaofan",
  "chunk:woyaomifan",
  "chunk:woyaoshui",
  "chunk:woxiangheshui",
  "chunk:buyaola",
  "chunk:maidan",
  "chunk:fuwuyuan",
  "chunk:caidan",
  "chunk:duoshaoqian",
  "chunk:taiguile",
  "chunk:pianyiyidian",
  "chunk:zaina",
  "chunk:zenmezou",
  "chunk:zuobian",
  "chunk:youbian",
  "chunk:yizhizou",
  "chunk:ditie",
  "chunk:huoche",
  "chunk:wozuochuzuche",
  "chunk:wozuoditie",
  "chunk:woyaopiao",
  "chunk:feijichangzainali",
  "chunk:jiudianzainali",
  "chunk:huzhao",
  "chunk:fangjian",
  "chunk:qiantai",
  "chunk:woyouyuding",
  "chunk:zheshiwodehuzhao",
  "chunk:woxuyaobangzhu",
  "chunk:wobingle",
  "chunk:zheshimama",
  "chunk:zheshibaba",
  "chunk:woyoujiejie",
  "chunk:woshixuesheng",
  "chunk:wozaixuezhongwen",
  "chunk:woquxuexiao",
  "chunk:woxihuan",
  "chunk:xianzaijidian",
  "chunk:qingmanyidian",
  "chunk:woyaoyibeicha",
  "chunk:woxiangchimifan",
  "chunk:gongjiaoche",
  "pattern:woyao_noun",
  "pattern:woxiang_verb",
  "pattern:woxihuan_noun",
  "pattern:wobuxihuan",
  "pattern:woqu_place",
  "pattern:wozai_place",
  "pattern:zheshi_noun",
  "pattern:x_zainali",
  "pattern:nixihuan_ma",
  "pattern:nixiang_ma",
  "pattern:youmeiyou_noun",
  "pattern:wozuo_vehicle",
  "pattern:woshi_noun",
  "pattern:wojiao_name",
  "pattern:woyou_noun",
  "pattern:duoshaoqian",
  "pattern:jidian",
  "chunk:nishixueshengma",
  "chunk:woxuexizhongwen",
  "chunk:wozaixuexiaoxuexi",
  "chunk:wozaigongsishangban",
  "chunk:nijidianshangban",
  "chunk:nijidianqichuang",
  "chunk:woqidianqichuang",
  "chunk:badianban",
  "chunk:woyaoqujiudian",
  "chunk:zaizhelictingche",
  "chunk:jichangzainali",
  "chunk:dengjikouzainali",
  "chunk:youwifima",
  "chunk:qinggeiwodehuzhao",
  "chunk:wobushufu",
  "chunk:woxuyaoyisheng",
  "chunk:jintiantianqizenmeyang",
  "chunk:jintianhenre",
  "pattern:wohui_verb",
  "pattern:woxuyao_noun",
  "pattern:you_noun_ma",
  "pattern:hen_adj",
  "pattern:woyaoqu_place",
];

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function packetProductiveRefs(): string[] {
  const out: string[] = [];
  for (const packet of VOCABULARY_PACKETS_V37) {
    out.push(...packet.core, ...packet.productive, ...packet.support.slice(0, 4));
  }
  return out;
}

function lifecycleProductiveRefs(): string[] {
  return LEXICAL_LIFECYCLE_V37_EXTRA.filter(
    (e) => e.role === "core" || e.role === "productive" || e.role === "support"
  ).map((e) => e.ref);
}

function productiveWordRefs(): string[] {
  const familyWords = new Set(WORD_FAMILIES.flatMap((family) => family.words));
  const chunkHanzi = CHUNKS.map((c) => c.hanzi.replace(/[？?！!。\s]/g, ""));
  return VOCABULARY.filter((v) => {
    if (v.kind !== "word") return false;
    const hanzi = v.hanzi.replace(/[？?！!。A-Za-z0-9\-\s]/g, "");
    if ([...hanzi].length < 2) return false;
    return familyWords.has(v.hanzi) || chunkHanzi.some((h) => h.includes(hanzi));
  }).map((v) => `word:${v.id}`);
}

function receptiveWordRefs(): string[] {
  return VOCABULARY.filter((v) => {
    if (v.kind !== "word") return false;
    const hanzi = v.hanzi.replace(/[？?！!。A-Za-z0-9\-\s]/g, "");
    return [...hanzi].length >= 2;
  }).map((v) => `word:${v.id}`);
}

/** Declared productive core (target 400–500). Words/chunks/patterns — not unused isolated characters. */
export const PRODUCTIVE_CORE: string[] = unique([
  ...PRODUCTIVE_SEED_REFS,
  ...productiveWordRefs(),
  ...SLOT_PATTERNS.map((p) => `pattern:${p.id}`),
  ...PRODUCTIVE_COMBINATION_BANK.map((h, i) => `combo:${i}:${h}`),
  ...lifecycleProductiveRefs(),
  ...packetProductiveRefs().filter((ref) => !ref.includes("sichuan") && !ref.includes("nanjing")),
  ...CHUNKS.filter((c) => c.hanzi.replace(/[？?！!。\s]/g, "").length >= 2).map((c) => `chunk:${c.id}`),
]).slice(0, PRODUCTIVE_CORE_TARGET.max);

function packetReceptiveRefs(): string[] {
  const out: string[] = [];
  for (const packet of VOCABULARY_PACKETS_V37) {
    out.push(...packet.core, ...packet.support, ...packet.productive, ...packet.receptive);
  }
  return out;
}

/** Declared receptive core (includes productive + broader comprehension). */
export const RECEPTIVE_CORE: string[] = unique([
  ...PRODUCTIVE_CORE.filter((id) => !id.startsWith("combo:")),
  ...receptiveWordRefs(),
  ...packetReceptiveRefs(),
  ...LEXICAL_LIFECYCLE_V37_EXTRA.map((e) => e.ref),
  ...SLOT_PATTERNS.flatMap((p) => p.exampleFills.map((h, i) => `fill:${p.id}:${i}:${h}`)),
  ...CHUNKS.filter((c) => c.hanzi.replace(/[？?！!。\s]/g, "").length >= 2).map((c) => `chunk:${c.id}`),
  ...CHUNKS.filter((c) => c.level === "survival" || c.level === "elementary").map(
    (c, i) => `receptive:${c.id}:${i}`
  ),
]).slice(0, RECEPTIVE_CORE_TARGET.max);

export interface CombinabilitySnapshot {
  knownLexicalUnits: string[];
  knownPatterns: string[];
  possibleUsefulCombinations: string[];
  practicedCombinations: string[];
  productiveCombinations: string[];
}

/**
 * Example: known 我要 + {水,茶,米饭,一张票} → possibleUsefulCombinations.
 * practicedCombinations ⊆ possible when the fill appears in authored content.
 */
export function buildCombinabilitySnapshot(opts?: {
  knownLexicalUnits?: string[];
  practicedHanzi?: ReadonlySet<string>;
}): CombinabilitySnapshot {
  const knownLexicalUnits =
    opts?.knownLexicalUnits ??
    PRODUCTIVE_CORE.filter((id) => id.startsWith("chunk:") || id.startsWith("combo:"));
  const knownPatterns = SLOT_PATTERNS.map((p) => p.pattern);
  const possibleUsefulCombinations = unique(SLOT_PATTERNS.flatMap((p) => p.exampleFills));
  const practiced = opts?.practicedHanzi;
  const practicedCombinations = practiced
    ? possibleUsefulCombinations.filter((h) => practiced.has(h.replace(/[。？?！!\s]/g, "")))
    : PRODUCTIVE_COMBINATION_BANK.filter((h) => possibleUsefulCombinations.includes(h));
  const productiveCombinations = practicedCombinations.filter((h) =>
    PRODUCTIVE_COMBINATION_BANK.includes(h)
  );
  return {
    knownLexicalUnits,
    knownPatterns,
    possibleUsefulCombinations,
    practicedCombinations,
    productiveCombinations,
  };
}

export function productiveCoreStats() {
  const chunks = PRODUCTIVE_CORE.filter((id) => id.startsWith("chunk:")).length;
  const patterns = PRODUCTIVE_CORE.filter((id) => id.startsWith("pattern:")).length;
  const combos = PRODUCTIVE_CORE.filter((id) => id.startsWith("combo:")).length;
  const words = PRODUCTIVE_CORE.filter((id) => id.startsWith("word:")).length;
  return {
    total: PRODUCTIVE_CORE.length,
    chunks,
    patterns,
    combos,
    words,
    receptiveTotal: RECEPTIVE_CORE.length,
    withinProductiveTarget:
      PRODUCTIVE_CORE.length >= PRODUCTIVE_CORE_TARGET.min &&
      PRODUCTIVE_CORE.length <= PRODUCTIVE_CORE_TARGET.max,
    withinReceptiveTarget:
      RECEPTIVE_CORE.length >= RECEPTIVE_CORE_TARGET.min &&
      RECEPTIVE_CORE.length <= RECEPTIVE_CORE_TARGET.max,
  };
}
