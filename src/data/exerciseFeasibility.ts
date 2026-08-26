/**
 * V4.6.2 — Exercise feasibility + instruction integrity.
 *
 * Every Journey activity must answer:
 *   1. What does the student need to do?
 *   2. How do they do it in this UI?
 *   3. How do we know they did it?
 *
 * Audits the runtime plan that LessonPlayer actually renders
 * (`lessonRoundStepsFor` + `materializeRuntimeStep`), not only TopicMasterySpec.
 */

import type { LessonStep, StepKind } from "./journey";

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/;
const CJK_CHAR_RE = /[\u3400-\u9fff\uf900-\ufaff]/g;

export const GRADED_STEP_KINDS: readonly StepKind[] = [
  "tone",
  "comprehend",
  "produce",
  "recognize",
  "write",
  "match_pairs",
  "listen_select",
  "sentence_build",
  "translation_build",
  "fill_blank",
  "dialogue_choice",
  "conversation_scene",
  "hanzi_build",
  "tone_pair",
  "image_choice",
  "compare_with_image",
  "audio_discrimination",
  "dictation",
  "odd_one_out",
  "spot_error",
  "free_production",
  "transfer_task",
  "conversation_repair",
  "contextual_choice",
  "audio_to_action",
  "sentence_transform",
  "substitution_drill",
  "dialogue_completion",
  "reverse_recall",
  "map_direction",
  "place_label",
  "address_build",
  "city_context",
  "sign_reading",
  "menu_reading",
  "price_task",
  "route_sequence",
  "schedule_reading",
];

/** Intro / listen / flash / evolution: not a scored question. */
export const PASSIVE_STEP_KINDS = new Set<StepKind>([
  "intro",
  "listen",
  "flashcard",
  "hanzi_evolution",
  "microread",
]);

export type InstructionVerb =
  | "diga"
  | "fale"
  | "pronuncie"
  | "digite"
  | "escreva"
  | "monte"
  | "organize"
  | "escolha"
  | "qual"
  | "ouca"
  | "combine"
  | "pense";

export type AvailableInteraction =
  | "speech"
  | "verified_input"
  | "assembly"
  | "choice"
  | "match"
  | "audio"
  | "hanzi_builder"
  | "continue_only";

export type FeasibilityIssueCode =
  | "invalid_interaction"
  | "instruction_mismatch"
  | "answer_leak"
  | "ime_only"
  | "dead_screen"
  | "write_mode_missing"
  | "reflection_as_production"
  | "reflection_as_question"
  | "missing_action";

export interface StepFeasibility {
  lessonId: string;
  pass: number;
  stage: string;
  index: number;
  kind: StepKind;
  title: string;
  instructionVerbs: InstructionVerb[];
  requiredAction: string;
  availableInteractions: AvailableInteraction[];
  graded: boolean;
  skippable: boolean;
  answerVisibleBeforeAttempt: boolean;
  feasible: boolean;
  intentionalReflection: boolean;
  passive: boolean;
  issues: FeasibilityIssueCode[];
  detail: string[];
}

export interface FeasibilityTotals {
  totalSteps: number;
  interactive: number;
  passive: number;
  intentionalReflection: number;
  invalidInteraction: number;
  instructionMismatch: number;
  answerLeak: number;
  imeOnly: number;
  deadScreen: number;
}

/** Human QA screenshot: reflexão + Diga + suggestion 木 + Continuar. */
export const HUMAN_QA_DEAD_SCREEN: LessonStep = {
  kind: "reverse_recall",
  title: "Diga sem apoio extra",
  situationPt: "montar o caractere-alvo",
  body: "montar o caractere-alvo",
  answer: "木",
  suggestion: "木",
  mode: "free_reflection",
  isNoHint: true,
};

const SPEAK_VERBS = new Set<InstructionVerb>(["diga", "fale", "pronuncie"]);
const WRITE_VERBS = new Set<InstructionVerb>(["digite", "escreva"]);
const ASSEMBLE_VERBS = new Set<InstructionVerb>(["monte", "organize"]);
const CHOICE_VERBS = new Set<InstructionVerb>(["escolha", "qual"]);

const VERB_PATTERNS: Array<{ verb: InstructionVerb; re: RegExp }> = [
  { verb: "diga", re: /\bdiga\b/i },
  { verb: "fale", re: /\bfale\b/i },
  { verb: "pronuncie", re: /\bpronuncie\b/i },
  { verb: "digite", re: /\bdigite\b/i },
  { verb: "escreva", re: /\bescreva\b/i },
  { verb: "monte", re: /\bmonte\b|\bmontar\b/i },
  { verb: "organize", re: /\borganize\b|\borganizar\b/i },
  { verb: "escolha", re: /\bescolha\b|\bescolher\b/i },
  { verb: "qual", re: /\bqual\b|\bquais\b/i },
  { verb: "ouca", re: /\bou[cç]a\b/i },
  { verb: "combine", re: /\bcombine\b|\bcombinar\b/i },
  { verb: "pense", re: /\bpense\b|\bpensar\b|\breflex[aã]o\b/i },
];

const CJK_DISTRACTORS = ["一", "人", "木", "口", "日", "好", "你", "山"];

export function containsCjkGlyph(value: string | undefined): boolean {
  return Boolean(value && CJK_RE.test(value));
}

export function isIntentionalFreeReflection(step: Pick<LessonStep, "kind" | "mode">): boolean {
  return step.kind === "write" && step.mode === "free_reflection";
}

export function isEvaluableQuestionStep(step: Pick<LessonStep, "kind" | "mode">): boolean {
  if (isIntentionalFreeReflection(step)) return false;
  if (PASSIVE_STEP_KINDS.has(step.kind)) return false;
  return GRADED_STEP_KINDS.includes(step.kind);
}

/** Production that the student must actually perform — not skippable Continuar. */
export function isProductionStep(step: Pick<LessonStep, "kind" | "mode">): boolean {
  if (isIntentionalFreeReflection(step)) return false;
  if (step.kind === "reverse_recall" && step.mode === "free_reflection") return false;
  return (
    step.kind === "free_production" ||
    step.kind === "produce" ||
    step.kind === "write" ||
    step.kind === "sentence_build" ||
    step.kind === "translation_build" ||
    step.kind === "dictation" ||
    step.kind === "reverse_recall" ||
    step.kind === "sentence_transform" ||
    step.kind === "substitution_drill" ||
    step.kind === "hanzi_build" ||
    step.kind === "dialogue_completion" ||
    step.kind === "address_build" ||
    step.kind === "transfer_task"
  );
}

export function instructionBlob(step: LessonStep): string {
  return [step.title, step.body, step.prompt, step.dialoguePrompt, step.situationPt, step.promptPt]
    .filter(Boolean)
    .join(" \n ");
}

export function instructionVerbsIn(text: string): InstructionVerb[] {
  const found: InstructionVerb[] = [];
  for (const { verb, re } of VERB_PATTERNS) {
    if (re.test(text) && !found.includes(verb)) found.push(verb);
  }
  return found;
}

function mergeVerbs(...lists: InstructionVerb[][]): InstructionVerb[] {
  const found: InstructionVerb[] = [];
  for (const list of lists) {
    for (const verb of list) {
      if (!found.includes(verb)) found.push(verb);
    }
  }
  return found;
}

/**
 * Verbs that tell the student what to *do* in this UI.
 *
 * Title first. Prompt/dialogue often quote the Chinese target in Portuguese
 * ("Por favor, fale de novo") and must not override the real action ("Monte").
 * reverse_recall / write / free_production still merge body/situation so
 * "Diga" + "montar o caractere" stays a hard fail.
 */
export function instructionVerbsFor(step: LessonStep): InstructionVerb[] {
  const titleVerbs = instructionVerbsIn(step.title ?? "");
  const productionKinds =
    step.kind === "reverse_recall" ||
    step.kind === "write" ||
    step.kind === "free_production" ||
    step.kind === "transfer_task";
  const studentFacing = productionKinds
    ? instructionVerbsIn([step.body, step.situationPt].filter(Boolean).join(" \n "))
    : [];
  if (titleVerbs.length > 0) return mergeVerbs(titleVerbs, studentFacing);
  return studentFacing;
}

export function cjkPieceBank(answer: string, extra: string[] = []): string[] {
  const chars = Array.from(new Set(Array.from(answer).filter((ch) => CJK_RE.test(ch))));
  if (chars.length === 0) return [];
  const out: string[] = [];
  for (const item of [...chars, ...extra, ...CJK_DISTRACTORS]) {
    if (item && !out.includes(item)) out.push(item);
  }
  return out.slice(0, Math.max(4, chars.length + 2));
}

function unique(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}

export function expectedAnswers(step: LessonStep): string[] {
  return unique([
    step.answer,
    step.correctAnswer,
    step.targetHanzi,
    (step.target ?? []).join(""),
    (step.targetParts ?? []).join(""),
  ]);
}

export function suggestionLeaksAnswer(step: LessonStep): boolean {
  const suggestion = (step.suggestion ?? "").normalize("NFC").trim();
  if (!suggestion) return false;
  const targets = expectedAnswers(step).map((item) => item.normalize("NFC").trim()).filter(Boolean);
  if (targets.some((target) => target === suggestion)) return true;
  const compact = suggestion.replace(/\s+/g, "");
  return targets.some((target) => target.replace(/\s+/g, "") === compact && compact.length > 0);
}

function hasSelectableOptions(step: LessonStep): boolean {
  return (step.options ?? []).filter((item) => item?.trim()).length >= 2;
}

function hasAssemblyBank(step: LessonStep): boolean {
  const bank = [...(step.bank ?? []), ...(step.wordBank ?? []), ...(step.productionHelpBuildBank ?? [])];
  return bank.filter((item) => item?.trim()).length >= 1 || (step.target ?? []).length > 0 || (step.targetParts ?? []).length > 0;
}

function expectedCjk(step: LessonStep): string {
  for (const item of expectedAnswers(step)) {
    const run = item.match(CJK_CHAR_RE);
    if (run) return run.join("");
  }
  return "";
}

export function availableInteractionsFor(step: LessonStep): AvailableInteraction[] {
  const found = new Set<AvailableInteraction>();
  const kind = step.kind;

  if (kind === "hanzi_build") {
    found.add("hanzi_builder");
    found.add("assembly");
  }
  if (
    kind === "produce" ||
    kind === "sentence_build" ||
    kind === "translation_build" ||
    kind === "fill_blank" ||
    kind === "address_build" ||
    kind === "route_sequence" ||
    kind === "sentence_transform" ||
    kind === "decompose"
  ) {
    found.add("assembly");
  }
  if (kind === "recognize") found.add("choice");
  if (kind === "dictation") {
    found.add("verified_input");
    found.add("audio");
    if (hasAssemblyBank(step) || (step.dictationMode ?? "blocks") === "blocks") found.add("assembly");
  }
  if (
    kind === "dialogue_choice" ||
    kind === "listen_select" ||
    kind === "contextual_choice" ||
    kind === "odd_one_out" ||
    kind === "audio_to_action" ||
    kind === "city_context" ||
    kind === "sign_reading" ||
    kind === "menu_reading" ||
    kind === "price_task" ||
    kind === "schedule_reading" ||
    kind === "comprehend" ||
    kind === "spot_error" ||
    kind === "tone"
  ) {
    found.add("choice");
  }
  if (kind === "image_choice") {
    found.add("choice");
    if (
      step.audioText ||
      String(step.imageChoiceMode ?? "").includes("listen") ||
      /\bou[cç]a\b/i.test(instructionBlob(step))
    ) {
      found.add("audio");
    }
  }
  if (
    kind === "match_pairs" ||
    kind === "tone_pair" ||
    kind === "map_direction" ||
    kind === "place_label" ||
    kind === "compare_with_image"
  ) {
    found.add("match");
  }
  if (
    kind === "listen" ||
    kind === "listen_select" ||
    kind === "audio_discrimination" ||
    kind === "dictation" ||
    kind === "tone" ||
    kind === "audio_to_action"
  ) {
    found.add("audio");
  }
  if (
    kind === "listen" ||
    kind === "free_production" ||
    kind === "transfer_task" ||
    kind === "conversation_repair" ||
    kind === "conversation_scene" ||
    kind === "reverse_recall"
  ) {
    found.add("speech");
  }
  if (kind === "free_production" || kind === "transfer_task" || kind === "reverse_recall") {
    found.add("verified_input");
  }
  if (kind === "write" && step.mode !== "free_reflection") found.add("verified_input");
  if (kind === "write" && step.mode !== "free_reflection" && hasAssemblyBank(step)) {
    found.add("assembly");
  }
  if (kind === "map_direction" && (step.audioText || /\bou[cç]a\b/i.test(step.title ?? ""))) {
    found.add("audio");
  }
  if (kind === "conversation_scene") found.add("choice");
  if (kind === "substitution_drill") {
    if (hasSelectableOptions(step)) found.add("choice");
    else found.add("verified_input");
  }
  if (
    hasAssemblyBank(step) &&
    (kind === "reverse_recall" || kind === "free_production" || kind === "write" || kind === "transfer_task")
  ) {
    found.add("assembly");
  }
  if (hasSelectableOptions(step)) found.add("choice");

  if (found.size === 0) found.add("continue_only");
  if (isIntentionalFreeReflection(step)) {
    found.clear();
    found.add("continue_only");
  }
  if (kind === "intro" || kind === "flashcard" || kind === "microread" || kind === "hanzi_evolution") {
    found.add("continue_only");
  }
  return [...found];
}

export function requiredActionFor(step: LessonStep, verbs: InstructionVerb[]): string {
  if (verbs.some((verb) => SPEAK_VERBS.has(verb))) return "falar (com texto de apoio)";
  if (verbs.some((verb) => ASSEMBLE_VERBS.has(verb))) return "montar peças";
  if (verbs.some((verb) => WRITE_VERBS.has(verb))) return "escrever e verificar";
  if (verbs.some((verb) => CHOICE_VERBS.has(verb))) return "escolher opção";
  if (verbs.includes("ouca")) return "ouvir";
  if (verbs.includes("combine")) return "combinar pares";
  if (verbs.includes("pense") || isIntentionalFreeReflection(step)) return "refletir (opcional)";
  if (step.kind === "hanzi_build") return "montar hànzì";
  if (step.kind === "sentence_build" || step.kind === "produce") return "montar peças";
  if (step.kind === "free_production" || step.kind === "reverse_recall") return "produzir a resposta";
  if (PASSIVE_STEP_KINDS.has(step.kind)) return "continuar após o estímulo";
  return `interagir (${step.kind})`;
}

function instructionMismatch(verbs: InstructionVerb[], interactions: AvailableInteraction[]): boolean {
  const hasAssemble = interactions.includes("assembly") || interactions.includes("hanzi_builder");
  const hasSpeak = interactions.includes("speech") || interactions.includes("verified_input");
  const hasChoice = interactions.includes("choice") || interactions.includes("match");
  const hasAudio = interactions.includes("audio");
  const hasWrite = interactions.includes("verified_input") || interactions.includes("assembly");
  const actionVerbs = verbs.filter((verb) => verb !== "qual" && verb !== "pense");
  const qualIsInterrogative = actionVerbs.length > 0;

  for (const verb of verbs) {
    if (verb === "qual" && qualIsInterrogative) continue;
    if (SPEAK_VERBS.has(verb) && !hasSpeak) return true;
    if (WRITE_VERBS.has(verb) && !hasWrite) return true;
    if (ASSEMBLE_VERBS.has(verb) && !hasAssemble) return true;
    if (verb === "escolha" && !hasChoice) return true;
    if (verb === "qual" && !hasChoice) return true;
    if (verb === "ouca" && !hasAudio) return true;
    if (verb === "combine" && !(interactions.includes("match") || hasAssemble)) return true;
  }
  return false;
}

function isDeadScreen(step: LessonStep, interactions: AvailableInteraction[], verbs: InstructionVerb[]): boolean {
  if (PASSIVE_STEP_KINDS.has(step.kind)) return false;
  if (isIntentionalFreeReflection(step) && !verbs.some((verb) => SPEAK_VERBS.has(verb) || ASSEMBLE_VERBS.has(verb))) {
    return false;
  }
  const live = interactions.filter((item) => item !== "continue_only");
  return live.length === 0;
}

function isImeOnlyBlock(step: LessonStep, interactions: AvailableInteraction[]): boolean {
  const cjk = expectedCjk(step);
  if (!cjk) return false;
  const producesHanzi =
    step.kind === "write" ||
    step.kind === "reverse_recall" ||
    step.kind === "free_production" ||
    step.kind === "transfer_task" ||
    step.kind === "dictation";
  if (!producesHanzi) return false;
  const hasNonIme =
    interactions.includes("assembly") ||
    interactions.includes("hanzi_builder") ||
    interactions.includes("choice") ||
    interactions.includes("match") ||
    interactions.includes("speech");
  return !hasNonIme;
}

/**
 * Runtime materialization that LessonPlayer applies before render.
 * reverse_recall is never optional reflection; CJK production always gets a piece bank.
 */
function withCjkPieceBank(
  step: LessonStep,
  answer: string,
  mode: "assembly" | "help" = "assembly"
): LessonStep {
  if (!containsCjkGlyph(answer) || hasAssemblyBank(step)) return step;
  const bank = cjkPieceBank(answer);
  if (bank.length === 0) return step;
  if (mode === "help") {
    return {
      ...step,
      productionHelpBuildBank: step.productionHelpBuildBank ?? bank,
    };
  }
  const parts = Array.from(answer).filter((ch) => CJK_RE.test(ch));
  return {
    ...step,
    productionHelpBuildBank: step.productionHelpBuildBank ?? bank,
    wordBank: step.wordBank ?? bank,
    bank: step.bank ?? bank,
    targetParts: step.targetParts ?? (parts.length ? parts : undefined),
  };
}

export function materializeRuntimeStep(step: LessonStep): LessonStep {
  if (step.kind === "reverse_recall") {
    const answer = step.answer ?? step.correctAnswer ?? "";
    const bank =
      (step.productionHelpBuildBank?.length ?? 0) > 0
        ? step.productionHelpBuildBank
        : (step.wordBank?.length ?? 0) > 0
          ? step.wordBank
          : cjkPieceBank(answer);
    const next: LessonStep = {
      ...step,
      mode: undefined,
      suggestion: suggestionLeaksAnswer(step) ? undefined : step.suggestion,
      correctAnswer: step.correctAnswer ?? answer,
      productionHelpBuildBank: bank,
      wordBank: step.wordBank ?? bank,
    };
    return next;
  }
  if (step.kind === "free_production" || step.kind === "transfer_task") {
    // Open production cannot carry a piece bank (validateExercise treats that
    // as recognition). Speech + typed input is the IME-free path.
    if (step.productionOpen) return step;
    return withCjkPieceBank(step, step.correctAnswer ?? step.answer ?? "", "help");
  }
  if (step.kind === "dictation" && (step.dictationMode === "hanzi" || !step.dictationMode)) {
    return withCjkPieceBank(step, step.correctAnswer ?? step.answer ?? step.hanzi ?? "");
  }
  if (step.kind === "write" && step.mode !== "free_reflection") {
    return withCjkPieceBank(step, step.answer ?? step.correctAnswer ?? "");
  }
  if (step.kind === "map_direction" && /\bou[cç]a\b/i.test(step.title ?? "") && !step.audioText) {
    return { ...step, audioText: step.prompt ?? step.promptPt ?? step.mapToLabel ?? "一直走" };
  }
  return step;
}

export function makeReverseRecall(
  title: string,
  situationPt: string,
  answer: string,
  accepts?: string[]
): LessonStep {
  const bank = cjkPieceBank(answer);
  return {
    kind: "reverse_recall",
    title,
    situationPt,
    body: situationPt,
    answer,
    correctAnswer: answer,
    accepts: accepts ?? [answer],
    isNoHint: true,
    productionHelpBuildBank: bank.length ? bank : undefined,
    wordBank: bank.length ? bank : undefined,
  };
}

export function auditStepFeasibility(
  step: LessonStep,
  meta: { lessonId: string; pass: number; index: number; stage?: string }
): StepFeasibility {
  const runtime = materializeRuntimeStep(step);
  const verbs = instructionVerbsFor(runtime);
  const interactions = availableInteractionsFor(runtime);
  const graded = isEvaluableQuestionStep(runtime);
  const intentionalReflection = isIntentionalFreeReflection(runtime);
  const passive = PASSIVE_STEP_KINDS.has(runtime.kind);
  const issues: FeasibilityIssueCode[] = [];
  const detail: string[] = [];

  if (runtime.kind === "write" && runtime.mode == null) {
    issues.push("write_mode_missing");
    detail.push("kind=write sem mode explícito");
  }
  if (step.kind === "reverse_recall" && step.mode === "free_reflection") {
    issues.push("invalid_interaction");
    detail.push("reverse_recall com mode=free_reflection (produção virava Continuar)");
  }
  if (intentionalReflection && isProductionStep(step)) {
    issues.push("reflection_as_production");
    detail.push("free_reflection não pode contar como produção");
  }
  if (intentionalReflection && GRADED_STEP_KINDS.includes(step.kind) && step.kind === "write") {
    /* write+free_reflection is excluded from graded — ok */
  }
  if (intentionalReflection && verbs.some((verb) => SPEAK_VERBS.has(verb) || ASSEMBLE_VERBS.has(verb))) {
    issues.push("instruction_mismatch");
    detail.push("reflexão opcional com verbo de produção (Diga/Monte)");
  }
  if (intentionalReflection && /^diga\b/i.test(runtime.title ?? "")) {
    issues.push("instruction_mismatch");
    detail.push("reflexão com título Diga");
  }

  if (suggestionLeaksAnswer(step) || suggestionLeaksAnswer(runtime)) {
    issues.push("answer_leak");
    detail.push("suggestion igual à resposta antes da tentativa");
  }

  if (!passive && !intentionalReflection) {
    if (verbs.some((verb) => SPEAK_VERBS.has(verb)) && verbs.some((verb) => ASSEMBLE_VERBS.has(verb))) {
      issues.push("instruction_mismatch");
      detail.push("Diga/Fale e Monte no mesmo enunciado — o aluno não tem uma ação só");
    }
    if (instructionMismatch(verbs, interactions)) {
      issues.push("instruction_mismatch");
      detail.push(`verbo [${verbs.join(", ")}] ≠ interação [${interactions.join(", ")}]`);
    }
  }

  if (isImeOnlyBlock(runtime, interactions)) {
    issues.push("ime_only");
    detail.push("produção de hànzì só via textarea (sem builder/banco/montagem)");
  }

  if (isDeadScreen(runtime, interactions, verbs)) {
    issues.push("dead_screen");
    detail.push("único avanço é Continuar, sem ação curricular");
  }

  const live = interactions.filter((item) => item !== "continue_only");
  if (!passive && !intentionalReflection && live.length === 0) {
    issues.push("missing_action");
    issues.push("invalid_interaction");
    detail.push("sem ação coerente na UI");
  }

  if (graded && live.length === 0) {
    issues.push("invalid_interaction");
    detail.push("passo avaliado sem mecanismo de resposta");
  }

  return {
    lessonId: meta.lessonId,
    pass: meta.pass,
    stage: meta.stage ?? "",
    index: meta.index,
    kind: runtime.kind,
    title: runtime.title ?? runtime.prompt ?? runtime.kind,
    instructionVerbs: verbs,
    requiredAction: requiredActionFor(runtime, verbs),
    availableInteractions: interactions,
    graded,
    skippable: graded,
    answerVisibleBeforeAttempt: suggestionLeaksAnswer(step) || suggestionLeaksAnswer(runtime),
    feasible: issues.length === 0,
    intentionalReflection,
    passive,
    issues: [...new Set(issues)],
    detail,
  };
}

export function emptyFeasibilityTotals(): FeasibilityTotals {
  return {
    totalSteps: 0,
    interactive: 0,
    passive: 0,
    intentionalReflection: 0,
    invalidInteraction: 0,
    instructionMismatch: 0,
    answerLeak: 0,
    imeOnly: 0,
    deadScreen: 0,
  };
}

export function addFeasibilityTotals(totals: FeasibilityTotals, row: StepFeasibility): void {
  totals.totalSteps += 1;
  if (row.intentionalReflection) totals.intentionalReflection += 1;
  else if (row.passive) totals.passive += 1;
  else totals.interactive += 1;
  if (row.issues.includes("invalid_interaction") || row.issues.includes("missing_action")) {
    totals.invalidInteraction += 1;
  }
  if (row.issues.includes("instruction_mismatch")) totals.instructionMismatch += 1;
  if (row.issues.includes("answer_leak")) totals.answerLeak += 1;
  if (row.issues.includes("ime_only")) totals.imeOnly += 1;
  if (row.issues.includes("dead_screen")) totals.deadScreen += 1;
}

export function withEvaluableQuestionNumbers<T extends LessonStep & { lessonStageId?: string }>(
  steps: T[]
): T[] {
  const stageOf = (step: T) => step.lessonStageId ?? "_";
  const totals = new Map<string, number>();
  for (const step of steps) {
    if (!isEvaluableQuestionStep(step)) continue;
    const key = stageOf(step);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return steps.map((step) => {
    const key = stageOf(step);
    const total = totals.get(key) ?? 0;
    if (!isEvaluableQuestionStep(step)) {
      return { ...step, lessonStageQuestion: 0, lessonStageQuestionCount: total };
    }
    const next = (seen.get(key) ?? 0) + 1;
    seen.set(key, next);
    return { ...step, lessonStageQuestion: next, lessonStageQuestionCount: total };
  });
}
