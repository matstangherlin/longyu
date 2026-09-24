#!/usr/bin/env node
/** validate:delivery-pipeline — RC2.2.10B (main como fonte, nada automático em produção, sem OTA/JS remoto, honestidade formal). */
import process from "node:process";
import { loadDeliveryState, validateDeliveryPipeline } from "./lib/delivery-pipeline-gates.mjs";

const state = loadDeliveryState();
const failures = validateDeliveryPipeline(state);
if (failures.length) {
  console.error(`FAIL validate:delivery-pipeline — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const d = state.delivery;
console.log(
  `PASS validate:delivery-pipeline — fonte ${d.sourceOfTruth} · Android automático: ${d.androidAutomaticDestination} · produção automática: ${d.androidAutoProduction} · signing ${d.signingCredentialsConfigured ? "configurado" : "BLOCKED_SIGNING_SECRETS"} · Play ${d.playCredentialsConfigured ? "configurado" : "BLOCKED_PLAY_CREDENTIALS"} · live update ${d.liveUpdate} · Public Beta ${d.publicBetaVerdict}`
);
