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
  /** Packet id (V3.6 ids + V3.7 expansions). */
  packet?: string;
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

/** LEX-014/055 — declarative bridge (chunk:/char: refs). V3.7 expands to 120+. */
export { LEXICAL_LIFECYCLE_V37_EXTRA as LEXICAL_LIFECYCLE } from "./lexicalLifecycleEntries";
import { LEXICAL_LIFECYCLE_V37_EXTRA } from "./lexicalLifecycleEntries";

/** @deprecated Prefer VOCABULARY_PACKETS_V37 — kept for V3.6 callers. */
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
    core: ["chunk:shenmeshihou", "chunk:xianzaijidian", "chunk:xianzaibadian"],
    support: ["chunk:zhongwu"],
    productive: [],
    receptive: [],
  },
  {
    id: "family",
    labelPt: "Família",
    core: ["chunk:zheshibaba", "chunk:zheshimama", "chunk:zheshiwodejia"],
    support: ["chunk:wohuijia", "chunk:wodeyeye", "chunk:wodenainai"],
    productive: ["chunk:woyoujiejie", "chunk:woyoudidi"],
    receptive: [],
  },
  {
    id: "transport",
    labelPt: "Transporte",
    core: ["chunk:ditie", "chunk:huoche", "chunk:wozuochuzuche", "chunk:chezainali"],
    support: ["chunk:ditiezhan", "chunk:piaoduoshaoqian"],
    productive: ["chunk:woyaopiao", "chunk:wozuofeiji"],
    receptive: ["chunk:huochezhanzainali"],
  },
  {
    id: "city",
    labelPt: "Cidade",
    core: ["chunk:zaina", "chunk:chaoshizainali", "chunk:yinhangzainali"],
    support: ["chunk:yiyuanzainali", "chunk:gongyuanzainali"],
    productive: ["chunk:woquchaoshi", "chunk:woquyiyuan"],
    receptive: [],
  },
  {
    id: "health",
    labelPt: "Saúde",
    core: ["chunk:wobingle", "chunk:wotouteng", "chunk:woyaokanyisheng"],
    support: ["chunk:yiyuanzainali"],
    productive: ["chunk:woxuyaobangzhu"],
    receptive: [],
  },
];

export const lexicalLifecycleByRef = Object.fromEntries(
  LEXICAL_LIFECYCLE_V37_EXTRA.map((entry) => [entry.ref, entry])
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
