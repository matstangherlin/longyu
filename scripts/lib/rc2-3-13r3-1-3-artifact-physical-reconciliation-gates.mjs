/**
 * RC2.3.13R.3.1.3 — Artifact reconciliation + physical honesty.
 *
 * Phases:
 *   ARTIFACT_BUILT_HOSTED_PENDING — real APK exists; Chromium/WebKit/Firefox not terminal
 *   HOSTED_PASS                   — full hosted green + artifact BUILT
 *   TARGETED                      — owner physical (PASS only with device evidence)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const STALE_APK_SHA256 =
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8";
export const EXPECTED_APK_SHA256 =
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af";
export const EXPECTED_AAB_SHA256 =
  "72d9088a2a9d24dc342624e158290eeea10cd903d8f5ef923ca315436b35c657";
export const GITHUB_ZIP_DIGEST =
  "ab71ae3ceb2f733c59bc6cd81aead46f48525f6eff76fb3f59a74c6d83039422";
export const EXPECTED_LEARNER_RUNTIME_SHA =
  "b6fe91536daf3a8bdebde66f92ec50a03155fb4b";
export const EXPECTED_PR_HEAD =
  "86f9dddfc02f7a2ffae90df9eed60d30dfee9c21";
export const EXPECTED_WORKFLOW_MERGE =
  "a6a467e8b65a205040a83e729ed8a77d5a849ab2";
export const EXPECTED_FINGERPRINT = "29bb02ec0336";
export const HISTORICAL_ARTIFACT_FINGERPRINT = "57a848ef9ef9";
export const EXPECTED_VERSION_CODE = 675;
export const PACKAGE_ID = "longyu.noba.com";
export const ANDROID_RUN_ID = 38023872888;
export const ARTIFACT_ID = 11659317310;

export function loadR313Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    r3121: read("docs/release/rc2-3-13r3-1-2-1-certification.json"),
    r313: read("docs/release/rc2-3-13r3-1-3-certification.json"),
    report: read("docs/reports/rc2-3-13r3-1-3-artifact-physical-reconciliation.md"),
    handoff: read("docs/release/OWNER_R31_2_1_CANDIDATE_HANDOFF.md"),
    provenance: read("docs/release/artifacts/longyu-android-debug-0.2.0-rc.5-a6a467e.provenance.json"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    dualShaRc1: read("docs/release/rc-dual-sha-rc1.json"),
    dualShaRc2: read("docs/release/rc-dual-sha.json"),
    ownerRc1: read("docs/release/OWNER_RC1_DEVICE_TEST.md"),
    productTruth: read("docs/release/product-truth.json"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

function isPending(v) {
  return v === "PENDING" || v === "IN_PROGRESS" || v === "RUNNING" || v === "pending" || !v;
}

export function checkAll(src = loadR313Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const r3121 = j(src, "r3121");
  const r313 = j(src, "r313");
  const prov = j(src, "provenance");

  if (!/"gate:rc2-3-13r3-1-3-artifact-physical-reconciliation"/.test(src.packageJson)) {
    errors.push("R313_GATE_MISSING");
  }
  if (!r313) errors.push("R313_CERT_MISSING");
  if (!src.report || !/RC2\.3\.13R\.3\.1\.3/.test(src.report)) errors.push("R313_REPORT_MISSING");
  if (!src.handoff || !/USE THIS APK/i.test(src.handoff)) errors.push("OWNER_HANDOFF_MISSING");
  if (!rc) return ["RC_MISSING", ...errors];
  if (!prov) errors.push("PROVENANCE_MISSING");

  const phase = r313?.phase ?? "ARTIFACT_BUILT_HOSTED_PENDING";
  const hosted = r313?.hosted ?? {};
  const artifact = r313?.artifact ?? {};
  const targeted = r313?.targetedPhysical ?? {};
  const provenance = r313?.provenance ?? {};

  // Fingerprints
  if (rc.fingerprint !== EXPECTED_FINGERPRINT && r313?.fingerprint !== EXPECTED_FINGERPRINT) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`).test(src.curriculumFreeze)) {
    errors.push("CURRENT_FINGERPRINT_REPLACED_BY_HISTORICAL");
  }
  const dual1 = j(src, "dualShaRc1");
  const dual2 = j(src, "dualShaRc2");
  if (dual1?.fingerprint === EXPECTED_FINGERPRINT || dual2?.fingerprint === EXPECTED_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_REWRITTEN");
  }
  if (dual1 && dual1.fingerprint !== HISTORICAL_ARTIFACT_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_REWRITTEN");
  }
  if (src.ownerRc1.includes(EXPECTED_FINGERPRINT)) {
    errors.push("HISTORICAL_FINGERPRINT_REWRITTEN");
  }

  // SHA model
  if (r313?.prHeadSha !== EXPECTED_PR_HEAD) errors.push("CANDIDATE_HEAD_STALE");
  if (r313?.workflowMergeSha !== EXPECTED_WORKFLOW_MERGE) errors.push("WORKFLOW_MERGE_CONFLATED");
  if (r313?.prHeadSha && r313?.workflowMergeSha && r313.prHeadSha === r313.workflowMergeSha) {
    errors.push("WORKFLOW_MERGE_CONFLATED");
  }
  if (r313?.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (rc.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }

  // Artifact must reflect workflow reality
  if (artifact.status === "NOT_BUILT" && prov?.files?.length) {
    errors.push("CERT_SAYS_NOT_BUILT_WHILE_WORKFLOW_BUILT");
  }
  if (artifact.status === "BUILT" && !prov) {
    errors.push("CERT_BUILT_WITHOUT_WORKFLOW_ARTIFACT");
  }
  if (artifact.status === "BUILT") {
    if (artifact.apkSha256 !== EXPECTED_APK_SHA256) errors.push("WRONG_APK_SHA");
    if (artifact.apkSha256 === GITHUB_ZIP_DIGEST) errors.push("ZIP_DIGEST_USED_AS_APK_SHA");
    if (artifact.apkSha256 === STALE_APK_SHA256) errors.push("OLD_APK_RESTORED");
    if (artifact.aabSha256 && artifact.aabSha256 !== EXPECTED_AAB_SHA256) errors.push("WRONG_AAB_SHA");
    if (artifact.versionCode !== EXPECTED_VERSION_CODE) errors.push("WRONG_VERSION_CODE");
    if (artifact.packageId !== PACKAGE_ID) errors.push("WRONG_PACKAGE");
    if (artifact.playReady === true || artifact.labeledPlaySigned === true) {
      errors.push("DEBUG_AAB_LABELED_PLAY_SIGNED");
    }
    if (artifact.artifactSourceSha !== EXPECTED_PR_HEAD) errors.push("ARTIFACT_FROM_DIFFERENT_SOURCE");
    if (artifact.workflowMergeSha !== EXPECTED_WORKFLOW_MERGE) errors.push("ARTIFACT_FROM_DIFFERENT_SOURCE");
    if (!artifact.workflowRunId || artifact.workflowRunId !== ANDROID_RUN_ID) {
      errors.push("PROVENANCE_MISSING");
    }
    if (!artifact.provenancePresent) errors.push("PROVENANCE_MISSING");
    if (artifact.fingerprint !== EXPECTED_FINGERPRINT) errors.push("OLD_FINGERPRINT_ON_CURRENT");
    if (!src.handoff.includes(EXPECTED_APK_SHA256.slice(0, 12))) {
      errors.push("HANDOFF_MISSING_NEW_HASH");
    }
    if (/NOT_BUILT/.test(src.handoff) && src.handoff.includes("File:") && /File:\s*NOT_BUILT/.test(src.handoff)) {
      errors.push("HANDOFF_STILL_NOT_BUILT");
    }
  }

  // Provenance / dirtyTree honesty
  if (prov?.dirtyTree === true) {
    if (!provenance.dirtyTreeReason && provenance.classification !== "SAFE_BUILD_OUTPUT") {
      errors.push("DIRTY_TREE_UNEXPLAINED");
    }
    if (provenance.classification === "INVALID_PROVENANCE") {
      errors.push("DIRTY_SOURCE_AFFECTING_RUNTIME_ACCEPTED");
    }
    if (provenance.invalidProvenance === true && artifact.status === "BUILT") {
      errors.push("DIRTY_SOURCE_AFFECTING_RUNTIME_ACCEPTED");
    }
    if (!provenance.classification) errors.push("DIRTY_TREE_UNEXPLAINED");
  }
  if (provenance.classification === "SAFE_BUILD_OUTPUT" && !provenance.whySafe) {
    errors.push("DIRTY_TREE_UNEXPLAINED");
  }

  // R3121 must not lag claiming NOT_BUILT once reconciled
  if (r3121?.artifact?.status === "NOT_BUILT" && artifact.status === "BUILT") {
    errors.push("R3121_CERT_LAGS_ARTIFACT");
  }

  // Hosted honesty
  const e2eKeys = ["chromium", "webkit", "firefox"];
  if (hosted.overall === "PASS") {
    for (const key of e2eKeys) {
      if (isPending(hosted[key])) errors.push(`HOSTED_PASS_WITH_${key.toUpperCase()}_PENDING`);
      if (hosted[key] === "SKIPPED") errors.push(`HOSTED_PASS_WITH_${key.toUpperCase()}_PENDING`);
    }
    for (const key of ["releaseTruth", "security", "betaSuites", "qualityBuild", "androidFoundation", "androidRuntime"]) {
      if (isPending(hosted[key]) || hosted[key] === "FAIL") {
        errors.push(`HOSTED_${key.toUpperCase()}_NOT_PASS`);
      }
    }
  }

  if (phase === "HOSTED_PASS" || phase === "TARGETED") {
    if (hosted.overall !== "PASS") errors.push("HOSTED_NOT_PASS");
    if (artifact.status !== "BUILT") errors.push("CERT_SAYS_NOT_BUILT_WHILE_WORKFLOW_BUILT");
  }

  // Physical honesty
  const tStatus = targeted?.status ?? "NOT_RUN";
  if (tStatus === "PASS") {
    if (!targeted.artifactSha256) errors.push("PHYSICAL_PASS_WITHOUT_APK_SHA");
    if (targeted.artifactSha256 === STALE_APK_SHA256) errors.push("PHYSICAL_PASS_ON_STALE_APK");
    if (targeted.artifactSha256 !== EXPECTED_APK_SHA256) errors.push("PHYSICAL_PASS_WRONG_APK");
    if (!targeted.evidence?.device || targeted.evidence.device === "emulator") {
      errors.push("PHYSICAL_PASS_FROM_EMULATOR");
    }
    if ((targeted.audioX20Count ?? 0) < 20) errors.push("AUDIO_X20_BELOW_20");
    const checks = targeted.checks ?? {};
    if (checks.personalizedUtterance === "PASS" && targeted.wojiaoPrefixHeard === false) {
      errors.push("PERSONALIZED_UTTERANCE_INCOMPLETE_PASS");
    }
    if (checks.canonicalSkip === "PASS" && targeted.skippedExerciseObserved === true) {
      errors.push("SKIP_OBSERVED_BUT_PASS");
    }
    if (checks.distractorFairness === "PASS" && targeted.distractorObvious === true) {
      errors.push("DISTRACTOR_OBVIOUS_BUT_PASS");
    }
    if (checks.hanziMobileFit === "PASS" && targeted.hanziLayoutBlocked === true) {
      errors.push("HANZI_INACCESSIBLE_BUT_PASS");
    }
  }
  if (tStatus === "PASS" && phase === "ARTIFACT_BUILT_HOSTED_PENDING") {
    errors.push("PHYSICAL_PASS_AUTO_CREATED");
  }

  // Entry / freeze
  if (rc.entry?.PUBLIC_BETA_ENTRY === "GO" || r313?.entry?.PUBLIC_BETA_ENTRY === "GO") {
    errors.push("PUBLIC_BETA_GO");
  }
  if ((rc.wave1?.invited ?? 0) > 0 || (r313?.wave1?.invited ?? 0) > 0) {
    errors.push("WAVE1_INVITED_EARLY");
  }
  if (r313?.resumeFullR3 === true && tStatus !== "PASS") {
    errors.push("RESUME_R3_WITHOUT_TARGETED_PASS");
  }
  if (r313?.entry?.OWNER_QA_ENTRY === "GO" && tStatus !== "PASS") {
    errors.push("ENTRY_GO_WITHOUT_TARGETED");
  }

  // Stale rejection
  if (r313?.rejectedApkSha256 !== STALE_APK_SHA256) errors.push("STALE_HASH_REJECTION_MISSING");
  if (rc.ownerQaApk?.sha256 === STALE_APK_SHA256 && rc.ownerQaApk?.status === "BUILT") {
    errors.push("OLD_APK_RESTORED");
  }

  if (!src.productTruth || !/"lessons":\s*134/.test(src.productTruth)) {
    errors.push("PRODUCT_TRUTH_STALE");
  }

  // Feature freeze marker — no new feature wave strings in cert title pretending features
  if (/Mastery 2\.0|Tone Coach|Native Feed/.test(src.report || "")) {
    errors.push("NEW_FEATURE_INTRODUCED");
  }

  return [...new Set(errors)];
}
