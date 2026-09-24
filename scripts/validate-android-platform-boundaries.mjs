#!/usr/bin/env node
/** validate:android-platform-boundaries — RC2.2.10 (um só Longyu; SW só no web; BACK; deep links; permissões). */
import process from "node:process";
import { loadAndroidFoundationState, validateAndroidPlatformBoundaries } from "./lib/android-foundation-gates.mjs";

const state = loadAndroidFoundationState();
const failures = validateAndroidPlatformBoundaries(state);
if (failures.length) {
  console.error(`FAIL validate:android-platform-boundaries — ${failures.length}:`);
  for (const item of failures) console.error(` - [${item.code}] ${item.where}: ${item.why}`);
  process.exit(1);
}
const plugins = Object.keys(state.packageJson.dependencies).filter(
  (dep) => dep.startsWith("@capacitor/") && !["@capacitor/core", "@capacitor/android"].includes(dep)
);
console.log(
  `PASS validate:android-platform-boundaries — ${Object.keys(state.platformSources).length} módulos em src/lib/platform · Capacitor fora dela: 0 · ${plugins.length} plugins Capacitor, todos com consumidor · SW só web · BACK nunca sai fora da raiz · deep links em allowlist`
);
