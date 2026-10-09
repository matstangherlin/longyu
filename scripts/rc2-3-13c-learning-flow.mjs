#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13c-learning-flow
 * Learning flow cognitive polish — one primary CTA per moment.
 */
import {
  checkAll,
  checkGuidedTryAndSpeech,
  checkLessonPrimaryCta,
  checkReviewVictoryInterruptions,
  checkRuntimeGuards,
  loadLearningFlowSources,
} from "./lib/rc2-3-13c-learning-flow-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13c-learning-flow");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13c-learning-flow · listen reason · speech hierarchy · review/victory primary · JEV OFF",
  );
}

function expectKill(label, code, run) {
  const errors = run();
  if (!errors.includes(code)) {
    console.error(`KILL MISS ${label} — expected ${code}, got [${errors.join(", ")}]`);
    process.exit(1);
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function test() {
  const base = loadLearningFlowSources();

  expectKill("1 disabled continue no reason", "DISABLED_CONTINUE_NO_REASON", () =>
    checkLessonPrimaryCta({
      ...base,
      steps: base.steps
        .replace(/listen-continue-reason/g, "x")
        .replace(/listenFirstToContinue/g, "x")
        .replace(/data-disabled-reason="listen-first"/g, ""),
    }),
  );
  expectKill("2 audio no feedback state", "AUDIO_NO_FEEDBACK_STATE", () =>
    checkLessonPrimaryCta({
      ...base,
      guidedPrim: base.guidedPrim.replace(/data-listen-state/g, "data-x"),
      steps: base.steps.replace(/data-listen-state/g, "data-x"),
    }),
  );
  expectKill("3 audio tech counted wrong", "AUDIO_TECH_COUNTED_WRONG", () =>
    checkLessonPrimaryCta({
      ...base,
      steps: base.steps.replace(/data-tech-failure="audio"/g, ""),
      guidedTry: base.guidedTry.replace(/data-tech-failure="audio"/g, ""),
    }),
  );
  expectKill("4 touch target too small", "TOUCH_TARGET_TOO_SMALL", () =>
    checkLessonPrimaryCta({
      ...base,
      steps: base.steps.replace(/min-h-12/g, "min-h-6"),
    }),
  );
  expectKill("5 guided try hierarchy", "GUIDED_TRY_NO_HIERARCHY", () =>
    checkGuidedTryAndSpeech({
      ...base,
      guidedTry: base.guidedTry.replace(/data-learning-flow="rc2-3-13c"/g, ""),
    }),
  );
  expectKill("6 speech hierarchy", "SPEECH_HIERARCHY_BROKEN", () =>
    checkGuidedTryAndSpeech({
      ...base,
      speech: base.speech.replace(/data-cta-hierarchy="primary"/g, ""),
      selfCompare: base.selfCompare.replace(/data-cta-hierarchy="primary"/g, ""),
    }),
  );
  expectKill("7 mic denial traps", "MIC_DENIAL_TRAPS", () =>
    checkGuidedTryAndSpeech({
      ...base,
      speech: base.speech
        .replace(/speech-open-settings/g, "x")
        .replace(/micOpenSettings/g, "x")
        .replace(/speech-cannot-now/g, "x")
        .replace(/cannotSpeakNow/g, "x"),
    }),
  );
  expectKill("8 speech tech counted wrong", "SPEECH_TECH_COUNTED_WRONG", () =>
    checkGuidedTryAndSpeech({
      ...base,
      speech: base.speech.replace(/speech-fallback-options/g, "x").replace(/speech-fallback-continue/g, "x"),
    }),
  );
  expectKill("9 review no primary", "REVIEW_NO_PRIMARY", () =>
    checkReviewVictoryInterruptions({
      ...base,
      review: base.review.replace(/data-testid="review-start"/g, 'data-testid="x"'),
    }),
  );
  expectKill("10 review grade unlabeled", "REVIEW_GRADE_UNLABELED", () =>
    checkReviewVictoryInterruptions({
      ...base,
      review: base.review.replace(/data-review-grade/g, "data-x"),
    }),
  );
  expectKill("11 completion store above continue", "COMPLETION_STORE_ABOVE_CONTINUE", () =>
    checkReviewVictoryInterruptions({
      ...base,
      victory: base.victory.replace(
        "data-lesson-victory-actions",
        'data-lesson-victory-actions"><a href="/loja">Store</a',
      ),
    }),
  );
  expectKill("12 pro upsell during lesson", "PRO_UPSELL_DURING_LESSON", () =>
    checkReviewVictoryInterruptions({
      ...base,
      player: `${base.player}\nconsider({ sessionMoment: "lesson" }, "card");\n`,
    }),
  );
  expectKill("13 notification during answer", "NOTIFICATION_DURING_ANSWER", () =>
    checkReviewVictoryInterruptions({
      ...base,
      steps: `${base.steps}\nNotification.requestPermission();\n`,
    }),
  );
  expectKill("14 jev runtime on", "JEV_RUNTIME_ENABLED", () =>
    checkRuntimeGuards({
      ...base,
      budgetPolicy: base.budgetPolicy.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("15 billing changed", "BILLING_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      billingAudit: base.billingAudit.replace(/DISABLED_FOR_BETA/g, "ENABLED"),
    }),
  );
  expectKill("16 atomurus touched", "ATOMURUS_TOUCHED", () => {
    const sibling = ["Ato", "murus"].join("");
    return checkRuntimeGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\ndeploy ${sibling} now\n`,
    });
  });
  expectKill("17 ux cert missing", "UX_CERT_MISSING", () =>
    checkRuntimeGuards({ ...base, certification: "" }),
  );
  expectKill("18 ux docs missing", "UX_DOCS_MISSING", () =>
    checkRuntimeGuards({ ...base, stateMap: "", report: "" }),
  );
  expectKill("19 owner checklist missing", "OWNER_CHECKLIST_MISSING", () =>
    checkRuntimeGuards({ ...base, ownerChecklist: "" }),
  );
  expectKill("20 mastery math changed", "MASTERY_MATH_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      personalMastery: base.personalMastery.replace(/createPersonalMastery/g, "x").replace(/STATE_LABEL_PT/g, "y"),
    }),
  );
  expectKill("21 srs changed", "SRS_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      srs: base.srs.replace(/export function dueItems/g, "export function xDue"),
    }),
  );
  expectKill("22 safe area overlap", "SAFE_AREA_OVERLAP", () =>
    checkRuntimeGuards({
      ...base,
      guidedPrim: base.guidedPrim.replace(/app-safe-bottom/g, "x"),
      steps: base.steps.replace(/app-safe-bottom/g, "x"),
    }),
  );
  expectKill("23 lesson continue missing primary", "LESSON_TWO_PRIMARY", () =>
    checkLessonPrimaryCta({
      ...base,
      steps: base.steps.replace(/data-cta-hierarchy="primary"/g, "").replace(/lesson-continue/g, "x"),
    }),
  );
  expectKill("24 curriculum freeze missing", "CURRICULUM_CHANGED", () =>
    checkRuntimeGuards({ ...base, curriculumFreeze: "" }),
  );

  console.log("PASS test:rc2-3-13c-learning-flow · 24 kills");
}

if (mode === "test") test();
else validate();
