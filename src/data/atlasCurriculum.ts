/**
 * Pedagogia V3.6 — Atlas → Journey bridge + lexical growth helpers.
 * Declara quando um chunk/char do Atlas entra na Jornada (não só no banco).
 */

import { CHUNKS } from "./chunks";
import { CHARACTERS } from "./characters";
import type { LexicalLessonLike, LexicalStepLike } from "./lexicalProgression";
import {
  ATOMIC_PHRASE_TOKENS,
  extractTokensFromLesson,
  isSeedGreetingToken,
  SEED_GREETING_TOKENS,
} from "./lexicalProgression";

export type LexicalLifecycleStatus = "taught" | "scheduled" | "reference_only" | "future";

export type VocabularyPacketId =
  | "greetings"
  | "introductions"
  | "repair"
  | "basic_questions"
  | "food"
  | "shopping"
  | "time"
  | "family"
  | "transport"
  | "city"
  | "health"
  | "courtesy"
  | "survival";

export type LexicalRole = "core" | "support" | "productive" | "receptive";

export interface LexicalLifecycleEntry {
  ref: string;
  /** First lesson that pedagogically introduces the item (not as distractor). */
  introduceAt: string;
  reinforceAt?: string[];
  productiveAt?: string;
  packet?: VocabularyPacketId;
  role?: LexicalRole;
}

export interface VocabularyPacket {
  id: VocabularyPacketId;
  labelPt: string;
  core: string[];
  support: string[];
  productive: string[];
  receptive: string[];
}

/** LEX-014 — declarative bridge (chunk:/char: refs). */
export const LEXICAL_LIFECYCLE: LexicalLifecycleEntry[] = [
  // Seed (already early)
  { ref: "chunk:nihao", introduceAt: "l2", reinforceAt: ["l3", "p1-primeira-conversa"], productiveAt: "l2", packet: "greetings", role: "core" },
  { ref: "chunk:nihaoma", introduceAt: "l3", reinforceAt: ["p1-primeira-conversa", "p1-qingwen-cortesia"], productiveAt: "l3", packet: "greetings", role: "core" },
  { ref: "chunk:wohenhao", introduceAt: "l3", reinforceAt: ["p1-primeira-conversa"], productiveAt: "l3", packet: "greetings", role: "core" },
  { ref: "chunk:nine", introduceAt: "l3", reinforceAt: ["p1-primeira-conversa"], productiveAt: "l3", packet: "basic_questions", role: "productive" },
  { ref: "chunk:xiexie", introduceAt: "l4", reinforceAt: ["p1-primeira-conversa", "l2-rev"], productiveAt: "l4", packet: "courtesy", role: "core" },
  { ref: "chunk:bukeqi", introduceAt: "l4", reinforceAt: ["l2-rev"], productiveAt: "l4", packet: "courtesy", role: "core" },
  { ref: "chunk:zaijian", introduceAt: "p1-ate-logo", reinforceAt: ["p1-primeira-conversa"], productiveAt: "p1-ate-logo", packet: "greetings", role: "core" },

  // LEX-007 — greeting expansion (V3.6 activation)
  { ref: "chunk:zaoshanghao", introduceAt: "l2", reinforceAt: ["p1-primeira-conversa", "l2-rev"], productiveAt: "l2", packet: "greetings", role: "support" },
  { ref: "chunk:wanshanghao", introduceAt: "p1-ate-logo", reinforceAt: ["p1-primeira-conversa"], productiveAt: "p1-ate-logo", packet: "greetings", role: "support" },
  { ref: "chunk:wanan", introduceAt: "p1-ate-logo", reinforceAt: ["l2-rev"], productiveAt: "p1-ate-logo", packet: "greetings", role: "productive" },
  { ref: "chunk:mingtianjian", introduceAt: "p1-ate-logo", reinforceAt: ["p1-primeira-conversa", "l8"], productiveAt: "p1-ate-logo", packet: "greetings", role: "productive" },
  { ref: "chunk:meiguanxi", introduceAt: "l4", reinforceAt: ["l2-rev", "p2-tons-xiexie"], productiveAt: "l4", packet: "courtesy", role: "support" },
  { ref: "chunk:qingwen", introduceAt: "p1-qingwen-cortesia", reinforceAt: ["l2-rev"], productiveAt: "p1-qingwen-cortesia", packet: "courtesy", role: "core" },
  { ref: "chunk:qingzuo", introduceAt: "p1-qingwen-cortesia", reinforceAt: ["l9"], productiveAt: "p1-qingwen-cortesia", packet: "courtesy", role: "support" },
  { ref: "chunk:qingjin", introduceAt: "p1-qingwen-cortesia", reinforceAt: ["l9"], productiveAt: "p1-qingwen-cortesia", packet: "courtesy", role: "support" },

  // LEX-008 — presentation ladder (pull earlier + reinforce)
  { ref: "chunk:wojiao", introduceAt: "l2", reinforceAt: ["p1-primeira-conversa", "l9"], productiveAt: "l9", packet: "introductions", role: "core" },
  { ref: "chunk:nijiaoshenme", introduceAt: "p1-primeira-conversa", reinforceAt: ["l9", "l9-qual-nome"], productiveAt: "l9-qual-nome", packet: "introductions", role: "core" },
  { ref: "chunk:wature", introduceAt: "l9", reinforceAt: ["l10"], productiveAt: "l10", packet: "introductions", role: "core" },
  { ref: "chunk:nishinaiguoren", introduceAt: "l9", reinforceAt: ["l10"], productiveAt: "l10", packet: "introductions", role: "productive" },
  { ref: "chunk:woshixuesheng", introduceAt: "l10", reinforceAt: ["l12"], productiveAt: "l10", packet: "introductions", role: "support" },
  { ref: "chunk:renshinihengaoxing", introduceAt: "l10", reinforceAt: ["l12"], productiveAt: "l10", packet: "introductions", role: "productive" },

  // LEX-009 — survival early
  { ref: "chunk:tingbudong", introduceAt: "p2-sons-brasileiros", reinforceAt: ["l11"], productiveAt: "l11", packet: "repair", role: "core" },
  { ref: "chunk:qingzaishuoyibian", introduceAt: "p2-sons-brasileiros", reinforceAt: ["l11"], productiveAt: "l11", packet: "repair", role: "core" },
  { ref: "chunk:wobuhui", introduceAt: "l11", reinforceAt: ["l11-falo-pouco"], productiveAt: "l11", packet: "survival", role: "core" },
  { ref: "chunk:wohuishuoyidian", introduceAt: "l11-falo-pouco", reinforceAt: ["l12"], productiveAt: "l11-falo-pouco", packet: "survival", role: "productive" },
  { ref: "chunk:dengyixia", introduceAt: "l11", reinforceAt: ["l12"], productiveAt: "l11", packet: "survival", role: "support" },

  // LEX-010 — questions
  { ref: "chunk:zheshishenme", introduceAt: "l14", reinforceAt: ["l15"], productiveAt: "l15", packet: "basic_questions", role: "core" },
  { ref: "chunk:zaina", introduceAt: "p6-cidade-lugares", reinforceAt: ["p6-rotina-trabalho"], productiveAt: "p6-cidade-lugares", packet: "basic_questions", role: "core" },
  { ref: "chunk:shenmeshihou", introduceAt: "p6-horarios", reinforceAt: ["l29"], productiveAt: "p6-horarios", packet: "time", role: "support" },
  { ref: "chunk:zenmeyang", introduceAt: "l9-tudo-bem", reinforceAt: ["l13"], productiveAt: "l9-tudo-bem", packet: "basic_questions", role: "support" },

  // LEX-011 — shopping
  { ref: "chunk:duoshaoqian", introduceAt: "l27", reinforceAt: ["l26b"], productiveAt: "l27", packet: "shopping", role: "core" },
  { ref: "chunk:zhegeduoshaoqian", introduceAt: "l27", reinforceAt: ["l26b"], productiveAt: "l27", packet: "shopping", role: "productive" },
  { ref: "chunk:woyao", introduceAt: "l26b", reinforceAt: ["l27"], productiveAt: "l26b", packet: "shopping", role: "core" },
  { ref: "chunk:taiguile", introduceAt: "l27", reinforceAt: ["l28"], productiveAt: "l27", packet: "shopping", role: "productive" },
  { ref: "chunk:pianyiyidian", introduceAt: "l27", reinforceAt: ["l28"], productiveAt: "l27", packet: "shopping", role: "support" },
];

/** LEX-015 — communicative packets. */
export const VOCABULARY_PACKETS: VocabularyPacket[] = [
  {
    id: "greetings",
    labelPt: "Cumprimentos e despedidas",
    core: ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:zaijian"],
    support: ["chunk:zaoshanghao", "chunk:wanshanghao"],
    productive: ["chunk:mingtianjian", "chunk:wanan"],
    receptive: ["chunk:jintianhenhao"],
  },
  {
    id: "courtesy",
    labelPt: "Cortesia",
    core: ["chunk:xiexie", "chunk:bukeqi", "chunk:qingwen"],
    support: ["chunk:meiguanxi", "chunk:qingzuo", "chunk:qingjin"],
    productive: ["chunk:qingwen_nihaoma"],
    receptive: ["chunk:duibuqi"],
  },
  {
    id: "introductions",
    labelPt: "Apresentação",
    core: ["chunk:wojiao", "chunk:nijiaoshenme", "chunk:wature"],
    support: ["chunk:woshixuesheng"],
    productive: ["chunk:nishinaiguoren", "chunk:renshinihengaoxing", "chunk:woyousangepengyou"],
    receptive: [],
  },
  {
    id: "repair",
    labelPt: "Reparo comunicativo",
    core: ["chunk:tingbudong", "chunk:qingzaishuoyibian"],
    support: ["chunk:dengyixia"],
    productive: ["chunk:wobuhui", "chunk:wohuishuoyidian"],
    receptive: ["chunk:nihuishuoyingyuma"],
  },
  {
    id: "basic_questions",
    labelPt: "Perguntas básicas",
    core: ["chunk:zheshishenme", "chunk:zaina", "chunk:nine"],
    support: ["chunk:zenmeyang", "chunk:shenmeshihou"],
    productive: ["chunk:zheshishui", "chunk:chezainali"],
    receptive: ["chunk:nashitian"],
  },
  {
    id: "shopping",
    labelPt: "Compras",
    core: ["chunk:duoshaoqian", "chunk:woyao"],
    support: ["chunk:pianyiyidian"],
    productive: ["chunk:zhegeduoshaoqian", "chunk:taiguile"],
    receptive: [],
  },
  {
    id: "survival",
    labelPt: "Sobrevivência",
    core: ["chunk:wobuhui", "chunk:tingbudong"],
    support: ["chunk:dengyixia"],
    productive: ["chunk:wohuishuoyidian"],
    receptive: ["chunk:nihuishuoyingyuma"],
  },
  {
    id: "food",
    labelPt: "Comida e bebida",
    core: ["chunk:woxiangheshui", "chunk:woyaofan"],
    support: ["chunk:caidan", "chunk:fanguan"],
    productive: ["chunk:maidan", "chunk:buyaola"],
    receptive: ["chunk:haochi"],
  },
  {
    id: "time",
    labelPt: "Tempo",
    core: ["chunk:shenmeshihou"],
    support: [],
    productive: [],
    receptive: [],
  },
  {
    id: "family",
    labelPt: "Família",
    core: [],
    support: [],
    productive: [],
    receptive: [],
  },
  {
    id: "transport",
    labelPt: "Transporte",
    core: ["chunk:chezainali"],
    support: [],
    productive: [],
    receptive: [],
  },
  {
    id: "city",
    labelPt: "Cidade",
    core: ["chunk:zaina"],
    support: [],
    productive: [],
    receptive: [],
  },
  {
    id: "health",
    labelPt: "Saúde",
    core: [],
    support: [],
    productive: [],
    receptive: [],
  },
];

export const lexicalLifecycleByRef = Object.fromEntries(
  LEXICAL_LIFECYCLE.map((entry) => [entry.ref, entry])
) as Record<string, LexicalLifecycleEntry>;

export function atlasItemRefs(): string[] {
  const refs = [
    ...CHUNKS.map((chunk) => `chunk:${chunk.id}`),
    ...CHARACTERS.map((char) => `char:${char.id}`),
  ];
  return [...new Set(refs)];
}

export function hanziForRef(ref: string): string {
  if (ref.startsWith("chunk:")) {
    const id = ref.slice("chunk:".length);
    return CHUNKS.find((chunk) => chunk.id === id)?.hanzi ?? "";
  }
  if (ref.startsWith("char:")) {
    const id = ref.slice("char:".length);
    return CHARACTERS.find((char) => char.id === id)?.hanzi ?? "";
  }
  return "";
}

/** Explicit pedagogical exposures (LEX-013 — distractors do not count). */
export function explicitLexemeExposures(step: LexicalStepLike): string[] {
  const tokens = new Set<string>();
  const pushText = (value: unknown) => {
    const cleaned = String(value ?? "").replace(/[，。！？、,.!?\s]/g, "").trim();
    if (!cleaned) return;
    const phrases = [...ATOMIC_PHRASE_TOKENS, "没关系", "请坐", "请进", "晚安", "明天见", "早上好", "晚上好"].sort(
      (a, b) => b.length - a.length
    );
    let rest = cleaned;
    for (const phrase of phrases) {
      if (!rest.includes(phrase)) continue;
      tokens.add(phrase);
      rest = rest.split(phrase).join("");
    }
  };
  pushText(step.correctAnswer);
  pushText(step.answer);
  pushText(step.hanzi);
  pushText(step.text);
  pushText(step.audioText);
  pushText(step.blankAnswer);
  for (const part of step.targetParts ?? []) pushText(part);
  for (const part of step.target ?? []) pushText(part);
  for (const line of step.lines ?? []) pushText(line.hanzi);
  for (const label of step.introducesNewVocabulary ?? []) pushText(label);
  // Options are distractor-heavy — do NOT count (LEX-013 / LEX-006).
  return [...tokens];
}

export function lessonExplicitLexemes(lesson: LexicalLessonLike): string[] {
  const fromSteps = (lesson.steps ?? []).flatMap((step) => explicitLexemeExposures(step));
  const fromLibrary = (lesson.libraryItems ?? [])
    .map((ref) => hanziForRef(ref))
    .filter(Boolean);
  return [...new Set([...fromSteps, ...fromLibrary])];
}

export interface LexicalGrowthPoint {
  lessonId: string;
  title: string;
  isReview: boolean;
  skill?: string;
  newLexemes: string[];
  reusedLexemes: string[];
  cumulative: number;
  seedShare: number;
}

export function buildLexicalGrowthCurve(
  lessons: LexicalLessonLike[],
  options: { limit?: number } = {}
): LexicalGrowthPoint[] {
  const limit = options.limit ?? lessons.length;
  const seen = new Set<string>();
  const points: LexicalGrowthPoint[] = [];
  for (const lesson of lessons.slice(0, limit)) {
    const lexemes = lessonExplicitLexemes(lesson);
    const newLexemes = lexemes.filter((token) => !seen.has(token));
    const reusedLexemes = lexemes.filter((token) => seen.has(token));
    for (const token of newLexemes) seen.add(token);
    const seedHits = lexemes.filter((token) => isSeedGreetingToken(token) || token === "我很好").length;
    points.push({
      lessonId: lesson.id,
      title: lesson.title ?? lesson.id,
      isReview: Boolean(lesson.isReview),
      skill: lesson.skill,
      newLexemes,
      reusedLexemes,
      cumulative: seen.size,
      seedShare: lexemes.length ? seedHits / lexemes.length : 0,
    });
  }
  return points;
}

export interface AtlasUtilizationRow {
  ref: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  domain: string;
  level: string;
  status: LexicalLifecycleStatus;
  usedInJourney: boolean;
  firstLesson: string | null;
  totalLessonUses: number;
  productiveUses: number;
  conversationUses: number;
}

export function classifyAtlasItem(
  ref: string,
  taughtRefs: ReadonlySet<string>,
  scheduledRefs: ReadonlySet<string>
): LexicalLifecycleStatus {
  if (taughtRefs.has(ref)) return "taught";
  if (scheduledRefs.has(ref) || lexicalLifecycleByRef[ref]) return "scheduled";
  return "future";
}

export function findLexicalStagnationIssues(
  points: LexicalGrowthPoint[],
  options: { warnConsecutive?: number; failConsecutive?: number } = {}
): { warnings: string[]; errors: string[] } {
  const warnConsecutive = options.warnConsecutive ?? 3;
  const failConsecutive = options.failConsecutive ?? 5;
  const warnings: string[] = [];
  const errors: string[] = [];
  let streak = 0;
  let streakStart = "";
  for (const point of points) {
    const labOrReview =
      point.isReview ||
      point.skill === "som" ||
      point.skill === "hanzi" ||
      point.skill === "sistema" ||
      point.lessonId.startsWith("p1-o-que-e") ||
      point.lessonId.includes("tom") ||
      point.lessonId.includes("ma-") ||
      point.lessonId.includes("compare") ||
      point.lessonId.includes("tons-") ||
      point.lessonId.includes("sons-") ||
      point.lessonId.includes("numeros");
    if (labOrReview) {
      streak = 0;
      continue;
    }
    if (point.newLexemes.length === 0) {
      if (streak === 0) streakStart = point.lessonId;
      streak += 1;
      if (streak === warnConsecutive) {
        warnings.push(`${streakStart}…: ${streak} lições normais sem novo lexema`);
      }
      if (streak >= failConsecutive) {
        errors.push(`${streakStart}…: ${streak} lições normais sem crescimento lexical`);
      }
    } else {
      streak = 0;
    }
  }
  return { warnings, errors };
}

export function seedDecayByBand(
  points: LexicalGrowthPoint[],
  bands: Array<{ label: string; start: number; end: number }>
): Array<{ label: string; seedShare: number; lessons: number }> {
  return bands.map((band) => {
    const slice = points.slice(band.start, band.end);
    const avg =
      slice.length === 0 ? 0 : slice.reduce((sum, point) => sum + point.seedShare, 0) / slice.length;
    return { label: band.label, seedShare: avg, lessons: slice.length };
  });
}

/** Keep SEED tokens export for reports. */
export { SEED_GREETING_TOKENS, extractTokensFromLesson };
