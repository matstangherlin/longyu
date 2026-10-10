/**
 * RC2.3.13R.3.2.2 — Final visual candidate hosted closure + Device-QA mint honesty.
 *
 * Phases:
 *   HOSTED_PENDING — waiting exact-head green (no APK mint)
 *   PRE_BUILD      — hosted PASS recorded; artifact NOT_BUILT
 *   POST_BUILD     — new DEVICE_QA APK BUILT with provenance
 *   TARGETED       — physical + visual acceptance (PASS only with owner evidence)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

/** #348 DEVICE_QA APK — predates Culture topic hierarchy + visual polish. */
export const STALE_APK_SHA256 =
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af";

/** Older pre-R.3.1 Owner QA hash — also rejected for current runtime. */
export const STALE_APK_SHA256_LEGACY =
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8";

/** R.3.2.2.1 Journey/Culture runtime harden (null SRS, instructionLocale gate, persist merge). */
export const EXPECTED_LEARNER_RUNTIME_SHA =
  "0357f82476d03bc8364efc66902b4640b4a155b9";

export const EXPECTED_FINGERPRINT = "29bb02ec0336";
export const PACKAGE_ID = "longyu.noba.com";
export const EXPECTED_PARENT_HEAD =
  "c47bc5b0e2f84dd990faa510afc34bed5628ca47";

export const EXPECTED_COUNTS = Object.freeze({
  lessons: 134,
  topics: 113,
  cultureItems: 36,
  culturePaths: 12,
  cultureNative: 36,
  journeyCultureNodes: 20,
  flagshipDeep: 11,
});

export function loadR322Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    r321: read("docs/release/rc2-3-13r3-2-1-certification.json"),
    r322: read("docs/release/rc2-3-13r3-2-2-certification.json"),
    r32: read("docs/release/rc2-3-13r3-2-certification.json"),
    report: read("docs/reports/rc2-3-13r3-2-2-final-visual-candidate.md"),
    handoff: read("docs/release/OWNER_R32_2_FINAL_VISUAL_CANDIDATE_HANDOFF.md"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    productTruth: read("docs/release/product-truth.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    topicGroups: read("src/data/cultureTopicGroups.ts"),
    journey: read("src/features/culture/CultureJourneyPage.tsx"),
    detail: read("src/features/culture/CultureTopicDetailPage.tsx"),
    topicCard: read("src/features/culture/CultureTopicCard.tsx"),
    topicIcon: read("src/features/culture/CultureTopicIcon.tsx"),
    bubble: read("src/components/progression/ProgressionNodeBubble.tsx"),
    path: read("src/components/progression/ProgressionPath.tsx"),
    ornaments: read("src/components/progression/symbolicOrnaments.tsx"),
    css: read("src/index.css"),
    smartBack: read("src/lib/navigation/smartBack.ts"),
    learnerSurfaces: read("docs/release/learner-surfaces.json"),
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

export function checkAll(src = loadR322Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const r322 = j(src, "r322");
  const r321 = j(src, "r321");

  if (!/"gate:rc2-3-13r3-2-2-final-visual-candidate"/.test(src.packageJson)) {
    errors.push("R322_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression"/.test(src.packageJson)) {
    errors.push("R321_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-2-culture-topic-hierarchy"/.test(src.packageJson)) {
    errors.push("R32_GATE_MISSING");
  }
  if (!/"validate:culture-topic-hierarchy"/.test(src.packageJson)) {
    errors.push("CULTURE_HIERARCHY_SCRIPT_MISSING");
  }
  if (!/"validate:progression-visual-alignment"/.test(src.packageJson)) {
    errors.push("VISUAL_ALIGNMENT_SCRIPT_MISSING");
  }
  if (!/"validate:symbolic-ornament-system"/.test(src.packageJson)) {
    errors.push("ORNAMENT_SCRIPT_MISSING");
  }
  if (!/"validate:topic-card-polish"/.test(src.packageJson)) {
    errors.push("TOPIC_CARD_SCRIPT_MISSING");
  }

  if (!r322) errors.push("R322_CERT_MISSING");
  if (!src.report || !/RC2\.3\.13R\.3\.2\.2/.test(src.report)) {
    errors.push("R322_REPORT_MISSING");
  }
  if (!src.handoff || !/USE THIS APK|DEVICE_QA|STALE|fc72f9e3/i.test(src.handoff)) {
    errors.push("OWNER_HANDOFF_MISSING");
  }
  if (!rc) return ["RC_MISSING", ...errors];

  const phase = r322?.phase ?? "HOSTED_PENDING";
  const hosted = r322?.hosted ?? {};
  const artifact = r322?.artifact ?? {};
  const targeted = r322?.targetedPhysical ?? {};
  const visual = r322?.visualAcceptance ?? {};

  // Fingerprint / counts
  if (rc.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`).test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (r322?.runtime?.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_DRIFT");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_DRIFT");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");

  // Learner runtime must stay on R.3.2.1 visual polish SHA unless a new runtime fix lands
  if (rc.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (r322?.runtime?.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  // Parent R.3.2.1 cert keeps its historical learnerRuntimeSha (824a55de); do not rewrite.

  // Stale hash rejection
  if (r322?.rejectedApkSha256 !== STALE_APK_SHA256) errors.push("STALE_HASH_REJECTION_MISSING");
  if (!Array.isArray(r322?.rejectedApkSha256List) || !r322.rejectedApkSha256List.includes(STALE_APK_SHA256)) {
    errors.push("STALE_HASH_REJECTION_MISSING");
  }
  if (artifact?.apkSha256 === STALE_APK_SHA256 && artifact?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
  }
  if (artifact?.apkSha256 === STALE_APK_SHA256_LEGACY && artifact?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
  }
  if (rc.ownerQaApk?.sha256 === STALE_APK_SHA256 && rc.ownerQaApk?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
  }
  if (rc.ownerQaApk?.sha256 === STALE_APK_SHA256_LEGACY && rc.ownerQaApk?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
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
    if (hosted.securityBuild === "FAIL") errors.push("CODEQL_BUILD_FAILED");
    if (hosted.securityAnalysis === "SKIPPED" || hosted.securityAnalysis === "PENDING") {
      errors.push("CODEQL_ANALYSIS_SKIPPED");
    }
    if (hosted.releaseTruth === "SKIPPED") errors.push("RELEASE_TRUTH_BYPASSED");
    if (hosted.headSha && r322?.candidateHeadSha && hosted.headSha !== r322.candidateHeadSha) {
      errors.push("STALE_HOSTED_EVIDENCE");
    }
    if (hosted.parentEvidenceUsed === true) errors.push("PARENT_EVIDENCE_USED");
  }

  if (phase === "PRE_BUILD") {
    if (artifact?.status === "BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
    if (artifact?.status && artifact.status !== "NOT_BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
  }

  if (phase === "POST_BUILD" || phase === "TARGETED") {
    if (artifact?.status !== "BUILT") errors.push("NEW_APK_NOT_BUILT");
    if (!artifact?.apkSha256 || String(artifact.apkSha256).length < 64) errors.push("APK_HASH_ABSENT");
    if (artifact?.apkSha256 === STALE_APK_SHA256 || artifact?.apkSha256 === STALE_APK_SHA256_LEGACY) {
      errors.push("OLD_APK_REUSED");
    }
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

  // Culture hierarchy contracts
  if (!/\bexport const CULTURE_TOPIC_GROUPS\b/.test(src.topicGroups)) errors.push("TOPIC_MAPPING_BROKEN");
  if (!/\bassertCultureTopicHierarchy\b/.test(src.topicGroups)) errors.push("TOPIC_MAPPING_BROKEN");
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
  if (!/CultureTopicCard/.test(src.journey)) errors.push("TOPIC_CARD_REMOVED");
  if (!/progression\.exploreByTopic|culture-topic-catalog/.test(src.journey)) {
    errors.push("CULTURE_ROOT_CONTRACT_BROKEN");
  }
  if (!/ProgressionPath/.test(src.detail)) errors.push("TOPIC_DETAIL_BUBBLES_MISSING");
  if (!/\/cultura\/topico\/:topicId/.test(src.smartBack)) errors.push("BACK_ROUTE_BROKEN");
  if (!/cultura\/topico\/:topicId/.test(src.learnerSurfaces)) errors.push("LEARNER_SURFACE_MISSING");

  // Visual polish contracts
  if (!/return 0;/.test(src.bubble) || /Math\.sin\(/.test(src.bubble)) {
    errors.push("BUBBLE_AXIS_OFFSET");
  }
  if (!/data-progression-axis="stable"/.test(src.path)) errors.push("CONNECTOR_AXIS_OFFSET");
  if (!/\blongyu-line\b/.test(src.topicIcon)) errors.push("TOPIC_ICON_ABSENT");
  if (!/\bTopicIconDaily\b/.test(src.topicIcon) || !/\bTopicIconRelations\b/.test(src.topicIcon) || !/\bTopicIconFood\b/.test(src.topicIcon)) {
    errors.push("INCONSISTENT_ICON_FAMILY");
  }
  if (!/\bexport function SymbolicOrnamentRail\b|\bfunction SymbolicOrnamentRail\b|\bSymbolicOrnamentRail\s*=/.test(src.ornaments)) {
    errors.push("ORNAMENTS_MISSING");
  }
  if (!/SymbolicOrnamentRail/.test(src.path)) errors.push("ORNAMENTS_MISSING");
  if (!/side: slots\.length % 2 === 0 \? "left" : "right"/.test(src.ornaments)) {
    errors.push("ORNAMENTS_NO_ALTERNATION");
  }
  if (!/aria-hidden/.test(src.ornaments)) errors.push("ORNAMENTS_A11Y_EXPOSED");
  if (!/pointer-events-none/.test(src.ornaments)) errors.push("ORNAMENTS_FOCUSABLE");
  if (/<button/.test(src.ornaments) || /tabIndex/.test(src.ornaments)) {
    errors.push("ORNAMENTS_FOCUSABLE");
  }
  if (!/motion-reduce:animate-none/.test(src.ornaments)) errors.push("REDUCED_MOTION_IGNORED");
  if (!/ornament-drift/.test(src.css)) errors.push("REDUCED_MOTION_IGNORED");

  // Entry / wave honesty
  if (rc.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if ((rc.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (r322?.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if ((r322?.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (rc.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && r322?.operations?.playSignedAab !== "BUILT") {
    errors.push("PLAY_GO_WITHOUT_SIGNED_AAB");
  }
  if (r322?.entry?.OWNER_QA_ENTRY === "GO" && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("ENTRY_GO_WITHOUT_VISUAL_ACCEPTANCE");
  }
  if (r322?.visualFreeze?.status === "OWNER_ACCEPTED" && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("VISUAL_FREEZE_WITHOUT_OWNER_ACCEPTANCE");
  }
  if (r322?.resumeFullR3 === true && (visual?.FINAL_VISUAL_OWNER_ACCEPTANCE ?? "NOT_RUN") !== "PASS") {
    errors.push("RESUME_R3_WITHOUT_VISUAL_ACCEPTANCE");
  }

  // Physical honesty
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
    if (visual?.source === "emulator" || visual?.emulator === true) {
      errors.push("VISUAL_ACCEPTANCE_FROM_EMULATOR");
    }
    if (artifact?.apkSha256 && visual?.artifactSha256 && visual.artifactSha256 !== artifact.apkSha256) {
      errors.push("VISUAL_FREEZE_ON_DIFFERENT_APK");
    }
    for (const key of [
      "CULTURE_ROOT_VISUAL",
      "TOPIC_DETAIL_VISUAL",
      "PROGRESSION_ALIGNMENT_PHYSICAL",
      "ORNAMENTS_PHYSICAL",
      "JOURNEY_VISUAL_PHYSICAL",
    ]) {
      if (visual?.[key] === "FAIL") errors.push("VISUAL_PHYSICAL_FAIL_MARKED_PASS");
      if (visual?.[key] === "NOT_RUN") errors.push("VISUAL_CHECKS_INCOMPLETE");
    }
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
  if (visual?.misalignedNodesObserved === true && vStatus === "PASS") {
    errors.push("MISALIGNED_NODES_MARKED_PASS");
  }
  if (visual?.ornamentOverlapObserved === true && vStatus === "PASS") {
    errors.push("ORNAMENT_OVERLAP_MARKED_PASS");
  }

  if (!src.productTruth || !/"lessons":\s*134/.test(src.productTruth)) {
    errors.push("PRODUCT_TRUTH_STALE");
  }
  if (!/gate:android-native-foundation/.test(src.androidWorkflow)) {
    errors.push("ANDROID_FOUNDATION_SKIPPED");
  }
  if (!/gate:rc2-3-13r3-2-2-final-visual-candidate/.test(src.gateRegistry) && src.gateRegistry) {
    // registry may lag until generate; only fail when registry exists and omits after generate
    if (/"gate:rc2-3-13r3-2-1-visual-polish-symbolic-progression"/.test(src.gateRegistry)) {
      errors.push("GATE_REGISTRY_STALE");
    }
  }

  return [...new Set(errors)];
}
