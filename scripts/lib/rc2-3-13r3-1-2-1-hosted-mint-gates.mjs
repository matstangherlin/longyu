/**
 * RC2.3.13R.3.1.2.1 — Typecheck closure + exact-head hosted mint honesty.
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

/** Same-kind visual-repeat commit — dead-helper cleanup does not move learner runtime. */
export const EXPECTED_LEARNER_RUNTIME_SHA =
  "b6fe91536daf3a8bdebde66f92ec50a03155fb4b";

/** Current runtime fingerprint after R.3.1.2.1 CURRICULUM_SOURCE cleanup. */
export const EXPECTED_FINGERPRINT = "29bb02ec0336";

/** Historical RC1/RC2 artifact records must keep the pre-R.3.1.2 bulk value. */
export const HISTORICAL_ARTIFACT_FINGERPRINT = "57a848ef9ef9";

export const PACKAGE_ID = "longyu.noba.com";

export function loadR3121Sources() {
  return {
    rc: read("docs/release/final-pre-beta-rc.json"),
    r312: read("docs/release/rc2-3-13r3-1-2-certification.json"),
    r3121: read("docs/release/rc2-3-13r3-1-2-1-certification.json"),
    report: read("docs/reports/rc2-3-13r3-1-2-1-hosted-mint.md"),
    handoff: read("docs/release/OWNER_R31_2_1_CANDIDATE_HANDOFF.md"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    lessonTasks: read("src/features/lesson/lessonTasks.ts"),
    tsconfig: read("tsconfig.json"),
    tsconfigApp: read("tsconfig.app.json"),
    audioPlayback: read("src/lib/audioPlayback.ts"),
    audioPolicy: read("src/lib/audio/audioEnginePolicy.ts"),
    personalizedUtterance: read("src/lib/audio/personalizedUtterance.ts"),
    personalize: read("src/lib/personalize.ts"),
    hanziBuilder: read("src/components/hanzi/HanziBuilderExercise.tsx"),
    dualShaRc1: read("docs/release/rc-dual-sha-rc1.json"),
    dualShaRc2: read("docs/release/rc-dual-sha.json"),
    ownerRc1: read("docs/release/OWNER_RC1_DEVICE_TEST.md"),
    ownerRc2: read("docs/release/OWNER_RC2_DEVICE_TEST.md"),
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

function isPending(v) {
  return v === "PENDING" || v === "IN_PROGRESS" || v === "RUNNING" || v === "pending" || !v;
}

export function checkAll(src = loadR3121Sources()) {
  const errors = [];
  const rc = j(src, "rc");
  const r312 = j(src, "r312");
  const r3121 = j(src, "r3121");

  if (!/"gate:rc2-3-13r3-1-2-1-hosted-mint"/.test(src.packageJson)) {
    errors.push("R3121_GATE_MISSING");
  }
  if (!/"gate:rc2-3-13r3-1-2-artifact-targeted-retest"/.test(src.packageJson)) {
    errors.push("R312_GATE_MISSING");
  }
  if (!r3121) errors.push("R3121_CERT_MISSING");
  if (!src.report || !/RC2\.3\.13R\.3\.1\.2\.1/.test(src.report)) {
    errors.push("R3121_REPORT_MISSING");
  }
  if (!src.handoff || !/USE THIS APK|NOT_BUILT|STALE|fb835ce8/i.test(src.handoff)) {
    errors.push("OWNER_HANDOFF_MISSING");
  }
  if (!rc) return ["RC_MISSING", ...errors];

  const phase = r3121?.phase ?? "HOSTED_PENDING";
  const hosted = r3121?.hosted ?? {};
  const artifact = r3121?.artifact ?? {};
  const targeted = r3121?.targetedPhysical ?? {};
  const rootCause = r3121?.rootCause ?? {};

  // Current runtime fingerprint
  if (rc.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${EXPECTED_FINGERPRINT}"`).test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (r3121?.fingerprint !== EXPECTED_FINGERPRINT) errors.push("FINGERPRINT_DRIFT");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_DRIFT");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_DRIFT");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_DRIFT");

  // Learner runtime: dead-code cleanup must not invent a new generation
  if (rc.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (r3121?.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }
  if (r312?.learnerRuntimeSha && r312.learnerRuntimeSha !== EXPECTED_LEARNER_RUNTIME_SHA) {
    errors.push("LEARNER_RUNTIME_STALE");
  }

  // TS6133 / unused visual-selection state must stay gone
  if (/\bselectedImageConceptIds\b/.test(src.lessonTasks)) {
    errors.push("TS6133_RESTORED");
  }
  if (/"noUnusedLocals"\s*:\s*false/.test(src.tsconfig)) {
    errors.push("NO_UNUSED_LOCALS_DISABLED");
  }
  if (rootCause?.resolution !== "REMOVED_DEAD_HELPER" && rootCause?.resolution !== "WIRED_INTO_SAME_KIND") {
    errors.push("ROOT_CAUSE_UNRESOLVED");
  }
  if (r3121?.typecheckSkipped === true) errors.push("TYPECHECK_SKIPPED");

  // Historical artifact truth must not be overwritten by current runtime FP
  const dual1 = j(src, "dualShaRc1");
  const dual2 = j(src, "dualShaRc2");
  if (dual1?.fingerprint === EXPECTED_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (dual2?.fingerprint === EXPECTED_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (dual1 && dual1.fingerprint !== HISTORICAL_ARTIFACT_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (dual2 && dual2.fingerprint !== HISTORICAL_ARTIFACT_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (src.ownerRc1.includes(EXPECTED_FINGERPRINT)) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (src.ownerRc2.includes(EXPECTED_FINGERPRINT)) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }
  if (r3121?.historicalTruth?.rc1Fingerprint === EXPECTED_FINGERPRINT) {
    errors.push("HISTORICAL_FINGERPRINT_OVERWRITTEN");
  }

  // Stale hash rejection
  if (r3121?.rejectedApkSha256 !== STALE_APK_SHA256) errors.push("STALE_HASH_REJECTION_MISSING");
  if (artifact?.apkSha256 === STALE_APK_SHA256 && artifact?.status === "BUILT") {
    errors.push("OLD_APK_REUSED");
  }
  if (rc.ownerQaApk?.sha256 === STALE_APK_SHA256 && rc.ownerQaApk?.status === "BUILT") {
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
    if (hosted.securityAnalysis === "SKIPPED") errors.push("CODEQL_ANALYSIS_SKIPPED");
    if (hosted.releaseTruth === "SKIPPED") errors.push("RELEASE_TRUTH_BYPASSED");
    if (hosted.headSha && r3121?.candidateHeadSha && hosted.headSha !== r3121.candidateHeadSha) {
      errors.push("STALE_HOSTED_EVIDENCE");
    }
  }

  if (phase === "PRE_BUILD") {
    if (artifact?.status === "BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
    if (artifact?.status && artifact.status !== "NOT_BUILT") errors.push("ARTIFACT_BUILT_BEFORE_MINT");
  }

  if (phase === "POST_BUILD" || phase === "TARGETED") {
    if (artifact?.status !== "BUILT") errors.push("NEW_APK_NOT_BUILT");
    if (!artifact?.apkSha256 || String(artifact.apkSha256).length < 64) errors.push("APK_HASH_ABSENT");
    if (artifact?.apkSha256 === STALE_APK_SHA256) errors.push("OLD_APK_REUSED");
    if (!artifact?.artifactSourceSha) errors.push("ARTIFACT_SOURCE_ABSENT");
    if (artifact?.packageId && artifact.packageId !== PACKAGE_ID) errors.push("WRONG_PACKAGE_ID");
    if (!artifact?.versionName || !artifact?.versionCode) errors.push("WRONG_VERSION");
    if (!artifact?.workflowRunId || !artifact?.provenancePresent) errors.push("MISSING_PROVENANCE");
    if (artifact?.playReady === true || artifact?.labeledPlaySigned === true) {
      errors.push("DEBUG_LABELED_PLAY_SIGNED");
    }
    if (hosted.overall !== "PASS") errors.push("ARTIFACT_FROM_RED_OR_PENDING_HEAD");
    if (artifact?.fingerprint && artifact.fingerprint !== EXPECTED_FINGERPRINT) {
      errors.push("OLD_FINGERPRINT_ON_CURRENT_CANDIDATE");
    }
    if (!src.handoff.includes(String(artifact.apkSha256).slice(0, 12))) {
      errors.push("HANDOFF_MISSING_NEW_HASH");
    }
  }

  // Learning integrity preservation — same-kind guard inside violatesImageRepeat
  const violateFn = code(src.lessonTasks).match(/function violatesImageRepeat[\s\S]{0,500}/)?.[0] ?? "";
  if (!/function violatesImageRepeat/.test(src.lessonTasks)) errors.push("COMPARE_WITH_IMAGE_REGRESSION");
  if (!/item\.step\.kind === candidate\.step\.kind/.test(violateFn)) {
    errors.push("COMPARE_WITH_IMAGE_REGRESSION");
  }
  if (/!candidate\.generated[\s\S]{0,80}return false/.test(violateFn)) {
    errors.push("COMPARE_WITH_IMAGE_REGRESSION");
  }
  if (!/\brepairNameOnlyAnswerLeak\b/.test(code(src.personalize))) errors.push("NAME_LEAK_REGRESSION");
  if (!/from ["']\.\/audio\/personalizedUtterance["']/.test(src.audioPlayback)) {
    errors.push("PERSONAL_AUDIO_FIXED");
  }
  if (/from ["']\.\/personalize["']/.test(src.audioPlayback)) errors.push("PERSONAL_AUDIO_FIXED");
  const policy = code(src.audioPolicy);
  const personalIdx = policy.indexOf('includes("PERSONAL")');
  const lessonIdx = policy.indexOf('includes("LESSON")');
  if (personalIdx < 0 || (lessonIdx >= 0 && personalIdx > lessonIdx)) {
    errors.push("PERSONAL_AUDIO_FIXED");
  }
  if (!/42svh/.test(src.hanziBuilder) || !/\bshortViewport\b/.test(code(src.hanziBuilder))) {
    errors.push("HANZI_COMPACT_REMOVED");
  }

  // Entry / wave
  if (rc.entry?.PUBLIC_BETA_ENTRY === "GO") errors.push("PUBLIC_BETA_GO");
  if ((rc.wave1?.invited ?? 0) > 0) errors.push("WAVE1_INVITED_EARLY");
  if (rc.entry?.OWNER_QA_ENTRY === "GO" && targeted?.status !== "PASS") {
    errors.push("ENTRY_GO_WITHOUT_TARGETED_PASS");
  }
  if (r3121?.resumeFullR3 === true && (targeted?.status ?? "NOT_RUN") !== "PASS") {
    errors.push("RESUME_R3_WITHOUT_TARGETED_PASS");
  }

  const tStatus = targeted?.status ?? "NOT_RUN";
  if (tStatus === "PASS") {
    if (!targeted?.artifactSha256) errors.push("TARGETED_PASS_WITHOUT_APK_SHA");
    if (!targeted?.evidence?.device) errors.push("TARGETED_PASS_WITHOUT_EVIDENCE");
    if ((targeted.audioX20Count ?? 0) < 20) errors.push("AUDIO_X20_BELOW_20");
  }
  if (tStatus === "PASS" && phase === "HOSTED_PENDING") {
    errors.push("PHYSICAL_PASS_AUTO_CREATED");
  }
  if (r3121?.targetedPhysical?.status === "PASS" && !r3121?.targetedPhysical?.evidence) {
    errors.push("PHYSICAL_PASS_AUTO_CREATED");
  }

  if (!src.productTruth || !/"lessons":\s*134/.test(src.productTruth)) {
    errors.push("PRODUCT_TRUTH_STALE");
  }
  if (!/gate:android-native-foundation/.test(src.androidWorkflow)) {
    errors.push("ANDROID_FOUNDATION_SKIPPED");
  }

  return [...new Set(errors)];
}
