/**
 * validate:public-beta-core — free public beta contract (not commercial launch).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import { journeyFingerprint } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename
  );

const root = process.cwd();
const {
  evaluatePublicBetaCore,
  PUBLIC_BETA_CORE_REQUIRED_CHECKS,
  PUBLIC_BETA_COMMERCIAL_CONDITIONAL_CHECKS,
  PUBLIC_BETA_PROFILE,
  FEATURE_FREEZE,
} = require("../src/lib/publicBetaCore.ts");
const { PRODUCT_TRUTH } = require("../src/commercial/productTruth.ts");
const ops = JSON.parse(
  fs.readFileSync(path.join(root, "docs/release/rc1-operational-checks.json"), "utf8")
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "docs/release/public-beta-core.json"), "utf8")
);

assert.equal(PUBLIC_BETA_PROFILE, "PUBLIC_BETA_CORE");
assert.equal(FEATURE_FREEZE, "PUBLIC_BETA");
assert.equal(manifest.profile, "PUBLIC_BETA_CORE");

for (const id of PUBLIC_BETA_CORE_REQUIRED_CHECKS) {
  assert.ok(ops.checks[id], `missing operational check slot ${id}`);
  assert.ok(manifest.requiredChecks.includes(id), `manifest missing ${id}`);
}

for (const id of PUBLIC_BETA_COMMERCIAL_CONDITIONAL_CHECKS) {
  assert.ok(ops.checks[id], `missing commercial check slot ${id}`);
}

assert.equal(PRODUCT_TRUTH.journey.availability, "available");
assert.equal(PRODUCT_TRUTH.free_plan.availability, "available");
assert.equal(PRODUCT_TRUTH.pro_individual.availability, "planned");
assert.equal(PRODUCT_TRUTH.family_plan.availability, "planned");
assert.equal(PRODUCT_TRUTH.business_workspace.availability, "pilot");

const checks = Object.fromEntries(
  Object.entries(ops.checks).map(([id, row]) => [id, { pass: Boolean(row.pass) }])
);

const result = evaluatePublicBetaCore({
  checks,
  leaguePubliclyEnabled: Boolean(manifest.leaguePubliclyEnabled),
  productTruth: PRODUCT_TRUTH,
  releaseCandidateSha: ops.release_candidate_sha || "",
  fingerprint: journeyFingerprint(root),
});

assert.equal(result.go, false, "GO must stay false until core evidence + candidate SHA exist");
assert.ok(result.failures.some((f) => f.code === "CORE_CHECK"));
assert.ok(result.failures.some((f) => f.code === "CANDIDATE_SHA"));
assert.ok(result.skippedCommercial.length > 0, "Stripe etc. must be skipped while offers are planned");

// Stripe false must NOT appear as a free-beta CORE_CHECK failure.
assert.ok(!result.failures.some((f) => f.where === "stripe_test_mode_e2e" && f.code === "CORE_CHECK"));

const proPage = fs.readFileSync(path.join(root, "src/features/pro/ProPage.tsx"), "utf8");
assert.match(proPage, /canOfferPurchase|productAvailability|PRODUCT_TRUTH|availabilityLabelKey/);

console.log(
  `PASS validate:public-beta-core — NO-GO · skippedCommercial=${result.skippedCommercial.length} · failures=${result.failures.length}`
);
