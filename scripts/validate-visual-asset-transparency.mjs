#!/usr/bin/env node
import { validateVisualAssetTransparency } from "./lib/rc1-3-gates.mjs";

const result = await validateVisualAssetTransparency();
if (result.failures.length) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`PASS validate:visual-asset-transparency (${result.checked} assets transparentes)`);
}
