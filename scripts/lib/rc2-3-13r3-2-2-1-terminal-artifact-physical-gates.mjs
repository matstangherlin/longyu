/**
 * RC2.3.13R.3.2.2.1 — Terminal hosted closure + exact Device-QA artifact + physical honesty.
 *
 * Phases:
 *   HOSTED_PENDING — waiting exact-head green
 *   PRE_BUILD      — hosted PASS; artifact NOT_BUILT
 *   POST_BUILD     — Device-QA APK BUILT with provenance
 *   TARGETED       — physical + visual acceptance (owner evidence only)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const STALE_APK_SHA256 =
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af";
export const STALE_APK_SHA256_LEGACY =
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8";

export const EXPECTED_LEARNER_RUNTIME_SHA =
  "0357f82476d03bc8364efc66902b4640b4a155b9";
export const EXPECTED_FINGERPRINT = "29bb02ec0336";
export const PACKAGE_ID = "longyu.noba.com";
export const PARENT_PR = 352;

export function loadR3221Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    r322: read("docs/release/rc2-3-13r3-2-2-certification.json"),
    r3221: read("docs/release/rc2-3-13r3-2-2-1-certification.json"),
    report: read("docs/reports/rc2-3-13r3-2-2-1-terminal-artifact-physical.md"),
    handoff: read("docs/release/OWNER_R32_2_FINAL_VISUAL_CANDIDATE_HANDOFF.md"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    productTruth: read("docs/release/product-truth.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    journey: read("src/features/culture/CultureJourneyPage.tsx"),
    detail: read("src/features/culture/CultureTopicDetailPage.tsx"),
    bubble: read("src/components/progression/ProgressionNodeBubble.tsx"),
    pathComp: read("src/components/progression/ProgressionPath.tsx"),
    ornaments: read("src/components/progression/symbolicOrnaments.tsx"),
    css: read("src/index.css"),
    topicIcon: read("src/features/culture/CultureTopicIcon.tsx"),
    androidWorkflow: read(".github/workflows/android-build.yml"),
    securityWorkflow: read(".github/workflows/security.yml"),
    ciWorkflow: read(".github/workflows/ci.yml"),
  };
}

function j(src, key) {
  try {
    return JSON.parse(src[key] || "null");
  } catch {
    return null;
  }
}

function isPending(v) {
  return v === "PENDING" || v === "IN_PROGRESS" || v === "RUNNING" || v === "pending" || !v;
}

export function checkAll(src = loadR3221Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const r322 = j(src, "r322");
  const r3221 = j(src, "r3221");

  if (!/"gate:rc2-3-13r3-2-2-1-terminal-artifact-physical"/.test(src.packageJson)) {
    errors.push("R3221_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-2-2-final-visual-candidate"/.test(src.packageJson)) {
    errors.push("R322_GATE_MISSING");
  }
  if (!r3221) errors.push("R3221_CERT_MISSING");
  if (!src.report || !/RC2\.3\.13R\.3\.2\.2\.1/.test(src.report)) {
    errors.push("R3221_REPORT_MISSING");
  }
  if (!src.handoff || !/USE THIS APK|DEVICE_QA|STALE|fc72f9e3/i.test(src.handoff)) {
    errors.push("OWNER_HANDOFF_MISSING");
  }
  if (!rc) return ["RC_MISSING", ...errors];

  const phase = r3221?.phase ?? "HOSTED_PENDING";
  const hosted = r3221?.hosted ?? {};
  const artifact = r3221?.artifact ?? {};
  const targeted = r3221?.targetedPhysical ?? {};
  const visual = r3221?.visualAcceptance ?? {};
  const freeze = r3221?.visualFreeze ?? {};

  if (rc.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`).test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (r3221?.runtime?.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_DRIFT");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_DRIFT");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");

  if (rc.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) errors.push("LEARNER_RUNTIME_STALE");
  if (r3221?.runtime?.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }

  if (r3221?.parentPr !== PARENT_PR && r3221?.parentPr !== 352) {
    errors.push("WRONG_PARENT_PR");
  }
  if (r3221?.rejectedApkSha256 !== STALE_APK_SHA256) errors.push("STALE_HASH_REJECTION_MISSING");
  if (!Array.isArray(r3221?.rejectedApkSha256List) || !r3221.rejectedApkSha256List.includes(STALE_APK_SHA256)) {
    errors.push("STALE_HASH_REJECTION_MISSING");
  }

  const hostedKeys = [
    "releaseTruth",
    "security",
    "betaSuites",
    "qualityBuild",
    "androidFoundation",
    "androidRuntime",
    "chromium",
    "webkit",
    "firefox",
  ];

  if (phase === "HOSTED_PENDING") {
    if (hosted.overall === "PASS") errors.push("HOSTED_PASS_WHILE_PENDING");
    if (artifact?.status === "BUILT") errors.push("ARTIFACT_FROM_RED_OR_PENDING_HEAD");
  }

  if (phase === "PRE_BUILD" || phase === "POST_BUILD" || phase === "TARGETED") {
    for (const key of hostedKeys) {
      if (isPending(hosted[key])) errors.push(`HOSTED_${key.toUpperCase()}_PENDING`);
      if (hosted[key] === "FAIL" || hosted[key] === "FAILURE") errors.push(`HOSTED_${key.toUpperCase()}_FAILED`);
      if (hosted[key] === "SKIPPED") errors.push("BETA_SUITE_SKIPPED");
    }
    if (hosted.securityAnalysis === "SKIPPED" || hosted.securityAnalysis === "PENDING") {
      errors.push("CODEQL_ANALYSIS_SKIPPED");
    }
    if (hosted.parentEvidenceUsed === true) errors.push("PARENT_EVIDENCE_USED");
    if (hosted.headSha && r3221?.candidateHeadSha && hosted.headSha !== r3221.candidateHeadSha) {
      errors.push("STALE_HOSTED_EVIDENCE");
    }
  }

  if (phase === "PRE_BUILD") {
    if (artifact?.status === "BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
  }

  if (phase === "POST_BUILD" || phase === "TARGETED") {
    if (artifact?.status !== "BUILT") errors.push("NEW_APK_NOT_BUILT");
    if (!artifact?.apkSha256 || String(artifact.apkSha256).length < 64) errors.push("APK_HASH_ABSENT");
    if (artifact?.apkSha256 === STALE_APK_SHA256 || artifact?.apkSha256 === STALE_APK_SHA256_LEGACY) {
      errors.push("OLD_APK_REUSED");
    }
    if (artifact?.hashSource === "GITHUB_ZIP_DIGEST") errors.push("ZIP_DIGEST_AS_APK_HASH");
    if (!artifact?.artifactSourceSha) errors.push("ARTIFACT_SOURCE_ABSENT");
    if (artifact?.packageId && artifact.packageId !== PACKAGE_ID) errors.push("WRONG_PACKAGE_ID");
    if (!artifact?.versionName || !artifact?.versionCode) errors.push("WRONG_VERSION");
    if (!artifact?.workflowRunId || !artifact?.provenancePresent) errors.push("MISSING_PROVENANCE");
    if (artifact?.playReady === true || artifact?.labeledPlaySigned === true) {
      errors.push("DEBUG_LABELED_PLAY_SIGNED");
    }
    if (hosted.overall !== "PASS") errors.push("ARTIFACT_FROM_RED_OR_PENDING_HEAD");
    if (artifact?.fingerprint && artifact.fingerprint !== EXPECTED_FINGERPRINT) {
      errors.push("WRONG_FINGERPRINT_ON_CANDIDATE");
    }
    if (artifact?.learnerRuntimeSha && artifact.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
      errors.push("WRONG_LEARNER_RUNTIME_ON_CANDIDATE");
    }
    if (artifact?.channel && artifact.channel !== "DEVICE_QA") errors.push("WRONG_CHANNEL");
    if (!src.handoff.includes(String(artifact.apkSha256).slice(0, 12))) {
      errors.push("HANDOFF_MISSING_NEW_HASH");
    }
  }

  // Visual freeze contracts (no redesign)
  if (/Trocar de caminho/.test(src.journey)) errors.push("TROCAR_DE_CAMINHO_RESTORED");
  if (/ProgressionPath/.test(src.journey) && !/CultureTopicCard/.test(src.journey)) {
    errors.push("ROOT_BUBBLES_RESTORED");
  }
  {
    const journeyCode = String(src.journey ?? "")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
    if (/CulturePathPicker|PathChip|path-chip|data-culture-path-picker/i.test(journeyCode)) {
      errors.push("ROOT_PATH_CHIPS_RESTORED");
    }
  }
  if (!/return 0;/.test(src.bubble) || /Math\.sin\(/.test(src.bubble)) {
    errors.push("BUBBLE_AXIS_OFFSET");
  }
  if (!/data-progression-axis="stable"/.test(src.pathComp)) errors.push("CONNECTOR_AXIS_OFFSET");
  if (!/\blongyu-line\b/.test(src.topicIcon)) errors.push("TOPIC_ICON_ABSENT");
  if (!/SymbolicOrnamentRail/.test(src.ornaments) || !/SymbolicOrnamentRail/.test(src.pathComp)) {
    errors.push("ORNAMENTS_MISSING");
  }
  if (!/side: slots\.length % 2 === 0 \? "left" : "right"/.test(src.ornaments)) {
    errors.push("ORNAMENTS_NO_ALTERNATION");
  }
  if (!/aria-hidden/.test(src.ornaments)) errors.push("ORNAMENTS_A11Y_EXPOSED");
  if (!/pointer-events-none/.test(src.ornaments) || /tabIndex/.test(src.ornaments)) {
    errors.push("ORNAMENTS_FOCUSABLE");
  }
  if (!/motion-reduce:animate-none/.test(src.ornaments) || !/ornament-drift/.test(src.css)) {
    errors.push("REDUCED_MOTION_IGNORED");
  }
  if (!/density === "journey" \? 4 : 3/.test(src.ornaments)) {
    errors.push("JOURNEY_DENSITY_EXCESSIVE");
  }

  // Entry / freeze honesty
  if (rc.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if ((rc.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (r3221?.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if ((r3221?.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (r3221?.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && r3221?.play?.signedAab !== "BUILT") {
    errors.push("PLAY_GO_WITHOUT_SIGNED_AAB");
  }
  if (freeze?.status === "OWNER_ACCEPTED" && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("VISUAL_FREEZE_WITHOUT_OWNER_ACCEPTANCE");
  }
  if (r3221?.resumeFullR3 === true && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("RESUME_R3_WITHOUT_VISUAL_ACCEPTANCE");
  }
  if (r3221?.entry?.OWNER_QA_ENTRY === "GO" && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("ENTRY_GO_WITHOUT_VISUAL_ACCEPTANCE");
  }

  const tStatus = targeted?.status ?? "NOT_RUN";
  const vStatus = visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN";
  if (tStatus === "PASS") {
    if (!targeted?.artifactSha256) errors.push("PHYSICAL_PASS_WITHOUT_APK_SHA");
    if (!targeted?.evidence?.device) errors.push("PHYSICAL_PASS_WITHOUT_DEVICE");
    if (targeted?.evidence?.emulator === true) errors.push("PHYSICAL_PASS_FROM_EMULATOR");
    if ((targeted.audioX20Count ?? 0) < 20) errors.push("AUDIO_X20_BELOW_20");
    if (targeted?.PREVIOUS_R31_BLOCKERS === "NOT_RUN") errors.push("R31_BLOCKERS_NOT_TESTED");
  }
  if (vStatus === "PASS") {
    if (!visual?.artifactSha256) errors.push("VISUAL_ACCEPTANCE_WITHOUT_APK_SHA");
    if (visual?.emulator === true || visual?.source === "emulator") {
      errors.push("VISUAL_ACCEPTANCE_FROM_EMULATOR");
    }
    if (artifact?.apkSha256 && visual?.artifactSha256 && visual.artifactSha256 !== artifact.apkSha256) {
      errors.push("VISUAL_ACCEPTANCE_STALE_APK");
    }
    if (visual?.misalignedNodesObserved === true) errors.push("MISALIGNED_NODES_MARKED_PASS");
    if (visual?.ornamentOverlapObserved === true) errors.push("ORNAMENT_OVERLAP_MARKED_PASS");
    if (visual?.cultureNavBrokenObserved === true) errors.push("CULTURE_NAV_BROKEN_MARKED_PASS");
  }
  if ((tStatus === "PASS" || vStatus === "PASS") && phase === "HOSTED_PENDING") {
    errors.push("PHYSICAL_PASS_AUTO_CREATED");
  }
  if (targeted?.canonicalSkipObserved === true && tStatus === "PASS") {
    errors.push("CANONICAL_SKIP_MARKED_PASS");
  }
  if (targeted?.personalizedSpeechIncomplete === true && tStatus === "PASS") {
    errors.push("INCOMPLETE_SPEECH_MARKED_PASS");
  }
  if (targeted?.hanziBlockerObserved === true && tStatus === "PASS") {
    errors.push("HANZI_BLOCKER_MARKED_PASS");
  }
  if (freeze?.status === "OWNER_ACCEPTED" && artifact?.apkSha256 && freeze?.apkSha256 && freeze.apkSha256 !== artifact.apkSha256) {
    errors.push("ARTIFACT_CHANGED_AFTER_ACCEPTANCE");
  }

  if (!src.productTruth || !/"lessons":\s*134/.test(src.productTruth)) {
    errors.push("PRODUCT_TRUTH_STALE");
  }
  if (!/gate:android-native-foundation/.test(src.androidWorkflow)) {
    errors.push("ANDROID_FOUNDATION_SKIPPED");
  }
  if (r322 && r322.rejectedApkSha256 !== STALE_APK_SHA256) {
    errors.push("R322_STALE_REJECTION_DRIFT");
  }

  return [...new Set(errors)];
}
