#!/usr/bin/env node
/**
 * Text contrast contract: text roles per theme, same-element text/background
 * pairs at 4.5:1 (3:1 large), white labels only on the accent fill, no glass.
 * Logic: scripts/lib/text-contrast-gates.mjs. Mutations: test-text-contrast.mjs.
 */
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { checkTextContrast, loadTextContrastSources, scanPairs } from "./lib/text-contrast-gates.mjs";
import { themeTokens } from "./lib/rc2-3-13r3-2-5-premium-ux-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = loadTextContrastSources(root);
const errors = checkTextContrast(src);

if (errors.length > 0) {
  console.error(`FAIL: validate:text-contrast — ${errors.join(", ")}`);
  for (const f of scanPairs(src.tree, themeTokens(src.css)).slice(0, 40)) {
    console.error(`  ${f.rel} [${f.theme}] ${f.pair} ${f.ratio}:1 < ${f.min}:1`);
  }
  process.exit(1);
}
console.log("OK: validate:text-contrast — text roles ≥ 4.5:1 in clay/china/dark, 0 same-element pairs below AA, no glass.");
