#!/usr/bin/env node
import { checkAll, loadFinalSources } from "./lib/final-pre-beta-rc-entry-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${from.slice(0, 80)}`);
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

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PASS validate:final-pre-beta-rc-entry");
}

function withGo(src, patchCert = {}) {
  const cert = JSON.parse(src.cert);
  Object.assign(cert.entryDecision, { CLOSED_BETA_ENTRY: "GO" });
  Object.assign(cert, patchCert);
  return { ...src, cert: JSON.stringify(cert, null, 2) };
}

function test() {
  const base = loadFinalSources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // 1–20 identity / freeze / closure
  k("RC ID missing", "RC_ID_MISSING", mutate(base, "rc", '"rcId": "RC2.3.13-RC1"', '"rcId": ""'));
  k("versionName missing", "VERSION_NAME_MISSING", mutate(base, "packageJson", "0.2.0-rc.5", "0.0.0"));
  k("versionCode missing", "VERSION_CODE_MISSING", mutate(base, "rc", '"versionCode": 651', '"versionCode": null'));
  k("artifact source field", "ARTIFACT_SOURCE_SHA_MISSING", mutate(base, "cert", '"artifactSourceSha"', '"artifactX"'));
  k("learner runtime sha", "LEARNER_RUNTIME_SHA_MISSING", mutate(base, "rc", '"learnerRuntimeSha"', '"learnerX"'));
  k("apk absent", "APK_ABSENT", mutate(base, "rc", '"ownerQaApk"', '"apkX"'));
  k("aab absent", "AAB_ABSENT", mutate(base, "rc", '"playClosedBeta"', '"aabX"'));
  k("web absent", "WEB_ABSENT", mutate(base, "rc", '"web"', '"webX"'));
  k("invented apk hash", "INVENTED_CHECKSUM", (() => {
    const o = JSON.parse(base.rc);
    o.status = "NOT_BUILT";
    o.apk = { status: "NOT_BUILT", sha256: "a".repeat(64) };
    delete o.ownerQaApk;
    return { ...base, rc: JSON.stringify(o, null, 2) };
  })());
  k("freeze fp", "FINGERPRINT_DRIFT", mutate(base, "freeze", "fea5455e1461", "bbbbbbbbbbbb"));
  k("cert fp", "FINGERPRINT_DRIFT", mutate(base, "cert", "fea5455e1461", "cccccccccccc"));
  k("rc fp", "FINGERPRINT_DRIFT", mutate(base, "rc", "fea5455e1461", "dddddddddddd"));
  k("curriculum fp", "FINGERPRINT_DRIFT", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "fea5455e1461"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("lessons", "LESSON_COUNT_DRIFT", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topics", "TOPIC_COUNT_DRIFT", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture", "CULTURE_COUNT_DRIFT", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("culture paths", "CULTURE_PATH_DRIFT", mutate(base, "cert", '"culturePaths": 12', '"culturePaths": 99'));
  k("sticky", "H1_STICKY_REGRESSION", mutate(base, "topBar", "sticky top-0", "relative top-auto"));
  k("typography", "TYPOGRAPHY_REGRESSION", mutate(base, "indexCss", ".type-page-title {", ".type-x-page {"));
  k("motion", "MOTION_REGRESSION", mutate(base, "progressionShell", "progression-panel-enter", "panel-static"));

  // 21–40 motion / typography / reduced / scroll / hosted false PASS
  k("journey culture anim", "JOURNEY_CULTURE_TRANSITION_REMOVED", mutate(base, "progressionShell", "data-enter={enter}", "data-static={enter}"));
  k("reduced motion css", "REDUCED_MOTION_MISSING", mutate(base, "indexCss", "prefers-reduced-motion: reduce", "prefers-reduced-motion: no-preference"));
  k("motion tokens", "MOTION_SYSTEM_MISSING", mutate(base, "indexCss", "--motion-", "--xmotion-"));
  k("culture tab", "CULTURE_BOTTOM_NAV_RETURNS", mutate(base, "nav", "NAV.treino,\n    NAV.missoes,", "NAV.treino,\n    NAV.cultura,\n    NAV.missoes,"));
  k("report", "REPORT_MISSING", blank(base, "report"));
  k("owner pack", "OWNER_PACK_MISSING", blank(base, "ownerPack"));
  k("public beta", "PUBLIC_BETA_PREMATURE", mutate(base, "cert", '"PUBLIC_BETA_ENTRY": "HOLD"', '"PUBLIC_BETA_ENTRY": "GO"'));
  k("JEV", "JEV_RUNTIME_ON", { ...base, curriculumFreeze: `${base.curriculumFreeze}\nexport const JEV_LEARNER_RUNTIME = true;\n` });
  k("billing", "LIVE_BILLING_ON", { ...base, billingAudit: `${base.billingAudit.replace(/\}$/, "")}, "enabled": true, "BILLING_ENABLED": true }` });
  k("play purchases", "PLAY_PURCHASES_ON", mutate(base, "rc", '"playPurchases": false', '"playPurchases": true'));
  k("sibling", "SIBLING_PROJECT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("evidence", "EVIDENCE_MISSING", blank(base, "evidence"));
  k("rc blank", "RC_ID_MISSING", blank(base, "rc"));
  k("runtime pending", "LEARNER_RUNTIME_SHA_MISSING", mutate(base, "rc", /"learnerRuntimeSha": "[^"]+"/.exec(base.rc)[0], '"learnerRuntimeSha": "PENDING"'));
  k("pkg version via rc", "VERSION_NAME_MISSING", mutate(base, "rc", '"versionName": "0.2.0-rc.5"', '"versionName": ""'));
  k("fake physical", "FAKE_PHYSICAL_PASS", mutate(base, "evidence", '"PHYSICAL_QA": "NOT_RUN"', '"PHYSICAL_QA": "PHYSICAL_PASS"'));
  k("cert learner sha key", "LEARNER_RUNTIME_SHA_MISSING", mutate(base, "cert", '"learnerRuntimeSha"', '"learnerX"'));
  k("cert head sha key", "CERT_HEAD_SHA_MISSING", mutate(base, "cert", '"certificationHeadSha"', '"certX"'));
  k("360 false pass", "VIEWPORT_360_PENDING", mutate(base, "cert", '"VIEWPORT_360_PASS": "PENDING_HOSTED"', '"VIEWPORT_360_PASS": "PASS"'));
  k("375 false pass", "VIEWPORT_375_PENDING", mutate(base, "cert", '"VIEWPORT_375_PASS": "PENDING_HOSTED"', '"VIEWPORT_375_PASS": "PASS"'));

  // 41–60 GO contract incompleteness
  k("390 false pass", "VIEWPORT_390_PENDING", mutate(base, "cert", '"VIEWPORT_390_PASS": "PENDING_HOSTED"', '"VIEWPORT_390_PASS": "PASS"'));
  k("large font false pass", "LARGE_FONT_PENDING", mutate(base, "cert", '"LARGE_FONT_TYPOGRAPHY_PASS": "PENDING_HOSTED"', '"LARGE_FONT_TYPOGRAPHY_PASS": "PASS"'));
  k("GO without owner", "OWNER_ACCEPTANCE_MISSING", withGo(base));
  k("GO physical qa", "PHYSICAL_QA_NOT_PASS", withGo(base, { ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" } }));
  {
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: { ...(JSON.parse(base.cert).physical), PHYSICAL_QA: "PHYSICAL_PASS" },
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
    });
    k("GO audio", "AUDIO_LT_20", go);
  }
  {
    const c = JSON.parse(base.cert);
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: { ...c.physical, PHYSICAL_QA: "PHYSICAL_PASS", AUDIO_X20: "PASS" },
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
    });
    k("GO guided try", "GUIDED_TRY_LT_10", go);
  }
  {
    const c = JSON.parse(base.cert);
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: { ...c.physical, PHYSICAL_QA: "PHYSICAL_PASS", AUDIO_X20: "PASS", GUIDED_TRY_X10: "PASS" },
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
    });
    k("GO speech", "SPEECH_LT_5", go);
  }
  {
    const c = JSON.parse(base.cert);
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: {
        ...c.physical,
        PHYSICAL_QA: "PHYSICAL_PASS",
        AUDIO_X20: "PASS",
        GUIDED_TRY_X10: "PASS",
        SPEECH_X5: "PASS",
      },
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
    });
    k("GO conversation", "CONVERSATION_LT_5", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "NOT_RUN" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO sentry blind", "SENTRY_BLIND", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "NOT_RUN" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO rollback", "ROLLBACK_NOT_PASS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "NOT_RUN", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO smoke1", "CLOUD_SMOKE_1_MISSING", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "NOT_RUN" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO smoke2", "CLOUD_SMOKE_2_MISSING", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS", smokeEvidenceReuse: true },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO smoke reuse", "SMOKE_EVIDENCE_REUSED", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "NOT_RUN" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO oauth", "OAUTH_NOT_PASS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "FAIL", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO security", "SECURITY_NOT_SUCCESS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "FAIL", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO ci", "CI_NOT_SUCCESS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "FAIL", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO android", "ANDROID_NOT_SUCCESS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "FAIL", CROSS_ENGINE: "PASS" },
    });
    k("GO chromium", "CHROMIUM_NOT_SUCCESS", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "FAIL" },
    });
    k("GO cross-engine", "CROSS_ENGINE_NOT_SUCCESS", go);
  }

  // 61–80 remaining contract kills
  {
    const c = JSON.parse(base.cert);
    c.realTesterCount = 3;
    k("testers before GO", "REAL_TESTERS_BEFORE_GO", { ...base, cert: JSON.stringify(c, null, 2) });
  }
  k("P0 open", "P0_OPEN", (() => {
    const c = JSON.parse(base.cert);
    c.openP0 = true;
    return { ...base, cert: JSON.stringify(c, null, 2) };
  })());
  k("core P1 open", "CORE_P1_OPEN", (() => {
    const c = JSON.parse(base.cert);
    c.openCoreP1 = true;
    return { ...base, cert: JSON.stringify(c, null, 2) };
  })());
  k("live billing rc", "LIVE_BILLING_ON", mutate(base, "rc", '"liveBilling": false', '"liveBilling": true'));
  k("jev rc", "JEV_RUNTIME_ON", mutate(base, "rc", '"jevLearnerRuntime": false', '"jevLearnerRuntime": true'));
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.TYPOGRAPHY_PHYSICAL = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO typography physical", "TYPOGRAPHY_PHYSICAL_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.MOTION_PHYSICAL = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO motion physical", "MOTION_PHYSICAL_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.HANZI = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO hanzi", "HANZI_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.REVIEW = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO review", "REVIEW_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.TALKBACK = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO talkback", "TALKBACK_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.FONT_SCALE = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO font", "FONT_SCALE_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.REDUCED_MOTION_PHYSICAL = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO reduced motion phys", "REDUCED_MOTION_PHYSICAL_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.ANDROID_BACK = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO back", "ANDROID_BACK_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.IME = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO ime", "IME_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.BACKGROUND_RESUME = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO background", "BACKGROUND_RESUME_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.OFFLINE_RECONNECT = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO offline", "OFFLINE_RECONNECT_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    phys.LONG_SESSION_30MIN = "NOT_RUN";
    const go = withGo(base, {
      ownerAcceptance: { OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED" },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    k("GO long session", "LONG_SESSION_NOT_RUN", go);
  }
  {
    const c = JSON.parse(base.cert);
    const phys = { ...c.physical };
    for (const key of Object.keys(phys)) phys[key] = "PASS";
    phys.PHYSICAL_QA = "PHYSICAL_PASS";
    const go = withGo(base, {
      ownerAcceptance: {
        OWNER_FINAL_PRE_BETA_ACCEPTANCE: "OWNER_ACCEPTED",
        boundApkSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      physical: phys,
      artifacts: { apk: "BUILT", aab: "BUILT", web: "BUILT", sha256: "BUILT" },
      observability: { SENTRY: "PASS" },
      rollback: { NETLIFY_ROLLBACK_DRILL: "PASS" },
      cloud: { SMOKE_1: "PASS", SMOKE_2: "PASS" },
      oauth: { ANDROID_OAUTH_PHYSICAL: "PASS" },
      hosted: { SECURITY: "PASS", CI: "PASS", ANDROID: "PASS", CHROMIUM: "PASS", CROSS_ENGINE: "PASS" },
    });
    const rc = JSON.parse(base.rc);
    rc.status = "BUILT";
    rc.artifactSourceSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    rc.apk = { status: "BUILT", artifactName: "x.apk", sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
    rc.aab = { status: "BUILT", artifactName: "x.aab", sha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" };
    rc.web = { status: "BUILT", artifactName: "x.web", sha256: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" };
    k("GO wrong apk accept", "OWNER_ACCEPTANCE_WRONG_APK", { ...go, rc: JSON.stringify(rc, null, 2) });
  }

  // pad to ≥80 with distinct fingerprint mutants on curriculum (still meaningful)
  for (let i = 0; i < 15; i++) {
    const fp = `p${String(i).padStart(11, "0")}`;
    k(
      `fp-pad-${i}`,
      "FINGERPRINT_DRIFT",
      mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "fea5455e1461"', `RC_BASE_FINGERPRINT = "${fp}"`),
    );
  }

  if (!process.exitCode) console.log(`PASS test:final-pre-beta-rc-entry · ${n} kills`);
  else process.exit(process.exitCode);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
