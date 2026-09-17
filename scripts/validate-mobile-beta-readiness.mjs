#!/usr/bin/env node
import { assertMobileBetaReadiness } from "./lib/mobile-beta-readiness.mjs";

const result = assertMobileBetaReadiness(process.cwd());
if (!result.ok) {
  console.error("FAIL validate:mobile-beta-readiness");
  for (const failure of result.failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("PASS validate:mobile-beta-readiness");
