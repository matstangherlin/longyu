import assert from "node:assert/strict";
import { cloneCultureRuntime, loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCulturePlayability, validateExerciseAffordance } from "./lib/v498a2-gates.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateExerciseAffordance(base).failures, [], "affordance positive");
assert.deepEqual(validateCulturePlayability(base).failures, [], "playability positive");

function kill(label, edit, code) {
  const data = cloneCultureRuntime(base);
  edit(data);
  const failures = validateCulturePlayability(data).failures;
  assert(failures.some((item) => item.code === code), `${label} survived; ${JSON.stringify(failures)}`);
  console.log(`KILLED ${label}: ${code}`);
}

kill("1 sequence without pieces", (data) => {
  const lesson = data.nativeLessons.find((item) => item.id === "culture-qingwen-ask");
  for (const step of lesson.steps) {
    if (step.kind === "sentence_build") {
      step.target = [];
      step.targetParts = [];
      step.bank = [];
    }
  }
}, "NO_AFFORDANCE");

kill("2 fill_blank without bank", (data) => {
  const fill = data.nativeLessons[0].steps.find((step) => step.kind === "fill_blank");
  fill.bank = [];
}, "NO_AFFORDANCE");

kill("3 choice without options", (data) => {
  const lesson = data.nativeLessons.find((item) => item.steps.some((step) => step.kind === "dialogue_choice"));
  lesson.steps.find((step) => step.kind === "dialogue_choice").options = [];
}, "NO_AFFORDANCE");

kill("6 save for later in player", (data) => {
  data.lessonPlayerSource += `\n<button data-testid="culture-save">Salvar para depois</button>\n`;
}, "SAVE_IN_PLAYER");

console.log("PASS test:culture-playability");
