import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { ALL_LESSONS, type FlatLesson } from "./journey";
import { VOCABULARY } from "./vocabulary";
import type { Character, Chunk, VocabEntry, VocabLevel } from "./types";

export type ContentPhaseId =
  | "coreMvp"
  | "phase1"
  | "phase2"
  | "phase3"
  | "expansion"
  | "futureLibrary";

export type PedagogicalContentType = "character" | "word" | "chunk" | "phrase";
export type LearningDomain = "som" | "fala" | "hanzi" | "leitura";
export type PedagogicalContentStatus = "active" | "future" | "hidden" | "experimental";
export type ContentAvailability = "learned" | "available" | "futureLocked" | "hidden";

export interface ContentPhase {
  id: ContentPhaseId;
  label: string;
  order: number;
  releasePolicy: string;
}

export interface ContentExample {
  hanzi: string;
  pinyin: string;
  meaningPt: string;
}

export interface ContentAudioMeta {
  tts: string;
  voiceHint?: "standard_mandarin";
}

export interface ContentSourceMeta {
  phaseId: string;
  phaseTitle: string;
  phaseOrder: number;
  unitId: string;
  unitTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonOrder: number;
}

export interface PedagogicalContentItem {
  id: string;
  ref: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  itemType: PedagogicalContentType;
  frequencyApprox: number;
  recommendedPhase: ContentPhaseId;
  learningDomain: LearningDomain;
  tags: string[];
  components: string[];
  examples: ContentExample[];
  audio: ContentAudioMeta;
  pedagogicalStatus: PedagogicalContentStatus;
  source: "curated" | "journey" | "first5000";
  sourceMeta?: ContentSourceMeta;
}

export interface AtlasContentLike {
  id: string;
  hanzi: string;
  pinyin: string;
  meaningPt: string;
  freqRank: number;
  source: "journey" | "first5000" | "manual";
  inJourney: boolean;
  hasLesson: boolean;
  lessonIds: string[];
  sourceCharacter?: Character;
}

export const CONTENT_PHASES: ContentPhase[] = [
  {
    id: "coreMvp",
    label: "Core MVP",
    order: 0,
    releasePolicy: "Sempre pequeno: primeiros sons, frases e pecas visuais realmente ensinadas.",
  },
  {
    id: "phase1",
    label: "Fase 1",
    order: 1,
    releasePolicy: "Primeiras palavras produtivas depois do nucleo.",
  },
  {
    id: "phase2",
    label: "Fase 2",
    order: 2,
    releasePolicy: "Frases simples, numeros e hanzi com mais contexto.",
  },
  {
    id: "phase3",
    label: "Fase 3",
    order: 3,
    releasePolicy: "Sobrevivencia, leitura guiada e combinacoes mais longas.",
  },
  {
    id: "expansion",
    label: "Expansao",
    order: 4,
    releasePolicy: "Conteudo curado para depois do curso inicial.",
  },
  {
    id: "futureLibrary",
    label: "Biblioteca futura",
    order: 5,
    releasePolicy: "Corpus grande como base de consulta/importacao, bloqueado por padrao.",
  },
];

export const CONTENT_PHASE_ORDER: Record<ContentPhaseId, number> = Object.fromEntries(
  CONTENT_PHASES.map((phase) => [phase.id, phase.order])
) as Record<ContentPhaseId, number>;

const CONTENT_PHASE_BY_ID: Record<ContentPhaseId, ContentPhase> = Object.fromEntries(
  CONTENT_PHASES.map((phase) => [phase.id, phase])
) as Record<ContentPhaseId, ContentPhase>;

const SOURCE_INDEX = buildSourceIndex();
const CHAR_BY_HANZI = new Map(CHARACTERS.map((char) => [char.hanzi, char]));
const CHAR_FREQ_BY_HANZI = new Map(CHARACTERS.map((char) => [char.hanzi, char.freqRank]));

export const CONTENT_CATALOG: PedagogicalContentItem[] = [
  ...CHARACTERS.map(contentItemFromCharacter),
  ...CHUNKS.map(contentItemFromChunk),
  ...VOCABULARY.map(contentItemFromVocabulary),
].sort((a, b) => CONTENT_PHASE_ORDER[a.recommendedPhase] - CONTENT_PHASE_ORDER[b.recommendedPhase] || a.frequencyApprox - b.frequencyApprox);

export const contentByRef: Record<string, PedagogicalContentItem> = Object.fromEntries(
  CONTENT_CATALOG.map((item) => [item.ref, item])
);

export const contentSourceByRef: ReadonlyMap<string, ContentSourceMeta> = SOURCE_INDEX.byRef;

export function phaseById(id: ContentPhaseId): ContentPhase {
  return CONTENT_PHASE_BY_ID[id];
}

export function phaseForVocabLevel(level: VocabLevel | undefined): ContentPhaseId {
  if (level === "seed") return "coreMvp";
  if (level === "beginner") return "phase1";
  if (level === "elementary") return "phase2";
  if (level === "survival") return "phase3";
  if (level === "review") return "expansion";
  return "futureLibrary";
}

export function phaseForJourneyOrder(order: number | undefined): ContentPhaseId {
  if (!order || order <= 1) return "coreMvp";
  if (order === 2) return "phase1";
  if (order <= 4) return "phase2";
  if (order <= 6) return "phase3";
  return "expansion";
}

export function activeContentPhaseForProgress(completedLessons: string[]): ContentPhaseId {
  const completed = new Set(completedLessons);
  const nextLesson = ALL_LESSONS.find((lesson) => !completed.has(lesson.id));
  if (nextLesson) return phaseForJourneyOrder(nextLesson.phaseOrder);

  const lastOrder = Math.max(0, ...ALL_LESSONS.map((lesson) => lesson.phaseOrder));
  return phaseForJourneyOrder(lastOrder);
}

export function refsLearnedFromState(input: {
  learnedChars?: string[];
  learnedChunks?: string[];
  srsItemRefs?: string[];
}): Set<string> {
  return new Set([
    ...(input.learnedChars ?? []).map((id) => `char:${id}`),
    ...(input.learnedChunks ?? []).map((id) => `chunk:${id}`),
    ...(input.srsItemRefs ?? []),
  ]);
}

export function contentAvailability(
  item: PedagogicalContentItem,
  completedLessons: string[],
  learnedRefs: ReadonlySet<string> = new Set()
): ContentAvailability {
  if (learnedRefs.has(item.ref)) return "learned";
  if (item.pedagogicalStatus === "hidden") return "hidden";
  if (item.pedagogicalStatus === "future" || item.pedagogicalStatus === "experimental") return "futureLocked";

  const currentPhase = activeContentPhaseForProgress(completedLessons);
  return CONTENT_PHASE_ORDER[item.recommendedPhase] <= CONTENT_PHASE_ORDER[currentPhase]
    ? "available"
    : "futureLocked";
}

export function contentRefForAtlasItem(item: AtlasContentLike): string | undefined {
  if (item.sourceCharacter?.id) return `char:${item.sourceCharacter.id}`;
  const character = CHAR_BY_HANZI.get(item.hanzi);
  return character ? `char:${character.id}` : undefined;
}

export function atlasContentAvailability(
  item: AtlasContentLike,
  completedLessons: string[],
  learnedCharIds: ReadonlySet<string>
): ContentAvailability {
  const catalogRef = contentRefForAtlasItem(item);
  const learned = learnedCharIds.has(item.id) || Boolean(item.sourceCharacter?.id && learnedCharIds.has(item.sourceCharacter.id));
  if (learned) return "learned";

  if (catalogRef) {
    const catalogItem = contentByRef[catalogRef];
    if (!catalogItem) return "futureLocked";
    return contentAvailability(catalogItem, completedLessons, new Set());
  }

  if (item.source === "first5000" || !item.hasLesson) return "futureLocked";
  return item.inJourney ? "available" : "futureLocked";
}

export function canPromoteAtlasItemToReview(
  item: AtlasContentLike,
  completedLessons: string[],
  learnedCharIds: ReadonlySet<string>
): boolean {
  return atlasContentAvailability(item, completedLessons, learnedCharIds) === "learned";
}

export function canAppearBeforePhase(item: PedagogicalContentItem, phase: ContentPhaseId): boolean {
  return CONTENT_PHASE_ORDER[item.recommendedPhase] <= CONTENT_PHASE_ORDER[phase];
}

function contentItemFromCharacter(char: Character): PedagogicalContentItem {
  const ref = `char:${char.id}`;
  const sourceMeta = SOURCE_INDEX.byRef.get(ref);
  const recommendedPhase = sourceMeta ? phaseForJourneyOrder(sourceMeta.phaseOrder) : phaseFromFrequency(char.freqRank);
  return {
    id: `content_char_${char.id}`,
    ref,
    hanzi: char.hanzi,
    pinyin: char.pinyin,
    meaningPt: char.meaningPt,
    itemType: "character",
    frequencyApprox: char.freqRank,
    recommendedPhase,
    learningDomain: "hanzi",
    tags: unique(["hanzi", `tom_${char.tone}`, ...char.components]),
    components: char.components,
    examples: (char.exampleWords ?? []).map((example) => ({
      hanzi: example.hanzi,
      pinyin: example.pinyin,
      meaningPt: example.pt,
    })),
    audio: { tts: char.hanzi, voiceHint: "standard_mandarin" },
    pedagogicalStatus: statusForPhase(recommendedPhase),
    source: sourceMeta ? "journey" : "curated",
    sourceMeta,
  };
}

function contentItemFromChunk(chunk: Chunk): PedagogicalContentItem {
  const ref = `chunk:${chunk.id}`;
  const sourceMeta = SOURCE_INDEX.byRef.get(ref);
  const recommendedPhase = sourceMeta ? phaseForJourneyOrder(sourceMeta.phaseOrder) : phaseForVocabLevel(chunk.level);
  return {
    id: `content_chunk_${chunk.id}`,
    ref,
    hanzi: chunk.hanzi,
    pinyin: chunk.pinyin,
    meaningPt: chunk.meaningPt,
    itemType: chunkRole(chunk),
    frequencyApprox: frequencyForText(chunk.hanzi),
    recommendedPhase,
    learningDomain: "fala",
    tags: unique([...(chunk.tags ?? []), chunk.domain ?? "fala", chunk.level ?? "sem_nivel"]),
    components: [],
    examples: chunk.literalPt
      ? [{ hanzi: chunk.hanzi, pinyin: chunk.pinyin, meaningPt: chunk.literalPt }]
      : [],
    audio: { tts: chunk.hanzi, voiceHint: "standard_mandarin" },
    pedagogicalStatus: statusForPhase(recommendedPhase),
    source: sourceMeta ? "journey" : "curated",
    sourceMeta,
  };
}

function contentItemFromVocabulary(entry: VocabEntry): PedagogicalContentItem {
  const ref = `vocab:${entry.id}`;
  const recommendedPhase = phaseForVocabLevel(entry.level);
  const source = entry.source === "first5000" ? "first5000" : "curated";
  return {
    id: `content_vocab_${entry.id}`,
    ref,
    hanzi: entry.hanzi,
    pinyin: entry.pinyin,
    meaningPt: entry.meaningPt,
    itemType: entry.kind === "phrase" ? "phrase" : "word",
    frequencyApprox: frequencyForText(entry.hanzi),
    recommendedPhase,
    learningDomain: learningDomainForVocab(entry),
    tags: unique([entry.domain, entry.level, entry.kind]),
    components: [],
    examples: entry.literalPt
      ? [{ hanzi: entry.hanzi, pinyin: entry.pinyin, meaningPt: entry.literalPt }]
      : [],
    audio: { tts: entry.hanzi, voiceHint: "standard_mandarin" },
    pedagogicalStatus: source === "first5000" ? "future" : statusForPhase(recommendedPhase),
    source,
  };
}

function buildSourceIndex(): { byRef: Map<string, ContentSourceMeta> } {
  const byRef = new Map<string, ContentSourceMeta>();
  let lessonOrder = 0;

  for (const lesson of ALL_LESSONS) {
    const source = sourceMetaForLesson(lesson, lessonOrder);
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
      if (!byRef.has(ref)) byRef.set(ref, source);
    }
    lessonOrder += 1;
  }

  return { byRef };
}

function sourceMetaForLesson(lesson: FlatLesson, lessonOrder: number): ContentSourceMeta {
  return {
    phaseId: lesson.phaseId,
    phaseTitle: lesson.phaseTitle,
    phaseOrder: lesson.phaseOrder,
    unitId: lesson.unitId,
    unitTitle: lesson.unitTitle,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonOrder,
  };
}

function phaseFromFrequency(freqRank: number): ContentPhaseId {
  if (freqRank <= 80) return "coreMvp";
  if (freqRank <= 300) return "phase1";
  if (freqRank <= 900) return "phase2";
  if (freqRank <= 1800) return "phase3";
  return "expansion";
}

function statusForPhase(phase: ContentPhaseId): PedagogicalContentStatus {
  if (phase === "futureLibrary") return "future";
  return "active";
}

function chunkRole(chunk: Chunk): PedagogicalContentType {
  const cleanLength = normalizeHanzi(chunk.hanzi).length;
  if (chunk.tags.includes("palavras") || cleanLength <= 2) return "word";
  if (/[？！?。!]/u.test(chunk.hanzi) || cleanLength >= 4) return "phrase";
  return "chunk";
}

function learningDomainForVocab(entry: VocabEntry): LearningDomain {
  if (entry.domain === "hanzi_basico") return "hanzi";
  if (entry.kind === "phrase") return "fala";
  return "leitura";
}

function frequencyForText(text: string): number {
  const ranks = [...normalizeHanzi(text)]
    .map((glyph) => CHAR_FREQ_BY_HANZI.get(glyph))
    .filter((rank): rank is number => typeof rank === "number");
  if (ranks.length === 0) return 9999;
  return Math.min(...ranks);
}

function normalizeHanzi(text: string): string {
  return text.replace(/[^\p{Script=Han}]/gu, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
