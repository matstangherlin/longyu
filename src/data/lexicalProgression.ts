/**
 * PED-016–027 — lexical progression helpers (pure).
 * Windowed analysis of pedagogical opportunities across consecutive lessons.
 *
 * PED-022: hard gates for extreme within-lesson seed repetition.
 * PED-025: separate lexical / structural / modality / recovery metrics —
 * modality-only reuse of the same chunk is not automatic curriculum progress.
 */

export type LexicalStepLike = {
  kind?: string;
  text?: string;
  hanzi?: string;
  prompt?: string;
  correctAnswer?: string;
  answer?: string;
  audioText?: string;
  explanation?: string;
  options?: string[];
  target?: string[];
  targetParts?: string[];
  sentenceBefore?: string;
  sentenceAfter?: string;
  blankAnswer?: string;
  lines?: Array<{ hanzi?: string; pinyin?: string; pt?: string }>;
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
  isReview?: boolean;
  skill?: string;
  curriculumRole?: string;
  steps?: LexicalStepLike[];
};

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[　-〿！-￯,.!?\s:;"'()？！。，、]/g;

/** Seed greetings that must not dominate early windows without structural growth. */
export const SEED_GREETING_TOKENS = ["你好", "谢谢", "再见", "不客气", "早上好", "晚上好"] as const;

/**
 * Longer phrases first so 你好吗 is not counted as 你好 (PED-021/025).
 * Includes common early chunks that absorb seed substrings.
 */
export const ATOMIC_PHRASE_TOKENS = [
  "不客气",
  "没关系",
  "对不起",
  "早上好",
  "晚上好",
  "明天见",
  "请再说一遍",
  "我不会说中文",
  "我会说一点中文",
  "我听不懂",
  "认识你很高兴",
  "你是哪国人？",
  "你是哪国人",
  "我是巴西人",
  "我是学生",
  "我有三个朋友",
  "你会说英语吗？",
  "你会说英语吗",
  "今天很好",
  "这个多少钱？",
  "这个多少钱",
  "多少钱？",
  "多少钱",
  "太贵了",
  "便宜一点",
  "什么时候？",
  "什么时候",
  "怎么样？",
  "怎么样",
  "在哪里？",
  "在哪里",
  "这是什么？",
  "这是什么",
  "你好吗",
  "请问",
  "请坐",
  "请进",
  "晚安",
  "等一下",
  "我很好",
  "你好",
  "谢谢",
  "再见",
] as const;

export const LEXICAL_WINDOW_MIN = 3;
export const LEXICAL_WINDOW_MAX = 5;

/**
 * PED-022 thresholds (L1–L20).
 * Counts are pedagogical opportunities (unique primary target per step),
 * not every UI option / planner vocab stamp.
 */
export const EARLY_LEXICAL_THRESHOLDS = {
  /** Max share of a single seed greeting across a 5-lesson window. */
  maxSeedGreetingConcentration: 0.45,
  /** Max lessons in a 5-window dominated by the same seed greeting. */
  maxSeedDominatedLessonsInWindow: 3,
  /** Soft cap: novelty load mean per graded step. */
  maxMeanNoveltyLoad: 4.5,
  /**
   * Normal lesson seed opportunities of the same chunk:
   * ≤8 acceptable; 9–12 warning; >12 hard failure.
   */
  maxTokenStepsPerLesson: 8,
  warnTokenStepsPerLesson: 12,
  hardFailTokenStepsPerLesson: 12,
  /**
   * Review / explicit focus lessons may reuse more, still capped.
   * ≤14 acceptable; 15–18 warning; >18 hard failure.
   */
  reviewMaxTokenStepsPerLesson: 14,
  reviewWarnTokenStepsPerLesson: 18,
  reviewHardFailTokenStepsPerLesson: 18,
} as const;

export function cleanHanzi(value: unknown): string {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
}

export function isSeedGreetingToken(token: string): boolean {
  return (SEED_GREETING_TOKENS as readonly string[]).includes(token);
}

/** Extract CJK tokens: prefer atomic phrases (longest first), else bigrams/glyphs. */
export function extractHanziTokensFromText(text: unknown): string[] {
  const cleaned = cleanHanzi(text);
  if (!cleaned) return [];
  const tokens: string[] = [];
  let rest = cleaned;
  const phrases = [...ATOMIC_PHRASE_TOKENS].sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (!rest.includes(phrase)) continue;
    const parts = rest.split(phrase);
    const occurrences = parts.length - 1;
    for (let i = 0; i < occurrences; i += 1) tokens.push(phrase);
    rest = parts.join("");
  }
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

/**
 * Pedagogical opportunities in one step (PED-022 / PED-025).
 * - Counts primary stimulus / answer / build targets / dialogue lines.
 * - Dedupes within the step (你好 in prompt+answer = 1 opportunity).
 * - Does NOT count MCQ distractors, planner vocab stamps, or UI duplicates.
 */
export function extractTokensFromStep(step: LexicalStepLike): string[] {
  const blobs: unknown[] = [
    step.text,
    step.hanzi,
    step.correctAnswer,
    step.answer,
    step.audioText,
    step.sentenceBefore,
    step.sentenceAfter,
    step.blankAnswer,
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
  ];
  for (const line of step.lines ?? []) {
    blobs.push(line.hanzi);
  }
  const out: string[] = [];
  for (const blob of blobs) {
    out.push(...extractHanziTokensFromText(blob));
  }
  return [...new Set(out)];
}

/**
 * All surface tokens including options (diagnostics only — not for hard gates).
 * Still excludes planner vocab stamps so metadata does not double-count.
 */
export function extractSurfaceTokensFromStep(step: LexicalStepLike): string[] {
  const blobs: unknown[] = [
    step.text,
    step.hanzi,
    step.correctAnswer,
    step.answer,
    step.audioText,
    ...(step.target ?? []),
    ...(step.targetParts ?? []),
    ...(step.options ?? []),
  ];
  for (const line of step.lines ?? []) {
    blobs.push(line.hanzi);
  }
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
  return steps.flatMap(extractTokensFromStep);
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

const STRUCTURAL_HINT_RE =
  /吗|呢|叫|是|的|不|很|请|问|再见|谢谢|你好吗|结构|frase|pergunta|resposta|diálogo|diálogo/i;

/**
 * PED-025 — novelty axes kept separate.
 * A new modality with the same words is modality novelty only, not lexical progress.
 */
export type NoveltyAxes = {
  lexical: number;
  structural: number;
  modality: number;
  recovery: number;
};

export function noveltyAxesForStep(
  step: LexicalStepLike,
  priorTokens: ReadonlySet<string>,
  priorKinds: ReadonlySet<string>,
  priorConcepts: ReadonlySet<string>
): NoveltyAxes {
  const stepTokens = extractTokensFromStep(step);
  const lexical = noveltyTokens(stepTokens, priorTokens).length > 0 ? 1 : 0;
  const modality =
    step.kind && !priorKinds.has(step.kind) && NEW_FORMAT_KINDS.has(step.kind) ? 1 : 0;
  const conceptBlobs = [step.objective, step.mode, step.explanation, step.prompt]
    .filter(Boolean)
    .map(String);
  let structural = 0;
  for (const blob of conceptBlobs) {
    const key = blob.slice(0, 48);
    if (!key || priorConcepts.has(key)) continue;
    if (STRUCTURAL_HINT_RE.test(blob) || (step.kind && ["sentence_build", "fill_blank", "dialogue_choice", "conversation_scene"].includes(step.kind))) {
      structural = 1;
      break;
    }
  }
  const recovery =
    stepTokens.some((t) => priorTokens.has(t)) && lexical === 0 && modality === 0 ? 1 : 0;
  return { lexical, structural, modality, recovery };
}

/**
 * Rough novelty load per step (legacy aggregate — not a progress unit by itself).
 */
export function noveltyLoadForStep(
  step: LexicalStepLike,
  priorTokens: ReadonlySet<string>,
  priorKinds: ReadonlySet<string>,
  priorConcepts: ReadonlySet<string>
): number {
  const axes = noveltyAxesForStep(step, priorTokens, priorKinds, priorConcepts);
  return axes.lexical + axes.structural + axes.modality;
}

export type LessonLexicalMetrics = {
  lessonId: string;
  title: string;
  isReview: boolean;
  tokens: string[];
  concentration: { topToken: string | null; share: number };
  novelCount: number;
  reuseCount: number;
  excessRepetition: number;
  meanNoveltyLoad: number;
  seedGreetingShare: number;
  dominatedBySeed: string | null;
  /** PED-025 aggregates across the lesson (counts of steps with that axis). */
  noveltyAxes: NoveltyAxes;
  /** Top repeated pedagogical tokens in this lesson. */
  topRepeated: Array<{ token: string; count: number }>;
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
  const axesSum: NoveltyAxes = { lexical: 0, structural: 0, modality: 0, recovery: 0 };
  const runningTokens = new Set(priorTokens);
  for (const step of steps) {
    const axes = noveltyAxesForStep(step, runningTokens, priorKinds, priorConcepts);
    axesSum.lexical += axes.lexical;
    axesSum.structural += axes.structural;
    axesSum.modality += axes.modality;
    axesSum.recovery += axes.recovery;
    noveltySum += axes.lexical + axes.structural + axes.modality;
    for (const t of extractTokensFromStep(step)) runningTokens.add(t);
    if (step.kind) priorKinds.add(step.kind);
    if (step.objective) priorConcepts.add(String(step.objective).slice(0, 48));
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

  const topRepeated = [...seedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token, count]) => ({ token, count }));

  return {
    lessonId: lesson.id,
    title: lesson.title ?? lesson.id,
    isReview: Boolean(lesson.isReview),
    tokens,
    concentration,
    novelCount,
    reuseCount,
    excessRepetition,
    meanNoveltyLoad: graded ? noveltySum / graded : 0,
    seedGreetingShare,
    dominatedBySeed,
    noveltyAxes: axesSum,
    topRepeated,
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
    for (const seed of SEED_GREETING_TOKENS) {
      let c = 0;
      for (const t of tokens) if (t === seed) c += 1;
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

function seedCapsForLesson(isReview: boolean, thresholds: typeof EARLY_LEXICAL_THRESHOLDS) {
  if (isReview) {
    return {
      ok: thresholds.reviewMaxTokenStepsPerLesson,
      warn: thresholds.reviewWarnTokenStepsPerLesson,
      fail: thresholds.reviewHardFailTokenStepsPerLesson,
    };
  }
  return {
    ok: thresholds.maxTokenStepsPerLesson,
    warn: thresholds.warnTokenStepsPerLesson,
    fail: thresholds.hardFailTokenStepsPerLesson,
  };
}

/**
 * Hard gates: abusive window concentration + extreme within-lesson seed repetition.
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
      isSeedGreetingToken(token) &&
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

  for (const metrics of lessonMetrics) {
    const caps = seedCapsForLesson(metrics.isReview, thresholds);
    const counts = tokenCounts(metrics.tokens);
    for (const [token, count] of counts) {
      if (!isSeedGreetingToken(token)) continue;
      if (count > caps.fail) {
        issues.push({
          code: "seed_excess_hard",
          lessonIds: [metrics.lessonId],
          message:
            `${metrics.lessonId}${metrics.isReview ? " (review)" : ""}: seed "${token}" tem ` +
            `${count} oportunidades pedagógicas (hard fail > ${caps.fail}` +
            `${metrics.isReview ? "; review exige variedade contextual" : ""}).`,
        });
      }
    }
  }

  return issues;
}

/** Soft diagnostics — report only. */
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
    // PED-023 soft: main lesson should show at least one useful novelty axis.
    if (
      !metrics.isReview &&
      metrics.noveltyAxes.lexical + metrics.noveltyAxes.structural === 0 &&
      metrics.tokens.length > 0
    ) {
      warnings.push({
        code: "missing_useful_novelty",
        lessonIds: [metrics.lessonId],
        message:
          `${metrics.lessonId}: sem novidade lexical/estrutural perceptível ` +
          `(modalidade=${metrics.noveltyAxes.modality}, recuperação=${metrics.noveltyAxes.recovery}).`,
      });
    }
    const caps = seedCapsForLesson(metrics.isReview, thresholds);
    const counts = tokenCounts(metrics.tokens);
    for (const [token, count] of counts) {
      if (!isSeedGreetingToken(token)) continue;
      if (count > caps.ok && count <= caps.fail) {
        warnings.push({
          code: "seed_excess_in_lesson",
          lessonIds: [metrics.lessonId],
          message:
            `${metrics.lessonId}${metrics.isReview ? " (review)" : ""}: seed "${token}" aparece ` +
            `${count}× (aviso > ${caps.ok}; hard > ${caps.fail})`,
        });
      }
    }
  }
  return warnings;
}

/**
 * Artificial fixture: inject forced seed repetition so the validator MUST fail.
 */
export function buildForcedRepetitionFixture(): LessonLexicalMetrics[] {
  const make = (id: string): LessonLexicalMetrics => ({
    lessonId: id,
    title: id,
    isReview: false,
    tokens: Array.from({ length: 20 }, () => "你好"),
    concentration: { topToken: "你好", share: 1 },
    novelCount: 0,
    reuseCount: 20,
    excessRepetition: 17,
    meanNoveltyLoad: 0.2,
    seedGreetingShare: 1,
    dominatedBySeed: "你好",
    noveltyAxes: { lexical: 0, structural: 0, modality: 0, recovery: 20 },
    topRepeated: [{ token: "你好", count: 20 }],
  });
  return [make("fix_a"), make("fix_b"), make("fix_c"), make("fix_d"), make("fix_e")];
}

/** Meta-fixture: single normal lesson with >12 seed opportunities must hard-fail. */
export function buildForcedLessonSeedExcessFixture(): LessonLexicalMetrics[] {
  return [
    {
      lessonId: "fixture_seed_excess",
      title: "fixture",
      isReview: false,
      tokens: Array.from({ length: 14 }, () => "谢谢"),
      concentration: { topToken: "谢谢", share: 1 },
      novelCount: 0,
      reuseCount: 14,
      excessRepetition: 11,
      meanNoveltyLoad: 0.1,
      seedGreetingShare: 1,
      dominatedBySeed: "谢谢",
      noveltyAxes: { lexical: 0, structural: 0, modality: 0, recovery: 14 },
      topRepeated: [{ token: "谢谢", count: 14 }],
    },
  ];
}
