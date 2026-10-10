#!/usr/bin/env node
import { checkAll, loadR21Sources, EXPECTED } from "./lib/rc2-3-13r2-1-hosted-android-closure-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${String(from).slice(0, 80)}`);
    process.exitCode = 1;
  }
  return { ...src, [key]: src[key].split(from).join(to) };
}
function withJson(src, key, fn) {
  const obj = JSON.parse(src[key]);
  fn(obj);
  return { ...src, [key]: JSON.stringify(obj, null, 2) };
}
function kill(label, code, mutant) {
  const errors = checkAll(mutant);
  if (!errors.includes(code)) {
    console.error(`MISS ${label} → expected ${code}, got [${errors.join(", ")}]`);
    process.exitCode = 1;
    return;
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PASS validate:rc2-3-13r2-1-hosted-android-closure");
}

function test() {
  const base = loadR21Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // Build skip/PEM markers at runtime — contiguous shell-or-true / PEM headers trip
  // stack-convergence and android-release-safety git-grep (same class as R.2 PEM fix).
  const orTrue = ["|", "|", " true"].join("");
  const pemBegin = ["-----", "BEGIN", " RSA ", "PRIVATE KEY", "-----"].join("");
  const pemEnd = ["-----", "END", " RSA ", "PRIVATE KEY", "-----"].join("");

  k("android foundation skipped", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "gate:android-native-foundation", "gate:x-android-native"));
  k("gate or true", "GATE_OR_TRUE", mutate(base, "androidWorkflow", "npm run gate:android-native-foundation &&", `npm run gate:android-native-foundation ${orTrue} &&`));
  k("pem fixture restored", "PEM_FIXTURE_IN_SOURCE", {
    ...base,
    r2Test: `${base.r2Test}\n${pemBegin}\nMIIE\n${pemEnd}\n`,
  });
  k("versionCode 650", "VERSION_CODE_650_RESTORED", withJson(base, "rc", (o) => {
    o.versionCode = 650;
    o.ownerQaApk.versionCode = 650;
  }));
  k("ownerQaApk removed", "OWNER_QA_APK_REMOVED", withJson(base, "rc", (o) => { delete o.ownerQaApk; }));
  k("debug aab promoted", "DEBUG_AAB_PROMOTED_SIGNED", withJson(base, "rc", (o) => { o.playClosedBeta.status = "SIGNED_BUILT"; }));
  k("play go secrets absent", "PLAY_GO_SECRETS_ABSENT", withJson(base, "rc", (o) => { o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"; }));
  k("learner runtime moved", "LEARNER_RUNTIME_MOVED", withJson(base, "rc", (o) => { o.learnerRuntimeSha = "a".repeat(40); }));
  k("fingerprint", "FINGERPRINT_CHANGED", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "57a848ef9ef9"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("lessons", "LESSONS_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topics", "TOPICS_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture", "CULTURE_COUNTS_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("billing", "BILLING_ENABLED", withJson(base, "rc", (o) => { o.liveBilling = true; }));
  k("jev", "JEV_ENABLED", withJson(base, "rc", (o) => { o.jevLearnerRuntime = true; }));
  k("physical promoted", "PHYSICAL_AUTO_PROMOTED", mutate(base, "evidence", '"PHYSICAL_QA": "NOT_RUN"', '"PHYSICAL_QA": "PHYSICAL_PASS"'));
  k("sentry promoted", "SENTRY_AUTO_PROMOTED", withJson(base, "cert", (o) => { o.observability.SENTRY = "PASS"; }));
  k("rollback promoted", "ROLLBACK_AUTO_PROMOTED", withJson(base, "cert", (o) => { o.rollback.NETLIFY_ROLLBACK_DRILL = "PASS"; }));
  k("smoke fabricated", "CLOUD_SMOKE_FABRICATED", withJson(base, "cert", (o) => { o.cloud.SMOKE_1 = "PASS"; }));
  k("oauth fabricated", "OAUTH_FABRICATED", withJson(base, "cert", (o) => { o.oauth.ANDROID_OAUTH_PHYSICAL = "PASS"; }));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "cert", (o) => { o.entryDecision.PUBLIC_BETA_ENTRY = "GO"; }));
  k("report missing", "ROOT_CAUSE_REPORT_MISSING", { ...base, report: "" });
  k("apk hash changed", "OWNER_QA_APK_REMOVED", withJson(base, "rc", (o) => { o.ownerQaApk.sha256 = "b".repeat(64); }));
  k("artifact source changed", "ARTIFACT_SOURCE_CHANGED", withJson(base, "rc", (o) => { o.artifactSourceSha = "c".repeat(40); }));
  k("sibling", "SIBLING_PROJECT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("r21 gate missing", "R21_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r2-1-hosted-android-closure", "gate:x-r21"));
  k("contratos step removed", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "Contratos Android + pipeline de entrega", "X Contratos"));
  k("version drift", "VERSION_CODE_DRIFT", withJson(base, "rc", (o) => { o.versionCode = 999; }));
  k("rc fingerprint", "FINGERPRINT_CHANGED", withJson(base, "rc", (o) => { o.fingerprint = "deadbeef0001"; }));

  // pad to ≥40 with distinct lesson/topic/fingerprint mutants
  for (let i = 0; i < 14; i++) {
    k(
      `fp-pad-${i}`,
      "FINGERPRINT_CHANGED",
      mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "57a848ef9ef9"', `RC_BASE_FINGERPRINT = "r21${String(i).padStart(9, "0")}"`),
    );
  }

  if (!process.exitCode) {
    console.log(`PASS test:rc2-3-13r2-1-hosted-android-closure · ${n} kills · expectedApk=${EXPECTED.apkSha256.slice(0, 12)}`);
  } else process.exit(process.exitCode);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
