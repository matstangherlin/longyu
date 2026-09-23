#!/usr/bin/env node
/** validate:beta-pedagogy-freeze — RC2.2.9 (ver BETA_PEDAGOGY_FREEZE). */
import process from "node:process";
import { validateBetaPedagogyFreeze } from "./lib/beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./lib/beta-pedagogy-freeze-state.mjs";

const state = loadBetaPedagogyFreezeState();
const failures = validateBetaPedagogyFreeze(state);
if (failures.length) {
  console.error(`FAIL validate:beta-pedagogy-freeze — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const c = state.counts;
console.log(
  `PASS validate:beta-pedagogy-freeze — ${c.lessons} lições · ${c.teachingTopics} tópicos · ${c.cultureItems} CultureItems · ${c.cultureNativeLessons} nativas · ${c.journeyCultureNodes} nós · ${c.cultureMoments} momentos · ${c.toneTransferPlayable} tone transfers · ${c.conversationCapabilitiesRuntimeReady}/${c.conversationCapabilities} capacidades READY · fp ${state.fingerprint}`
);
