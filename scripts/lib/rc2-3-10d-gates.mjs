/**
 * RC2.3.10D pure checkers — mutations must kill these.
 */
import { productionMigrationReady } from "./rc2-3-10-cloud.mjs";
import { lookupProductionMigration } from "./production-migration-allowlist.mjs";

/** Ready file must not claim PASS when productionMigrationReady is BLOCKED. */
export function checkBatchAReadyHonesty(readyDoc) {
  const errors = [];
  const r = readyDoc?.request ?? {};
  const computed = productionMigrationReady(r);
  if (readyDoc?.computed?.status === "PASS" && computed.status !== "PASS") {
    errors.push("READY_FALSE_PASS");
  }
  if (computed.status === "PASS" && r.backup?.verified !== true) {
    errors.push("BATCH_A_PASS_WITHOUT_BACKUP");
  }
  if (computed.status === "PASS" && !r.ownerApproval?.by) {
    errors.push("BATCH_A_PASS_WITHOUT_APPROVAL");
  }
  if (r.backup?.verified === true && (!r.backup?.sourceProject || !r.backup?.takenAt)) {
    errors.push("BATCH_A_PASS_WITHOUT_BACKUP");
  }
  return errors;
}

export function checkApplyAllowlist() {
  const errors = [];
  const entry = lookupProductionMigration("rc2-3-10-league-memberships-policy-recursion");
  if (!entry) errors.push("BATCH_A_NOT_ALLOWLISTED");
  return errors;
}

export function checkNoHistoryRewrite(applyText) {
  const errors = [];
  if (/delete\s+from\s+supabase_migrations|truncate\s+supabase_migrations/i.test(applyText)) {
    errors.push("MIGRATION_HISTORY_REWRITE");
  }
  return errors;
}

export function checkCloudCertRequiresSha(closureText, certifiedSha) {
  const errors = [];
  const claimsPass = /cloud\.certification\s*=\s*[`*]*PASS/i.test(closureText);
  if (claimsPass && !/^[0-9a-f]{40}$/.test(String(certifiedSha ?? ""))) {
    errors.push("CLOUD_PASS_WITHOUT_CERTIFIED_SHA");
  }
  return errors;
}

export function checkSnapshotOmitsEmail(progressSnapshotSource) {
  const errors = [];
  if (/account:\s*\{\s*id,\s*name,\s*email/.test(progressSnapshotSource)) {
    errors.push("NEW_SNAPSHOT_STORES_EMAIL");
  }
  return errors;
}

export function checkCommitPlacementNotReachable(placementCommitSource) {
  const errors = [];
  if (!/isCommitPlacementEdgeAvailable/.test(placementCommitSource)) {
    errors.push("COMMIT_PLACEMENT_STILL_REACHABLE");
  }
  return errors;
}

export function checkJevLearnerOff(text) {
  const errors = [];
  if (/api\.typesafe\.ai/.test(text)) errors.push("JEV_LEARNER_RUNTIME_ENABLED");
  return errors;
}

export function checkCurriculumFingerprint(fp) {
  const errors = [];
  if (fp && fp !== "cc66373bb602") errors.push("CURRICULUM_FINGERPRINT_CHANGED");
  return errors;
}

/** Allow startsWith("sk_live_") refusal; reject leaked live secret shapes. */
export function checkMonetizationFrozen(src) {
  const errors = [];
  const stripped = String(src ?? "").replace(/\.startsWith\(\s*["']sk_live_["']\s*\)/g, "");
  if (/sk_live_/.test(stripped)) errors.push("STRIPE_LIVE_KEY");
  if (/MONETIZATION_ACTIVATED|enableLiveStripe/.test(src)) errors.push("MONETIZATION_ACTIVATED");
  return errors;
}

export function checkOldLeaguesNotAllowlisted(allowlistText) {
  const errors = [];
  if (/004_leagues\.sql/.test(allowlistText)) errors.push("OLD_LEAGUES_IN_ALLOWLIST");
  return errors;
}
