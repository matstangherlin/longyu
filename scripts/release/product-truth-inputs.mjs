/**
 * RC2.3.9 — loads the evidence the Product Truth Manifest is derived from.
 * Shared by generate-product-truth, validate-product-truth and the
 * convergence gate so "what the manifest reads" has one definition.
 */
import fs from "node:fs";
import path from "node:path";
import { journeyFingerprint } from "../lib/report-meta.mjs";
import { RC_FINGERPRINT_ANCHOR, fingerprintRecords, verifyFingerprintChain } from "../lib/fingerprint-chain.mjs";
import { require as tsRequire } from "../lib/v495a-runtime.mjs";
import { SUITES } from "./canonical-suites.mjs";

export const PRODUCT_TRUTH_PATH = "docs/release/product-truth.json";

/** Files whose content feeds the manifest (freshness digest + REPORT_EVIDENCE_STALE). */
export const PRODUCT_TRUTH_SOURCES = [
  "package.json",
  "capacitor.config.ts",
  "android/version.properties",
  "src/lib/curriculumFreeze.ts",
  "src/lib/auth/providers.ts",
  "supabase/functions/_shared/budgetPolicy.ts",
  "scripts/release/canonical-suites.mjs",
  "docs/release/invariant-ownership.json",
  "docs/release/owner-acceptance.json",
  "docs/release/owner-actions.json",
  "docs/release/external-dependencies.json",
  "docs/release/certifications.json",
  "docs/release/rc2-3-10-cloud-matrix.json",
  "docs/release/rc-candidate.json",
  "docs/launch/production-migration-ledger.json",
];

function readJson(root, rel, fallback) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

export function loadProductTruthInputs(root) {
  const pkg = readJson(root, "package.json", {});
  const capacitor = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
  const versionProps = fs.readFileSync(path.join(root, "android/version.properties"), "utf8");
  const budgetPolicy = fs.readFileSync(path.join(root, "supabase/functions/_shared/budgetPolicy.ts"), "utf8");

  const freeze = tsRequire("../../src/lib/curriculumFreeze.ts");
  const live = journeyFingerprint(root);
  const chain = verifyFingerprintChain({
    anchor: RC_FINGERPRINT_ANCHOR,
    declared: freeze.RC_BASE_FINGERPRINT,
    live,
    records: fingerprintRecords(freeze),
    knownScripts: new Set(Object.keys(pkg.scripts ?? {})),
  });
  const { ALL_LESSONS } = tsRequire("../../src/data/journey.ts");
  const { AUTH_PROVIDERS } = tsRequire("../../src/lib/auth/providers.ts");
  const jevMatch = budgetPolicy.match(/JEV_RUNTIME_ENABLED:\s*(true|false)/);

  return {
    identity: {
      version: pkg.version,
      applicationId: capacitor.match(/appId:\s*"([^"]+)"/)?.[1] ?? null,
      versionCode: Number(versionProps.match(/versionCode=(\d+)/)?.[1] ?? NaN),
      fingerprint: live,
      chainHead: chain.errors.length ? `BROKEN:${chain.errors[0]}` : chain.path.at(-1),
      lessons: ALL_LESSONS.length,
      teachingTopics: ALL_LESSONS.filter((lesson) => !lesson.isReview && !lesson.reviewMasteryMode).length,
      cultureItems: freeze.RC2_EXPECTED_CULTURE_ITEMS,
      cultureNativeLessons: freeze.RC2_EXPECTED_CULTURE_NATIVE_LESSONS,
      journeyCultureNodes: freeze.RC2_EXPECTED_JOURNEY_CULTURE_NODES,
      historyItems: freeze.RC2_EXPECTED_HISTORY_ITEMS,
    },
    providers: AUTH_PROVIDERS.map((p) => ({ id: p.id, codeStatus: p.codeStatus })),
    ownerAcceptance: readJson(root, "docs/release/owner-acceptance.json", { areas: {} }),
    ownerActions: readJson(root, "docs/release/owner-actions.json", { actions: [] }),
    externalDependencies: readJson(root, "docs/release/external-dependencies.json", { dependencies: {} }),
    invariantOwnership: readJson(root, "docs/release/invariant-ownership.json", { invariants: {} }),
    certification: readJson(root, "docs/release/certifications.json", { cloud: null, monetization: null }),
    cloudMatrix: readJson(root, "docs/release/rc2-3-10-cloud-matrix.json", null),
    rcCandidate: readJson(root, "docs/release/rc-candidate.json", null),
    migrationLedger: (({ status, counts }) => ({ status, counts }))(readJson(root, "docs/launch/production-migration-ledger.json", { status: "NOT_RUN", counts: null })),
    suites: SUITES.map((suite) => ({ id: suite.id, steps: suite.steps })),
    jevRuntimeEnabled: jevMatch ? jevMatch[1] === "true" : true,
  };
}
