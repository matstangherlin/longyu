/**
 * Mutation tests for PUBLIC_BETA_CORE + feature freeze honesty.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import ts from "typescript";

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

const { evaluatePublicBetaCore, PUBLIC_BETA_CORE_REQUIRED_CHECKS } = require("../src/lib/publicBetaCore.ts");
const { PRODUCT_TRUTH } = require("../src/commercial/productTruth.ts");

const allPass = Object.fromEntries(
  [
    ...PUBLIC_BETA_CORE_REQUIRED_CHECKS,
    "league_cloud_smoke",
    "stripe_test_mode_e2e",
    "stripe_production_config",
    "family_plan_live",
    "business_seats_live",
  ].map((id) => [id, { pass: true }])
);

function mutation(label, edit, expectCode) {
  const truth = structuredClone(PRODUCT_TRUTH);
  const checks = structuredClone(allPass);
  let league = false;
  let sha = "abc123";
  let fingerprint = "ef3d300ef2b9";
  edit({ truth, checks, setLeague: (v) => (league = v), setSha: (v) => (sha = v), setFp: (v) => (fingerprint = v) });
  const result = evaluatePublicBetaCore({
    checks,
    leaguePubliclyEnabled: league,
    productTruth: truth,
    releaseCandidateSha: sha,
    fingerprint,
  });
  assert.ok(
    result.failures.some((f) => f.code === expectCode),
    `${label} survived (expected ${expectCode}); got ${JSON.stringify(result.failures)}`
  );
  console.log(`KILLED ${label}: ${expectCode}`);
}

mutation("cloud_auth false allows GO", ({ checks }) => {
  checks.cloud_auth.pass = false;
}, "CORE_CHECK");

mutation("cloud_sync false allows GO", ({ checks }) => {
  checks.cloud_sync.pass = false;
}, "CORE_CHECK");

mutation("ios false allows GO", ({ checks }) => {
  checks.ios_real_device.pass = false;
}, "CORE_CHECK");

mutation("android false allows GO", ({ checks }) => {
  checks.android_real_device.pass = false;
}, "CORE_CHECK");

mutation("pwa false allows GO", ({ checks }) => {
  checks.pwa_upgrade.pass = false;
}, "CORE_CHECK");

mutation("rollback false allows GO", ({ checks }) => {
  checks.rollback_drill.pass = false;
}, "CORE_CHECK");

mutation("League public without cloud", ({ checks, setLeague }) => {
  setLeague(true);
  checks.league_cloud_smoke.pass = false;
}, "LEAGUE_CLOUD");

mutation("Pro available without Stripe", ({ truth, checks }) => {
  truth.pro_individual.availability = "available";
  checks.stripe_test_mode_e2e.pass = false;
}, "PRO_WITHOUT_STRIPE");

mutation("Family available without Stripe", ({ truth, checks }) => {
  truth.family_plan.availability = "available";
  checks.stripe_test_mode_e2e.pass = false;
}, "FAMILY_WITHOUT_STRIPE");

mutation("fingerprint drift", ({ setFp }) => {
  setFp("deadbeefdead");
}, "FINGERPRINT");

mutation("empty candidate sha", ({ setSha }) => {
  setSha("");
}, "CANDIDATE_SHA");

// Positive: all core green + sha + planned offers → GO (League off)
{
  const result = evaluatePublicBetaCore({
    checks: allPass,
    leaguePubliclyEnabled: false,
    productTruth: PRODUCT_TRUTH,
    releaseCandidateSha: "deadbeefcafef00d",
    fingerprint: "ef3d300ef2b9",
  });
  assert.equal(result.go, true, JSON.stringify(result.failures));
  assert.ok(result.skippedCommercial.includes("stripe_test_mode_e2e"));
  console.log("PASS positive PUBLIC_BETA_CORE GO with commercial skipped");
}

// Stripe false must not block free beta when offers planned
{
  const checks = structuredClone(allPass);
  checks.stripe_test_mode_e2e.pass = false;
  const result = evaluatePublicBetaCore({
    checks,
    leaguePubliclyEnabled: false,
    productTruth: PRODUCT_TRUTH,
    releaseCandidateSha: "deadbeefcafef00d",
    fingerprint: "ef3d300ef2b9",
  });
  assert.equal(result.go, true);
  console.log("PASS Stripe false does not block free beta");
}

console.log("PASS test:public-beta-core");
