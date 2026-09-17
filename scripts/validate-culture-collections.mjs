import { loadCultureRuntime } from "./lib/v495a-runtime.mjs";
import {
  validateCultureCollections,
  validateCultureCollectionProgress,
} from "./lib/culture-collections-validation.mjs";

const data = loadCultureRuntime();
const failures = [
  ...validateCultureCollections(data).failures,
  ...validateCultureCollectionProgress(data).failures,
];

const summary = (data.cultureCollectionProgress?.([]) ?? []).map(
  (row) => `${row.id}=${row.total}`
);

console.log(JSON.stringify({ failures, collections: summary }, null, 2));
if (failures.length) process.exitCode = 1;
else
  console.log(
    `PASS validate:culture-collections (${data.collections.length} coleções · ${summary.join(" · ")})`
  );
