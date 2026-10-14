/**
 * RC2.3.13R — typography + motion closure gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function load13rSources() {
  return {
    indexCss: read("src/index.css"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    progressionState: read("src/lib/progressionShellState.ts"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    primitives: read("src/components/ui/primitives.tsx"),
    page: read("src/components/ui/page.tsx"),
    revisao: read("src/features/revisao/RevisaoPage.tsx"),
    topBar: read("src/components/layout/TopBar.tsx"),
    packageJson: read("package.json"),
    typeInventory: read("docs/ux/final-typography-inventory.md"),
    motionDoc: read("docs/ux/final-motion-system.md"),
    certification: read("docs/release/final-pre-beta-certification.json"),
    report: read("docs/reports/final-ui-motion-closure.md"),
    uiFreeze: read("docs/release/pre-beta-ui-freeze.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    teacherBubble: read("src/features/lesson/TeacherSpeechBubble.tsx"),
    dynamicSeq: read("src/features/lesson/DynamicTeachingSequence.tsx"),
  };
}

function hasCssRole(css, role) {
  return new RegExp(`\\.${role}\\s*\\{`).test(css);
}

export function checkTypography(src = load13rSources()) {
  const errors = [];
  for (const role of [
    "type-page-title",
    "type-card-title",
    "type-body",
    "type-supporting",
    "type-eyebrow",
    "type-button",
    "type-pinyin",
  ]) {
    if (!hasCssRole(src.indexCss, role)) errors.push("TYPOGRAPHY_SYSTEM_MISSING");
  }
  if (!hasCssRole(src.indexCss, "type-mandarin-example")) {
    errors.push("MANDARIN_TOO_SMALL");
  }
  if (!/\btype-page-title\b/.test(src.progressionShell)) errors.push("PAGE_TITLE_INCONSISTENT");
  if (!/\btype-page-title\b/.test(src.page) || !/\btype-page-title\b/.test(src.primitives)) {
    errors.push("PAGE_TITLE_INCONSISTENT");
  }
  if (!/\btype-card-title\b/.test(src.cultureJourney)) errors.push("CULTURE_CARD_TITLE_WRONG");
  if (!/\btype-eyebrow\b/.test(src.cultureJourney)) errors.push("EYEBROW_BECOMES_BODY");
  if (!/\btype-button\b/.test(src.primitives)) errors.push("CTA_TYPOGRAPHY_DIVERGES");
  if (!/\btype-eyebrow\b/.test(src.revisao) || !/\btype-page-title\b/.test(src.revisao)) {
    errors.push("REVIEW_PROMPT_INCONSISTENT");
  }
  if (!/\btype-label\b/.test(src.cultureJourney) || !/data-cta-hierarchy="primary"/.test(src.cultureJourney)) {
    errors.push("SECONDARY_STRONGER_THAN_PRIMARY");
  }
  if (!/type-page-title/.test(src.typeInventory)) errors.push("TYPOGRAPHY_INVENTORY_MISSING");
  return [...new Set(errors)];
}

export function checkMotion(src = load13rSources()) {
  const errors = [];
  for (const tok of ["--motion-fast", "--motion-normal", "--ease-enter", "--ease-standard"]) {
    if (!src.indexCss.includes(tok)) errors.push("MOTION_SYSTEM_MISSING");
  }
  if (!/\bprogression-panel-enter\b/.test(src.progressionShell)) {
    errors.push("JOURNEY_CULTURE_TRANSITION_REMOVED");
  }
  if (!/data-enter=\{enter\}/.test(src.progressionShell)) {
    errors.push("JOURNEY_CULTURE_TRANSITION_REMOVED");
  }
  if (!/writeProgressionLastMode/.test(src.progressionShell)) {
    errors.push("JOURNEY_CULTURE_TRANSITION_REMOVED");
  }
  if (!/export function progressionEnterDirection/.test(src.progressionState)) {
    errors.push("JOURNEY_CULTURE_TRANSITION_REMOVED");
  }
  if (!/data-motion="segment-indicator"/.test(src.progressionShell)) {
    errors.push("SEGMENT_INDICATOR_SNAPS");
  }
  if (!/useLayoutEffect/.test(src.progressionShell)) errors.push("SCROLL_RESTORE_FLASH");
  if (!/\bculture-path-card-enter\b/.test(src.cultureJourney)) {
    errors.push("CULTURE_PATH_TRANSITION_REMOVED");
  }
  if (!/\.culture-path-card-enter\b/.test(src.indexCss)) {
    errors.push("CULTURE_PATH_TRANSITION_REMOVED");
  }
  if (!/progression-panel-enter\[data-enter/.test(src.indexCss) || !/longyu-fade-in/.test(src.indexCss)) {
    errors.push("REDUCED_MOTION_STILL_SLIDES");
  }
  if (/framer-motion|"gsap"/.test(src.packageJson)) errors.push("REDUNDANT_MOTION_DEPENDENCY");
  if (/import \{[^}]*TopBar|<TopBar\b/.test(src.progressionShell)) {
    errors.push("GLOBAL_TOPBAR_ANIMATES");
  }
  if (!/TeacherSpeechBubble/.test(src.teacherBubble) || !/DynamicTeachingSequence/.test(src.dynamicSeq)) {
    errors.push("DYNAMIC_AULA_REGRESSED");
  }
  if (!/motion tokens|Journey ↔ Culture|reduced-motion/i.test(src.motionDoc)) {
    errors.push("MOTION_DOC_MISSING");
  }
  return [...new Set(errors)];
}

export function checkFreeze(src = load13rSources()) {
  const errors = [];
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("LESSON_COUNT_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("TOPIC_COUNT_CHANGED");
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_CHANGED");
  if (!/RC_BASE_FINGERPRINT = "29bb02ec0336"/.test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_CHANGED");
  }
  if (!/RC2\.3\.13R|TYPOGRAPHY_SYSTEM|MOTION_SYSTEM/.test(src.certification)) {
    errors.push("CERT_MISSING");
  }
  if (!/typography|motion|Journey/i.test(src.report)) errors.push("REPORT_MISSING");
  if (!/RC2\.3\.13R|typography|motion/i.test(src.uiFreeze)) errors.push("UI_FREEZE_MISSING");
  if (
    !/"learnerRuntimeSha"/.test(src.certification) ||
    !/"certificationHeadSha"/.test(src.certification) ||
    !/"artifactSourceSha"/.test(src.certification)
  ) {
    errors.push("SHA_SEMANTICS_MISSING");
  }
  if (!/"learnerRuntimeSha"/.test(src.uiFreeze)) errors.push("SHA_SEMANTICS_MISSING");
  return [...new Set(errors)];
}

export function checkAll(src = load13rSources()) {
  return [...checkTypography(src), ...checkMotion(src), ...checkFreeze(src)];
}
