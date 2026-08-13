/**
 * PED-016–020 — lexical progression helpers (pure).
 * Windowed analysis of hanzi tokens across consecutive lessons.
 */

export type LexicalStepLike = {
  kind?: string;
  text?: string;
  hanzi?: string;
  prompt?: string;
  correctAnswer?: string;
  answer?: string;
  explanation?: string;
  options?: string[];
  target?: string[];
  targetParts?: string[];
  introducesNewVocabulary?: string[];
  reusesPreviousVocabulary?: string[];
  mode?: string;
  objective?: string;
};

export type LexicalLessonLike = {
  id: string;
  title?: string;
  phaseOrder?: number;
  libraryItems?: string[];
  reviewItems?: string[];
  focusGrammar?: string[];
  steps?: LexicalStepLike[];
};

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[　-〿！-￯,.!?\s:;"'()？！。，、]/g;

/** Seed greetings that must not dominate early windows without modality variety. */
export const SEED_GREETING_TOKENS = ["你好", "谢谢", "再见", "不客气", "早上好", "晚上好"] as const;

export const LEXICAL_WINDOW_MIN = 3;
export const LEXICAL_WINDOW_MAX = 5;

/** Early-lesson thresholds (L1–L20). */
export const EARLY_LEXICAL_THRESHOLDS = {
  /** Max share of a single seed greeting across a 5-lesson window (token occurrences). */
  maxSeedGreetingConcentration: 0.45,
  /** Max lessons in a 5-window that are dominated by the same seed greeting. */
  maxSeedDominatedLessonsInWindow: 3,
  /** Soft cap: novelty load mean per graded step in early lessons. */
  maxMeanNoveltyLoad: 4.5,
  /** Excess repetition: same token in >N graded steps of one lesson without reuse credit. */
  maxTokenStepsPerLesson: 8,
} as const;

export function cleanHanzi(value: unknown): string {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

/** Extract CJK tokens: prefer multi-char chunks (2–4), else single glyphs. */
export function extractHanziTokensFromText(text: unknown): string[] {
  const cleaned = cleanHanzi(text);
  if (!cleaned) return [];
  const tokens: string[] = [];
  // Prefer known seed greetings as atomic tokens when present.
  let rest = cleaned;
  for (const seed of SEED_GREETING_TOKENS) {
    if (rest.includes(seed)) {
      tokens.push(seed);
      rest = rest.split(seed).join("");
    }
  }
  // Remaining: emit contiguous CJK runs split into 2-char bigrams + leftover glyphs.
  const runs = rest.match(/[\u3400-\u9fff\uf900-\ufaff]+/gu) ?? [];
  for (const run of runs) {
    if (run.length <= 2) {
      tokens.push(run);
      continue;
    }
    for (let i = 0; i < run.length; i += 2) {
      tokens.push(run.slice(i, Math.min(i + 2, run.length)));
    }
  }
  return tokens.filter((t) => CJK_RE.test(t[0] ?? ""));
}

export function extractTokensFromStep(step: LexicalStepLike): string[] {
  const blobs: unknown[] = [
    step.text,
    step.hanzi,
    step.correctAnswer,
    step.answer,
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
    ...(step.options ?? []),
    ...(step.introducesNewVocabulary ?? []),
    ...(step.reusesPreviousVocabulary ?? []),
  ];
  const out: string[] = [];
  for (const blob of blobs) {
    out.push(...extractHanziTokensFromText(blob));
  }
  return out;
}

export function extractTokensFromLesson(
  lesson: LexicalLessonLike,
  plannedSteps?: LexicalStepLike[]
): string[] {
  const steps = plannedSteps ?? lesson.steps ?? [];
  const fromSteps = steps.flatMap(extractTokensFromStep);
  const fromLibrary: string[] = [];
  for (const ref of [...(lesson.libraryItems ?? []), ...(lesson.reviewItems ?? [])]) {
    const id = String(ref).split(":")[1] ?? "";
    // Heuristic: chunk ids often encode reading (nihao); keep raw ref hanzi if embedded.
    fromLibrary.push(...extractHanziTokensFromText(id));
  }
  return [...fromSteps, ...fromLibrary];
}

export function tokenCounts(tokens: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }
  return map;
}

/** Share of the most frequent token among all tokens (0–1). */
export function concentrationScore(tokens: readonly string[]): { topToken: string | null; share: number } {
  if (tokens.length === 0) return { topToken: null, share: 0 };
  const counts = tokenCounts(tokens);
  let topToken: string | null = null;
  let top = 0;
  for (const [token, count] of counts) {
    if (count > top) {
      top = count;
      topToken = token;
    }
  }
  return { topToken, share: top / tokens.length };
}

export function noveltyTokens(
  current: readonly string[],
  priorSeen: ReadonlySet<string>
): string[] {
  const novel: string[] = [];
  const seenHere = new Set<string>();
  for (const token of current) {
    if (priorSeen.has(token) || seenHere.has(token)) continue;
    seenHere.add(token);
    novel.push(token);
  }
  return novel;
}

export function reuseVsExcess(
  tokens: readonly string[],
  priorSeen: ReadonlySet<string>
): { reuseCount: number; excessRepetition: number; novelCount: number } {
  const counts = tokenCounts(tokens);
  let reuseCount = 0;
  let excessRepetition = 0;
  let novelCount = 0;
  for (const [token, count] of counts) {
    if (priorSeen.has(token)) {
      reuseCount += count;
      // First reuse is healthy; extras beyond 3 in-window count as excess.
      excessRepetition += Math.max(0, count - 3);
    } else {
      novelCount += 1;
      excessRepetition += Math.max(0, count - 4);
    }
  }
  return { reuseCount, excessRepetition, novelCount };
}

const NEW_FORMAT_KINDS = new Set([
  "conversation_scene",
  "transfer_task",
  "free_production",
  "odd_one_out",
  "spot_error",
  "dictation",
  "audio_discrimination",
  "hanzi_build",
]);

/**
 * Rough novelty load per step: new vocab + new format + new concept flags.
 */
export function noveltyLoadForStep(
  step: LexicalStepLike,
  priorTokens: ReadonlySet<string>,
  priorKinds: ReadonlySet<string>,
  priorConcepts: ReadonlySet<string>
): number {
  const stepTokens = extractTokensFromStep(step);
  const newVocab = noveltyTokens(stepTokens, priorTokens).length > 0 ? 1 : 0;
  const newFormat =
    step.kind && !priorKinds.has(step.kind) && NEW_FORMAT_KINDS.has(step.kind) ? 1 : 0;
  const conceptBlobs = [step.objective, step.mode, step.explanation].filter(Boolean).map(String);
  let newConcept = 0;
  for (const blob of conceptBlobs) {
    const key = blob.slice(0, 48);
    if (key && !priorConcepts.has(key)) {
      newConcept = 1;
      break;
    }
  }
  const introduces = (step.introducesNewVocabulary?.length ?? 0) > 0 ? 1 : 0;
  return newVocab + newFormat + newConcept + introduces;
}

export type LessonLexicalMetrics = {
  lessonId: string;
  title: string;
  tokens: string[];
  concentration: { topToken: string | null; share: number };
  novelCount: number;
  reuseCount: number;
  excessRepetition: number;
  meanNoveltyLoad: number;
  seedGreetingShare: number;
  dominatedBySeed: string | null;
};

export function metricsForLesson(
  lesson: LexicalLessonLike,
  plannedSteps: LexicalStepLike[] | undefined,
  priorTokens: ReadonlySet<string>
): LessonLexicalMetrics {
  const steps = plannedSteps ?? lesson.steps ?? [];
  const tokens = extractTokensFromLesson(lesson, steps);
  const concentration = concentrationScore(tokens);
  const { novelCount, reuseCount, excessRepetition } = reuseVsExcess(tokens, priorTokens);

  const priorKinds = new Set<string>();
  const priorConcepts = new Set<string>();
  let noveltySum = 0;
  let graded = 0;
  const runningTokens = new Set(priorTokens);
  for (const step of steps) {
    const load = noveltyLoadForStep(step, runningTokens, priorKinds, priorConcepts);
    for (const t of extractTokensFromStep(step)) runningTokens.add(t);
    if (step.kind) priorKinds.add(step.kind);
    if (step.objective) priorConcepts.add(String(step.objective).slice(0, 48));
    noveltySum += load;
    graded += 1;
  }

  const seedCounts = tokenCounts(tokens);
  let seedTotal = 0;
  let topSeed: string | null = null;
  let topSeedCount = 0;
  for (const seed of SEED_GREETING_TOKENS) {
    const c = seedCounts.get(seed) ?? 0;
    seedTotal += c;
    if (c > topSeedCount) {
      topSeedCount = c;
      topSeed = seed;
    }
  }
  const seedGreetingShare = tokens.length ? seedTotal / tokens.length : 0;
  const dominatedBySeed =
    topSeed && concentration.topToken === topSeed && concentration.share >= 0.28 ? topSeed : null;

  return {
    lessonId: lesson.id,
    title: lesson.title ?? lesson.id,
    tokens,
    concentration,
    novelCount,
    reuseCount,
    excessRepetition,
    meanNoveltyLoad: graded ? noveltySum / graded : 0,
    seedGreetingShare,
    dominatedBySeed,
  };
}

export type WindowLexicalReport = {
  startIndex: number;
  endIndex: number;
  lessonIds: string[];
  tokens: string[];
  concentration: { topToken: string | null; share: number };
  seedGreetingConcentration: { token: string | null; share: number };
  dominatedLessonCount: number;
  dominatedBy: string | null;
};

export function analyzeWindows(
  lessonMetrics: readonly LessonLexicalMetrics[],
  windowSize: number = LEXICAL_WINDOW_MAX
): WindowLexicalReport[] {
  const size = Math.min(LEXICAL_WINDOW_MAX, Math.max(LEXICAL_WINDOW_MIN, windowSize));
  const reports: WindowLexicalReport[] = [];
  for (let i = 0; i + size <= lessonMetrics.length; i += 1) {
    const slice = lessonMetrics.slice(i, i + size);
    const tokens = slice.flatMap((m) => m.tokens);
    const concentration = concentrationScore(tokens);
    let seedToken: string | null = null;
    let seedCount = 0;
    const seedTotals = new Map<string, number>();
    for (const seed of SEED_GREETING_TOKENS) {
      let c = 0;
      for (const t of tokens) if (t === seed) c += 1;
      seedTotals.set(seed, c);
      if (c > seedCount) {
        seedCount = c;
        seedToken = seed;
      }
    }
    const seedShare = tokens.length ? seedCount / tokens.length : 0;
    const dominatedBy = seedToken;
    const dominatedLessonCount = dominatedBy
      ? slice.filter((m) => m.dominatedBySeed === dominatedBy).length
      : 0;
    reports.push({
      startIndex: i,
      endIndex: i + size - 1,
      lessonIds: slice.map((m) => m.lessonId),
      tokens,
      concentration,
      seedGreetingConcentration: { token: seedToken, share: seedShare },
      dominatedLessonCount,
      dominatedBy: dominatedLessonCount > 0 ? dominatedBy : null,
    });
  }
  return reports;
}

export type LexicalProgressionIssue = {
  code: string;
  lessonIds: string[];
  message: string;
};

/**
 * Fail when seed greetings abusively dominate consecutive lessons
 * without modality-only credit (same greeting as top token across the window).
 *
 * Within-lesson repetition of the teaching focus is expected in L1–L20 and is
 * reported as soft warnings elsewhere — not a hard gate.
 */
export function findLexicalProgressionIssues(
  lessonMetrics: readonly LessonLexicalMetrics[],
  thresholds: typeof EARLY_LEXICAL_THRESHOLDS = EARLY_LEXICAL_THRESHOLDS
): LexicalProgressionIssue[] {
  const issues: LexicalProgressionIssue[] = [];
  const windows = analyzeWindows(lessonMetrics, LEXICAL_WINDOW_MAX);

  for (const window of windows) {
    const { token, share } = window.seedGreetingConcentration;
    if (
      token &&
      SEED_GREETING_TOKENS.includes(token as (typeof SEED_GREETING_TOKENS)[number]) &&
      share >= thresholds.maxSeedGreetingConcentration &&
      window.dominatedLessonCount >= thresholds.maxSeedDominatedLessonsInWindow
    ) {
      issues.push({
        code: "seed_greeting_concentration",
        lessonIds: window.lessonIds,
        message:
          `Janela ${window.lessonIds.join(" → ")}: "${token}" concentra ${(share * 100).toFixed(0)}% ` +
          `dos tokens e domina ${window.dominatedLessonCount} lições (limite ` +
          `${thresholds.maxSeedDominatedLessonsInWindow} / ${(thresholds.maxSeedGreetingConcentration * 100).toFixed(0)}%). ` +
          `Não há crédito só por mudar a modalidade.`,
      });
    }
  }

  return issues;
}

/** Soft diagnostics (novelty / excess) — report only, do not gate beta. */
export function findLexicalProgressionWarnings(
  lessonMetrics: readonly LessonLexicalMetrics[],
  thresholds: typeof EARLY_LEXICAL_THRESHOLDS = EARLY_LEXICAL_THRESHOLDS
): LexicalProgressionIssue[] {
  const warnings: LexicalProgressionIssue[] = [];
  for (const metrics of lessonMetrics) {
    if (metrics.meanNoveltyLoad > thresholds.maxMeanNoveltyLoad) {
      warnings.push({
        code: "novelty_overload",
        lessonIds: [metrics.lessonId],
        message: `${metrics.lessonId}: novelty load médio ${metrics.meanNoveltyLoad.toFixed(2)} > ${thresholds.maxMeanNoveltyLoad}`,
      });
    }
    const counts = tokenCounts(metrics.tokens);
    for (const [token, count] of counts) {
      if (
        SEED_GREETING_TOKENS.includes(token as (typeof SEED_GREETING_TOKENS)[number]) &&
        count > thresholds.maxTokenStepsPerLesson
      ) {
        warnings.push({
          code: "seed_excess_in_lesson",
          lessonIds: [metrics.lessonId],
          message: `${metrics.lessonId}: seed "${token}" aparece ${count}× (aviso > ${thresholds.maxTokenStepsPerLesson})`,
        });
      }
    }
  }
  return warnings;
}

/**
 * Artificial fixture: inject forced seed repetition so the validator MUST fail.
 * Used by scripts/validate-lexical-progression.mjs as a meta-test.
 */
export function buildForcedRepetitionFixture(): LessonLexicalMetrics[] {
  const make = (id: string): LessonLexicalMetrics => ({
    lessonId: id,
    title: id,
    tokens: Array.from({ length: 20 }, () => "你好"),
    concentration: { topToken: "你好", share: 1 },
    novelCount: 0,
    reuseCount: 20,
    excessRepetition: 17,
    meanNoveltyLoad: 0.2,
    seedGreetingShare: 1,
    dominatedBySeed: "你好",
  });
  return [make("fix_a"), make("fix_b"), make("fix_c"), make("fix_d"), make("fix_e")];
}
