import type { Lesson, LessonStep, FlatLesson } from "../../data/journey";
import { CHARACTERS } from "../../data/characters";
import { CHUNKS } from "../../data/chunks";
import type { ItemType } from "../../data/types";
import type { ActivityErrorRecord, LessonAttemptRecord, LessonMistakeRecord, LessonStar } from "../../lib/store";
import type { ActivityErrorInput } from "./immediateRemediation";
import { isConcatenatedDump, isNonOptionAnswer } from "./immediateRemediation";

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

function parseStepIndex(questionId: string, lessonId: string): number | null {
  const prefix = `${lessonId}:`;
  if (!questionId.startsWith(prefix)) return null;
  const stepIndex = Number.parseInt(questionId.slice(prefix.length).split(":")[0] ?? "", 10);
  return Number.isFinite(stepIndex) ? stepIndex : null;
}

function pairLeftFromQuestionId(questionId: string, lessonId: string): string | undefined {
  const marker = `${lessonId}:`;
  if (!questionId.startsWith(marker)) return undefined;
  const tail = questionId.slice(marker.length);
  if (!tail.includes(":pair:")) return undefined;
  return tail.split(":pair:")[1];
}

/**
 * RC1.3 · BUG 2 — a raiz de "请问 pergunta, 我叫马修 corrige".
 *
 * `questionId` é `${lessonId}:${stepIndex}:${kind}`, e esse `stepIndex` indexa o
 * PLANO DA sessão — a sequência que `lessonRoundStepsFor` montou para aquela
 * rodada de mastery, com passos reordenados, bônus da pass e Reforço +. Resolver
 * esse índice contra `lesson.steps` (o array autoral do catálogo) devolve OUTRO
 * passo sempre que o plano difere do autoral, que é o caso normal.
 *
 * O efeito no aluno é exatamente o que o QA viu: a revisão restaurada montava o
 * card com `error.step` de um item (prompt e explicação do 请问) e
 * `error.correctAnswer` de outro (`mistake.expectedAnswer`, 我叫马修, que era o
 * alvo do passo realmente errado). Avaliação, feedback e explicação referindo
 * itens diferentes.
 *
 * A correção é resolver por IDENTIDADE, não por posição:
 *
 * 1. o índice é apenas um palpite — só vale se o passo candidato for COERENTE
 *    com o erro gravado (mesmo tipo e mesma resposta esperada);
 * 2. se não for, procuramos em toda a lição um passo coerente;
 * 3. se nenhum for, devolvemos `undefined` — o erro é descartado da revisão.
 *
 * Descartar é a decisão certa: sem o passo de origem não há como garantir
 * paridade de tarefa (P3) nem de ajuda (P4), e apresentar um par incoerente é o
 * bug que estamos fechando. Melhor uma revisão com um item a menos do que uma
 * revisão que ensina errado (P8, falha fechada).
 */
function stepMatchesMistake(step: LessonStep | undefined, mistake: LessonMistakeRecord): boolean {
  if (!step) return false;
  if (mistake.exerciseType && step.kind !== mistake.exerciseType) return false;
  const expected = normalizeAnswerKey(mistake.expectedAnswer);
  if (!expected) return true;
  const candidates = [
    step.correctAnswer,
    step.checkpoint?.correctAnswer,
    step.answer,
    step.blankAnswer,
    step.correctImageId,
    step.targetHanzi,
    step.targetMeaningPt,
    step.hanzi,
    step.targetParts?.join(""),
    step.target?.join(""),
    step.kind === "tone" && step.tone ? `${step.tone}º tom` : undefined,
    ...(step.pairs ?? []).map((pair) => pair.right),
  ];
  return candidates.some((candidate) => {
    const value = normalizeAnswerKey(candidate);
    return Boolean(value) && (value === expected || value.includes(expected) || expected.includes(value));
  });
}

function normalizeAnswerKey(value: string | undefined): string {
  return (value ?? "")
    .replace(/[，。！？、,.!?？\s]/g, "")
    .toLowerCase()
    .trim();
}

function stepForMistake(
  mistake: LessonMistakeRecord,
  lesson: Lesson,
  stepPool: readonly LessonStep[] = []
): LessonStep | undefined {
  const stepIndex = parseStepIndex(mistake.questionId, lesson.id);
  const byIndex = stepIndex != null && stepIndex >= 0 ? lesson.steps[stepIndex] : undefined;
  if (stepMatchesMistake(byIndex, mistake)) return byIndex;
  // O índice veio do plano da sessão, não do autoral: procure por identidade,
  // primeiro nos passos do plano (quando o chamador tem o plano em mãos) e
  // depois no autoral.
  const byIdentity =
    stepPool.find((candidate) => stepMatchesMistake(candidate, mistake)) ??
    lesson.steps.find((candidate) => stepMatchesMistake(candidate, mistake));
  if (byIdentity) return byIdentity;
  return undefined;
}

function reviewTargetsForStep(step: LessonStep): ActivityErrorRecord["targets"] {
  const targets: ActivityErrorRecord["targets"] = [];
  if (step.charId) {
    targets.push({ type: "char" as ItemType, itemId: step.charId, domain: "forma", track: "hanzi" });
  }
  const hanzi = step.hanzi ?? (step.charId ? charById.get(step.charId)?.hanzi : undefined);
  if (hanzi) {
    targets.push({ type: "char" as ItemType, itemId: hanzi, domain: "significado", track: "hanzi" });
  }
  return targets.length > 0
    ? targets
    : [{ type: "char" as ItemType, itemId: "generic", domain: "significado", track: "hanzi" }];
}

function lessonMeta(lesson: Lesson | FlatLesson) {
  return {
    moduleId: "unitId" in lesson ? lesson.unitId : "",
    phaseId: "phaseId" in lesson ? lesson.phaseId : "",
  };
}

function hasHanzi(text: string | undefined): text is string {
  return Boolean(text && /[\u3400-\u9fff]/u.test(text) && !isConcatenatedDump(text));
}

/** Um único alvo coerente — alinhado com errorHanziForStep do LessonPlayer. */
function singleTargetHanziFromStep(step: LessonStep, expectedAnswer?: string): string | undefined {
  if (hasHanzi(step.hanzi)) return step.hanzi;
  if (step.charId) {
    const glyph = charById.get(step.charId)?.hanzi;
    if (hasHanzi(glyph)) return glyph;
  }
  const reply =
    expectedAnswer ??
    step.correctAnswer ??
    step.checkpoint?.correctAnswer ??
    step.answer ??
    step.blankAnswer;
  if (hasHanzi(reply)) return reply;
  if (hasHanzi(step.sourceText)) return step.sourceText;
  if (step.kind === "conversation_scene") {
    const match = step.lines?.find((line) => hasHanzi(line.hanzi) && line.hanzi === reply);
    if (match?.hanzi) return match.hanzi;
    /**
     * RC1.3 · P6.7 — o alvo da cena é a fala que RESPONDE ao checkpoint.
     *
     * O checkpoint `choose_meaning` guarda a resposta em português ("Meu nome é
     * Matheus."), então o casamento por `line.hanzi` nunca batia e caíamos na
     * ÚLTIMA fala com hànzì — que, nesta cena, é a réplica do NPC (你好，
     * Matheus！). Daí saíam um `hanzi` e um `audioTarget` de outra fala que não a
     * corrigida, e a checagem de integridade (com razão) recusava a correção.
     * Casar por `pt` encontra 我叫Matheus。, que é o alvo real.
     */
    const byMeaning = step.lines?.find(
      (line) => hasHanzi(line.hanzi) && Boolean(reply) && normalizeAnswerKey(line.pt) === normalizeAnswerKey(reply)
    );
    if (byMeaning?.hanzi) return byMeaning.hanzi;
    const last = [...(step.lines ?? [])].reverse().find((line) => hasHanzi(line.hanzi));
    if (last?.hanzi) return last.hanzi;
  }
  const target = step.target?.join("") ?? step.targetParts?.join("");
  return hasHanzi(target) ? target : undefined;
}

function pinyinForHanzi(hanzi: string | undefined, step: LessonStep): string | undefined {
  if (step.pinyin && !isConcatenatedDump(step.pinyin)) return step.pinyin;
  if (step.sourcePinyin && !isConcatenatedDump(step.sourcePinyin)) return step.sourcePinyin;
  if (step.charId) return charById.get(step.charId)?.pinyin;
  if (!hanzi || isConcatenatedDump(hanzi)) return undefined;
  const normalized = hanzi.replace(/[，。！？、,.!?？\s]/g, "");
  const chunk = CHUNKS.find((item) => item.hanzi.replace(/[，。！？、,.!?？\s]/g, "") === normalized);
  if (chunk?.pinyin) return chunk.pinyin;
  const chars = [...normalized]
    .map((glyph) => charByGlyph.get(glyph))
    .filter((char): char is (typeof CHARACTERS)[number] => Boolean(char));
  if (chars.length > 0 && chars.length <= 8) return chars.map((char) => char.pinyin).join(" ");
  return undefined;
}

function cleanSelectedAnswer(value: string | undefined): string {
  if (!value?.trim() || isNonOptionAnswer(value) || isConcatenatedDump(value)) {
    return "Resposta incorreta";
  }
  return value.trim();
}

/** Reconstrói um erro da tentativa salva para revisão imediata tardia. */
export function activityErrorFromMistake(
  mistake: LessonMistakeRecord,
  lesson: Lesson,
  stepPool: readonly LessonStep[] = []
): (ActivityErrorInput & { step?: LessonStep }) | null {
  const step = stepForMistake(mistake, lesson, stepPool);
  if (!step) return null;
  const meta = lessonMeta(lesson);

  const isPair = mistake.exerciseType === "pair-match";
  const pairLeft = isPair ? pairLeftFromQuestionId(mistake.questionId, lesson.id) ?? step.hanzi : undefined;
  const matchedPair = isPair ? step.pairs?.find((pair) => pair.left === pairLeft) : undefined;
  const hanzi = isPair
    ? pairLeft
    : singleTargetHanziFromStep(step, mistake.expectedAnswer);

  return {
    id: mistake.id,
    lessonId: mistake.lessonId,
    moduleId: meta.moduleId,
    phaseId: meta.phaseId,
    taskId: mistake.questionId,
    questionId: mistake.questionId,
    exerciseId: mistake.questionId,
    type: isPair ? "pair-match" : mistake.exerciseType,
    prompt: mistake.prompt,
    correctAnswer: mistake.expectedAnswer,
    selectedAnswer: cleanSelectedAnswer(mistake.userAnswer),
    topic: lesson.title,
    tokens: [hanzi, mistake.expectedAnswer, mistake.userAnswer]
      .filter((token): token is string => Boolean(token) && !isConcatenatedDump(token) && !isNonOptionAnswer(token)),
    hanzi,
    pinyin: pinyinForHanzi(hanzi, step),
    meaningPt: hasHanzi(mistake.expectedAnswer) ? undefined : mistake.expectedAnswer,
    pairLeft,
    pairExpectedRight: matchedPair?.right,
    pairSelectedRight: isPair ? mistake.userAnswer : undefined,
    explanation:
      step.explanation ??
      step.checkpoint?.explanation ??
      (mistake.explanation && !isConcatenatedDump(mistake.explanation) ? mistake.explanation : undefined),
    mistakeReason: mistake.explanation,
    timestamp: mistake.createdAt,
    wrongCount: 1,
    correctionAttempts: 0,
    correctedSuccessDates: [],
    skill: isPair ? "significado" : "uso",
    targets: reviewTargetsForStep(step),
    step,
  };
}

export interface PendingAttemptReview {
  attemptId: string;
  attempt: LessonAttemptRecord;
  errors: (ActivityErrorInput & { step?: LessonStep })[];
  correctCount: number;
  finalStars: LessonStar;
  alreadyRecoveredIds: string[];
}

/**
 * V4.6 TM-004/TM-021 — 3★ recovery must not trap the next topic pass.
 *
 * Restoring the last 2★ attempt on every `/player` visit made M2+ unreachable:
 * the offer came back, Continuar went to the Jornada, and the ring stayed at 1/4.
 * Same-session offer (right after handleDone) is unchanged.
 *
 * Restore when:
 * - the node is not a 4-pass teaching topic, or
 * - the topic is still 0/4 (star-recovery fixtures), or
 * - the topic is already 4/4 (practice / 3★ recovery).
 *
 * Do not restore when:
 * - the topic is 1/4–3/4 (next visit is the next pass), or
 * - the student is mid-pass (session cursor).
 */
export function shouldRestorePendingAttemptReview(input: {
  isTopicMastery: boolean;
  masteryLevel: number;
  sessionCursorPass?: number | null;
  sessionCursorStepIndex?: number | null;
}): boolean {
  const midPass =
    typeof input.sessionCursorPass === "number" && (input.sessionCursorStepIndex ?? 0) > 0;
  if (midPass) return false;
  if (!input.isTopicMastery) return true;
  const level = input.masteryLevel ?? 0;
  if (level > 0 && level < 4) return false;
  return true;
}

/** Erros pendentes da última tentativa com menos de 3 estrelas. */
export function getPendingAttemptReview(
  lessonId: string,
  lessonAttemptsById: Record<string, LessonAttemptRecord[]>,
  lesson: Lesson,
  /**
   * Passos do PLANO da sessão, quando o chamador os tem. O erro foi gravado
   * contra o plano; procurar nele primeiro resolve por identidade exata em vez
   * de cair na busca pelo autoral (ver `stepForMistake`).
   */
  stepPool: readonly LessonStep[] = []
): PendingAttemptReview | null {
  const attempts = lessonAttemptsById[lessonId];
  if (!attempts?.length) return null;
  const last = attempts[attempts.length - 1];
  if (!last || last.finalStars >= 3) return null;

  const recoveredIds = new Set(last.recoveredMistakes.map((mistake) => mistake.id));
  const pendingMistakes = last.mistakes.filter((mistake) => !recoveredIds.has(mistake.id));
  if (pendingMistakes.length === 0) return null;

  const errors = pendingMistakes
    .map((mistake) => activityErrorFromMistake(mistake, lesson, stepPool))
    .filter((error): error is NonNullable<typeof error> => Boolean(error));
  if (errors.length === 0) return null;

  return {
    attemptId: last.id,
    attempt: last,
    errors,
    correctCount: last.correctCount,
    finalStars: last.finalStars,
    alreadyRecoveredIds: [...recoveredIds],
  };
}
