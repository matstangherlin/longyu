import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureTruthClassification } from "./lib/culture-truth-classification-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureTruthClassification(base).failures, [], "positive control");

function fixture() {
  return { ...base, items: structuredClone(base.items) };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureTruthClassification(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "Sun Wukong marcado history",
  (data) => {
    data.items.find((row) => row.id === "sun-wukong").kind = "history";
  },
  "LITERATURE_AS_HISTORY"
);

mutation(
  "Journey to the West marcado history",
  (data) => {
    data.items.find((row) => row.id === "journey-to-the-west").kind = "history";
  },
  "LITERATURE_AS_HISTORY"
);

mutation(
  "Sun Wukong copy como biografia real",
  (data) => {
    const item = data.items.find((row) => row.id === "sun-wukong");
    item.bodyPt = "Sun Wukong nasceu como um general real no século XVI.";
    item.bodyEn = "Sun Wukong was born as a real general in the sixteenth century.";
    item.summaryPt = "História documentada.";
    item.summaryEn = "Documented history.";
    item.noticePt = "Arquivo militar.";
    item.noticeEn = "Military archive.";
    item.whyPt = "Fato.";
    item.whyEn = "Fact.";
    item.practicePt = "Memorize.";
    item.practiceEn = "Memorise.";
    item.situationPt = "x";
    item.situationEn = "x";
    item.titlePt = "x";
    item.titleEn = "x";
  },
  "NARRATIVE_UNFRAMED"
);

mutation(
  "Chinese Dragon universalização sem scope",
  (data) => {
    const item = data.items.find((row) => row.id === "chinese-dragon");
    item.bodyPt = "O dragão chinês SEMPRE representa o imperador e sempre significa poder absoluto.";
    item.bodyEn = "The Chinese dragon ALWAYS means absolute power and always represents the emperor.";
  },
  "SYMBOL_UNIVERSAL"
);

console.log("PASS test:culture-truth-classification");
