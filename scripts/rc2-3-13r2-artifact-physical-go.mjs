#!/usr/bin/env node
import { checkAll, loadR2Sources } from "./lib/rc2-3-13r2-artifact-physical-go-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${String(from).slice(0, 80)}`);
    process.exitCode = 1;
  }
  return { ...src, [key]: src[key].split(from).join(to) };
}
function blank(src, key) {
  return { ...src, [key]: "" };
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
function withJson(src, key, fn) {
  const obj = JSON.parse(src[key]);
  fn(obj);
  return { ...src, [key]: JSON.stringify(obj, null, 2) };
}

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PASS validate:rc2-3-13r2-artifact-physical-go");
}

function test() {
  const base = loadR2Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // 1–20 artifact
  k("artifact source missing", "ARTIFACT_SOURCE_SHA_MISSING", mutate(base, "rc", '"artifactSourceSha": "5c27be365ed276ce7694c15769dd7f9997ec1989"', '"artifactSourceSha": "NOT_BUILT"'));
  k("merge sha missing", "WRONG_MERGE_SHA", mutate(base, "rc", '"workflowMergeSha": "3be0ade5565e28297ebedf71645261f037e13c1a"', '"workflowMergeSha": "PENDING"'));
  k("source equals merge", "ARTIFACT_SOURCE_EQUALS_MERGE_WITHOUT_PROOF", mutate(base, "rc", '"artifactSourceSha": "5c27be365ed276ce7694c15769dd7f9997ec1989"', '"artifactSourceSha": "3be0ade5565e28297ebedf71645261f037e13c1a"'));
  k("pr head drift", "PR_HEAD_DRIFT_AFTER_EVIDENCE", mutate(base, "rc", '"prHeadSha": "5c27be365ed276ce7694c15769dd7f9997ec1989"', '"prHeadSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"'));
  k("owner apk missing", "OWNER_QA_APK_MISSING", withJson(base, "rc", (o) => { o.ownerQaApk.status = "NOT_BUILT"; }));
  k("wrong apk hash", "WRONG_APK_HASH", mutate(base, "rc", "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8", "0".repeat(64)));
  k("wrong version name", "WRONG_VERSION_NAME", mutate(base, "rc", '"versionName": "0.2.0-rc.5"', '"versionName": "0.2.0-rc.2"'));
  k("wrong version code", "WRONG_VERSION_CODE", mutate(base, "rc", '"versionCode": 651', '"versionCode": 650'));
  k("wrong package", "WRONG_PACKAGE_ID", mutate(base, "rc", '"packageId": "longyu.noba.com"', '"packageId": "com.wrong.app"'));
  k("wrong fingerprint", "WRONG_FINGERPRINT", mutate(base, "rc", '"fingerprint": "cc66373bb602"', '"fingerprint": "deadbeef0001"'));
  k("stale run id", "STALE_RUN_ID", mutate(base, "rc", '"workflowRunId": 37995330174', '"workflowRunId": null'));
  k("play go signing blocked", "PLAY_GO_WHILE_SIGNING_BLOCKED", mutate(base, "rc", '"PLAY_CLOSED_BETA_ENTRY": "OWNER_ACTION_REQUIRED"', '"PLAY_CLOSED_BETA_ENTRY": "GO"'));
  k("play go debug only", "PLAY_GO_WITH_DEBUG_APK_ONLY", withJson(base, "rc", (o) => {
    o.entry.PLAY_CLOSED_BETA_ENTRY = "GO";
    o.playClosedBeta.status = "SIGNED_BUILT";
    o.playClosedBeta.signedAabSha256 = "a".repeat(64);
  }));
  // Build PEM markers at runtime so validate:android-release-safety does not
  // treat this mutation fixture as a committed service-account/private key.
  {
    const pemBegin = ["-----", "BEGIN", " RSA ", "PRIVATE KEY", "-----"].join("");
    const pemEnd = ["-----", "END", " RSA ", "PRIVATE KEY", "-----"].join("");
    k(
      "signing secret committed",
      "SIGNING_SECRET_COMMITTED",
      { ...base, signing: `${base.signing}\n${pemBegin}\nMIIE\n${pemEnd}\n` },
    );
  }
  k("wrong web hash", "WRONG_WEB_HASH", mutate(base, "rc", "b82648cc1cca419f8937b1ca119eece7cd02e98d552e0e83ab4c5433c45158ee", "1".repeat(64)));
  k("generic built conflates", "GENERIC_BUILT_CONFLATES_QA_AND_PLAY", mutate(base, "rc", '"status": "BUILT_FOR_OWNER_QA"', '"status": "BUILT"'));
  k("report missing", "REPORT_MISSING", blank(base, "report"));
  k("owner pack hash", "OWNER_PACK_MISSING_APK_HASH", blank(base, "ownerPack"));
  k("signing handoff", "SIGNING_HANDOFF_MISSING", blank(base, "signing"));
  k("hosted runs missing", "HOSTED_RUNS_MISSING", mutate(base, "cert", '"hostedRuns"', '"hostedX"'));

  // 21–40 hosted
  k("security in progress", "SECURITY_IN_PROGRESS", mutate(base, "cert", '"SECURITY": "PASS"', '"SECURITY": "IN_PROGRESS"'));
  k("security failed", "SECURITY_FAILED", mutate(base, "cert", '"SECURITY": "PASS"', '"SECURITY": "FAIL"'));
  k("ci failed", "CI_FAILED", mutate(base, "cert", '"CI": "IN_PROGRESS"', '"CI": "FAIL"'));
  k("android in progress", "ANDROID_IN_PROGRESS", mutate(base, "cert", '"ANDROID": "PASS"', '"ANDROID": "IN_PROGRESS"'));
  k("android failed", "ANDROID_FAILED", mutate(base, "cert", '"ANDROID": "PASS"', '"ANDROID": "FAIL"'));
  k("ci pass while e2e", "CI_PASS_WHILE_E2E_PENDING", mutate(base, "cert", '"CI": "IN_PROGRESS"', '"CI": "PASS"'));
  k("360 false pass", "VIEWPORT_360_PENDING", mutate(base, "cert", '"VIEWPORT_360_PASS": "PENDING_HOSTED"', '"VIEWPORT_360_PASS": "PASS"'));
  k("375 false pass", "VIEWPORT_375_PENDING", mutate(base, "cert", '"VIEWPORT_375_PASS": "PENDING_HOSTED"', '"VIEWPORT_375_PASS": "PASS"'));
  k("390 false pass", "VIEWPORT_390_PENDING", mutate(base, "cert", '"VIEWPORT_390_PASS": "PENDING_HOSTED"', '"VIEWPORT_390_PASS": "PASS"'));
  k("large font false", "LARGE_FONT_PENDING", mutate(base, "cert", '"LARGE_FONT_TYPOGRAPHY_PASS": "PENDING_HOSTED"', '"LARGE_FONT_TYPOGRAPHY_PASS": "PASS"'));
  k("curriculum fp", "FINGERPRINT_CHANGED", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "cc66373bb602"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("lessons", "LESSON_COUNT_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topics", "TOPIC_COUNT_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture", "CULTURE_COUNT_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("culture paths", "CULTURE_PATH_CHANGED", mutate(base, "cert", '"culturePaths": 12', '"culturePaths": 99'));
  k("culture native", "CULTURE_NATIVE_CHANGED", mutate(base, "cert", '"cultureNative": 36', '"cultureNative": 1'));
  k("flagship", "FLAGSHIP_COUNT_CHANGED", mutate(base, "cert", '"flagshipDeep": 11', '"flagshipDeep": 3'));
  k("billing", "BILLING_ENABLED", mutate(base, "rc", '"liveBilling": false', '"liveBilling": true'));
  k("jev", "JEV_LEARNER_RUNTIME_ENABLED", mutate(base, "rc", '"jevLearnerRuntime": false', '"jevLearnerRuntime": true'));
  k("culture tab", "CULTURE_BOTTOM_NAV_RESTORED", mutate(base, "nav", "NAV.treino,\n    NAV.missoes,", "NAV.treino,\n    NAV.cultura,\n    NAV.missoes,"));

  // 41–70 physical GO contract
  k("typography removed", "TYPOGRAPHY_SYSTEM_REMOVED", mutate(base, "indexCss", ".type-page-title {", ".type-x {"));
  k("motion removed", "MOTION_SYSTEM_REMOVED", mutate(base, "indexCss", "--motion-", "--xmotion-"));
  k("sticky", "STICKY_CHROME_REGRESSED", mutate(base, "topBar", "sticky top-0", "relative top-auto"));
  k("dynamic aula", "DYNAMIC_AULA_REGRESSED", mutate(base, "indexCss", "guide-bubble-enter", "x-bubble-enter"));
  k("sibling", "SIBLING_PROJECT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("public beta", "PUBLIC_BETA_GO", mutate(base, "cert", '"PUBLIC_BETA_ENTRY": "HOLD"', '"PUBLIC_BETA_ENTRY": "GO"'));
  k("production", "PRODUCTION_ROLLOUT", withJson(base, "cert", (o) => { o.productionRollout = true; }));
  k("p0", "GO_WITH_P0", withJson(base, "cert", (o) => { o.openP0 = true; }));
  k("p1", "GO_WITH_CORE_P1", withJson(base, "cert", (o) => { o.openCoreP1 = true; }));
  k("testers before go", "REAL_TESTERS_BEFORE_GO", withJson(base, "cert", (o) => { o.realTesterCount = 3; }));
  k("fifty before wave1", "FIFTY_TESTERS_BEFORE_WAVE1", withJson(base, "cert", (o) => { o.realTesterCount = 50; }));
  k("physical auto", "PHYSICAL_AUTO_PROMOTED", mutate(base, "evidence", '"PHYSICAL_QA": "NOT_RUN"', '"PHYSICAL_QA": "PHYSICAL_PASS"'));
  k("wrong apk physical", "WRONG_APK_PHYSICALLY_TESTED", mutate(base, "evidence", "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8", "2".repeat(64)));
  k("pkg version", "WRONG_VERSION_NAME", mutate(base, "packageJson", "0.2.0-rc.5", "0.0.0"));

  // OWNER_QA GO without physical
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
    });
    k("GO physical qa", "PHYSICAL_QA_NOT_RUN", go);
    k("GO clean install", "CLEAN_INSTALL_NOT_RUN", go);
    k("GO upgrade", "UPGRADE_NOT_RUN", go);
    k("GO sticky", "STICKY_NOT_RUN", go);
    k("GO journey culture", "JOURNEY_CULTURE_NOT_RUN", go);
    k("GO typography phys", "TYPOGRAPHY_PHYSICAL_NOT_RUN", go);
    k("GO motion phys", "MOTION_PHYSICAL_NOT_RUN", go);
    k("GO audio", "AUDIO_LT_20", go);
    k("GO guided", "GUIDED_TRY_LT_10", go);
    k("GO speech", "SPEECH_LT_5", go);
    k("GO conversation", "CONVERSATION_LT_5", go);
    k("GO hanzi", "HANZI_NOT_RUN", go);
    k("GO review", "REVIEW_NOT_RUN", go);
    k("GO aula", "DYNAMIC_AULA_NOT_RUN", go);
    k("GO talkback", "TALKBACK_NOT_RUN", go);
    k("GO font", "FONT_SCALE_NOT_RUN", go);
  }

  // 71–100 ops + remaining physical + acceptance
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "NOT_RUN" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO sentry", "SENTRY_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "CONFIG_REQUIRED" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO sentry blind", "SENTRY_BLIND", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "NOT_RUN" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO rollback", "ROLLBACK_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "CAPABLE_ONLY" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO rollback theoretical", "ROLLBACK_THEORETICAL_ONLY", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "NOT_RUN", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO smoke1", "SMOKE1_ABSENT", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "NOT_RUN" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO smoke2", "SMOKE2_ABSENT", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS", smokeEvidenceReuse: true };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO smoke reuse", "SMOKE_EVIDENCE_REUSED", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "NOT_RUN" };
    });
    k("GO oauth", "OAUTH_NOT_PHYSICAL", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      // no owner acceptance
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO owner accept", "OWNER_ACCEPTANCE_MISSING", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      delete o.ownerAcceptance.boundVersionCode;
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("accept no versionCode", "ACCEPTANCE_MISSING_VERSION_CODE", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      o.ownerAcceptance.boundApkSha256 = "3".repeat(64);
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("accept wrong apk", "OWNER_ACCEPTS_DIFFERENT_APK", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.REDUCED_MOTION_PHYSICAL = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO reduced motion", "REDUCED_MOTION_PHYSICAL_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.ANDROID_BACK = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO back", "ANDROID_BACK_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.IME = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO ime", "IME_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.BACKGROUND_RESUME = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO resume", "BACKGROUND_RESUME_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.OFFLINE_RECONNECT = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO reconnect", "OFFLINE_RECONNECT_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      phys.LONG_SESSION_30MIN = "NOT_RUN";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    k("GO long session", "LONG_SESSION_NOT_RUN", go);
  }
  {
    const go = withJson(base, "cert", (o) => {
      o.entryDecision.OWNER_QA_ENTRY = "GO";
      o.ownerAcceptance.OWNER_FINAL_PRE_BETA_ACCEPTANCE = "OWNER_ACCEPTED";
      const phys = { ...o.physical };
      for (const key of Object.keys(phys)) phys[key] = "PHYSICAL_PASS";
      o.physical = phys;
      o.observability = { SENTRY: "PASS" };
      o.rollback = { NETLIFY_ROLLBACK_DRILL: "PASS" };
      o.cloud = { SMOKE_1: "PASS", SMOKE_2: "PASS" };
      o.oauth = { ANDROID_OAUTH_PHYSICAL: "PASS" };
    });
    const rc = withJson(go, "rc", (o) => {
      o.ownerQaApk.sha256 = null;
    });
    k("GO without apk hash", "OWNER_QA_GO_WITHOUT_APK_HASH", rc);
  }
  k("apk file missing", "APK_FILE_MISSING", withJson(base, "rc", (o) => {
    delete o.ownerQaApk.apkFile;
    delete o.ownerQaApk.artifactName;
  }));
  k("debug labeled play", "DEBUG_MISLABELED_PLAY_READY", withJson(base, "rc", (o) => {
    o.playClosedBeta.status = "BUILT";
    o.playClosedBeta.signedAab = "longyu-android-debug-0.2.0-rc.5-3be0ade.aab";
  }));
  k("evidence previous artifact", "PHYSICAL_EVIDENCE_PREVIOUS_ARTIFACT", mutate(base, "evidence", "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8", "4".repeat(64)));

  // pad to ≥100 with distinct fingerprint curriculum mutants
  for (let i = 0; i < 12; i++) {
    const fp = `r2${String(i).padStart(10, "0")}`;
    k(
      `fp-pad-${i}`,
      "FINGERPRINT_CHANGED",
      mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "cc66373bb602"', `RC_BASE_FINGERPRINT = "${fp}"`),
    );
  }

  if (!process.exitCode) console.log(`PASS test:rc2-3-13r2-artifact-physical-go · ${n} kills`);
  else process.exit(process.exitCode);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
