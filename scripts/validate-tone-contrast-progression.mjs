#!/usr/bin/env node
import { validateToneContrastProgression } from "./lib/rc1-3-gates.mjs";

const result = validateToneContrastProgression();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:tone-contrast-progression` + (result.scanned != null ? ` · ${result.scanned} itens varridos` : ""));
}
