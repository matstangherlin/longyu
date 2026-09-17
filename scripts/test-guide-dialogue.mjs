/**
 * GuideDialogue state machine contract — presentation only.
 * Mutations from RC2.1.1 P30 / P32.
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
  createGuideDialogueState,
  reduceGuideDialogue,
  segmentGraphemes,
  visibleGuideText,
  GUIDE_ADVANCE_GUARD_MS,
} = require("../src/lib/guideDialogueMachine.ts");

const MESSAGES = [
  "Hoje vamos aprender por que os tons importam.",
  "Em mandarim, mudar o tom pode mudar completamente a palavra.",
  "Ouça estas duas palavras.",
];

function start(instant = false, now = 0) {
  return reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant }, MESSAGES, {
    instant,
    now,
  });
}

// P30.5 — grapheme-safe pinyin
{
  const g = segmentGraphemes("nǐ hǎo");
  assert.equal(g.join(""), "nǐ hǎo");
  assert.ok(g.includes("ǐ") || g.some((part) => part.includes("ǐ") || part === "nǐ"));
  assert.ok(!g.includes("n") || g[0] === "n" || g[0] === "nǐ");
  // Combining tone marks stay attached when Segmenter is available
  const ni = segmentGraphemes("nǐ");
  assert.equal(ni.join(""), "nǐ");
  assert.ok(ni.length <= 2, `nǐ should be 1–2 graphemes, got ${ni.length}: ${JSON.stringify(ni)}`);
  const lü = segmentGraphemes("lǚ");
  assert.equal(lü.join(""), "lǚ");
  console.log("PASS grapheme pinyin nǐ / lǚ");
}

// P30.1 — TYPING + Continue → COMPLETE (same message)
{
  let state = start(false, 0);
  assert.equal(state.phase, "typing");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10 }, MESSAGES);
  assert.equal(state.phase, "complete");
  assert.equal(state.messageIndex, 0);
  assert.equal(visibleGuideText(MESSAGES, state), MESSAGES[0]);
  console.log("PASS TYPING+Continue → COMPLETE");
}

// P30.2 — 1 click during typing is NOT DONE
{
  let state = start(false, 0);
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: 10 }, MESSAGES);
  assert.notEqual(state.phase, "done");
  assert.equal(state.messageIndex, 0);
  console.log("PASS typing click does not DONE");
}

// P30.1 — COMPLETE + Continue → NEXT
{
  let state = start(true, 0);
  assert.equal(state.phase, "complete");
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: GUIDE_ADVANCE_GUARD_MS + 1 }, MESSAGES, {
    instant: true,
    now: GUIDE_ADVANCE_GUARD_MS + 1,
  });
  assert.equal(state.messageIndex, 1);
  assert.ok(state.phase === "complete" || state.phase === "typing");
  console.log("PASS COMPLETE+Continue → NEXT");
}

// P30.1 — last COMPLETE + Continue → DONE
{
  let state = start(true, 0);
  for (let i = 0; i < MESSAGES.length; i++) {
    const now = (i + 1) * (GUIDE_ADVANCE_GUARD_MS + 5);
    state = reduceGuideDialogue(state, { type: "CONTINUE", now }, MESSAGES, { instant: true, now });
  }
  assert.equal(state.phase, "done");
  console.log("PASS last COMPLETE+Continue → DONE");
}

// P30.3 — rapid double click does not skip 2 messages
{
  let state = start(false, 0);
  const t0 = 1000;
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: t0 }, MESSAGES);
  assert.equal(state.phase, "complete");
  assert.equal(state.messageIndex, 0);
  // Immediate second click inside guard window
  state = reduceGuideDialogue(state, { type: "CONTINUE", now: t0 + 1 }, MESSAGES);
  assert.equal(state.messageIndex, 0, "guard must block advance");
  assert.equal(state.phase, "complete");
  // After guard
  state = reduceGuideDialogue(
    state,
    { type: "CONTINUE", now: t0 + GUIDE_ADVANCE_GUARD_MS + 1 },
    MESSAGES
  );
  assert.equal(state.messageIndex, 1);
  console.log("PASS rapid double-click guard");
}

// P30.4 — reduced motion / instant → COMPLETE immediately
{
  const state = start(true, 0);
  assert.equal(state.phase, "complete");
  assert.equal(visibleGuideText(MESSAGES, state), MESSAGES[0]);
  console.log("PASS reduced-motion instant COMPLETE");
}

// P32.7 — machine never invents messages
{
  const empty = reduceGuideDialogue(createGuideDialogueState(), { type: "START" }, [], { now: 0 });
  assert.equal(empty.phase, "done");
  assert.equal(visibleGuideText([], empty), "");
  console.log("PASS empty messages → done, no invented text");
}

// Tick advances grapheme by grapheme
{
  let state = start(false, 0);
  state = reduceGuideDialogue(state, { type: "TICK", now: 1 }, MESSAGES);
  assert.equal(state.visibleCount, 1);
  assert.equal(state.phase, "typing");
  const full = segmentGraphemes(MESSAGES[0]).length;
  for (let i = 1; i < full; i++) {
    state = reduceGuideDialogue(state, { type: "TICK", now: i + 1 }, MESSAGES);
  }
  assert.equal(state.phase, "complete");
  assert.equal(state.visibleCount, full);
  console.log("PASS TICK completes message");
}

console.log("PASS test:guide-dialogue");
