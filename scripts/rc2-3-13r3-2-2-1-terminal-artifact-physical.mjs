#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.2.1 — terminal artifact + physical honesty gate (≥70 kills).
 */
import {
  checkAll,
  loadR3221Sources,
  STALE_APK_SHA256,
  STALE_APK_SHA256_LEGACY,
  EXPECTED_LEARNER_RUNTIME_SHA,
  EXPECTED_FINGERPRINT,
} from "./lib/rc2-3-13r3-2-2-1-terminal-artifact-physical-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-2-2-1-terminal-artifact-physical");
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
    parentEvidenceUsed: false,
  };
}

function postBuildBase(base, apkHash = "a".repeat(64)) {
  let next = withJson(base, "r3221", (o) => {
    o.phase = "POST_BUILD";
    o.hosted = hostedPass(o);
    o.artifact = {
      status: "BUILT",
      apkSha256: apkHash,
      hashSource: "APK_BYTES",
      artifactSourceSha: o.candidateHeadSha || EXPECTED_LEARNER_RUNTIME_SHA,
      learnerRuntimeSha: EXPECTED_LEARNER_RUNTIME_SHA,
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
    next = {
      ...next,
      handoff: `${next.handoff}\n\nUSE THIS APK\nSHA256: ${apkHash}\nDO NOT USE:\n${STALE_APK_SHA256}\n`,
    };
  }
  return next;
}

function targetedPass(base, overrides = {}) {
  return withJson(postBuildBase(base), "r3221", (o) => {
    o.phase = "TARGETED";
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: "a".repeat(64),
      evidence: { device: "owner", emulator: false },
      audioX20Count: 20,
      PREVIOUS_R31_BLOCKERS: "PASS",
      ...overrides,
    };
  });
}

function visualPass(base, overrides = {}) {
  return withJson(targetedPass(base), "r3221", (o) => {
    o.visualAcceptance = {
      FINAL_VISUAL_OWNER_ACCEPTANCE: "PASS",
      artifactSha256: "a".repeat(64),
      emulator: false,
      ...overrides,
    };
  });
}

function test() {
  const base = loadR3221Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("gate missing", "R3221_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-2-2-1-terminal-artifact-physical", "gate:gone"));
  k("r322 gate missing", "R322_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-2-2-final-visual-candidate", "gate:r322-gone"));
  k("cert missing", "R3221_CERT_MISSING", { ...base, r3221: "" });
  k("report missing", "R3221_REPORT_MISSING", { ...base, report: "" });
  k("handoff missing", "OWNER_HANDOFF_MISSING", { ...base, handoff: "" });

  // Hosted 1-10
  k("beta pending", "HOSTED_BETASUITES_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "PENDING" };
  }));
  k("beta skipped", "BETA_SUITE_SKIPPED", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "SKIPPED" };
  }));
  k("security pending", "HOSTED_SECURITY_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), security: "PENDING" };
  }));
  k("codeql skipped", "CODEQL_ANALYSIS_SKIPPED", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityAnalysis: "SKIPPED" };
  }));
  k("android pending", "HOSTED_ANDROIDFOUNDATION_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidFoundation: "PENDING" };
  }));
  k("chromium pending", "HOSTED_CHROMIUM_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), chromium: "PENDING" };
  }));
  k("webkit pending", "HOSTED_WEBKIT_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), webkit: "PENDING" };
  }));
  k("firefox pending", "HOSTED_FIREFOX_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), firefox: "PENDING" };
  }));
  k("stale hosted sha", "STALE_HOSTED_EVIDENCE", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), headSha: "d".repeat(40) };
    o.candidateHeadSha = "e".repeat(40);
  }));
  k("parent evidence", "PARENT_EVIDENCE_USED", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), parentEvidenceUsed: true };
  }));

  // Artifact 11-20
  k("stale 348", "OLD_APK_REUSED", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256;
  }));
  k("legacy stale", "OLD_APK_REUSED", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256_LEGACY;
  }));
  k("hash absent", "APK_HASH_ABSENT", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.apkSha256 = null;
  }));
  k("source null", "ARTIFACT_SOURCE_ABSENT", withJson(postBuildBase(base), "r3221", (o) => {
    delete o.artifact.artifactSourceSha;
  }));
  k("wrong version", "WRONG_VERSION", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.versionCode = null;
  }));
  k("wrong package", "WRONG_PACKAGE_ID", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.packageId = "com.wrong";
  }));
  k("wrong fingerprint", "WRONG_FINGERPRINT_ON_CANDIDATE", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.fingerprint = "deadbeef0001";
  }));
  k("wrong runtime", "WRONG_LEARNER_RUNTIME_ON_CANDIDATE", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.learnerRuntimeSha = "b".repeat(40);
  }));
  k("zip digest", "ZIP_DIGEST_AS_APK_HASH", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.hashSource = "GITHUB_ZIP_DIGEST";
  }));
  k("debug as play", "DEBUG_LABELED_PLAY_SIGNED", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.labeledPlaySigned = true;
  }));

  // Visual 21-30
  k("root bubbles", "ROOT_BUBBLES_RESTORED", mutate(
    mutate(base, "journey", "CultureTopicCard", "MissingTopicCard"),
    "journey",
    "culture-topic-catalog",
    "culture-topic-catalog\n<ProgressionPath />",
  ));
  k("root chips", "ROOT_PATH_CHIPS_RESTORED", mutate(base, "journey", "culture-topic-catalog", 'culture-topic-catalog\n<div data-culture-path-picker="true"/>'));
  k("trocar", "TROCAR_DE_CAMINHO_RESTORED", mutate(base, "journey", "culture-topic-catalog", "Trocar de caminho\nculture-topic-catalog"));
  k("axis offset", "BUBBLE_AXIS_OFFSET", mutate(base, "bubble", "return 0;", "return Math.sin(1);"));
  k("connector", "CONNECTOR_AXIS_OFFSET", mutate(base, "pathComp", 'data-progression-axis="stable"', 'data-progression-axis="wobble"'));
  k("ornament alt", "ORNAMENTS_NO_ALTERNATION", mutate(base, "ornaments", 'side: slots.length % 2 === 0 ? "left" : "right"', 'side: "left"'));
  k("ornament focus", "ORNAMENTS_FOCUSABLE", mutate(base, "ornaments", "pointer-events-none", "pointer-events-auto"));
  k("ornament a11y", "ORNAMENTS_A11Y_EXPOSED", mutate(base, "ornaments", "aria-hidden", "aria-label"));
  k("reduced motion", "REDUCED_MOTION_IGNORED", mutate(base, "ornaments", "motion-reduce:animate-none", "motion-reduce:animate-spin"));
  k("journey density", "JOURNEY_DENSITY_EXCESSIVE", mutate(base, "ornaments", 'density === "journey" ? 4 : 3', 'density === "journey" ? 1 : 3'));

  // Physical 31-40+
  k("visual no device", "VISUAL_ACCEPTANCE_FROM_EMULATOR", visualPass(base, { emulator: true }));
  k("visual no hash", "VISUAL_ACCEPTANCE_WITHOUT_APK_SHA", visualPass(base, { artifactSha256: null }));
  k("visual stale apk", "VISUAL_ACCEPTANCE_STALE_APK", visualPass(base, { artifactSha256: "c".repeat(64) }));
  k("audio below 20", "AUDIO_X20_BELOW_20", targetedPass(base, { audioX20Count: 5 }));
  k("skip marked pass", "CANONICAL_SKIP_MARKED_PASS", targetedPass(base, { canonicalSkipObserved: true }));
  k("speech clipped", "INCOMPLETE_SPEECH_MARKED_PASS", targetedPass(base, { personalizedSpeechIncomplete: true }));
  k("hanzi blocker", "HANZI_BLOCKER_MARKED_PASS", targetedPass(base, { hanziBlockerObserved: true }));
  k("misaligned pass", "MISALIGNED_NODES_MARKED_PASS", visualPass(base, { misalignedNodesObserved: true }));
  k("culture nav pass", "CULTURE_NAV_BROKEN_MARKED_PASS", visualPass(base, { cultureNavBrokenObserved: true }));
  k("artifact after accept", "ARTIFACT_CHANGED_AFTER_ACCEPTANCE", withJson(visualPass(base), "r3221", (o) => {
    o.visualFreeze = { status: "OWNER_ACCEPTED", apkSha256: "d".repeat(64) };
  }));

  k("physical no apk", "PHYSICAL_PASS_WITHOUT_APK_SHA", targetedPass(base, { artifactSha256: null }));
  k("physical emulator", "PHYSICAL_PASS_FROM_EMULATOR", targetedPass(base, { evidence: { device: "emu", emulator: true } }));
  k("r31 not tested", "R31_BLOCKERS_NOT_TESTED", targetedPass(base, { PREVIOUS_R31_BLOCKERS: "NOT_RUN" }));
  k("hosted pass pending", "HOSTED_PASS_WHILE_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "HOSTED_PENDING";
    o.hosted.overall = "PASS";
  }));
  k("artifact pending", "ARTIFACT_FROM_RED_OR_PENDING_HEAD", withJson(base, "r3221", (o) => {
    o.phase = "HOSTED_PENDING";
    o.artifact.status = "BUILT";
    o.artifact.apkSha256 = "a".repeat(64);
  }));
  k("new apk not built", "NEW_APK_NOT_BUILT", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.status = "NOT_BUILT";
  }));
  k("missing provenance", "MISSING_PROVENANCE", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.workflowRunId = null;
    o.artifact.provenancePresent = false;
  }));
  k("wrong channel", "WRONG_CHANNEL", withJson(postBuildBase(base), "r3221", (o) => {
    o.artifact.channel = "PLAY";
  }));
  k("stale rejection", "STALE_HASH_REJECTION_MISSING", withJson(base, "r3221", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
    o.rejectedApkSha256List = ["0".repeat(64)];
  }));
  k("public beta", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => {
    o.entry.PUBLIC_BETA_ENTRY = "GO";
  }));
  k("wave1 early", "WAVE1_INVITED_EARLY", withJson(base, "rc", (o) => {
    o.wave1.invited = 10;
  }));
  k("play go", "PLAY_GO_WITHOUT_SIGNED_AAB", withJson(base, "r3221", (o) => {
    o.entry.PLAY_CLOSED_BETA_ENTRY = "GO";
  }));
  k("freeze without accept", "VISUAL_FREEZE_WITHOUT_OWNER_ACCEPTANCE", withJson(base, "r3221", (o) => {
    o.visualFreeze = { status: "OWNER_ACCEPTED" };
  }));
  k("resume without", "RESUME_R3_WITHOUT_VISUAL_ACCEPTANCE", withJson(base, "r3221", (o) => {
    o.resumeFullR3 = true;
  }));
  k("entry go", "ENTRY_GO_WITHOUT_VISUAL_ACCEPTANCE", withJson(base, "r3221", (o) => {
    o.entry.OWNER_QA_ENTRY = "GO";
  }));
  k("fingerprint", "FINGERPRINT_DRIFT", mutate(
    base,
    "curriculumFreeze",
    `RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`,
    'RC_BASE_FINGERPRINT = "deadbeef0001"',
  ));
  k("learner stale", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "b6fe91536daf3a8bdebde66f92ec50a03155fb4b";
  }));
  k("lesson drift", "LESSON_COUNT_DRIFT", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("product truth", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("android skipped", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "gate:android-native-foundation", "gate:x"));
  k("quality pending", "HOSTED_QUALITYBUILD_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), qualityBuild: "PENDING" };
  }));
  k("android runtime pending", "HOSTED_ANDROIDRUNTIME_PENDING", withJson(base, "r3221", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidRuntime: "PENDING" };
  }));
  k("physical auto", "PHYSICAL_PASS_AUTO_CREATED", withJson(base, "r3221", (o) => {
    o.phase = "HOSTED_PENDING";
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: "a".repeat(64),
      evidence: { device: "x" },
      audioX20Count: 20,
      PREVIOUS_R31_BLOCKERS: "PASS",
    };
  }));
  k("ornament overlap", "ORNAMENT_OVERLAP_MARKED_PASS", visualPass(base, { ornamentOverlapObserved: true }));
  k("handoff missing hash", "HANDOFF_MISSING_NEW_HASH", (() => {
    const pb = postBuildBase(base, "f".repeat(64));
    return { ...pb, handoff: `USE THIS APK\nDO NOT USE:\n${STALE_APK_SHA256}` };
  })());
  k("topic icon", "TOPIC_ICON_ABSENT", mutate(base, "topicIcon", "longyu-line", "generic-icon"));
  k("ornaments missing", "ORNAMENTS_MISSING", mutate(base, "ornaments", "SymbolicOrnamentRail", "SymbolicGone"));
  k("wrong parent", "WRONG_PARENT_PR", withJson(base, "r3221", (o) => {
    o.parentPr = 999;
  }));
  k("physical no device", "PHYSICAL_PASS_WITHOUT_DEVICE", targetedPass(base, { evidence: null }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-2-2-1-terminal-artifact-physical after ${n} attempted kills`);
    return;
  }
  if (n < 70) {
    console.error(`FAIL need ≥70 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-2-1-terminal-artifact-physical (${n} kills)`);
}

const cmd = process.argv[2] || "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`Unknown command: ${cmd}`);
  process.exitCode = 1;
}
