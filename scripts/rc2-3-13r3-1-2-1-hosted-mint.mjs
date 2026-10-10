#!/usr/bin/env node
/**
 * RC2.3.13R.3.1.2.1 — hosted mint honesty gate (≥40 kills).
 */
import {
  checkAll,
  loadR3121Sources,
  STALE_APK_SHA256,
  EXPECTED_LEARNER_RUNTIME_SHA,
  EXPECTED_FINGERPRINT,
  HISTORICAL_ARTIFACT_FINGERPRINT,
} from "./lib/rc2-3-13r3-1-2-1-hosted-mint-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${String(from).slice(0, 100)}`);
    process.exitCode = 1;
    return { ...src, [key]: src[key] };
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
  console.log("PASS validate:rc2-3-13r3-1-2-1-hosted-mint");
}

function hostedPass(o) {
  return {
    overall: "PASS",
    headSha: o.candidateHeadSha,
    releaseTruth: "PASS",
    security: "PASS",
    securityBuild: "PASS",
    securityAnalysis: "PASS",
    betaSuites: "PASS",
    qualityBuild: "PASS",
    androidFoundation: "PASS",
    androidRuntime: "PASS",
    chromium: "PASS",
    webkit: "PASS",
    firefox: "PASS",
  };
}

function postBuildBase(base, apkHash = "a".repeat(64)) {
  let next = withJson(base, "r3121", (o) => {
    o.phase = "POST_BUILD";
    o.hosted = hostedPass(o);
    o.artifact = {
      status: "BUILT",
      apkSha256: apkHash,
      artifactSourceSha: o.candidateHeadSha || EXPECTED_LEARNER_RUNTIME_SHA,
      workflowMergeSha: "b".repeat(40),
      workflowRunId: 999,
      versionName: "0.2.0-rc.5",
      versionCode: 700,
      packageId: "longyu.noba.com",
      fingerprint: EXPECTED_FINGERPRINT,
      channel: "DEVICE_QA",
      provenancePresent: true,
      playReady: false,
      labeledPlaySigned: false,
    };
  });
  if (!next.handoff.includes(apkHash.slice(0, 12))) {
    next = { ...next, handoff: `${next.handoff}\n\nUSE THIS APK\nSHA256: ${apkHash}\nDO NOT USE:\nfb835ce8...\n` };
  }
  return next;
}

function targetedPass(base, overrides = {}) {
  const pb = postBuildBase(base);
  return withJson(pb, "r3121", (o) => {
    o.phase = "TARGETED";
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: "a".repeat(64),
      evidence: { device: "owner" },
      audioX20Count: 20,
      ...overrides,
    };
  });
}

function test() {
  const base = loadR3121Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("gate missing", "R3121_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-2-1-hosted-mint", "gate:gone"));
  k("r312 gate missing", "R312_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-2-artifact-targeted-retest", "gate:r312-gone"));
  k("cert missing", "R3121_CERT_MISSING", { ...base, r3121: "" });
  k("report missing", "R3121_REPORT_MISSING", { ...base, report: "" });
  k("handoff missing", "OWNER_HANDOFF_MISSING", { ...base, handoff: "" });

  k("ts6133 restored", "TS6133_RESTORED", mutate(base, "lessonTasks", "function violatesImageRepeat", "function selectedImageConceptIds(){return new Set()}\nfunction violatesImageRepeat"));
  k("unused visual state", "TS6133_RESTORED", mutate(base, "lessonTasks", "function countPinyinTasks", "function selectedImageConceptIds(s){return s}\nfunction countPinyinTasks"));
  k("noUnusedLocals disabled", "NO_UNUSED_LOCALS_DISABLED", mutate(base, "tsconfig", '"noUnusedLocals": true', '"noUnusedLocals": false'));
  k("typecheck skipped", "TYPECHECK_SKIPPED", withJson(base, "r3121", (o) => { o.typecheckSkipped = true; }));
  k("root cause unresolved", "ROOT_CAUSE_UNRESOLVED", withJson(base, "r3121", (o) => { o.rootCause.resolution = "IGNORED"; }));

  k("release truth bypassed", "RELEASE_TRUTH_BYPASSED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), releaseTruth: "SKIPPED" };
  }));
  k("codeql build failed", "CODEQL_BUILD_FAILED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityBuild: "FAIL" };
  }));
  k("codeql analysis skipped", "CODEQL_ANALYSIS_SKIPPED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityAnalysis: "SKIPPED" };
  }));
  k("android pending artifact", "HOSTED_ANDROIDFOUNDATION_PENDING", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidFoundation: "PENDING" };
  }));
  k("beta skipped hosted pass", "BETA_SUITE_SKIPPED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "SKIPPED" };
  }));
  k("chromium skipped", "BETA_SUITE_SKIPPED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), chromium: "SKIPPED" };
  }));
  k("webkit skipped", "BETA_SUITE_SKIPPED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), webkit: "SKIPPED" };
  }));
  k("firefox skipped", "BETA_SUITE_SKIPPED", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), firefox: "SKIPPED" };
  }));

  k("old apk reused", "OLD_APK_REUSED", withJson(base, "rc", (o) => {
    o.ownerQaApk.status = "BUILT";
    o.ownerQaApk.sha256 = STALE_APK_SHA256;
  }));
  k("old hash reused", "OLD_APK_REUSED", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256;
  }));
  k("old fingerprint on current", "OLD_FINGERPRINT_ON_CURRENT_CANDIDATE", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.fingerprint = HISTORICAL_ARTIFACT_FINGERPRINT;
  }));
  k("historical fp overwritten dual1", "HISTORICAL_FINGERPRINT_OVERWRITTEN", withJson(base, "dualShaRc1", (o) => {
    o.fingerprint = EXPECTED_FINGERPRINT;
  }));
  k("historical fp overwritten dual2", "HISTORICAL_FINGERPRINT_OVERWRITTEN", withJson(base, "dualShaRc2", (o) => {
    o.fingerprint = EXPECTED_FINGERPRINT;
  }));
  k("historical fp in owner rc1", "HISTORICAL_FINGERPRINT_OVERWRITTEN", mutate(base, "ownerRc1", HISTORICAL_ARTIFACT_FINGERPRINT, EXPECTED_FINGERPRINT));
  k("historical fp in owner rc2", "HISTORICAL_FINGERPRINT_OVERWRITTEN", mutate(base, "ownerRc2", HISTORICAL_ARTIFACT_FINGERPRINT, EXPECTED_FINGERPRINT));
  k("historical cert overwritten", "HISTORICAL_FINGERPRINT_OVERWRITTEN", withJson(base, "r3121", (o) => {
    o.historicalTruth.rc1Fingerprint = EXPECTED_FINGERPRINT;
  }));

  k("compare regression kind", "COMPARE_WITH_IMAGE_REGRESSION", mutate(base, "lessonTasks", "item.step.kind === candidate.step.kind && ", ""));
  k("name leak regression", "NAME_LEAK_REGRESSION", mutate(base, "personalize", "repairNameOnlyAnswerLeak", "leakGone"));
  k("personal audio fixed", "PERSONAL_AUDIO_FIXED", mutate(base, "audioPlayback", 'from "./audio/personalizedUtterance"', 'from "./personalize"'));
  k("hanzi compact removed", "HANZI_COMPACT_REMOVED", mutate(
    mutate(base, "hanziBuilder", "42svh", "99svh"),
    "hanziBuilder",
    "shortViewport",
    "tallViewport",
  ));
  k("learner runtime stale", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "ce8b7cc82740d6c05d080c462f8403e7d91b1a90";
  }));
  k("artifact source absent", "ARTIFACT_SOURCE_ABSENT", withJson(postBuildBase(base), "r3121", (o) => {
    delete o.artifact.artifactSourceSha;
  }));
  k("apk hash absent", "APK_HASH_ABSENT", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.apkSha256 = null;
  }));
  k("physical pass auto", "PHYSICAL_PASS_AUTO_CREATED", withJson(base, "r3121", (o) => {
    o.phase = "HOSTED_PENDING";
    o.targetedPhysical = { status: "PASS", artifactSha256: "a".repeat(64), evidence: { device: "x" }, audioX20Count: 20 };
  }));
  k("wave1 early", "WAVE1_INVITED_EARLY", withJson(base, "rc", (o) => { o.wave1.invited = 10; }));
  k("fingerprint drift", "FINGERPRINT_DRIFT", mutate(base, "curriculumFreeze", `RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`, 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("hosted pass while pending", "HOSTED_PASS_WHILE_PENDING", withJson(base, "r3121", (o) => {
    o.phase = "HOSTED_PENDING";
    o.hosted.overall = "PASS";
  }));
  k("artifact from pending", "ARTIFACT_FROM_RED_OR_PENDING_HEAD", withJson(base, "r3121", (o) => {
    o.phase = "HOSTED_PENDING";
    o.artifact.status = "BUILT";
    o.artifact.apkSha256 = "c".repeat(64);
  }));
  k("new apk not built", "NEW_APK_NOT_BUILT", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.status = "NOT_BUILT";
  }));
  k("missing provenance", "MISSING_PROVENANCE", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.workflowRunId = null;
    o.artifact.provenancePresent = false;
  }));
  k("debug labeled play", "DEBUG_LABELED_PLAY_SIGNED", withJson(postBuildBase(base), "r3121", (o) => {
    o.artifact.labeledPlaySigned = true;
  }));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => { o.entry.PUBLIC_BETA_ENTRY = "GO"; }));
  k("resume without targeted", "RESUME_R3_WITHOUT_TARGETED_PASS", withJson(base, "r3121", (o) => { o.resumeFullR3 = true; }));
  k("product truth stale", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("stale rejection missing", "STALE_HASH_REJECTION_MISSING", withJson(base, "r3121", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
  }));
  k("security pending", "HOSTED_SECURITY_PENDING", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), security: "PENDING" };
  }));
  k("quality pending", "HOSTED_QUALITYBUILD_PENDING", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), qualityBuild: "PENDING" };
  }));
  k("android runtime pending", "HOSTED_ANDROIDRUNTIME_PENDING", withJson(base, "r3121", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidRuntime: "PENDING" };
  }));
  k("targeted without apk", "TARGETED_PASS_WITHOUT_APK_SHA", targetedPass(base, { artifactSha256: null }));
  k("targeted without evidence", "TARGETED_PASS_WITHOUT_EVIDENCE", targetedPass(base, { evidence: null }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-1-2-1-hosted-mint after ${n} attempted kills`);
    return;
  }
  if (n < 40) {
    console.error(`FAIL need ≥40 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-1-2-1-hosted-mint — ${n} kills · stale=${STALE_APK_SHA256.slice(0, 12)}`);
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
