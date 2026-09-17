import assert from "node:assert/strict";
import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import { validateCultureHubCollections } from "./lib/culture-hub-collections-validation.mjs";

const base = loadCultureRuntime();
assert.deepEqual(validateCultureHubCollections(base).failures, [], "positive control");

function fixture() {
  return {
    ...base,
    cultureHubSource: base.cultureHubSource,
    routesSource: base.routesSource,
    featuredIds: [...(base.featuredIds ?? [])],
    items: structuredClone(base.items),
    collections: structuredClone(base.collections),
  };
}

function mutation(label, edit, code) {
  const data = fixture();
  edit(data);
  const failures = validateCultureHubCollections(data).failures;
  assert(
    failures.some((item) => item.code === code),
    `${label} sobreviveu (esperado ${code}); ${JSON.stringify(failures)}`
  );
  console.log(`KILLED ${label}: ${code}`);
}

mutation(
  "Hub ignora collections",
  (data) => {
    data.cultureHubSource = data.cultureHubSource
      .replace(/CULTURE_COLLECTIONS/g, "NOTHING")
      .replace(/cultureCollectionProgress/g, "noop")
      .replace(/data-testid=\"culture-collections\"/g, "data-testid=\"gone\"");
  },
  "HUB_IGNORES_COLLECTIONS"
);

mutation(
  "featured aponta para ID inexistente",
  (data) => {
    data.featuredIds = ["spring-festival", "not-a-real-item", "chinese-dragon"];
  },
  "FEATURED_MISSING"
);

mutation(
  "History 0 mostra progresso 0/0",
  (data) => {
    data.cultureHubSource = `${data.cultureHubSource}\n{t("culture.collectionProgress", { done: 0, total: 0 })} /* 0 de 0 */`;
  },
  "EMPTY_ZERO_PROGRESS"
);

console.log("PASS test:culture-hub-collections");
