#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureJourneyPlacement } from "./lib/v498b2-gates.mjs";

const base = loadCultureRuntime();
assert.equal(validateCultureJourneyPlacement(base).failures.length, 0, "positive control");

function killed(label, edit, code) {
  const data = {
    ...base,
    placement: structuredClone(base.placement),
    nodes: structuredClone(base.nodes),
    items: structuredClone(base.items),
  };
  edit(data);
  const failures = validateCultureJourneyPlacement(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} survived (expected ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

killed("CORE culture without Journey node", (data) => {
  data.nodes = data.nodes.filter((node) => node.type !== "CULTURE_LESSON" || node.id !== "culture:greetings-nihao");
}, "MISSING_NODE");

killed("two consecutive main-path Culture", (data) => {
  data.placement = data.placement.map((row) =>
    row.itemId === "thanks-keqi" ? { ...row, afterTopicId: "l2", track: "core" } : row
  );
}, "CONSECUTIVE_CORE");

killed("Culture card on Victory", (data) => {
  data.lessonPlayerSource = `${data.lessonPlayerSource}\n<CultureTouchpoint />\n`;
}, "POST_LESSON_CTA");

killed("Salvar para depois back on lesson", (data) => {
  data.lessonDetailSource = `culture-touchpoint-save`;
}, "SAVE_FOR_LATER");

console.log("PASS test:culture-journey-placement");
