#!/usr/bin/env node
/**
 * RC2.3.13H — validate + ≥50 mutation kills.
 */
import { checkAll, load13hSources } from "./lib/rc2-3-13h-visual-progression-dynamic-aula-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${from.slice(0, 80)}`);
    process.exitCode = 1;
  }
  return { ...src, [key]: src[key].split(from).join(to) };
}

function blank(src, key) {
  return { ...src, [key]: "" };
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
  console.log("PASS validate:rc2-3-13h-visual-progression-dynamic-aula · progression · aula · freeze");
}

function test() {
  const base = load13hSources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // PROGRESSION (15)
  k("Culture row list", "CULTURE_ROW_LIST", blank(base, "progressionPath"));
  k("Culture current no state", "CULTURE_CURRENT_NO_STATE", mutate(base, "progressionTypes", "CURRENT", "NOW"));
  k("Culture completed no icon", "CULTURE_COMPLETED_NO_ICON", mutate(base, "progressionBubble", "IconCheck", "IconNope"));
  k("Culture locked no lock", "CULTURE_LOCKED_NO_LOCK", mutate(base, "progressionBubble", "IconLock", "IconNope"));
  k("Culture connector removed", "CULTURE_CONNECTOR_REMOVED", blank(base, "progressionConnector"));
  k("Culture target <44px", "CULTURE_TARGET_TOO_SMALL", mutate(base, "progressionBubble", "min-h-11", "min-h-8"));
  k("current ignores reduced motion", "CURRENT_IGNORES_REDUCED_MOTION", mutate(base, "progressionBubble", "motion-reduce", "motion-x"));
  k("Culture position restore", "CULTURE_POSITION_RESTORE_BROKEN", mutate(base, "cultureJourney", "rememberProgressionAnchor", "rememberGone"));
  k("Journey position restore", "JOURNEY_POSITION_RESTORE_BROKEN", mutate(base, "progressionState", "writeProgressionScroll", "writeGoneScroll"));
  k("Culture path selector dominates", "CULTURE_PATH_SELECTOR_DOMINATES", mutate(base, "cultureJourney", 'data-cta-hierarchy="tertiary"', 'data-cta-hierarchy="primary"'));
  k("Journey current color-only", "JOURNEY_CURRENT_COLOR_ONLY", mutate(base, "progressionBubble", "aria-current", "data-current-x"));
  k("Journey completion color-only", "JOURNEY_COMPLETION_COLOR_ONLY", mutate(base, "progressionBubble", "progression-complete-icon", "gone-icon"));
  k("Journey 4-pass recomputes", "JOURNEY_PASS_RING_RECOMPUTES", mutate(base, "progressionBubble", "passRing", "xRing"));
  k("core AULA labeled optional", "CORE_AULA_LABELED_OPTIONAL", mutate(base, "journeyInline", "coreAula", "optionalFake"));
  k("booster stronger than core", "BOOSTER_STRONGER_THAN_CORE", mutate(base, "journeyInline", "data-booster-optional", "data-booster-x"));

  // DYNAMIC AULA (20)
  k("AULA static text-only", "AULA_STATIC_TEXT_ONLY", blank(base, "dynamicSeq"));
  k("missing teacher bubble", "AULA_MISSING_TEACHER_BUBBLE", blank(base, "teacherBubble"));
  k("bubble animation unskippable", "BUBBLE_ANIMATION_UNSKIPPABLE", mutate(base, "teacherBubble", "finishTyping", "finishGone"));
  k("animation auto-advances", "ANIMATION_AUTO_ADVANCES", {
    ...base,
    dynamicSeq: `${base.dynamicSeq}\nsetTimeout(() => onComplete(), 10);\n`,
  });
  k("reduced motion still typewrites", "REDUCED_MOTION_STILL_TYPEWRITES", mutate(base, "teacherBubble", "prefers-reduced-motion", "prefers-extra-motion"));
  k("image lacks alt", "IMAGE_LACKS_ALT", mutate(base, "dynamicSeq", "alt=", "data-alt="));
  k("visual failure blocks", "VISUAL_FAILURE_BLOCKS_LESSON", mutate(base, "dynamicSeq", "visual-fallback", "visual-x"));
  k("two primary CTAs", "AULA_TWO_PRIMARY_CTAS", {
    ...base,
    dynamicSeq: `${base.dynamicSeq}\ndata-cta-hierarchy="primary"\n`,
  });
  k("Continue hidden safe area", "CONTINUE_HIDDEN_SAFE_AREA", mutate(base, "dynamicSeq", "dynamic-aula-continue", "dynamic-aula-x"));
  k("presentation grants XP", "PRESENTATION_GRANTS_XP", { ...base, dynamicSeq: `${base.dynamicSeq}\nawardXp(10);\n` });
  k("presentation changes Mastery", "PRESENTATION_CHANGES_MASTERY", { ...base, dynamicSeq: `${base.dynamicSeq}\nupdateMastery(id);\n` });
  k("presentation changes SRS", "PRESENTATION_CHANGES_SRS", { ...base, dynamicSeq: `${base.dynamicSeq}\nscheduleSrs(id);\n` });
  k("presentation unlocks curriculum", "PRESENTATION_UNLOCKS_CURRICULUM", { ...base, dynamicSeq: `${base.dynamicSeq}\nunlockLesson(id);\n` });
  k("resume corrupts beat", "RESUME_CORRUPTS_BEAT", mutate(base, "dynamicSeq", "SESSION_KEY", "OTHER_KEY"));
  k("guided handoff missing", "GUIDED_HANDOFF_MISSING", mutate(base, "presentations", "handoffHint", "hintX"));
  k("bypasses GuidedLessonShell", "DYNAMIC_BYPASSES_GUIDED_SHELL", mutate(base, "capsulePlayer", "GuidedPresentationProvider", "PlainProvider"));
  k("AULA missing teacher export", "AULA_MISSING_TEACHER_BUBBLE", mutate(base, "teacherBubble", "export function TeacherSpeechBubble", "function TeacherSpeechBubble"));
  k("static aula capsule", "AULA_STATIC_TEXT_ONLY", mutate(base, "capsulePlayer", "DynamicTeachingSequence", "LegacySequence"));
  k("handoff foundation tone", "GUIDED_HANDOFF_MISSING", mutate(base, "presentations", "capsule:foundation:tone", "capsule:foundation:gone"));
  k("bubble tap gone", "BUBBLE_ANIMATION_UNSKIPPABLE", mutate(base, "teacherBubble", "TYPING", "WAITING"));

  // ASSETS (6)
  k("arbitrary remote URL", "ARBITRARY_REMOTE_URL", {
    ...base,
    visualAssets: `${base.visualAssets}\nsrc: "https://evil.example/x.png",\n`,
  });
  k("missing asset registry", "MISSING_ASSET_REGISTRY", blank(base, "visualAssets"));
  k("oversized visual", "OVERSIZED_VISUAL", mutate(base, "visualAssets", "maxBytes", "xBytes"));
  k("image layout shift", "IMAGE_LAYOUT_SHIFT", mutate(base, "dynamicSeq", "aspectRatio", "ratioX"));
  k("visual lacks PT", "VISUAL_LACKS_PT", mutate(base, "visualAssets", "altPt", "xPt"));
  k("visual lacks EN", "VISUAL_LACKS_EN", mutate(base, "visualAssets", "altEn", "xEn"));

  // A11Y (7)
  k("bubble unreadable SR", "BUBBLE_UNREADABLE_SR", mutate(base, "teacherBubble", "aria-live", "aria-x"));
  k("visual-only no equivalent", "VISUAL_ONLY_NO_EQUIVALENT", mutate(base, "dynamicSeq", 'role="img"', "role=x"));
  k("active bubble no a11y current", "ACTIVE_BUBBLE_NO_A11Y_CURRENT", mutate(base, "progressionBubble", "aria-current", "aria-x"));
  k("locked not announced", "LOCKED_NOT_ANNOUNCED", mutate(base, "progressionBubble", "aria-disabled", "aria-x"));
  k("reduced motion contract", "REDUCED_MOTION_CONTRACT_BROKEN", mutate(base, "progressionBubble", "motion-reduce", "motion-x"));
  k("font scale clips", "FONT_SCALE_CLIPS_BUBBLE", mutate(base, "teacherBubble", "text-base", "text-x"));
  k("360 loses CTA", "VIEWPORT_360_LOSES_CTA", mutate(base, "dynamicSeq", "min-h-12", "min-h-6"));

  // FREEZE (14)
  k("lesson count", "LESSON_COUNT_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count", "TOPIC_COUNT_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("Culture count", "CULTURE_COUNT_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("Culture path count", "CULTURE_PATH_COUNT_CHANGED", blank(base, "culturePaths"));
  k("fingerprint drift", "FINGERPRINT_UNEXPECTED_DRIFT", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "cc66373bb602"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("Mastery math", "MASTERY_MATH_CHANGED", { ...base, personalMastery: `${base.personalMastery}\nexport function computeMasteryScore() { return 0; }\n` });
  k("SRS changes", "SRS_CHANGED", { ...base, srs: `${base.srs}\nexport function nextInterval() { return 99999; }\n` });
  k("JEV runtime ON", "JEV_RUNTIME_ON", { ...base, curriculumFreeze: `${base.curriculumFreeze}\nexport const JEV_LEARNER_RUNTIME = true;\n` });
  k("billing changes", "BILLING_CHANGED", { ...base, billingAudit: `${base.billingAudit.replace(/\}$/, "")}, "enabled": true, "BILLING_ENABLED": true }` });
  k("sibling touched", "SIBLING_PRODUCT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("cert missing", "CERT_MISSING", blank(base, "certification"));
  k("report missing", "REPORT_MISSING", blank(base, "report"));
  k("UI freeze missing", "UI_FREEZE_MISSING", blank(base, "uiFreeze"));
  k("inventory missing", "INVENTORY_MISSING", blank(base, "inventory"));

  if (!process.exitCode) console.log(`PASS test:rc2-3-13h-visual-progression-dynamic-aula · ${n} kills`);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
