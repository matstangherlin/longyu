#!/usr/bin/env node
/**
 * Phase 14 — controlled fixtures for System One answer schema.
 * Pure: no network. Uses supabase/functions/_shared/jevAnswers.ts via tsRequire.
 */
import assert from "node:assert/strict";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const { validateJevAnswers } = tsRequire("../../supabase/functions/_shared/jevAnswers.ts");

const QUESTIONS = {
  kind: {
    type: "choice",
    instructions: "kind",
    criteria: { bug: "broken", praise: "good" },
  },
  severity: {
    type: "score",
    instructions: "severity",
    criteria: ["none", "annoy", "block", "critical"],
  },
  needs_human: {
    type: "noul",
    instructions: "needs human",
  },
};

const valid = {
  kind: { type: "choice", choice: "bug", probabilities: { bug: 0.9 }, confidence: 0.9 },
  severity: { type: "score", score: 2, probabilities: { "2": 0.8 }, confidence: 0.8 },
  needs_human: { type: "noul", noul: 0.2 },
};

let n = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  n += 1;
};
const throws = (fn, re, msg) => {
  let hit = false;
  try {
    fn();
  } catch (e) {
    hit = re.test(String(e?.message ?? e));
  }
  ok(hit, msg);
};

validateJevAnswers(QUESTIONS, valid);
ok(true, "valid choice+score+noul accepted");

throws(() => validateJevAnswers(QUESTIONS, null), /jev_bad_response/, "null answers rejected");
throws(() => validateJevAnswers(QUESTIONS, []), /jev_bad_response/, "array answers rejected");
throws(
  () => validateJevAnswers(QUESTIONS, { ...valid, kind: undefined }),
  /jev_bad_answer:kind/,
  "missing answer rejected",
);
throws(
  () => validateJevAnswers(QUESTIONS, { ...valid, kind: { type: "choice", choice: "not-a-criteria", probabilities: {}, confidence: 1 } }),
  /jev_bad_choice:kind/,
  "wrong choice rejected",
);
throws(
  () => validateJevAnswers(QUESTIONS, { ...valid, severity: { type: "score", score: "2", probabilities: {}, confidence: 1 } }),
  /jev_bad_score:severity/,
  "wrong score type rejected",
);
throws(
  () => validateJevAnswers(QUESTIONS, { ...valid, needs_human: { type: "noul", noul: "yes" } }),
  /jev_bad_noul:needs_human/,
  "wrong noul type rejected",
);
throws(
  () => validateJevAnswers(QUESTIONS, { ...valid, kind: { type: "score", score: 1, probabilities: {}, confidence: 1 } }),
  /jev_bad_choice:kind/,
  "wrong answer type vs question rejected",
);

console.log(`PASS test:jev-answer-contract (${n} checks)`);
