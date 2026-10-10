/**
 * RC2.3.13G — Navigation convergence + beta feedback + learner health gates.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function load13gSources() {
  return {
    nav: read("src/components/layout/nav.tsx"),
    tabBar: read("src/components/layout/TabBar.tsx"),
    progressionShell: read("src/components/progression/ProgressionShell.tsx"),
    progressionState: read("src/lib/progressionShellState.ts"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    routes: read("src/routes.tsx"),
    techEvents: read("src/lib/techEvents.ts"),
    betaEvents: read("src/lib/beta/betaEvents.ts"),
    microFeedback: read("src/lib/beta/betaMicroFeedback.ts"),
    safeDiagnostics: read("src/lib/beta/safeDiagnostics.ts"),
    microSheet: read("src/components/feedback/MicroFeedbackSheet.tsx"),
    feedback: read("src/lib/feedback.ts"),
    feedbackModal: read("src/components/feedback/FeedbackModal.tsx"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    healthModel: read("docs/beta/BETA_HEALTH_MODEL.md"),
    healthSchema: read("docs/beta/beta-health-schema.json"),
    certification: read("docs/release/rc2-3-13g-certification.json"),
    report: read("docs/reports/rc2-3-13g-beta-feedback-learner-health.md"),
    uiFreeze: read("docs/release/pre-beta-ui-freeze.json"),
    culturePaths: read("src/data/culturePaths.ts"),
    cultureDeep: read("src/data/cultureDeepSchema.ts"),
    progressiveDiscovery: read("src/lib/progressiveDiscovery.ts"),
  };
}

export function checkNavConvergence(src = load13gSources()) {
  const errors = [];
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  const tabs = [...bar.matchAll(/NAV\.(\w+)/g)].map((m) => m[1]);
  if (tabs.includes("cultura")) errors.push("CULTURE_BOTTOM_TAB_FORBIDDEN");
  if (JSON.stringify(tabs) !== JSON.stringify(["jornada", "treino", "missoes", "mais"])) {
    errors.push("TABBAR_ITEMS_WRONG");
  }
  if (!/data-testid="progression-tab-culture"/.test(src.progressionShell)) {
    errors.push("CULTURE_PROGRESSION_SWITCH_REQUIRED");
  }
  if (!/data-testid="progression-tab-journey"/.test(src.progressionShell)) {
    errors.push("JOURNEY_PROGRESSION_SWITCH_REQUIRED");
  }
  if (!/path:\s*"cultura"/.test(src.routes) && !/"cultura"/.test(src.routes)) {
    errors.push("CULTURE_ROUTE_BROKEN");
  }
  if (!/path:\s*"jornada"/.test(src.routes)) errors.push("JOURNEY_ROUTE_BROKEN");
  if (!/item\.to === "\/jornada"/.test(src.nav) || !/pathname === "\/cultura"/.test(src.nav)) {
    errors.push("NAV_PARENT_INACTIVE_ON_CULTURE");
  }
  if (!/min-h-11/.test(src.progressionShell)) errors.push("SWITCH_TOUCH_TOO_SMALL");
  if (!/aria-selected/.test(src.progressionShell) || !/sr-only/.test(src.progressionShell)) {
    errors.push("ACTIVE_STATE_COLOR_ONLY");
  }
  if (!/writeProgressionScroll/.test(src.progressionState) || !/readProgressionScroll/.test(src.progressionState)) {
    errors.push("POSITION_RESTORE_BROKEN");
  }
  if (!/navigationPlacement:\s*"journey"/.test(src.progressiveDiscovery)) {
    errors.push("CULTURE_STILL_TAB_DISCOVERY");
  }
  return [...new Set(errors)];
}

export function checkFeedbackAndTelemetry(src = load13gSources()) {
  const errors = [];
  if (!/BETA_EVENT_SCHEMA_VERSION/.test(src.betaEvents)) errors.push("NO_EVENT_SCHEMA_VERSION");
  if (!/eventId/.test(src.betaEvents)) errors.push("NO_EVENT_ID");
  if (!/sanitizeBetaEvent/.test(src.betaEvents)) errors.push("EVENT_SANITIZER_MISSING");
  if (!/FORBIDDEN_KEY_RE/.test(src.betaEvents) || !/stroke|email|token/i.test(src.betaEvents + src.safeDiagnostics)) {
    errors.push("PII_PROTECTION_MISSING");
  }
  if (!/resolveFirstMandarinEvent/.test(src.betaEvents)) errors.push("FIRST_MANDARIN_MISSING");
  if (!/culture_first_switch/.test(src.techEvents + src.progressionShell)) {
    errors.push("CULTURE_DISCOVERY_MISSING");
  }
  if (!/first_lesson_completed/.test(src.techEvents + src.betaEvents)) {
    errors.push("FIRST_LESSON_COMPLETE_MISSING");
  }
  if (!/practice_first_open/.test(src.techEvents + src.betaEvents)) {
    errors.push("PRACTICE_DISCOVERY_MISSING");
  }
  if (!/mastery_first_open/.test(src.techEvents + src.betaEvents)) {
    errors.push("MASTERY_DISCOVERY_MISSING");
  }
  if (!/isMicroFeedbackBlocked/.test(src.microFeedback) || !/BlockedLearningContext/.test(src.microFeedback)) {
    errors.push("SURVEY_DURING_LESSON_ALLOWED");
  }
  if (!/MICRO_FEEDBACK_EVERY_N_COMPLETIONS/.test(src.microFeedback)) {
    errors.push("SURVEY_EVERY_COMPLETION");
  }
  if (!/micro-feedback-dismiss/.test(src.microSheet)) {
    errors.push("SURVEY_NOT_DISMISSIBLE");
  }
  if (!/microFeedbackAwardsReward[\s\S]*return false/.test(src.microFeedback)) {
    errors.push("POSITIVE_ANSWER_AWARDS_XP");
  }
  if (!/buildSafeDiagnostics/.test(src.safeDiagnostics)) errors.push("SAFE_DIAGNOSTICS_MISSING");
  if (!/function makeDiagnosticId/.test(src.betaEvents)) {
    errors.push("DIAGNOSTIC_ID_MISSING");
  }
  if (!/"fala"/.test(src.feedback) || !/"cultura"/.test(src.feedback) || !/"hanzi"/.test(src.feedback)) {
    errors.push("REPORT_CATEGORIES_THIN");
  }
  if (!/BETA_HEALTH_MODEL|activated testers/i.test(src.healthModel)) errors.push("HEALTH_MODEL_MISSING");
  if (!/beta_health\/1/.test(src.healthSchema)) errors.push("HEALTH_SCHEMA_MISSING");
  return [...new Set(errors)];
}

export function checkFreeze(src = load13gSources()) {
  const errors = [];
  if (!/RC_BASE_FINGERPRINT = "29bb02ec0336"/.test(src.curriculumFreeze)) {
    errors.push("FINGERPRINT_UNEXPECTED_DRIFT");
  }
  if (!/cultureItems:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_COUNT_CHANGED");
  if (!/cultureNativeLessons:\s*36/.test(src.curriculumFreeze)) errors.push("CULTURE_NATIVE_CHANGED");
  if (!/journeyCultureNodes:\s*20/.test(src.curriculumFreeze)) errors.push("JOURNEY_CULTURE_NODES_CHANGED");
  if (!/culturePaths:\s*12/.test(src.curriculumFreeze) && !/CULTURE_V2_PATHS/.test(src.culturePaths)) {
    errors.push("CULTURE_PATH_COUNT_CHANGED");
  }
  const pathCount = [...src.culturePaths.matchAll(/id:\s*"[a-z0-9_]+"/g)].length;
  if (pathCount && pathCount !== 12) errors.push("CULTURE_PATH_COUNT_CHANGED");
  if (!/FLAGSHIP_DEEP/.test(src.cultureDeep)) errors.push("FLAGSHIP_COUNT_CHANGED");
  if (!/lessons:\s*134/.test(src.curriculumFreeze)) errors.push("MANDARIN_LESSON_COUNT_CHANGED");
  if (!/teachingTopics:\s*113/.test(src.curriculumFreeze)) errors.push("MANDARIN_TOPIC_COUNT_CHANGED");
  if (/export function computeMasteryScore\s*\([^)]*\)\s*\{[^}]{0,40}return\s+0/.test(src.personalMastery)) {
    errors.push("MASTERY_MATH_CHANGED");
  }
  if (/export function nextInterval\s*\([^)]*\)\s*\{\s*return\s+99999/.test(src.srs)) {
    errors.push("SRS_CHANGED");
  }
  if (/"enabled"\s*:\s*true/.test(src.billingAudit) && /BILLING_ENABLED/.test(src.billingAudit)) {
    errors.push("BILLING_CHANGED");
  }
  if (/JEV_LEARNER_RUNTIME\s*=\s*true|learnerRuntime:\s*true/.test(src.curriculumFreeze)) {
    errors.push("JEV_RUNTIME_ON");
  }
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b${sibling}\\b`, "i").test(src.nav + src.progressionShell + src.betaEvents)) {
    errors.push("SIBLING_PRODUCT_TOUCHED");
  }
  if (src.certification.length < 40) errors.push("CERT_MISSING");
  if (src.report.length < 100) errors.push("REPORT_MISSING");
  if (src.uiFreeze.length < 40) errors.push("UI_FREEZE_MISSING");
  if (!/CULTURE IS NOT A BOTTOM NAV ITEM|not a bottom nav/i.test(src.uiFreeze + src.report)) {
    errors.push("NAV_FREEZE_STATEMENT_MISSING");
  }
  return [...new Set(errors)];
}

export function checkAll(src = load13gSources()) {
  return [...checkNavConvergence(src), ...checkFeedbackAndTelemetry(src), ...checkFreeze(src)];
}
