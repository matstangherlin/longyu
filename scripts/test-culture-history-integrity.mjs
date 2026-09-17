import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import {
  validateCultureHistoryIntegrity,
  validateCultureHistoryChronology,
} from "./lib/culture-history-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureHistoryIntegrity(base).failures, [], "positive integrity");
assert.deepEqual(validateCultureHistoryChronology(base).failures, [], "positive chronology");

function fixture() {
  return {
    ...base,
    items: structuredClone(base.items),
    nodes: structuredClone(base.nodes ?? []),
    hubOnlyItemIds: [...(base.hubOnlyItemIds ?? [])],
    historyTimeline: structuredClone(base.historyTimeline ?? []),
    cultureCollectionProgress: base.cultureCollectionProgress,
  };
}

function mutation(label, edit, code, validator = validateCultureHistoryIntegrity) {
  const data = fixture();
  edit(data);
  const failures = validator(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation("History vazio", (data) => {
  data.items = data.items.filter((item) => item.kind !== "history");
}, "HISTORY_EMPTY");

mutation("Sun Wukong vira history", (data) => {
  data.items.find((row) => row.id === "sun-wukong").kind = "history";
}, "LITERATURE_AS_HISTORY");

mutation("Journey to the West vira history", (data) => {
  data.items.find((row) => row.id === "journey-to-the-west").kind = "history";
}, "LITERATURE_AS_HISTORY");

mutation("Chinese Dragon vira history", (data) => {
  data.items.find((row) => row.id === "chinese-dragon").kind = "history";
}, "SYMBOL_AS_HISTORY");

mutation(
  "Tang antes de Han",
  (data) => {
    const tang = data.items.find((row) => row.id === "tang-dynasty");
    const han = data.items.find((row) => row.id === "han-dynasty");
    tang.order = han.order - 1;
  },
  "TANG_BEFORE_HAN",
  validateCultureHistoryChronology
);

mutation(
  "Song antes de Tang",
  (data) => {
    const song = data.items.find((row) => row.id === "song-dynasty");
    const tang = data.items.find((row) => row.id === "tang-dynasty");
    song.order = tang.order - 1;
  },
  "SONG_BEFORE_TANG",
  validateCultureHistoryChronology
);

mutation("History sem source", (data) => {
  data.items.find((row) => row.id === "qin-unification").sources = [];
}, "HISTORY_NO_SOURCE");

mutation("History usa holiday2026", (data) => {
  const item = data.items.find((row) => row.id === "han-dynasty");
  item.sources = [
    {
      title: "Notice on arrangements for several public holidays in 2026",
      publisher: "State Council",
      url: "https://www.gov.cn/example",
      accessedAt: "2026-09-08",
      role: "year_specific",
      year: 2026,
    },
  ];
}, "HISTORY_ANNUAL_SOURCE");

mutation("Qin overclaim muralha", (data) => {
  const item = data.items.find((row) => row.id === "qin-unification");
  item.bodyPt = "Qin construiu toda a Grande Muralha atual que os turistas visitam.";
  item.bodyEn = "Qin built all of today's Great Wall that tourists visit.";
}, "HISTORY_WALL_OVERCLAIM");

mutation("Tang melhor absoluta", (data) => {
  const item = data.items.find((row) => row.id === "tang-dynasty");
  item.bodyPt = "A Tang foi objetivamente a melhor dinastia da história chinesa.";
  item.bodyEn = "Tang was objectively the best dynasty in Chinese history.";
}, "HISTORY_BEST_DYNASTY");

mutation("Song inventou tudo", (data) => {
  const item = data.items.find((row) => row.id === "song-dynasty");
  item.bodyPt = "Song inventou tudo isso num único dia.";
  item.bodyEn = "Song invented everything in a single day.";
  item.summaryPt = "x";
  item.summaryEn = "x";
  item.whyPt = "x";
  item.whyEn = "x";
  item.practicePt = "x";
  item.practiceEn = "x";
}, "HISTORY_INVENTED_EVERYTHING");

mutation("6 history nodes na Journey", (data) => {
  data.hubOnlyItemIds = data.hubOnlyItemIds.filter(
    (id) =>
      ![
        "china-history-timeline",
        "qin-unification",
        "han-dynasty",
        "tang-dynasty",
        "song-dynasty",
        "ming-qing",
      ].includes(id)
  );
}, "HISTORY_JOURNEY_FLOOD");

console.log("PASS test:culture-history-integrity");
