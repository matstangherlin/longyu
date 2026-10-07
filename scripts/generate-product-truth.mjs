#!/usr/bin/env node
/**
 * RC2.3.9 — generates docs/release/product-truth.json from evidence.
 *   npm run generate:product-truth   (write)
 *   npm run validate:product-truth   (--check: committed == generated, vocabulary, no false PASS)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildProductTruth, checkProductTruth, digestInputs } from "./lib/product-truth.mjs";
import { digestFiles } from "./release/evidence-digest.mjs";
import { PRODUCT_TRUTH_PATH, PRODUCT_TRUTH_SOURCES, loadProductTruthInputs } from "./release/product-truth-inputs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

const inputs = loadProductTruthInputs(root);
const body = buildProductTruth(inputs);
const inputsDigest = digestInputs(inputs);
const evidenceDigest = digestFiles(root, PRODUCT_TRUTH_SOURCES);
const sha = (() => {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "UNKNOWN";
  }
})();

const target = path.join(root, PRODUCT_TRUTH_PATH);
const stable = (manifest) => {
  const { generatedAt, generatedFromSha, evidenceDigest: _e, ...rest } = manifest;
  return JSON.stringify(rest);
};

if (!check) {
  const manifest = { generatedAt: new Date().toISOString(), generatedFromSha: sha, inputsDigest, evidenceDigest, evidenceSources: PRODUCT_TRUTH_SOURCES, ...body };
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`product truth written · ${PRODUCT_TRUTH_PATH} · inputs ${inputsDigest}`);
  process.exit(0);
}

const errors = [];
if (!fs.existsSync(target)) errors.push({ code: "PRODUCT_TRUTH_MISSING", detail: PRODUCT_TRUTH_PATH });
else {
  const committed = JSON.parse(fs.readFileSync(target, "utf8"));
  if (committed.inputsDigest !== inputsDigest || stable(committed) !== stable({ inputsDigest, evidenceSources: PRODUCT_TRUTH_SOURCES, ...body }) || committed.evidenceDigest !== evidenceDigest) {
    errors.push({ code: "PRODUCT_TRUTH_STALE", detail: "committed manifest differs from the one generated from current evidence — run npm run generate:product-truth" });
  }
  errors.push(...checkProductTruth(committed, inputs));
}
for (const e of errors) console.error(`FAIL ${e.code}: ${e.detail}`);
if (errors.length) process.exit(1);
console.log(`PASS validate:product-truth · fresh (inputs ${inputsDigest}) · vocabulary · no false PASS`);
