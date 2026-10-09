/**
 * Pure checkers for gate:rc2-3-13c-learning-flow.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadLearningFlowSources() {
  return {
    steps: read("src/features/lesson/steps.tsx"),
    guidedTry: read("src/features/landing/GuidedTryPage.tsx"),
    guidedPrim: read("src/components/guided/GuidedPrimitives.tsx"),
    victory: read("src/features/lesson/LessonVictory.tsx"),
    speech: read("src/features/lesson/PronunciationPractice.tsx"),
    selfCompare: read("src/features/lesson/SelfComparePractice.tsx"),
    review: read("src/features/revisao/RevisaoPage.tsx"),
    conversation: read("src/features/lesson/ConversationSceneStep.tsx"),
    hanzi: read("src/features/hanzi/writing/HanziWritingExercise.tsx"),
    hanziCanvas: read("src/features/hanzi/writing/HanziWritingCanvas.tsx"),
    player: read("src/features/lesson/LessonPlayer.tsx"),
    budgetPolicy: read("supabase/functions/_shared/budgetPolicy.ts"),
    featureFlags: read("docs/release/feature-flags.json"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    certification: read("docs/release/rc2-3-13c-ux-certification.json"),
    stateMap: read("docs/ux/learning-flow-state-map.md"),
    report: read("docs/reports/rc2-3-13c-learning-flow.md"),
    ownerChecklist: read("docs/release/OWNER_RC_LEARNING_FLOW_TEST.md"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
    packageJson: read("package.json"),
  };
}

function countPrimary(chunk) {
  return (chunk.match(/data-cta-hierarchy="primary"/g) ?? []).length;
}

export function checkLessonPrimaryCta(src = loadLearningFlowSources()) {
  const errors = [];
  if (!/data-cta-hierarchy="primary"/.test(src.steps) || !/data-testid="lesson-continue"/.test(src.steps)) {
    errors.push("LESSON_TWO_PRIMARY");
  }
  // Listen: while waiting, Continuar is secondary and reason is present.
  if (!/data-disabled-reason="listen-first"/.test(src.steps) && !/listenFirstToContinue/.test(src.steps)) {
    errors.push("DISABLED_CONTINUE_NO_REASON");
  }
  if (!/listen-continue-reason/.test(src.steps)) errors.push("DISABLED_CONTINUE_NO_REASON");
  // Audio button has feedback states via data-listen-state.
  if (!/data-listen-state/.test(src.guidedPrim) && !/data-listen-state/.test(src.steps)) {
    errors.push("AUDIO_NO_FEEDBACK_STATE");
  }
  if (!/data-tech-failure="audio"/.test(src.steps) && !/data-tech-failure="audio"/.test(src.guidedTry)) {
    errors.push("AUDIO_TECH_COUNTED_WRONG");
  }
  // Touch target on ContinueBtn.
  if (!/min-h-12/.test(src.steps)) errors.push("TOUCH_TARGET_TOO_SMALL");
  return [...new Set(errors)];
}

export function checkGuidedTryAndSpeech(src = loadLearningFlowSources()) {
  const errors = [];
  if (!/data-learning-flow="rc2-3-13c"/.test(src.guidedTry)) errors.push("GUIDED_TRY_NO_HIERARCHY");
  if (!/listenFirstToContinue|listen-continue-reason/.test(src.guidedTry)) {
    errors.push("DISABLED_CONTINUE_NO_REASON");
  }
  if (!/data-cta-hierarchy="primary"/.test(src.speech) || !/speech-start/.test(src.speech)) {
    errors.push("SPEECH_HIERARCHY_BROKEN");
  }
  if (!/speech-cannot-now|cannotSpeakNow/.test(src.speech)) errors.push("MIC_DENIAL_TRAPS");
  if (!/speech-open-settings|micOpenSettings/.test(src.speech)) errors.push("MIC_DENIAL_TRAPS");
  if (!/self-compare-record/.test(src.selfCompare) || !/data-cta-hierarchy="primary"/.test(src.selfCompare)) {
    errors.push("SPEECH_HIERARCHY_BROKEN");
  }
  // Tech failure fallback options exist (not counted as pronunciation wrong).
  if (!/speech-fallback-options|speech-fallback-continue/.test(src.speech)) {
    errors.push("SPEECH_TECH_COUNTED_WRONG");
  }
  return [...new Set(errors)];
}

export function checkReviewVictoryInterruptions(src = loadLearningFlowSources()) {
  const errors = [];
  if (!/data-testid="review-start"/.test(src.review) || !/data-cta-hierarchy="primary"/.test(src.review)) {
    errors.push("REVIEW_NO_PRIMARY");
  }
  if (!/data-review-grade/.test(src.review)) errors.push("REVIEW_GRADE_UNLABELED");
  // Grade buttons use semantic labels via gradeLabel — must not be bare 1/2/3/4.
  if (/data-review-grade=\{[1-4]\}/.test(src.review) && !/gradeLabel/.test(src.review)) {
    errors.push("REVIEW_GRADE_UNLABELED");
  }
  if (!/data-victory-primary/.test(src.victory) || !/data-cta-hierarchy="primary"/.test(src.victory)) {
    errors.push("COMPLETION_STORE_ABOVE_CONTINUE");
  }
  // Victory must not promote Store / League as primary siblings.
  const victoryActions = src.victory.slice(src.victory.indexOf("data-lesson-victory-actions"));
  if (/\/loja|\/ligas|ProOfferBanner/.test(victoryActions)) {
    errors.push("COMPLETION_STORE_ABOVE_CONTINUE");
  }
  // Active lesson must not surface Pro card offer consider during answer flow.
  // Soft: ProPaywall may exist for energy; card consider during hub was removed.
  if (/consider\(\s*\{[\s\S]*sessionMoment:\s*"lesson"/.test(src.player)) {
    errors.push("PRO_UPSELL_DURING_LESSON");
  }
  if (/requestNotificationPermission|Notification\.requestPermission/.test(src.steps + src.player)) {
    errors.push("NOTIFICATION_DURING_ANSWER");
  }
  return [...new Set(errors)];
}

export function checkConversationAndHanzi(src = loadLearningFlowSources()) {
  const errors = [];
  if (!/ConversationPhaseChrome/.test(src.conversation) || !/data-conversation-phase/.test(src.conversation)) {
    errors.push("CONVERSATION_NO_PHASE");
  }
  if (!/data-testid="conversation-turn-progress"/.test(src.conversation)) {
    errors.push("CONVERSATION_NO_PHASE");
  }
  if (!/data-cta-hierarchy="primary"/.test(src.conversation) || !/conversation-advance/.test(src.conversation)) {
    errors.push("CONVERSATION_NO_PRIMARY");
  }
  if (!/data-hanzi-hierarchy="rc2-3-13c"/.test(src.hanzi) || !/hanzi-stage-label/.test(src.hanzi)) {
    errors.push("HANZI_HIERARCHY_BROKEN");
  }
  if (!/data-hanzi-canvas-region|hanzi-canvas-region/.test(src.hanzi)) {
    errors.push("HANZI_CANVAS_TOO_SMALL");
  }
  const canvasSrc = src.hanziCanvas ?? "";
  if (!/touch-none/.test(canvasSrc) || !/touchAction:\s*"none"/.test(canvasSrc)) {
    errors.push("HANZI_CANVAS_TOO_SMALL");
  }
  if (!/Math\.max\(248/.test(canvasSrc)) errors.push("HANZI_CANVAS_TOO_SMALL");
  if (!/registerBackGuard/.test(src.player)) errors.push("BACK_LOSES_PROGRESS");
  if (!/visualViewport|app-safe-bottom/.test(src.steps)) errors.push("KEYBOARD_HIDES_CTA");
  return [...new Set(errors)];
}

export function checkRuntimeGuards(src = loadLearningFlowSources()) {
  const errors = [];
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (!/DISABLED_FOR_BETA/.test(src.billingAudit)) errors.push("BILLING_CHANGED");
  if (
    /ANDROID_IN_APP_PURCHASE\s*=\s*ENABLED/.test(src.billingAudit) ||
    /"decision":\s*"ANDROID_IN_APP_PURCHASE=ENABLED"/.test(src.billingAudit)
  ) {
    errors.push("BILLING_CHANGED");
  }
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b(deploy|apply)\\s+${sibling}\\b`, "i").test(src.oaDeploy)) {
    errors.push("ATOMURUS_TOUCHED");
  }
  if (!src.stateMap || !/LESSON_ENTER/.test(src.stateMap)) errors.push("UX_DOCS_MISSING");
  if (!src.certification || !/LESSON_PRIMARY_ACTION_PASS/.test(src.certification)) {
    errors.push("UX_CERT_MISSING");
  }
  if (!src.report) errors.push("UX_DOCS_MISSING");
  if (!src.ownerChecklist || !/OWNER_RC_LEARNING_FLOW/.test(src.ownerChecklist) && !/Learning Flow/.test(src.ownerChecklist)) {
    errors.push("OWNER_CHECKLIST_MISSING");
  }
  // Curriculum / mastery / SRS must remain present (freeze — not deleted).
  if (!src.curriculumFreeze) errors.push("CURRICULUM_CHANGED");
  if (!/createPersonalMastery|STATE_LABEL_PT/.test(src.personalMastery)) errors.push("MASTERY_MATH_CHANGED");
  if (!/export function dueItems/.test(src.srs)) errors.push("SRS_CHANGED");
  if (!/app-safe-bottom/.test(src.guidedPrim) && !/app-safe-bottom/.test(src.steps)) {
    errors.push("SAFE_AREA_OVERLAP");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadLearningFlowSources()) {
  return [
    ...checkLessonPrimaryCta(src),
    ...checkGuidedTryAndSpeech(src),
    ...checkReviewVictoryInterruptions(src),
    ...checkConversationAndHanzi(src),
    ...checkRuntimeGuards(src),
  ];
}
