#!/usr/bin/env node
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { countCurriculum } from "./lib/rc1-1-gates.mjs";
import { loadCultureRuntime, require as tsRequire } from "./lib/v495a-runtime.mjs";
import {
  loadRc2CandidateManifest,
  validateRc2ContentFreeze,
} from "./lib/rc2-content-freeze.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const freeze = tsRequire("../../src/lib/curriculumFreeze.ts");
const cultureRuntime = loadCultureRuntime();
const cultureNodes = (cultureRuntime.nodes ?? []).filter((node) => node.type === "CULTURE_LESSON");
const history = (cultureRuntime.items ?? []).filter((item) => item.kind === "history");
const operationalChecks = JSON.parse(
  fs.readFileSync(path.join(root, "docs/release/rc1-operational-checks.json"), "utf8")
);

const { failures } = validateRc2ContentFreeze({
  freeze,
  fingerprint: journeyFingerprint(root),
  counts: countCurriculum(),
  culture: {
    items: cultureRuntime.items.length,
    native: cultureRuntime.nativeLessons.length,
    journeyNodes: cultureNodes.length,
    history: history.length,
  },
  operationalChecks,
  candidateManifest: loadRc2CandidateManifest(root),
});

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `PASS validate:rc2-content-freeze — ${cultureRuntime.items.length} items · ${cultureNodes.length} journey culture · fp ${journeyFingerprint(root)}`
  );
}
