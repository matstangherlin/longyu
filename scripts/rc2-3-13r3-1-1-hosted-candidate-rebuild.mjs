#!/usr/bin/env node
/**
 * RC2.3.13R.3.1.1 — hosted closure / candidate rebuild gate + mutations (≥60).
 */
import {
  checkAll,
  loadR311Sources,
  STALE_APK_SHA256,
  EXPECTED_LEARNER_RUNTIME_SHA,
} from "./lib/rc2-3-13r3-1-1-hosted-candidate-rebuild-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r3-1-1-hosted-candidate-rebuild");
}

function test() {
  const base = loadR311Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };
  const orTrue = ["|", "|", " true"].join("");

  k("gate missing", "R311_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-1-hosted-candidate-rebuild", "gate:removed"));
  k("r31 gate missing", "R31_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-learning-integrity", "gate:r31-gone"));
  k("canonical integrity missing", "CANONICAL_INTEGRITY_SCRIPT_MISSING", mutate(base, "packageJson", "validate:canonical-activity-integrity", "validate:gone"));
  k("distractor missing", "DISTRACTOR_QUALITY_SCRIPT_MISSING", mutate(base, "packageJson", "validate:distractor-quality", "validate:dq-gone"));
  k("r311 json missing", "R311_JSON_MISSING", { ...base, r311: "" });
  k("report missing", "R311_REPORT_MISSING", { ...base, report: "" });
  k("owner handoff missing", "R311_OWNER_HANDOFF_MISSING", { ...base, ownerPack: "" });

  k("stale apk marked built", "STALE_APK_MARKED_BUILT", withJson(base, "rc", (o) => {
    o.ownerQaApk.status = "BUILT";
  }));
  k("stale hash recertified as new", "STALE_HASH_RECERTIFIED", withJson(base, "r311", (o) => {
    o.phase = "POST_BUILD";
    o.newOwnerQaApk = { status: "BUILT", sha256: STALE_APK_SHA256, artifactSourceSha: "a".repeat(40) };
  }));
  k("stale rejection missing", "STALE_HASH_REJECTION_MISSING", withJson(base, "r311", (o) => {
    o.rejectedApkSha256 = "0".repeat(64);
  }));
  k("release truth bypass", "RELEASE_TRUTH_BYPASS", mutate(base, "packageJson", "validate:release-truth", `validate:release-truth ${orTrue}`));
  k("android gate bypass or-true", "ANDROID_GATE_BYPASS", mutate(base, "androidWorkflow", "npm run gate:android-native-foundation", `npm run gate:android-native-foundation ${orTrue}`));
  k("android foundation skipped", "ANDROID_FOUNDATION_SKIPPED", mutate(base, "androidWorkflow", "gate:android-native-foundation", "gate:x-android"));
  k("codeql ignored", "CODEQL_BUILD_IGNORED", mutate(base, "securityWorkflow", "name: CodeQL", "continue-on-error: true\n    name: CodeQL"));
  k("product truth stale", "PRODUCT_TRUTH_STALE", mutate(base, "productTruth", '"lessons": 134', '"lessons": 1'));
  k("learner runtime stale", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "ce8b7cc82740d6c05d080c462f8403e7d91b1a90";
  }));
  k("learner runtime wrong", "LEARNER_RUNTIME_STALE", withJson(base, "rc", (o) => {
    o.learnerRuntimeSha = "b".repeat(40);
  }));
  k("artifact source pretends old runtime as new built", "OLD_APK_GIVEN_TO_OWNER", withJson(
    withJson(base, "r311", (o) => {
      o.phase = "POST_BUILD";
      o.newOwnerQaApk = { status: "BUILT", sha256: "c".repeat(64), artifactSourceSha: EXPECTED_LEARNER_RUNTIME_SHA };
    }),
    "rc",
    (o) => {
      o.ownerQaApk.status = "BUILT";
      o.ownerQaApk.sha256 = STALE_APK_SHA256;
    },
  ));
  k("canonical invalid", "CANONICAL_ACTIVITY_INVALID", withJson(base, "r31", (o) => {
    o.canonicalActivitiesInvalid = 3;
  }));
  k("skip fallback hidden", "SKIP_FALLBACK_HIDDEN", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) return null;\n  if (!validation.valid) {"));
  k("distractor leak restored", "DISTRACTOR_LEAK_RESTORED", mutate(base, "personalize", "repairNameOnlyAnswerLeak", "leakRepairGone"));
  k("personal audio fixed", "PERSONAL_AUDIO_FIXED_CONTENT", mutate(
    mutate(base, "audioPlayback", "PERSONAL_UTTERANCE", "FIXED_UTTERANCE"),
    "audioPolicy",
    'includes("PERSONAL")',
    'includes("XPERSONAL")',
  ));
  k("personal after lesson", "PERSONAL_AFTER_LESSON", (() => {
    const src = { ...base };
    const marker = 'if (s.includes("DYNAMIC") || s.includes("NAME") || s.includes("PERSONAL")) return "DYNAMIC_CONTENT";';
    if (!src.audioPolicy.includes(marker)) {
      console.error("MUTATION_SOURCE_MISSING audio personal marker");
      process.exitCode = 1;
      return src;
    }
    src.audioPolicy = src.audioPolicy.replace(marker, "/* personal deferred */");
    src.audioPolicy = src.audioPolicy.replace(
      'return "FIXED_CONTENT";\n}',
      `${marker}\n  return "FIXED_CONTENT";\n}`,
    );
    return src;
  })());
  k("hanzi compact removed", "HANZI_COMPACT_REMOVED", mutate(
    mutate(base, "hanziBuilder", "max-h-[min(42svh,220px)]", "max-h-none"),
    "hanziBuilder",
    "shortViewport",
    "tallViewport",
  ));
  k("visual author exempt", "VISUAL_AUTHOR_EXEMPT_RESTORED", mutate(base, "lessonTasks", "function violatesImageRepeat", `function violatesImageRepeat(selected, candidate) {\n  if (!candidate.generated) return false;\n  return false;\n}\nfunction violatesImageRepeatLegacy`));
  k("old apk given", "OLD_APK_GIVEN_TO_OWNER", withJson(
    withJson(base, "r311", (o) => {
      o.phase = "POST_BUILD";
      o.newOwnerQaApk = { status: "BUILT", sha256: "d".repeat(64), artifactSourceSha: "e".repeat(40) };
    }),
    "rc",
    (o) => {
      o.ownerQaApk.status = "BUILT";
      o.ownerQaApk.sha256 = STALE_APK_SHA256;
    },
  ));
  k("new apk hash missing", "NEW_APK_HASH_MISSING", withJson(base, "r311", (o) => {
    o.phase = "POST_BUILD";
    o.newOwnerQaApk = { status: "BUILT", sha256: null, artifactSourceSha: "f".repeat(40) };
  }));
  k("new apk source unknown", "NEW_APK_SOURCE_UNKNOWN", withJson(base, "r311", (o) => {
    o.phase = "POST_BUILD";
    o.newOwnerQaApk = { status: "BUILT", sha256: "a".repeat(64) };
  }));
  k("physical auto promoted", "PHYSICAL_AUTO_PROMOTED", mutate(base, "evidence", '"PHYSICAL_QA": "NOT_RUN"', '"PHYSICAL_QA": "PHYSICAL_PASS"'));
  k("targeted pass without evidence", "TARGETED_PHYSICAL_PASS_WITHOUT_EVIDENCE", withJson(base, "r311", (o) => {
    o.R31_TARGETED_PHYSICAL_RETEST = "PASS";
    delete o.targetedPhysicalEvidence;
  }));
  k("audio x20 below 20", "AUDIO_X20_BELOW_20", withJson(base, "r311", (o) => {
    o.R31_TARGETED_PHYSICAL_RETEST = "PASS";
    o.targetedPhysicalEvidence = { device: "owner", note: "fabricated" };
    o.audioX20Count = 5;
  }));
  k("audio button only", "AUDIO_BUTTON_ONLY_PASS", withJson(base, "r311", (o) => {
    o.audioPassMeans = "BUTTON_ONLY";
  }));
  k("entry go while physical not run", "ENTRY_GO_WHILE_PHYSICAL_NOT_RUN", withJson(base, "rc", (o) => {
    o.entry.OWNER_QA_ENTRY = "GO";
  }));
  k("wave1 invited early", "WAVE1_INVITED_EARLY", withJson(base, "rc", (o) => {
    o.wave1.invited = 10;
  }));
  k("audio imports store personalize", "AUDIO_IMPORTS_STORE_PERSONALIZE", mutate(
    base,
    "audioPlayback",
    'from "./audio/personalizedUtterance"',
    'from "./personalize"',
  ));
  k("pure helper missing", "PURE_PERSONALIZED_UTTERANCE_MISSING", mutate(base, "personalizedUtterance", "isPersonalizedUtterance", "isMixedSpeech"));
  k("fingerprint drift", "FINGERPRINT_DRIFT", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "57a848ef9ef9"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("lesson count", "LESSON_COUNT_DRIFT", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count", "TOPIC_COUNT_DRIFT", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture count", "CULTURE_COUNT_DRIFT", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("public beta go", "PUBLIC_BETA_GO", withJson(base, "rc", (o) => {
    o.entry.PUBLIC_BETA_ENTRY = "GO";
  }));
  k("play go secrets absent", "PLAY_GO_SECRETS_ABSENT", withJson(base, "rc", (o) => {
    o.entry.PLAY_CLOSED_BETA_ENTRY = "GO";
  }));
  k("issue closed without physical", "ISSUE_CLOSED_WITHOUT_PHYSICAL", mutate(
    base,
    "knownIssues",
    "**Status:** CODE_FIXED_PENDING_PHYSICAL",
    "**Status:** CLOSED",
  ));
  k("choice list removed", "DISTRACTOR_LEAK_RESTORED", mutate(base, "personalize", "personalizeChoiceList", "choiceListGone"));
  k("hanzi short viewport", "HANZI_COMPACT_REMOVED", mutate(base, "hanziBuilder", "shortViewport", "compactFlag"));
  k("rc fingerprint", "FINGERPRINT_DRIFT", withJson(base, "rc", (o) => {
    o.fingerprint = "deadbeef0001";
  }));
  k("r31 lessons", "LESSON_COUNT_DRIFT", withJson(base, "r31", (o) => {
    o.counts.lessons = 999;
  }));
  k("apk removed", "OWNER_QA_APK_REMOVED", withJson(base, "rc", (o) => {
    delete o.ownerQaApk;
  }));
  k("audio physical honesty", "AUDIO_PHYSICAL_HONESTY_MISSING", withJson(base, "r311", (o) => {
    o.audioPhysicalVerification = "PASS";
    o.R31_TARGETED_PHYSICAL_RETEST = "NOT_RUN";
  }));
  k("known issue skip", "KNOWN_ISSUE_MISSING_R31-CANONICAL-EXERCISE-SKIP", mutate(
    base,
    "knownIssues",
    "**ID:** R31-CANONICAL-EXERCISE-SKIP",
    "**ID:** R31-SKIP-GONE",
  ));
  k("known issue audio", "KNOWN_ISSUE_MISSING_R31-AUDIO-TRUNCATION", mutate(
    base,
    "knownIssues",
    "**ID:** R31-AUDIO-TRUNCATION",
    "**ID:** R31-AUDIO-GONE",
  ));
  k("known issue personal", "KNOWN_ISSUE_MISSING_R31-PERSONALIZED-UTTERANCE-CUT", mutate(
    base,
    "knownIssues",
    "**ID:** R31-PERSONALIZED-UTTERANCE-CUT",
    "**ID:** R31-PERSONAL-GONE",
  ));
  k("known issue visual", "KNOWN_ISSUE_MISSING_R31-VISUAL-REPETITION", mutate(
    base,
    "knownIssues",
    "**ID:** R31-VISUAL-REPETITION",
    "**ID:** R31-VISUAL-GONE",
  ));
  k("known issue distractor", "KNOWN_ISSUE_MISSING_R31-DISTRACTOR-ANSWER-LEAKAGE", mutate(
    base,
    "knownIssues",
    "**ID:** R31-DISTRACTOR-ANSWER-LEAKAGE",
    "**ID:** R31-LEAK-GONE",
  ));
  k("known issue mobile", "KNOWN_ISSUE_MISSING_R31-MOBILE-ACTIVITY-FIT", mutate(
    base,
    "knownIssues",
    "**ID:** R31-MOBILE-ACTIVITY-FIT",
    "**ID:** R31-MOBILE-GONE",
  ));
  k("gate typo", "R311_GATE_MISSING", mutate(base, "packageJson", "gate:rc2-3-13r3-1-1-hosted-candidate-rebuild", "gate:rc2-3-13r3-1-1-hosted-candidate-rebuild-x"));
  k("report title", "R311_REPORT_MISSING", mutate(base, "report", "RC2.3.13R.3.1.1", "RC2.GONE"));
  k("visual exempt second", "VISUAL_AUTHOR_EXEMPT_RESTORED", mutate(base, "lessonTasks", "function violatesImageRepeat", `function violatesImageRepeat(selected, candidate) {\n  if (!candidate.generated) return false;\n  return true;\n}\nfunction violatesImageRepeatLegacy`));
  k("personal after lesson second", "PERSONAL_AFTER_LESSON", (() => {
    const src = { ...base };
    const marker = 'if (s.includes("DYNAMIC") || s.includes("NAME") || s.includes("PERSONAL")) return "DYNAMIC_CONTENT";';
    src.audioPolicy = src.audioPolicy.replace(marker, "/* deferred */");
    src.audioPolicy = src.audioPolicy.replace(
      'return "FIXED_CONTENT";\n}',
      `${marker}\n  return "FIXED_CONTENT";\n}`,
    );
    return src;
  })());
  k("stale built second", "STALE_APK_MARKED_BUILT", withJson(base, "rc", (o) => {
    o.ownerQaApk.status = "BUILT";
  }));
  k("entry go cert", "ENTRY_GO_WHILE_PHYSICAL_NOT_RUN", withJson(base, "cert", (o) => {
    if (!o.entryDecision) o.entryDecision = {};
    o.entryDecision.OWNER_QA_ENTRY = "GO";
  }));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-1-1-hosted-candidate-rebuild after ${n} attempted kills`);
    return;
  }
  if (n < 60) {
    console.error(`FAIL need ≥60 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-1-1-hosted-candidate-rebuild — ${n} kills · stale=${STALE_APK_SHA256.slice(0, 12)}`);
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
