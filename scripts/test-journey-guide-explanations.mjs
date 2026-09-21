/**
 * Runtime contract for Journey guide handoffs (RC2.2.5).
 * Asserts HANDOFF_LINES authority, Continue typing semantics, and no curriculum drift.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { journeyFingerprint } from "./lib/report-meta.mjs";

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
  createGuideDialogueState,
  reduceGuideDialogue,
  visibleGuideText,
  GUIDE_ADVANCE_GUARD_MS,
} = require("../src/lib/guideDialogueMachine.ts");

const { CONVERSATION_CAPABILITIES } = require("../src/data/conversationCapabilities.ts");
const { RC_BASE_FINGERPRINT } = require("../src/lib/curriculumFreeze.ts");

const root = process.cwd();

function loadHandoffLines() {
  const src = fs.readFileSync(path.join(root, "src/features/journey/JourneyInlineNode.tsx"), "utf8");
  const start = src.indexOf("export const HANDOFF_LINES");
  assert.ok(start >= 0, "HANDOFF_LINES export missing");
  const eq = src.indexOf("=", start);
  const brace = src.indexOf("{", eq);
  assert.ok(brace > eq, "HANDOFF_LINES object brace missing");
  let depth = 0;
  let end = -1;
  for (let i = brace; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end > brace, "HANDOFF_LINES object unclosed");
  // Source-of-truth object only — no React tree load.
  return new Function(`"use strict"; return (${src.slice(brace, end + 1)});`)();
}

const HANDOFF_LINES = loadHandoffLines();

const EXPECTED_IDS = [
  "booster:tone-contour-1-3:v1",
  "booster:pinyin-practice:v1",
  "booster:hanzi-builder-foundations:v1",
  "booster:first-conversation:v1",
];

assert.equal(Object.keys(HANDOFF_LINES).sort().join("|"), EXPECTED_IDS.slice().sort().join("|"));

for (const id of EXPECTED_IDS) {
  const row = HANDOFF_LINES[id];
  assert.ok(row.afterNodeId.startsWith("node:instruction:foundation:"));
  assert.ok(row.pt.length > 20, `${id} pt`);
  assert.ok(row.en.length > 20, `${id} en`);
  assert.notEqual(row.pt, row.en);
}

// P24.4 / P24.5 — Continue during typing completes only; second advances to DONE
{
  const messages = [HANDOFF_LINES["booster:tone-contour-1-3:v1"].pt];
  let state = reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant: false }, messages, {
    instant: false,
    now: 0,
  });
  assert.equal(state.phase, "typing");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10 }, messages);
  assert.equal(state.phase, "complete");
  assert.notEqual(state.phase, "done");
  assert.equal(visibleGuideText(messages, state), messages[0]);

  state = reduceGuideDialogue(
    state,
    { type: "CONTINUE", now: 10 + GUIDE_ADVANCE_GUARD_MS + 1 },
    messages,
    { now: 10 + GUIDE_ADVANCE_GUARD_MS + 1 }
  );
  assert.equal(state.phase, "done");
  console.log("PASS handoff Continue typing → complete → done");
}

// Rapid double-click guard
{
  const messages = [HANDOFF_LINES["booster:pinyin-practice:v1"].en];
  let state = reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant: false }, messages, {
    instant: false,
    now: 0,
  });
  const t0 = 1000;
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: t0 }, messages);
  assert.equal(state.phase, "complete");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: t0 + 1 }, messages);
  assert.equal(state.phase, "complete", "guard blocks skip");
  state = reduceGuideDialogue(
    state,
    { type: "CONTINUE", now: t0 + GUIDE_ADVANCE_GUARD_MS + 1 },
    messages,
    { now: t0 + GUIDE_ADVANCE_GUARD_MS + 1 }
  );
  assert.equal(state.phase, "done");
  console.log("PASS rapid double-click guard on handoff");
}

// Reduced motion → instant complete
{
  const messages = [HANDOFF_LINES["booster:hanzi-builder-foundations:v1"].pt];
  const state = reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant: true }, messages, {
    instant: true,
    now: 0,
  });
  assert.equal(state.phase, "complete");
  assert.equal(visibleGuideText(messages, state), messages[0]);
  console.log("PASS reduced-motion instant complete");
}

// Pedagogy gap baseline honesty — do not invent READY
{
  assert.equal(CONVERSATION_CAPABILITIES.length, 31);
  const ready = CONVERSATION_CAPABILITIES.filter((c) => c.status === "READY");
  const partial = CONVERSATION_CAPABILITIES.filter((c) => c.status === "PARTIAL");
  assert.equal(ready.length, 20);
  assert.equal(partial.length, 11);
  const expectedPartial = [
    "talk_family",
    "order_food",
    "order_drink",
    "negotiate_basic",
    "pay",
    "use_metro",
    "use_train",
    "ask_for_help",
    "ask_repeat",
    "express_preference",
    "make_simple_plan",
  ];
  assert.deepEqual(partial.map((c) => c.id).sort(), expectedPartial.slice().sort());
  console.log("PASS conversation capability baseline 20 READY / 11 PARTIAL");
}

// Fingerprint freeze
{
  const fp = journeyFingerprint(root);
  assert.equal(fp, RC_BASE_FINGERPRINT);
  assert.equal(fp, "a2ed1a0c1c6d");
  console.log(`PASS fingerprint ${fp}`);
}

// Wrapper collapses only after DONE (source contract)
{
  const wrapper = fs.readFileSync(
    path.join(root, "src/features/journey/JourneyGuideExplanation.tsx"),
    "utf8"
  );
  assert.match(wrapper, /onComplete=\{\(\) => setDismissed\(true\)\}/);
  assert.match(wrapper, /if \(!trimmed \|\| dismissed\) return null/);
  assert.doesNotMatch(wrapper, /navigate\(|useNavigate|routeForJourneyNode/);
  console.log("PASS wrapper dismisses without auto-navigation");
}

console.log("PASS test:journey-guide-explanations");
