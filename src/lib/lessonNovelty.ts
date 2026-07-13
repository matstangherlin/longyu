/**
 * Motor de novidade semântica: evita cobrar a mesma resposta várias vezes
 * só mudando o formato do exercício.
 */

import type { Lesson, LessonStep } from "../data/journey";
import { FOUNDATION_LESSON_IDS } from "../data/journey";

const HANZI_PUNCTUATION_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;
const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;

export type CognitiveFamily =
  | "recognition"
  | "production"
  | "audio"
  | "phrase"
  | "conversation"
  | "image"
  | "translation"
  | "tone"
  | "other";

const CONVERSATION_INTENT_BY_SCENE: Record<string, string> = {
  "primeiro-cumprimento": "greeting",
  "perguntando-se-esta-bem": "ask-wellbeing",
  agradecendo: "thanks",
  despedida: "farewell",
  "me-apresentando": "introduce",
  "revisao-cumprimento-completo": "greeting-review",
};

function cleanHanzi(value: string | undefined): string {
  return String(value ?? "")
    .replace(HANZI_PUNCTUATION_RE, "")
    .trim();
}

function normalizeText(value: string | undefined): string {
  return cleanHanzi(value).toLocaleLowerCase("pt-BR");
}

function stepAnswer(step: LessonStep): string {
  return (
    step.correctAnswer ??
    step.checkpoint?.correctAnswer ??
    step.answer ??
    step.blankAnswer ??
    step.correctImageId ??
    step.targetParts?.join("") ??
    step.target?.join("") ??
    ""
  );
}

function primaryHanzi(step: LessonStep): string {
  const direct = cleanHanzi(
    step.targetHanzi ??
      step.sourceText ??
      step.hanzi ??
      step.text ??
      step.audioText ??
      step.correctAnswer ??
      step.answer ??
      step.targetParts?.join("") ??
      step.target?.join("")
  );
  if (direct) return direct;
  return cleanHanzi(stepAnswer(step));
}

function conversationIntent(step: LessonStep): string | undefined {
  if (step.kind !== "conversation_scene" && step.kind !== "dialogue_choice") return undefined;
  if (step.sceneId && CONVERSATION_INTENT_BY_SCENE[step.sceneId]) {
    return CONVERSATION_INTENT_BY_SCENE[step.sceneId];
  }
  const blob = `${step.title ?? ""} ${step.dialoguePrompt ?? ""} ${step.prompt ?? ""} ${step.checkpoint?.prompt ?? ""}`.toLocaleLowerCase("pt-BR");
  if (blob.includes("obrigad") || blob.includes("谢谢") || blob.includes("agradec")) return "thanks";
  if (blob.includes("tchau") || blob.includes("até logo") || blob.includes("再见") || blob.includes("desped")) return "farewell";
  if (blob.includes("tudo bem") || blob.includes("你好吗") || blob.includes("está bem")) return "ask-wellbeing";
  if (blob.includes("chama") || blob.includes("meu nome") || blob.includes("我叫") || blob.includes("apresent")) return "introduce";
  if (blob.includes("olá") || blob.includes("cumpriment") || blob.includes("你好")) return "greeting";
  if (blob.includes("de novo") || blob.includes("repet") || blob.includes("再说")) return "request-repeat";
  if (step.kind === "conversation_scene") return `scene:${step.sceneId ?? "unknown"}`;
  return undefined;
}

/**
 * Chave do que o aluno realmente precisa responder.
 * Exemplos:
 * - answer:请问
 * - concept:tree
 * - tone:你:3
 * - hanzi-build:木
 * - conversation-intent:greeting
 */
export function semanticTargetKey(step: LessonStep): string {
  if (step.kind === "image_choice") {
    const conceptId = step.imageId ?? step.iconId ?? step.correctImageId;
    if (conceptId) return `concept:${conceptId}`;
  }

  if (step.kind === "tone") {
    const glyph = cleanHanzi(step.hanzi) || cleanHanzi(step.text);
    const tone = step.tone ?? "?";
    return `tone:${glyph || "unknown"}:${tone}`;
  }

  if (step.kind === "tone_pair") {
    const left = step.pairs?.[0]?.left ?? "";
    return `tone-pair:${normalizeText(left) || "pair"}`;
  }

  if (step.kind === "hanzi_build") {
    const glyph = cleanHanzi(step.correctAnswer ?? step.targetParts?.join("") ?? step.sourceMeaning);
    return `hanzi-build:${glyph || step.builderId || "unknown"}`;
  }

  if (step.kind === "conversation_scene") {
    const intent = conversationIntent(step) ?? "conversation";
    return `conversation-intent:${intent}`;
  }

  if (step.kind === "dialogue_choice") {
    const intent = conversationIntent(step);
    if (intent) return `conversation-intent:${intent}`;
  }

  if (step.kind === "recognize" || step.kind === "decompose") {
    const id = step.charId ?? cleanHanzi(step.hanzi);
    return `char:${id || "unknown"}`;
  }

  if (step.kind === "listen" || step.kind === "flashcard" || step.kind === "intro" || step.kind === "hanzi_evolution") {
    const target = primaryHanzi(step) || normalizeText(step.chunkId);
    return `exposure:${target || step.kind}`;
  }

  const answer = normalizeText(stepAnswer(step)) || primaryHanzi(step);
  if (answer) return `answer:${answer}`;
  return `kind:${step.kind}`;
}

/** Intenção comunicativa quando houver; senão undefined. */
export function communicativeIntentKey(step: LessonStep): string | undefined {
  const intent = conversationIntent(step);
  return intent ? `conversation-intent:${intent}` : undefined;
}

/** Hànzì principal cobrado (sem pontuação). */
export function primaryHanziKey(step: LessonStep): string | undefined {
  const hanzi = primaryHanzi(step);
  if (!hanzi || !CJK_RE.test(hanzi)) return undefined;
  return `hanzi:${hanzi}`;
}

export function imageConceptKey(step: LessonStep): string | undefined {
  if (step.kind !== "image_choice") return undefined;
  const id = step.imageId ?? step.iconId ?? step.correctImageId;
  return id ? `concept:${id}` : undefined;
}

export function cognitiveFamily(step: LessonStep): CognitiveFamily {
  if (step.kind === "conversation_scene") return "conversation";
  if (step.kind === "image_choice") return "image";
  if (step.kind === "tone" || step.kind === "tone_pair") return "tone";
  if (step.kind === "listen" || step.kind === "listen_select") return "audio";
  if (step.kind === "produce" || step.kind === "sentence_build" || step.kind === "hanzi_build" || step.kind === "write") {
    return "production";
  }
  if (step.kind === "translation_build") return "translation";
  if (step.kind === "fill_blank" || step.kind === "microread") return "phrase";
  if (
    step.kind === "comprehend" ||
    step.kind === "recognize" ||
    step.kind === "decompose" ||
    step.kind === "match_pairs" ||
    step.kind === "flashcard"
  ) {
    return "recognition";
  }
  if (step.kind === "dialogue_choice") {
    return step.dialoguePrompt || step.speaker ? "conversation" : "recognition";
  }
  return "other";
}

function difficultyRank(step: LessonStep): number {
  const family = cognitiveFamily(step);
  const ranks: Record<CognitiveFamily, number> = {
    recognition: 1,
    audio: 2,
    translation: 2,
    image: 3,
    tone: 3,
    phrase: 4,
    production: 5,
    conversation: 6,
    other: 2,
  };
  let rank = ranks[family];
  if (step.isNoHint || step.helpMode === "disabled") rank += 1;
  if (step.kind === "hanzi_build" && step.builderId?.includes("challenge")) rank += 1;
  return rank;
}

/**
 * Transformação pedagógica real entre duas exposições.
 * Trocar só o layout visual não conta.
 */
export function hasMeaningfulTransformation(previous: LessonStep, candidate: LessonStep): boolean {
  if (previous.kind === candidate.kind) {
    // Mesmo tipo: só vale se sobe dificuldade/ajuda ou muda intenção.
    const prevIntent = communicativeIntentKey(previous);
    const nextIntent = communicativeIntentKey(candidate);
    if (prevIntent && nextIntent && prevIntent !== nextIntent) return true;
    if (difficultyRank(candidate) > difficultyRank(previous)) return true;
    if (Boolean(previous.isNoHint) !== Boolean(candidate.isNoHint)) return true;
    if ((previous.helpMode === "disabled") !== (candidate.helpMode === "disabled")) return true;
    return false;
  }

  const prev = cognitiveFamily(previous);
  const next = cognitiveFamily(candidate);

  // reconhecimento → produção
  if (prev === "recognition" && (next === "production" || next === "phrase" || next === "conversation")) return true;
  // texto → áudio
  if ((prev === "recognition" || prev === "translation" || prev === "phrase") && next === "audio") return true;
  if (prev === "audio" && (next === "production" || next === "conversation" || next === "image" || next === "phrase")) {
    return true;
  }
  // palavra isolada → frase / produção
  if ((prev === "recognition" || prev === "tone" || prev === "image") && (next === "phrase" || next === "production")) {
    return true;
  }
  // produção ↔ frase (montar vs completar)
  if ((prev === "production" && next === "phrase") || (prev === "phrase" && next === "production")) return true;
  // frase/produção → conversa
  if ((prev === "phrase" || prev === "production" || prev === "recognition") && next === "conversation") return true;
  // hànzì → imagem
  if ((prev === "recognition" || prev === "production") && next === "image") return true;
  if (prev === "image" && (next === "production" || next === "conversation" || next === "phrase")) return true;
  // tradução guiada → resposta sem ajuda / produção
  if (prev === "translation" && (candidate.isNoHint || candidate.helpMode === "disabled" || next === "production")) {
    return true;
  }
  // item novo (reconhecimento/tradução) → aplicação com item antigo em contexto
  if (
    (prev === "recognition" || prev === "translation" || prev === "tone") &&
    (next === "phrase" || next === "production" || next === "conversation") &&
    (candidate.reusesPreviousVocabulary?.length ?? 0) > 0
  ) {
    return true;
  }
  // qualquer salto relevante de dificuldade
  if (difficultyRank(candidate) >= difficultyRank(previous) + 2) return true;

  return false;
}

export interface SemanticLimits {
  maxSameAnswer: number;
  maxSameHanzi: number;
  maxSamePhrase: number;
  maxSameIntent: number;
  maxSameImage: number;
}

export function semanticLimitsForLesson(lesson: Lesson): SemanticLimits {
  const dedicated =
    lesson.isReview ||
    FOUNDATION_LESSON_IDS.includes(lesson.id) ||
    lesson.skill === "hanzi" ||
    lesson.id.includes("primeiros-hanzi") ||
    lesson.id.includes("char-") ||
    lesson.steps.filter((step) => step.kind === "hanzi_build").length >= 4;

  if (dedicated) {
    return {
      maxSameAnswer: 4,
      maxSameHanzi: 4,
      maxSamePhrase: 3,
      maxSameIntent: 3,
      maxSameImage: 1,
    };
  }

  return {
    maxSameAnswer: 2,
    maxSameHanzi: 2,
    maxSamePhrase: 2,
    maxSameIntent: 2,
    maxSameImage: 1,
  };
}

function countKeys(steps: readonly LessonStep[], keyOf: (step: LessonStep) => string | undefined, key: string): number {
  return steps.filter((step) => keyOf(step) === key).length;
}

export interface NoveltySelectionContext {
  lesson: Lesson;
  selected: readonly LessonStep[];
  reviewHanzi?: ReadonlySet<string>;
}

function isPhraseStep(step: LessonStep): boolean {
  const hanzi = primaryHanzi(step);
  return hanzi.length >= 2 || step.kind === "fill_blank" || step.kind === "sentence_build" || step.kind === "microread";
}

/**
 * Ajuste de score semântico.
 * Penalidades fortes para repetir a mesma cobrança; bônus para novidade útil.
 */
export function noveltyScoreAdjustment(candidate: LessonStep, context: NoveltySelectionContext): number {
  const limits = semanticLimitsForLesson(context.lesson);
  const selected = context.selected;
  const key = semanticTargetKey(candidate);
  const hanziKey = primaryHanziKey(candidate);
  const intentKey = communicativeIntentKey(candidate);
  const imageKey = imageConceptKey(candidate);

  let score = 0;

  const answerCount = countKeys(selected, semanticTargetKey, key);
  if (answerCount >= limits.maxSameAnswer) score -= 100;
  else if (answerCount > 0) {
    const lastSame = [...selected].reverse().find((step) => semanticTargetKey(step) === key);
    if (lastSame && !hasMeaningfulTransformation(lastSame, candidate)) score -= 100;
    else if (!isDedicatedLesson(context.lesson)) score -= 35;
  }

  if (intentKey) {
    const intentCount = countKeys(selected, (step) => communicativeIntentKey(step), intentKey);
    if (intentCount >= limits.maxSameIntent) score -= 60;
  }

  if (hanziKey) {
    const hanziCount = countKeys(selected, (step) => primaryHanziKey(step), hanziKey);
    if (hanziCount >= limits.maxSameHanzi) score -= 40;
    else if (hanziCount > 0) {
      const last = [...selected].reverse().find((step) => primaryHanziKey(step) === hanziKey);
      if (last && difficultyRank(candidate) <= difficultyRank(last)) score -= 40;
    }
  }

  if (imageKey) {
    const imageCount = countKeys(selected, (step) => imageConceptKey(step), imageKey);
    if (imageCount >= limits.maxSameImage) score -= 100;
  }

  if (isPhraseStep(candidate) && hanziKey) {
    const phraseCount = selected.filter(
      (step) => isPhraseStep(step) && primaryHanziKey(step) === hanziKey
    ).length;
    if (phraseCount >= limits.maxSamePhrase) score -= 100;
  }

  // Bônus
  const family = cognitiveFamily(candidate);
  if (family === "conversation") score += 25;
  if (family === "image") score += 20;
  if (family === "production") score += 20;
  if (family === "audio" && !candidate.pt && !candidate.targetMeaningPt) score += 15;

  if (context.reviewHanzi && hanziKey) {
    const glyph = hanziKey.replace(/^hanzi:/, "");
    if (context.reviewHanzi.has(glyph) && (family === "conversation" || family === "phrase" || family === "production")) {
      score += 30;
    }
  }

  const last = selected[selected.length - 1];
  if (last && semanticTargetKey(last) === key && hasMeaningfulTransformation(last, candidate)) {
    score += 10;
  }

  return score;
}

function isDedicatedLesson(lesson: Lesson): boolean {
  return (
    lesson.isReview === true ||
    FOUNDATION_LESSON_IDS.includes(lesson.id) ||
    lesson.skill === "hanzi" ||
    lesson.steps.filter((step) => step.kind === "hanzi_build").length >= 4
  );
}

/** Bloqueio duro quando a cobrança semântica já estourou o limite. */
export function wouldViolateSemanticLimits(candidate: LessonStep, context: NoveltySelectionContext): boolean {
  const limits = semanticLimitsForLesson(context.lesson);
  const selected = context.selected;
  const key = semanticTargetKey(candidate);
  const dedicated = isDedicatedLesson(context.lesson);
  const sameCount = countKeys(selected, semanticTargetKey, key);
  const lastSame = [...selected].reverse().find((step) => semanticTargetKey(step) === key);

  if (sameCount > 0 && lastSame && !hasMeaningfulTransformation(lastSame, candidate)) {
    return true;
  }

  if (sameCount >= limits.maxSameAnswer) {
    if (!dedicated) return true;
    if (!lastSame || !hasMeaningfulTransformation(lastSame, candidate)) return true;
  }

  const imageKey = imageConceptKey(candidate);
  if (imageKey && countKeys(selected, (step) => imageConceptKey(step), imageKey) >= limits.maxSameImage) {
    return true;
  }

  const intentKey = communicativeIntentKey(candidate);
  if (intentKey && countKeys(selected, (step) => communicativeIntentKey(step), intentKey) >= limits.maxSameIntent) {
    if (!dedicated) return true;
  }

  const hanziKey = primaryHanziKey(candidate);
  if (hanziKey && countKeys(selected, (step) => primaryHanziKey(step), hanziKey) >= limits.maxSameHanzi) {
    if (!dedicated) return true;
    const last = [...selected].reverse().find((step) => primaryHanziKey(step) === hanziKey);
    if (!last || difficultyRank(candidate) <= difficultyRank(last)) return true;
  }

  if (isPhraseStep(candidate) && hanziKey) {
    const phraseCount = selected.filter(
      (step) => isPhraseStep(step) && primaryHanziKey(step) === hanziKey
    ).length;
    if (phraseCount >= limits.maxSamePhrase && !dedicated) return true;
  }

  // Três exposições seguidas do mesmo alvo sem transformação.
  const lastTwo = selected.slice(-2);
  if (lastTwo.length === 2 && lastTwo.every((step) => semanticTargetKey(step) === key)) {
    if (!hasMeaningfulTransformation(lastTwo[1], candidate)) return true;
  }

  return false;
}

export function lessonHasNoveltySignal(lesson: Lesson, plan: readonly LessonStep[]): boolean {
  if (lesson.isReview) return true;
  if (FOUNDATION_LESSON_IDS.includes(lesson.id)) return true;
  const keys = new Set(plan.map(semanticTargetKey));
  if (keys.size >= Math.min(3, Math.max(1, plan.length - 1))) return true;
  const families = new Set(plan.map(cognitiveFamily));
  return families.size >= 3;
}

export function auditLessonNovelty(lesson: Lesson, plan: readonly LessonStep[]): string[] {
  const issues: string[] = [];
  if (plan.length === 0) return ["plano vazio"];

  const limits = semanticLimitsForLesson(lesson);
  const answerCounts = new Map<string, number>();
  const intentCounts = new Map<string, number>();
  const hanziCounts = new Map<string, number>();
  const imageCounts = new Map<string, number>();

  for (const step of plan) {
    if (step.kind === "intro" || step.kind === "listen" || step.kind === "flashcard") continue;
    const key = semanticTargetKey(step);
    answerCounts.set(key, (answerCounts.get(key) ?? 0) + 1);
    const intent = communicativeIntentKey(step);
    if (intent) intentCounts.set(intent, (intentCounts.get(intent) ?? 0) + 1);
    const hanzi = primaryHanziKey(step);
    if (hanzi) hanziCounts.set(hanzi, (hanziCounts.get(hanzi) ?? 0) + 1);
    const image = imageConceptKey(step);
    if (image) imageCounts.set(image, (imageCounts.get(image) ?? 0) + 1);
  }

  for (const [key, count] of answerCounts) {
    if (count > limits.maxSameAnswer) {
      issues.push(`resposta/alvo "${key}" aparece ${count} vezes (máx. ${limits.maxSameAnswer})`);
    }
  }
  for (const [key, count] of intentCounts) {
    if (count > limits.maxSameIntent) {
      issues.push(`intenção "${key}" aparece ${count} vezes (máx. ${limits.maxSameIntent})`);
    }
  }
  for (const [key, count] of imageCounts) {
    if (count > limits.maxSameImage) {
      issues.push(`imagem "${key}" aparece ${count} vezes (máx. ${limits.maxSameImage})`);
    }
  }

  for (let index = 2; index < plan.length; index += 1) {
    const a = plan[index - 2];
    const b = plan[index - 1];
    const c = plan[index];
    const key = semanticTargetKey(c);
    if (semanticTargetKey(a) === key && semanticTargetKey(b) === key) {
      if (!hasMeaningfulTransformation(b, c) || !hasMeaningfulTransformation(a, b)) {
        issues.push(`três exercícios cobram cognitivamente o mesmo alvo (${key})`);
      }
    }
  }

  for (let index = 1; index < plan.length; index += 1) {
    const prev = plan[index - 1];
    const curr = plan[index];
    if (semanticTargetKey(prev) !== semanticTargetKey(curr)) continue;
    if (prev.kind === "intro" || curr.kind === "intro") continue;
    if (!hasMeaningfulTransformation(prev, curr)) {
      issues.push(`exposições sucessivas de "${semanticTargetKey(curr)}" sem transformação real`);
    }
  }

  // Conteúdo antigo só como reconhecimento.
  const priorRecognitionOnly = plan.filter((step) => {
    const hanzi = primaryHanzi(step);
    if (!hanzi) return false;
    // Heurística: reusesPreviousVocabulary marca revisão.
    const reuses = (step.reusesPreviousVocabulary ?? []).length > 0;
    return reuses && cognitiveFamily(step) === "recognition";
  });
  const priorContextual = plan.some((step) => {
    const reuses = (step.reusesPreviousVocabulary ?? []).length > 0;
    const family = cognitiveFamily(step);
    return reuses && (family === "conversation" || family === "phrase" || family === "production");
  });
  if (priorRecognitionOnly.length > 0 && !priorContextual && !lesson.isReview) {
    issues.push("conteúdo antigo só aparece como reconhecimento");
  }

  if (!lesson.isReview && !lessonHasNoveltySignal(lesson, plan)) {
    issues.push("lição comum não apresenta novidade suficiente");
  }

  return [...new Set(issues)];
}

export function lessonNoveltyIssues(lesson: Lesson, plan: readonly LessonStep[]): string[] {
  return auditLessonNovelty(lesson, plan);
}
