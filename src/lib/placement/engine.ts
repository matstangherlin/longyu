import {
  BASE_QUIZ_LENGTH,
  CATEGORY_LABEL,
  FOUNDATION_LESSON_IDS,
  FOUNDATION_PROOF_LABELS,
  MAX_QUIZ_LENGTH,
  PLACEMENT_CONFIDENCE_THRESHOLD,
  PLACEMENT_DIMENSIONS,
  PLACEMENT_LESSON_ORDER,
  PLACEMENT_VERSION,
  type AssessmentTier,
  type Experience,
  type PlacementAnalysis,
  type PlacementAnswerEvidence,
  type PlacementCompetencyMap,
  type PlacementCompetencyState,
  type PlacementDecision,
  type PlacementDimension,
  type PlacementLevel,
  type QuizCategory,
  type QuizCategoryStat,
  type QuizDifficulty,
  type QuizQuestion,
  type QuizTierStat,
} from "./types";
import { getPlacementQuestion, VALID_PLACEMENT_QUESTIONS } from "./questions";

const CATEGORY_DIFFICULTY: Record<QuizCategory, QuizDifficulty> = {
  meaning: 1,
  sound: 1,
  tone: 2,
  sentence: 2,
  hanzi: 3,
  context: 3,
  speaking: 3,
};

export function experienceScore(level: Experience): number {
  const score: Record<Experience, number> = {
    zero: 0,
    words: 1,
    studied: 2,
    phrases: 3,
    advanced: 4,
  };
  return score[level];
}

export function dimensionOf(question: QuizQuestion): PlacementDimension {
  if (question.layer === "production" || question.category === "speaking") return "production";
  if (question.category === "tone") return "tone";
  if (question.category === "hanzi") return "hanzi";
  if (question.category === "sentence") return "sentence";
  if (question.category === "context") return "context";
  if (question.category === "meaning") return "meaning";
  if (question.audioText) return "listening";
  return "pinyin";
}

export function emptyCompetency(): PlacementCompetencyState {
  return {
    estimate: 0.32,
    evidenceCount: 0,
    confidence: 0,
    highestProvenDifficulty: 0,
    hintDependency: 0,
    contradictionCount: 0,
  };
}

export function emptyCompetencyMap(declared: Experience): PlacementCompetencyMap {
  const prior = 0.22 + experienceScore(declared) * 0.08;
  const map = {} as PlacementCompetencyMap;
  for (const dimension of PLACEMENT_DIMENSIONS) {
    map[dimension] = { ...emptyCompetency(), estimate: prior };
  }
  return map;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampDifficulty(value: number): QuizDifficulty {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

export function quizDifficulty(question: QuizQuestion, declaredLevel: Experience): QuizDifficulty {
  if (question.difficulty) return question.difficulty;
  const liftedByDeclaredLevel = Math.min(1, experienceScore(declaredLevel));
  return clampDifficulty(CATEGORY_DIFFICULTY[question.category] + liftedByDeclaredLevel);
}

export function updateCompetency(
  state: PlacementCompetencyState,
  input: { correct: boolean; hinted: boolean; difficulty: QuizDifficulty }
): PlacementCompetencyState {
  const next: PlacementCompetencyState = { ...state };
  next.evidenceCount += 1;
  const observation = input.correct ? (input.hinted ? 0.52 : 0.18 + input.difficulty * 0.2) : 0.12;
  const learningRate = input.hinted && input.correct ? 0.14 : 0.3;
  const prev = next.estimate;
  next.estimate = clamp01(prev + learningRate * (observation - prev));
  if (input.correct && !input.hinted) {
    next.highestProvenDifficulty = Math.max(next.highestProvenDifficulty, input.difficulty);
  }
  if (input.hinted) {
    next.hintDependency = clamp01(next.hintDependency * 0.72 + (input.correct ? 0.4 : 0.18));
  } else if (input.correct) {
    next.hintDependency *= 0.7;
  }
  if ((prev > 0.62 && !input.correct) || (prev < 0.32 && input.correct && !input.hinted && input.difficulty >= 2)) {
    next.contradictionCount += 1;
  }
  const contradictionPenalty = Math.min(0.55, next.contradictionCount * 0.14);
  const hintPenalty = input.hinted && input.correct ? 0.45 : 0;
  next.confidence = clamp01((1 - Math.exp(-next.evidenceCount / 2.1)) * (1 - contradictionPenalty) * (1 - hintPenalty));
  return next;
}

export function competenciesFromEvidence(
  declared: Experience,
  answers: PlacementAnswerEvidence[]
): PlacementCompetencyMap {
  const map = emptyCompetencyMap(declared);
  for (const evidence of answers) {
    const question = getPlacementQuestion(evidence.questionId);
    if (!question) continue;
    const dimension = dimensionOf(question);
    const correct = normalizeMatch(evidence.answer, question.answer);
    map[dimension] = updateCompetency(map[dimension], {
      correct,
      hinted: evidence.hintUsed,
      difficulty: quizDifficulty(question, declared),
    });
  }
  return map;
}

function normalizeMatch(given: string, expected: string): boolean {
  return given.trim() === expected.trim();
}

export function informationValue(
  question: QuizQuestion,
  competencies: PlacementCompetencyMap,
  declared: Experience,
  answeredIds: Set<string>
): number {
  if (answeredIds.has(question.id) || !question.difficulty) return Number.NEGATIVE_INFINITY;
  const dimension = dimensionOf(question);
  const state = competencies[dimension];
  const uncertainty = 1 - state.confidence;
  const targetDifficulty = clampDifficulty(Math.max(1, Math.round(state.estimate * 4)));
  const diffGap = Math.abs(question.difficulty - targetDifficulty);
  const uncovered = state.evidenceCount === 0 ? 0.85 : state.evidenceCount === 1 ? 0.25 : 0;
  const strugglingBeginner =
    declared === "zero" &&
    (competencies.meaning.estimate < 0.42 || competencies.pinyin.estimate < 0.42 || competencies.tone.estimate < 0.42);
  if (strugglingBeginner && question.difficulty >= 3) return uncertainty * 0.04 - diffGap;
  const advancedReady = state.estimate >= 0.72 && state.highestProvenDifficulty >= 3 && !state.hintDependency;
  if (advancedReady && question.difficulty < 3) return uncertainty * 0.2;
  const foundationBoost =
    question.essential && (dimension === "pinyin" || dimension === "tone" || dimension === "hanzi" || dimension === "meaning")
      ? 0.35
      : 0;
  return uncertainty * 1.45 + uncovered - diffGap * 0.38 + foundationBoost;
}

export function chooseNextQuestion(
  declared: Experience,
  answers: PlacementAnswerEvidence[],
  askedQuestionIds: string[] = answers.map((item) => item.questionId)
): QuizQuestion | null {
  const competencies = competenciesFromEvidence(declared, answers);
  const answeredIds = new Set(askedQuestionIds);
  let best: QuizQuestion | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const question of VALID_PLACEMENT_QUESTIONS) {
    const value = informationValue(question, competencies, declared, answeredIds);
    if (value > bestValue) {
      best = question;
      bestValue = value;
    }
  }
  return best;
}

export function placementOverallConfidence(
  competencies: PlacementCompetencyMap,
  dimensions: PlacementDimension[]
): number {
  if (!dimensions.length) return 0;
  const relevant = dimensions.map((dimension) => competencies[dimension]);
  const minConf = Math.min(...relevant.map((state) => state.confidence));
  const mean = relevant.reduce((sum, state) => sum + state.confidence, 0) / relevant.length;
  return Math.min(minConf, mean);
}

function foundationDimensions(): PlacementDimension[] {
  return ["meaning", "listening", "pinyin", "tone"];
}

export function shouldStopPlacement(
  declared: Experience,
  answers: PlacementAnswerEvidence[],
  competencies = competenciesFromEvidence(declared, answers)
): boolean {
  const answered = answers.length;
  const maxLength = MAX_QUIZ_LENGTH[declared];
  const baseLength = BASE_QUIZ_LENGTH[declared];
  if (answered >= maxLength) return true;
  if (answered < Math.min(4, baseLength)) return false;

  const foundationFailing =
    competencies.meaning.estimate < 0.38 &&
    competencies.pinyin.estimate < 0.4 &&
    competencies.tone.estimate < 0.4 &&
    competencies.listening.estimate < 0.45 &&
    answers.filter((item) => {
      const question = getPlacementQuestion(item.questionId);
      if (!question) return false;
      return !normalizeMatch(item.answer, question.answer);
    }).length >= 3;

  if (declared === "zero" && foundationFailing) {
    const conf = placementOverallConfidence(competencies, foundationDimensions());
    if (answered >= baseLength - 1 && conf >= 0.55) return true;
    if (answered >= 4 && conf >= PLACEMENT_CONFIDENCE_THRESHOLD) return true;
  }

  if (answered < baseLength) return false;

  const skipDims: PlacementDimension[] = [...PLACEMENT_DIMENSIONS];
  const conf = placementOverallConfidence(competencies, declared === "zero" ? foundationDimensions() : skipDims);
  const proofsReady = requiredProofsReady(declared, competencies, answers);
  if (conf >= PLACEMENT_CONFIDENCE_THRESHOLD && proofsReady) return true;

  const advancedCrushing =
    experienceScore(declared) >= 3 &&
    PLACEMENT_DIMENSIONS.every((dimension) => competencies[dimension].estimate >= 0.72) &&
    PLACEMENT_DIMENSIONS.every((dimension) => competencies[dimension].highestProvenDifficulty >= 3);
  if (advancedCrushing && conf >= PLACEMENT_CONFIDENCE_THRESHOLD) return true;

  return false;
}

function requiredProofsReady(
  declared: Experience,
  competencies: PlacementCompetencyMap,
  answers: PlacementAnswerEvidence[]
): boolean {
  if (declared === "zero") {
    return foundationDimensions().every((dimension) => competencies[dimension].evidenceCount >= 1);
  }
  const analysis = scoreEvidence(declared, answers);
  const needed = analysis.placement.targetLessonId;
  if (needed === "p1-o-que-e-mandarim" || needed === "p1-o-que-e-pinyin" || needed === "p1-o-que-e-tom") {
    return foundationDimensions().every((dimension) => competencies[dimension].evidenceCount >= 1);
  }
  return ["meaning", "pinyin", "tone", "hanzi"].every(
    (dimension) => competencies[dimension as PlacementDimension].highestProvenDifficulty >= 2
  );
}

export function assessmentTier(question: QuizQuestion): AssessmentTier {
  if (question.tier) return question.tier;
  if (question.layer === "supported" || question.layer === "reduced" || question.allowHints || question.withClue) return "A";
  if (question.layer === "production") return "E";
  if (question.layer === "soundSpeech" || question.category === "tone") return "D";
  if (question.layer === "sentenceReasoning" || question.category === "sentence" || question.category === "context") return "C";
  return "B";
}

function isStrongAssessment(question: QuizQuestion): boolean {
  return assessmentTier(question) !== "A";
}

function quizPoint(question: QuizQuestion, hinted: boolean, declaredLevel: Experience): number {
  if (hinted) return question.unlockWeight * 0.35;
  return question.unlockWeight * (isAdvancedProbe(question, declaredLevel) ? 1.05 : 1);
}

function isAdvancedProbe(question: QuizQuestion, declaredLevel: Experience): boolean {
  return quizDifficulty(question, declaredLevel) > experienceScore(declaredLevel) + 1;
}

function emptyCategoryStat(): QuizCategoryStat {
  return { total: 0, correct: 0, correctWithoutHint: 0, correctWithHint: 0, hints: 0, score: 0 };
}

function emptyTierStat(): QuizTierStat {
  return { total: 0, correct: 0, correctWithoutHint: 0, hints: 0 };
}

function emptyTierSummary(): Record<AssessmentTier, QuizTierStat> {
  return {
    A: emptyTierStat(),
    B: emptyTierStat(),
    C: emptyTierStat(),
    D: emptyTierStat(),
    E: emptyTierStat(),
  };
}

function categoryMastered(stat: QuizCategoryStat): boolean {
  return stat.correctWithoutHint >= 1 && stat.correctWithoutHint / Math.max(1, stat.total) >= 0.6;
}

function essentialLabelForQuestion(question: QuizQuestion): string {
  return question.essentialItem ?? question.category;
}

function resolvedQuestions(answers: PlacementAnswerEvidence[]): Array<{
  question: QuizQuestion;
  evidence: PlacementAnswerEvidence;
  correct: boolean;
  hinted: boolean;
}> {
  const rows = [];
  for (const evidence of answers) {
    const question = getPlacementQuestion(evidence.questionId);
    if (!question) continue;
    rows.push({
      question,
      evidence,
      correct: normalizeMatch(evidence.answer, question.answer),
      hinted: evidence.hintUsed,
    });
  }
  return rows;
}

function cleanQuestionAnswer(answers: PlacementAnswerEvidence[], questionId: string): boolean {
  const row = resolvedQuestions(answers).find((item) => item.question.id === questionId);
  return Boolean(row && row.correct && !row.hinted);
}

function cleanStrongDimension(answers: PlacementAnswerEvidence[], dimensions: PlacementDimension[]): boolean {
  return resolvedQuestions(answers).some((row) => {
    if (!dimensions.includes(dimensionOf(row.question)) || !isStrongAssessment(row.question)) return false;
    return row.correct && !row.hinted;
  });
}

function authorizedSkippedLessons(
  targetLessonId: string,
  canSkipContent: boolean,
  allowedFoundationLessonIds: string[],
  maxSkipLessons = Number.POSITIVE_INFINITY
): string[] {
  if (!canSkipContent && allowedFoundationLessonIds.length === 0) return [];
  const targetIndex = PLACEMENT_LESSON_ORDER.findIndex((lesson) => lesson.id === targetLessonId);
  if (targetIndex <= 0) return [];
  const allowedFoundation = new Set(allowedFoundationLessonIds);
  const skipped: string[] = [];
  let contentSkipped = 0;

  for (const lesson of PLACEMENT_LESSON_ORDER.slice(0, targetIndex)) {
    if (lesson.premium) continue;
    const isFoundation = (FOUNDATION_LESSON_IDS as readonly string[]).includes(lesson.id);
    if (isFoundation) {
      if (allowedFoundation.has(lesson.id)) skipped.push(lesson.id);
      continue;
    }
    if (!canSkipContent || contentSkipped >= maxSkipLessons) continue;
    skipped.push(lesson.id);
    contentSkipped += 1;
  }
  return skipped;
}

function beginnerDignityMessage(excellentSkip: boolean): string {
  if (excellentSkip) {
    return "Ponto de partida encontrado. Vamos construir sua base com um recorte mais compacto, sem pular os fundamentos.";
  }
  return "Ponto de partida encontrado. Vamos construir sua base desde o começo.";
}

export function scoreEvidence(declaredLevel: Experience, answers: PlacementAnswerEvidence[]): PlacementAnalysis {
  const rows = resolvedQuestions(answers);
  const questionsAnswered = rows.length;
  let correctWithoutHint = 0;
  let correctWithHint = 0;
  let weightedScore = 0;
  let weightedPossible = 0;
  const essentialMissed: string[] = [];
  const essentialHinted: string[] = [];
  const advancedProbes = rows.filter(({ question }) => isAdvancedProbe(question, declaredLevel));
  let advancedCorrect = 0;
  const stats: Record<QuizCategory, QuizCategoryStat> = {
    meaning: emptyCategoryStat(),
    sound: emptyCategoryStat(),
    tone: emptyCategoryStat(),
    hanzi: emptyCategoryStat(),
    sentence: emptyCategoryStat(),
    context: emptyCategoryStat(),
    speaking: emptyCategoryStat(),
  };
  const tierSummary = emptyTierSummary();

  for (const row of rows) {
    const { question, correct, hinted } = row;
    weightedPossible += question.unlockWeight;
    const stat = stats[question.category];
    stat.total += 1;
    if (hinted) stat.hints += 1;
    const tier = assessmentTier(question);
    tierSummary[tier].total += 1;
    if (hinted) tierSummary[tier].hints += 1;
    if (correct) {
      weightedScore += quizPoint(question, hinted, declaredLevel);
      stat.correct += 1;
      stat.score += quizPoint(question, hinted, declaredLevel);
      if (hinted) {
        correctWithHint += 1;
        stat.correctWithHint += 1;
        if (question.essential) essentialHinted.push(essentialLabelForQuestion(question));
      } else {
        correctWithoutHint += 1;
        stat.correctWithoutHint += 1;
        tierSummary[tier].correctWithoutHint += 1;
      }
      tierSummary[tier].correct += 1;
      if (isAdvancedProbe(question, declaredLevel)) advancedCorrect += 1;
    } else if (question.essential) {
      essentialMissed.push(essentialLabelForQuestion(question));
    }
  }

  const uniqueEssentialMissed = [...new Set(essentialMissed)];
  const uniqueEssentialHinted = [...new Set(essentialHinted)];
  const wrong = questionsAnswered - correctWithoutHint - correctWithHint;
  const decisiveQuestions = (["B", "C", "D", "E"] as AssessmentTier[]).reduce((sum, tier) => sum + tierSummary[tier].total, 0);
  const decisiveCorrect = (["B", "C", "D", "E"] as AssessmentTier[]).reduce(
    (sum, tier) => sum + tierSummary[tier].correctWithoutHint,
    0
  );
  const categoriesCorrect = Object.entries(stats)
    .filter(([, stat]) => categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  const categoriesWeak = Object.entries(stats)
    .filter(([, stat]) => stat.total > 0 && !categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  const weightedAccuracy = weightedPossible > 0 ? weightedScore / weightedPossible : 0;
  const noHintAccuracy = questionsAnswered > 0 ? correctWithoutHint / questionsAnswered : 0;
  const decisiveAccuracy = decisiveQuestions > 0 ? decisiveCorrect / decisiveQuestions : 0;
  const competencies = competenciesFromEvidence(declaredLevel, answers);
  const placementConfidence = placementOverallConfidence(
    competencies,
    declaredLevel === "zero" ? foundationDimensions() : PLACEMENT_DIMENSIONS
  );

  const noFundamentalErrors = uniqueEssentialMissed.length === 0 && uniqueEssentialHinted.length === 0;
  const hasMeaning = cleanStrongDimension(answers, ["meaning"]);
  const hasPinyin = cleanStrongDimension(answers, ["pinyin"]);
  const hasTone = cleanStrongDimension(answers, ["tone"]);
  const hasHanzi = cleanStrongDimension(answers, ["hanzi"]);
  const hasPhrase = cleanStrongDimension(answers, ["sentence", "context"]);
  const hasAudio = cleanStrongDimension(answers, ["listening", "tone"]);
  const hasProduction = cleanStrongDimension(answers, ["production"]);
  const hasRequiredSpread = hasMeaning && hasPinyin && hasTone && hasHanzi && hasPhrase && hasAudio && hasProduction;
  const hasAdvancedProof = hasRequiredSpread && hasAudio;

  const foundationProofByLessonId: Record<string, boolean> = {
    "p1-o-que-e-mandarim": cleanQuestionAnswer(answers, "foundation-what-is-mandarin"),
    "p1-o-que-e-pinyin":
      cleanQuestionAnswer(answers, "foundation-pinyin-role") &&
      cleanQuestionAnswer(answers, "foundation-pinyin-vs-hanzi") &&
      cleanQuestionAnswer(answers, "foundation-audio-to-pinyin") &&
      hasPinyin,
    "p1-o-que-e-tom":
      cleanQuestionAnswer(answers, "foundation-tone-role") &&
      cleanQuestionAnswer(answers, "foundation-tone-marks") &&
      hasTone,
    "p1-o-que-e-hanzi":
      cleanQuestionAnswer(answers, "foundation-hanzi-role") &&
      cleanQuestionAnswer(answers, "foundation-pinyin-vs-hanzi") &&
      hasHanzi,
    "p1-primeiros-hanzi": hasHanzi && cleanQuestionAnswer(answers, "core-wo-hanzi") && !uniqueEssentialMissed.includes("hanzi"),
    "p1-engine-2-lab":
      noFundamentalErrors &&
      hasMeaning &&
      hasPhrase &&
      hasProduction &&
      decisiveAccuracy >= 0.75,
  };

  const allowedFoundationLessonIds =
    declaredLevel === "zero"
      ? []
      : FOUNDATION_LESSON_IDS.filter((lessonId) => foundationProofByLessonId[lessonId]);
  const requiredFoundationLessonId = FOUNDATION_LESSON_IDS.find(
    (lessonId) => !new Set(allowedFoundationLessonIds).has(lessonId)
  );
  const manyHints = rows.filter((row) => row.hinted).length >= 3;
  const consistentSkip =
    noFundamentalErrors &&
    hasRequiredSpread &&
    decisiveAccuracy >= 0.85 &&
    noHintAccuracy >= 0.78 &&
    !manyHints;
  const excellentSkip =
    consistentSkip &&
    (declaredLevel !== "advanced" || hasAdvancedProof) &&
    decisiveAccuracy >= 0.9 &&
    noHintAccuracy >= 0.9 &&
    weightedAccuracy >= 0.8 &&
    advancedProbes.length - advancedCorrect === 0 &&
    rows.every((row) => !row.hinted);
  const largeSkipAllowed =
    excellentSkip &&
    questionsAnswered >= 12 &&
    decisiveAccuracy > 0.9 &&
    hasAdvancedProof &&
    noFundamentalErrors;

  let level: PlacementLevel = "inicio";
  let label = "Primeiro contato";
  let targetLessonId = "p1-o-que-e-mandarim";
  let resultMessage = beginnerDignityMessage(false);
  let canSkipContent = false;
  let maxSkipLessons = 0;

  if (declaredLevel === "zero") {
    level = excellentSkip ? "sobrevivencia" : "inicio";
    label = excellentSkip ? "Base compacta" : "Primeiro contato";
    targetLessonId = "p1-o-que-e-mandarim";
    canSkipContent = false;
    resultMessage = beginnerDignityMessage(excellentSkip);
  } else if (questionsAnswered < 4 || correctWithoutHint <= 1 || decisiveAccuracy < 0.45) {
    level = "inicio";
    resultMessage = beginnerDignityMessage(false);
  } else if (!hasPinyin || !hasTone || manyHints || !noFundamentalErrors) {
    level = "sobrevivencia";
    label = "Base guiada";
    targetLessonId = "l1";
    resultMessage = "Encontramos seu ponto de partida. Vamos firmar pinyin, tons e hànzì antes de avançar.";
  } else if (!hasPhrase || !hasHanzi || !hasProduction || decisiveAccuracy < 0.72) {
    level = "tons";
    label = "Som e tons";
    targetLessonId = "l1";
    resultMessage = "Encontramos seu ponto de partida. Vamos consolidar tons, pinyin, frases e hànzì básico.";
  } else if (consistentSkip) {
    if (declaredLevel === "words") {
      level = "tons";
      label = excellentSkip ? "Primeira fase compacta" : "Tons e ritmo";
      targetLessonId = "l5";
      canSkipContent = true;
      maxSkipLessons = 4;
      resultMessage = "Encontramos seu ponto de partida. Você já tem base para avançar um trecho, mantendo os fundamentos obrigatórios.";
    } else if (declaredLevel === "studied") {
      level = excellentSkip ? "frases" : "tons";
      label = excellentSkip ? "Um módulo adiante" : "Som e tons";
      targetLessonId = excellentSkip ? "l5" : "l1";
      canSkipContent = excellentSkip;
      maxSkipLessons = excellentSkip ? 4 : 0;
      resultMessage = excellentSkip
        ? "Encontramos seu ponto de partida. Você pode pular um módulo inicial, sem remover fundamentos sem prova."
        : "Encontramos seu ponto de partida. Vamos consolidar a base antes de avançar.";
    } else if (declaredLevel === "phrases") {
      level = largeSkipAllowed ? "frases" : "tons";
      label = largeSkipAllowed ? "Frases iniciais" : "Som e tons";
      targetLessonId = largeSkipAllowed ? "l14" : "l5";
      canSkipContent = true;
      maxSkipLessons = largeSkipAllowed ? 12 : 4;
      resultMessage = "Encontramos seu ponto de partida na Jornada, com pulo só onde houve prova sem dica.";
    } else if (!hasAdvancedProof) {
      level = "tons";
      label = "Base forte, pulo limitado";
      targetLessonId = "l1";
      canSkipContent = false;
      resultMessage = "Encontramos seu ponto de partida. Para avançar mais, ainda faltam provas sem dica em leitura, tom, hànzì e produção.";
    } else {
      level = largeSkipAllowed ? "hanzi" : "frases";
      label = largeSkipAllowed ? "Hànzì lógico" : "Frases com hànzì básico";
      targetLessonId = largeSkipAllowed ? "l19" : "l5";
      canSkipContent = true;
      maxSkipLessons = largeSkipAllowed ? Number.POSITIVE_INFINITY : 4;
      resultMessage = "Encontramos seu ponto de partida. O pulo só inclui temas cuja promessa o teste comprovou.";
    }
  } else {
    level = "sobrevivencia";
    label = "Base guiada";
    targetLessonId = "l1";
    resultMessage = "Encontramos seu ponto de partida. Vamos construir o que ainda precisa de evidência.";
  }

  const desiredTargetLessonId = targetLessonId;
  if (requiredFoundationLessonId) {
    canSkipContent = false;
    maxSkipLessons = 0;
    targetLessonId = requiredFoundationLessonId;
    level = declaredLevel === "zero" ? "inicio" : "sobrevivencia";
    label = allowedFoundationLessonIds.length > 0 ? "Fundamentos seletivos" : "Base guiada";
    resultMessage =
      declaredLevel === "zero"
        ? beginnerDignityMessage(false)
        : `${resultMessage} Antes de avançar, vamos passar por fundamentos cuja promessa ainda não foi comprovada sem dica.`;
  }

  const foundationLessonIdsRequired = FOUNDATION_LESSON_IDS.filter(
    (lessonId) => !allowedFoundationLessonIds.includes(lessonId)
  );
  const skippedLessonIds = authorizedSkippedLessons(
    targetLessonId,
    canSkipContent,
    allowedFoundationLessonIds,
    maxSkipLessons
  );
  const masteredByPlacement = skippedLessonIds.filter((lessonId) => {
    if ((FOUNDATION_LESSON_IDS as readonly string[]).includes(lessonId)) {
      return Boolean(foundationProofByLessonId[lessonId]);
    }
    return true;
  });

  const placement: PlacementDecision = {
    level,
    label,
    targetLessonId,
    skippedLessonIds,
    foundationLessonIdsRequired: [...foundationLessonIdsRequired],
    masteredByPlacement,
  };

  const declaredScore = experienceScore(declaredLevel);
  const performanceBand = noHintAccuracy < 0.45 ? 0 : noHintAccuracy < 0.7 ? 1 : noHintAccuracy < 0.85 ? 2 : 3;
  const consistencyGap = Math.abs(performanceBand - declaredScore);
  const consistency: PlacementAnalysis["consistency"] = consistencyGap === 0 ? "Alta" : consistencyGap === 1 ? "Média" : "Baixa";

  const strengths = Object.entries(stats)
    .filter(([, stat]) => categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  const reinforcements = Object.entries(stats)
    .filter(([, stat]) => stat.total > 0 && !categoryMastered(stat))
    .map(([category]) => CATEGORY_LABEL[category as QuizCategory]);
  if (rows.filter((row) => row.hinted).length >= 3) reinforcements.unshift("Responder sem depender de dicas");

  const decisionReasons = [
    `versão ${PLACEMENT_VERSION}`,
    `confiança ${Math.round(placementConfidence * 100)}%`,
    `entrada ${targetLessonId}`,
    desiredTargetLessonId !== targetLessonId ? `entrada ajustada por fundamento ${targetLessonId}` : null,
    manyHints ? "dicas não autorizam skip" : null,
  ].filter(Boolean) as string[];

  return {
    placement,
    score: Math.round(weightedAccuracy * 100),
    questionsAnswered,
    correctWithoutHint,
    correctWithHint,
    wrong,
    weightedScore,
    weightedPossible,
    weightedAccuracy,
    noHintAccuracy,
    adjustedCorrect: Math.round(weightedScore),
    decisiveQuestions,
    decisiveCorrect,
    decisiveAccuracy,
    tierSummary,
    hintCount: rows.filter((row) => row.hinted).length,
    categoriesCorrect,
    categoriesWeak,
    essentialMissed: uniqueEssentialMissed,
    essentialHinted: uniqueEssentialHinted,
    advancedProbes: advancedProbes.length,
    advancedMisses: advancedProbes.length - advancedCorrect,
    advancedCorrect,
    resultMessage,
    skippedLessonIds,
    foundationLessonIdsRequired: [...foundationLessonIdsRequired],
    foundationProofs: FOUNDATION_LESSON_IDS.map((lessonId) => ({
      lessonId,
      label: FOUNDATION_PROOF_LABELS[lessonId] ?? lessonId,
      proven: Boolean(foundationProofByLessonId[lessonId]),
    })),
    decisionReasons,
    consistency,
    strengths: strengths.length ? strengths.slice(0, 3) : ["Disposição para testar e aprender"],
    reinforcements: [...new Set(reinforcements)].slice(0, 4),
    placementConfidence,
    competency: competencies,
    placementVersion: PLACEMENT_VERSION,
  };
}

export function validatePlacementEvidence(payload: {
  placementVersion: number;
  declaredExperience: Experience;
  answers: PlacementAnswerEvidence[];
}): { ok: true } | { ok: false; error: string } {
  if (payload.placementVersion !== PLACEMENT_VERSION) {
    return { ok: false, error: "placement_version_mismatch" };
  }
  if (!["zero", "words", "studied", "phrases", "advanced"].includes(payload.declaredExperience)) {
    return { ok: false, error: "invalid_declared_experience" };
  }
  if (!Array.isArray(payload.answers) || payload.answers.length === 0) {
    return { ok: false, error: "answers_required" };
  }
  if (payload.answers.length > MAX_QUIZ_LENGTH.advanced) {
    return { ok: false, error: "too_many_answers" };
  }
  const seen = new Set<string>();
  for (const answer of payload.answers) {
    if (!answer?.questionId || typeof answer.answer !== "string") {
      return { ok: false, error: "malformed_answer" };
    }
    const question = getPlacementQuestion(answer.questionId);
    if (!question) return { ok: false, error: "unknown_question" };
    if (seen.has(answer.questionId)) return { ok: false, error: "duplicate_question" };
    seen.add(answer.questionId);
    if (!question.options.includes(answer.answer)) {
      return { ok: false, error: "answer_not_in_options" };
    }
  }
  return { ok: true };
}

export function evaluatePlacementEvidence(
  declaredExperience: Experience,
  answers: PlacementAnswerEvidence[]
): PlacementAnalysis {
  return scoreEvidence(declaredExperience, answers);
}
