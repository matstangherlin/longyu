/**
 * RC2.3.12 release-candidate pure checkers.
 */
import fs from "node:fs";
import path from "node:path";

export function readRel(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function readJsonRel(root, rel) {
  return JSON.parse(readRel(root, rel));
}

export function checkRcIdentity({ candidate, packageJson, fingerprint, headSha }) {
  const errors = [];
  if (!candidate?.rcId || !/^RC2\.3\.12-RC\d+$/.test(candidate.rcId)) errors.push("RC_ID_INVALID");
  if (candidate?.version !== packageJson?.version) errors.push("RC_VERSION_MISMATCH");
  if (candidate?.fingerprint !== fingerprint) errors.push("FINGERPRINT_MISMATCH");
  // SHA lock applies once the candidate leaves NOT_BUILT (artifact/evidence phase).
  if (candidate?.status && candidate.status !== "NOT_BUILT") {
    if (candidate?.gitSha && headSha && candidate.gitSha !== headSha) errors.push("RC_SHA_MISMATCH");
  }
  if (!Number.isInteger(candidate?.versionCode) || candidate.versionCode < 2) errors.push("VERSION_CODE_INVALID");
  if (candidate?.featureFreeze !== true) errors.push("FEATURE_FREEZE_MISSING");
  if (candidate?.liveMonetization === true) errors.push("LIVE_MONETIZATION_ENABLED");
  if (candidate?.commercialMode !== "TEST") errors.push("COMMERCIAL_MODE_NOT_TEST");
  return errors;
}

export function checkProductTruthFresh({ productTruth, headSha, candidateStatus }) {
  const errors = [];
  if (candidateStatus && candidateStatus !== "NOT_BUILT") {
    if (productTruth?.generatedFromSha && headSha && productTruth.generatedFromSha !== headSha) {
      errors.push("STALE_PRODUCT_TRUTH");
    }
  }
  if (productTruth?.product?.curriculumFingerprint && productTruth.product.curriculumFingerprint !== "5a64821d0b7d") {
    errors.push("CURRICULUM_FINGERPRINT_CHANGED");
  }
  return errors;
}

export function checkLiveBillingFrozen({ monetizationMode, productTruth, launchBlockers, candidate }) {
  const errors = [];
  if (!/LIVE_MONETIZATION_REQUIRES_CLOUD_PASS/.test(monetizationMode)) {
    errors.push("MISSING_LIVE_CLOUD_INVARIANT");
  }
  if (!/MONETIZATION_MODE[\s\S]*"TEST"/.test(monetizationMode) && !/=\s*"TEST"/.test(monetizationMode)) {
    errors.push("MONETIZATION_MODE_NOT_TEST");
  }
  if (productTruth?.commercial?.stripe?.mode === "live") errors.push("LIVE_STRIPE_WHILE_CLOUD_BLOCKED");
  if (launchBlockers?.cloudCertification === "BLOCKED" && candidate?.liveMonetization) {
    errors.push("LIVE_BILLING_WHILE_CLOUD_BLOCKED");
  }
  if (candidate?.closedBetaCommercialMode === "LIVE") errors.push("BETA_LIVE_COMMERCIAL");
  return errors;
}

export function checkQaFlagsProduction({ featureFlags, netlify, candidate }) {
  const errors = [];
  const flags = String(featureFlags ?? "");
  const net = String(netlify ?? "");
  if (/VITE_DEVICE_QA\s*[:=]\s*["']?true/.test(net) && /\[context\.production\]/.test(net)) {
    errors.push("QA_FLAG_PRODUCTION");
  }
  if (candidate?.status === "BETA_READY" && /VITE_USE_TEST_FIXTURES.*true/.test(flags)) {
    errors.push("FIXTURE_PRODUCTION");
  }
  return errors;
}

export function checkBetaReadyRequiresPhysical({ candidate, entryCriteria }) {
  const errors = [];
  if (candidate?.status === "BETA_READY" && candidate?.physicalQa !== "PASS") {
    errors.push("BETA_READY_WITHOUT_PHYSICAL");
  }
  if (entryCriteria?.result === "GO" && candidate?.status !== "BETA_READY" && entryCriteria?.requireRcStatus) {
    errors.push("GO_WITHOUT_BETA_READY");
  }
  if (entryCriteria?.result === "GO" && entryCriteria?.hostedCi !== "PASS") {
    errors.push("GO_WHILE_HOSTED_CI_RED");
  }
  if (entryCriteria?.result === "GO" && entryCriteria?.observability !== "PASS" && !entryCriteria?.observabilityExceptionApproved) {
    errors.push("GO_WITHOUT_OBSERVABILITY");
  }
  if (entryCriteria?.result === "GO" && entryCriteria?.rollback !== "PASS") {
    errors.push("GO_WITHOUT_ROLLBACK");
  }
  return errors;
}

export function checkKnownIssuesHonesty({ knownIssues, entryCriteria }) {
  const errors = [];
  const issues = knownIssues?.issues ?? [];
  for (const issue of issues) {
    if (issue.severity === "P0" && entryCriteria?.result === "GO") errors.push("P0_MARKED_GO");
    if (issue.severity === "P1" && issue.betaBlocker && entryCriteria?.result === "GO") errors.push("P1_MARKED_GO");
  }
  return errors;
}

export function checkArtifactHashes({ candidate }) {
  const errors = [];
  if (candidate?.apkArtifact?.sha256Expected && candidate?.apkArtifact?.sha256Actual) {
    if (candidate.apkArtifact.sha256Expected !== candidate.apkArtifact.sha256Actual) {
      errors.push("APK_WRONG_SHA");
    }
  }
  if (candidate?.aabArtifact?.sha256Expected && candidate?.aabArtifact?.sha256Actual) {
    if (candidate.aabArtifact.sha256Expected !== candidate.aabArtifact.sha256Actual) {
      errors.push("AAB_WRONG_SHA");
    }
  }
  if (candidate?.status === "BUILT" || candidate?.status === "CODE_VALIDATED" || candidate?.status === "BETA_READY") {
    if (candidate?.apkArtifact && !candidate.apkArtifact.sha256) errors.push("APK_HASH_MISSING");
  }
  return errors;
}

export function checkVersionCodeReuse({ candidate, ledger }) {
  const errors = [];
  const published = (ledger?.releases ?? []).map((r) => r.versionCode).filter((n) => Number.isInteger(n));
  if (published.includes(candidate?.versionCode)) errors.push("REUSED_VERSION_CODE");
  return errors;
}

export function checkAtomurus(text) {
  return /atomurus/i.test(text) ? ["ATOMURUS_TOUCHED"] : [];
}

export function checkCurriculumBaseline({ lessons, teaching, fingerprint }) {
  const errors = [];
  if (lessons !== 134) errors.push("LESSON_BASELINE_CHANGED");
  if (teaching !== 113) errors.push("TOPIC_BASELINE_CHANGED");
  if (fingerprint !== "5a64821d0b7d") errors.push("CURRICULUM_FINGERPRINT_CHANGED");
  return errors;
}

export function checkJevLearnerOff(featureFlags) {
  return /JEV_LEARNER_RUNTIME\s*=\s*true|api\.typesafe\.ai/.test(featureFlags) ? ["JEV_LEARNER_RUNTIME"] : [];
}

export function checkFamilyBusinessOff({ productTruth, backendCapability }) {
  const errors = [];
  // Soft: product truth planned/pilot is OK; fail if marked available without backend
  if (productTruth?.commercial?.family === "available" && /FAMILY.*MISSING/i.test(backendCapability)) {
    errors.push("FAMILY_ENABLED_WITHOUT_BACKEND");
  }
  return errors;
}

export function checkChangePolicy(policyText) {
  const errors = [];
  if (!/FEATURE FREEZE/i.test(policyText)) errors.push("FEATURE_FREEZE_POLICY_MISSING");
  if (!/P0/.test(policyText) || !/P3/.test(policyText)) errors.push("CHANGE_CLASSES_MISSING");
  return errors;
}
