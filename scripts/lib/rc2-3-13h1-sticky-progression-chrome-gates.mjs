/**
 * RC2.3.13H.1 — Sticky progression chrome gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function load13h1Sources() {
  return {
    topBar: read("src/components/layout/TopBar.tsx"),
    appShell: read("src/components/layout/AppShell.tsx"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    progressionState: read("src/lib/progressionShellState.ts"),
    indexCss: read("src/index.css"),
    layers: read("src/components/ui/layers.ts"),
    modal: read("src/components/ui/ModalOverlay.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    dynamicSeq: read("src/features/lesson/DynamicTeachingSequence.tsx"),
    teacherBubble: read("src/features/lesson/TeacherSpeechBubble.tsx"),
    guidedShell: read("src/features/lesson/GuidedLessonShell.tsx"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    certification: read("docs/release/rc2-3-13h1-sticky-chrome-certification.json"),
    report: read("docs/reports/rc2-3-13h1-sticky-progression-chrome.md"),
    uiFreeze: read("docs/release/pre-beta-ui-freeze.json"),
    culturePaths: read("src/data/culturePaths.ts"),
  };
}

export function checkStickyChrome(src = load13h1Sources()) {
  const errors = [];
  if (!/sticky top-0/.test(src.topBar) || !/data-testid="global-topbar"/.test(src.topBar)) {
    errors.push("GLOBAL_TOPBAR_SCROLLS_AWAY");
  }
  if (!/\bsticky\b/.test(src.progressionShell) || !/progression-sticky-offset/.test(src.progressionShell)) {
    errors.push("PROGRESSION_SWITCH_SCROLLS_AWAY");
  }
  // ClassName contract only — ignore comments that mention the forbidden pattern.
  const shellWithoutComments = src.progressionShell
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  if (/sticky\s+top-0/.test(shellWithoutComments)) {
    errors.push("SWITCH_ABOVE_TOPBAR");
  }
  if (!/progression-sticky-offset/.test(src.progressionShell)) {
    errors.push("SWITCH_ABOVE_TOPBAR");
  }
  if (!/scroll-padding-top/.test(src.indexCss) || !/--progression-sticky-height/.test(src.indexCss)) {
    errors.push("PROGRESSION_OBSCURED_BY_SWITCH");
  }
  if (!/main\[data-app-main\]:has\(\[data-progression-shell\]\)/.test(src.indexCss)) {
    errors.push("PROGRESSION_OBSCURED_BY_SWITCH");
  }
  if (
    !/--progression-switch-height/.test(src.indexCss) ||
    !/--progression-sticky-height/.test(src.indexCss) ||
    !/--progression-sticky-offset/.test(src.indexCss)
  ) {
    errors.push("MAGIC_TOP_OFFSETS");
  }
  if (!/--app-safe-top/.test(src.indexCss) || !/app-safe-top|--app-safe-top|pt-\[var\(--app-safe-top\)\]/.test(src.topBar)) {
    errors.push("SAFE_TOP_IGNORED");
  }
  if (!/writeProgressionScroll/.test(src.progressionState) || !/readProgressionScroll/.test(src.progressionState)) {
    errors.push("JOURNEY_SCROLL_STATE_LOST");
  }
  if (!/writeProgressionAnchor/.test(src.progressionState) || !/readProgressionAnchor/.test(src.progressionState)) {
    errors.push("CULTURE_SCROLL_STATE_LOST");
  }
  if (!/export type ProgressionMode/.test(src.progressionState)) {
    errors.push("SHARED_SCROLL_POSITION");
  }
  if (/import \{[^}]*TopBar|<TopBar\b/.test(src.progressionShell)) {
    errors.push("GLOBAL_TOPBAR_REMOUNTS");
  }
  if (!/BrandWordmark/.test(src.topBar)) errors.push("BRANDING_JUMPS");
  if (!/useStore/.test(src.topBar) || !/\bpoints\b/.test(src.topBar) || !/\bstreak\b/.test(src.topBar)) {
    errors.push("COUNTERS_STALE_SNAPSHOT");
  }
  if (!/topbar-avatar/.test(src.topBar) || !/to="\/perfil"/.test(src.topBar)) {
    errors.push("PROFILE_ACTION_BROKEN");
  }
  if (!/h-12 w-12/.test(src.topBar)) errors.push("PROFILE_TARGET_TOO_SMALL");
  if (!/min-h-11/.test(src.progressionShell)) errors.push("SWITCH_TARGET_TOO_SMALL");
  if (!/\bbg-bg\b/.test(src.topBar) || !/\bbg-bg\b/.test(src.progressionShell)) {
    errors.push("STICKY_CHROME_TRANSPARENT");
  }
  if (!/z-\[80\]|modal: "z-\[80\]"/.test(src.layers + src.modal) || !/--z-modal:\s*80/.test(src.indexCss)) {
    errors.push("MODAL_BELOW_STICKY");
  }
  if (!/\bfocusMode\b/.test(src.appShell) || !/<TopBar\s*\/>/.test(src.appShell)) {
    errors.push("LESSON_SHOWS_DUPLICATE_CHROME");
  }
  if (!/z-\[25\]/.test(src.topBar)) {
    // TopBar must sit above switch z-20
    errors.push("SWITCH_ABOVE_TOPBAR");
  }
  return [...new Set(errors)];
}

export function checkPreservation(src = load13h1Sources()) {
  const errors = [];
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  if (/NAV\.cultura/.test(bar)) errors.push("CULTURE_BOTTOM_TAB_RETURNS");
  if (!/pathname === "\/cultura"/.test(src.nav) || !/item\.to === "\/jornada"/.test(src.nav)) {
    errors.push("NAV_PARENT_ACTIVE_BREAKS");
  }
  if (!/ProgressionNodeBubble/.test(src.journeyPage)) errors.push("JOURNEY_BUBBLE_V2_GONE");
  if (!/ProgressionPath/.test(src.cultureJourney)) errors.push("CULTURE_BUBBLES_REGRESS");
  if (!/DynamicTeachingSequence/.test(src.dynamicSeq) || !/TeacherSpeechBubble/.test(src.teacherBubble + src.guidedShell)) {
    errors.push("DYNAMIC_AULA_REGRESSED");
  }
  if (!/motion-reduce/.test(src.progressionShell)) {
    errors.push("REDUCED_MOTION_BREAKS_SELECTOR");
  }
  return [...new Set(errors)];
}

export function checkFreeze(src = load13h1Sources()) {
  const errors = [];
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_CHANGED");
  if (!/RC_BASE_FINGERPRINT = "29bb02ec0336"/.test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_CHANGED");
  }
  if (/\nexport function computeMasteryScore\(\)/.test(src.personalMastery)) {
    errors.push("MASTERY_MATH_CHANGED");
  }
  if (/\nexport function nextInterval\(\)/.test(src.srs)) errors.push("SRS_CHANGED");
  if (/"enabled": true, "BILLING_ENABLED": true/.test(src.billingAudit)) errors.push("BILLING_CHANGED");
  if (/JEV_LEARNER_RUNTIME\s*=\s*true/.test(src.curriculumFreeze)) errors.push("JEV_RUNTIME_ON");
  if (new RegExp(["Ato", "murus"].join("")).test(src.nav + src.topBar + src.progressionShell)) {
    errors.push("SIBLING_PRODUCT_TOUCHED");
  }
  if (!/RC2\.3\.13H\.1|GLOBAL_TOPBAR_STICKY/.test(src.certification)) errors.push("CERT_MISSING");
  if (!/sticky|Global TopBar|progression chrome/i.test(src.report)) errors.push("REPORT_MISSING");
  if (!/RC2\.3\.13H\.1|sticky|GLOBAL TOP BAR/i.test(src.uiFreeze)) errors.push("UI_FREEZE_MISSING");
  const v2 = (src.culturePaths.match(/id:\s*"[^"]+"/g) || []).length;
  if (v2 < 12) errors.push("CULTURE_PATH_COUNT_CHANGED");
  return [...new Set(errors)];
}

export function checkAll(src = load13h1Sources()) {
  return [...checkStickyChrome(src), ...checkPreservation(src), ...checkFreeze(src)];
}
