#!/usr/bin/env node
/** validate:release-identity — RC2.2.10B (SHA como autoridade, versionCode crescente, stale/dirty guards). */
import process from "node:process";
import { loadDeliveryState, validateReleaseIdentity } from "./lib/delivery-pipeline-gates.mjs";

const state = loadDeliveryState();
const failures = validateReleaseIdentity(state);
if (failures.length) {
  console.error(`FAIL validate:release-identity — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const d = state.delivery;
console.log(
  `PASS validate:release-identity — fonte ${d.sourceOfTruth} · Android automático: ${d.androidAutomaticDestination} · produção automática: ${d.androidAutoProduction} · signing ${d.signingCredentialsConfigured ? "configurado" : "BLOCKED_SIGNING_SECRETS"} · Play ${d.playCredentialsConfigured ? "configurado" : "BLOCKED_PLAY_CREDENTIALS"} · live update ${d.liveUpdate} · Public Beta ${d.publicBetaVerdict}`
);
