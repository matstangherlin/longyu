#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-3-1-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
  process.exit(2);
}
const base = await loadState();
if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(`${mode}:${area}`, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};

const MUTATIONS = {
  "visual-engine": [
    ["[1] resolve removed", "RESOLVE", src("resolve", "resolveCurriculumVisual", "resolveLegacyVisual")],
    ["[2] apply unwired", "WIRE", src("pedagogyApply", "applyVisualFirstToPlan", "applyLegacyVisualPlan")],
  ],
  "visual-audit": [["[3] audit lessons wiped", "LESSONS", (s) => { s.audit = { ...(s.audit ?? {}), totalLessons: 2 }; }]],
  "visual-closure": [
    ["[4] billing enabled", "BILLING", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
    ["[5] fake owner PASS", "FAKE_OWNER", (s) => { s.matrix = { ...(s.matrix ?? {}), statuses: { ...(s.matrix?.statuses ?? {}), OWNER_VISUAL_ACCEPTANCE: "PASS" } }; }],
    [
      "[6] matrix/audit mismatch",
      "MATRIX_STATUS_MUST_MATCH_AUDIT",
      (s) => {
        s.matrix = {
          ...(s.matrix ?? {}),
          statuses: { ...(s.matrix?.statuses ?? {}), FIRST_EXPOSURE_PASS: "YES" },
        };
        s.audit = { ...(s.audit ?? {}), firstExposureMissing: 9, firstExposureCovered: 0 };
        s.full = { ...(s.full ?? {}), firstExposureMissing: 9, firstExposureCovered: 0 };
      },
    ],
  ],
};

const cases = MUTATIONS[area] ?? [];
const clean = await gate(base);
assert.deepEqual(clean, [], `${area}: estado real falhou\n${report(`${mode}:${area}`, clean)}`);
let killed = 0;
let failed = 0;
for (const [label, code, mutate] of cases) {
  const state = structuredClone(base);
  try {
    mutate(state);
    const failures = await gate(state);
    const codes = failures.map((f) => f.code);
    assert.ok(codes.includes(code), `${label}: esperava ${code}, veio ${codes.join(", ") || "nenhuma"}`);
    console.log(`KILLED ${label}: ${code}`);
    killed += 1;
  } catch (err) {
    console.error(`FAIL mutation: ${label}: ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
}
console.log(`PASS test:${area} (${killed} mutações)`);
process.exit(failed ? 1 : 0);
