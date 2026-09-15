#!/usr/bin/env node
/**
 * RC1.3 · P7/P28 e P32 — mutações 8, 9, 10, 11 e 12.
 *
 * O caso de 请问 entra aqui como regressão NOMEADA, com o prompt real da tela
 * que o QA fotografou. Se alguma refatoração futura voltar a deixar avaliação,
 * feedback, explicação e áudio derivarem de fontes diferentes, é este arquivo
 * que grita.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateReviewAnswerIntegrity } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
const { activityErrorFromMistake } = require(path.join(root, "src/features/lesson/lessonAttemptReview.ts"));
const { buildImmediateRemediationExercise } = require(path.join(root, "src/features/lesson/immediateRemediation.ts"));
const canonical = require(path.join(root, "src/features/lesson/canonicalAnswer.ts"));

const killed = [];
function kill(label) {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
}

const control = validateReviewAnswerIntegrity();
assert.equal(control.failures.length, 0, `controle positivo falhou: ${JSON.stringify(control.failures)}`);

const lesson = ALL_LESSONS.find((item) => item.id === "p1-qingwen-cortesia");
assert.ok(lesson, "lição p1-qingwen-cortesia ausente");

const QINGWEN_PROMPT = "Você quer pedir informação na loja ou na rua. O que abre a pergunta?";
const qingwenIndex = lesson.steps.findIndex((step) =>
  [step.prompt, step.dialoguePrompt, step.checkpoint?.prompt].some(
    (text) => typeof text === "string" && text === QINGWEN_PROMPT
  )
);
assert.ok(qingwenIndex >= 0, "o item de 请问 sumiu do currículo");
const qingwenStep = lesson.steps[qingwenIndex];
assert.equal(qingwenStep.correctAnswer, "请问", "a resposta canônica do item mudou");

function errorForStep(step, index, id = "qw") {
  return activityErrorFromMistake(
    {
      id,
      lessonId: lesson.id,
      questionId: `${lesson.id}:${index}:${step.kind}`,
      exerciseType: step.kind,
      prompt: step.prompt ?? "",
      expectedAnswer: step.correctAnswer ?? step.answer ?? "",
      userAnswer: "再见",
      explanation: "",
      sourceSkill: "uso",
      createdAt: 0,
    },
    lesson
  );
}

// ── Mutação 8: 请问 é o correto, mas o feedback mostra 我叫马修 ──────────────
{
  const exercise = buildImmediateRemediationExercise(errorForStep(qingwenStep, qingwenIndex));
  assert.equal(exercise.prompt, QINGWEN_PROMPT, "o prompt do item mudou");
  assert.equal(exercise.canonical.display, "请问", `resposta canônica é "${exercise.canonical.display}"`);
  assert.equal(exercise.canonical.pinyin?.replace(/\s+/g, ""), "qǐngwèn");
  assert.match(exercise.canonical.explanation ?? "", /请问/);
  // P28.1 — proibido.
  const surfaces = [
    exercise.canonical.display,
    exercise.canonical.explanation,
    exercise.canonical.audioTarget,
    ...(exercise.optionSet?.options ?? []).map((option) => option.label),
  ].join(" ");
  assert.ok(!/我叫/.test(exercise.canonical.display), "我叫 apareceu como resposta correta");
  assert.ok(!/我叫马修/.test(surfaces), "我叫马修 apareceu na correção de 请问");
  kill("Mutação 8 · 请问 correto, feedback mostrando 我叫马修");
}

// ── Mutação 9: avaliação e feedback usam ids diferentes ────────────────────
{
  const exercise = buildImmediateRemediationExercise(errorForStep(qingwenStep, qingwenIndex));
  const correct = exercise.optionSet.options.find((option) => option.id === exercise.optionSet.correctOptionId);
  assert.equal(correct.label, exercise.canonical.display, "opção correta ≠ resposta do feedback");
  assert.ok(exercise.integrity.ok, `integridade reprovou: ${JSON.stringify(exercise.integrity.issues)}`);
  kill("Mutação 9 · evaluation e feedback com IDs diferentes");
}

// ── Mutação 10: shuffle altera a resposta correta (P7.2 — 100 seeds) ───────
{
  for (let seed = 0; seed < 100; seed += 1) {
    const exercise = buildImmediateRemediationExercise(errorForStep(qingwenStep, qingwenIndex, `qw-${seed}`));
    const correct = exercise.optionSet.options.find((option) => option.id === exercise.optionSet.correctOptionId);
    assert.equal(correct.label, "请问", `seed ${seed} moveu a resposta para "${correct.label}"`);
    assert.equal(exercise.canonical.display, "请问", `seed ${seed} mudou a resposta canônica`);
    for (const option of exercise.optionSet.options) {
      assert.equal(
        canonical.evaluateCanonicalChoice(option.id, exercise.optionSet),
        option.label === "请问",
        `seed ${seed}: avaliação incoerente em "${option.label}"`
      );
    }
  }
  kill("Mutação 10 · shuffle altera a resposta correta (100 seeds)");
}

// ── Mutação 11: explanation contradiz correctResponse → falha fechada ──────
{
  const base = buildImmediateRemediationExercise(errorForStep(qingwenStep, qingwenIndex));
  const contradicted = canonical.checkAnswerIntegrity({
    canonical: {
      ...base.canonical,
      display: "我叫马修",
      hanzi: "我叫马修",
      value: canonical.normalizeCanonicalValue("我叫马修"),
    },
  });
  assert.ok(!contradicted.ok, "explicação contraditória passou");
  assert.ok(
    contradicted.issues.some((issue) => issue.code === "ANSWER_INTEGRITY_MISMATCH"),
    "faltou ANSWER_INTEGRITY_MISMATCH"
  );
  kill("Mutação 11 · explanation contradiz correctResponse");
}

// ── Mutação 12: o áudio do feedback toca a opção errada ───────────────────
{
  const exercise = buildImmediateRemediationExercise(errorForStep(qingwenStep, qingwenIndex));
  // P28.2 — o áudio automático é 请问.
  assert.equal(exercise.canonical.audioTarget, "请问", `áudio é "${exercise.canonical.audioTarget}"`);
  const wrongLabels = exercise.optionSet.options
    .filter((option) => option.id !== exercise.optionSet.correctOptionId)
    .map((option) => option.label);
  assert.ok(
    !wrongLabels.includes(exercise.canonical.audioTarget),
    "o áudio da correção é uma alternativa errada"
  );
  // O player precisa tocar `canonical.audioTarget`, não o texto selecionado.
  const player = require("node:fs").readFileSync(
    path.join(root, "src/features/lesson/LessonPlayer.tsx"),
    "utf8"
  );
  assert.match(player, /const audio = exercise\.canonical\.audioTarget;/, "o player não toca a resposta canônica");
  kill("Mutação 12 · feedback audio toca a opção errada");
}

// ── BUG 2 · raiz: índice do plano resolvido contra o autoral ──────────────
{
  // Cenário exato do QA: o aluno errou o passo 4 do PLANO (a cena "我叫Matheus"),
  // e o passo 4 AUTORAL é justamente o diálogo de 请问.
  const planned = lessonRoundStepsFor(lesson, { masteryPass: 1 });
  const collidingIndex = 4;
  const playedStep = planned[collidingIndex];
  const authoredStep = lesson.steps[collidingIndex];
  assert.notEqual(playedStep.kind, authoredStep.kind, "o cenário de colisão de índice não existe mais");

  const mistake = {
    id: "collide",
    lessonId: lesson.id,
    questionId: `${lesson.id}:${collidingIndex}:${playedStep.kind}`,
    exerciseType: playedStep.kind,
    prompt: playedStep.prompt ?? "",
    expectedAnswer: playedStep.correctAnswer ?? playedStep.answer ?? "",
    userAnswer: "再见",
    explanation: "",
    sourceSkill: "uso",
    createdAt: 0,
  };
  // Sem o plano em mãos: o erro é DESCARTADO em vez de casar com o passo errado.
  const withoutPlan = activityErrorFromMistake(mistake, lesson);
  assert.equal(withoutPlan, null, "o erro foi casado com um passo incoerente");
  // Com o plano: resolve o passo CERTO, e prompt/resposta/explicação batem.
  const withPlan = activityErrorFromMistake(mistake, lesson, planned);
  assert.ok(withPlan, "o erro não resolveu nem com o plano");
  assert.equal(withPlan.step.kind, playedStep.kind, "resolveu para outro tipo de passo");
  assert.notEqual(withPlan.prompt, QINGWEN_PROMPT, "o prompt de 请问 vazou para outro item");
  const exercise = buildImmediateRemediationExercise(withPlan);
  assert.ok(exercise.integrity.ok, `integridade reprovou: ${JSON.stringify(exercise.integrity.issues)}`);
  kill("BUG 2 · índice do plano resolvido contra os passos autorais");
}

console.log(`PASS test:review-answer-integrity — ${killed.length} mutações mortas, com controle positivo.`);
