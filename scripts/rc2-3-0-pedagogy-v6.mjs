#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-3-0-gates.mjs";

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
  "discovery-stage": [
    ["[1] taught API removed", "TAUGHT_API", src("discovery", "hasLearnerBeenTaught", "hasLearnerSeenMaybe")],
    ["[2] player unwired", "PLAYER_WIRE", src("player", "applyPedagogyV6ToPlan", "applyPedagogyV5ToPlan")],
  ],
  "progressive-mastery": [
    ["[3] old budget restored", "BUDGET_P1", src("mastery", "min: 7, max: 9", "min: 5, max: 8")],
  ],
  "perceptual-repetition": [
    ["[4] diversify removed", "PERCEPTUAL_API", src("perceptual", "diversifyPerceptualSession", "diversifyLegacySession")],
  ],
  "early-visual": [
    ["[5] gate code removed", "GATE_CODE", src("visual", "VISUAL_SUPPORT_MISSING", "VISUAL_OK_ALWAYS")],
  ],
  "human-context": [
    ["[6] human copy removed", "HUMAN_PILOT_COPY", src("foundation", "Você encontra alguém pela manhã", "Qual é a tradução correta")],
  ],
  "activity-contract": [
    ["[7] audit removed", "CONTRACT", src("contract", "auditPedagogicalSession", "auditLegacySession")],
  ],
  "first20-closure": [
    ["[8] billing enabled", "BILLING", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
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
