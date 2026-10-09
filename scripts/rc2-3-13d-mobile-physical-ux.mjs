#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13d-mobile-physical-ux
 * Mobile accessibility & physical UX — CODE invariants (not PHYSICAL_PASS).
 */
import {
  checkAll,
  checkA11yAndMotion,
  checkKeyboardAndBack,
  checkRuntimeGuards,
  checkSafeAreas,
  checkTouchAndHanzi,
  loadMobilePhysicalSources,
} from "./lib/rc2-3-13d-mobile-physical-ux-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13d-mobile-physical-ux");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13d-mobile-physical-ux · safe-area · keyboard dock · back · hanzi · JEV OFF · RC4 NOT_BUILT",
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
  const base = loadMobilePhysicalSources();

  expectKill("1 safe bottom ignored", "SAFE_BOTTOM_IGNORED", () =>
    checkSafeAreas({
      ...base,
      steps: base.steps.replace(/app-safe-bottom/g, "x"),
      player: base.player.replace(/app-safe-bottom/g, "x"),
      tabBar: base.tabBar.replace(/app-safe-bottom/g, "x"),
      guidedPrim: base.guidedPrim.replace(/app-safe-bottom/g, "x"),
    }),
  );
  expectKill("2 safe top ignored", "SAFE_TOP_IGNORED", () =>
    checkSafeAreas({
      ...base,
      guidedTry: base.guidedTry.replace(/app-safe-top/g, "x"),
      player: base.player.replace(/app-safe-top/g, "x"),
      tabBar: base.tabBar.replace(/app-safe-top/g, "x"),
    }),
  );
  expectKill("3 keyboard covers check", "KEYBOARD_COVERS_CHECK", () =>
    checkKeyboardAndBack({
      ...base,
      conversation: base.conversation
        .replace(/data-conversation-answer-dock/g, "x")
        .replace(/GuidedDock/g, "X"),
    }),
  );
  expectKill("4 back no confirm", "BACK_NO_CONFIRM", () =>
    checkKeyboardAndBack({
      ...base,
      player: base.player.replace(/requestExitLesson/g, "x").replace(/leaveConfirm/g, "y"),
    }),
  );
  expectKill("5 back keyboard exits lesson", "BACK_KEYBOARD_EXITS_LESSON", () =>
    checkKeyboardAndBack({
      ...base,
      shell: base.shell
        .replace(/isKeyboardOpen/g, "x")
        .replace(/close-keyboard/g, "y")
        .replace(/closeKeyboard/g, "z"),
    }),
  );
  expectKill("6 sheet back no dismiss", "SHEET_BACK_NO_DISMISS", () =>
    checkKeyboardAndBack({
      ...base,
      shell: base.shell
        .replace(/isModalOpen/g, "x")
        .replace(/dismiss-overlay/g, "y")
        .replace(/dismissTopOverlay/g, "z"),
    }),
  );
  expectKill("7 touch target too small", "TOUCH_TARGET_TOO_SMALL", () =>
    checkTouchAndHanzi({
      ...base,
      steps: base.steps.replace(/min-h-12/g, "min-h-6"),
      conversation: base.conversation.replace(/min-h-12/g, "min-h-6"),
      speech: base.speech.replace(/min-h-12/g, "min-h-6"),
    }),
  );
  expectKill("8 hanzi canvas too small", "HANZI_CANVAS_TOO_SMALL", () =>
    checkTouchAndHanzi({
      ...base,
      hanziCanvas: base.hanziCanvas.replace(/Math\.max\(248/g, "Math.max(120"),
    }),
  );
  expectKill("9 hanzi allows page pan", "HANZI_ALLOWS_PAGE_PAN", () =>
    checkTouchAndHanzi({
      ...base,
      hanziCanvas: base.hanziCanvas.replace(/touch-none/g, "x").replace(/touchAction:\s*"none"/g, "y"),
    }),
  );
  expectKill("10 correct wrong color only", "CORRECT_WRONG_COLOR_ONLY", () =>
    checkA11yAndMotion({
      ...base,
      conversation: base.conversation
        .replace(/IconCheck/g, "X")
        .replace(/IconX/g, "Y")
        .replace(/player\.(almost|almostQi|correct)/g, "z"),
    }),
  );
  expectKill("11 talkback no label", "TALKBACK_NO_LABEL", () =>
    checkA11yAndMotion({
      ...base,
      tabBar: base.tabBar.replace(/aria-label|aria-current|aria-pressed/g, "x"),
      speech: base.speech.replace(/aria-label|aria-current|aria-pressed/g, "x"),
      guidedPrim: base.guidedPrim.replace(/aria-label|aria-current|aria-pressed/g, "x"),
    }),
  );
  expectKill("12 jev runtime on", "JEV_RUNTIME_ENABLED", () =>
    checkRuntimeGuards({
      ...base,
      budgetPolicy: base.budgetPolicy.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("13 billing changed", "BILLING_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      billingAudit: base.billingAudit.replace(/DISABLED_FOR_BETA/g, "ENABLED"),
    }),
  );
  expectKill("14 sibling project touched", "ATOMURUS_TOUCHED", () => {
    const sibling = ["Ato", "murus"].join("");
    return checkRuntimeGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\ndeploy ${sibling} now\n`,
    });
  });
  expectKill("15 rc4 invented", "RC4_INVENTED", () =>
    checkRuntimeGuards({
      ...base,
      rc4Identity: base.rc4Identity.replace(/NOT_BUILT/g, "BUILT"),
    }),
  );
  expectKill("16 device matrix missing", "DEVICE_MATRIX_MISSING", () =>
    checkRuntimeGuards({ ...base, deviceMatrix: "" }),
  );
  expectKill("17 ux cert missing", "UX_CERT_MISSING", () =>
    checkRuntimeGuards({ ...base, certification: "" }),
  );
  expectKill("18 mic denial traps", "MIC_DENIAL_TRAPS", () =>
    checkRuntimeGuards({
      ...base,
      speech: base.speech
        .replace(/micOpenSettings/g, "x")
        .replace(/speech-open-settings/g, "x")
        .replace(/cannotSpeakNow/g, "x")
        .replace(/speech-cannot-now/g, "x"),
    }),
  );
  expectKill("19 mastery math changed", "MASTERY_MATH_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      personalMastery: base.personalMastery.replace(/createPersonalMastery/g, "x").replace(/STATE_LABEL_PT/g, "y"),
    }),
  );
  expectKill("20 curriculum freeze missing", "CURRICULUM_CHANGED", () =>
    checkRuntimeGuards({ ...base, curriculumFreeze: "" }),
  );

  console.log("PASS test:rc2-3-13d-mobile-physical-ux · 20 kills");
}

if (mode === "test") test();
else validate();
