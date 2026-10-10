#!/usr/bin/env node
/**
 * RC2.3.13R.3.1.2 — artifact mint + targeted physical honesty gate (≥70 kills).
 */
import {
  checkAll,
  loadR312Sources,
  STALE_APK_SHA256,
  EXPECTED_LEARNER_RUNTIME_SHA,
} from "./lib/rc2-3-13r3-1-2-artifact-targeted-retest-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-1-2-artifact-targeted-retest");
}

function hostedPass(o) {
  return {
    overall: "PASS",
    headSha: o.parentHeadSha,
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
  let next = withJson(base, "r312", (o) => {
    o.phase = "POST_BUILD";
    o.hosted = hostedPass(o);
    o.artifact = {
      status: "BUILT",
      apkSha256: apkHash,
      artifactSourceSha: EXPECTED_LEARNER_RUNTIME_SHA,
      workflowMergeSha: "b".repeat(40),
      workflowRunId: 999,
      versionName: "0.2.0-rc.5",
      versionCode: 700,
      packageId: "longyu.noba.com",
      channel: "DEVICE_QA",
      provenancePresent: true,
      playReady: false,
      labeledPlaySigned: false,
    };
  });
  // Ensure handoff mentions new hash + stale reject
  if (!next.handoff.includes(apkHash.slice(0, 12))) {
    next = { ...next, handoff: `${next.handoff}\n\nUSE THIS APK\nSHA256: ${apkHash}\nDO NOT USE:\nfb835ce8...\n` };
  }
  return next;
}

function targetedPass(base, overrides = {}) {
  const pb = postBuildBase(base);
  return withJson(pb, "r312", (o) => {
    o.phase = "TARGETED";
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: "a".repeat(64),
      evidence: { device: "owner" },
      audioX20Count: 20,
      audioPassMeans: "HUMAN_HEARS_COMPLETE_UTTERANCE",
      wojiaoPrefixHeard: true,
      learnerNameHeard: true,
      skippedExerciseObserved: false,
      hanziLayoutBlocked: false,
      distractorObvious: false,
      visualRepetitionSystematic: false,
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
}

function test() {
  const base = loadR312Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("gate missing", "R312_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-2-artifact-targeted-retest", "gate:removed"));
  k("r311 gate missing", "R311_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-1-hosted-candidate-rebuild", "gate:r311-gone"));
  k("r31 gate missing", "R31_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-learning-integrity", "gate:r31-gone"));
  k("cert missing", "R312_CERT_MISSING", { ...base, r312: "" });
  k("report missing", "R312_REPORT_MISSING", { ...base, report: "" });
  k("handoff missing", "OWNER_HANDOFF_MISSING", { ...base, handoff: "" });

  k("release truth pending", "HOSTED_RELEASETRUTH_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), releaseTruth: "PENDING" };
  }));
  k("release truth failed", "HOSTED_RELEASETRUTH_FAILED", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), releaseTruth: "FAIL" };
  }));
  k("security pending", "HOSTED_SECURITY_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), security: "PENDING" };
  }));
  k("codeql build failed", "CODEQL_BUILD_FAILED", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityBuild: "FAIL" };
  }));
  k("codeql analysis skipped", "CODEQL_ANALYSIS_SKIPPED", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityAnalysis: "SKIPPED" };
  }));
  k("beta suite skipped", "BETA_SUITE_SKIPPED", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "SKIPPED" };
  }));
  k("android foundation pending", "HOSTED_ANDROIDFOUNDATION_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidFoundation: "PENDING" };
  }));
  k("android runtime pending", "HOSTED_ANDROIDRUNTIME_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidRuntime: "PENDING" };
  }));
  k("chromium pending", "HOSTED_CHROMIUM_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), chromium: "PENDING" };
  }));
  k("webkit pending", "HOSTED_WEBKIT_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), webkit: "PENDING" };
  }));
  k("firefox pending", "HOSTED_FIREFOX_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), firefox: "PENDING" };
  }));
  k("stale hosted evidence", "STALE_HOSTED_EVIDENCE", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), headSha: "0".repeat(40) };
  }));
  k("hosted pass while pending", "HOSTED_PASS_WHILE_PENDING", withJson(base, "r312", (o) => {
    o.phase = "HOSTED_PENDING";
    o.hosted.overall = "PASS";
  }));
  k("artifact from pending head", "ARTIFACT_FROM_RED_OR_PENDING_HEAD", withJson(base, "r312", (o) => {
    o.phase = "HOSTED_PENDING";
    o.artifact.status = "BUILT";
    o.artifact.apkSha256 = "c".repeat(64);
  }));

  k("old apk reused", "OLD_APK_REUSED", withJson(base, "rc", (o) => {
    o.ownerQaApk.status = "BUILT";
    o.ownerQaApk.sha256 = STALE_APK_SHA256;
  }));
  k("stale hash marked current", "STALE_HASH_MARKED_CURRENT", withJson(base, "r312", (o) => {
    o.artifact.status = "BUILT";
    o.artifact.apkSha256 = STALE_APK_SHA256;
  }));
  k("apk hash absent", "APK_HASH_ABSENT", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.apkSha256 = null;
  }));
  k("artifact source absent", "ARTIFACT_SOURCE_ABSENT", withJson(postBuildBase(base), "r312", (o) => {
    delete o.artifact.artifactSourceSha;
  }));
  k("wrong package id", "WRONG_PACKAGE_ID", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.packageId = "com.wrong.app";
  }));
  k("wrong version", "WRONG_VERSION", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.versionName = null;
    o.artifact.versionCode = null;
  }));
  k("debug labeled play signed", "DEBUG_LABELED_PLAY_SIGNED", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.labeledPlaySigned = true;
  }));
  k("stale artifact physically accepted", "STALE_ARTIFACT_PHYSICALLY_ACCEPTED", targetedPass(base, {
    artifactSha256: STALE_APK_SHA256,
  }));
  k("missing provenance", "MISSING_PROVENANCE", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.workflowRunId = null;
    o.artifact.provenancePresent = false;
  }));
  k("artifact from red head", "ARTIFACT_FROM_RED_OR_PENDING_HEAD", withJson(postBuildBase(base), "r312", (o) => {
    o.hosted.overall = "FAIL";
  }));
  k("stale rejection missing", "STALE_HASH_REJECTION_MISSING", withJson(base, "r312", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
  }));

  k("canonical invalid", "CANONICAL_ACTIVITY_INVALID", withJson(base, "r31", (o) => {
    o.canonicalActivitiesInvalid = 2;
  }));
  k("skip fallback hidden", "SKIP_FALLBACK_HIDDEN", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) return null;\n  if (!validation.valid) {"));
  k("distractor leak", "DISTRACTOR_LEAK_RESTORED", mutate(base, "personalize", "repairNameOnlyAnswerLeak", "leakGone"));
  k("personal audio fixed", "PERSONAL_AUDIO_FIXED", mutate(
    mutate(base, "audioPlayback", "PERSONAL_UTTERANCE", "FIXED_UTTERANCE"),
    "audioPolicy",
    'includes("PERSONAL")',
    'includes("XPERSONAL")',
  ));
  k("personal after lesson", "PERSONAL_AFTER_LESSON", (() => {
    const src = { ...base };
    const marker = 'if (s.includes("DYNAMIC") || s.includes("NAME") || s.includes("PERSONAL")) return "DYNAMIC_CONTENT";';
    src.audioPolicy = src.audioPolicy.replace(marker, "/* deferred */");
    src.audioPolicy = src.audioPolicy.replace('return "FIXED_CONTENT";\n}', `${marker}\n  return "FIXED_CONTENT";\n}`);
    return src;
  })());
  k("audio store cycle", "AUDIO_STORE_CYCLE_RESTORED", mutate(base, "audioPlayback", 'from "./audio/personalizedUtterance"', 'from "./personalize"'));
  k("en overlay removed", "EN_OVERLAY_REMOVED", mutate(base, "instructionGloss", "火 é fogo. Quando aparece como peça", "火 overlay gone"));
  k("visual author exempt", "VISUAL_AUTHOR_EXEMPT_RESTORED", mutate(base, "lessonTasks", "function violatesImageRepeat", `function violatesImageRepeat(selected, candidate) {\n  if (!candidate.generated) return false;\n  return false;\n}\nfunction violatesImageRepeatLegacy`));
  k("hanzi compact removed", "HANZI_COMPACT_REMOVED", mutate(
    mutate(base, "hanziBuilder", "42svh", "99svh"),
    "hanziBuilder",
    "shortViewport",
    "tallViewport",
  ));
  k("pure helper missing", "PURE_HELPER_MISSING", mutate(base, "personalizedUtterance", "isPersonalizedUtterance", "isMixedSpeech"));
  k("choice list gone", "DISTRACTOR_LEAK_RESTORED", mutate(base, "personalize", "personalizeChoiceList", "choiceGone"));

  k("targeted pass without apk sha", "TARGETED_PASS_WITHOUT_APK_SHA", targetedPass(base, { artifactSha256: null }));
  k("targeted pass without evidence", "TARGETED_PASS_WITHOUT_EVIDENCE", targetedPass(base, { evidence: null }));
  k("audio x20 below 20", "AUDIO_X20_BELOW_20", targetedPass(base, { audioX20Count: 5 }));
  k("audio button only", "AUDIO_BUTTON_ONLY_PASS", targetedPass(base, { audioPassMeans: "BUTTON_ONLY" }));
  k("wojiao prefix unheard", "WOJIAO_PREFIX_UNHEARD", targetedPass(base, { wojiaoPrefixHeard: false }));
  k("name unheard", "NAME_UNHEARD", targetedPass(base, { learnerNameHeard: false }));
  k("skip observed but pass", "SKIP_OBSERVED_BUT_PASS", targetedPass(base, { skippedExerciseObserved: true }));
  k("hanzi blocked but pass", "HANZI_BLOCKED_BUT_PASS", targetedPass(base, { hanziLayoutBlocked: true }));
  k("distractor obvious but pass", "DISTRACTOR_OBVIOUS_BUT_PASS", targetedPass(base, { distractorObvious: true }));
  k("visual repetition but pass", "VISUAL_REPETITION_BUT_PASS", targetedPass(base, { visualRepetitionSystematic: true }));

  k("learner runtime stale", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "ce8b7cc82740d6c05d080c462f8403e7d91b1a90";
  }));
  k("learner mismatch", "LEARNER_RUNTIME_MISMATCH", withJson(
    withJson(base, "r312", (o) => { o.learnerRuntimeSha = EXPECTED_LEARNER_RUNTIME_SHA; }),
    "rc",
    (o) => { o.learnerRuntimeSha = "d".repeat(40); },
  ));
  k("fingerprint drift", "FINGERPRINT_DRIFT", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "29bb02ec0336"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("lesson count", "LESSON_COUNT_DRIFT", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count", "TOPIC_COUNT_DRIFT", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture count", "CULTURE_COUNT_DRIFT", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => { o.entry.PUBLIC_BETA_ENTRY = "GO"; }));
  k("wave1 invited", "WAVE1_INVITED_EARLY", withJson(base, "rc", (o) => { o.wave1.invited = 10; }));
  k("entry go without targeted", "ENTRY_GO_WITHOUT_TARGETED_PASS", withJson(base, "rc", (o) => { o.entry.OWNER_QA_ENTRY = "GO"; }));
  k("resume r3 without targeted", "RESUME_R3_WITHOUT_TARGETED_PASS", withJson(base, "r312", (o) => { o.resumeFullR3 = true; }));
  k("issue closed without physical", "ISSUE_CLOSED_WITHOUT_PHYSICAL", mutate(base, "knownIssues", "**Status:** CODE_FIXED_PENDING_PHYSICAL", "**Status:** CLOSED"));
  k("product truth stale", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("android foundation skipped", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "gate:android-native-foundation", "gate:x-android"));
  k("en overlay second", "EN_OVERLAY_REMOVED", mutate(base, "instructionGloss", "Era o mesmo som duas vezes: má. O par mais difícil", "má overlay gone"));
  k("play go secrets", "PLAY_GO_SECRETS_ABSENT", withJson(base, "rc", (o) => { o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"; }));
  k("new apk not built", "NEW_APK_NOT_BUILT", withJson(postBuildBase(base), "r312", (o) => {
    o.artifact.status = "NOT_BUILT";
  }));
  k("gate typo", "R312_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-2-artifact-targeted-retest", "gate:rc2-3-13r3-1-2-artifact-targeted-retest-x"));
  k("report title", "R312_REPORT_MISSING", mutate(base, "report", "RC2.3.13R.3.1.2", "RC2.GONE"));
  k("quality build pending", "HOSTED_QUALITYBUILD_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), qualityBuild: "PENDING" };
  }));
  k("beta suites pending", "HOSTED_BETASUITES_PENDING", withJson(base, "r312", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "PENDING" };
  }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-1-2-artifact-targeted-retest after ${n} attempted kills`);
    return;
  }
  if (n < 70) {
    console.error(`FAIL need ≥70 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-1-2-artifact-targeted-retest — ${n} kills · stale=${STALE_APK_SHA256.slice(0, 12)}`);
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
