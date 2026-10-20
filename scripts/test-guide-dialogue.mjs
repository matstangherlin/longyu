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

// RC2.3.13R.3.2.6 — "idle" now lasts until the guide is on screen: Continue
// while idle shows the whole line (a tap is never swallowed) and the advance
// guard still holds, so one tap never both completes and advances.
{
  const idle = createGuideDialogueState();
  const next = reduceGuideDialogue(idle, { type: "CONTINUE", now: 10 }, MESSAGES);
  assert.equal(next.phase, "complete");
  assert.equal(next.messageIndex, 0);
  assert.equal(visibleGuideText(MESSAGES, next), MESSAGES[0]);
  assert.equal(reduceGuideDialogue(next, { type: "CONTINUE", now: 10 + GUIDE_ADVANCE_GUARD_MS - 1 }, MESSAGES).messageIndex, 0);
  assert.equal(reduceGuideDialogue(next, { type: "CONTINUE", now: 10 + GUIDE_ADVANCE_GUARD_MS + 1 }, MESSAGES).messageIndex, 1);
  console.log("PASS CONTINUE while waiting to be seen completes; guard holds");
}

// RC2.3.13R.3.2.6 — the start rule (src/lib/motion/guideStart.ts), executed
// with a fake IntersectionObserver and document: offscreen = no start; a tall
// guide that fills the screen starts; a hidden document holds it; one start.
{
  const observers = [];
  let visibility = "visible";
  const listeners = new Set();
  class FakeIO {
    constructor(cb, opts) {
      this.cb = cb;
      this.opts = opts;
      this.disconnected = false;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
    fire(entry) {
      if (!this.disconnected) this.cb([entry]);
    }
  }
  const saved = { IntersectionObserver: globalThis.IntersectionObserver, document: globalThis.document };
  globalThis.IntersectionObserver = FakeIO;
  globalThis.document = {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (type, fn) => type === "visibilitychange" && listeners.add(fn),
    removeEventListener: (type, fn) => type === "visibilitychange" && listeners.delete(fn),
  };
  try {
    const {
      GUIDE_ON_SCREEN_RATIO,
      GUIDE_OBSERVER_THRESHOLDS,
      guideRecordOnScreen,
      observeOnScreenOnce,
    } = require("../src/lib/motion/guideStart.ts");
    const viewport = { height: 844 };
    const entry = (ratio, visibleHeight) => ({
      isIntersecting: ratio > 0,
      intersectionRatio: ratio,
      intersectionRect: { height: visibleHeight },
      rootBounds: viewport,
    });

    assert.equal(GUIDE_ON_SCREEN_RATIO, 0.6);
    assert.ok(GUIDE_OBSERVER_THRESHOLDS.includes(GUIDE_ON_SCREEN_RATIO));
    // A peek at the bottom edge is not "seen".
    assert.equal(guideRecordOnScreen(entry(0.2, 40)), false);
    assert.equal(guideRecordOnScreen(entry(0, 0)), false);
    assert.equal(guideRecordOnScreen(entry(0.6, 120)), true);
    // A guide taller than the screen can never show 60% of itself: filling
    // 60% of the viewport counts (it would otherwise wait forever).
    assert.equal(guideRecordOnScreen(entry(0.42, 844)), true);
    assert.equal(guideRecordOnScreen(entry(0.2, 400)), false);
    // Without rootBounds (cross-origin frame) only the ratio counts.
    assert.equal(
      guideRecordOnScreen({ isIntersecting: true, intersectionRatio: 0.42, intersectionRect: { height: 844 }, rootBounds: null }),
      false
    );

    let seen = 0;
    observeOnScreenOnce({}, () => (seen += 1));
    const io = observers.at(-1);
    assert.deepEqual([...io.opts.threshold].sort((a, b) => a - b), io.opts.threshold);
    io.fire(entry(0, 0));
    io.fire(entry(0.3, 60));
    assert.equal(seen, 0, "offscreen / peeking guide must not start");
    visibility = "hidden";
    io.fire(entry(1, 200));
    assert.equal(seen, 0, "hidden document must hold the line");
    visibility = "visible";
    for (const fn of [...listeners]) fn();
    assert.equal(seen, 1, "the line starts when the document is visible again");
    assert.equal(io.disconnected, true, "observer disconnects on the first start");
    assert.equal(listeners.size, 0, "visibility listener removed on the first start");
    io.fire(entry(0, 0));
    io.fire(entry(1, 200));
    assert.equal(seen, 1, "scrolling away and back never restarts the line");
    console.log("PASS guideStart: seen once at ≥60% in a visible document; tall guide; no restart");
  } finally {
    globalThis.IntersectionObserver = saved.IntersectionObserver;
    if (saved.document === undefined) delete globalThis.document;
    else globalThis.document = saved.document;
  }
}

console.log("PASS test:guide-dialogue");
