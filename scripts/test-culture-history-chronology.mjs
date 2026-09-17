import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureHistoryChronology } from "./lib/culture-history-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureHistoryChronology(base).failures, [], "positive control");

function fixture() {
  return {
    ...base,
    items: structuredClone(base.items),
    historyTimeline: structuredClone(base.historyTimeline ?? []),
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureHistoryChronology(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("Tang antes de Han", (data) => {
  data.items.find((row) => row.id === "tang-dynasty").order = 1;
  data.items.find((row) => row.id === "han-dynasty").order = 50;
}, "TANG_BEFORE_HAN");

mutation("Song antes de Tang", (data) => {
  data.items.find((row) => row.id === "song-dynasty").order = 1;
  data.items.find((row) => row.id === "tang-dynasty").order = 50;
}, "SONG_BEFORE_TANG");

mutation("Timeline regression", (data) => {
  const tang = data.historyTimeline.find((row) => row.id === "tang");
  const han = data.historyTimeline.find((row) => row.id === "han");
  tang.startYear = han.startYear - 100;
}, "TIMELINE_REGRESSION");

console.log("PASS test:culture-history-chronology");
