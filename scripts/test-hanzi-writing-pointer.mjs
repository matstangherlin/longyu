#!/usr/bin/env node
/**
 * RC2.3.4 — pointer-session contract tests (logic-level).
 * Ensures cancel/unmount style resets do not leave sticky drawing state.
 */
import assert from "node:assert/strict";

/** Minimal pointer session state machine mirroring canvas refs. */
function createPointerSession() {
  let drawing = false;
  let ink = [];
  let committed = [];
  let cancelled = 0;
  return {
    pointerDown(p) {
      drawing = true;
      ink = [p];
    },
    pointerMove(p) {
      if (!drawing) return;
      ink = [...ink, p];
    },
    pointerUp() {
      if (!drawing) return;
      drawing = false;
      if (ink.length >= 2) committed = [...committed, ink];
      ink = [];
    },
    pointerCancel() {
      drawing = false;
      ink = [];
      cancelled += 1;
    },
    leaveWhileDrawing() {
      if (drawing) this.pointerUp();
    },
    unmount() {
      drawing = false;
      ink = [];
    },
    snapshot() {
      return { drawing, inkLen: ink.length, committed: committed.length, cancelled };
    },
  };
}

const s = createPointerSession();
s.pointerDown({ x: 10, y: 10 });
s.pointerMove({ x: 20, y: 20 });
s.pointerUp();
assert.equal(s.snapshot().committed, 1);
assert.equal(s.snapshot().drawing, false);

s.pointerDown({ x: 1, y: 1 });
s.pointerMove({ x: 2, y: 2 });
s.pointerCancel();
assert.equal(s.snapshot().drawing, false);
assert.equal(s.snapshot().inkLen, 0);
assert.equal(s.snapshot().cancelled, 1);
assert.equal(s.snapshot().committed, 1);

s.pointerDown({ x: 5, y: 5 });
s.pointerMove({ x: 15, y: 15 });
s.leaveWhileDrawing();
assert.equal(s.snapshot().committed, 2);
assert.equal(s.snapshot().drawing, false);

s.pointerDown({ x: 1, y: 1 });
s.unmount();
assert.equal(s.snapshot().drawing, false);

console.log("PASS test-hanzi-writing-pointer");
