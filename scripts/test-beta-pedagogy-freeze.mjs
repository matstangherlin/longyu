#!/usr/bin/env node
/** test:beta-pedagogy-freeze — cada expansão silenciosa precisa ser recusada. */
import assert from "node:assert/strict";
import { validateBetaPedagogyFreeze } from "./lib/beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./lib/beta-pedagogy-freeze-state.mjs";

const base = loadBetaPedagogyFreezeState();
assert.deepEqual(validateBetaPedagogyFreeze(base), [], "estado real precisa passar");

const clone = () => structuredClone(base);
const mutations = [
  ["lição nova", (s) => { s.counts.lessons += 1; }, "NEW_LESSON"],
  ["tópico novo", (s) => { s.counts.teachingTopics += 1; }, "NEW_TEACHING_TOPIC"],
  ["CultureItem novo", (s) => { s.counts.cultureItems += 1; }, "NEW_CULTURE_ITEM"],
  ["moeda nova (export na economia)", (s) => { s.economyExports.push("GEM_START"); }, "NEW_CURRENCY"],
  ["moeda nova (módulo)", (s) => { s.systemModules.push("src/lib/gemWallet.ts"); }, "NEW_CURRENCY"],
  ["SRS novo", (s) => { s.systemModules.push("src/lib/srsV2.ts"); }, "NEW_SRS"],
  ["motor de desafio novo", (s) => { s.systemModules.push("src/features/challenge/BossChallengePage.tsx"); }, "NEW_CHALLENGE_ENGINE"],
  ["motor de conquistas novo", (s) => { s.systemModules.push("src/lib/achievementEngineV2.ts"); }, "NEW_ACHIEVEMENT_ENGINE"],
  ["sistema de progressão novo", (s) => { s.systemModules.push("src/lib/seasonProgression.ts"); }, "NEW_PROGRESSION_SYSTEM"],
  ["feature pública nova", (s) => { s.featureTruthIds.push("ai_tutor_chat"); }, "NEW_PUBLIC_FEATURE"],
  ["currículo mudou sem atualizar o freeze", (s) => { s.fingerprint = "000000000000"; }, "FINGERPRINT_DRIFT"],
  ["capacidade READY a menos", (s) => { s.counts.conversationCapabilitiesRuntimeReady -= 1; }, "CAPABILITY_READY_DRIFT"],
];
for (const [label, mutate, code] of mutations) {
  const state = clone();
  mutate(state);
  const failures = validateBetaPedagogyFreeze(state);
  assert.ok(failures.some((item) => item.code === code), `mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`);
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS test:beta-pedagogy-freeze (${mutations.length} mutações)`);
