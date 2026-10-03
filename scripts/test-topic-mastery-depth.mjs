import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { masteryPlanOverlap } from "./lib/mastery-plan-overlap.mjs";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";

const step = (kind, answer) => ({ kind, correctAnswer: answer });
const production = step("sentence_build", "target");
const recall = step("reverse_recall", "target");
const transfer = step("contextual_choice", "target");
assert.equal(masteryPlanOverlap([], [production]), 0);
assert.equal(masteryPlanOverlap([production, recall], [recall, production]), 1);
assert.equal(masteryPlanOverlap([production, production, recall], [production, transfer]), 0.5);
assert.equal(masteryPlanOverlap([production, transfer], [production, production, recall]), 0.5);
assert.equal(masteryPlanOverlap([production, production], [production]), 1);

installTsRequireHook();
const require = createRequire(import.meta.url);
const { getLesson } = require("../src/data/journey.ts");
const { lessonRoundStepsFor } = require("../src/features/lesson/lessonTasks.ts");
const { capabilityClosureStepsFor } = require("../src/data/capabilityClosureSteps.ts");
const ids = ["p3-ordem-das-palavras", "p4-char-shui", "p4-char-bu", "p5-ri-yue-ming", "p5-nv-zi-hao", "l28", "p6-china-cidades-2"];
for (const id of ids) {
  const lesson = getLesson(id);
  assert.ok(lesson, id);
  const plans = [3, 4].map((pass) => lessonRoundStepsFor(lesson, { masteryPass: pass, silent: true }));
  assert.ok(masteryPlanOverlap(...plans) < 0.92, `${id}: distinct M3/M4`);
  for (const [index, plan] of plans.entries()) {
    const pass = index + 3;
    assert.ok(plan.length <= 16, `${id} M${pass}: ${plan.length} steps`);
    for (const closure of capabilityClosureStepsFor(id, pass)) {
      assert.ok(plan.some((candidate) => Object.entries(closure).every(([key, value]) =>
        JSON.stringify(candidate[key]) === JSON.stringify(value)
      )), `${id} M${pass}: mandatory closure retained`);
    }
  }
}
console.log("OK test:topic-mastery-depth - overlap symmetry, copies, budgets and closure");
