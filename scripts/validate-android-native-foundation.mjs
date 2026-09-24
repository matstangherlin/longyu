#!/usr/bin/env node
/** validate:android-native-foundation — RC2.2.10 (identidade, SDK 36, versão, honestidade formal, freeze). */
import process from "node:process";
import { loadAndroidFoundationState, validateAndroidNativeFoundation, fingerprintOf } from "./lib/android-foundation-gates.mjs";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const state = loadAndroidFoundationState();
const failures = validateAndroidNativeFoundation(state);
// O espelho do fingerprint precisa bater com o cálculo canônico do repo.
const canonical = journeyFingerprint(state.root);
if (fingerprintOf(state.curriculumSources) !== canonical) {
  failures.push({ code: "FINGERPRINT_MIRROR", where: "fingerprintOf", why: `espelho diverge de journeyFingerprint (${canonical})` });
}
if (failures.length) {
  console.error(`FAIL validate:android-native-foundation — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const m = state.releaseManifest;
console.log(
  `PASS validate:android-native-foundation — ${m.appId} · ${m.appName} · webDir ${m.webDir} · minSdk ${m.minSdk} · targetSdk ${m.targetSdk} · compileSdk ${m.compileSdk} · v${m.versionName} (${m.versionCode}) · fp ${canonical} · ${m.status} · Public Beta ${m.publicBetaVerdict}`
);
