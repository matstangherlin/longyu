/**
 * RC2.3.13H — Visual Progression & Dynamic Aula gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

export function load13hSources() {
  return {
    progressionPath: read("src/components/progression/ProgressionPath.tsx"),
    progressionBubble: read("src/components/progression/ProgressionNodeBubble.tsx"),
    progressionConnector: read("src/components/progression/ProgressionConnector.tsx"),
    progressionLabel: read("src/components/progression/ProgressionNodeLabel.tsx"),
    progressionTypes: read("src/components/progression/progressionTypes.ts"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    progressionState: read("src/lib/progressionShellState.ts"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    journeyInline: read("src/features/journey/JourneyInlineNode.tsx"),
    guidedShell: read("src/features/lesson/GuidedLessonShell.tsx"),
    dynamicSeq: read("src/features/lesson/DynamicTeachingSequence.tsx"),
    teacherBubble: read("src/features/lesson/TeacherSpeechBubble.tsx"),
    capsulePlayer: read("src/features/journey/capsule/LessonCapsulePlayer.tsx"),
    presentations: read("src/data/lessonPresentations.ts"),
    visualAssets: read("src/data/lessonVisualAssets.ts"),
    inventory: read("docs/ux/dynamic-aula-inventory.md"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    certification: read("docs/release/rc2-3-13h-certification.json"),
    report: read("docs/reports/rc2-3-13h-visual-progression-dynamic-aula.md"),
    uiFreeze: read("docs/release/pre-beta-ui-freeze.json"),
    culturePaths: read("src/data/culturePaths.ts"),
    cultureDeep: read("src/data/cultureDeepSchema.ts"),
    nav: read("src/components/layout/nav.tsx"),
    techEvents: read("src/lib/techEvents.ts"),
  };
}

export function checkSharedProgression(src = load13hSources()) {
  const errors = [];
  if (!/export function ProgressionPath/.test(src.progressionPath) || !/ProgressionPath/.test(src.cultureJourney)) {
    errors.push("CULTURE_ROW_LIST");
  }
  if (!/\bCURRENT\b/.test(src.progressionTypes) || !/\bCURRENT\b/.test(src.progressionBubble)) {
    errors.push("CULTURE_CURRENT_NO_STATE");
  }
  if (!/IconCheck/.test(src.progressionBubble) || !/progression-complete-icon/.test(src.progressionBubble)) {
    errors.push("CULTURE_COMPLETED_NO_ICON");
  }
  if (!/IconLock/.test(src.progressionBubble) || !/progression-lock-icon/.test(src.progressionBubble)) {
    errors.push("CULTURE_LOCKED_NO_LOCK");
  }
  if (!/export function ProgressionConnector/.test(src.progressionConnector) || !/ProgressionConnector/.test(src.progressionPath)) {
    errors.push("CULTURE_CONNECTOR_REMOVED");
  }
  if (!/min-h-11/.test(src.progressionBubble) || !/min-w-11/.test(src.progressionBubble)) {
    errors.push("CULTURE_TARGET_TOO_SMALL");
  }
  if (!/motion-reduce/.test(src.progressionBubble) || !/prefers-reduced-motion/.test(src.teacherBubble)) {
    errors.push("CURRENT_IGNORES_REDUCED_MOTION");
  }
  if (!/rememberProgressionAnchor/.test(src.cultureJourney) || !/writeProgressionScroll/.test(src.progressionState)) {
    errors.push("CULTURE_POSITION_RESTORE_BROKEN");
  }
  if (!/writeProgressionScroll/.test(src.progressionState) || !/readProgressionScroll/.test(src.progressionState)) {
    errors.push("JOURNEY_POSITION_RESTORE_BROKEN");
  }
  if (!/culture-path-picker-toggle[\s\S]{0,400}data-cta-hierarchy="tertiary"/.test(src.cultureJourney)) {
    errors.push("CULTURE_PATH_SELECTOR_DOMINATES");
  }
  if (!/aria-label/.test(src.progressionBubble) || !/aria-current/.test(src.progressionBubble)) {
    errors.push("JOURNEY_CURRENT_COLOR_ONLY");
  }
  if (!/IconCheck/.test(src.progressionBubble) || !/progression-complete-icon/.test(src.progressionBubble)) {
    errors.push("JOURNEY_COMPLETION_COLOR_ONLY");
  }
  if (!/\bpassRing\b/.test(src.progressionBubble) || !/progression-pass-ring/.test(src.progressionBubble)) {
    errors.push("JOURNEY_PASS_RING_RECOMPUTES");
  }
  if (/computeMastery|masteryLevel\s*=/.test(src.progressionBubble)) {
    errors.push("JOURNEY_PASS_RING_RECOMPUTES");
  }
  if (!/\bcoreAula\b/.test(src.journeyInline) || !/data-core-aula/.test(src.journeyInline + src.progressionBubble)) {
    errors.push("CORE_AULA_LABELED_OPTIONAL");
  }
  if (!/data-booster-optional/.test(src.journeyInline) || !/scale-\[0\.96\]/.test(src.journeyInline)) {
    errors.push("BOOSTER_STRONGER_THAN_CORE");
  }
  return [...new Set(errors)];
}

export function checkDynamicAula(src = load13hSources()) {
  const errors = [];
  if (!/export function DynamicTeachingSequence/.test(src.dynamicSeq) || !/DynamicTeachingSequence/.test(src.capsulePlayer)) {
    errors.push("AULA_STATIC_TEXT_ONLY");
  }
  if (!/export function TeacherSpeechBubble/.test(src.teacherBubble)) {
    errors.push("AULA_MISSING_TEACHER_BUBBLE");
  }
  if (!/finishTyping/.test(src.teacherBubble) || !/teacher-bubble-tap/.test(src.teacherBubble) || !/\bTYPING\b/.test(src.teacherBubble)) {
    errors.push("BUBBLE_ANIMATION_UNSKIPPABLE");
  }
  if (/setTimeout\(\(\)\s*=>\s*onComplete\(\)/.test(src.dynamicSeq) || /auto-advance/.test(src.dynamicSeq)) {
    errors.push("ANIMATION_AUTO_ADVANCES");
  }
  if (!/prefers-reduced-motion/.test(src.teacherBubble)) {
    errors.push("REDUCED_MOTION_STILL_TYPEWRITES");
  }
  if (!/altPt/.test(src.visualAssets) || !/\salt=\{alt\}/.test(src.dynamicSeq)) {
    errors.push("IMAGE_LACKS_ALT");
  }
  if (!/visual-fallback/.test(src.dynamicSeq) || !/\bfallback\b/.test(src.visualAssets)) {
    errors.push("VISUAL_FAILURE_BLOCKS_LESSON");
  }
  const primaryCtas = (src.dynamicSeq.match(/data-cta-hierarchy="primary"/g) || []).length;
  if (primaryCtas !== 1) errors.push("AULA_TWO_PRIMARY_CTAS");
  if (!/dynamic-aula-continue/.test(src.dynamicSeq) || !/min-h-12/.test(src.dynamicSeq)) {
    errors.push("CONTINUE_HIDDEN_SAFE_AREA");
  }
  if (/awardXp|grantXp|addXp/.test(src.dynamicSeq)) errors.push("PRESENTATION_GRANTS_XP");
  if (/updateMastery|setMastery/.test(src.dynamicSeq)) errors.push("PRESENTATION_CHANGES_MASTERY");
  if (/scheduleSrs|updateSrs/.test(src.dynamicSeq)) errors.push("PRESENTATION_CHANGES_SRS");
  if (/unlockLesson|unlockTopic/.test(src.dynamicSeq)) errors.push("PRESENTATION_UNLOCKS_CURRICULUM");
  if (!/sessionStorage/.test(src.dynamicSeq) || !/SESSION_KEY/.test(src.dynamicSeq)) {
    errors.push("RESUME_CORRUPTS_BEAT");
  }
  if (!/\bHANDOFF\b/.test(src.dynamicSeq) || !/handoffHint/.test(src.presentations) || !/capsule:foundation:tone/.test(src.presentations)) {
    errors.push("GUIDED_HANDOFF_MISSING");
  }
  if (!/GuidedPresentationProvider/.test(src.capsulePlayer) || !/GuidedDock/.test(src.dynamicSeq)) {
    errors.push("DYNAMIC_BYPASSES_GUIDED_SHELL");
  }
  return [...new Set(errors)];
}

export function checkAssets(src = load13hSources()) {
  const errors = [];
  if (/https?:\/\/(?!localhost)/.test(src.visualAssets)) errors.push("ARBITRARY_REMOTE_URL");
  if (!/LESSON_VISUAL_ASSETS/.test(src.visualAssets) || !/getLessonVisualAsset/.test(src.visualAssets)) {
    errors.push("MISSING_ASSET_REGISTRY");
  }
  for (const id of [
    "visual:tones-four-contours",
    "visual:pinyin-layers",
    "visual:hanzi-mu-tree",
    "visual:greeting-nihao",
  ]) {
    if (!src.visualAssets.includes(id)) errors.push("MISSING_ASSET_REGISTRY");
  }
  for (const file of [
    "public/assets/visuals/tones-four-contours.svg",
    "public/assets/visuals/pinyin-layers.svg",
    "public/assets/visuals/hanzi-mu-tree.svg",
    "public/assets/visuals/greeting-nihao.svg",
  ]) {
    if (!exists(file) && src.visualAssets) {
      // only enforce file existence on non-blank registry mutations that still claim assets
      if (/LESSON_VISUAL_ASSETS/.test(src.visualAssets)) errors.push("MISSING_ASSET_REGISTRY");
    }
  }
  if (!/maxBytes/.test(src.visualAssets)) errors.push("OVERSIZED_VISUAL");
  if (!/aspectRatio/.test(src.dynamicSeq) || !/width=\{640\}/.test(src.dynamicSeq)) {
    errors.push("IMAGE_LAYOUT_SHIFT");
  }
  if (!/altPt/.test(src.visualAssets)) errors.push("VISUAL_LACKS_PT");
  if (!/altEn/.test(src.visualAssets)) errors.push("VISUAL_LACKS_EN");
  return [...new Set(errors)];
}

export function checkAccessibility(src = load13hSources()) {
  const errors = [];
  if (!/aria-live/.test(src.teacherBubble) || !/teacher-bubble-text/.test(src.teacherBubble)) {
    errors.push("BUBBLE_UNREADABLE_SR");
  }
  if (!/aria-label/.test(src.dynamicSeq) || !/role="img"/.test(src.dynamicSeq)) {
    errors.push("VISUAL_ONLY_NO_EQUIVALENT");
  }
  if (!/aria-current/.test(src.progressionBubble) || !/\bCURRENT\b/.test(src.progressionTypes)) {
    errors.push("ACTIVE_BUBBLE_NO_A11Y_CURRENT");
  }
  if (!/\bLOCKED\b/.test(src.progressionBubble) || !/progression-lock/.test(src.progressionBubble) || !/aria-disabled/.test(src.progressionBubble)) {
    errors.push("LOCKED_NOT_ANNOUNCED");
  }
  if (!/motion-reduce/.test(src.progressionBubble) || !/\breduced\b/.test(src.teacherBubble)) {
    errors.push("REDUCED_MOTION_CONTRACT_BROKEN");
  }
  if (!/text-base/.test(src.teacherBubble) || !/leading-6/.test(src.teacherBubble) || !/min-w-0/.test(src.teacherBubble)) {
    errors.push("FONT_SCALE_CLIPS_BUBBLE");
  }
  if (!/min-h-12/.test(src.dynamicSeq) || !/dynamic-aula-continue/.test(src.dynamicSeq)) {
    errors.push("VIEWPORT_360_LOSES_CTA");
  }
  return [...new Set(errors)];
}

export function checkFreeze(src = load13hSources()) {
  const errors = [];
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_CHANGED");
  const v2 = (src.culturePaths.match(/id:\s*"[^"]+"/g) || []).length;
  if (v2 < 12) errors.push("CULTURE_PATH_COUNT_CHANGED");
  if (!/RC_BASE_FINGERPRINT = "29bb02ec0336"/.test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_UNEXPECTED_DRIFT");
  }
  if (/\nexport function computeMasteryScore\(\)/.test(src.personalMastery)) {
    errors.push("MASTERY_MATH_CHANGED");
  }
  if (/\nexport function nextInterval\(\)/.test(src.srs)) errors.push("SRS_CHANGED");
  if (/JEV_LEARNER_RUNTIME\s*=\s*true/.test(src.curriculumFreeze)) errors.push("JEV_RUNTIME_ON");
  if (/"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit)) errors.push("BILLING_CHANGED");
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav + src.cultureJourney + src.journeyPage)) {
    errors.push("SIBLING_PRODUCT_TOUCHED");
  }
  if (!/RC2\.3\.13H|SHARED_PROGRESSION/.test(src.certification)) errors.push("CERT_MISSING");
  if (!/Visual Progression|Dynamic Aula|shared progression/i.test(src.report)) errors.push("REPORT_MISSING");
  if (!/RC2\.3\.13H|dynamic AULA|Culture bubble/i.test(src.uiFreeze)) errors.push("UI_FREEZE_MISSING");
  if (!/DYNAMIC_PASS|foundation:mandarin|capsule:foundation/.test(src.inventory)) {
    errors.push("INVENTORY_MISSING");
  }
  return [...new Set(errors)];
}

export function checkAll(src = load13hSources()) {
  return [
    ...checkSharedProgression(src),
    ...checkDynamicAula(src),
    ...checkAssets(src),
    ...checkAccessibility(src),
    ...checkFreeze(src),
  ];
}
