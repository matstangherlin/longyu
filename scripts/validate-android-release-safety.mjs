#!/usr/bin/env node
/** validate:android-release-safety — RC2.2.10B (keystore/base64/senhas/service account fora do Git, de logs e de artifacts). */
import process from "node:process";
import { loadDeliveryState, validateAndroidReleaseSafety } from "./lib/delivery-pipeline-gates.mjs";

const state = loadDeliveryState();
const failures = validateAndroidReleaseSafety(state);
if (failures.length) {
  console.error(`FAIL validate:android-release-safety — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const d = state.delivery;
console.log(
  `PASS validate:android-release-safety — fonte ${d.sourceOfTruth} · Android automático: ${d.androidAutomaticDestination} · produção automática: ${d.androidAutoProduction} · signing ${d.signingCredentialsConfigured ? "configurado" : "BLOCKED_SIGNING_SECRETS"} · Play ${d.playCredentialsConfigured ? "configurado" : "BLOCKED_PLAY_CREDENTIALS"} · live update ${d.liveUpdate} · Public Beta ${d.publicBetaVerdict}`
);
