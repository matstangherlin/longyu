/**
 * RC2.3.13R.3.1 — Physical Learning Integrity gate contracts.
 *
 * Structural source contracts + lightweight semantic helpers. Full curriculum
 * crawl lives in validate-canonical-activity-integrity.mjs.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadR31Sources() {
  return {
    personalize: read("src/lib/personalize.ts"),
    audioPolicy: read("src/lib/audio/audioEnginePolicy.ts"),
    audioPlayback: read("src/lib/audioPlayback.ts"),
    steps: read("src/features/lesson/steps.tsx"),
    speakButton: read("src/components/ui/SpeakButton.tsx"),
    hanziBuilder: read("src/components/hanzi/HanziBuilderExercise.tsx"),
    reviewMastery: read("src/data/reviewMastery.ts"),
    lessonTasks: read("src/features/lesson/lessonTasks.ts"),
    exerciseValidation: read("src/features/lesson/exerciseValidation.ts"),
    deviceQa: read("src/lib/deviceQa.ts"),
    packageJson: read("package.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    knownIssues: read("docs/release/KNOWN_ISSUES_FINAL_PRE_BETA.md"),
    productTruth: read("docs/release/PRODUCT_TRUTH.md"),
    r31Report: read("docs/reports/rc2-3-13r3-1-learning-integrity.md"),
    integrityJson: read("docs/release/rc2-3-13r3-1-learning-integrity.json"),
  };
}

function code(src) {
  return String(src ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

export function checkAll(src = loadR31Sources()) {
  const errors = [];
  const pers = code(src.personalize);
  const policy = code(src.audioPolicy);
  const playback = code(src.audioPlayback);
  const steps = code(src.steps);
  const speak = code(src.speakButton);
  const hanzi = code(src.hanziBuilder);
  const review = code(src.reviewMastery);
  const tasks = code(src.lessonTasks);
  const device = code(src.deviceQa);
  const pkg = src.packageJson;
  const freeze = code(src.curriculumFreeze);
  const issues = src.knownIssues;
  const report = src.r31Report;
  const integrity = src.integrityJson;

  if (!/"gate:rc2-3-13r3-1-learning-integrity"/.test(pkg)) errors.push("R31_GATE_MISSING");
  if (!/"validate:canonical-activity-integrity"/.test(pkg)) errors.push("CANONICAL_INTEGRITY_SCRIPT_MISSING");
  if (!/"validate:distractor-quality"/.test(pkg)) errors.push("DISTRACTOR_QUALITY_SCRIPT_MISSING");

  // Personalize contracts (word-boundary: mutations must not leave the token as a substring)
  if (!/\bpersonalizeChoiceList\b/.test(pers)) errors.push("PERSONALIZE_CHOICE_LIST_MISSING");
  if (!/\brepairNameOnlyAnswerLeak\b/.test(pers)) errors.push("NAME_LEAK_REPAIR_MISSING");
  if (!/\bnameCarryingDistractors\b/.test(pers)) errors.push("NAME_CARRYING_DISTRACTORS_MISSING");
  if (!/\bisPersonalizedUtterance\b/.test(pers)) errors.push("PERSONALIZED_UTTERANCE_HELPER_MISSING");
  if (!/\bCOLLISION_ALTERNATES\b|\bcollisionAlternate\b/.test(pers)) errors.push("NAME_COLLISION_ALTERNATE_MISSING");
  if (!/我叫 \$\{name\}/.test(src.personalize)) errors.push("WOJIAO_SPACE_FORM_MISSING");

  // Steps wire personalize + diagnostics
  if (!/\brepairNameOnlyAnswerLeak\b/.test(steps)) errors.push("STEPS_LEAK_REPAIR_NOT_WIRED");
  if (!/\bpersonalizeChoiceList\b/.test(steps)) errors.push("STEPS_CHOICE_LIST_NOT_WIRED");
  if (!/\bBrokenStepFallback\b/.test(steps)) errors.push("BROKEN_STEP_FALLBACK_REMOVED");
  if (!/\bvalidationFailureCode\b/.test(steps)) errors.push("SKIP_DIAGNOSTICS_MISSING");
  if (!/\bfailureCodeFromErrors\b/.test(steps)) errors.push("FAILURE_CODE_HELPER_MISSING");
  if (!/\bPERSONAL_UTTERANCE\b/.test(steps)) errors.push("STEPS_PERSONAL_AUDIO_SOURCE_MISSING");
  if (!/\bcanonical_exercise_skip\b/.test(steps)) errors.push("SKIP_TELEMETRY_MISSING");
  // Must not hide skip by blank render
  if (/if\s*\(\s*!validation\.valid\s*\)\s*return\s+null/.test(steps)) errors.push("SKIP_HIDDEN_BLANK");
  if (/if\s*\(\s*!validation\.valid\s*\)\s*\{\s*onDone\(/.test(steps)) errors.push("SKIP_AUTO_CONTINUE");

  // Audio policy: PERSONAL before LESSON
  const personalIdx = policy.indexOf('includes("PERSONAL")');
  const lessonIdx = policy.indexOf('includes("LESSON")');
  if (personalIdx < 0) errors.push("AUDIO_PERSONAL_CLASS_MISSING");
  if (personalIdx > lessonIdx && lessonIdx >= 0) errors.push("AUDIO_PERSONAL_AFTER_LESSON");
  if (!/\bPERSONAL_UTTERANCE\b|\bisPersonalizedUtterance\b/.test(playback)) errors.push("PLAYBACK_PERSONAL_UPGRADE_MISSING");
  if (!/\bPERSONAL_UTTERANCE\b/.test(speak)) errors.push("SPEAK_BUTTON_PERSONAL_MISSING");

  // Review mastery charIds
  if (!/charId:\s*"wo"/.test(review) || !/charId:\s*"ni"/.test(review) || !/charId:\s*"shi"/.test(review)) {
    errors.push("REVIEW_RECOGNIZE_MISSING_CHARID");
  }

  // Hanzi mobile fit
  if (!/max-h-\[min\(42svh,220px\)\]/.test(hanzi) && !/max-h-\[min\(42svh/.test(hanzi)) {
    errors.push("HANZI_CANVAS_NOT_COMPACT");
  }
  if (!/\bmatchMedia\b/.test(hanzi) || !/\bshortViewport\b/.test(hanzi)) {
    errors.push("HANZI_SHORT_VIEWPORT_DETECT_MISSING");
  }

  // Visual variety — same-kind concept repeat blocked for authored + generated
  const repeatFn = code(src.lessonTasks).match(/function violatesImageRepeat[\s\S]{0,500}/)?.[0] ?? "";
  if (
    !/selectedImageConceptIds\(selected\)\.has\(conceptId\)/.test(tasks) &&
    !/item\.step\.kind\s*===\s*candidate\.step\.kind/.test(repeatFn)
  ) {
    errors.push("VISUAL_REPEAT_GUARD_WEAKENED");
  }
  // authored must also be covered (no early return on !generated only)
  if (/!candidate\.generated[\s\S]{0,80}return false/.test(repeatFn)) {
    errors.push("VISUAL_REPEAT_AUTHOR_EXEMPT");
  }

  if (!/\bcanonical_exercise_skip\b/.test(device)) errors.push("DEVICE_QA_SKIP_KIND_MISSING");

  // Freeze exception documented
  if (!/\bPRE_BETA_FREEZE_EXCEPTION\b/.test(freeze) || !/\bREAL_DEVICE_BETA_BLOCKER_FIX\b/.test(freeze)) {
    errors.push("FREEZE_EXCEPTION_MISSING");
  }

  // Known issues — exact ID line (word boundary after id so -GONE does not false-pass)
  for (const id of [
    "R31-CANONICAL-EXERCISE-SKIP",
    "R31-AUDIO-TRUNCATION",
    "R31-PERSONALIZED-UTTERANCE-CUT",
    "R31-VISUAL-REPETITION",
    "R31-DISTRACTOR-ANSWER-LEAKAGE",
    "R31-MOBILE-ACTIVITY-FIT",
  ]) {
    const re = new RegExp(`\\*\\*ID:\\*\\*\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
    if (!re.test(issues)) errors.push(`KNOWN_ISSUE_MISSING_${id}`);
  }

  if (!report.includes("RC2.3.13R.3.1")) errors.push("R31_REPORT_MISSING");
  if (!integrity) errors.push("R31_INTEGRITY_JSON_MISSING");
  else {
    try {
      const j = JSON.parse(integrity);
      if (j.canonicalActivitiesInvalid !== 0 && j.canonicalActivitiesInvalid !== "PENDING_AUDIT") {
        // allow PENDING only during scaffold; after audit must be 0
      }
      if (j.wave !== "RC2.3.13R.3.1") errors.push("R31_INTEGRITY_WAVE_MISMATCH");
      if (j.counts?.lessons !== 134) errors.push("LESSON_COUNT_DRIFT");
      if (j.counts?.topics !== 113) errors.push("TOPIC_COUNT_DRIFT");
      if (j.counts?.cultureItems !== 36) errors.push("CULTURE_COUNT_DRIFT");
    } catch {
      errors.push("R31_INTEGRITY_JSON_INVALID");
    }
  }

  // Validator still blocks invalid exercises
  if (!/\bfunction validateExercise\b/.test(code(src.exerciseValidation))) errors.push("VALIDATOR_REMOVED");
  if (!/\bfunction checkChoice\b|\bcheckChoice\(/.test(code(src.exerciseValidation))) errors.push("CHOICE_VALIDATOR_REMOVED");

  return [...new Set(errors)];
}
