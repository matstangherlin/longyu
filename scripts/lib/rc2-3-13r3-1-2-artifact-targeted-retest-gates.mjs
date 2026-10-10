/**
 * RC2.3.13R.3.1.2 — Hosted finalization + artifact mint + targeted physical honesty.
 *
 * Phases:
 *   HOSTED_PENDING — waiting exact-head green (no APK mint)
 *   PRE_BUILD      — hosted PASS recorded; artifact NOT_BUILT
 *   POST_BUILD     — new Owner QA APK BUILT with provenance
 *   TARGETED       — physical checks (PASS only with owner evidence)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const STALE_APK_SHA256 =
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8";

/** Last R.3.1.1 commit that touches learner runtime modules (audio helper + EN overlays). */
export const EXPECTED_LEARNER_RUNTIME_SHA =
  "719ce024b6f65ae2905d5659cfcddcdcdc13bbcd";

export const EXPECTED_FINGERPRINT = "cc66373bb602";
export const PACKAGE_ID = "longyu.noba.com";

export function loadR312Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    cert: read("docs/release/final-pre-beta-certification.json"),
    evidence: read("docs/release/final-pre-beta-device-evidence.json"),
    r31: read("docs/release/rc2-3-13r3-1-learning-integrity.json"),
    r311: read("docs/release/rc2-3-13r3-1-1-hosted-candidate-rebuild.json"),
    r312: read("docs/release/rc2-3-13r3-1-2-certification.json"),
    report: read("docs/reports/rc2-3-13r3-1-2-artifact-targeted-retest.md"),
    handoff: read("docs/release/OWNER_R31_1_HOSTED_CANDIDATE_HANDOFF.md"),
    knownIssues: read("docs/release/KNOWN_ISSUES_FINAL_PRE_BETA.md"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    audioPlayback: read("src/lib/audioPlayback.ts"),
    audioPolicy: read("src/lib/audio/audioEnginePolicy.ts"),
    personalizedUtterance: read("src/lib/audio/personalizedUtterance.ts"),
    personalize: read("src/lib/personalize.ts"),
    hanziBuilder: read("src/components/hanzi/HanziBuilderExercise.tsx"),
    lessonTasks: read("src/features/lesson/lessonTasks.ts"),
    steps: read("src/features/lesson/steps.tsx"),
    instructionGloss: read("src/i18n/overlays/instructionGloss.en.json"),
    productTruth: read("docs/release/product-truth.json"),
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

function code(src) {
  return String(src ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function isPass(v) {
  return v === "PASS" || v === "success" || v === true;
}

function isPending(v) {
  return v === "PENDING" || v === "IN_PROGRESS" || v === "RUNNING" || v === "pending" || !v;
}

export function resolveLearnerRuntimeSha() {
  // Real SHA of R.3.1.1 runtime commit — filled from package/cert when present.
  const rc = j({ rc: read("docs/release/final-pre-beta-rc.json") }, "rc");
  const r312 = j({ r312: read("docs/release/rc2-3-13r3-1-2-certification.json") }, "r312");
  return r312?.learnerRuntimeSha || rc?.learnerRuntimeSha || null;
}

export function checkAll(src = loadR312Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const cert = j(src, "cert");
  const ev = j(src, "evidence");
  const r31 = j(src, "r31");
  const r311 = j(src, "r311");
  const r312 = j(src, "r312");

  if (!/"gate:rc2-3-13r3-1-2-artifact-targeted-retest"/.test(src.packageJson)) {
    errors.push("R312_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-1-1-hosted-candidate-rebuild"/.test(src.packageJson)) {
    errors.push("R311_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-1-learning-integrity"/.test(src.packageJson)) {
    errors.push("R31_GATE_MISSING");
  }
  if (!r312) errors.push("R312_CERT_MISSING");
  if (!src.report || !/RC2\.3\.13R\.3\.1\.2/.test(src.report)) errors.push("R312_REPORT_MISSING");
  if (!src.handoff || !/USE THIS APK|NOT_BUILT|STALE|fb835ce8/i.test(src.handoff)) {
    errors.push("OWNER_HANDOFF_MISSING");
  }
  if (!rc) return ["RC_MISSING", ...errors];

  const phase = r312?.phase ?? "HOSTED_PENDING";
  const hosted = r312?.hosted ?? {};
  const artifact = r312?.artifact ?? {};
  const targeted = r312?.targetedPhysical ?? {};

  // Fingerprint / counts
  if (rc.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`).test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_DRIFT");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_DRIFT");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");
  if (r31?.counts?.lessons !== 134) errors.push("LESSON_COUNT_DRIFT");
  if (r31?.canonicalActivitiesInvalid !== 0) errors.push("CANONICAL_ACTIVITY_INVALID");

  // Learner runtime must advance to R.3.1.1 runtime module SHA (not pre-R.3.1)
  if (rc.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (r312?.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (r312?.learnerRuntimeSha && rc.learnerRuntimeSha !== r312.learnerRuntimeSha) {
    errors.push("LEARNER_RUNTIME_MISMATCH");
  }

  // Stale hash rejection
  if (r312?.rejectedApkSha256 !== STALE_APK_SHA256) errors.push("STALE_HASH_REJECTION_MISSING");
  if (artifact?.apkSha256 === STALE_APK_SHA256 && artifact?.status === "BUILT") {
    errors.push("STALE_HASH_MARKED_CURRENT");
  }
  if (rc.ownerQaApk?.sha256 === STALE_APK_SHA256 && rc.ownerQaApk?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
  }

  // Hosted honesty by phase
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
    // May not claim full hosted PASS
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
    if (hosted.securityAnalysis === "SKIPPED") errors.push("CODEQL_ANALYSIS_SKIPPED");
    if (hosted.headSha && r312?.parentHeadSha && hosted.headSha !== r312.parentHeadSha) {
      errors.push("STALE_HOSTED_EVIDENCE");
    }
  }

  if (phase === "PRE_BUILD") {
    if (artifact?.status === "BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
    if (artifact?.status !== "NOT_BUILT" && artifact?.status !== undefined) {
      // allow NOT_BUILT only
      if (artifact.status !== "NOT_BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
    }
  }

  if (phase === "POST_BUILD" || phase === "TARGETED") {
    if (artifact?.status !== "BUILT") errors.push("NEW_APK_NOT_BUILT");
    if (!artifact?.apkSha256 || String(artifact.apkSha256).length < 64) errors.push("APK_HASH_ABSENT");
    if (artifact?.apkSha256 === STALE_APK_SHA256) errors.push("OLD_APK_REUSED");
    if (!artifact?.artifactSourceSha) errors.push("ARTIFACT_SOURCE_ABSENT");
    if (artifact?.packageId && artifact.packageId !== PACKAGE_ID) errors.push("WRONG_PACKAGE_ID");
    if (!artifact?.versionName) errors.push("WRONG_VERSION");
    if (!artifact?.versionCode || !(artifact.versionCode > 0)) errors.push("WRONG_VERSION");
    if (!artifact?.workflowRunId) errors.push("MISSING_PROVENANCE");
    if (!artifact?.provenancePresent) errors.push("MISSING_PROVENANCE");
    if (artifact?.playReady === true || artifact?.labeledPlaySigned === true) {
      errors.push("DEBUG_LABELED_PLAY_SIGNED");
    }
    if (hosted.overall !== "PASS") errors.push("ARTIFACT_FROM_RED_OR_PENDING_HEAD");
    if (!src.handoff.includes(String(artifact.apkSha256).slice(0, 12))) {
      errors.push("HANDOFF_MISSING_NEW_HASH");
    }
    if (/fb835ce8/.test(src.handoff) === false) errors.push("HANDOFF_MISSING_STALE_REJECT");
  }

  // Entry / wave
  if (rc.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if (rc.entry?.OWNER_QA_ENTRY === "GO" && targeted?.status !== "PASS") {
    errors.push("ENTRY_GO_WITHOUT_TARGETED_PASS");
  }
  if ((rc.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (rc.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && rc.playClosedBeta?.status === "BLOCKED_SIGNING_SECRETS") {
    errors.push("PLAY_GO_SECRETS_ABSENT");
  }

  // Targeted physical honesty
  const tStatus = targeted?.status ?? "NOT_RUN";
  if (tStatus === "PASS") {
    if (!targeted?.artifactSha256) errors.push("TARGETED_PASS_WITHOUT_APK_SHA");
    if (targeted.artifactSha256 === STALE_APK_SHA256) errors.push("STALE_ARTIFACT_PHYSICALLY_ACCEPTED");
    if (!targeted?.evidence || !targeted.evidence.device) errors.push("TARGETED_PASS_WITHOUT_EVIDENCE");
    if ((targeted.audioX20Count ?? 0) < 20) errors.push("AUDIO_X20_BELOW_20");
    if (targeted.audioPassMeans === "BUTTON_ONLY") errors.push("AUDIO_BUTTON_ONLY_PASS");
    const checks = targeted.checks ?? {};
    for (const [k, v] of Object.entries(checks)) {
      if (v !== "PASS") errors.push(`TARGETED_CHECK_${k.toUpperCase()}_NOT_PASS`);
    }
    if (checks.personalizedUtterance === "PASS" && targeted.wojiaoPrefixHeard === false) {
      errors.push("WOJIAO_PREFIX_UNHEARD");
    }
    if (checks.personalizedUtterance === "PASS" && targeted.learnerNameHeard === false) {
      errors.push("NAME_UNHEARD");
    }
    if (checks.canonicalSkip === "PASS" && targeted.skippedExerciseObserved === true) {
      errors.push("SKIP_OBSERVED_BUT_PASS");
    }
    if (checks.hanziMobileFit === "PASS" && targeted.hanziLayoutBlocked === true) {
      errors.push("HANZI_BLOCKED_BUT_PASS");
    }
    if (checks.distractorFairness === "PASS" && targeted.distractorObvious === true) {
      errors.push("DISTRACTOR_OBVIOUS_BUT_PASS");
    }
    if (checks.visualVariety === "PASS" && targeted.visualRepetitionSystematic === true) {
      errors.push("VISUAL_REPETITION_BUT_PASS");
    }
  }

  if (r312?.resumeFullR3 === true && tStatus !== "PASS") {
    errors.push("RESUME_R3_WITHOUT_TARGETED_PASS");
  }

  // Learning integrity preservation
  if (!/from ["']\.\/audio\/personalizedUtterance["']/.test(src.audioPlayback)) {
    errors.push("AUDIO_STORE_CYCLE_RESTORED");
  }
  if (/from ["']\.\/personalize["']/.test(src.audioPlayback)) {
    errors.push("AUDIO_STORE_CYCLE_RESTORED");
  }
  if (!/\bisPersonalizedUtterance\b/.test(code(src.personalizedUtterance))) {
    errors.push("PURE_HELPER_MISSING");
  }
  const policy = code(src.audioPolicy);
  const personalIdx = policy.indexOf('includes("PERSONAL")');
  const lessonIdx = policy.indexOf('includes("LESSON")');
  if (personalIdx < 0) errors.push("PERSONAL_AUDIO_FIXED");
  if (personalIdx > lessonIdx && lessonIdx >= 0) errors.push("PERSONAL_AFTER_LESSON");
  if (!/\bPERSONAL_UTTERANCE\b/.test(code(src.audioPlayback))) errors.push("PERSONAL_AUDIO_FIXED");
  if (!/\brepairNameOnlyAnswerLeak\b/.test(code(src.personalize))) errors.push("DISTRACTOR_LEAK_RESTORED");
  if (!/\bpersonalizeChoiceList\b/.test(code(src.personalize))) errors.push("DISTRACTOR_LEAK_RESTORED");
  if (/if\s*\(\s*!validation\.valid\s*\)\s*return\s+null/.test(code(src.steps))) {
    errors.push("SKIP_FALLBACK_HIDDEN");
  }
  if (!/42svh/.test(src.hanziBuilder) || !/\bshortViewport\b/.test(code(src.hanziBuilder))) {
    errors.push("HANZI_COMPACT_REMOVED");
  }
  if (/!candidate\.generated[\s\S]{0,80}return false/.test(
    code(src.lessonTasks).match(/function violatesImageRepeat[\s\S]{0,400}/)?.[0] ?? "",
  )) {
    errors.push("VISUAL_AUTHOR_EXEMPT_RESTORED");
  }
  if (!src.instructionGloss.includes("火 é fogo. Quando aparece como peça")) {
    errors.push("EN_OVERLAY_REMOVED");
  }
  if (!src.instructionGloss.includes("Era o mesmo som duas vezes: má. O par mais difícil")) {
    errors.push("EN_OVERLAY_REMOVED");
  }

  // Product truth
  if (!src.productTruth || !/"lessons":\s*134/.test(src.productTruth)) {
    errors.push("PRODUCT_TRUTH_STALE");
  }

  // Known issues must not CLOSED without physical
  if (/R31-CANONICAL-EXERCISE-SKIP[\s\S]{0,400}\*\*Status:\*\*\s+CLOSED/.test(src.knownIssues)) {
    errors.push("ISSUE_CLOSED_WITHOUT_PHYSICAL");
  }

  // Workflow bypasses
  const continueOnErrorTrue = ["continue-on-error:", " true"].join("");
  if (src.androidWorkflow.includes(continueOnErrorTrue) && /Contratos Android|gate:android-native-foundation/.test(src.androidWorkflow)) {
    const idx = src.androidWorkflow.indexOf(continueOnErrorTrue);
    const near = src.androidWorkflow.slice(Math.max(0, idx - 80), idx + 240);
    if (/Contratos Android|gate:android-native-foundation/.test(near)) errors.push("ANDROID_GATE_BYPASS");
  }
  if (!/gate:android-native-foundation/.test(src.androidWorkflow)) errors.push("ANDROID_FOUNDATION_SKIPPED");

  return [...new Set(errors)];
}
