/**
 * Pure checkers for gate:rc2-3-13d-mobile-physical-ux.
 * CODE-level invariants only — never invent PHYSICAL_PASS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadMobilePhysicalSources() {
  return {
    steps: read("src/features/lesson/steps.tsx"),
    player: read("src/features/lesson/LessonPlayer.tsx"),
    guidedTry: read("src/features/landing/GuidedTryPage.tsx"),
    guidedPrim: read("src/components/guided/GuidedPrimitives.tsx"),
    conversation: read("src/features/lesson/ConversationSceneStep.tsx"),
    speech: read("src/features/lesson/PronunciationPractice.tsx"),
    hanzi: read("src/features/hanzi/writing/HanziWritingExercise.tsx"),
    hanziCanvas: read("src/features/hanzi/writing/HanziWritingCanvas.tsx"),
    tabBar: read("src/components/layout/TabBar.tsx"),
    shell: read("src/lib/platform/nativeShell.ts"),
    budgetPolicy: read("supabase/functions/_shared/budgetPolicy.ts"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    certification: read("docs/release/rc2-3-13d-ux-certification.json"),
    deviceQa: read("docs/release/rc2-3-13d-device-qa.json"),
    deviceMatrix: read("docs/ux/mobile-device-matrix.md"),
    rc4Identity: read("docs/release/rc2-3-12-rc4-identity.json"),
    ownerChecklist: read("docs/release/OWNER_RC_LEARNING_FLOW_TEST.md"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
    globalsCss: read("src/index.css"),
  };
}

export function checkSafeAreas(src = loadMobilePhysicalSources()) {
  const errors = [];
  const bottomSurfaces = src.steps + src.player + src.tabBar + src.guidedPrim;
  if (!/app-safe-bottom/.test(bottomSurfaces)) errors.push("SAFE_BOTTOM_IGNORED");
  if (!/app-safe-top|safe-top|pt-\[var\(--app-safe-top\)\]/.test(src.guidedTry + src.player + src.tabBar)) {
    // TabBar may only use bottom; Guided Try done uses safe-top.
    if (!/app-safe-top/.test(src.guidedTry + src.player)) errors.push("SAFE_TOP_IGNORED");
  }
  return [...new Set(errors)];
}

export function checkKeyboardAndBack(src = loadMobilePhysicalSources()) {
  const errors = [];
  if (!/data-conversation-answer-dock|GuidedDock/.test(src.conversation)) {
    errors.push("KEYBOARD_COVERS_CHECK");
  }
  if (!/requestExitLesson|leaveConfirm/.test(src.player)) errors.push("BACK_NO_CONFIRM");
  if (!/isKeyboardOpen|close-keyboard|closeKeyboard/.test(src.shell)) {
    errors.push("BACK_KEYBOARD_EXITS_LESSON");
  }
  if (!/isModalOpen|dismiss-overlay|dismissTopOverlay/.test(src.shell)) {
    errors.push("SHEET_BACK_NO_DISMISS");
  }
  return [...new Set(errors)];
}

export function checkTouchAndHanzi(src = loadMobilePhysicalSources()) {
  const errors = [];
  if (!/min-h-12/.test(src.steps + src.conversation + src.speech)) {
    errors.push("TOUCH_TARGET_TOO_SMALL");
  }
  if (!/Math\.max\(248/.test(src.hanziCanvas)) errors.push("HANZI_CANVAS_TOO_SMALL");
  if (!/touch-none/.test(src.hanziCanvas) || !/touchAction:\s*"none"/.test(src.hanziCanvas)) {
    errors.push("HANZI_ALLOWS_PAGE_PAN");
  }
  return [...new Set(errors)];
}

export function checkA11yAndMotion(src = loadMobilePhysicalSources()) {
  const errors = [];
  // Correct/wrong must not be color-only in conversation feedback (icon + text).
  if (!/IconCheck|IconX/.test(src.conversation) || !/player\.(almost|almostQi|correct)/.test(src.conversation)) {
    errors.push("CORRECT_WRONG_COLOR_ONLY");
  }
  if (!/aria-label|aria-current|aria-pressed/.test(src.tabBar + src.speech + src.guidedPrim)) {
    errors.push("TALKBACK_NO_LABEL");
  }
  const motionSurfaces = `${src.globalsCss}\n${src.player}\n${src.steps}\n${src.guidedTry}`;
  if (!/prefers-reduced-motion/.test(motionSurfaces)) {
    errors.push("REDUCED_MOTION_BREAKS_FLOW");
  }
  return [...new Set(errors)];
}

export function checkRuntimeGuards(src = loadMobilePhysicalSources()) {
  const errors = [];
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (!/DISABLED_FOR_BETA/.test(src.billingAudit)) errors.push("BILLING_CHANGED");
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b(deploy|apply)\\s+${sibling}\\b`, "i").test(src.oaDeploy)) {
    errors.push("ATOMURUS_TOUCHED");
  }
  if (!src.curriculumFreeze) errors.push("CURRICULUM_CHANGED");
  if (!/createPersonalMastery|STATE_LABEL_PT/.test(src.personalMastery)) errors.push("MASTERY_MATH_CHANGED");
  if (!src.deviceMatrix || !/SMALL/.test(src.deviceMatrix)) errors.push("DEVICE_MATRIX_MISSING");
  if (!src.certification || !/SAFE_BOTTOM_CODE_PASS/.test(src.certification)) errors.push("UX_CERT_MISSING");
  if (!src.deviceQa || !/DEVICE-QA/.test(src.deviceQa)) errors.push("DEVICE_QA_MISSING");
  if (!src.rc4Identity || !/"status":\s*"NOT_BUILT"/.test(src.rc4Identity)) {
    errors.push("RC4_INVENTED");
  }
  if (!src.ownerChecklist) errors.push("OWNER_CHECKLIST_MISSING");
  if (!/micOpenSettings|speech-open-settings|cannotSpeakNow|speech-cannot-now/.test(src.speech)) {
    errors.push("MIC_DENIAL_TRAPS");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadMobilePhysicalSources()) {
  return [
    ...checkSafeAreas(src),
    ...checkKeyboardAndBack(src),
    ...checkTouchAndHanzi(src),
    ...checkA11yAndMotion(src),
    ...checkRuntimeGuards(src),
  ];
}
