#!/usr/bin/env node
import { checkAll, loadR31Sources } from "./lib/rc2-3-13r3-1-learning-integrity-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${String(from).slice(0, 100)}`);
    process.exitCode = 1;
    return { ...src, [key]: src[key] };
  }
  return { ...src, [key]: src[key].split(from).join(to) };
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
  console.log("PASS validate:rc2-3-13r3-1-learning-integrity");
}

function test() {
  const base = loadR31Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("gate missing", "R31_GATE_MISSING", mutate(base, "packageJson", '"gate:rc2-3-13r3-1-learning-integrity"', '"gate:removed"'));
  k("canonical script missing", "CANONICAL_INTEGRITY_SCRIPT_MISSING", mutate(base, "packageJson", '"validate:canonical-activity-integrity"', '"validate:removed"'));
  k("distractor script missing", "DISTRACTOR_QUALITY_SCRIPT_MISSING", mutate(base, "packageJson", '"validate:distractor-quality"', '"validate:removed-dq"'));
  k("choice list missing", "PERSONALIZE_CHOICE_LIST_MISSING", mutate(base, "personalize", "personalizeChoiceList", "choiceListFn"));
  k("leak repair missing", "NAME_LEAK_REPAIR_MISSING", mutate(base, "personalize", "repairNameOnlyAnswerLeak", "leakRepairFn"));
  k("name carrying missing", "NAME_CARRYING_DISTRACTORS_MISSING", mutate(base, "personalize", "nameCarryingDistractors", "nameDistractorFn"));
  k("utterance helper missing", "PERSONALIZED_UTTERANCE_HELPER_MISSING", mutate(base, "personalize", "isPersonalizedUtterance", "isMixedUtterance"));
  k("collision alternate missing", "NAME_COLLISION_ALTERNATE_MISSING", mutate(
    mutate(base, "personalize", "COLLISION_ALTERNATES", "NAME_RESERVES"),
    "personalize",
    "collisionAlternate",
    "reserveName"
  ));
  k("steps leak not wired", "STEPS_LEAK_REPAIR_NOT_WIRED", mutate(base, "steps", "repairNameOnlyAnswerLeak", "leakRepairFn"));
  k("steps choice not wired", "STEPS_CHOICE_LIST_NOT_WIRED", mutate(base, "steps", "personalizeChoiceList", "choiceListFn"));
  k("fallback removed", "BROKEN_STEP_FALLBACK_REMOVED", mutate(base, "steps", "BrokenStepFallback", "SkippedStepPanel"));
  k("skip diagnostics missing", "SKIP_DIAGNOSTICS_MISSING", mutate(base, "steps", "validationFailureCode", "skipReasonCode"));
  k("failure code helper missing", "FAILURE_CODE_HELPER_MISSING", mutate(base, "steps", "failureCodeFromErrors", "codeFromErrors"));
  k("skip telemetry missing", "SKIP_TELEMETRY_MISSING", mutate(base, "steps", "canonical_exercise_skip", "exercise_skip_event"));
  k("device qa kind missing", "DEVICE_QA_SKIP_KIND_MISSING", mutate(base, "deviceQa", "canonical_exercise_skip", "exercise_skip_event"));
  k("wojiao space missing", "WOJIAO_SPACE_FORM_MISSING", mutate(base, "personalize", "我叫 ${name}", "我叫${name}"));
  k("review charId missing wo", "REVIEW_RECOGNIZE_MISSING_CHARID", mutate(base, "reviewMastery", 'charId: "wo"', 'charId: "missing-wo"'));
  k("review charId missing ni", "REVIEW_RECOGNIZE_MISSING_CHARID", mutate(base, "reviewMastery", 'charId: "ni"', 'charIdX: "ni"'));
  k("review charId missing shi", "REVIEW_RECOGNIZE_MISSING_CHARID", mutate(base, "reviewMastery", 'charId: "shi"', 'charIdX: "shi"'));
  k("validator removed", "VALIDATOR_REMOVED", mutate(base, "exerciseValidation", "function validateExercise", "function validateExercisePayload"));

  k("personal audio class missing", "AUDIO_PERSONAL_CLASS_MISSING", mutate(base, "audioPolicy", 'includes("PERSONAL")', 'includes("XPERSONAL")'));
  k("personal after lesson", "AUDIO_PERSONAL_AFTER_LESSON", (() => {
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
      `${marker}\n  return "FIXED_CONTENT";\n}`
    );
    return src;
  })());
  k("playback personal upgrade missing", "PLAYBACK_PERSONAL_UPGRADE_MISSING", mutate(
    mutate(base, "audioPlayback", "isPersonalizedUtterance", "isMixedSpeech"),
    "audioPlayback",
    "PERSONAL_UTTERANCE",
    "MIXED_UTTERANCE"
  ));
  k("speak button personal missing", "SPEAK_BUTTON_PERSONAL_MISSING", mutate(base, "speakButton", "PERSONAL_UTTERANCE", "MIXED_UTTERANCE"));
  k("steps personal source missing", "STEPS_PERSONAL_AUDIO_SOURCE_MISSING", mutate(base, "steps", "PERSONAL_UTTERANCE", "MIXED_UTTERANCE"));
  k("choice validator removed", "CHOICE_VALIDATOR_REMOVED", mutate(base, "exerciseValidation", "checkChoice", "assertChoiceSet"));

  k("hanzi canvas not compact", "HANZI_CANVAS_NOT_COMPACT", mutate(base, "hanziBuilder", "max-h-[min(42svh,220px)]", "max-h-none"));
  k("hanzi short viewport missing", "HANZI_SHORT_VIEWPORT_DETECT_MISSING", mutate(
    mutate(base, "hanziBuilder", "matchMedia", "mediaQueryList"),
    "hanziBuilder",
    "shortViewport",
    "compactHeight"
  ));
  k("visual repeat weakened", "VISUAL_REPEAT_GUARD_WEAKENED", mutate(base, "lessonTasks", "selectedImageConceptIds(selected).has(conceptId)", "false"));
  k("visual author exempt", "VISUAL_REPEAT_AUTHOR_EXEMPT", mutate(base, "lessonTasks", "function violatesImageRepeat", `function violatesImageRepeat(selected, candidate) {\n  if (!candidate.generated) return false;\n  return false;\n}\nfunction violatesImageRepeatLegacy`));

  k("freeze exception missing", "FREEZE_EXCEPTION_MISSING", mutate(base, "curriculumFreeze", "PRE_BETA_FREEZE_EXCEPTION", "LEARNING_INTEGRITY_EXCEPTION"));
  k("freeze reason missing", "FREEZE_EXCEPTION_MISSING", mutate(base, "curriculumFreeze", "REAL_DEVICE_BETA_BLOCKER_FIX", "OWNER_QA_FIX"));
  for (const id of [
    "R31-CANONICAL-EXERCISE-SKIP",
    "R31-AUDIO-TRUNCATION",
    "R31-PERSONALIZED-UTTERANCE-CUT",
    "R31-VISUAL-REPETITION",
    "R31-DISTRACTOR-ANSWER-LEAKAGE",
    "R31-MOBILE-ACTIVITY-FIT",
  ]) {
    k(`known issue ${id}`, `KNOWN_ISSUE_MISSING_${id}`, mutate(base, "knownIssues", `**ID:** ${id}`, `**ID:** ${id}-GONE`));
  }
  k("report missing", "R31_REPORT_MISSING", mutate(base, "r31Report", "RC2.3.13R.3.1", "RC2.GONE"));
  k("integrity json missing", "R31_INTEGRITY_JSON_MISSING", { ...base, integrityJson: "" });
  k("integrity wave mismatch", "R31_INTEGRITY_WAVE_MISMATCH", mutate(base, "integrityJson", '"wave": "RC2.3.13R.3.1"', '"wave": "WRONG"'));
  k("lesson count drift", "LESSON_COUNT_DRIFT", mutate(base, "integrityJson", '"lessons": 134', '"lessons": 999'));
  k("topic count drift", "TOPIC_COUNT_DRIFT", mutate(base, "integrityJson", '"topics": 113', '"topics": 1'));
  k("culture count drift", "CULTURE_COUNT_DRIFT", mutate(base, "integrityJson", '"cultureItems": 36', '"cultureItems": 12'));

  k("skip blank hide", "SKIP_HIDDEN_BLANK", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) return null;\n  if (!validation.valid) {"));
  k("skip auto continue", "SKIP_AUTO_CONTINUE", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) { onDone(true);\n  if (!validation.valid) {"));
  k("integrity json invalid", "R31_INTEGRITY_JSON_INVALID", { ...base, integrityJson: "{not-json" });
  k("personalize choice removed again", "PERSONALIZE_CHOICE_LIST_MISSING", mutate(base, "personalize", "personalizeChoiceList", "choiceListFn"));
  k("leak repair export gone", "NAME_LEAK_REPAIR_MISSING", mutate(base, "personalize", "repairNameOnlyAnswerLeak", "leakRepairFn"));
  k("name carrying export gone", "NAME_CARRYING_DISTRACTORS_MISSING", mutate(base, "personalize", "nameCarryingDistractors", "nameDistractorFn"));
  k("utterance export gone", "PERSONALIZED_UTTERANCE_HELPER_MISSING", mutate(base, "personalize", "isPersonalizedUtterance", "isMixedUtterance"));
  k("playback personal second", "PLAYBACK_PERSONAL_UPGRADE_MISSING", mutate(
    mutate(base, "audioPlayback", "PERSONAL_UTTERANCE", "MIXED_UTTERANCE"),
    "audioPlayback",
    "isPersonalizedUtterance",
    "isMixedSpeech"
  ));
  k("speak personal second", "SPEAK_BUTTON_PERSONAL_MISSING", mutate(base, "speakButton", "PERSONAL_UTTERANCE", "MIXED_UTTERANCE"));
  k("hanzi matchMedia second", "HANZI_SHORT_VIEWPORT_DETECT_MISSING", mutate(
    mutate(base, "hanziBuilder", "shortViewport", "compactHeight"),
    "hanziBuilder",
    "matchMedia",
    "mediaQueryList"
  ));
  k("steps personal second", "STEPS_PERSONAL_AUDIO_SOURCE_MISSING", mutate(base, "steps", "PERSONAL_UTTERANCE", "MIXED_UTTERANCE"));
  k("telemetry second", "SKIP_TELEMETRY_MISSING", mutate(base, "steps", "canonical_exercise_skip", "exercise_skip_event"));
  k("failure codes second", "FAILURE_CODE_HELPER_MISSING", mutate(base, "steps", "failureCodeFromErrors", "codeFromErrors"));
  k("diagnostics attr missing", "SKIP_DIAGNOSTICS_MISSING", mutate(base, "steps", "validationFailureCode", "skipReasonCode"));
  k("broken fallback rename", "BROKEN_STEP_FALLBACK_REMOVED", mutate(base, "steps", "BrokenStepFallback", "SkippedStepPanel"));
  k("package gate typo", "R31_GATE_MISSING", mutate(base, "packageJson", '"gate:rc2-3-13r3-1-learning-integrity"', '"gate:rc2-3-13r3-1-learning-integrity-x"'));
  k("canonical script typo", "CANONICAL_INTEGRITY_SCRIPT_MISSING", mutate(base, "packageJson", '"validate:canonical-activity-integrity"', '"validate:canonical-activity-integrity-x"'));
  k("distractor script typo", "DISTRACTOR_QUALITY_SCRIPT_MISSING", mutate(base, "packageJson", '"validate:distractor-quality"', '"validate:distractor-quality-x"'));
  k("collision alternate list", "NAME_COLLISION_ALTERNATE_MISSING", mutate(
    mutate(base, "personalize", "collisionAlternate", "reserveName"),
    "personalize",
    "COLLISION_ALTERNATES",
    "NAME_RESERVES"
  ));
  k("device qa kind typo", "DEVICE_QA_SKIP_KIND_MISSING", mutate(base, "deviceQa", "canonical_exercise_skip", "exercise_skip_event"));
  k("visual has concept", "VISUAL_REPEAT_GUARD_WEAKENED", mutate(base, "lessonTasks", "selectedImageConceptIds", "imageConceptBag"));
  k("hanzi max-h typo", "HANZI_CANVAS_NOT_COMPACT", mutate(base, "hanziBuilder", "42svh", "99svh"));
  k("report title typo", "R31_REPORT_MISSING", mutate(base, "r31Report", "RC2.3.13R.3.1", "RC2.3.13R.3.X"));
  k("freeze id typo", "FREEZE_EXCEPTION_MISSING", mutate(base, "curriculumFreeze", "PRE_BETA_FREEZE_EXCEPTION", "LEARNING_INTEGRITY_EXCEPTION"));
  k("checkChoice rename", "CHOICE_VALIDATOR_REMOVED", mutate(base, "exerciseValidation", "checkChoice", "assertChoiceSet"));
  k("validateExercise rename", "VALIDATOR_REMOVED", mutate(base, "exerciseValidation", "function validateExercise", "function validateExercisePayload"));
  k("steps choice list rename wire", "STEPS_CHOICE_LIST_NOT_WIRED", mutate(base, "steps", "personalizeChoiceList", "choiceListFn"));
  k("steps leak repair rename wire", "STEPS_LEAK_REPAIR_NOT_WIRED", mutate(base, "steps", "repairNameOnlyAnswerLeak", "leakRepairFn"));
  k("wojiao space second", "WOJIAO_SPACE_FORM_MISSING", mutate(base, "personalize", "我叫 ${name}", "我叫·${name}"));
  k("hanzi canvas second", "HANZI_CANVAS_NOT_COMPACT", mutate(base, "hanziBuilder", "max-h-[min(42svh,220px)]", "h-auto w-full"));
  k("audio personal class second", "AUDIO_PERSONAL_CLASS_MISSING", mutate(base, "audioPolicy", 'includes("PERSONAL")', 'includes("LEARNER")'));
  k("freeze reason second", "FREEZE_EXCEPTION_MISSING", mutate(base, "curriculumFreeze", "REAL_DEVICE_BETA_BLOCKER_FIX", "OWNER_QA_FIX"));
  k("integrity missing second", "R31_INTEGRITY_JSON_MISSING", { ...base, integrityJson: "" });
  k("report missing second", "R31_REPORT_MISSING", mutate(base, "r31Report", "RC2.3.13R.3.1", "WAVE_GONE"));
  k("skip blank second", "SKIP_HIDDEN_BLANK", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) return null; if (!validation.valid) {"));
  k("skip auto second", "SKIP_AUTO_CONTINUE", mutate(base, "steps", "if (!validation.valid) {", "if (!validation.valid) { onDone();\nif (!validation.valid) {"));
  k("known issue skip again", "KNOWN_ISSUE_MISSING_R31-CANONICAL-EXERCISE-SKIP", mutate(base, "knownIssues", "**ID:** R31-CANONICAL-EXERCISE-SKIP", "**ID:** R31-SKIP-GONE"));
  k("known issue audio again", "KNOWN_ISSUE_MISSING_R31-AUDIO-TRUNCATION", mutate(base, "knownIssues", "**ID:** R31-AUDIO-TRUNCATION", "**ID:** R31-AUDIO-GONE"));
  k("wave mismatch second", "R31_INTEGRITY_WAVE_MISMATCH", mutate(base, "integrityJson", '"wave": "RC2.3.13R.3.1"', '"wave": "OTHER"'));
  k("lesson drift second", "LESSON_COUNT_DRIFT", mutate(base, "integrityJson", '"lessons": 134', '"lessons": 0'));
  k("topic drift second", "TOPIC_COUNT_DRIFT", mutate(base, "integrityJson", '"topics": 113', '"topics": 0'));
  k("culture drift second", "CULTURE_COUNT_DRIFT", mutate(base, "integrityJson", '"cultureItems": 36', '"cultureItems": 0'));
  k("json invalid second", "R31_INTEGRITY_JSON_INVALID", { ...base, integrityJson: "null{" });
  k("visual author exempt second", "VISUAL_REPEAT_AUTHOR_EXEMPT", mutate(base, "lessonTasks", "function violatesImageRepeat", `function violatesImageRepeat(selected, candidate) {\n  if (!candidate.generated) return false;\n  return selectedImageConceptIds(selected).has("x");\n}\nfunction violatesImageRepeatLegacy`));

  if (process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-1-learning-integrity after ${n} attempted kills`);
    return;
  }
  if (n < 80) {
    console.error(`FAIL need ≥80 kills, got ${n}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-1-learning-integrity — ${n} kills`);
}

const cmd = process.argv[2] ?? "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
