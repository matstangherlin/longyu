import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureLegendVsHistory } from "./lib/culture-truth-classification-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureLegendVsHistory(base).failures, [], "positive control");

function fixture() {
  return { ...base, items: structuredClone(base.items) };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureLegendVsHistory(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "sun-wukong.kind=history",
  (data) => {
    data.items.find((row) => row.id === "sun-wukong").kind = "history";
  },
  "LITERATURE_AS_HISTORY"
);

mutation(
  "journey-to-the-west.kind=history",
  (data) => {
    data.items.find((row) => row.id === "journey-to-the-west").kind = "history";
  },
  "LITERATURE_AS_HISTORY"
);

console.log("PASS test:culture-legend-vs-history");
