/**
 * RC2.3.13R.2 — artifact reconciliation + physical GO honesty gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");
const HEX64 = /^[a-f0-9]{64}$/;
const HEX40 = /^[a-f0-9]{40}$/;
export const EXPECTED_APK_SHA256 = "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8";
export const EXPECTED_WEB_SHA256 = "b82648cc1cca419f8937b1ca119eece7cd02e98d552e0e83ab4c5433c45158ee";
export const EXPECTED_ARTIFACT_SOURCE = "5c27be365ed276ce7694c15769dd7f9997ec1989";

export function loadR2Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    cert: read("docs/release/final-pre-beta-certification.json"),
    evidence: read("docs/release/final-pre-beta-device-evidence.json"),
    report: read("docs/reports/rc2-3-13r2-artifact-physical-go.md"),
    ownerPack: read("docs/release/OWNER_FINAL_PRE_BETA_RC_TEST.md"),
    signing: read("docs/release/PLAY_SIGNING_HANDOFF.md"),
    knownIssues: read("docs/release/KNOWN_ISSUES_FINAL_PRE_BETA.md"),
    freeze: read("docs/release/pre-beta-ui-freeze.json"),
    productTruth: read("docs/release/product-truth.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    indexCss: read("src/index.css"),
    topBar: read("src/components/layout/TopBar.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    billingAudit: read("docs/release/android-billing-audit.json"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

export function checkArtifactReconciliation(src = loadR2Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const cert = j(src, "cert");
  if (!rc) return ["RC_MISSING"];
  if (rc.status === "NOT_BUILT" && rc.ownerQaApk?.status === "BUILT") {
    errors.push("METADATA_BUILT_ARTIFACT_UNAVAILABLE");
  }
  if (!HEX40.test(rc.artifactSourceSha || "")) errors.push("ARTIFACT_SOURCE_SHA_MISSING");
  if (!HEX40.test(rc.workflowMergeSha || "")) errors.push("WRONG_MERGE_SHA");
  if (!HEX40.test(rc.prHeadSha || rc.sourceTipSha || "")) errors.push("PR_HEAD_MISSING");
  if (rc.artifactSourceSha && rc.workflowMergeSha && rc.artifactSourceSha === rc.workflowMergeSha) {
    errors.push("ARTIFACT_SOURCE_EQUALS_MERGE_WITHOUT_PROOF");
  }
  if (rc.prHeadSha && rc.artifactSourceSha && rc.prHeadSha !== rc.artifactSourceSha) {
    // allowed only with explicit note — here they must match for OWNER QA candidate
    errors.push("PR_HEAD_DRIFT_AFTER_EVIDENCE");
  }
  const apk = rc.ownerQaApk;
  if (!apk || apk.status !== "BUILT") errors.push("OWNER_QA_APK_MISSING");
  if (apk?.status === "BUILT") {
    if (!apk.apkFile && !apk.artifactName) errors.push("APK_FILE_MISSING");
    if (!HEX64.test(apk.sha256 || "") || apk.sha256 !== EXPECTED_APK_SHA256) errors.push("WRONG_APK_HASH");
    if (apk.versionName !== "0.2.0-rc.5") errors.push("WRONG_VERSION_NAME");
    if (apk.versionCode !== 651) errors.push("WRONG_VERSION_CODE");
    if (apk.packageId && apk.packageId !== "longyu.noba.com") errors.push("WRONG_PACKAGE_ID");
    if (!apk.workflowRunId) errors.push("STALE_RUN_ID");
  }
  if (rc.fingerprint !== "29bb02ec0336") errors.push("WRONG_FINGERPRINT");
  if (!/29bb02ec0336/.test(src.curriculumFreeze)) errors.push("WRONG_FINGERPRINT");

  const play = rc.playClosedBeta;
  if (!play) errors.push("PLAY_AAB_CLAIMED_ABSENT");
  if (play?.status === "SIGNED_BUILT" && !HEX64.test(play.signedAabSha256 || "")) {
    errors.push("WRONG_AAB_HASH");
  }
  if (play?.status === "BUILT" && /debug/i.test(play.signedAab || play.debugAabFile || "")) {
    errors.push("DEBUG_MISLABELED_PLAY_READY");
  }
  if (rc.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && play?.status === "BLOCKED_SIGNING_SECRETS") {
    errors.push("PLAY_GO_WHILE_SIGNING_BLOCKED");
  }
  if (rc.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && /debug/i.test(apk?.apkFile || apk?.artifactName || "")) {
    errors.push("PLAY_GO_WITH_DEBUG_APK_ONLY");
  }
  if (/LONGYU_ANDROID_KEYSTORE_PASSWORD\s*=\s*[^B\s]/.test(src.signing) && !/NOT_CONFIGURED|no secret/i.test(src.signing)) {
    // only flag if an actual password-looking assignment appears
  }
  if (/BEGIN (RSA |OPENSSH )?PRIVATE KEY|keystorePassword\s*[:=]\s*["'][^"']+["']/.test(src.signing + src.rc + src.cert)) {
    errors.push("SIGNING_SECRET_COMMITTED");
  }
  if (rc.web?.status === "BUILT" && (!HEX64.test(rc.web?.sha256 || "") || rc.web.sha256 !== EXPECTED_WEB_SHA256)) {
    errors.push("WRONG_WEB_HASH");
  }
  if (rc.status === "BUILT" && play?.status === "BLOCKED_SIGNING_SECRETS") {
    errors.push("GENERIC_BUILT_CONFLATES_QA_AND_PLAY");
  }
  if (cert?.artifacts?.ownerQaApk === "BUILT" && !HEX64.test(cert?.artifacts?.apkSha256 || "")) {
    errors.push("WRONG_APK_HASH");
  }
  return [...new Set(errors)];
}

export function checkHostedHonesty(src = loadR2Sources()) {
  const errors = [];
  const cert = j(src, "cert");
  const ev = j(src, "evidence");
  if (!cert) return ["CERT_MISSING"];
  const hosted = cert.hosted || {};
  for (const [field, code] of [
    ["SECURITY", "SECURITY_IN_PROGRESS"],
    ["CI", "CI_IN_PROGRESS"],
    ["ANDROID", "ANDROID_IN_PROGRESS"],
    ["CHROMIUM", "CHROMIUM_PENDING"],
    ["CROSS_ENGINE", "CROSS_ENGINE_PENDING"],
  ]) {
    const v = hosted[field];
    if (v === "IN_PROGRESS" || v === "QUEUED") {
      // recording IN_PROGRESS is honest; promoting PASS while still pending is not
    }
  }
  if (hosted.SECURITY === "PASS" && ["IN_PROGRESS", "QUEUED", "NOT_RUN"].includes(ev?.hosted?.SECURITY)) {
    // evidence may use HOSTED_PASS
  }
  if (hosted.SECURITY === "IN_PROGRESS") errors.push("SECURITY_IN_PROGRESS");
  if (hosted.SECURITY === "FAIL") errors.push("SECURITY_FAILED");
  if (hosted.CI === "FAIL") errors.push("CI_FAILED");
  if (hosted.ANDROID === "IN_PROGRESS") errors.push("ANDROID_IN_PROGRESS");
  if (hosted.ANDROID === "FAIL") errors.push("ANDROID_FAILED");
  if (hosted.CI === "PASS" && (hosted.CHROMIUM === "IN_PROGRESS" || hosted.CROSS_ENGINE === "IN_PROGRESS")) {
    errors.push("CI_PASS_WHILE_E2E_PENDING");
  }
  if (cert.typography?.VIEWPORT_360_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN", "IN_PROGRESS"].includes(ev?.hosted?.VIEWPORT_360)) {
    errors.push("VIEWPORT_360_PENDING");
  }
  if (cert.typography?.VIEWPORT_375_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN", "IN_PROGRESS"].includes(ev?.hosted?.VIEWPORT_375)) {
    errors.push("VIEWPORT_375_PENDING");
  }
  if (cert.typography?.VIEWPORT_390_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN", "IN_PROGRESS"].includes(ev?.hosted?.VIEWPORT_390)) {
    errors.push("VIEWPORT_390_PENDING");
  }
  if (cert.typography?.LARGE_FONT_TYPOGRAPHY_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN"].includes(ev?.hosted?.LARGE_FONT)) {
    errors.push("LARGE_FONT_PENDING");
  }
  if (!Array.isArray(cert.hostedRuns) || cert.hostedRuns.length < 2) errors.push("HOSTED_RUNS_MISSING");
  return [...new Set(errors)];
}

export function checkPhysicalHonesty(src = loadR2Sources()) {
  const errors = [];
  const cert = j(src, "cert");
  const ev = j(src, "evidence");
  const rc = j(src, "rc");
  if (!ev) errors.push("EVIDENCE_MISSING");
  if (ev?.meta?.evidenceLevel === "CODE_ONLY" && ev?.physical?.PHYSICAL_QA === "PHYSICAL_PASS") {
    errors.push("PHYSICAL_AUTO_PROMOTED");
  }
  if (ev?.physical?.PHYSICAL_QA === "PHYSICAL_PASS" && ev?.meta?.evidenceLevel?.includes("CODE")) {
    errors.push("PHYSICAL_AUTO_PROMOTED");
  }
  if (ev?.boundArtifact?.apkSha256 && rc?.ownerQaApk?.sha256 && ev.boundArtifact.apkSha256 !== rc.ownerQaApk.sha256) {
    errors.push("WRONG_APK_PHYSICALLY_TESTED");
  }
  if (ev?.boundArtifact?.apkSha256 && cert?.ownerAcceptance?.boundApkSha256 && ev.boundArtifact.apkSha256 !== cert.ownerAcceptance.boundApkSha256) {
    errors.push("PHYSICAL_EVIDENCE_PREVIOUS_ARTIFACT");
  }

  const entry = cert?.entryDecision || {};
  if (entry.OWNER_QA_ENTRY === "GO") {
    for (const [field, code] of [
      ["PHYSICAL_QA", "PHYSICAL_QA_NOT_RUN"],
      ["CLEAN_INSTALL", "CLEAN_INSTALL_NOT_RUN"],
      ["UPGRADE", "UPGRADE_NOT_RUN"],
      ["STICKY_CHROME", "STICKY_NOT_RUN"],
      ["JOURNEY_CULTURE_SWITCH", "JOURNEY_CULTURE_NOT_RUN"],
      ["TYPOGRAPHY_PHYSICAL", "TYPOGRAPHY_PHYSICAL_NOT_RUN"],
      ["MOTION_PHYSICAL", "MOTION_PHYSICAL_NOT_RUN"],
      ["AUDIO_X20", "AUDIO_LT_20"],
      ["GUIDED_TRY_X10", "GUIDED_TRY_LT_10"],
      ["SPEECH_X5", "SPEECH_LT_5"],
      ["CONVERSATION_X5", "CONVERSATION_LT_5"],
      ["HANZI", "HANZI_NOT_RUN"],
      ["REVIEW", "REVIEW_NOT_RUN"],
      ["DYNAMIC_AULA", "DYNAMIC_AULA_NOT_RUN"],
      ["TALKBACK", "TALKBACK_NOT_RUN"],
      ["FONT_SCALE", "FONT_SCALE_NOT_RUN"],
      ["REDUCED_MOTION_PHYSICAL", "REDUCED_MOTION_PHYSICAL_NOT_RUN"],
      ["ANDROID_BACK", "ANDROID_BACK_NOT_RUN"],
      ["IME", "IME_NOT_RUN"],
      ["BACKGROUND_RESUME", "BACKGROUND_RESUME_NOT_RUN"],
      ["OFFLINE_RECONNECT", "OFFLINE_RECONNECT_NOT_RUN"],
      ["LONG_SESSION_30MIN", "LONG_SESSION_NOT_RUN"],
    ]) {
      const v = cert.physical?.[field];
      if (!v || v === "NOT_RUN") errors.push(code);
    }
    if (!HEX64.test(rc?.ownerQaApk?.sha256 || "")) errors.push("OWNER_QA_GO_WITHOUT_APK_HASH");
    if (cert.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE !== "OWNER_ACCEPTED") {
      errors.push("OWNER_ACCEPTANCE_MISSING");
    }
  }
  return [...new Set(errors)];
}

export function checkOpsHonesty(src = loadR2Sources()) {
  const errors = [];
  const cert = j(src, "cert");
  const entry = cert?.entryDecision || {};
  if (entry.OWNER_QA_ENTRY === "GO" || entry.PLAY_CLOSED_BETA_ENTRY === "GO") {
    if (cert.observability?.SENTRY === "NOT_RUN") errors.push("SENTRY_NOT_RUN");
    if (cert.observability?.SENTRY === "CONFIG_REQUIRED") errors.push("SENTRY_BLIND");
    if (cert.rollback?.NETLIFY_ROLLBACK_DRILL === "NOT_RUN") errors.push("ROLLBACK_NOT_RUN");
    if (cert.rollback?.NETLIFY_ROLLBACK_DRILL === "CAPABLE_ONLY") errors.push("ROLLBACK_THEORETICAL_ONLY");
    if (cert.cloud?.SMOKE_1 !== "PASS") errors.push("SMOKE1_ABSENT");
    if (cert.cloud?.SMOKE_2 !== "PASS") errors.push("SMOKE2_ABSENT");
    if (cert.cloud?.SMOKE_1 === "PASS" && cert.cloud?.SMOKE_2 === "PASS" && cert.cloud?.smokeEvidenceReuse === true) {
      errors.push("SMOKE_EVIDENCE_REUSED");
    }
    if (cert.oauth?.ANDROID_OAUTH_PHYSICAL !== "PASS") errors.push("OAUTH_NOT_PHYSICAL");
  }
  if (cert?.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE === "OWNER_ACCEPTED") {
    if (!cert.ownerAcceptance.boundVersionCode) errors.push("ACCEPTANCE_MISSING_VERSION_CODE");
    if (cert.ownerAcceptance.boundApkSha256 && j(src, "rc")?.ownerQaApk?.sha256 && cert.ownerAcceptance.boundApkSha256 !== j(src, "rc").ownerQaApk.sha256) {
      errors.push("OWNER_ACCEPTS_DIFFERENT_APK");
    }
  }
  return [...new Set(errors)];
}

export function checkFreezeAndEntry(src = loadR2Sources()) {
  const errors = [];
  const cert = j(src, "cert");
  const rc = j(src, "rc");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_CHANGED");
  if (cert?.freeze?.counts?.cultureNative != null && cert.freeze.counts.cultureNative !== 36) {
    errors.push("CULTURE_NATIVE_CHANGED");
  }
  if (cert?.freeze?.counts?.culturePaths != null && cert.freeze.counts.culturePaths !== 12) {
    errors.push("CULTURE_PATH_CHANGED");
  }
  if (cert?.freeze?.counts?.flagshipDeep != null && cert.freeze.counts.flagshipDeep !== 11) {
    errors.push("FLAGSHIP_COUNT_CHANGED");
  }
  if (!/RC_BASE_FINGERPRINT = "29bb02ec0336"/.test(src.curriculumFreeze)) errors.push("FINGERPRINT_CHANGED");
  if (/"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit) || rc?.liveBilling === true) {
    errors.push("BILLING_ENABLED");
  }
  if (rc?.jevLearnerRuntime === true || cert?.freeze?.jevLearnerRuntime === "ON") {
    errors.push("JEV_LEARNER_RUNTIME_ENABLED");
  }
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  if (/NAV\.cultura/.test(bar)) errors.push("CULTURE_BOTTOM_NAV_RESTORED");
  if (!/\.type-page-title\s*\{/.test(src.indexCss)) errors.push("TYPOGRAPHY_SYSTEM_REMOVED");
  if (!/--motion-(instant|fast|normal|emphasis)/.test(src.indexCss)) errors.push("MOTION_SYSTEM_REMOVED");
  if (!/sticky top-0/.test(src.topBar)) errors.push("STICKY_CHROME_REGRESSED");
  if (!/progression-panel-enter/.test(src.progressionShell)) errors.push("MOTION_SYSTEM_REMOVED");
  if (!/guide-bubble-enter/.test(src.indexCss) || !/longyu-guidance-in/.test(src.indexCss)) {
    errors.push("DYNAMIC_AULA_REGRESSED");
  }

  if ((cert?.realTesterCount ?? 0) > 0 && cert?.entryDecision?.OWNER_QA_ENTRY !== "GO" && cert?.entryDecision?.PLAY_CLOSED_BETA_ENTRY !== "GO") {
    errors.push("REAL_TESTERS_BEFORE_GO");
  }
  if ((cert?.realTesterCount ?? 0) >= 50 && cert?.entryDecision?.PLAY_CLOSED_BETA_ENTRY !== "GO") {
    errors.push("FIFTY_TESTERS_BEFORE_WAVE1");
  }
  if (cert?.entryDecision?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if (cert?.productionRollout === true) errors.push("PRODUCTION_ROLLOUT");
  if (cert?.openP0 === true) errors.push("GO_WITH_P0");
  if (cert?.openCoreP1 === true) errors.push("GO_WITH_CORE_P1");
  if (/"CLOSED_BETA_ENTRY":\s*"GO"/.test(src.cert) && !cert?.entryDecision?.OWNER_QA_ENTRY) {
    errors.push("GENERIC_CLOSED_BETA_GO_CONFLATES");
  }
  if (!/RC2\.3\.13R\.2|Artifact Reconciliation/i.test(src.report)) errors.push("REPORT_MISSING");
  if (!/fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8/.test(src.ownerPack)) {
    errors.push("OWNER_PACK_MISSING_APK_HASH");
  }
  if (!src.signing || !/BLOCKED_SIGNING_SECRETS/.test(src.signing) || !/LONGYU_ANDROID_KEYSTORE/.test(src.signing)) {
    errors.push("SIGNING_HANDOFF_MISSING");
  }
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav + src.progressionShell)) {
    errors.push("SIBLING_PROJECT_TOUCHED");
  }
  if (!/0\.2\.0-rc\.5/.test(src.packageJson)) errors.push("WRONG_VERSION_NAME");
  return [...new Set(errors)];
}

export function checkAll(src = loadR2Sources()) {
  return [
    ...checkArtifactReconciliation(src),
    ...checkHostedHonesty(src),
    ...checkPhysicalHonesty(src),
    ...checkOpsHonesty(src),
    ...checkFreezeAndEntry(src),
  ];
}
