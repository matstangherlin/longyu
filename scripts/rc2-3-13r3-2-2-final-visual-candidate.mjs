#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.2 — final visual candidate gate (≥80 meaningful mutation kills).
 */
import {
  checkAll,
  loadR322Sources,
  STALE_APK_SHA256,
  STALE_APK_SHA256_LEGACY,
  EXPECTED_LEARNER_RUNTIME_SHA,
  EXPECTED_FINGERPRINT,
} from "./lib/rc2-3-13r3-2-2-final-visual-candidate-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-2-2-final-visual-candidate");
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
  let next = withJson(base, "r322", (o) => {
    o.phase = "POST_BUILD";
    o.hosted = hostedPass(o);
    o.artifact = {
      status: "BUILT",
      apkSha256: apkHash,
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
  const pb = postBuildBase(base);
  return withJson(pb, "r322", (o) => {
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
  const pb = targetedPass(base);
  return withJson(pb, "r322", (o) => {
    o.visualAcceptance = {
      FINAL_VISUAL_OWNER_ACCEPTANCE: "PASS",
      artifactSha256: "a".repeat(64),
      CULTURE_ROOT_VISUAL: "PASS",
      TOPIC_DETAIL_VISUAL: "PASS",
      PROGRESSION_ALIGNMENT_PHYSICAL: "PASS",
      ORNAMENTS_PHYSICAL: "PASS",
      JOURNEY_VISUAL_PHYSICAL: "PASS",
      emulator: false,
      ...overrides,
    };
  });
}

function test() {
  const base = loadR322Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // Gate / docs presence
  k("gate missing", "R322_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-2-2-final-visual-candidate", "gate:gone"));
  k("r321 gate missing", "R321_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression", "gate:r321-gone"));
  k("r32 gate missing", "R32_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-2-culture-topic-hierarchy", "gate:r32-gone"));
  k("hierarchy script missing", "CULTURE_HIERARCHY_SCRIPT_MISSING", mutate(base, "packageJson", "validate:culture-topic-hierarchy", "validate:cth-gone"));
  k("alignment script missing", "VISUAL_ALIGNMENT_SCRIPT_MISSING", mutate(base, "packageJson", "validate:progression-visual-alignment", "validate:pva-gone"));
  k("ornament script missing", "ORNAMENT_SCRIPT_MISSING", mutate(base, "packageJson", "validate:symbolic-ornament-system", "validate:sos-gone"));
  k("topic card script missing", "TOPIC_CARD_SCRIPT_MISSING", mutate(base, "packageJson", "validate:topic-card-polish", "validate:tcp-gone"));
  k("cert missing", "R322_CERT_MISSING", { ...base, r322: "" });
  k("report missing", "R322_REPORT_MISSING", { ...base, report: "" });
  k("handoff missing", "OWNER_HANDOFF_MISSING", { ...base, handoff: "" });

  // Hosted mutations (1-10 family)
  k("release truth pending", "HOSTED_RELEASETRUTH_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), releaseTruth: "PENDING" };
  }));
  k("security pending", "HOSTED_SECURITY_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), security: "PENDING" };
  }));
  k("codeql analysis skipped", "CODEQL_ANALYSIS_SKIPPED", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityAnalysis: "SKIPPED" };
  }));
  k("android pending", "HOSTED_ANDROIDFOUNDATION_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidFoundation: "PENDING" };
  }));
  k("beta suite skipped", "BETA_SUITE_SKIPPED", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), betaSuites: "SKIPPED" };
  }));
  k("chromium pending", "HOSTED_CHROMIUM_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), chromium: "PENDING" };
  }));
  k("webkit pending", "HOSTED_WEBKIT_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), webkit: "PENDING" };
  }));
  k("firefox pending", "HOSTED_FIREFOX_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), firefox: "PENDING" };
  }));
  k("stale hosted evidence", "STALE_HOSTED_EVIDENCE", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), headSha: "d".repeat(40) };
    o.candidateHeadSha = "e".repeat(40);
  }));
  k("parent evidence used", "PARENT_EVIDENCE_USED", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), parentEvidenceUsed: true };
  }));

  // Artifact mutations (11-20)
  k("old apk reused #348", "OLD_APK_REUSED", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256;
  }));
  k("legacy apk reused", "OLD_APK_REUSED", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.apkSha256 = STALE_APK_SHA256_LEGACY;
  }));
  k("apk hash absent", "APK_HASH_ABSENT", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.apkSha256 = null;
  }));
  k("artifact source absent", "ARTIFACT_SOURCE_ABSENT", withJson(postBuildBase(base), "r322", (o) => {
    delete o.artifact.artifactSourceSha;
  }));
  k("wrong fingerprint", "WRONG_FINGERPRINT_ON_CANDIDATE", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.fingerprint = "deadbeef0001";
  }));
  k("wrong learner runtime", "WRONG_LEARNER_RUNTIME_ON_CANDIDATE", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.learnerRuntimeSha = "b".repeat(40);
  }));
  k("debug labeled play", "DEBUG_LABELED_PLAY_SIGNED", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.labeledPlaySigned = true;
  }));
  k("artifact from red", "ARTIFACT_FROM_RED_OR_PENDING_HEAD", withJson(postBuildBase(base), "r322", (o) => {
    o.hosted.overall = "PENDING";
  }));
  k("wrong package", "WRONG_PACKAGE_ID", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.packageId = "com.wrong.app";
  }));
  k("wrong version", "WRONG_VERSION", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.versionCode = null;
  }));

  // Culture mutations (21-30)
  k("root path chips", "ROOT_PATH_CHIPS_RESTORED", mutate(base, "journey", "culture-topic-catalog", 'culture-topic-catalog\n<div data-culture-path-picker="true" />'));
  k("root bubbles", "ROOT_BUBBLES_RESTORED", mutate(
    mutate(base, "journey", "CultureTopicCard", "MissingTopicCard"),
    "journey",
    "culture-topic-catalog",
    "culture-topic-catalog\nimport { ProgressionPath } from '../../components/progression/ProgressionPath';\n<ProgressionPath />",
  ));
  k("trocar restored", "TROCAR_DE_CAMINHO_RESTORED", mutate(base, "journey", "culture-topic-catalog", "Trocar de caminho\nculture-topic-catalog"));
  k("topic card removed", "TOPIC_CARD_REMOVED", mutate(base, "journey", "CultureTopicCard", "MissingTopicCard"));
  k("topic mapping broken", "TOPIC_MAPPING_BROKEN", mutate(base, "topicGroups", "export const CULTURE_TOPIC_GROUPS", "export const CULTURE_TOPIC_GROUPS_GONE"));
  k("assert hierarchy gone", "TOPIC_MAPPING_BROKEN", mutate(base, "topicGroups", "assertCultureTopicHierarchy", "assertGone"));
  k("back route broken", "BACK_ROUTE_BROKEN", mutate(base, "smartBack", "/cultura/topico/:topicId", "/cultura/broken/:topicId"));
  k("learner surface missing", "LEARNER_SURFACE_MISSING", mutate(base, "learnerSurfaces", "cultura/topico/:topicId", "cultura/gone/:topicId"));
  k("detail bubbles missing", "TOPIC_DETAIL_BUBBLES_MISSING", mutate(base, "detail", "ProgressionPath", "ProgressionGone"));
  k("culture root contract", "CULTURE_ROOT_CONTRACT_BROKEN", mutate(
    mutate(base, "journey", "progression.exploreByTopic", "progression.explorePaths"),
    "journey",
    "culture-topic-catalog",
    "culture-path-catalog",
  ));

  // Visual mutations (31-46)
  k("bubble axis offset", "BUBBLE_AXIS_OFFSET", mutate(base, "bubble", "return 0;", "return Math.sin(1) * 12;"));
  k("connector axis", "CONNECTOR_AXIS_OFFSET", mutate(base, "path", 'data-progression-axis="stable"', 'data-progression-axis="wobble"'));
  k("ornaments no alternation", "ORNAMENTS_NO_ALTERNATION", mutate(
    base,
    "ornaments",
    'side: slots.length % 2 === 0 ? "left" : "right"',
    'side: "left"',
  ));
  k("ornaments a11y exposed", "ORNAMENTS_A11Y_EXPOSED", mutate(base, "ornaments", "aria-hidden", "aria-label"));
  k("ornaments focusable", "ORNAMENTS_FOCUSABLE", mutate(base, "ornaments", "pointer-events-none", "pointer-events-auto"));
  k("reduced motion ignored", "REDUCED_MOTION_IGNORED", mutate(base, "ornaments", "motion-reduce:animate-none", "motion-reduce:animate-spin"));
  k("topic icon absent", "TOPIC_ICON_ABSENT", mutate(base, "topicIcon", "longyu-line", "generic-icon"));
  k("inconsistent icon family", "INCONSISTENT_ICON_FAMILY", mutate(base, "topicIcon", "TopicIconDaily", "TopicIconRoutine"));
  k("ornaments missing", "ORNAMENTS_MISSING", mutate(base, "ornaments", "SymbolicOrnamentRail", "SymbolicGone"));
  k("ornaments button", "ORNAMENTS_FOCUSABLE", mutate(base, "ornaments", "pointer-events-none", 'pointer-events-none">\n<button tabIndex={0}'));
  k("css reduced motion", "REDUCED_MOTION_IGNORED", mutate(base, "css", "ornament-drift", "ornament-gone"));
  k("wrong channel", "WRONG_CHANNEL", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.channel = "PLAY_CLOSED";
  }));
  k("missing provenance", "MISSING_PROVENANCE", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.workflowRunId = null;
    o.artifact.provenancePresent = false;
  }));
  k("new apk not built", "NEW_APK_NOT_BUILT", withJson(postBuildBase(base), "r322", (o) => {
    o.artifact.status = "NOT_BUILT";
  }));
  k("stale rejection missing", "STALE_HASH_REJECTION_MISSING", withJson(base, "r322", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
    o.rejectedApkSha256List = ["0".repeat(64)];
  }));
  k("hosted pass while pending", "HOSTED_PASS_WHILE_PENDING", withJson(base, "r322", (o) => {
    o.phase = "HOSTED_PENDING";
    o.hosted.overall = "PASS";
  }));

  // Physical honesty (47-56+)
  k("physical without apk sha", "PHYSICAL_PASS_WITHOUT_APK_SHA", targetedPass(base, { artifactSha256: null }));
  k("physical from emulator", "PHYSICAL_PASS_FROM_EMULATOR", targetedPass(base, { evidence: { device: "emu", emulator: true } }));
  k("r31 blockers not tested", "R31_BLOCKERS_NOT_TESTED", targetedPass(base, { PREVIOUS_R31_BLOCKERS: "NOT_RUN" }));
  k("audio x20 below 20", "AUDIO_X20_BELOW_20", targetedPass(base, { audioX20Count: 5 }));
  k("canonical skip marked pass", "CANONICAL_SKIP_MARKED_PASS", targetedPass(base, { canonicalSkipObserved: true }));
  k("incomplete speech marked pass", "INCOMPLETE_SPEECH_MARKED_PASS", targetedPass(base, { personalizedSpeechIncomplete: true }));
  k("misaligned nodes marked pass", "MISALIGNED_NODES_MARKED_PASS", visualPass(base, { misalignedNodesObserved: true }));
  k("ornament overlap marked pass", "ORNAMENT_OVERLAP_MARKED_PASS", visualPass(base, { ornamentOverlapObserved: true }));
  k("visual freeze different apk", "VISUAL_FREEZE_ON_DIFFERENT_APK", visualPass(base, { artifactSha256: "c".repeat(64) }));
  k("visual acceptance emulator", "VISUAL_ACCEPTANCE_FROM_EMULATOR", visualPass(base, { emulator: true }));
  k("visual without apk", "VISUAL_ACCEPTANCE_WITHOUT_APK_SHA", visualPass(base, { artifactSha256: null }));
  k("visual checks incomplete", "VISUAL_CHECKS_INCOMPLETE", visualPass(base, { CULTURE_ROOT_VISUAL: "NOT_RUN" }));
  k("physical auto created", "PHYSICAL_PASS_AUTO_CREATED", withJson(base, "r322", (o) => {
    o.phase = "HOSTED_PENDING";
    o.targetedPhysical = {
      status: "PASS",
      artifactSha256: "a".repeat(64),
      evidence: { device: "x" },
      audioX20Count: 20,
      PREVIOUS_R31_BLOCKERS: "PASS",
    };
  }));
  k("freeze without acceptance", "VISUAL_FREEZE_WITHOUT_OWNER_ACCEPTANCE", withJson(base, "r322", (o) => {
    o.visualFreeze = { status: "OWNER_ACCEPTED" };
  }));
  k("resume without visual", "RESUME_R3_WITHOUT_VISUAL_ACCEPTANCE", withJson(base, "r322", (o) => {
    o.resumeFullR3 = true;
  }));
  k("entry go without visual", "ENTRY_GO_WITHOUT_VISUAL_ACCEPTANCE", withJson(base, "r322", (o) => {
    o.entry.OWNER_QA_ENTRY = "GO";
  }));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => {
    o.entry.PUBLIC_BETA_ENTRY = "GO";
  }));
  k("wave1 early", "WAVE1_INVITED_EARLY", withJson(base, "rc", (o) => {
    o.wave1.invited = 10;
  }));
  k("play go without aab", "PLAY_GO_WITHOUT_SIGNED_AAB", withJson(base, "rc", (o) => {
    o.entry.PLAY_CLOSED_BETA_ENTRY = "GO";
  }));
  k("fingerprint drift", "FINGERPRINT_DRIFT", mutate(
    base,
    "curriculumFreeze",
    `RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`,
    'RC_BASE_FINGERPRINT = "deadbeef0001"',
  ));
  k("learner runtime stale", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "824a55deb79898b3ee6c0f60d66dc762333828a4";
  }));
  k("lesson count drift", "LESSON_COUNT_DRIFT", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count drift", "TOPIC_COUNT_DRIFT", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture count drift", "CULTURE_COUNT_DRIFT", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("product truth stale", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("android foundation skipped", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "gate:android-native-foundation", "gate:x-android"));
  k("quality pending", "HOSTED_QUALITYBUILD_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), qualityBuild: "PENDING" };
  }));
  k("android runtime pending", "HOSTED_ANDROIDRUNTIME_PENDING", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), androidRuntime: "PENDING" };
  }));
  k("codeql build failed", "CODEQL_BUILD_FAILED", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), securityBuild: "FAIL" };
  }));
  k("release truth bypassed", "RELEASE_TRUTH_BYPASSED", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = { ...hostedPass(o), releaseTruth: "SKIPPED" };
  }));
  k("artifact built before mint", "ARTIFACT_BUILT_BEFORE_MINT", withJson(base, "r322", (o) => {
    o.phase = "PRE_BUILD";
    o.hosted = hostedPass(o);
    o.artifact.status = "BUILT";
    o.artifact.apkSha256 = "a".repeat(64);
  }));
  k("handoff missing new hash", "HANDOFF_MISSING_NEW_HASH", (() => {
    const pb = postBuildBase(base, "f".repeat(64));
    return { ...pb, handoff: "USE THIS APK\nDO NOT USE:\n" + STALE_APK_SHA256 };
  })());
  k("physical without device", "PHYSICAL_PASS_WITHOUT_DEVICE", targetedPass(base, { evidence: null }));
  k("rc apk marked built stale", "OLD_APK_REUSED", withJson(base, "rc", (o) => {
    o.ownerQaApk.status = "BUILT";
    o.ownerQaApk.sha256 = STALE_APK_SHA256;
  }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-2-2-final-visual-candidate after ${n} attempted kills`);
    return;
  }
  if (n < 80) {
    console.error(`FAIL need ≥80 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-2-final-visual-candidate (${n} kills)`);
}

const cmd = process.argv[2] || "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`Unknown command: ${cmd}`);
  process.exitCode = 1;
}
