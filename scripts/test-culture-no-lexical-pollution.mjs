import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureNoLexicalPollution } from "./lib/culture-no-lexical-pollution-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureNoLexicalPollution(base).failures, [], "positive control");

function fixture() {
  return {
    ...base,
    items: structuredClone(base.items),
    nativeLessons: structuredClone(base.nativeLessons),
    storeSource: base.storeSource,
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureNoLexicalPollution(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "孙悟空 entra em newRefs",
  (data) => {
    const lesson = data.nativeLessons.find((row) => row.cultureItemId === "sun-wukong");
    lesson.newRefs = ["孙悟空"];
  },
  "CULTURE_TERM_IN_NEW_REFS"
);

mutation(
  "西游记 entra no SRS",
  (data) => {
    const lesson = data.nativeLessons.find((row) => row.cultureItemId === "journey-to-the-west");
    lesson.srsSeed = [{ hanzi: "西游记" }];
  },
  "CULTURE_SRS_SEED"
);

mutation(
  "Culture error altera weak Mandarin",
  (data) => {
    data.storeSource = `${data.storeSource}\nfunction completeCultureLesson(){ updateWeakWords(); weakLexical(); }`;
  },
  "CULTURE_WEAK_LEXICAL"
);

console.log("PASS test:culture-no-lexical-pollution");
