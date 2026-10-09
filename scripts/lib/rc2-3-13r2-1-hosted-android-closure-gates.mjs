/**
 * RC2.3.13R.2.1 — hosted Android foundation closure honesty gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const EXPECTED = {
  learnerRuntimeSha: "ce8b7cc82740d6c05d080c462f8403e7d91b1a90",
  artifactSourceSha: "5c27be365ed276ce7694c15769dd7f9997ec1989",
  apkSha256: "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
  versionCode: 651,
  fingerprint: "fea5455e1461",
};

export function loadR21Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    cert: read("docs/release/final-pre-beta-certification.json"),
    evidence: read("docs/release/final-pre-beta-device-evidence.json"),
    report: read("docs/reports/rc2-3-13r2-1-android-foundation-root-cause.md"),
    knownIssues: read("docs/release/KNOWN_ISSUES_FINAL_PRE_BETA.md"),
    freeze: read("docs/release/pre-beta-ui-freeze.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    androidWorkflow: read(".github/workflows/android-build.yml"),
    r2Test: read("scripts/rc2-3-13r2-artifact-physical-go.mjs"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    nav: read("src/components/layout/nav.tsx"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

export function checkAll(src = loadR21Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const cert = j(src, "cert");
  const ev = j(src, "evidence");

  if (!/gate:android-native-foundation/.test(src.androidWorkflow)) errors.push("ANDROID_FOUNDATION_SKIPPED");
  if (!/Contratos Android \+ pipeline de entrega/.test(src.androidWorkflow)) errors.push("ANDROID_FOUNDATION_SKIPPED");
  if (/gate:android-native-foundation\s*\|\|\s*true/.test(src.androidWorkflow + src.packageJson)) {
    errors.push("GATE_OR_TRUE");
  }
  if (/continue-on-error:\s*true[\s\S]{0,200}Contratos Android/.test(src.androidWorkflow)) {
    errors.push("GATE_NON_BLOCKING");
  }
  if (!/gate:rc2-3-13r2-1-hosted-android-closure/.test(src.packageJson)) {
    errors.push("R21_GATE_MISSING");
  }

  // PEM fixture must not be contiguous in tracked source (release-safety).
  // Marker joined at runtime so this gate file itself is not a SERVICE_ACCOUNT_COMMITTED hit.
  const pemBegin = ["-----", "BEGIN", " RSA ", "PRIVATE KEY", "-----"].join("");
  if (src.r2Test.includes(pemBegin)) {
    errors.push("PEM_FIXTURE_IN_SOURCE");
  }

  if (!rc) return ["RC_MISSING", ...errors];
  if (rc.versionCode === 650 || /"versionCode":\s*650/.test(src.rc) && rc.ownerQaApk?.versionCode === 650) {
    errors.push("VERSION_CODE_650_RESTORED");
  }
  if (rc.versionCode !== EXPECTED.versionCode || rc.ownerQaApk?.versionCode !== EXPECTED.versionCode) {
    errors.push("VERSION_CODE_DRIFT");
  }
  if (rc.learnerRuntimeSha !== EXPECTED.learnerRuntimeSha) errors.push("LEARNER_RUNTIME_MOVED");
  if (rc.artifactSourceSha !== EXPECTED.artifactSourceSha) errors.push("ARTIFACT_SOURCE_CHANGED");
  if (rc.ownerQaApk?.sha256 !== EXPECTED.apkSha256) errors.push("OWNER_QA_APK_REMOVED");
  if (!rc.ownerQaApk || rc.ownerQaApk.status !== "BUILT") errors.push("OWNER_QA_APK_REMOVED");
  if (rc.playClosedBeta?.status !== "BLOCKED_SIGNING_SECRETS") errors.push("DEBUG_AAB_PROMOTED_SIGNED");
  if (rc.entry?.PLAY_CLOSED_BETA_ENTRY === "GO") errors.push("PLAY_GO_SECRETS_ABSENT");
  if (rc.fingerprint !== EXPECTED.fingerprint) errors.push("FINGERPRINT_CHANGED");
  if (!/RC_BASE_FINGERPRINT = "fea5455e1461"/.test(src.curriculumFreeze)) errors.push("FINGERPRINT_CHANGED");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSONS_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPICS_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNTS_CHANGED");
  if (rc.liveBilling === true || /"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit)) {
    errors.push("BILLING_ENABLED");
  }
  if (rc.jevLearnerRuntime === true) errors.push("JEV_ENABLED");
  if (ev?.physical?.PHYSICAL_QA === "PHYSICAL_PASS" && /CODE|HOSTED/i.test(String(ev?.meta?.evidenceLevel || ""))) {
    errors.push("PHYSICAL_AUTO_PROMOTED");
  }
  if (cert?.observability?.SENTRY === "PASS" && ev?.operations?.SENTRY === "NOT_RUN") {
    errors.push("SENTRY_AUTO_PROMOTED");
  }
  if (cert?.rollback?.NETLIFY_ROLLBACK_DRILL === "PASS" && ev?.operations?.NETLIFY_ROLLBACK_DRILL === "NOT_RUN") {
    errors.push("ROLLBACK_AUTO_PROMOTED");
  }
  if (cert?.cloud?.SMOKE_1 === "PASS" && ev?.operations?.SMOKE_1 === "NOT_RUN") {
    errors.push("CLOUD_SMOKE_FABRICATED");
  }
  if (cert?.oauth?.ANDROID_OAUTH_PHYSICAL === "PASS" && ev?.physical?.ANDROID_OAUTH_PHYSICAL === "NOT_RUN") {
    errors.push("OAUTH_FABRICATED");
  }
  if (cert?.entryDecision?.PUBLIC_BETA_ENTRY === "GO" || rc.entry?.PUBLIC_BETA_ENTRY === "GO") {
    errors.push("PUBLIC_BETA_GO");
  }
  if (!/SERVICE_ACCOUNT_COMMITTED|PEM|root cause|android-release-safety/i.test(src.report)) {
    errors.push("ROOT_CAUSE_REPORT_MISSING");
  }
  if (!/learner runtime changed\?\s*no/i.test(src.report) && !/learnerRuntimeSha unchanged|learner runtime.*no/i.test(src.report)) {
    errors.push("RUNTIME_CHANGE_CLAIM_MISSING");
  }
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav)) errors.push("SIBLING_PROJECT_TOUCHED");

  return [...new Set(errors)];
}
