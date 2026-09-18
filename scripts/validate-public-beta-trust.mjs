#!/usr/bin/env node
import { assertPublicBetaTrust } from "./lib/public-beta-trust.mjs";

const result = assertPublicBetaTrust(process.cwd());
if (!result.ok) {
  console.error("FAIL validate:public-beta-trust");
  for (const failure of result.failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("PASS validate:public-beta-trust");
