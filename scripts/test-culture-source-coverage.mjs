import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureSourceCoverage } from "./lib/culture-source-coverage-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureSourceCoverage(base).failures, [], "positive control");

function fixture() {
  return { ...base, items: structuredClone(base.items) };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureSourceCoverage(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "Lantern Festival sem source",
  (data) => {
    const item = data.items.find((row) => row.id === "lantern-festival");
    item.sources = [];
  },
  "MISSING_SOURCE"
);

mutation(
  "festival evergreen só com holiday2026",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    item.sources = item.sources.filter((source) => source.role === "year_specific");
  },
  "FESTIVAL_NO_EVERGREEN"
);

mutation(
  "year fact 2027 com holiday2026",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    item.yearFacts = [
      {
        year: 2027,
        labelPt: "x",
        labelEn: "x",
        verifiedAt: "2026-09-08",
        source: { ...item.sources.find((s) => s.role === "year_specific"), year: 2026 },
      },
    ];
  },
  "YEAR_FACT_SOURCE_MISMATCH"
);

mutation(
  "year fact sem verifiedAt",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    item.yearFacts[0].verifiedAt = "";
  },
  "YEAR_FACT_NO_VERIFIED"
);

console.log("PASS test:culture-source-coverage");
