/**
 * Alvos de revisão de um erro de lição. Extraído de LessonPlayer sem mudar
 * a regra: o chunk entra quando o currículo o ensinou; caracteres soltos só
 * depois da introdução.
 */
import type { LessonStep, Skill } from "../../data/journey";
import { charsInText, findChunkByText } from "./errorLexicalIdentity";
import { curriculumRefsThroughLesson } from "./lessonTasks";
import type { ActivityReviewTarget, Track } from "../../lib/store";
import type { ReviewDomain } from "../../lib/srs";

export type LessonReviewTarget = ActivityReviewTarget;

export const SKILL_TRACK: Record<Skill, Track> = {
  som: "som",
  fala: "fala",
  hanzi: "hanzi",
  leitura: "leitura",
  sistema: "hanzi",
};

export function uniqueLessonReviewTargets(targets: LessonReviewTarget[]): LessonReviewTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.type}:${target.itemId}:${target.domain}:${target.track}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function textReviewTargets(
  text: string | undefined,
  domain: ReviewDomain,
  track: Track,
  introduced?: ReadonlySet<string>
): LessonReviewTarget[] {
  const targets: LessonReviewTarget[] = [];
  const chunk = findChunkByText(text);
  if (chunk && (!introduced || introduced.has(`chunk:${chunk.id}`))) {
    targets.push({ type: "chunk", itemId: chunk.id, domain, track });
  }
  for (const char of charsInText(text)) {
    if (introduced && !introduced.has(`char:${char.id}`)) continue;
    targets.push({ type: "char", itemId: char.id, domain, track });
  }
  return targets;
}

function pedagogicalTextTargets(
  text: string | undefined,
  domain: ReviewDomain,
  track: Track,
  introduced?: ReadonlySet<string>
): LessonReviewTarget[] {
  const chunk = findChunkByText(text);
  if (chunk && (!introduced || introduced.has(`chunk:${chunk.id}`))) {
    return [{ type: "chunk", itemId: chunk.id, domain, track }];
  }
  return charsInText(text)
    .filter((char) => !introduced || introduced.has(`char:${char.id}`))
    .map((char) => ({ type: "char" as const, itemId: char.id, domain, track }));
}

const lessonTaughtRefsCache = new Map<string, ReadonlySet<string>>();

export function taughtRefsForLesson(lesson: { id: string; steps?: LessonStep[] }): ReadonlySet<string> {
  const cached = lessonTaughtRefsCache.get(lesson.id);
  if (cached) return cached;
  const refs = new Set<string>(curriculumRefsThroughLesson(lesson.id));
  for (const step of lesson.steps ?? []) {
    for (const text of [step.hanzi, step.correctAnswer, step.answer, step.blankAnswer, step.text]) {
      if (!text) continue;
      const chunk = findChunkByText(text);
      if (chunk) refs.add(`chunk:${chunk.id}`);
      for (const char of charsInText(text)) refs.add(`char:${char.id}`);
    }
  }
  lessonTaughtRefsCache.set(lesson.id, refs);
  return refs;
}

function hasPinyinToneMark(value: string | undefined): boolean {
  return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/iu.test(value ?? "");
}

export function isPinyinOrToneChoiceStep(step: LessonStep): boolean {
  const label = `${step.title ?? ""} ${step.prompt ?? ""} ${step.dialoguePrompt ?? ""}`.toLocaleLowerCase("pt-BR");
  const options = [step.correctAnswer, step.answer, step.pinyin, step.sourcePinyin, ...(step.options ?? [])];
  return (
    label.includes("pinyin") ||
    label.includes("acento") ||
    (label.includes("tom") && options.some(hasPinyinToneMark)) ||
    options.filter(hasPinyinToneMark).length >= 2
  );
}

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/u;

function hasCjk(text: string | undefined): text is string {
  return Boolean(text && CJK.test(text));
}

/** "chunk:id" / "char:id" de uma cena viram alvo direto. */
function refTargets(refs: readonly string[] | undefined, domain: ReviewDomain, track: Track): LessonReviewTarget[] {
  return (refs ?? []).flatMap((ref) => {
    const [type, itemId] = ref.split(":");
    return (type === "chunk" || type === "char") && itemId ? [{ type, itemId, domain, track } as LessonReviewTarget] : [];
  });
}

/**
 * QA 2026-10 · R4 (LGY-027) — toda etapa avaliada errada gera ao menos um
 * alvo. Se o filtro do que a lição ensinou zera os alvos, vale o item que a
 * própria etapa testou (o aluno acabou de vê-lo). Se ainda não há alvo, o
 * mandarim da etapa (resposta, hànzì, áudio, partes) vira alvo de uso. Etapa
 * sem mandarim conhecido no catálogo (conceito em português, pinyin solto,
 * palavra fora do catálogo) continua sem alvo: não há item para revisar.
 */
export function reviewTargetsForMistake(
  step: LessonStep,
  track: Track,
  introduced?: ReadonlySet<string>
): LessonReviewTarget[] {
  const direct = reviewTargetsForMistakeOnly(step, track, introduced);
  if (direct.length > 0 || !introduced) return direct.length > 0 ? direct : fallbackReviewTargets(step, track);
  const tested = reviewTargetsForMistakeOnly(step, track, undefined);
  return tested.length > 0 ? tested : fallbackReviewTargets(step, track);
}

function fallbackReviewTargets(step: LessonStep, track: Track): LessonReviewTarget[] {
  const fromRefs = refTargets([...(step.newRefs ?? []), ...(step.learnedRefs ?? [])], "uso", track);
  if (fromRefs.length > 0) return uniqueLessonReviewTargets(fromRefs);
  const blankSentence = step.blankAnswer ? `${step.sentenceBefore ?? ""}${step.blankAnswer}${step.sentenceAfter ?? ""}` : undefined;
  const candidates = [
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    blankSentence,
    step.targetHanzi,
    step.hanzi,
    step.audioText,
    step.sourceText,
    step.targetParts?.join(""),
    step.target?.join(""),
    step.signHanzi,
    step.priceHanzi,
    step.repairNpcHanzi,
  ];
  for (const text of candidates) {
    if (!hasCjk(text)) continue;
    const found = textReviewTargets(text, "uso", track);
    if (found.length > 0) return uniqueLessonReviewTargets(found);
  }
  return [];
}

function reviewTargetsForMistakeOnly(
  step: LessonStep,
  track: Track,
  introduced?: ReadonlySet<string>
): LessonReviewTarget[] {
  const targets: LessonReviewTarget[] = [];
  const addText = (text: string | undefined, domain: ReviewDomain, sourceTrack: Track = track) => {
    targets.push(...textReviewTargets(text, domain, sourceTrack, introduced));
  };

  if (step.pedagogyVariant === "audio_same_different") {
    for (const audio of step.audioSequence ?? []) {
      addText(audio, "som", "som");
      addText(audio, "pinyin", "som");
    }
    return uniqueLessonReviewTargets(targets);
  }
  if (step.pedagogyVariant === "dragon_dictation") {
    addText(step.audioText, "som", "som");
    if (step.dictationMode === "pinyin") addText(step.audioText, "pinyin", "som");
    else {
      addText(step.audioText ?? step.answer, "uso");
      addText(step.audioText ?? step.answer, "forma", "hanzi");
    }
    return uniqueLessonReviewTargets(targets);
  }
  if (step.pedagogyVariant?.startsWith("meaning_")) {
    addText(step.correctAnswer ?? step.answer, "significado");
    addText(step.correctAnswer ?? step.answer, "uso");
    return uniqueLessonReviewTargets(targets);
  }

  if (step.kind === "tone") {
    addText(step.hanzi, "som", "som");
    addText(step.hanzi, "pinyin", "som");
  }
  if (step.kind === "comprehend") addText(step.hanzi ?? step.answer, "significado");
  if (step.kind === "produce") {
    const text = step.target?.join("") || step.correctAnswer;
    addText(text, "uso");
    addText(text, "fala");
  }
  if (step.kind === "audio_to_action") {
    addText(step.audioText ?? step.correctAnswer, "som", "som");
    addText(step.audioText ?? step.correctAnswer, "pinyin", "som");
    addText(step.correctAnswer, "significado");
  }
  if (step.kind === "substitution_drill") {
    addText(step.blankAnswer, "uso");
    if (step.blankAnswer) addText(`${step.sentenceBefore ?? ""}${step.blankAnswer}${step.sentenceAfter ?? ""}`, "uso");
  }
  if (step.kind === "recognize" && step.charId) {
    targets.push({ type: "char", itemId: step.charId, domain: "significado", track });
  }
  if (step.kind === "write") {
    if (step.chunkId) {
      targets.push({ type: "chunk", itemId: step.chunkId, domain: "uso", track });
      targets.push({ type: "chunk", itemId: step.chunkId, domain: "significado", track });
    }
    addText(step.answer, "uso");
  }
  if (step.kind === "match_pairs" || step.kind === "tone_pair") {
    const domain: ReviewDomain = step.kind === "tone_pair" ? "som" : "significado";
    const sourceTrack: Track = step.kind === "tone_pair" ? "som" : track;
    for (const pair of step.pairs ?? []) {
      if (pair.reviewType && pair.reviewItemId) {
        targets.push({ type: pair.reviewType, itemId: pair.reviewItemId, domain, track: sourceTrack });
      }
      addText(pair.left, domain, sourceTrack);
      addText(pair.right, domain, sourceTrack);
    }
  }
  if (step.kind === "listen_select") {
    addText(step.audioText ?? step.correctAnswer, "som", "som");
    addText(step.audioText ?? step.correctAnswer, "pinyin", "som");
    addText(step.correctAnswer, "significado");
  }
  if (step.kind === "image_choice") {
    const hanzi = step.targetHanzi ?? step.hanzi;
    const mode = step.imageChoiceMode;
    if (mode === "listen_and_choose_image" || mode === "choose_pinyin") {
      addText(hanzi, "som", "som");
      addText(hanzi, "pinyin", "som");
    }
    if (mode === "choose_hanzi" || mode === "choose_image" || mode === "listen_and_choose_image") {
      addText(hanzi, "forma", "hanzi");
    }
    addText(hanzi, "significado");
  }
  if (step.kind === "compare_with_image") {
    const hanzi = step.targetHanzi ?? step.hanzi;
    addText(hanzi, "significado");
    addText(hanzi, "forma", "hanzi");
  }
  if (step.kind === "dialogue_choice" && isPinyinOrToneChoiceStep(step)) {
    const source = step.sourceText ?? step.hanzi ?? step.audioText;
    addText(source, "pinyin", "som");
    addText(source, "som", "som");
  }
  if (step.kind === "sentence_build" || step.kind === "translation_build" || step.kind === "dialogue_choice" || step.kind === "conversation_scene" || step.kind === "place_label" || step.kind === "city_context" || step.kind === "contextual_choice" || step.kind === "dialogue_completion" || step.kind === "sign_reading" || step.kind === "menu_reading" || step.kind === "price_task" || step.kind === "schedule_reading") {
    const text = step.correctAnswer ?? step.checkpoint?.correctAnswer ?? step.answer ?? step.targetParts?.join("");
    if (step.kind === "conversation_scene") {
      targets.push(...pedagogicalTextTargets(text, "uso", track, introduced));
      targets.push(...pedagogicalTextTargets(text, "fala", track, introduced));
    } else {
      addText(text, "uso");
      addText(text, "fala");
    }
  }
  if (step.kind === "address_build" || step.kind === "sentence_transform" || step.kind === "route_sequence") {
    addText(step.targetParts?.join("") ?? step.routeParts?.join("") ?? step.correctAnswer, "uso");
    addText(step.targetParts?.join("") ?? step.routeParts?.join("") ?? step.correctAnswer, "fala");
  }
  if (step.kind === "map_direction") {
    addText(step.prompt ?? step.audioText ?? step.mapCorrectAction, "uso");
    if (step.audioText) addText(step.audioText, "som", "som");
  }
  if (step.kind === "reverse_recall") {
    addText(step.answer ?? step.correctAnswer, "uso");
    addText(step.answer ?? step.correctAnswer, "fala");
  }
  if (step.pedagogyVariant === "sentence_lab_audio") {
    addText(step.audioText ?? step.correctAnswer, "som", "som");
  }
  if (step.kind === "fill_blank") {
    addText(step.correctAnswer ?? step.answer ?? `${step.sentenceBefore ?? ""}${step.blankAnswer ?? ""}${step.sentenceAfter ?? ""}`, "uso");
  }
  if (step.kind === "hanzi_build") {
    addText(step.correctAnswer ?? step.answer, "forma", "hanzi");
    addText(step.targetParts?.join(""), "forma", "hanzi");
  }
  if (step.kind === "audio_discrimination") {
    for (const side of step.pairReveal ?? []) {
      addText(side.hanzi, "som", "som");
      addText(side.hanzi, "pinyin", "som");
    }
  }
  if (step.kind === "dictation") {
    const written = step.hanzi ?? step.correctAnswer ?? step.targetParts?.join("");
    addText(written, "som", "som");
    if (step.dictationMode === "pinyin") addText(written, "pinyin", "som");
    if (step.dictationMode === "hanzi" || step.dictationMode === "blocks") addText(written, "forma", "hanzi");
  }
  if (step.kind === "odd_one_out") {
    for (const option of step.options ?? []) addText(option, "significado");
  }
  if (step.kind === "spot_error") {
    addText(step.correctAnswer ?? step.answer, "uso");
    addText(step.correctAnswer ?? step.answer, "fala");
  }
  if (step.kind === "free_production" || step.kind === "transfer_task") {
    const produced = step.correctAnswer ?? step.answer;
    addText(produced, "uso");
    addText(produced, "fala");
    addText(produced, "forma", "hanzi");
  }
  if (step.kind === "conversation_repair") {
    const recovery = step.correctAnswer ?? step.answer;
    addText(recovery, "uso");
    addText(recovery, "fala");
  }

  return uniqueLessonReviewTargets(targets);
}
