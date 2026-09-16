#!/usr/bin/env node
/**
 * RC1.4 mutations M1–M22 (subset executed as structural kills).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validateGeneratedTaskIntegrity,
  validateMasteryPlannerIntegrity,
  validateNoFrozenAllowlist,
  validateFailClosedPreserved,
  validateGeneratedSemanticDiff,
  validateRc14CurriculumTopology,
  RC14_REGRESSION_FIXTURES,
} from "./lib/rc1-4-gates.mjs";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { createRequire } from "node:module";
import path from "node:path";

installTsRequireHook();
const require = createRequire(import.meta.url);
const root = process.cwd();
const { ALL_LESSONS, getLesson } = require(path.join(root, "src/data/journey.ts"));
const { lessonRoundStepsFor } = require(path.join(root, "src/features/lesson/lessonTasks.ts"));
const objective = require(path.join(root, "src/data/generatedTaskObjective.ts"));
const specs = require(path.join(root, "src/data/topicMasterySpecs.ts"));
const canonical = require(path.join(root, "src/features/lesson/canonicalAnswer.ts"));

const killed = [];
function kill(label) {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
}

{
  const r = validateGeneratedTaskIntegrity();
  assert.equal(r.failures.length, 0, JSON.stringify(r.failures));
  kill("M1–M5 · four fixtures coherent (prompt/answer/expl/hint/audio)");
}

{
  const tone = RC14_REGRESSION_FIXTURES[0];
  const lesson = getLesson(tone.id);
  const spec = specs.topicMasterySpecFor(lesson);
  const obj = objective.resolveGeneratedTaskObjective(lesson, tone.pass, spec);
  assert.notEqual(obj.targetRef, "你好");
  assert.equal(obj.relationType, "tone_contrast");
  kill("M1 · target 麻 com prompt 你/好 morto");
}

{
  const num = RC14_REGRESSION_FIXTURES[1];
  const lesson = getLesson(num.id);
  const steps = lessonRoundStepsFor(lesson, { masteryPass: num.pass });
  assert.equal(steps[num.index].correctAnswer, "十");
  kill("M2 · prompt 十 / answer 九 morto");
}

{
  const src = readFileSync("src/data/generatedTaskObjective.ts", "utf8");
  assert.doesNotMatch(src, /lesson\.id\s*===\s*["']p4-num-910["']/);
  kill("M6/P1.2 · sem hardcode de lessonId");
}

{
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = getLesson(fix.id);
    const steps = lessonRoundStepsFor(lesson, { masteryPass: fix.pass });
    const step = steps[fix.index];
    const answer = step.correctAnswer;
    for (let seed = 0; seed < 30; seed += 1) {
      const set = canonical.buildCanonicalOptionSet({
        canonical: {
          id: "x",
          display: answer,
          value: canonical.normalizeCanonicalValue(answer),
          explanation: step.explanation,
          audioTarget: answer,
        },
        distractors: (step.options ?? []).filter((o) => o !== answer),
        seed: `${fix.id}-${seed}`,
      });
      const correct = set.options.find((o) => o.id === set.correctOptionId);
      assert.equal(correct.label, answer);
    }
  }
  kill("M7–M10 · shuffle / options estáveis");
}

{
  const lesson = getLesson("p2-comparar-tom-2-3");
  const spec = specs.topicMasterySpecFor(lesson);
  const obj = objective.resolveGeneratedTaskObjective(lesson, 4, spec);
  assert.equal(obj.relationType, "tone_contrast");
  assert.ok((obj.anchorRefs ?? []).length >= 1);
  kill("M11–M12 · tone contrast com membros distintos");
}

{
  const lesson = getLesson("l19-logica-ma");
  const spec = specs.topicMasterySpecFor(lesson);
  const surfaces = objective.surfacesForObjective(
    objective.resolveGeneratedTaskObjective(lesson, 2, spec),
    spec,
    2,
    lesson
  );
  assert.match(surfaces.prompt, /pista sonora/i);
  assert.doesNotMatch(surfaces.prompt, /\bvizinhos?\b/i);
  kill("M13 · phonetic ≠ vizinhos");
}

{
  const r = validateNoFrozenAllowlist();
  assert.equal(r.failures.length, 0);
  kill("M14 · allowlist vazia");
}

{
  const r = validateFailClosedPreserved();
  assert.equal(r.failures.length, 0);
  kill("M15 · fail-closed preservado");
}

{
  const r = validateMasteryPlannerIntegrity();
  assert.equal(r.failures.length, 0, JSON.stringify(r.failures));
  kill("M16–M17 · labs 4/4; aquisição sem produção 3/4");
}

{
  const r = validateRc14CurriculumTopology();
  assert.equal(r.failures.length, 0, JSON.stringify(r.failures));
  assert.equal(r.lessons, 134);
  assert.equal(r.topics, 113);
  kill("M18–M20 · topologia 134/113 sem growth");
}

{
  const lesson = getLesson("p4-char-zhong");
  const spec = specs.topicMasterySpecFor(lesson);
  const a = objective.resolveGeneratedTaskObjective(lesson, 2, spec);
  const b = objective.resolveGeneratedTaskObjective(lesson, 2, spec);
  assert.equal(a.targetRef, b.targetRef);
  kill("M21 · mesma seed/objetivo → mesmo target");
}

{
  const r = validateGeneratedSemanticDiff();
  assert.equal(r.failures.length, 0);
  kill("M22 · semantic diff sem UNEXPECTED / sem hardcode");
}

console.log(`OK test:generated-task-integrity — ${killed.length} mutations killed`);
