import type { Lesson, LessonStageId, LessonStep, StepKind } from "../data/journey";
import { FOUNDATION_LESSON_IDS } from "../data/journey";
import { CHARACTERS } from "../data/characters";
import { CHUNKS } from "../data/chunks";
import { CONVERSATION_SCENES } from "../data/conversationScenes";
import type { ItemType } from "../data/types";
import { VISUAL_CONCEPTS, isVisualConceptAllowed } from "../data/visualVocabulary";
import { normalizePinyinBase } from "./pinyin";
import { unitOrderIndex } from "./moduleReview";

// ————————————————————————————————————————————————————————————————
// Motor de novidade pedagógica: composição, repetição e progressão.
// ————————————————————————————————————————————————————————————————

export interface FocusItem {
  key: string;
  hanzi: string;
  pinyin?: string;
  meaningPt: string;
  type?: ItemType;
  itemId?: string;
  pool?: "new" | "prior" | "weak" | "error" | "current";
}

export interface LessonNoveltyProfile {
  newItems: FocusItem[];
  priorItems: FocusItem[];
  weakItems: FocusItem[];
  conversationItems: FocusItem[];
  visualItems: FocusItem[];
  phraseItems: FocusItem[];
}

export type NoveltyBucket =
  | "newContent"
  | "newPractice"
  | "priorContext"
  | "correction"
  | "moduleCurrent"
  | "modulePrior"
  | "moduleWeak";

export type ExposureLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const COMMON_LESSON_RATIOS: Record<Exclude<NoveltyBucket, "moduleCurrent" | "modulePrior" | "moduleWeak">, number> = {
  newContent: 0.4,
  newPractice: 0.3,
  priorContext: 0.2,
  correction: 0.1,
};

export const REVIEW_LESSON_RATIOS: Record<"moduleCurrent" | "modulePrior" | "moduleWeak", number> = {
  moduleCurrent: 0.5,
  modulePrior: 0.25,
  moduleWeak: 0.25,
};

export type ExerciseFamily =
  | "intro"
  | "recognition"
  | "meaning"
  | "audio"
  | "matching"
  | "assembly"
  | "usage"
  | "review"
  | "consolidation"
  | "hanzi"
  | "pinyin"
  | "reading";

const FAMILY_BY_KIND: Record<StepKind, ExerciseFamily[]> = {
  intro: ["intro"],
  listen: ["intro", "audio"],
  tone: ["pinyin", "audio", "recognition"],
  comprehend: ["recognition", "meaning"],
  produce: ["assembly", "usage"],
  write: ["usage"],
  recognize: ["recognition", "hanzi", "meaning"],
  decompose: ["intro", "hanzi"],
  flashcard: ["intro", "meaning"],
  microread: ["reading", "usage"],
  match_pairs: ["matching", "recognition", "review"],
  listen_select: ["audio", "recognition"],
  sentence_build: ["assembly"],
  translation_build: ["assembly"],
  fill_blank: ["assembly", "usage"],
  dialogue_choice: ["usage", "recognition"],
  conversation_scene: ["usage", "recognition", "review"],
  hanzi_evolution: ["intro", "hanzi"],
  hanzi_build: ["hanzi", "assembly"],
  tone_pair: ["pinyin", "audio", "matching"],
  image_choice: ["recognition", "hanzi", "meaning", "audio"],
};

export const EXPOSURE_STEP_PREFERENCES: Record<ExposureLevel, StepKind[]> = {
  1: ["intro", "listen", "flashcard", "hanzi_evolution"],
  2: ["comprehend", "recognize", "listen_select", "image_choice", "decompose"],
  3: ["dialogue_choice", "comprehend", "match_pairs"],
  4: ["sentence_build", "translation_build", "produce", "fill_blank", "hanzi_build"],
  5: ["conversation_scene", "dialogue_choice", "microread"],
  6: ["listen_select", "listen", "tone"],
  7: ["image_choice", "match_pairs", "microread", "conversation_scene"],
};

const PHRASE_RECIPES: { hanzi: string; refs: string[]; pinyin?: string; meaningPt?: string }[] = [
  { hanzi: "你好吗？", refs: ["chunk:nihao", "char:ma_question"], pinyin: "nǐ hǎo ma?", meaningPt: "Tudo bem?" },
  { hanzi: "我很好。", refs: ["chunk:wohenhao"], pinyin: "wǒ hěn hǎo", meaningPt: "Estou bem." },
  { hanzi: "谢谢你。", refs: ["chunk:xiexie"], pinyin: "xièxie nǐ", meaningPt: "Obrigado(a)." },
  { hanzi: "你好，我叫...", refs: ["chunk:nihao", "chunk:wojiao"], pinyin: "nǐ hǎo, wǒ jiào...", meaningPt: "Olá, meu nome é..." },
  { hanzi: "再见。", refs: ["chunk:zaijian"], pinyin: "zàijiàn", meaningPt: "Até logo." },
  { hanzi: "不客气。", refs: ["chunk:bukeqi", "chunk:xiexie"], pinyin: "bú kèqi", meaningPt: "De nada." },
];

const HANZI_PUNCTUATION_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;
const PINYIN_TONE_LABEL_RE = /\b[1-5]\s*º?\s*(?:tom|tone)s?\b|\btom\s*[1-5]\b|neutro/i;

const NEW_CONTENT_KINDS = new Set<StepKind>([
  "intro",
  "listen",
  "flashcard",
  "hanzi_evolution",
  "recognize",
  "decompose",
  "tone",
]);
const NEW_PRACTICE_KINDS = new Set<StepKind>([
  "comprehend",
  "produce",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "hanzi_build",
  "write",
]);
const PRIOR_CONTEXT_KINDS = new Set<StepKind>([
  "dialogue_choice",
  "conversation_scene",
  "microread",
  "produce",
  "fill_blank",
]);
const CORRECTION_KINDS = new Set<StepKind>(["match_pairs", "tone_pair", "comprehend", "listen_select"]);

export interface BuildNoveltyProfileInput {
  lesson: Lesson;
  focus: FocusItem[];
  reviewFocus: FocusItem[];
  errorFocus?: FocusItem[];
  completedLessons?: string[];
  learnedRefs?: Set<string>;
  unitId?: string;
}

export interface NoveltySequenceContext {
  lesson: Lesson;
  profile: LessonNoveltyProfile;
  selected: readonly { step: LessonStep; families: ExerciseFamily[] }[];
  candidate: { step: LessonStep; families: ExerciseFamily[] };
}

export interface NoveltyAuditInput {
  lesson: Lesson;
  plan: readonly (LessonStep & { lessonStageId?: LessonStageId })[];
  profile: LessonNoveltyProfile;
  reviewFocus?: FocusItem[];
}

function cleanHanzi(value: string | undefined): string {
  return (value ?? "").replace(HANZI_PUNCTUATION_RE, "").trim();
}

function normalizeAnswer(value: string | undefined): string {
  return cleanHanzi(value).toLocaleLowerCase("pt-BR");
}

function uniqueByKey(items: FocusItem[]): FocusItem[] {
  const seen = new Set<string>();
  const result: FocusItem[] = [];
  for (const item of items) {
    if (!item.key || seen.has(item.key)) continue;
    seen.add(item.key);
    result.push(item);
  }
  return result;
}

function learnedRefSet(input: BuildNoveltyProfileInput): Set<string> {
  const refs = new Set(input.learnedRefs ?? []);
  for (const ref of [...(input.lesson.libraryItems ?? []), ...(input.lesson.reviewItems ?? [])]) {
    refs.add(ref);
  }
  return refs;
}

function phraseItemsFromRefs(refs: Set<string>): FocusItem[] {
  const items: FocusItem[] = [];
  for (const recipe of PHRASE_RECIPES) {
    if (!recipe.refs.every((ref) => refs.has(ref))) continue;
    const chunk = CHUNKS.find((entry) => cleanHanzi(entry.hanzi) === cleanHanzi(recipe.hanzi));
    items.push({
      key: chunk ? `chunk:${chunk.id}` : `text:${cleanHanzi(recipe.hanzi)}`,
      hanzi: recipe.hanzi,
      pinyin: recipe.pinyin ?? chunk?.pinyin,
      meaningPt: recipe.meaningPt ?? chunk?.meaningPt.replace(/\.$/, "") ?? recipe.hanzi,
      type: chunk ? "chunk" : undefined,
      itemId: chunk?.id,
    });
  }
  return uniqueByKey(items);
}

function conversationItemsFromRefs(refs: Set<string>, focus: FocusItem[]): FocusItem[] {
  const focusKeys = new Set(focus.map((item) => item.key));
  const items: FocusItem[] = [];
  for (const scene of CONVERSATION_SCENES) {
    const needed = [...scene.learnedRefs, ...(scene.newRefs ?? [])];
    if (!needed.every((ref) => refs.has(ref))) continue;
    if (!scene.learnedRefs.some((ref) => focusKeys.has(ref) || refs.has(ref))) continue;
    const chunk = CHUNKS.find((entry) => cleanHanzi(entry.hanzi) === cleanHanzi(scene.lines[0]?.hanzi ?? ""));
    items.push({
      key: `scene:${scene.sceneId}`,
      hanzi: scene.lines.map((line) => line.hanzi).join(" / "),
      pinyin: scene.lines[0]?.pinyin,
      meaningPt: scene.title,
      type: chunk ? "chunk" : undefined,
      itemId: chunk?.id,
    });
  }
  return uniqueByKey(items);
}

function visualItemsFromFocus(focus: FocusItem[], unitId?: string): FocusItem[] {
  const unitIndex = unitId ? unitOrderIndex(unitId) : 0;
  const items: FocusItem[] = [];
  for (const concept of VISUAL_CONCEPTS) {
    if (!isVisualConceptAllowed(concept.id, unitIndex)) continue;
    const focusHit = focus.some((item) => item.itemId === concept.charId || cleanHanzi(item.hanzi) === concept.hanzi);
    if (!focusHit && unitIndex < concept.afterUnitIndex) continue;
    items.push({
      key: `visual:${concept.id}`,
      hanzi: concept.hanzi,
      pinyin: concept.pinyin,
      meaningPt: concept.meaningPt,
      type: "char",
      itemId: concept.charId,
    });
  }
  return uniqueByKey(items);
}

export function buildLessonNoveltyProfile(input: BuildNoveltyProfileInput): LessonNoveltyProfile {
  const learned = learnedRefSet(input);

  if (input.lesson.isReview) {
    const reviewPool = input.reviewFocus;
    const currentItems = uniqueByKey(
      reviewPool.filter((item) => item.pool === "current").length > 0
        ? reviewPool.filter((item) => item.pool === "current")
        : input.focus
    );
    const priorItems = uniqueByKey(
      reviewPool
        .filter((item) => item.pool === "prior")
        .map((item) => ({ ...item, pool: "prior" as const }))
    );
    const weakItems = uniqueByKey(
      [
        ...reviewPool.filter((item) => item.pool === "weak" || item.pool === "error"),
        ...(input.errorFocus ?? []),
      ].map((item) => ({ ...item, pool: "weak" as const }))
    );
    const availableRefs = new Set<string>([...learned, ...currentItems.map((item) => item.key)]);
    for (const item of priorItems) if (item.key) availableRefs.add(item.key);

    return {
      newItems: currentItems,
      priorItems,
      weakItems,
      conversationItems: conversationItemsFromRefs(availableRefs, input.focus),
      visualItems: visualItemsFromFocus([...input.focus, ...priorItems], input.unitId),
      phraseItems: phraseItemsFromRefs(availableRefs),
    };
  }

  const newItems = uniqueByKey(
    input.focus.filter((item) => {
      if (!item.key) return true;
      return !learned.has(item.key) || input.lesson.libraryItems?.includes(item.key);
    })
  );
  const newKeys = new Set(newItems.map((item) => item.key));
  const priorItems = uniqueByKey(
    input.reviewFocus
      .filter((item) => !newKeys.has(item.key))
      .map((item) => ({ ...item, pool: "prior" as const }))
  );
  const modulePriorItems =
    input.lesson.isReview && input.reviewFocus.length > 0
      ? uniqueByKey(
          input.reviewFocus
            .filter((item) => !input.focus.some((focusItem) => focusItem.key === item.key))
            .map((item) => ({ ...item, pool: "prior" as const }))
        )
      : priorItems;
  const weakItems = uniqueByKey(
    (input.errorFocus ?? []).map((item) => ({ ...item, pool: "weak" as const }))
  );

  const availableRefs = new Set<string>([...learned, ...newItems.map((item) => item.key)]);
  for (const item of priorItems) if (item.key) availableRefs.add(item.key);

  return {
    newItems,
    priorItems: modulePriorItems,
    weakItems,
    conversationItems: conversationItemsFromRefs(availableRefs, input.focus),
    visualItems: visualItemsFromFocus([...input.focus, ...priorItems], input.unitId),
    phraseItems: phraseItemsFromRefs(availableRefs),
  };
}

export function exerciseFamiliesForStep(step: LessonStep, stageId?: LessonStageId): ExerciseFamily[] {
  const families = new Set<ExerciseFamily>(FAMILY_BY_KIND[step.kind] ?? []);
  if (isPinyinPracticeStep(step)) families.add("pinyin");
  if (stageId === "consolidation") families.add("consolidation");
  return [...families];
}

export function isPinyinPracticeStep(step: LessonStep): boolean {
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""}`.toLocaleLowerCase("pt-BR");
  return step.kind === "tone" || step.kind === "tone_pair" || label.includes("pinyin") || label.includes("tom");
}

function stepTextBlob(step: LessonStep): string {
  return [
    step.title,
    step.body,
    step.text,
    step.hanzi,
    step.answer,
    step.audioText,
    step.prompt,
    step.sourceText,
    step.correctAnswer,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    step.dialoguePrompt,
    step.sceneId,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
    ...(step.lines ?? []).flatMap((line) => [line.hanzi, line.pinyin, line.pt]),
    step.checkpoint?.prompt,
    step.checkpoint?.correctAnswer,
    ...(step.checkpoint?.options ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function stepAnswer(step: LessonStep): string {
  return (
    step.correctAnswer ??
    step.checkpoint?.correctAnswer ??
    step.answer ??
    step.blankAnswer ??
    step.targetParts?.join("") ??
    step.target?.join("") ??
    ""
  );
}

function pairSignature(step: LessonStep): string {
  return [...(step.pairs ?? [])]
    .map((pair) => `${cleanHanzi(pair.left)}=${cleanHanzi(pair.right)}`)
    .sort()
    .join("|");
}

function contextSignature(step: LessonStep): string {
  if (step.kind === "conversation_scene") return `scene:${step.sceneId ?? step.title}`;
  if (step.kind === "dialogue_choice") return `dialogue:${step.dialoguePrompt ?? step.prompt ?? step.speaker}`;
  if (step.kind === "fill_blank") {
    return `fill:${step.sentenceBefore ?? ""}__${step.sentenceAfter ?? ""}`;
  }
  if (step.kind === "microread") return `read:${(step.lines ?? []).map((line) => line.hanzi).join("/")}`;
  if (step.kind === "image_choice") return `image:${step.imageId ?? step.iconId}:${step.imageChoiceMode}`;
  return `kind:${step.kind}:${step.title ?? ""}`;
}

function primaryHanziKeys(step: LessonStep): string[] {
  const blob = cleanHanzi(stepTextBlob(step));
  const keys = new Set<string>();
  for (const chunk of CHUNKS) {
    const hanzi = cleanHanzi(chunk.hanzi);
    if (hanzi && blob.includes(hanzi)) keys.add(`chunk:${chunk.id}`);
  }
  for (const char of CHARACTERS) {
    if (blob.includes(char.hanzi)) keys.add(`char:${char.id}`);
  }
  if (keys.size === 0 && blob) keys.add(`text:${blob.slice(0, 12)}`);
  return [...keys];
}

function familiesOverlap(a: ExerciseFamily[], b: ExerciseFamily[]): boolean {
  return a.some((family) => b.includes(family));
}

export function isPedagogicallyTooSimilar(
  stepA: LessonStep,
  stepB: LessonStep,
  familiesA: ExerciseFamily[] = exerciseFamiliesForStep(stepA),
  familiesB: ExerciseFamily[] = exerciseFamiliesForStep(stepB)
): boolean {
  const answerA = normalizeAnswer(stepAnswer(stepA));
  const answerB = normalizeAnswer(stepAnswer(stepB));
  if (answerA && answerB && answerA === answerB) return true;

  const targetA = cleanHanzi(stepAnswer(stepA));
  const targetB = cleanHanzi(stepAnswer(stepB));
  if (targetA && targetB && targetA === targetB && stepA.kind !== "intro" && stepB.kind !== "intro") return true;

  if (
    stepA.kind === stepB.kind &&
    stepA.kind !== "intro" &&
    targetA &&
    targetB &&
    targetA === targetB
  ) {
    return true;
  }

  if (familiesOverlap(familiesA, familiesB) && targetA && targetB && targetA === targetB) return true;

  const hanziA = cleanHanzi(stepA.hanzi ?? stepA.sourceText ?? stepA.audioText ?? stepAnswer(stepA));
  const hanziB = cleanHanzi(stepB.hanzi ?? stepB.sourceText ?? stepB.audioText ?? stepAnswer(stepB));
  if (
    hanziA &&
    hanziB &&
    hanziA === hanziB &&
    contextSignature(stepA) === contextSignature(stepB)
  ) {
    return true;
  }

  if (stepA.kind === "match_pairs" && stepB.kind === "match_pairs") {
    const pairsA = pairSignature(stepA);
    const pairsB = pairSignature(stepB);
    if (pairsA && pairsB && pairsA === pairsB) return true;
  }

  if (isPinyinPracticeStep(stepA) && isPinyinPracticeStep(stepB)) {
    const baseA = normalizePinyinBase(stepAnswer(stepA).replace(PINYIN_TONE_LABEL_RE, "").trim());
    const baseB = normalizePinyinBase(stepAnswer(stepB).replace(PINYIN_TONE_LABEL_RE, "").trim());
    if (baseA && baseB && baseA === baseB) return true;
  }

  const keysA = primaryHanziKeys(stepA);
  const keysB = primaryHanziKeys(stepB);
  if (
    keysA.length > 0 &&
    keysB.length > 0 &&
    keysA.join("|") === keysB.join("|") &&
    contextSignature(stepA) === contextSignature(stepB) &&
    stepA.kind === stepB.kind
  ) {
    return true;
  }

  return false;
}

export function exposureLevelForItem(
  item: FocusItem,
  exposureCounts: ReadonlyMap<string, number>
): ExposureLevel {
  const count = exposureCounts.get(item.key) ?? 0;
  if (count <= 0) return 1;
  if (count === 1) return 2;
  if (count === 2) return 3;
  if (count === 3) return 4;
  if (count === 4) return 5;
  if (count === 5) return 6;
  return 7;
}

export function buildExposureCounts(completedLessonIds: string[], lessonsById: Map<string, Lesson>): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (key: string | undefined) => {
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (const lessonId of completedLessonIds) {
    const lesson = lessonsById.get(lessonId);
    if (!lesson) continue;
    for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) bump(ref);
    for (const step of lesson.steps) {
      for (const key of primaryHanziKeys(step)) bump(key);
      if (step.chunkId) bump(`chunk:${step.chunkId}`);
      if (step.charId) bump(`char:${step.charId}`);
    }
  }
  return counts;
}

function stepUsesAny(step: LessonStep, items: readonly FocusItem[]): boolean {
  if (items.length === 0) return false;
  const blob = cleanHanzi(stepTextBlob(step));
  return items.some((item) => {
    const hanzi = cleanHanzi(item.hanzi);
    return Boolean(hanzi && blob.includes(hanzi));
  });
}

function stepUsesOnlyNew(step: LessonStep, profile: LessonNoveltyProfile): boolean {
  return stepUsesAny(step, profile.newItems) && !stepUsesAny(step, profile.priorItems);
}

export function classifyStepBucket(
  step: LessonStep & { lessonStageId?: LessonStageId },
  lesson: Lesson,
  profile: LessonNoveltyProfile
): NoveltyBucket {
  if (lesson.isReview) {
    if (stepUsesAny(step, profile.weakItems)) return "moduleWeak";
    if (stepUsesAny(step, profile.priorItems)) return "modulePrior";
    return "moduleCurrent";
  }

  const stageId = step.lessonStageId;
  if (stageId === "intro") return "newContent";
  if (stageId === "recognition") {
    return stepUsesAny(step, profile.newItems) ? "newContent" : "correction";
  }
  if (stageId === "assembly") return "newPractice";
  if (stageId === "usage") {
    return stepUsesAny(step, profile.priorItems) ? "priorContext" : "newPractice";
  }
  if (stageId === "consolidation") {
    if (stepUsesAny(step, profile.weakItems) || CORRECTION_KINDS.has(step.kind)) return "correction";
    return stepUsesAny(step, profile.priorItems) ? "priorContext" : "correction";
  }

  if (CORRECTION_KINDS.has(step.kind) && stepUsesAny(step, [...profile.weakItems, ...profile.priorItems])) {
    return "correction";
  }
  if (PRIOR_CONTEXT_KINDS.has(step.kind) && stepUsesAny(step, profile.priorItems)) return "priorContext";
  if (NEW_CONTENT_KINDS.has(step.kind) && stepUsesOnlyNew(step, profile)) return "newContent";
  if (NEW_PRACTICE_KINDS.has(step.kind) && stepUsesAny(step, profile.newItems)) return "newPractice";
  if (stepUsesAny(step, profile.priorItems)) return "priorContext";
  if (stepUsesAny(step, profile.newItems)) return "newPractice";
  if (CORRECTION_KINDS.has(step.kind)) return "correction";
  return "newContent";
}

function primaryFamilyForStep(step: LessonStep & { lessonStageId?: LessonStageId }): ExerciseFamily {
  return exerciseFamiliesForStep(step, step.lessonStageId)[0] ?? "recognition";
}

export { primaryFamilyForStep };

function bucketTargets(lesson: Lesson): Record<string, number> {
  if (lesson.isReview) return { ...REVIEW_LESSON_RATIOS };
  return { ...COMMON_LESSON_RATIOS };
}

export function noveltyScoreAdjustment(ctx: NoveltySequenceContext): number {
  const { lesson, profile, selected, candidate } = ctx;
  const bucket = classifyStepBucket(candidate.step, lesson, profile);
  const targets = bucketTargets(lesson);
  const total = Math.max(selected.length + 1, 1);
  const bucketCounts = new Map<string, number>();
  for (const item of selected) {
    const key = classifyStepBucket(item.step, lesson, profile);
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
  }
  const currentShare = (bucketCounts.get(bucket) ?? 0) / total;
  const targetShare = targets[bucket as keyof typeof targets] ?? 0.15;
  let adjustment = 0;
  if (currentShare < targetShare) adjustment += 10;
  if (currentShare > targetShare + 0.12) adjustment -= 14;

  for (const prior of selected.slice(-3)) {
    if (isPedagogicallyTooSimilar(prior.step, candidate.step, prior.families, candidate.families)) {
      adjustment -= 20;
    }
  }

  const primary = profile.newItems[0] ?? profile.priorItems[0];
  if (primary) {
    const exposureCounts = new Map<string, number>();
    for (const item of selected) {
      for (const key of primaryHanziKeys(item.step)) {
        exposureCounts.set(key, (exposureCounts.get(key) ?? 0) + 1);
      }
    }
    const level = exposureLevelForItem(primary, exposureCounts);
    if (EXPOSURE_STEP_PREFERENCES[level].includes(candidate.step.kind)) adjustment += 6;
  }

  if (candidate.step.kind === "conversation_scene") adjustment += 4;
  if (candidate.step.kind === "image_choice" && profile.visualItems.length > 0) adjustment += 3;

  return adjustment;
}

export function wouldBlockSequenceAddition(ctx: NoveltySequenceContext): boolean {
  const { lesson, selected, candidate } = ctx;
  const lastTwo = selected.slice(-2);
  if (lastTwo.length >= 2) {
    if (lastTwo.every((item) => item.step.kind === candidate.step.kind)) return true;
    const primary = primaryFamilyForStep(candidate.step);
    if (lastTwo.every((item) => primaryFamilyForStep(item.step) === primary)) return true;
    if (candidate.families.some((family) => lastTwo.every((item) => item.families.includes(family)))) return true;
  }

  const answer = normalizeAnswer(stepAnswer(candidate.step));
  if (answer) {
    const sameAnswerCount =
      selected.filter((item) => normalizeAnswer(stepAnswer(item.step)) === answer).length + 1;
    if (sameAnswerCount > 3) return true;
  }

  const primaryKeys = primaryHanziKeys(candidate.step);
  if (primaryKeys.length > 0) {
    const sameHanziCount =
      selected.filter((item) => {
        const keys = primaryHanziKeys(item.step);
        return keys.join("|") === primaryKeys.join("|") && contextSignature(item.step) === contextSignature(candidate.step);
      }).length + 1;
    if (sameHanziCount > 3) return true;
  }

  if (isPinyinPracticeStep(candidate.step) && !isPinyinFocusedLesson(lesson)) {
    const pinyinCount = selected.filter((item) => isPinyinPracticeStep(item.step)).length;
    if (pinyinCount >= 1) return true;
  }

  for (const prior of selected.slice(-2)) {
    if (isPedagogicallyTooSimilar(prior.step, candidate.step, prior.families, candidate.families)) return true;
  }

  return false;
}

function isPinyinFocusedLesson(lesson: Lesson): boolean {
  const id = lesson.id.toLocaleLowerCase("pt-BR");
  return lesson.skill === "som" || id.includes("tons-") || id.includes("pinyin") || id.includes("tom");
}

function hasContextualReuse(step: LessonStep): boolean {
  return (
    step.kind === "conversation_scene" ||
    step.kind === "microread" ||
    (step.kind === "dialogue_choice" && Boolean(step.dialoguePrompt?.trim())) ||
    (step.kind === "fill_blank" && Boolean(step.sentenceBefore || step.sentenceAfter))
  );
}

export function auditLessonNovelty(input: NoveltyAuditInput): string[] {
  const { lesson, plan, profile, reviewFocus = [] } = input;
  const issues: string[] = [];
  if (plan.length === 0) return ["plano vazio"];

  const familiesSeen = new Set<ExerciseFamily>();
  for (const step of plan) {
    for (const family of exerciseFamiliesForStep(step, step.lessonStageId)) familiesSeen.add(family);
  }
  if (familiesSeen.size < 3) issues.push("menos de 3 famílias de exercício");

  if (!lesson.isReview && profile.newItems.length > 0) {
    const usesNew = plan.some((step) => stepUsesAny(step, profile.newItems));
    if (!usesNew) issues.push("nenhum item novo aparece no plano");
  }

  if (lesson.isReview && profile.priorItems.length > 0) {
    const usesPrior = plan.some((step) => stepUsesAny(step, profile.priorItems));
    if (!usesPrior) issues.push("revisão sem conteúdo antigo");
  }

  const usesContext = plan.some((step) => hasContextualReuse(step));
  if (!usesContext && plan.length >= 4) issues.push("sem uso em contexto");

  const priorInNewContext = plan.some(
    (step) =>
      stepUsesAny(step, profile.priorItems.length > 0 ? profile.priorItems : reviewFocus) && hasContextualReuse(step)
  );
  const priorPool = profile.priorItems.length > 0 ? profile.priorItems : reviewFocus;
  if (priorPool.length > 0 && !priorInNewContext && plan.length >= 8 && !lesson.isReview) {
    issues.push("conteúdo antigo não aparece em contexto novo");
  }

  const bucketCounts = new Map<string, number>();
  for (const step of plan) {
    const bucket = classifyStepBucket(step, lesson, profile);
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }
  const total = plan.length;
  const targets = bucketTargets(lesson);
  for (const [bucket, target] of Object.entries(targets)) {
    const share = (bucketCounts.get(bucket) ?? 0) / total;
    if (total < 10) continue;
    if (bucket === "moduleWeak" && profile.weakItems.length === 0) continue;
    if (bucket === "modulePrior" && profile.priorItems.length === 0) continue;
    if (share === 0 && target >= 0.2) {
      issues.push(`ausência total de "${bucket}" (alvo ~${Math.round(target * 100)}%)`);
    }
  }

  for (let index = 2; index < plan.length; index += 1) {
    const trio = plan.slice(index - 2, index + 1);
    const family = primaryFamilyForStep(trio[0]);
    if (trio.every((step) => primaryFamilyForStep(step) === family)) {
      issues.push(`3 exercícios seguidos da família "${family}"`);
      break;
    }
  }

  const answerCounts = new Map<string, number>();
  for (const step of plan) {
    const answer = normalizeAnswer(stepAnswer(step));
    if (!answer) continue;
    answerCounts.set(answer, (answerCounts.get(answer) ?? 0) + 1);
  }
  const skipAnswerAudit = FOUNDATION_LESSON_IDS.includes(lesson.id);
  for (const [answer, count] of answerCounts) {
    if (!skipAnswerAudit && count > 3) issues.push(`resposta "${answer}" repetida ${count} vezes`);
  }

  if (!lesson.isReview && !isPinyinFocusedLesson(lesson)) {
    const pinyinCount = plan.filter(isPinyinPracticeStep).length;
    if (pinyinCount > 2) issues.push(`mais de 2 exercícios de pinyin/tom (${pinyinCount})`);
  }

  const superficialKinds = new Set(plan.map((step) => step.kind));
  if (plan.length >= 5 && superficialKinds.size <= 2) {
    issues.push("lição com pouca variedade de tipos de exercício");
  }

  return issues;
}

export function suggestedPhraseItems(profile: LessonNoveltyProfile): FocusItem[] {
  return profile.phraseItems;
}

export function suggestedConversationItems(profile: LessonNoveltyProfile): FocusItem[] {
  return profile.conversationItems;
}
