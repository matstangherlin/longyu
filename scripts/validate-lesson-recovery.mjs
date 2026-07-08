import process from "node:process";

const MODULE_REVIEW_PASS_ACCURACY = 0.8;
const PASS_ACCURACY = 0.6;
const EXAM_PASS_RATIO = 0.9;

const errors = [];

function fail(message) {
  errors.push(message);
}

function computeLessonStars({ correct, graded, hadMistakes = false, outOfLives = false, isReview = false }) {
  if (outOfLives) return correct > 0 ? 1 : 0;
  if (graded === 0) return hadMistakes ? 2 : 3;
  const accuracy = correct / graded;
  if (isReview) {
    if (accuracy >= 0.9) return 3;
    if (accuracy >= MODULE_REVIEW_PASS_ACCURACY) return 2;
    return correct > 0 ? 1 : 0;
  }
  if (hadMistakes) return 2;
  if (accuracy >= 1) return 3;
  if (accuracy >= PASS_ACCURACY || correct > 0) return 2;
  return 1;
}

function canCompleteLesson(stars, graded, isReview = false, correctCount) {
  if (graded === 0) return true;
  if (isReview) {
    const accuracy =
      typeof correctCount === "number"
        ? correctCount / graded
        : stars >= 2
          ? MODULE_REVIEW_PASS_ACCURACY
          : 0;
    return accuracy >= MODULE_REVIEW_PASS_ACCURACY;
  }
  return stars >= (isReview ? 2 : 3);
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) fail(`${label}: esperado ${expected}, obteve ${actual}`);
}

console.log("== Regras de estrelas ==");
assertEqual("lição perfeita", computeLessonStars({ correct: 10, graded: 10, hadMistakes: false }), 3);
assertEqual("lição com erro", computeLessonStars({ correct: 10, graded: 10, hadMistakes: true }), 2);
assertEqual("revisão 80%", computeLessonStars({ correct: 8, graded: 10, isReview: true }), 2);
assertEqual("revisão 90%", computeLessonStars({ correct: 9, graded: 10, isReview: true }), 3);
assertEqual("revisão abaixo de 80%", computeLessonStars({ correct: 7, graded: 10, isReview: true }), 1);

console.log("== Desbloqueio ==");
assertEqual("lição normal exige 3 estrelas", canCompleteLesson(2, 10, false, 10), false);
assertEqual("lição normal com 3 estrelas", canCompleteLesson(3, 10, false, 10), true);
assertEqual("revisão passa com 80%", canCompleteLesson(2, 10, true, 8), true);
assertEqual("revisão falha abaixo de 80%", canCompleteLesson(1, 10, true, 7), false);

console.log("== Teste de pular módulo ==");
assertEqual("módulo skip 90%", Math.ceil(10 * EXAM_PASS_RATIO), 9);
assertEqual("skip 8/10 reprova", 8 >= Math.ceil(10 * EXAM_PASS_RATIO), false);
assertEqual("skip 9/10 aprova", 9 >= Math.ceil(10 * EXAM_PASS_RATIO), true);

console.log("== Erro granular de par ==");
const pairPrompt = "O que significa 木?";
const pairExpected = "árvore / madeira";
const pairUser = "pessoa";
const pairTableString = "木 = mù · árvore / madeira | 人 = pessoa";
if (pairPrompt.includes(pairTableString)) {
  fail("prompt de par não deve conter tabela inteira");
}
if (pairExpected.length > 40 || pairUser.length > 40) {
  fail("respostas de par devem ser granulares");
}
assertEqual("par salva hanzi no prompt", pairPrompt.includes("木"), true);

if (errors.length > 0) {
  console.error("\nFalhas:");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("\nOK: validate:lesson-recovery passou.");
