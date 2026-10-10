#!/usr/bin/env node
/**
 * RC2.3.13R.3.1.3 — artifact reconciliation + physical honesty (≥60 kills).
 */
import {
  checkAll,
  loadR313Sources,
  STALE_APK_SHA256,
  EXPECTED_APK_SHA256,
  EXPECTED_AAB_SHA256,
  GITHUB_ZIP_DIGEST,
  EXPECTED_PR_HEAD,
  EXPECTED_WORKFLOW_MERGE,
  EXPECTED_FINGERPRINT,
  HISTORICAL_ARTIFACT_FINGERPRINT,
  EXPECTED_VERSION_CODE,
  ANDROID_RUN_ID,
} from "./lib/rc2-3-13r3-1-3-artifact-physical-reconciliation-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-1-3-artifact-physical-reconciliation");
}

function hostedPass(o) {
  return {
    overall: "PASS",
    prHeadSha: o.prHeadSha,
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
    androidRunId: ANDROID_RUN_ID,
  };
}

function targetedPass(base, overrides = {}) {
  let next = withJson(base, "r313", (o) => {
    o.phase = "TARGETED";
    o.hosted = hostedPass(o);
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: EXPECTED_APK_SHA256,
      evidence: { device: "owner-pixel" },
      audioX20Count: 20,
      wojiaoPrefixHeard: true,
      skippedExerciseObserved: false,
      distractorObvious: false,
      hanziLayoutBlocked: false,
      checks: {
        canonicalSkip: "PASS",
        personalizedUtterance: "PASS",
        dialogueAudio: "PASS",
        distractorFairness: "PASS",
        visualVariety: "PASS",
        hanziMobileFit: "PASS",
        audio20: "PASS",
      },
      ...overrides,
    };
  });
  return next;
}

function test() {
  const base = loadR313Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("gate missing", "R313_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-3-artifact-physical-reconciliation", "gate:gone"));
  k("cert missing", "R313_CERT_MISSING", { ...base, r313: "" });
  k("report missing", "R313_REPORT_MISSING", { ...base, report: "" });
  k("handoff missing", "OWNER_HANDOFF_MISSING", { ...base, handoff: "" });
  k("provenance missing", "PROVENANCE_MISSING", { ...base, provenance: "" });

  k("cert not built while workflow built", "CERT_SAYS_NOT_BUILT_WHILE_WORKFLOW_BUILT", withJson(base, "r313", (o) => {
    o.artifact.status = "NOT_BUILT";
  }));
  k("cert built without workflow", "CERT_BUILT_WITHOUT_WORKFLOW_ARTIFACT", (() => {
    const m = withJson(base, "r313", (o) => { o.artifact.status = "BUILT"; });
    return { ...m, provenance: "" };
  })());
  k("wrong apk sha", "WRONG_APK_SHA", withJson(base, "r313", (o) => {
    o.artifact.apkSha256 = "0".repeat(64);
  }));
  k("zip digest as apk sha", "ZIP_DIGEST_USED_AS_APK_SHA", withJson(base, "r313", (o) => {
    o.artifact.apkSha256 = GITHUB_ZIP_DIGEST;
  }));
  k("old apk restored", "OLD_APK_RESTORED", withJson(base, "r313", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256;
  }));
  k("wrong version code", "WRONG_VERSION_CODE", withJson(base, "r313", (o) => {
    o.artifact.versionCode = EXPECTED_VERSION_CODE - 1;
  }));
  k("wrong package", "WRONG_PACKAGE", withJson(base, "r313", (o) => {
    o.artifact.packageId = "com.wrong";
  }));
  k("debug labeled play", "DEBUG_AAB_LABELED_PLAY_SIGNED", withJson(base, "r313", (o) => {
    o.artifact.labeledPlaySigned = true;
  }));
  k("different source sha", "ARTIFACT_FROM_DIFFERENT_SOURCE", withJson(base, "r313", (o) => {
    o.artifact.artifactSourceSha = "0".repeat(40);
  }));
  k("provenance absent flag", "PROVENANCE_MISSING", withJson(base, "r313", (o) => {
    o.artifact.provenancePresent = false;
    o.artifact.workflowRunId = null;
  }));
  k("dirty unexplained", "DIRTY_TREE_UNEXPLAINED", withJson(base, "r313", (o) => {
    o.provenance = { dirtyTree: true, classification: null };
  }));
  k("dirty invalid accepted", "DIRTY_SOURCE_AFFECTING_RUNTIME_ACCEPTED", withJson(base, "r313", (o) => {
    o.provenance.classification = "INVALID_PROVENANCE";
    o.provenance.invalidProvenance = true;
  }));
  k("candidate head stale", "CANDIDATE_HEAD_STALE", withJson(base, "r313", (o) => {
    o.prHeadSha = "1".repeat(40);
  }));
  k("workflow merge conflated equal", "WORKFLOW_MERGE_CONFLATED", withJson(base, "r313", (o) => {
    o.workflowMergeSha = EXPECTED_PR_HEAD;
  }));
  k("workflow merge wrong", "WORKFLOW_MERGE_CONFLATED", withJson(base, "r313", (o) => {
    o.workflowMergeSha = "2".repeat(40);
  }));
  k("historical fp rewritten dual", "HISTORICAL_FINGERPRINT_REWRITTEN", withJson(base, "dualShaRc1", (o) => {
    o.fingerprint = EXPECTED_FINGERPRINT;
  }));
  k("current fp replaced historical", "CURRENT_FINGERPRINT_REPLACED_BY_HISTORICAL", mutate(
    base,
    "curriculumFreeze",
    `RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`,
    `RC_BASE_FINGERPRINT = "${HISTORICAL_ARTIFACT_FINGERPRINT}"`,
  ));
  k("hosted pass chromium pending", "HOSTED_PASS_WITH_CHROMIUM_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), chromium: "PENDING" };
  }));
  k("hosted pass webkit pending", "HOSTED_PASS_WITH_WEBKIT_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), webkit: "PENDING" };
  }));
  k("hosted pass firefox pending", "HOSTED_PASS_WITH_FIREFOX_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), firefox: "PENDING" };
  }));
  k("physical from emulator", "PHYSICAL_PASS_FROM_EMULATOR", targetedPass(base, {
    evidence: { device: "emulator" },
  }));
  k("physical without apk sha", "PHYSICAL_PASS_WITHOUT_APK_SHA", targetedPass(base, {
    artifactSha256: null,
  }));
  k("physical on stale", "PHYSICAL_PASS_ON_STALE_APK", targetedPass(base, {
    artifactSha256: STALE_APK_SHA256,
  }));
  k("audio x20 low", "AUDIO_X20_BELOW_20", targetedPass(base, { audioX20Count: 10 }));
  k("personalized incomplete", "PERSONALIZED_UTTERANCE_INCOMPLETE_PASS", targetedPass(base, {
    wojiaoPrefixHeard: false,
  }));
  k("skip observed", "SKIP_OBSERVED_BUT_PASS", targetedPass(base, { skippedExerciseObserved: true }));
  k("distractor obvious", "DISTRACTOR_OBVIOUS_BUT_PASS", targetedPass(base, { distractorObvious: true }));
  k("hanzi inaccessible", "HANZI_INACCESSIBLE_BUT_PASS", targetedPass(base, { hanziLayoutBlocked: true }));
  k("wave1 early", "WAVE1_INVITED_EARLY", withJson(base, "r313", (o) => { o.wave1.invited = 3; }));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "r313", (o) => { o.entry.PUBLIC_BETA_ENTRY = "GO"; }));
  k("new feature in report", "NEW_FEATURE_INTRODUCED", mutate(base, "report", "NO FEATURE WAVE", "Mastery 2.0 feature wave"));
  k("learner runtime stale", "LEARNER_RUNTIME_STALE", withJson(base, "r313", (o) => {
    o.learnerRuntimeSha = "0".repeat(40);
  }));
  k("stale rejection missing", "STALE_HASH_REJECTION_MISSING", withJson(base, "r313", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
  }));
  k("r3121 lags", "R3121_CERT_LAGS_ARTIFACT", withJson(base, "r3121", (o) => {
    o.artifact = { status: "NOT_BUILT", apkSha256: null };
  }));
  k("wrong aab sha", "WRONG_AAB_SHA", withJson(base, "r313", (o) => {
    o.artifact.aabSha256 = "9".repeat(64);
  }));
  k("old fingerprint on current", "OLD_FINGERPRINT_ON_CURRENT", withJson(base, "r313", (o) => {
    o.artifact.fingerprint = HISTORICAL_ARTIFACT_FINGERPRINT;
  }));
  k("historical owner rc1", "HISTORICAL_FINGERPRINT_REWRITTEN", mutate(
    base,
    "ownerRc1",
    HISTORICAL_ARTIFACT_FINGERPRINT,
    EXPECTED_FINGERPRINT,
  ));
  k("resume without targeted", "RESUME_R3_WITHOUT_TARGETED_PASS", withJson(base, "r313", (o) => {
    o.resumeFullR3 = true;
  }));
  k("entry go without targeted", "ENTRY_GO_WITHOUT_TARGETED", withJson(base, "r313", (o) => {
    o.entry.OWNER_QA_ENTRY = "GO";
  }));
  k("physical auto pending phase", "PHYSICAL_PASS_AUTO_CREATED", withJson(targetedPass(base), "r313", (o) => {
    o.phase = "ARTIFACT_BUILT_HOSTED_PENDING";
  }));
  k("product truth stale", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("old apk on rc", "OLD_APK_RESTORED", withJson(base, "rc", (o) => {
    o.ownerQaApk = { status: "BUILT", sha256: STALE_APK_SHA256 };
  }));
  k("hosted pass chromium skipped", "HOSTED_PASS_WITH_CHROMIUM_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), chromium: "SKIPPED" };
  }));
  k("hosted pass webkit skipped", "HOSTED_PASS_WITH_WEBKIT_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), webkit: "SKIPPED" };
  }));
  k("hosted pass firefox skipped", "HOSTED_PASS_WITH_FIREFOX_PENDING", withJson(base, "r313", (o) => {
    o.hosted = { ...hostedPass(o), firefox: "SKIPPED" };
  }));
  k("physical wrong apk", "PHYSICAL_PASS_WRONG_APK", targetedPass(base, {
    artifactSha256: "a".repeat(64),
  }));
  k("play ready true", "DEBUG_AAB_LABELED_PLAY_SIGNED", withJson(base, "r313", (o) => {
    o.artifact.playReady = true;
  }));
  k("dirty whySafe missing", "DIRTY_TREE_UNEXPLAINED", withJson(base, "r313", (o) => {
    o.provenance = { dirtyTree: true, classification: "SAFE_BUILD_OUTPUT" };
  }));
  k("handoff missing hash", "HANDOFF_MISSING_NEW_HASH", { ...base, handoff: "USE THIS APK\nDO NOT USE\nfb835ce8\n" });
  k("dual2 historical rewrite", "HISTORICAL_FINGERPRINT_REWRITTEN", withJson(base, "dualShaRc2", (o) => {
    o.fingerprint = EXPECTED_FINGERPRINT;
  }));
  k("learner runtime on rc", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "b".repeat(40);
  }));
  k("workflow merge source field", "ARTIFACT_FROM_DIFFERENT_SOURCE", withJson(base, "r313", (o) => {
    o.artifact.workflowMergeSha = "c".repeat(40);
  }));
  k("handoff file not built", "HANDOFF_STILL_NOT_BUILT", {
    ...base,
    handoff: `USE THIS APK\nFile: NOT_BUILT\nSHA256: ${EXPECTED_APK_SHA256}\nfb835ce8\n`,
  });
  k("hosted not pass in hosted_pass phase", "HOSTED_NOT_PASS", withJson(base, "r313", (o) => {
    o.phase = "HOSTED_PASS";
    o.hosted.overall = "PENDING";
  }));
  k("rc public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => {
    o.entry.PUBLIC_BETA_ENTRY = "GO";
  }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-1-3 after ${n} attempted kills`);
    return;
  }
  if (n < 60) {
    console.error(`FAIL need ≥60 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-1-3-artifact-physical-reconciliation — ${n} kills · apk=${EXPECTED_APK_SHA256.slice(0, 12)}`);
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
