/**
 * RC2.3.13R.3 — physical / operational / Play GO honesty.
 * Intermediate state (hosted E2E pending, physical NOT_RUN, ops NOT_RUN,
 * Play BLOCKED_SIGNING_SECRETS, entries OWNER_ACTION_REQUIRED) is VALID.
 * GO without evidence is NOT.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const EXPECTED = Object.freeze({
  learnerRuntimeSha: "ce8b7cc82740d6c05d080c462f8403e7d91b1a90",
  artifactSourceSha: "5c27be365ed276ce7694c15769dd7f9997ec1989",
  apkSha256: "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
  versionName: "0.2.0-rc.5",
  versionCode: 651,
  fingerprint: "fea5455e1461",
  rcId: "RC2.3.13-RC1",
  packageId: "longyu.noba.com",
  lessons: 134,
  topics: 113,
  cultureItems: 36,
  culturePaths: 12,
});

const PHYSICAL_KEYS = [
  "CLEAN_INSTALL", "UPGRADE", "HOME", "JOURNEY", "CULTURE", "STICKY", "JOURNEY_CULTURE",
  "TYPOGRAPHY", "MOTION", "AUDIO_X20", "GUIDED_X10", "SPEECH_X5", "CONVERSATION_X5",
  "HANZI", "REVIEW", "DYNAMIC_AULA", "TALKBACK", "FONT_SCALE", "REDUCED_MOTION",
  "ANDROID_BACK", "IME", "BACKGROUND_RESUME", "OFFLINE_RECONNECT", "LONG_SESSION",
  "ACCOUNT", "ANDROID_OAUTH", "PHYSICAL_QA",
];

export function loadR3Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    cert: read("docs/release/final-pre-beta-certification.json"),
    evidence: read("docs/release/final-pre-beta-device-evidence.json"),
    physical: read("docs/release/rc2-3-13r3-physical-certification.json"),
    operations: read("docs/release/rc2-3-13r3-operations-certification.json"),
    play: read("docs/release/rc2-3-13r3-play-certification.json"),
    report: read("docs/reports/rc2-3-13r3-physical-operational-certification.md"),
    ownerPack: read("docs/release/OWNER_R3_PHYSICAL_OPERATIONAL_PACK.md"),
    knownIssues: read("docs/release/KNOWN_ISSUES_FINAL_PRE_BETA.md"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    nav: read("src/components/layout/nav.tsx"),
    signingHandoff: read("docs/release/PLAY_SIGNING_HANDOFF.md"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

function isGo(v) {
  return v === "GO" || v === "OWNER_ACCEPTED" || v === true;
}

export function checkAll(src = loadR3Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const cert = j(src, "cert");
  const ev = j(src, "evidence");
  const phys = j(src, "physical");
  const ops = j(src, "operations");
  const play = j(src, "play");

  if (!/gate:rc2-3-13r3-physical-operational-go/.test(src.packageJson)) {
    errors.push("R3_GATE_MISSING");
  }
  if (!phys) errors.push("PHYSICAL_CERT_MISSING");
  if (!ops) errors.push("OPS_CERT_MISSING");
  if (!play) errors.push("PLAY_CERT_MISSING");
  if (!/NO FEATURE WAVE|PHYSICAL|OPERATIONAL/i.test(src.report)) errors.push("R3_REPORT_MISSING");
  if (!/OWNER_R3|physical matrix|APK SHA256/i.test(src.ownerPack)) errors.push("OWNER_PACK_MISSING");
  if (!rc) return ["RC_MISSING", ...errors];

  // Identity / freeze
  if (rc.rcId !== EXPECTED.rcId) errors.push("RC_ID_DRIFT");
  if (rc.versionName !== EXPECTED.versionName) errors.push("VERSION_NAME_DRIFT");
  if (rc.versionCode !== EXPECTED.versionCode || rc.ownerQaApk?.versionCode !== EXPECTED.versionCode) {
    errors.push("VERSION_CODE_DRIFT");
  }
  if (rc.versionCode === 650 || rc.ownerQaApk?.versionCode === 650) errors.push("VERSION_CODE_650_RESTORED");
  if (rc.packageId !== EXPECTED.packageId) errors.push("PACKAGE_DRIFT");
  if (rc.learnerRuntimeSha !== EXPECTED.learnerRuntimeSha) errors.push("LEARNER_RUNTIME_MOVED");
  if (rc.artifactSourceSha !== EXPECTED.artifactSourceSha) errors.push("ARTIFACT_SOURCE_CHANGED");
  if (rc.ownerQaApk?.sha256 !== EXPECTED.apkSha256) errors.push("WRONG_APK_HASH");
  if (!rc.ownerQaApk || rc.ownerQaApk.status !== "BUILT") errors.push("OWNER_QA_APK_REMOVED");
  if (rc.fingerprint !== EXPECTED.fingerprint) errors.push("FINGERPRINT_CHANGED");
  if (!/RC_BASE_FINGERPRINT = "fea5455e1461"/.test(src.curriculumFreeze)) errors.push("FINGERPRINT_CHANGED");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSONS_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPICS_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNTS_CHANGED");
  if (cert?.freeze?.counts?.culturePaths !== EXPECTED.culturePaths) {
    errors.push("CULTURE_PATHS_CHANGED");
  }
  if (rc.liveBilling === true || /"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit)) {
    errors.push("BILLING_ENABLED");
  }
  if (rc.jevLearnerRuntime === true) errors.push("JEV_ENABLED");
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav)) errors.push("SIBLING_PROJECT_TOUCHED");
  if (/culture.*bottom|bottomNav.*culture/i.test(src.nav) && /Culture/.test(src.nav)) {
    // only flag if a Culture tab is restored as primary bottom nav item
    if (/"Culture"|'Culture'/.test(src.nav) && /bottom/i.test(src.nav)) errors.push("CULTURE_BOTTOM_NAV_RESTORED");
  }

  // Bound physical artifact
  const bound = phys?.boundArtifact || {};
  if (bound.apkSha256 && bound.apkSha256 !== EXPECTED.apkSha256) errors.push("WRONG_APK_HASH");
  if (bound.versionCode && bound.versionCode !== EXPECTED.versionCode) errors.push("VERSION_CODE_DRIFT");
  if (bound.artifactSourceSha && bound.artifactSourceSha !== EXPECTED.artifactSourceSha) {
    errors.push("ARTIFACT_SOURCE_CHANGED");
  }

  const results = phys?.results || {};
  const ownerQaGo = isGo(rc.entry?.OWNER_QA_ENTRY) || isGo(cert?.entryDecision?.OWNER_QA_ENTRY);
  const playGo = isGo(rc.entry?.PLAY_CLOSED_BETA_ENTRY) || isGo(cert?.entryDecision?.PLAY_CLOSED_BETA_ENTRY);
  const publicGo = isGo(rc.entry?.PUBLIC_BETA_ENTRY) || isGo(cert?.entryDecision?.PUBLIC_BETA_ENTRY);

  // Physical honesty
  if (results.PHYSICAL_QA === "PHYSICAL_PASS" && !results.apkSha256 && !bound.apkSha256) {
    errors.push("PHYSICAL_PASS_WITHOUT_HASH");
  }
  if (ownerQaGo && results.CLEAN_INSTALL === "NOT_RUN") errors.push("CLEAN_INSTALL_NOT_RUN_GO");
  if (ownerQaGo && (results.AUDIO_COUNT ?? 0) < 20 && results.AUDIO_X20 !== "PHYSICAL_PASS") {
    errors.push("AUDIO_UNDER_20");
  }
  if (results.AUDIO_X20 === "PHYSICAL_PASS" && (results.AUDIO_COUNT ?? 0) < 20) errors.push("AUDIO_UNDER_20");
  if (ownerQaGo && (results.GUIDED_COUNT ?? 0) < 10 && results.GUIDED_X10 !== "PHYSICAL_PASS") {
    errors.push("GUIDED_UNDER_10");
  }
  if (results.GUIDED_X10 === "PHYSICAL_PASS" && (results.GUIDED_COUNT ?? 0) < 10) errors.push("GUIDED_UNDER_10");
  if (ownerQaGo && (results.SPEECH_COUNT ?? 0) < 5 && results.SPEECH_X5 !== "PHYSICAL_PASS") {
    errors.push("SPEECH_UNDER_5");
  }
  if (results.SPEECH_X5 === "PHYSICAL_PASS" && (results.SPEECH_COUNT ?? 0) < 5) errors.push("SPEECH_UNDER_5");
  if (ownerQaGo && (results.CONVERSATION_COUNT ?? 0) < 5 && results.CONVERSATION_X5 !== "PHYSICAL_PASS") {
    errors.push("CONVERSATION_UNDER_5");
  }
  if (results.CONVERSATION_X5 === "PHYSICAL_PASS" && (results.CONVERSATION_COUNT ?? 0) < 5) {
    errors.push("CONVERSATION_UNDER_5");
  }
  for (const key of [
    "HANZI", "REVIEW", "DYNAMIC_AULA", "TALKBACK", "FONT_SCALE", "ANDROID_BACK", "IME",
    "BACKGROUND_RESUME", "OFFLINE_RECONNECT", "LONG_SESSION", "ANDROID_OAUTH",
  ]) {
    if (ownerQaGo && results[key] === "NOT_RUN") errors.push(`${key}_NOT_RUN_GO`);
  }
  if (ownerQaGo && cert?.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE !== "OWNER_ACCEPTED"
    && cert?.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE !== "PASS") {
    errors.push("OWNER_ACCEPTANCE_MISSING");
  }
  if (cert?.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE === "OWNER_ACCEPTED"
    || cert?.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE === "PASS") {
    if (cert.ownerAcceptance.boundApkSha256 !== EXPECTED.apkSha256) errors.push("OWNER_ACCEPTED_OLD_APK");
    if (!cert.ownerAcceptance.boundApkSha256) errors.push("OWNER_ACCEPTANCE_GENERIC");
    if (results.PHYSICAL_QA === "NOT_RUN") errors.push("OWNER_ACCEPTANCE_BEFORE_PHYSICAL");
  }

  // Auto-promotion / fabrication
  if (results.PHYSICAL_QA === "PHYSICAL_PASS" && phys?.meta?.evidenceLevel === "NOT_RUN") {
    errors.push("PHYSICAL_AUTO_PROMOTED");
  }
  if (ev?.physical?.PHYSICAL_QA === "PHYSICAL_PASS" && /CODE|HOSTED|NOT_RUN/i.test(String(ev?.meta?.evidenceLevel || ""))) {
    errors.push("PHYSICAL_AUTO_PROMOTED");
  }

  // Operations honesty
  const opsR = ops?.results || {};
  if ((playGo || ownerQaGo) && (opsR.SENTRY === "NOT_RUN" || opsR.SENTRY === "CONFIG_REQUIRED")) {
    if (playGo && opsR.SENTRY !== "PASS") errors.push("SENTRY_NOT_RUN_GO");
  }
  if (opsR.SENTRY === "PASS" && !opsR.SENTRY_SYNTHETIC_EVENT_ID) errors.push("SENTRY_SYNTHETIC_MISSING");
  if (opsR.SENTRY === "PASS" && !opsR.SENTRY_RELEASE_IDENTITY) errors.push("SENTRY_NO_RELEASE_IDENTITY");
  if (/access_token|refresh_token|Authorization|password|BEGIN .*PRIVATE/i.test(JSON.stringify(opsR))) {
    errors.push("SENTRY_TOKEN_LEAK");
  }
  if (opsR.ROLLBACK === "PASS" && !opsR.ROLLBACK_TIMESTAMPS) errors.push("ROLLBACK_THEORETICAL");
  if (playGo && opsR.ROLLBACK === "NOT_RUN") errors.push("ROLLBACK_NOT_RUN_GO");
  if (playGo && opsR.CLOUD_SMOKE_1 === "NOT_RUN") errors.push("SMOKE1_MISSING");
  if (playGo && opsR.CLOUD_SMOKE_2 === "NOT_RUN") errors.push("SMOKE2_MISSING");
  if (
    opsR.CLOUD_SMOKE_1_EVIDENCE_ID
    && opsR.CLOUD_SMOKE_2_EVIDENCE_ID
    && opsR.CLOUD_SMOKE_1_EVIDENCE_ID === opsR.CLOUD_SMOKE_2_EVIDENCE_ID
  ) {
    errors.push("SMOKE_EVIDENCE_REUSED");
  }
  if (opsR.MIGRATION_TRUTH === "APPLIED" && !opsR.MIGRATION_PROOF) {
    // allow NOT_RUN; fabricated APPLIED without proof
    if (!/APPLIED|REPO_ONLY|NOT_DEPLOYED/.test(src.operations) || !ops.migrationProof) {
      if (!ops.migrationProof && opsR.MIGRATION_TRUTH === "APPLIED") errors.push("MIGRATION_FABRICATED");
    }
  }
  if (playGo && opsR.WEB_IDENTITY === "NOT_RUN") errors.push("WEB_IDENTITY_UNKNOWN");

  // Play honesty
  const playR = play?.results || {};
  if (playR.SIGNED_AAB === "SIGNED_BUILT" && playR.SIGNING_CONFIG === "BLOCKED_SIGNING_SECRETS") {
    errors.push("DEBUG_AAB_LABELED_SIGNED");
  }
  if (rc.playClosedBeta?.status === "SIGNED_BUILT" && !rc.playClosedBeta?.signedAabSha256) {
    errors.push("DEBUG_AAB_LABELED_SIGNED");
  }
  if (playGo && playR.SIGNING_CONFIG === "BLOCKED_SIGNING_SECRETS") errors.push("PLAY_GO_SECRETS_ABSENT");
  if (playR.SIGNED_AAB === "SIGNED_BUILT" && !playR.AAB_SHA256) errors.push("SIGNED_AAB_HASH_MISSING");
  if (playR.PACKAGE && playR.PACKAGE !== EXPECTED.packageId) errors.push("WRONG_PACKAGE");
  if (playR.VERSION_CODE && playR.VERSION_CODE !== EXPECTED.versionCode) errors.push("WRONG_VERSION_CODE");
  if (playR.TRACK === "PRODUCTION" || playR.TRACK === "PUBLIC") errors.push("PLAY_PRODUCTION_ROLLOUT");
  if (playR.PLAY_INSTALL_PROOF === "PASS" && playR.SIGNED_AAB !== "SIGNED_BUILT") {
    errors.push("PLAY_INSTALL_FABRICATED");
  }
  if (rc.playClosedBeta?.status !== "BLOCKED_SIGNING_SECRETS" && rc.playClosedBeta?.status !== "SIGNED_BUILT") {
    // allow only honest states
    if (rc.playClosedBeta?.status === "BUILT" && rc.playClosedBeta?.debugAabPresent) {
      errors.push("DEBUG_AAB_LABELED_SIGNED");
    }
  }
  if (playGo && rc.playClosedBeta?.status === "BLOCKED_SIGNING_SECRETS") errors.push("PLAY_GO_SECRETS_ABSENT");

  // Hosted precondition for GO
  const host = phys?.hostedPrecondition || {};
  if (ownerQaGo || playGo) {
    for (const [k, code] of [
      ["SECURITY", "SECURITY_PENDING"],
      ["ANDROID_BUILD", "ANDROID_PENDING"],
      ["CHROMIUM", "CHROMIUM_PENDING"],
      ["WEBKIT", "WEBKIT_PENDING"],
      ["FIREFOX", "FIREFOX_PENDING"],
    ]) {
      if (host[k] === "IN_PROGRESS" || host[k] === "PENDING" || host[k] === "NOT_RUN" || host.status === "BLOCKED_UNTIL_E2E") {
        if (k === "SECURITY" && host[k] !== "HOSTED_PASS") errors.push(code);
        else if (k === "ANDROID_BUILD" && host[k] !== "HOSTED_PASS") errors.push(code);
        else if (["CHROMIUM", "WEBKIT", "FIREFOX"].includes(k) && host[k] !== "HOSTED_PASS") errors.push(code);
      }
    }
    if (host.status === "BLOCKED_UNTIL_E2E") {
      errors.push("CHROMIUM_PENDING");
      errors.push("CI_PENDING");
    }
  }
  if (host.CHROMIUM === "HOSTED_PASS" && host.evidenceSha && host.evidenceSha !== "8811deca936c30ab9eecad56fabcff9cfc9014eb"
    && host.evidenceSha !== rc.certificationHeadSha && host.allowStale === true) {
    errors.push("STALE_SHA_EVIDENCE");
  }

  // Entry
  if (publicGo) errors.push("PUBLIC_BETA_GO");
  if (rc.wave1?.invited > 0 && !playGo && rc.entry?.PLAY_CLOSED_BETA_ENTRY !== "GO") {
    errors.push("TESTERS_BEFORE_DISTRIBUTION_GO");
  }
  if (ownerQaGo && results.PHYSICAL_QA === "NOT_RUN") errors.push("OWNER_QA_GO_WITHOUT_PHYSICAL");

  // Feature freeze markers in report/pack
  if (/Mastery 2\.0|Longyu Life|Tone Coach|Adaptive Reader/i.test(src.report)
    && /implemented|shipped|added feature/i.test(src.report)) {
    errors.push("FEATURE_WAVE_CLAIM");
  }

  // Keep physical keys present
  for (const key of PHYSICAL_KEYS) {
    if (results[key] == null) errors.push("PHYSICAL_MATRIX_INCOMPLETE");
  }

  if (!/BLOCKED_SIGNING_SECRETS|signing secrets/i.test(src.signingHandoff)) {
    errors.push("SIGNING_HANDOFF_MISSING");
  }

  return [...new Set(errors)];
}
