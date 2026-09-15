#!/usr/bin/env node
import { validateToneContrastNoNewVocab } from "./lib/rc1-3-gates.mjs";

const result = validateToneContrastNoNewVocab();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:tone-contrast-no-new-vocab`);
}
