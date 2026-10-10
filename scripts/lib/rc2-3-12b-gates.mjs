/**
 * RC2.3.12B — beta entry closure pure checkers (version authority + artifact triangle).
 */
import fs from "node:fs";
import path from "node:path";

export function readRel(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function readJsonRel(root, rel) {
  return JSON.parse(readRel(root, rel));
}

export const lon001SiblingProbe = () => ["at", "omurus"].join("");
const lon001SiblingRe = () => new RegExp(`\\b${lon001SiblingProbe()}\\b`, "i");
const lon001SiblingTouched = () => ["ATO", "MURUS_TOUCHED"].join("");

export function checkLon001Sibling(text) {
  return lon001SiblingRe().test(text) ? [lon001SiblingTouched()] : [];
}

/** Netlify / package / foundation name / candidate name must agree. Floor ≠ computed. */
export function checkVersionAuthority({
  packageJson,
  netlifyToml,
  foundation,
  versionFloor,
  candidate,
  computedVersionCode,
}) {
  const errors = [];
  const version = packageJson?.version;
  if (!version) errors.push("VERSION_AUTHORITY_DRIFT");
  for (const match of String(netlifyToml ?? "").matchAll(/VITE_APP_VERSION\s*=\s*"([^"]+)"/g)) {
    if (match[1] !== version) errors.push("VERSION_AUTHORITY_DRIFT");
  }
  if (foundation?.versionName && foundation.versionName !== version) errors.push("VERSION_AUTHORITY_DRIFT");
  if (candidate?.version && candidate.version !== version) errors.push("VERSION_AUTHORITY_DRIFT");
  if (Number.isInteger(versionFloor) && foundation?.versionCode !== versionFloor) {
    errors.push("VERSION_AUTHORITY_DRIFT");
  }
  if (Number.isInteger(computedVersionCode) && Number.isInteger(candidate?.versionCode)) {
    if (candidate.versionCode !== computedVersionCode) errors.push("VERSION_AUTHORITY_DRIFT");
  }
  // Foundation versionCode is the floor, never the computed Play code.
  if (Number.isInteger(computedVersionCode) && foundation?.versionCode === computedVersionCode && computedVersionCode !== versionFloor) {
    errors.push("VERSION_AUTHORITY_DRIFT");
  }
  return [...new Set(errors)];
}

export function checkRcShaFresh({ candidate, headSha }) {
  const errors = [];
  if (!candidate?.gitSha || !headSha) errors.push("RC_SHA_STALE");
  else if (candidate.gitSha !== headSha) errors.push("RC_SHA_STALE");
  return errors;
}

export function checkProductTruthFresh({ productTruth, headSha }) {
  if (productTruth?.generatedFromSha && headSha && productTruth.generatedFromSha !== headSha) {
    return ["STALE_PRODUCT_TRUTH"];
  }
  return [];
}

export function checkArtifactTriangle({ candidate, headSha }) {
  const errors = [];
  const arts = [candidate?.apkArtifact, candidate?.aabArtifact, candidate?.webArtifact];
  for (const art of arts) {
    if (!art || art.status === "NOT_RUN" || art.status === "NOT_BUILT") continue;
    if (art.gitSha && headSha && art.gitSha !== headSha) errors.push("ARTIFACT_OLD_COMMIT");
    if (art.sourceSha && headSha && art.sourceSha !== headSha) errors.push("ARTIFACT_OLD_COMMIT");
    if (candidate?.gitSha && art.gitSha && art.gitSha !== candidate.gitSha) errors.push("ARTIFACT_SHA_MISMATCH");
  }
  if (candidate?.apkArtifact?.sha256 && candidate?.aabArtifact?.sha256) {
    if (candidate.apkArtifact.sha256 === candidate.aabArtifact.sha256) errors.push("APK_AAB_HASH_COLLISION");
  }
  return [...new Set(errors)];
}

export function checkGoHonesty({ entryCriteria, candidate, certification }) {
  const errors = [];
  const result = entryCriteria?.result;
  if (result !== "GO") return errors;
  if (entryCriteria?.hostedCi === "FAIL" || entryCriteria?.hostedCi === "PENDING") errors.push("HOSTED_CI_RED_GO");
  if (entryCriteria?.observability === "CONFIG_REQUIRED" && !entryCriteria?.observabilityExceptionApproved) {
    errors.push("OBSERVABILITY_BLIND_GO");
  }
  if (entryCriteria?.rollback === "NOT_RUN") errors.push("ROLLBACK_NOT_RUN_GO");
  if (candidate?.status === "BETA_READY" && entryCriteria?.betaRequired?.OWNER_RC_PHYSICAL_ACCEPTANCE !== "PASS") {
    errors.push("BETA_READY_WITHOUT_PHYSICAL");
  }
  if (certification?.matrix?.SPEECH_PHYSICAL_PASS === "NOT_RUN") errors.push("SPEECH_PHYSICAL_NOT_RUN_GO");
  if (certification?.matrix?.HANZI_PHYSICAL_PASS === "NOT_RUN") errors.push("HANZI_PHYSICAL_NOT_RUN_GO");
  if (certification?.matrix?.CLOUD_SMOKE_PASS === "NOT_RUN" || certification?.matrix?.CLOUD_BETA_REQUIRED_PASS === "NOT_RUN") {
    errors.push("CLOUD_SMOKE_NOT_RUN_GO");
  }
  if (certification?.matrix?.ANDROID_OAUTH_PASS === "NOT_RUN") errors.push("OAUTH_NOT_RUN_GO");
  if (candidate?.liveMonetization === true) errors.push("LIVE_BILLING_ENABLED");
  if (candidate?.androidIap && candidate.androidIap !== "DISABLED_FOR_BETA") errors.push("PLAY_BILLING_ENABLED");
  return errors;
}

export function checkQaFlagsProduction({ netlify, featureFlags, envSample }) {
  const errors = [];
  const blob = `${netlify ?? ""}\n${featureFlags ?? ""}\n${envSample ?? ""}`;
  if (/VITE_DEVICE_QA\s*=\s*["']?true/i.test(blob)) errors.push("QA_FLAG_PRODUCTION");
  if (/VITE_USE_TEST_FIXTURES\s*=\s*["']?true/i.test(blob)) errors.push("FIXTURE_PRODUCTION");
  if (/VITE_ALLOW_PRO_PREVIEW\s*=\s*["']?true/i.test(blob)) errors.push("DEBUG_ENTITLEMENT_PRODUCTION");
  return errors;
}

export function checkCurriculumBaseline({ fingerprint, lessons, teaching }) {
  const errors = [];
  if (fingerprint && fingerprint !== "cc66373bb602") errors.push("FINGERPRINT_DRIFT");
  if (lessons != null && lessons !== 134) errors.push("LESSON_BASELINE_CHANGED");
  if (teaching != null && teaching !== 113) errors.push("TOPIC_BASELINE_CHANGED");
  return errors;
}

export function existsRel(root, rel) {
  return fs.existsSync(path.join(root, rel));
}
