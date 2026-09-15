#!/usr/bin/env node
/**
 * RC1.3 · P32 — mutações 6 e 7 (paridade de tarefa).
 *
 * A revisão não pode transformar silenciosamente fala em múltipla escolha,
 * montagem em múltipla escolha ou listening em texto puro só porque é mais fácil
 * de implementar. Cada conversão permitida tem de estar declarada COM motivo.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateReviewTaskParity } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const parity = require(path.join(root, "src/features/lesson/reviewTaskParity.ts"));
const { ALL_LESSONS } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
const { buildImmediateRemediationExercise } = require(path.join(root, "src/features/lesson/immediateRemediation.ts"));

const killed = [];
const kill = (label) => {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
};

const control = validateReviewTaskParity();
assert.equal(control.failures.length, 0, `controle positivo falhou: ${JSON.stringify(control.failures)}`);

// ── Mutação 6: revisão vira MCQ sem motivo ────────────────────────────────
{
  // `compare_with_image→choice` fica de fora: é conversão AUTORIZADA e
  // justificada (sem os dois assets, o contraste continua em texto).
  for (const kind of ["sentence_build", "translation_build", "hanzi_build", "listen_select", "image_choice"]) {
    const verdict = parity.checkReviewTaskParity({ sourceKind: kind, reviewKind: "choice" });
    assert.ok(!verdict.ok, `${kind}→choice deveria reprovar`);
    assert.ok(parity.isSilentMcqConversion({ sourceKind: kind, reviewKind: "choice" }), `${kind}→choice não flagrado`);
  }
  // Conversões autorizadas continuam passando — e com motivo escrito.
  for (const transform of parity.AUTHORIZED_REMEDIATION_TRANSFORMS) {
    const verdict = parity.checkReviewTaskParity({ sourceKind: transform.from, reviewKind: transform.to });
    assert.ok(verdict.ok, `transformação autorizada ${transform.from}→${transform.to} reprovou`);
    assert.ok(transform.reasonPt.length >= 40, `${transform.from}→${transform.to} sem motivo pedagógico`);
  }
  kill("Mutação 6 · revisão transforma task em MCQ sem motivo");
}

// ── Mutação 7: revisão de listening revela o alvo antes do áudio ──────────
{
  let checkedListening = 0;
  for (const lesson of ALL_LESSONS) {
    let steps;
    try {
      steps = lessonRoundStepsFor(lesson, { masteryPass: 1 });
    } catch {
      continue;
    }
    steps.forEach((step, index) => {
      if (step.kind !== "listen_select" && step.kind !== "audio_discrimination") return;
      const exercise = buildImmediateRemediationExercise({
        id: `${lesson.id}:${index}`,
        lessonId: lesson.id,
        moduleId: "",
        phaseId: "",
        taskId: "",
        questionId: `${lesson.id}:${index}:${step.kind}`,
        type: step.kind,
        prompt: step.prompt ?? "",
        correctAnswer: String(step.correctAnswer ?? step.answer ?? ""),
        selectedAnswer: "Resposta incorreta",
        timestamp: 0,
        skill: "som",
        targets: [],
        step,
      });
      if (exercise.kind !== "listen") return;
      checkedListening += 1;
      assert.ok(!exercise.display, `${lesson.id}#${index}: listening mostra o alvo antes do áudio`);
      assert.ok(exercise.audioText, `${lesson.id}#${index}: listening sem áudio para tocar`);
    });
  }
  assert.ok(checkedListening > 0, "nenhum item de listening foi verificado");
  kill(`Mutação 7 · review listening revela target antes do áudio (${checkedListening} itens)`);
}

// ── P3.2: cada família mantém a modalidade ────────────────────────────────
{
  const expectations = [
    ["image_choice", "image"],
    ["compare_with_image", "image"],
    ["listen_select", "listen"],
    ["tone", "tone"],
    ["sentence_build", "build"],
    ["fill_blank", "blank"],
    ["match_pairs", "pair"],
    ["recognize", "hanzi"],
    ["dialogue_choice", "choice"],
  ];
  for (const [from, expected] of expectations) {
    assert.equal(parity.preferredReviewKind(from), expected, `${from} deveria revisar como ${expected}`);
  }
  kill("P3.2 · cada modalidade original mantém a sua na revisão");
}

console.log(`PASS test:review-task-parity — ${killed.length} mutações mortas, com controle positivo.`);
