/**
 * PED-012 — Taxonomia semântica para "Qual não pertence?".
 * Separada de VocabDomain (contexto de uso). Só entram classes defensáveis.
 */

import { VOCABULARY } from "./vocabulary";

export type OddOneOutSemanticCategory =
  | "beverages"
  | "foods"
  | "family_people"
  | "numbers"
  | "places"
  | "transport"
  | "pronouns"
  | "time_words"
  | "common_verbs";

export const ODD_ONE_OUT_CATEGORY_LABELS: Record<OddOneOutSemanticCategory, string> = {
  beverages: "bebidas",
  foods: "comidas",
  family_people: "pessoas da família",
  numbers: "números",
  places: "lugares",
  transport: "meios de transporte",
  pronouns: "pronomes",
  time_words: "palavras de tempo",
  common_verbs: "verbos comuns",
};

export type OddOneOutLevel = 1 | 2 | 3;

export interface OddOneOutItem {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  category: OddOneOutSemanticCategory;
}

export interface CuratedOddOneOutSet {
  id: string;
  category: OddOneOutSemanticCategory;
  /** Três membros da categoria. */
  memberHanzi: readonly [string, string, string];
  /** Intruso de outra categoria (não adjetivo/descrição do grupo). */
  intruderHanzi: string;
  /** Explicação curta do porquê o intruso sobra (além do rótulo). */
  whyIntruderPt: string;
  /** Nível mínimo em que o set pode aparecer (3 = só inferência). */
  minLevel?: OddOneOutLevel;
}

/**
 * Listas canônicas por categoria — itens que SÃO da classe.
 * Explicitamente fora de bebidas: 好喝, 杯子 (descrevem/contêm, não são bebida).
 */
export const ODD_ONE_OUT_CATEGORY_MEMBERS: Record<OddOneOutSemanticCategory, readonly string[]> = {
  beverages: ["水", "茶", "咖啡", "牛奶", "果汁", "啤酒", "可乐", "热水"],
  foods: ["饭", "米饭", "面条", "面包", "菜", "肉", "鱼", "鸡蛋", "水果", "苹果"],
  family_people: ["妈妈", "爸爸", "哥哥", "姐姐", "弟弟", "妹妹", "儿子", "女儿"],
  numbers: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
  places: ["学校", "医院", "银行", "商店", "超市", "饭馆", "家"],
  transport: ["车", "出租车", "公交车", "火车", "飞机", "地铁", "自行车"],
  pronouns: ["我", "你", "他", "她", "我们"],
  time_words: ["今天", "明天", "昨天", "现在", "上午", "下午"],
  common_verbs: ["吃", "喝", "看", "去", "来", "说", "听", "买"],
};

/** Sets curados para fases iniciais — nunca gerados só por VocabDomain. */
export const CURATED_ODD_ONE_OUT_SETS: readonly CuratedOddOneOutSet[] = [
  {
    id: "ooo_bev_haohe",
    category: "beverages",
    memberHanzi: ["水", "茶", "牛奶"],
    intruderHanzi: "好喝",
    whyIntruderPt: "好喝 significa “gostoso de beber”: descreve uma bebida, mas não é uma bebida.",
  },
  {
    id: "ooo_bev_ni",
    category: "beverages",
    memberHanzi: ["水", "茶", "咖啡"],
    intruderHanzi: "你",
    whyIntruderPt: "你 é um pronome (“você”), não uma bebida.",
  },
  {
    id: "ooo_food_he",
    category: "foods",
    memberHanzi: ["米饭", "面条", "面包"],
    intruderHanzi: "喝",
    whyIntruderPt: "喝 é o verbo “beber”, não uma comida.",
  },
  {
    id: "ooo_food_shui",
    category: "foods",
    memberHanzi: ["饭", "菜", "鱼"],
    intruderHanzi: "水",
    whyIntruderPt: "水 é uma bebida, não uma comida.",
  },
  {
    id: "ooo_fam_san",
    category: "family_people",
    memberHanzi: ["妈妈", "爸爸", "哥哥"],
    intruderHanzi: "三",
    whyIntruderPt: "三 é um número, não uma pessoa da família.",
  },
  {
    id: "ooo_num_ma",
    category: "numbers",
    memberHanzi: ["一", "二", "三"],
    intruderHanzi: "妈妈",
    whyIntruderPt: "妈妈 é pessoa da família, não um número.",
    minLevel: 2,
  },
  {
    id: "ooo_num_ni",
    category: "numbers",
    memberHanzi: ["四", "五", "六"],
    intruderHanzi: "你",
    whyIntruderPt: "你 é pronome, não número.",
  },
  {
    id: "ooo_place_chi",
    category: "places",
    memberHanzi: ["学校", "医院", "商店"],
    intruderHanzi: "吃",
    whyIntruderPt: "吃 é verbo (“comer”), não um lugar.",
  },
  {
    id: "ooo_transport_jia",
    category: "transport",
    memberHanzi: ["火车", "飞机", "地铁"],
    intruderHanzi: "家",
    whyIntruderPt: "家 é lugar/família, não meio de transporte.",
    minLevel: 2,
  },
  {
    id: "ooo_pronoun_san",
    category: "pronouns",
    memberHanzi: ["我", "你", "他"],
    intruderHanzi: "三",
    whyIntruderPt: "三 é número, não pronome.",
  },
  {
    id: "ooo_time_shui",
    category: "time_words",
    memberHanzi: ["今天", "明天", "昨天"],
    intruderHanzi: "水",
    whyIntruderPt: "水 é bebida, não palavra de tempo.",
    minLevel: 2,
  },
  {
    id: "ooo_verb_ma",
    category: "common_verbs",
    memberHanzi: ["吃", "喝", "看"],
    intruderHanzi: "妈妈",
    whyIntruderPt: "妈妈 é pessoa da família, não um verbo.",
    minLevel: 2,
  },
];

function resolveItem(hanzi: string, category: OddOneOutSemanticCategory): OddOneOutItem | null {
  const entry = VOCABULARY.find((item) => item.hanzi === hanzi);
  if (!entry) return null;
  return {
    hanzi: entry.hanzi,
    pinyin: entry.pinyin,
    meaningPt: entry.meaningPt,
    category,
  };
}

export interface OddOneOutResolvedSet {
  id: string;
  category: OddOneOutSemanticCategory;
  groupLabelPt: string;
  members: OddOneOutItem[];
  intruder: OddOneOutItem;
  whyIntruderPt: string;
  minLevel: OddOneOutLevel;
}

export function resolveCuratedOddOneOutSet(def: CuratedOddOneOutSet): OddOneOutResolvedSet | null {
  const members = def.memberHanzi
    .map((hanzi) => resolveItem(hanzi, def.category))
    .filter((item): item is OddOneOutItem => Boolean(item));
  const intruderCategory =
    (Object.keys(ODD_ONE_OUT_CATEGORY_MEMBERS) as OddOneOutSemanticCategory[]).find((cat) =>
      ODD_ONE_OUT_CATEGORY_MEMBERS[cat].includes(def.intruderHanzi)
    ) ?? "pronouns";
  const intruder = resolveItem(def.intruderHanzi, intruderCategory);
  if (members.length !== 3 || !intruder) return null;
  if (members.some((m) => m.hanzi === intruder.hanzi)) return null;
  return {
    id: def.id,
    category: def.category,
    groupLabelPt: ODD_ONE_OUT_CATEGORY_LABELS[def.category],
    members,
    intruder,
    whyIntruderPt: def.whyIntruderPt,
    minLevel: def.minLevel ?? 1,
  };
}

export function allResolvedCuratedOddOneOutSets(): OddOneOutResolvedSet[] {
  return CURATED_ODD_ONE_OUT_SETS.map(resolveCuratedOddOneOutSet).filter(
    (set): set is OddOneOutResolvedSet => Boolean(set)
  );
}

/** Glyphs known by the learner — every character in members+intruder must be seen. */
export function oddOneOutSetAvailable(
  set: OddOneOutResolvedSet,
  seenGlyphs: ReadonlySet<string>
): boolean {
  const texts = [...set.members.map((m) => m.hanzi), set.intruder.hanzi];
  return texts.every((text) => [...text].every((g) => seenGlyphs.has(g) || !/[\u3400-\u9fff]/.test(g)));
}

/**
 * Nível pedagógico (PED-013):
 * 1 — explícito (primeiras fases)
 * 2 — categoria nomeada
 * 3 — inferência (só depois de fase 3+)
 */
export function oddOneOutLevelForPhase(phaseOrder: number): OddOneOutLevel {
  if (phaseOrder <= 2) return 1;
  if (phaseOrder <= 4) return 2;
  return 3;
}

export function oddOneOutPromptForLevel(level: OddOneOutLevel, groupLabelPt: string): string {
  if (level === 1) return `Três são ${groupLabelPt}. Qual não é uma ${singularHint(groupLabelPt)}?`;
  if (level === 2) return `Qual não pertence ao grupo “${groupLabelPt}”?`;
  return "Três pertencem ao mesmo grupo. Qual sobra?";
}

function singularHint(label: string): string {
  if (label === "bebidas") return "bebida";
  if (label === "comidas") return "comida";
  if (label === "pessoas da família") return "pessoa da família";
  if (label === "números") return "número";
  if (label === "lugares") return "lugar";
  if (label === "meios de transporte") return "meio de transporte";
  if (label === "pronomes") return "pronome";
  if (label === "palavras de tempo") return "palavra de tempo";
  if (label === "verbos comuns") return "verbo";
  return label;
}

export function oddOneOutExplanation(set: OddOneOutResolvedSet): string {
  const members = set.members.map((m) => m.hanzi).join("、");
  return `${members} são ${set.groupLabelPt}. ${set.whyIntruderPt}`;
}

/** Sets curados disponíveis para o aluno (glyphs + nível). */
export function curatedOddOneOutSetsFor(
  seenGlyphs: ReadonlySet<string>,
  options: { limit?: number; level?: OddOneOutLevel } = {}
): OddOneOutResolvedSet[] {
  const level = options.level ?? 1;
  const available = allResolvedCuratedOddOneOutSets().filter(
    (set) => set.minLevel <= level && oddOneOutSetAvailable(set, seenGlyphs)
  );
  return options.limit ? available.slice(0, options.limit) : available;
}
