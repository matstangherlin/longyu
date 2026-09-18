#!/usr/bin/env node
import { assertHumanQaPrebeta } from "./lib/human-qa-prebeta.mjs";

const result = assertHumanQaPrebeta(process.cwd());
if (!result.ok) {
  console.error("FAIL validate:human-qa-prebeta");
  for (const failure of result.failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("PASS validate:human-qa-prebeta");
