import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { FIRST_5000_SEED as FIRST_5000_OBJECT_SEED, type First5000SeedEntry } from "./first5000Seed";
import { JOURNEY, type LessonStep } from "./journey";
import { radicalById } from "./radicals";
import type { Character } from "./types";

export interface HanziAtlasExample {
  hanzi: string;
  pinyin: string;
  pt: string;
}

export interface HanziAtlasEntry {
  id: string;
  hanzi: string;
  pinyin: string;
  toneless: string;
  tone: 1 | 2 | 3 | 4 | 5;
  meaningPt: string;
  meaningEn?: string;
  freqRank: number;
  radical?: string;
  components?: string[];
  phonetic?: string;
  strokeCount?: number;
  hskLevel?: number;
  source: "journey" | "first5000" | "manual";
  inJourney: boolean;
  hasLesson: boolean;
  hasDecomposition: boolean;
  isPremium: boolean;
  examples: HanziAtlasExample[];
  lessonIds: string[];
  mnemonicPt?: string;
  sourceCharacter?: Character;
}

export type HanziAtlasItem = HanziAtlasEntry;

export interface HanziAtlasFilterOptions {
  query?: string;
  frequency?: 300 | 1000 | 3000 | 5000 | "all";
  maxFreqRank?: number;
  tone?: 1 | 2 | 3 | 4 | 5 | "all";
  radical?: string | "all";
  inJourney?: boolean;
  hasLesson?: boolean;
  hasDecomposition?: boolean;
  hasPhonetic?: boolean;
  isPremium?: boolean;
  source?: HanziAtlasEntry["source"];
}

const STROKE_COUNTS: Record<string, number> = {
  de: 8,
  shi: 9,
  bu: 4,
  wo: 7,
  yi: 1,
  you: 6,
  da: 3,
  zai: 6,
  ren: 2,
  le: 2,
  zhong: 4,
  dao: 8,
  yao: 9,
  zhe: 7,
  ge: 3,
  ni: 7,
  hui: 6,
  hao: 6,
  shuo: 9,
  ta: 5,
  kan: 9,
  sheng: 5,
  guo: 8,
  lai: 7,
  men: 5,
  ye: 3,
  xue: 8,
  jia: 10,
  mu: 4,
  shui: 4,
  huo: 4,
  shan: 3,
  kou: 3,
  ri: 4,
  yue: 4,
  nv: 3,
  zi: 3,
  xiu: 6,
  lin: 8,
  ming: 8,
  an: 6,
  xie: 12,
  er: 2,
  san: 3,
  si: 5,
  wu: 4,
  liu: 4,
  qi: 2,
  ba8: 2,
  jiu: 2,
  shi10: 2,
  sen: 12,
  peng: 8,
  cong: 4,
  zhong3: 6,
  pin: 9,
  yan2: 8,
  ma2: 6,
  ma_question: 6,
};

const HSK_LEVELS: Record<string, number> = {
  de: 1,
  shi: 1,
  bu: 1,
  wo: 1,
  yi: 1,
  you: 1,
  da: 1,
  zai: 1,
  ren: 1,
  le: 1,
  zhong: 1,
  yao: 1,
  zhe: 1,
  ge: 1,
  ni: 1,
  hui: 1,
  hao: 1,
  shuo: 1,
  ta: 1,
  kan: 1,
  sheng: 2,
  guo: 1,
  lai: 1,
  men: 1,
  ye: 1,
  xue: 1,
  jia: 1,
  ma2: 1,
  ma_question: 1,
};

const LESSONS_BY_CHAR = buildLessonIndex();
const FIRST_5000_SEED_BY_HANZI = new Map(FIRST_5000_OBJECT_SEED.map((seed) => [seed.hanzi, seed]));
const FIRST_5000_AVAILABLE_COUNT = FIRST_5000_OBJECT_SEED.length;

const FIRST_5000_ATLAS = FIRST_5000_OBJECT_SEED.map(first5000SeedToAtlasEntry);
const JOURNEY_ATLAS = CHARACTERS.map(characterToAtlasEntry);

export const HANZI_ATLAS: HanziAtlasEntry[] = mergeAtlasEntries([...FIRST_5000_ATLAS, ...JOURNEY_ATLAS]).sort(
  (a, b) => a.freqRank - b.freqRank || a.hanzi.localeCompare(b.hanzi)
);

assertUniqueAtlasIds(HANZI_ATLAS);

export const hanziAtlasById: Record<string, HanziAtlasEntry> = Object.fromEntries(
  HANZI_ATLAS.map((item) => [item.id, item])
);

const hanziAtlasByHanzi: Record<string, HanziAtlasEntry> = Object.fromEntries(
  HANZI_ATLAS.map((item) => [item.hanzi, item])
);

export function getAtlasCharacter(id: string): HanziAtlasEntry | undefined {
  return hanziAtlasById[id];
}

export function getAtlasByHanzi(hanzi: string): HanziAtlasEntry | undefined {
  return hanziAtlasByHanzi[hanzi];
}

export function searchAtlas(query: string): HanziAtlasEntry[] {
  return filterAtlas({ query });
}

export function filterAtlas(options: HanziAtlasFilterOptions = {}): HanziAtlasEntry[] {
  const normalizedQuery = normalizeAtlasSearch(options.query ?? "");
  const frequencyLimit =
    options.maxFreqRank ?? (options.frequency && options.frequency !== "all" ? Number(options.frequency) : undefined);

  return HANZI_ATLAS.filter((entry) => {
    if (normalizedQuery && !atlasEntryMatchesQuery(entry, normalizedQuery)) return false;
    if (frequencyLimit && entry.freqRank > frequencyLimit) return false;
    if (options.tone && options.tone !== "all" && entry.tone !== options.tone) return false;
    if (options.radical && options.radical !== "all" && !(entry.components ?? []).includes(options.radical)) return false;
    if (typeof options.inJourney === "boolean" && entry.inJourney !== options.inJourney) return false;
    if (typeof options.hasLesson === "boolean" && entry.hasLesson !== options.hasLesson) return false;
    if (typeof options.hasDecomposition === "boolean" && entry.hasDecomposition !== options.hasDecomposition) return false;
    if (typeof options.hasPhonetic === "boolean" && Boolean(entry.phonetic) !== options.hasPhonetic) return false;
    if (typeof options.isPremium === "boolean" && entry.isPremium !== options.isPremium) return false;
    if (options.source && entry.source !== options.source) return false;
    return true;
  });
}

export function normalizeAtlasSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function first5000SeedToAtlasEntry(seed: First5000SeedEntry): HanziAtlasEntry {
  const toneless = seed.toneless || normalizeAtlasSearch(seed.pinyin).replace(/[^a-z0-9]+/g, "");

  return withAtlasStatus({
    id: `f5k_${String(seed.freqRank).padStart(4, "0")}_${toneless || "zi"}`,
    hanzi: seed.hanzi,
    pinyin: seed.pinyin,
    toneless,
    tone: seed.tone,
    meaningPt: seed.meaningPt,
    meaningEn: seed.meaningEn,
    freqRank: seed.freqRank,
    components: [],
    source: seed.source,
    inJourney: seed.inJourney,
    hasLesson: seed.hasLesson,
    hasDecomposition: seed.hasDecomposition,
    isPremium: seed.isPremium,
    examples: [],
    lessonIds: [],
  });
}

function characterToAtlasEntry(char: Character): HanziAtlasEntry {
  const lessonIds = LESSONS_BY_CHAR.get(char.id) ?? [];
  const importedSeedEntry = FIRST_5000_SEED_BY_HANZI.get(char.hanzi);
  const atlasFreqRank = importedSeedEntry?.freqRank ?? FIRST_5000_AVAILABLE_COUNT + char.freqRank;

  return withAtlasStatus({
    id: char.id,
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    toneless: char.toneless,
    tone: char.tone,
    meaningPt: char.meaningPt,
    freqRank: atlasFreqRank,
    radical: firstKnownComponent(char.components),
    components: char.components,
    phonetic: char.phonetic,
    strokeCount: STROKE_COUNTS[char.id],
    hskLevel: HSK_LEVELS[char.id],
    source: "journey",
    inJourney: true,
    hasLesson: lessonIds.length > 0,
    hasDecomposition: false,
    isPremium: false,
    examples: examplesForChar(char),
    lessonIds,
    mnemonicPt: char.mnemonicPt,
    sourceCharacter: char,
  });
}

function mergeAtlasEntries(entries: HanziAtlasEntry[]): HanziAtlasEntry[] {
  const byHanzi = new Map<string, HanziAtlasEntry>();

  for (const entry of entries) {
    const current = byHanzi.get(entry.hanzi);
    if (!current) {
      byHanzi.set(entry.hanzi, withAtlasStatus(entry));
      continue;
    }

    const preferred = entry.source === "journey" ? entry : current;
    const fallback = entry.source === "journey" ? current : entry;
    const components = preferred.components?.length ? preferred.components : fallback.components ?? [];
    const lessonIds = uniqueStrings([...(fallback.lessonIds ?? []), ...(preferred.lessonIds ?? [])]);
    const examples = uniqueExamples([...(fallback.examples ?? []), ...(preferred.examples ?? [])]);

    byHanzi.set(
      entry.hanzi,
      withAtlasStatus({
        ...fallback,
        ...preferred,
        id: preferred.id,
        freqRank: Math.min(current.freqRank, entry.freqRank),
        meaningEn: preferred.meaningEn ?? fallback.meaningEn,
        components,
        radical: preferred.radical ?? fallback.radical ?? firstKnownComponent(components),
        phonetic: preferred.phonetic ?? fallback.phonetic,
        strokeCount: preferred.strokeCount ?? fallback.strokeCount,
        hskLevel: preferred.hskLevel ?? fallback.hskLevel,
        source: preferred.source === "journey" || fallback.source === "journey" ? "journey" : preferred.source,
        inJourney: current.inJourney || entry.inJourney,
        hasLesson: lessonIds.length > 0 || current.hasLesson || entry.hasLesson,
        isPremium: current.isPremium || entry.isPremium,
        examples,
        lessonIds,
        mnemonicPt: preferred.mnemonicPt ?? fallback.mnemonicPt,
        sourceCharacter: preferred.sourceCharacter ?? fallback.sourceCharacter,
      })
    );
  }

  return [...byHanzi.values()];
}

function withAtlasStatus(entry: HanziAtlasEntry): HanziAtlasEntry {
  const components = entry.components ?? [];
  const lessonIds = entry.lessonIds ?? [];
  return {
    ...entry,
    components,
    examples: entry.examples ?? [],
    lessonIds,
    radical: entry.radical ?? firstKnownComponent(components),
    inJourney: entry.inJourney || entry.source === "journey" || lessonIds.length > 0,
    hasLesson: entry.hasLesson || lessonIds.length > 0,
    hasDecomposition: entry.hasDecomposition || components.length >= 2 || Boolean(entry.phonetic),
    isPremium: Boolean(entry.isPremium),
  };
}

function firstKnownComponent(components: string[] | undefined): string | undefined {
  return components?.find((componentId) => radicalById[componentId]);
}

function examplesForChar(char: Character): HanziAtlasExample[] {
  const examples = new Map<string, HanziAtlasExample>();
  for (const example of char.exampleWords ?? []) examples.set(example.hanzi, example);
  for (const chunk of CHUNKS) {
    if (chunk.hanzi.includes(char.hanzi)) {
      examples.set(chunk.hanzi, {
        hanzi: chunk.hanzi,
        pinyin: chunk.pinyin,
        pt: chunk.meaningPt,
      });
    }
  }
  return [...examples.values()].slice(0, 6);
}

function buildLessonIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

  function add(charId: string | undefined, lessonId: string) {
    if (!charId) return;
    index.set(charId, uniqueStrings([...(index.get(charId) ?? []), lessonId]));
  }

  function addText(text: string | undefined, lessonId: string) {
    if (!text) return;
    for (const glyph of text) add(charByGlyph.get(glyph)?.id, lessonId);
  }

  function collectStep(step: LessonStep, lessonId: string) {
    if ((step.kind === "recognize" || step.kind === "decompose") && step.charId) add(step.charId, lessonId);
    addText(step.text, lessonId);
    addText(step.hanzi, lessonId);
    addText(step.answer, lessonId);
    addText(step.target?.join(""), lessonId);
    for (const line of step.lines ?? []) addText(line.hanzi, lessonId);
  }

  for (const phase of JOURNEY) {
    for (const unit of phase.units) {
      for (const lesson of unit.lessons) {
        for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
          const [type, id] = ref.split(":");
          if (type === "char") add(id, lesson.id);
        }
        for (const step of lesson.steps) collectStep(step, lesson.id);
      }
    }
  }

  return index;
}

function atlasEntryMatchesQuery(entry: HanziAtlasEntry, query: string): boolean {
  const haystack = normalizeAtlasSearch(
    `${entry.id} ${entry.hanzi} ${entry.pinyin} ${entry.toneless} ${entry.meaningPt} ${entry.meaningEn ?? ""}`
  );
  return haystack.includes(query);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueExamples(values: HanziAtlasExample[]): HanziAtlasExample[] {
  const byKey = new Map<string, HanziAtlasExample>();
  for (const value of values) byKey.set(`${value.hanzi}:${value.pinyin}`, value);
  return [...byKey.values()].slice(0, 8);
}

function assertUniqueAtlasIds(entries: HanziAtlasEntry[]) {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`Duplicate hanzi atlas id: ${entry.id}`);
    seen.add(entry.id);
  }
}
