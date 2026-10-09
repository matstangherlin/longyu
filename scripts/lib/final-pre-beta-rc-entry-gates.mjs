/**
 * RC2.3.13R.1 — final pre-beta RC entry gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadFinalSources() {
  return {
    cert: read("docs/release/final-pre-beta-certification.json"),
    rc: read("docs/release/final-pre-beta-rc.json"),
    evidence: read("docs/release/final-pre-beta-device-evidence.json"),
    freeze: read("docs/release/pre-beta-ui-freeze.json"),
    report: read("docs/reports/rc2-3-13r1-final-pre-beta-certification.md"),
    ownerPack: read("docs/release/OWNER_FINAL_PRE_BETA_RC_TEST.md"),
    productTruth: read("docs/release/product-truth.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    indexCss: read("src/index.css"),
    topBar: read("src/components/layout/TopBar.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    knownIssues: read("docs/release/KNOWN_ISSUES_RC.md"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

export function checkIdentity(src = loadFinalSources()) {
  const errors = [];
  const rc = j(src, "rc");
  const cert = j(src, "cert");
  if (!rc?.rcId) errors.push("RC_ID_MISSING");
  if (!rc?.versionName) errors.push("VERSION_NAME_MISSING");
  if (!Number.isInteger(rc?.versionCode)) errors.push("VERSION_CODE_MISSING");
  if (!rc?.learnerRuntimeSha || String(rc.learnerRuntimeSha).startsWith("PENDING")) {
    errors.push("LEARNER_RUNTIME_SHA_MISSING");
  }
  if (!cert?.shaSemantics?.learnerRuntimeSha || String(cert.shaSemantics.learnerRuntimeSha).startsWith("PENDING")) {
    errors.push("LEARNER_RUNTIME_SHA_MISSING");
  }
  // certificationHeadSha may be PENDING until the cert-stamp commit; key must exist.
  if (!cert?.shaSemantics?.certificationHeadSha) {
    errors.push("CERT_HEAD_SHA_MISSING");
  }
  if (!cert?.shaSemantics || !("artifactSourceSha" in (cert.shaSemantics || {}))) {
    errors.push("ARTIFACT_SOURCE_SHA_MISSING");
  }
  if (!rc || !("artifactSourceSha" in rc)) errors.push("ARTIFACT_SOURCE_SHA_MISSING");
  if (!/0\.2\.0-rc\.5/.test(src.packageJson)) errors.push("VERSION_NAME_MISSING");
  if (rc?.versionName && rc.versionName !== "0.2.0-rc.5") errors.push("VERSION_NAME_MISSING");
  return [...new Set(errors)];
}

export function checkArtifacts(src = loadFinalSources()) {
  const errors = [];
  const rc = j(src, "rc");
  if (!rc) return ["APK_ABSENT", "AAB_ABSENT", "WEB_ABSENT"];
  if (!rc.apk) errors.push("APK_ABSENT");
  if (!rc.aab) errors.push("AAB_ABSENT");
  if (!rc.web) errors.push("WEB_ABSENT");
  if (rc.status === "BUILT") {
    if (rc.apk?.status !== "BUILT" || !/^[a-f0-9]{64}$/.test(rc.apk?.sha256 || "")) errors.push("APK_ABSENT");
    if (rc.aab?.status !== "BUILT" || !/^[a-f0-9]{64}$/.test(rc.aab?.sha256 || "")) errors.push("AAB_ABSENT");
    if (rc.web?.status !== "BUILT" || !/^[a-f0-9]{64}$/.test(rc.web?.sha256 || "")) errors.push("WEB_ABSENT");
    if (!rc.artifactSourceSha || rc.artifactSourceSha === "NOT_BUILT") {
      errors.push("ARTIFACT_SOURCE_SHA_MISSING");
    }
    if (rc.apk?.sha256 && rc.aab?.sha256 && rc.apk.sha256 === rc.aab.sha256) {
      errors.push("APK_HASH_MISMATCH");
    }
  }
  // Invented hashes while still NOT_BUILT
  if (rc.status !== "BUILT") {
    for (const kind of ["apk", "aab", "web"]) {
      const h = rc[kind]?.sha256;
      if (h && /^[a-f0-9]{64}$/.test(h)) errors.push("INVENTED_CHECKSUM");
    }
  }
  return [...new Set(errors)];
}

export function checkFreeze(src = loadFinalSources()) {
  const errors = [];
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_DRIFT");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_DRIFT");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");
  if (!/culturePaths:\s*12|CULTURE_PATHS\s*=\s*12|paths:\s*12/.test(src.curriculumFreeze + src.cert + src.freeze)) {
    // paths may live in cert freeze counts
  }
  const cert = j(src, "cert");
  if (cert?.freeze?.counts?.culturePaths != null && cert.freeze.counts.culturePaths !== 12) {
    errors.push("CULTURE_PATH_DRIFT");
  }
  if (!/RC_BASE_FINGERPRINT = "fea5455e1461"/.test(src.curriculumFreeze)) errors.push("FINGERPRINT_DRIFT");
  if (!/fea5455e1461/.test(src.rc)) errors.push("FINGERPRINT_DRIFT");
  if (!/fea5455e1461/.test(src.cert)) errors.push("FINGERPRINT_DRIFT");
  if (!/fea5455e1461/.test(src.freeze)) errors.push("FINGERPRINT_DRIFT");
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  if (/NAV\.cultura/.test(bar)) errors.push("CULTURE_BOTTOM_NAV_RETURNS");
  if (!/progression-panel-enter/.test(src.progressionShell)) errors.push("MOTION_REGRESSION");
  if (!/data-enter=\{enter\}|data-enter=/.test(src.progressionShell)) {
    errors.push("JOURNEY_CULTURE_TRANSITION_REMOVED");
  }
  if (!/\.type-page-title\s*\{/.test(src.indexCss)) errors.push("TYPOGRAPHY_REGRESSION");
  if (!/--motion-(instant|fast|normal|emphasis)/.test(src.indexCss)) {
    errors.push("MOTION_SYSTEM_MISSING");
  }
  if (!/prefers-reduced-motion:\s*reduce/.test(src.indexCss)) errors.push("REDUCED_MOTION_MISSING");
  if (!/sticky top-0/.test(src.topBar)) errors.push("H1_STICKY_REGRESSION");
  if (/"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit)) errors.push("LIVE_BILLING_ON");
  if (/playPurchases":\s*true|"playBillingEnabled":\s*true/.test(src.rc + src.cert)) {
    errors.push("PLAY_PURCHASES_ON");
  }
  if (/JEV_LEARNER_RUNTIME\s*=\s*true/.test(src.curriculumFreeze)) errors.push("JEV_RUNTIME_ON");
  if (cert?.freeze?.jevLearnerRuntime === "ON" || cert?.freeze?.jevLearnerRuntime === true) {
    errors.push("JEV_RUNTIME_ON");
  }
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav + src.progressionShell)) {
    errors.push("SIBLING_PROJECT_TOUCHED");
  }
  return [...new Set(errors)];
}

export function checkEvidenceHonesty(src = loadFinalSources()) {
  const errors = [];
  const cert = j(src, "cert");
  const ev = j(src, "evidence");
  const rc = j(src, "rc");
  if (!cert) return ["CERT_MISSING"];
  if (!ev) errors.push("EVIDENCE_MISSING");
  if (!/RC2\.3\.13R\.1|Final Pre-Beta Artifact/i.test(src.report)) errors.push("REPORT_MISSING");
  if (!/OWNER_FINAL_PRE_BETA|SHA256|artifactSourceSha/i.test(src.ownerPack)) errors.push("OWNER_PACK_MISSING");
  if (!/"PUBLIC_BETA_ENTRY":\s*"HOLD"/.test(src.cert)) errors.push("PUBLIC_BETA_PREMATURE");

  const hostedPending = ["VIEWPORT_360_PASS", "VIEWPORT_375_PASS", "VIEWPORT_390_PASS", "LARGE_FONT_TYPOGRAPHY_PASS"];
  for (const key of hostedPending) {
    const v = cert.typography?.[key];
    if (v === "PASS" && (ev?.hosted?.VIEWPORT_360 === "PENDING_HOSTED" || ev?.meta?.evidenceLevel === "CODE_ONLY")) {
      // only block false PASS when evidence still pending — checked via typography vs evidence
    }
  }
  if (cert.typography?.VIEWPORT_360_PASS === "PASS" && ev?.hosted?.VIEWPORT_360 !== "HOSTED_PASS" && ev?.hosted?.VIEWPORT_360 !== "PASS") {
    if (cert.typography.VIEWPORT_360_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN"].includes(ev?.hosted?.VIEWPORT_360)) {
      errors.push("VIEWPORT_360_PENDING");
    }
  }
  if (cert.typography?.VIEWPORT_375_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN"].includes(ev?.hosted?.VIEWPORT_375)) {
    errors.push("VIEWPORT_375_PENDING");
  }
  if (cert.typography?.VIEWPORT_390_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN"].includes(ev?.hosted?.VIEWPORT_390)) {
    errors.push("VIEWPORT_390_PENDING");
  }
  if (cert.typography?.LARGE_FONT_TYPOGRAPHY_PASS === "PASS" && ["PENDING_HOSTED", "NOT_RUN"].includes(ev?.hosted?.LARGE_FONT)) {
    errors.push("LARGE_FONT_PENDING");
  }

  const entry = cert.entryDecision?.CLOSED_BETA_ENTRY;
  if (entry === "GO") {
    if (cert.ownerAcceptance?.OWNER_FINAL_PRE_BETA_ACCEPTANCE !== "OWNER_ACCEPTED") {
      errors.push("OWNER_ACCEPTANCE_MISSING");
    }
    if (!["PHYSICAL_PASS", "PASS", "OWNER_ACCEPTED"].includes(cert.physical?.PHYSICAL_QA)) {
      errors.push("PHYSICAL_QA_NOT_PASS");
    }
    for (const [field, code] of [
      ["TYPOGRAPHY_PHYSICAL", "TYPOGRAPHY_PHYSICAL_NOT_RUN"],
      ["MOTION_PHYSICAL", "MOTION_PHYSICAL_NOT_RUN"],
      ["AUDIO_X20", "AUDIO_LT_20"],
      ["GUIDED_TRY_X10", "GUIDED_TRY_LT_10"],
      ["SPEECH_X5", "SPEECH_LT_5"],
      ["CONVERSATION_X5", "CONVERSATION_LT_5"],
      ["HANZI", "HANZI_NOT_RUN"],
      ["REVIEW", "REVIEW_NOT_RUN"],
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
    if (cert.artifacts?.apk !== "BUILT") errors.push("APK_ABSENT");
    if (cert.observability?.SENTRY !== "PASS") errors.push("SENTRY_NOT_PASS");
    if (cert.observability?.SENTRY === "NOT_RUN" || cert.observability?.SENTRY === "CONFIG_REQUIRED") {
      errors.push("SENTRY_BLIND");
    }
    if (cert.rollback?.NETLIFY_ROLLBACK_DRILL !== "PASS") errors.push("ROLLBACK_NOT_PASS");
    if (cert.cloud?.SMOKE_1 !== "PASS") errors.push("CLOUD_SMOKE_1_MISSING");
    if (cert.cloud?.SMOKE_2 !== "PASS") errors.push("CLOUD_SMOKE_2_MISSING");
    if (cert.cloud?.SMOKE_1 === "PASS" && cert.cloud?.SMOKE_2 === "PASS" && cert.cloud?.smokeEvidenceReuse === true) {
      errors.push("SMOKE_EVIDENCE_REUSED");
    }
    if (cert.oauth?.ANDROID_OAUTH_PHYSICAL !== "PASS") errors.push("OAUTH_NOT_PASS");
    for (const [field, code] of [
      ["SECURITY", "SECURITY_NOT_SUCCESS"],
      ["CI", "CI_NOT_SUCCESS"],
      ["ANDROID", "ANDROID_NOT_SUCCESS"],
      ["CHROMIUM", "CHROMIUM_NOT_SUCCESS"],
      ["CROSS_ENGINE", "CROSS_ENGINE_NOT_SUCCESS"],
    ]) {
      if (cert.hosted?.[field] !== "PASS") errors.push(code);
    }
    if (cert.realTesterCount > 0 && entry !== "GO") {
      /* handled below */
    }
  }

  if ((cert.realTesterCount ?? 0) > 0 && entry !== "GO") {
    errors.push("REAL_TESTERS_BEFORE_GO");
  }
  if (entry === "GO" && cert.ownerAcceptance?.boundApkSha256 && rc?.apk?.sha256 && cert.ownerAcceptance.boundApkSha256 !== rc.apk.sha256) {
    errors.push("OWNER_ACCEPTANCE_WRONG_APK");
  }
  if (ev?.physical?.PHYSICAL_QA === "PHYSICAL_PASS" && ev?.meta?.evidenceLevel === "CODE_ONLY") {
    errors.push("FAKE_PHYSICAL_PASS");
  }
  if (cert.physical?.PHYSICAL_QA === "NOT_RUN" && entry === "GO") {
    errors.push("PHYSICAL_QA_NOT_RUN");
  }
  if (cert.openP0 === true || cert.knownIssues?.some?.((i) => i.severity === "P0" && i.status === "OPEN")) {
    errors.push("P0_OPEN");
  }
  if (cert.openCoreP1 === true) errors.push("CORE_P1_OPEN");
  if (cert.freeze?.liveBilling === true || rc?.liveBilling === true) errors.push("LIVE_BILLING_ON");
  if (rc?.playPurchases === true) errors.push("PLAY_PURCHASES_ON");
  if (rc?.jevLearnerRuntime === true) errors.push("JEV_RUNTIME_ON");
  return [...new Set(errors)];
}

export function checkAll(src = loadFinalSources()) {
  return [...checkIdentity(src), ...checkArtifacts(src), ...checkFreeze(src), ...checkEvidenceHonesty(src)];
}
