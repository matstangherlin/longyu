import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureFestivalDatePolicy } from "./lib/culture-festival-date-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureFestivalDatePolicy(base).failures, [], "positive control");

function fixture() {
  return { ...base, items: structuredClone(base.items) };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureFestivalDatePolicy(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "spring-festival só holiday2026",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    item.sources = item.sources.filter((source) => source.role === "year_specific");
  },
  "EVERGREEN_ONLY_ANNUAL"
);

mutation(
  "yearFact 2027 usa holiday2026",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    const annual = item.sources.find((source) => source.role === "year_specific");
    item.yearFacts = [
      {
        year: 2027,
        labelPt: "Em 2027…",
        labelEn: "In 2027…",
        verifiedAt: "2026-09-08",
        source: { ...annual, year: 2026 },
      },
    ];
  },
  "YEAR_FACT_WRONG_YEAR"
);

mutation(
  "yearFact sem verifiedAt",
  (data) => {
    const item = data.items.find((row) => row.id === "spring-festival");
    item.yearFacts[0].verifiedAt = "";
  },
  "YEAR_FACT_NO_VERIFIED"
);

{
  const item = structuredClone(base.items.find((row) => row.id === "spring-festival"));
  assert.equal(item.yearFacts[0].year, 2026);
  assert.equal(item.yearFacts[0].source.year, 2026);
  assert.deepEqual(validateCultureFestivalDatePolicy({ items: [item] }).failures, []);
  console.log("PASS yearFact 2026 + holiday2026");
}

console.log("PASS test:culture-festival-date-policy");
