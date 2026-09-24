#!/usr/bin/env node
/** validate:android-signing-contract — RC2.2.10 (keystore/senhas fora do Git, quatro valores, release nunca com debug key). */
import { execFileSync } from "node:child_process";
import process from "node:process";
import { loadAndroidFoundationState, validateAndroidSigningContract } from "./lib/android-foundation-gates.mjs";

const state = loadAndroidFoundationState();
const failures = validateAndroidSigningContract(state);

// Prova real com o próprio git: caminhos sonda precisam ser ignorados.
const probes = [
  "longyu-upload.jks",
  "android/app/longyu-upload.jks",
  "android/longyu.keystore",
  "android/keystore.properties",
  "keystore.properties",
  "android/key.properties",
  "android/local.properties",
];
for (const probe of probes) {
  try {
    execFileSync("git", ["check-ignore", "-q", "--no-index", probe], { cwd: state.root, stdio: "ignore" });
  } catch {
    failures.push({ code: "GIT_NOT_IGNORING", where: probe, why: "git check-ignore não ignora este caminho" });
  }
}
try {
  execFileSync("git", ["check-ignore", "-q", "--no-index", "android/keystore.properties.example"], { cwd: state.root, stdio: "ignore" });
  failures.push({ code: "EXAMPLE_IGNORED", where: "android/keystore.properties.example", why: "o modelo sem segredos precisa ser versionado" });
} catch {
  /* esperado: o exemplo não é ignorado */
}

if (failures.length) {
  console.error(`FAIL validate:android-signing-contract — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
console.log(
  `PASS validate:android-signing-contract — 4 valores (LONGYU_ANDROID_KEYSTORE_PATH/_KEYSTORE_PASSWORD/_KEY_ALIAS/_KEY_PASSWORD) · ${probes.length} caminhos sonda ignorados · 0 segredos rastreados · release sem segredos = BLOCKED_SIGNING_SECRETS`
);
