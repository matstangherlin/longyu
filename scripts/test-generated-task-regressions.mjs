#!/usr/bin/env node
/**
 * RC1.4 P1.1 — reproduction record of the four known generated mismatches.
 *
 * BEFORE state is frozen historically (RC1.3 allowlist). AFTER state must be
 * coherent via the real generator. This is the regression half; historical
 * prompts/answers are documented as `before` on each fixture.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { RC14_REGRESSION_FIXTURES, validateGeneratedTaskIntegrity } from "./lib/rc1-4-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const { getLesson } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));

assert.equal(RC14_REGRESSION_FIXTURES.length, 4, "quatro fixtures históricas");

for (const fix of RC14_REGRESSION_FIXTURES) {
  assert.ok(fix.before, `${fix.id} precisa documentar o BEFORE`);
  const lesson = getLesson(fix.id);
  const steps = lessonRoundStepsFor(lesson, { masteryPass: fix.pass });
  const step = steps[fix.index];
  assert.equal(step.kind, fix.kind);
  assert.equal(step.correctAnswer, fix.after.targetRef, `${fix.id} AFTER target`);
  const prompt = step.dialoguePrompt || step.situationPt || step.prompt || "";
  // AFTER must not equal the historical contradiction.
  if (fix.before.answer && fix.before.answer !== fix.after.targetRef) {
    assert.notEqual(step.correctAnswer, fix.before.answer, `${fix.id} não pode voltar ao answer BEFORE`);
  }
  if (fix.before.prompt && fix.after.promptExcludes) {
    for (const frag of fix.after.promptExcludes) {
      assert.ok(!prompt.includes(frag), `${fix.id} prompt ainda tem "${frag}"`);
    }
  }
  console.log(`REGRESSION OK ${fix.id}#${fix.pass}:${fix.index} → ${step.correctAnswer}`);
}

const sweep = validateGeneratedTaskIntegrity();
assert.equal(sweep.failures.length, 0, JSON.stringify(sweep.failures));
assert.equal(sweep.mismatches, 0);

console.log("OK test:generated-task-regressions — 4 fixtures + sweep limpo");
