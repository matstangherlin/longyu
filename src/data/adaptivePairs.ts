import { CHARACTERS } from "./characters";
import { CHUNKS } from "./chunks";
import { ALL_LESSONS, type LessonStep } from "./journey";
import { VOCABULARY } from "./vocabulary";
import type { ItemType } from "./types";

type PairShape = "hanzi_pt" | "pt_hanzi" | "pinyin_hanzi" | "audio_pt" | "hanzi_pinyin";

export type AdaptivePair = NonNullable<LessonStep["pairs"]>[number] & {
  reinforcement?: boolean;
  reviewType?: ItemType;
  reviewItemId?: string;
};

export interface AdaptivePairContext {
  currentLessonId?: string;
  phaseOrder?: number;
  completedLessons?: string[];
  learnedChunks?: string[];
  learnedChars?: string[];
  learnedItems?: { type: ItemType; itemId: string }[];
}

interface PairCandidate {
  key: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  type?: ItemType;
  itemId?: string;
  priority: number;
}

const PRIORITY_CANDIDATE_KEYS = ["chunk:nihao", "chunk:xiexie", "chunk:zaijian", "chunk:bukeqi", "vocab:v_shenme"];
const HANZI_PUNCTUATION_RE = /[，。！？、,.!?\s：；;“”"（）()]/g;
const charIdByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char.id]));

const chunkCandidates: PairCandidate[] = CHUNKS.map((chunk) => ({
  key: `chunk:${chunk.id}`,
  hanzi: cleanHanzi(chunk.hanzi),
  pinyin: chunk.pinyin,
  meaningPt: chunk.meaningPt.replace(/\.$/, ""),
  type: "chunk",
  itemId: chunk.id,
  priority: PRIORITY_CANDIDATE_KEYS.includes(`chunk:${chunk.id}`) ? 0 : 4,
}));

const vocabCandidates: PairCandidate[] = VOCABULARY.map((entry) => ({
  key: `vocab:${entry.id}`,
  hanzi: cleanHanzi(entry.hanzi),
  pinyin: entry.pinyin,
  meaningPt: entry.meaningPt.replace(/\.$/, ""),
  priority: PRIORITY_CANDIDATE_KEYS.includes(`vocab:${entry.id}`) ? 1 : 6,
}));

const charCandidates: PairCandidate[] = CHARACTERS.map((char) => ({
  key: `char:${char.id}`,
  hanzi: char.hanzi,
  pinyin: char.pinyin,
  meaningPt: char.meaningPt,
  type: "char",
  itemId: char.id,
  priority: 5,
}));

const ALL_CANDIDATES = uniqueCandidates([
  ...PRIORITY_CANDIDATE_KEYS
    .map((key) => [...chunkCandidates, ...vocabCandidates].find((candidate) => candidate.key === key))
    .filter((candidate): candidate is PairCandidate => Boolean(candidate)),
  ...chunkCandidates,
  ...vocabCandidates.filter((candidate) => PRIORITY_CANDIDATE_KEYS.includes(candidate.key)),
  ...charCandidates,
]);

export function enrichMatchPairsStep(step: LessonStep, context: AdaptivePairContext): LessonStep {
  if (step.kind !== "match_pairs" || !step.pairs?.length) return step;
  const pairs = expandPairsWithLearned(step.pairs, context);
  return pairs.length === step.pairs.length ? step : { ...step, pairs };
}

export function expandPairsWithLearned(
  basePairs: AdaptivePair[],
  context: AdaptivePairContext,
  limit = pairLimitForPhase(context.phaseOrder)
): AdaptivePair[] {
  const pairs: AdaptivePair[] = uniquePairs(
    basePairs.map((pair): AdaptivePair => ({ ...pair, reinforcement: pair.reinforcement ?? false }))
  );
  const targetCount = Math.max(pairs.length, limit);
  if (pairs.length >= targetCount) return pairs;

  const shape = inferPairShape(pairs);
  const usedLeft = new Set(pairs.map((pair) => normalizePairValue(pair.left)));
  const usedRight = new Set(pairs.map((pair) => normalizePairValue(pair.right)));
  const usedHanzi = new Set(pairs.flatMap((pair) => [cleanHanzi(pair.left), cleanHanzi(pair.right)]).filter(Boolean));
  const candidates = learnedPairCandidates(context)
    .filter((candidate) => !usedHanzi.has(cleanHanzi(candidate.hanzi)))
    .sort((a, b) => a.priority - b.priority || a.hanzi.length - b.hanzi.length);

  for (const candidate of candidates) {
    if (pairs.length >= targetCount) break;
    const pair = pairFromCandidate(candidate, shape);
    const left = normalizePairValue(pair.left);
    const right = normalizePairValue(pair.right);
    if (!left || !right || usedLeft.has(left) || usedRight.has(right)) continue;
    usedLeft.add(left);
    usedRight.add(right);
    usedHanzi.add(cleanHanzi(candidate.hanzi));
    pairs.push(pair);
  }

  return pairs;
}

export function pairLimitForPhase(phaseOrder?: number): number {
  if (!phaseOrder || phaseOrder <= 2) return 3;
  if (phaseOrder <= 5) return 4;
  if (phaseOrder <= 6) return 5;
  return 6;
}

function learnedPairCandidates(context: AdaptivePairContext): PairCandidate[] {
  const learnedChunkIds = new Set([
    ...(context.learnedChunks ?? []),
    ...(context.learnedItems ?? []).filter((item) => item.type === "chunk").map((item) => item.itemId),
  ]);
  const learnedCharIds = new Set([
    ...(context.learnedChars ?? []),
    ...(context.learnedItems ?? []).filter((item) => item.type === "char").map((item) => item.itemId),
  ]);
  const completedLessons = previousCompletedLessons(context);
  const completedRefs = new Set(
    completedLessons.flatMap((lesson) => [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])])
  );
  const completedText = completedLessons.map(lessonSearchText).join(" ");

  return ALL_CANDIDATES.filter((candidate) => {
    if (candidate.type === "chunk" && candidate.itemId) {
      return (
        learnedChunkIds.has(candidate.itemId) ||
        completedRefs.has(`chunk:${candidate.itemId}`) ||
        textContainsHanzi(completedText, candidate.hanzi)
      );
    }
    if (candidate.type === "char" && candidate.itemId) {
      return (
        learnedCharIds.has(candidate.itemId) ||
        completedRefs.has(`char:${candidate.itemId}`) ||
        textContainsHanzi(completedText, candidate.hanzi)
      );
    }
    return textContainsHanzi(completedText, candidate.hanzi) || allCandidateCharsLearned(candidate, learnedCharIds);
  });
}

function previousCompletedLessons(context: AdaptivePairContext) {
  const completed = new Set(context.completedLessons ?? []);
  if (completed.size === 0) return [];
  const currentIndex = context.currentLessonId
    ? ALL_LESSONS.findIndex((lesson) => lesson.id === context.currentLessonId)
    : -1;
  const eligible = currentIndex >= 0 ? ALL_LESSONS.slice(0, currentIndex) : ALL_LESSONS;
  return eligible.filter((lesson) => completed.has(lesson.id));
}

function pairFromCandidate(candidate: PairCandidate, shape: PairShape): AdaptivePair {
  const base = {
    reinforcement: true,
    reviewType: candidate.type,
    reviewItemId: candidate.itemId,
  };

  if (shape === "pinyin_hanzi") {
    return {
      ...base,
      left: candidate.pinyin ?? candidate.hanzi,
      right: candidate.hanzi,
      leftType: "pinyin",
      rightType: "hanzi",
    };
  }

  if (shape === "pt_hanzi") {
    return {
      ...base,
      left: candidate.meaningPt,
      right: candidate.hanzi,
      leftType: "pt",
      rightType: "hanzi",
    };
  }

  if (shape === "audio_pt") {
    return {
      ...base,
      left: candidate.hanzi,
      right: candidate.meaningPt,
      leftType: "audio",
      rightType: "pt",
    };
  }

  if (shape === "hanzi_pinyin") {
    return {
      ...base,
      left: candidate.hanzi,
      right: [candidate.pinyin, candidate.meaningPt].filter(Boolean).join(" · "),
      leftType: "hanzi",
      rightType: "pinyin",
    };
  }

  return {
    ...base,
    left: candidate.hanzi,
    right: candidate.meaningPt,
    leftType: "hanzi",
    rightType: "pt",
  };
}

function inferPairShape(pairs: AdaptivePair[]): PairShape {
  const pair = pairs[0];
  if (!pair) return "hanzi_pt";
  if (pair.leftType === "audio") return "audio_pt";
  if (pair.leftType === "pinyin" && pair.rightType === "hanzi") return "pinyin_hanzi";
  if (pair.leftType === "pt" && pair.rightType === "hanzi") return "pt_hanzi";
  if (pair.rightType === "pinyin") return "hanzi_pinyin";
  return "hanzi_pt";
}

function lessonSearchText(lesson: (typeof ALL_LESSONS)[number]): string {
  const values: string[] = [lesson.title, ...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])];
  for (const step of lesson.steps) {
    values.push(
      step.title ?? "",
      step.body ?? "",
      step.text ?? "",
      step.hanzi ?? "",
      step.answer ?? "",
      step.audioText ?? "",
      step.slowAudioText ?? "",
      step.prompt ?? "",
      step.sourceText ?? "",
      step.correctAnswer ?? "",
      step.blankAnswer ?? "",
      step.sentenceBefore ?? "",
      step.sentenceAfter ?? "",
      step.dialoguePrompt ?? "",
      step.target?.join("") ?? "",
      step.targetParts?.join("") ?? ""
    );
    for (const pair of step.pairs ?? []) values.push(pair.left, pair.right);
    for (const line of step.lines ?? []) values.push(line.hanzi, line.pinyin, line.pt ?? "");
    values.push(...(step.options ?? []), ...(step.bank ?? []), ...(step.wordBank ?? []), ...(step.requiredTerms ?? []));
  }
  return values.join(" ");
}

function uniquePairs<T extends AdaptivePair>(pairs: T[]): T[] {
  const left = new Set<string>();
  const right = new Set<string>();
  const result: T[] = [];
  for (const pair of pairs) {
    const leftKey = normalizePairValue(pair.left);
    const rightKey = normalizePairValue(pair.right);
    if (!leftKey || !rightKey || left.has(leftKey) || right.has(rightKey)) continue;
    left.add(leftKey);
    right.add(rightKey);
    result.push(pair);
  }
  return result;
}

function uniqueCandidates(candidates: PairCandidate[]): PairCandidate[] {
  const seen = new Set<string>();
  const result: PairCandidate[] = [];
  for (const candidate of candidates) {
    const key = cleanHanzi(candidate.hanzi) || candidate.key;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}

function textContainsHanzi(text: string, hanzi: string): boolean {
  const cleanText = cleanHanzi(text);
  const cleanNeedle = cleanHanzi(hanzi);
  return Boolean(cleanNeedle && cleanText.includes(cleanNeedle));
}

function allCandidateCharsLearned(candidate: PairCandidate, learnedCharIds: Set<string>): boolean {
  const chars = [...cleanHanzi(candidate.hanzi)];
  return chars.length > 0 && chars.every((char) => {
    const charId = charIdByHanzi.get(char);
    return Boolean(charId && learnedCharIds.has(charId));
  });
}

function normalizePairValue(value: string): string {
  return cleanHanzi(value).toLocaleLowerCase("pt-BR");
}

function cleanHanzi(value: string): string {
  return value.replace(HANZI_PUNCTUATION_RE, "").trim();
}
