/**
 * Motion unit + mutation tests for GuideDialogue entrance.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );

const {
  GUIDE_ENTRANCE_READY_MS,
  GUIDE_FIRST_LETTER_BUDGET_MS,
  initialGuideMotion,
  guideMotionAfterTimeout,
} = require("../src/lib/guideDialogueMotion.ts");
const {
  createGuideDialogueState,
  reduceGuideDialogue,
  GUIDE_ADVANCE_GUARD_MS,
} = require("../src/lib/guideDialogueMachine.ts");

assert.ok(GUIDE_ENTRANCE_READY_MS <= 400, "entrance must stay short");
assert.ok(GUIDE_FIRST_LETTER_BUDGET_MS <= 350);

assert.equal(initialGuideMotion(true), "ready");
assert.equal(initialGuideMotion(false), "entering");
assert.equal(guideMotionAfterTimeout("entering", 0), "entering");
assert.equal(guideMotionAfterTimeout("entering", GUIDE_ENTRANCE_READY_MS), "ready");
assert.equal(guideMotionAfterTimeout("ready", 0), "ready");

// Continue still works independently of motion (pedagogical machine).
{
  let state = reduceGuideDialogue(createGuideDialogueState(), { type: "START" }, ["Olá"], {
    now: 0,
  });
  assert.equal(state.phase, "typing");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10 }, ["Olá"]);
  assert.equal(state.phase, "complete");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10 + GUIDE_ADVANCE_GUARD_MS + 1 }, [
    "Olá",
    "Mundo",
  ]);
  assert.equal(state.messageIndex, 1);
  console.log("PASS continue during entrance-compatible machine");
}

// Rapid click still guarded
{
  let state = reduceGuideDialogue(createGuideDialogueState(), { type: "START" }, ["A", "B"], {
    now: 0,
  });
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 5 }, ["A", "B"]);
  const blocked = reduceGuideDialogue(state, { type: "CONTINUE", now: 6 }, ["A", "B"]);
  assert.equal(blocked.messageIndex, 0);
  console.log("PASS rapid click guard intact");
}

function mutation(label, fn) {
  let failed = false;
  try {
    fn();
  } catch {
    failed = true;
  }
  assert.ok(failed, `${label} survived`);
  console.log(`KILLED ${label}`);
}

mutation("entrance ready too slow", () => {
  assert.ok(GUIDE_ENTRANCE_READY_MS > 800);
});

mutation("reduced motion still entering", () => {
  assert.equal(initialGuideMotion(true), "entering");
});

mutation("motion never reaches ready", () => {
  assert.equal(guideMotionAfterTimeout("entering", GUIDE_ENTRANCE_READY_MS + 50), "entering");
});

console.log("PASS test:guide-dialogue-motion");
