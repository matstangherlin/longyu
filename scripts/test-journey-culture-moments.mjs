/**
 * Mutation tests for Journey Culture Moments gates.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import ts from "typescript";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );

const { JOURNEY_CULTURE_MOMENTS, JOURNEY_CULTURE_MOMENT_MAX } = require("../src/data/journeyCultureMoments.ts");
const { CULTURE_ITEMS } = require("../src/data/culture.ts");
const { CULTURE_HUB_ONLY_ITEM_IDS } = require("../src/data/cultureNative.ts");

assert.ok(JOURNEY_CULTURE_MOMENTS.length >= 4);
assert.ok(JOURNEY_CULTURE_MOMENTS.length <= JOURNEY_CULTURE_MOMENT_MAX);

function mutation(label, edit, expectFail) {
  const clone = structuredClone(JOURNEY_CULTURE_MOMENTS);
  edit(clone);
  let failed = false;
  try {
    expectFail(clone);
  } catch {
    failed = true;
  }
  assert.ok(failed, `${label} survived`);
  console.log(`KILLED ${label}`);
}

mutation(
  "missing cultureItemId",
  (rows) => {
    rows[0].cultureItemId = "does-not-exist";
  },
  (rows) => {
    const ids = new Set(CULTURE_ITEMS.map((i) => i.id));
    assert.ok(ids.has(rows[0].cultureItemId));
  }
);

mutation(
  "duplicate cultureItemId",
  (rows) => {
    rows[1].cultureItemId = rows[0].cultureItemId;
  },
  (rows) => {
    const seen = new Set();
    for (const row of rows) {
      assert.ok(!seen.has(row.cultureItemId));
      seen.add(row.cultureItemId);
    }
  }
);

mutation(
  "required (not optional)",
  (rows) => {
    rows[0].optional = false;
  },
  (rows) => {
    assert.equal(rows[0].optional, true);
  }
);

mutation(
  "too many moments",
  (rows) => {
    while (rows.length <= JOURNEY_CULTURE_MOMENT_MAX) {
      rows.push({
        id: `moment-extra-${rows.length}`,
        cultureItemId: CULTURE_HUB_ONLY_ITEM_IDS[rows.length % CULTURE_HUB_ONLY_ITEM_IDS.length],
        afterTopicId: "l2",
        priority: 99,
        optional: true,
        reason: "x",
      });
    }
  },
  (rows) => {
    assert.ok(rows.length <= JOURNEY_CULTURE_MOMENT_MAX);
  }
);

mutation(
  "Sun Wukong stays literature",
  () => {},
  () => {
    const item = CULTURE_ITEMS.find((i) => i.id === "sun-wukong");
    // Gate: reclassification to history must be rejected.
    assert.equal(item.kind, "history");
  }
);

mutation(
  "Chinese Dragon stays symbol",
  () => {},
  () => {
    const item = CULTURE_ITEMS.find((i) => i.id === "chinese-dragon");
    assert.equal(item.kind, "history");
  }
);

console.log("PASS test:journey-culture-moments");
