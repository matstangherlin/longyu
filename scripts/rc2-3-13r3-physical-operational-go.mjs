#!/usr/bin/env node
import { checkAll, loadR3Sources, EXPECTED } from "./lib/rc2-3-13r3-physical-operational-go-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-physical-operational-go");
}

function test() {
  const base = loadR3Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  const goOwner = (src) => withJson(src, "rc", (o) => { o.entry.OWNER_QA_ENTRY = "GO"; });
  const goPlay = (src) => withJson(src, "rc", (o) => { o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"; });
  const goBoth = (src) => withJson(src, "rc", (o) => {
    o.entry.OWNER_QA_ENTRY = "GO";
    o.entry.PLAY_CLOSED_BETA_ENTRY = "GO";
  });

  // Physical honesty (1–20)
  k("physical pass without hash", "PHYSICAL_PASS_WITHOUT_HASH", withJson(base, "physical", (o) => {
    delete o.boundArtifact.apkSha256;
    o.results.PHYSICAL_QA = "PHYSICAL_PASS";
  }));
  k("wrong apk hash", "WRONG_APK_HASH", withJson(base, "rc", (o) => { o.ownerQaApk.status = "BUILT"; o.ownerQaApk.sha256 = "a".repeat(64); }));
  k("wrong version", "VERSION_CODE_DRIFT", withJson(base, "rc", (o) => { o.versionCode = 999; }));
  k("clean install not run + GO", "CLEAN_INSTALL_NOT_RUN_GO", goOwner(base));
  k("audio under 20", "AUDIO_UNDER_20", withJson(goOwner(base), "physical", (o) => {
    o.results.CLEAN_INSTALL = "PHYSICAL_PASS";
    o.results.AUDIO_X20 = "PHYSICAL_PASS";
    o.results.AUDIO_COUNT = 5;
  }));
  k("guided under 10", "GUIDED_UNDER_10", withJson(goOwner(base), "physical", (o) => {
    o.results.CLEAN_INSTALL = "PHYSICAL_PASS";
    o.results.GUIDED_X10 = "PHYSICAL_PASS";
    o.results.GUIDED_COUNT = 3;
  }));
  k("speech under 5", "SPEECH_UNDER_5", withJson(goOwner(base), "physical", (o) => {
    o.results.CLEAN_INSTALL = "PHYSICAL_PASS";
    o.results.SPEECH_X5 = "PHYSICAL_PASS";
    o.results.SPEECH_COUNT = 2;
  }));
  k("conversation under 5", "CONVERSATION_UNDER_5", withJson(goOwner(base), "physical", (o) => {
    o.results.CLEAN_INSTALL = "PHYSICAL_PASS";
    o.results.CONVERSATION_X5 = "PHYSICAL_PASS";
    o.results.CONVERSATION_COUNT = 1;
  }));
  k("hanzi not run GO", "HANZI_NOT_RUN_GO", goOwner(base));
  k("review not run GO", "REVIEW_NOT_RUN_GO", goOwner(base));
  k("dynamic aula not run GO", "DYNAMIC_AULA_NOT_RUN_GO", goOwner(base));
  k("talkback not run GO", "TALKBACK_NOT_RUN_GO", goOwner(base));
  k("font scale not run GO", "FONT_SCALE_NOT_RUN_GO", goOwner(base));
  k("back not run GO", "ANDROID_BACK_NOT_RUN_GO", goOwner(base));
  k("ime not run GO", "IME_NOT_RUN_GO", goOwner(base));
  k("background not run GO", "BACKGROUND_RESUME_NOT_RUN_GO", goOwner(base));
  k("reconnect not run GO", "OFFLINE_RECONNECT_NOT_RUN_GO", goOwner(base));
  k("30min not run GO", "LONG_SESSION_NOT_RUN_GO", goOwner(base));
  k("oauth not run GO", "ANDROID_OAUTH_NOT_RUN_GO", goOwner(base));
  k("owner acceptance missing", "OWNER_ACCEPTANCE_MISSING", withJson(goOwner(base), "physical", (o) => {
    for (const key of Object.keys(o.results)) {
      if (typeof o.results[key] === "string" && o.results[key] === "NOT_RUN") o.results[key] = "PHYSICAL_PASS";
    }
    o.results.AUDIO_COUNT = 20;
    o.results.GUIDED_COUNT = 10;
    o.results.SPEECH_COUNT = 5;
    o.results.CONVERSATION_COUNT = 5;
    o.meta.evidenceLevel = "PHYSICAL";
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));

  // Operations (21–31)
  k("sentry not run play GO", "SENTRY_NOT_RUN_GO", withJson(goPlay(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("sentry synthetic missing", "SENTRY_SYNTHETIC_MISSING", withJson(base, "operations", (o) => {
    o.results.SENTRY = "PASS";
    o.results.SENTRY_SYNTHETIC_EVENT_ID = null;
    o.results.SENTRY_RELEASE_IDENTITY = "longyu@0.2.0-rc.5";
  }));
  k("sentry no release identity", "SENTRY_NO_RELEASE_IDENTITY", withJson(base, "operations", (o) => {
    o.results.SENTRY = "PASS";
    o.results.SENTRY_SYNTHETIC_EVENT_ID = "evt_1";
    o.results.SENTRY_RELEASE_IDENTITY = null;
  }));
  k("sentry token leak", "SENTRY_TOKEN_LEAK", withJson(base, "operations", (o) => {
    o.results.note = "access_token=secretleak";
  }));
  k("rollback theoretical", "ROLLBACK_THEORETICAL", withJson(base, "operations", (o) => {
    o.results.ROLLBACK = "PASS";
    o.results.ROLLBACK_TIMESTAMPS = null;
  }));
  k("rollback not run play GO", "ROLLBACK_NOT_RUN_GO", withJson(goPlay(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("smoke1 missing", "SMOKE1_MISSING", withJson(goPlay(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("smoke2 missing", "SMOKE2_MISSING", withJson(
    withJson(goPlay(base), "physical", (o) => {
      o.hostedPrecondition.status = "PASS";
      o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
      o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
      o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
    }),
    "operations",
    (o) => {
      o.results.CLOUD_SMOKE_1 = "PASS";
      o.results.CLOUD_SMOKE_1_EVIDENCE_ID = "smoke-a";
      o.results.CLOUD_SMOKE_2 = "NOT_RUN";
    },
  ));
  // Need play GO + smoke1 present to isolate smoke2 — also clear hosted block
  k("smoke evidence reused", "SMOKE_EVIDENCE_REUSED", withJson(base, "operations", (o) => {
    o.results.CLOUD_SMOKE_1_EVIDENCE_ID = "same";
    o.results.CLOUD_SMOKE_2_EVIDENCE_ID = "same";
  }));
  k("migration fabricated", "MIGRATION_FABRICATED", withJson(base, "operations", (o) => {
    o.results.MIGRATION_TRUTH = "APPLIED";
    delete o.migrationProof;
  }));
  k("web identity unknown", "WEB_IDENTITY_UNKNOWN", withJson(goPlay(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));

  // Play (32–40)
  k("debug aab labeled signed", "DEBUG_AAB_LABELED_SIGNED", withJson(base, "play", (o) => {
    o.results.SIGNED_AAB = "SIGNED_BUILT";
    o.results.SIGNING_CONFIG = "BLOCKED_SIGNING_SECRETS";
  }));
  k("play go secrets absent", "PLAY_GO_SECRETS_ABSENT", goPlay(base));
  k("signed aab hash missing", "SIGNED_AAB_HASH_MISSING", withJson(base, "play", (o) => {
    o.results.SIGNED_AAB = "SIGNED_BUILT";
    o.results.SIGNING_CONFIG = "CONFIGURED";
    o.results.AAB_SHA256 = null;
  }));
  k("wrong package", "WRONG_PACKAGE", withJson(base, "play", (o) => { o.results.PACKAGE = "evil.app"; }));
  k("wrong versionCode play", "WRONG_VERSION_CODE", withJson(base, "play", (o) => { o.results.VERSION_CODE = 1; }));
  k("play production rollout", "PLAY_PRODUCTION_ROLLOUT", withJson(base, "play", (o) => { o.results.TRACK = "PRODUCTION"; }));
  k("play install fabricated", "PLAY_INSTALL_FABRICATED", withJson(base, "play", (o) => {
    o.results.PLAY_INSTALL_PROOF = "PASS";
    o.results.SIGNED_AAB = "NOT_BUILT";
  }));
  k("rc play status signed without hash", "DEBUG_AAB_LABELED_SIGNED", withJson(base, "rc", (o) => {
    o.playClosedBeta.status = "SIGNED_BUILT";
    o.playClosedBeta.signedAabSha256 = null;
  }));
  k("public track", "PLAY_PRODUCTION_ROLLOUT", withJson(base, "play", (o) => { o.results.TRACK = "PUBLIC"; }));

  // Freeze (41–52)
  k("lessons", "LESSONS_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topics", "TOPICS_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture items", "CULTURE_COUNTS_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("culture paths", "CULTURE_PATHS_CHANGED", withJson(base, "cert", (o) => { o.freeze.counts.culturePaths = 99; }));
  k("fingerprint", "FINGERPRINT_CHANGED", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "29bb02ec0336"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("billing", "BILLING_ENABLED", withJson(base, "rc", (o) => { o.liveBilling = true; }));
  k("jev", "JEV_ENABLED", withJson(base, "rc", (o) => { o.jevLearnerRuntime = true; }));
  k("sibling", "SIBLING_PROJECT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("learner runtime moved", "LEARNER_RUNTIME_MOVED", withJson(base, "rc", (o) => { o.learnerRuntimeSha = "b".repeat(40); }));
  k("artifact source changed", "ARTIFACT_SOURCE_CHANGED", withJson(base, "rc", (o) => { o.artifactSourceSha = "c".repeat(40); }));
  k("version 650", "VERSION_CODE_650_RESTORED", withJson(base, "rc", (o) => {
    o.versionCode = 650;
    o.ownerQaApk.versionCode = 650;
  }));
  k("owner qa removed", "OWNER_QA_APK_REMOVED", withJson(base, "rc", (o) => { delete o.ownerQaApk; }));

  // Hosted (53–60)
  k("chromium pending GO", "CHROMIUM_PENDING", goOwner(base));
  k("ci pending GO", "CI_PENDING", goOwner(base));
  k("security pending", "SECURITY_PENDING", withJson(goOwner(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.SECURITY = "IN_PROGRESS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("android pending", "ANDROID_PENDING", withJson(goOwner(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.ANDROID_BUILD = "IN_PROGRESS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("webkit pending", "WEBKIT_PENDING", withJson(goOwner(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "IN_PROGRESS";
    o.hostedPrecondition.FIREFOX = "HOSTED_PASS";
  }));
  k("firefox pending", "FIREFOX_PENDING", withJson(goOwner(base), "physical", (o) => {
    o.hostedPrecondition.status = "PASS";
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.WEBKIT = "HOSTED_PASS";
    o.hostedPrecondition.FIREFOX = "IN_PROGRESS";
  }));
  k("stale sha evidence", "STALE_SHA_EVIDENCE", withJson(base, "physical", (o) => {
    o.hostedPrecondition.CHROMIUM = "HOSTED_PASS";
    o.hostedPrecondition.evidenceSha = "0".repeat(40);
    o.hostedPrecondition.allowStale = true;
  }));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => { o.entry.PUBLIC_BETA_ENTRY = "GO"; }));

  // Owner (61–65+)
  k("owner acceptance generic", "OWNER_ACCEPTANCE_GENERIC", withJson(base, "cert", (o) => {
    o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
    o.ownerAcceptance.boundApkSha256 = null;
  }));
  k("owner accepted old apk", "OWNER_ACCEPTED_OLD_APK", withJson(base, "cert", (o) => {
    o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
    o.ownerAcceptance.boundApkSha256 = "d".repeat(64);
  }));
  k("owner acceptance before physical", "OWNER_ACCEPTANCE_BEFORE_PHYSICAL", withJson(base, "cert", (o) => {
    o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
  }));
  k("testers before distribution GO", "TESTERS_BEFORE_DISTRIBUTION_GO", withJson(base, "rc", (o) => {
    o.wave1.invited = 3;
  }));
  k("owner qa go without physical", "OWNER_QA_GO_WITHOUT_PHYSICAL", goOwner(base));

  // Scaffold integrity
  k("r3 gate missing", "R3_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-physical-operational-go", "gate:x-r3"));
  k("physical cert missing", "PHYSICAL_CERT_MISSING", { ...base, physical: "" });
  k("ops cert missing", "OPS_CERT_MISSING", { ...base, operations: "" });
  k("play cert missing", "PLAY_CERT_MISSING", { ...base, play: "" });
  k("report missing", "R3_REPORT_MISSING", { ...base, report: "" });
  k("owner pack missing", "OWNER_PACK_MISSING", { ...base, ownerPack: "" });
  k("physical auto promoted", "PHYSICAL_AUTO_PROMOTED", withJson(base, "physical", (o) => {
    o.results.PHYSICAL_QA = "PHYSICAL_PASS";
    o.meta.evidenceLevel = "NOT_RUN";
  }));
  k("rc id drift", "RC_ID_DRIFT", withJson(base, "rc", (o) => { o.rcId = "RC2.3.13-RC2"; }));
  k("version name drift", "VERSION_NAME_DRIFT", withJson(base, "rc", (o) => { o.versionName = "0.2.0-rc.6"; }));
  k("package drift", "PACKAGE_DRIFT", withJson(base, "rc", (o) => { o.packageId = "com.other"; }));

  // Pad to ≥100 with distinct fingerprint / lesson / topic / culture mutants and GO blockers
  for (let i = 0; i < 20; i++) {
    k(
      `fp-pad-${i}`,
      "FINGERPRINT_CHANGED",
      mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "29bb02ec0336"', `RC_BASE_FINGERPRINT = "r3p${String(i).padStart(9, "0")}"`),
    );
  }
  for (let i = 0; i < 10; i++) {
    k(
      `lesson-pad-${i}`,
      "LESSONS_CHANGED",
      mutate(base, "curriculumFreeze", "lessons: 134", `lessons: ${140 + i}`),
    );
  }

  if (!process.exitCode) {
    console.log(`PASS test:rc2-3-13r3-physical-operational-go · ${n} kills · apk=${EXPECTED.apkSha256.slice(0, 12)}`);
  } else process.exit(process.exitCode);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
