/**
 * Pure checkers for gate:rc2-3-13e-progression-shell-culture.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

const STEREOTYPE_RE = /chineses sempre|na China todo mundo|chineses nunca/i;

export function loadProgressionShellSources() {
  return {
    shell: read("src/components/progression/ProgressionShell.tsx"),
    shellState: read("src/lib/progressionShellState.ts"),
    policy: read("src/lib/cultureJourneyPolicy.ts"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    cultureAtlas: read("src/features/culture/CultureAtlasPage.tsx"),
    cultureHub: read("src/features/culture/CultureHubPage.tsx"),
    routes: read("src/routes.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    tabBar: read("src/components/layout/TabBar.tsx"),
    deep: read("src/data/cultureDeepSchema.ts"),
    bridges: read("src/data/cultureJourneyBridges.ts"),
    proAccess: read("src/lib/proAccess.ts"),
    phaseChallenge: read("src/lib/phaseChallenge.ts"),
    personalMastery: read("src/lib/mastery/personalMastery.ts"),
    srs: read("src/lib/srs.ts"),
    budgetPolicy: read("supabase/functions/_shared/budgetPolicy.ts"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    certification: read("docs/release/rc2-3-13e-ux-certification.json"),
    contentPlan: read("docs/culture/CULTURE_V2_CONTENT_PLAN.md"),
    report: read("docs/reports/rc2-3-13e-progression-culture.md"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
  };
}

export function checkShellAndSwitch(src = loadProgressionShellSources()) {
  const errors = [];
  if (!/role="tablist"/.test(src.shell) || !/progression-tab-journey/.test(src.shell) || !/progression-tab-culture/.test(src.shell)) {
    errors.push("UNLABELED_PROGRESSION_SWITCH");
  }
  if (!/aria-selected/.test(src.shell)) errors.push("SWITCH_NO_SELECTED_STATE");
  if (!/min-h-11/.test(src.shell)) errors.push("SWITCH_TOUCH_TOO_SMALL");
  if (!/sr-only/.test(src.shell) && !/selectedSuffix/.test(src.shell)) errors.push("SWITCH_TALKBACK_SILENT");
  if (!/motion-reduce:transition-none/.test(src.shell)) errors.push("REDUCED_MOTION_BREAKS_SWITCH");
  if (!/bg-accent/.test(src.shell) || !/aria-selected/.test(src.shell)) {
    errors.push("ACTIVE_STATE_COLOR_ONLY");
  }
  return [...new Set(errors)];
}

export function checkNavAndRoutes(src = loadProgressionShellSources()) {
  const errors = [];
  const bar = (src.nav.match(/export function mobileNavForStage[\s\S]*?\n\}/) || [""])[0];
  const tabs = [...bar.matchAll(/NAV\.(\w+)/g)].map((m) => m[1]);
  if (tabs.length > 5) errors.push("CULTURE_SIXTH_TAB");
  if ((tabs.filter((t) => t === "cultura").length + (tabs.includes("cultura") ? 0 : 0)) > 1) {
    errors.push("CULTURE_SIXTH_TAB");
  }
  // Sixth-tab mutation: duplicate culture entry
  if (/NAV\.cultura,\s*\n\s*NAV\.cultura/.test(bar)) errors.push("CULTURE_SIXTH_TAB");
  if (!/cultura\/explorar/.test(src.routes)) errors.push("ATLAS_ROUTE_MISSING");
  if (!/CultureHubPage|CultureJourneyPage/.test(src.routes + src.cultureHub)) {
    errors.push("CULTURE_ROUTE_BROKEN");
  }
  if (!/path:\s*"jornada"/.test(src.routes)) errors.push("JOURNEY_ROUTE_BROKEN");
  if (!/ProgressionShell/.test(src.journeyPage)) errors.push("JOURNEY_SHELL_MISSING");
  if (!/ProgressionShell/.test(src.cultureJourney)) errors.push("CULTURE_SHELL_MISSING");
  return [...new Set(errors)];
}

export function checkPositionRestore(src = loadProgressionShellSources()) {
  const errors = [];
  if (!/journeyAnchor/.test(src.shellState) || !/cultureAnchor/.test(src.shellState)) {
    errors.push("SHARED_SCROLL_ONLY");
  }
  if (!/writeProgressionAnchor/.test(src.shellState + src.shell + src.cultureJourney)) {
    errors.push("JOURNEY_STATE_LOST");
  }
  if (!/readProgressionAnchor/.test(src.shell + src.shellState)) {
    errors.push("CULTURE_STATE_LOST");
  }
  if (!/replace:\s*true/.test(src.shell)) errors.push("HISTORY_POLLUTION");
  return [...new Set(errors)];
}

export function checkCultureHierarchy(src = loadProgressionShellSources()) {
  const errors = [];
  if (!/data-cta-hierarchy="primary"/.test(src.cultureJourney)) {
    errors.push("CULTURE_MULTI_PRIMARY");
  }
  const primaries = (src.cultureJourney.match(/data-cta-hierarchy="primary"/g) || []).length;
  if (primaries > 1) errors.push("CULTURE_MULTI_PRIMARY");
  if (/data-cta-hierarchy="primary"[\s\S]{0,200}culture-explore-atlas/.test(src.cultureJourney)) {
    errors.push("EXPLORE_DOMINATES_CONTINUE");
  }
  if (
    /culture-review-cta[\s\S]{0,80}data-cta-hierarchy="primary"/.test(src.cultureJourney) ||
    /data-cta-hierarchy="primary"[\s\S]{0,80}culture-review-cta/.test(src.cultureJourney)
  ) {
    errors.push("REVIEW_DOMINATES_CONTINUE");
  }
  if (!/culture-explore-atlas|cultura\/explorar/.test(src.cultureJourney)) {
    errors.push("ATLAS_SECONDARY_MISSING");
  }
  return [...new Set(errors)];
}

export function checkNonBlockingAndMastery(src = loadProgressionShellSources()) {
  const errors = [];
  if (!/CULTURE_MAY_BLOCK_JOURNEY\s*=\s*false/.test(src.policy)) {
    errors.push("CULTURE_BLOCKS_JOURNEY");
  }
  if (!/cultureBlocksJourney\(\)/.test(src.proAccess + src.journeyPage + src.phaseChallenge)) {
    errors.push("CULTURE_BLOCKS_JOURNEY");
  }
  if (/completeCultureItem[\s\S]{0,200}personalMastery|markLanguageMastered/.test(src.cultureJourney)) {
    errors.push("CULTURE_MARKS_LANGUAGE_MASTERED");
  }
  if (!/createPersonalMastery|STATE_LABEL_PT/.test(src.personalMastery)) {
    errors.push("MASTERY_MATH_CHANGED");
  }
  if (!/export function dueItems|export function grade/.test(src.srs)) {
    errors.push("SRS_CHANGED");
  }
  return [...new Set(errors)];
}

export function checkDeepContent(src = loadProgressionShellSources()) {
  const errors = [];
  if (!/FLAGSHIP_DEEP/.test(src.deep) || !/CULTURE_FLAGSHIP_DEEP/.test(src.deep)) {
    errors.push("FLAGSHIP_CONTENT_MISSING");
  }
  if (!/sourceRequired:\s*true/.test(src.deep)) errors.push("DEEP_CLAIM_NO_SOURCE");
  if (!src.contentPlan || !/Vida cotidiana|WeChat|面子/.test(src.contentPlan)) {
    errors.push("CONTENT_PLAN_MISSING");
  }
  // Stereotype phrases in deep bodies without review flag → fail
  const bodies = src.deep;
  if (STEREOTYPE_RE.test(bodies)) {
    // allowed only inside stereotypeReviewFlags arrays
    const withoutFlags = bodies.replace(/stereotypeReviewFlags:\s*\[[^\]]*\]/g, "");
    if (STEREOTYPE_RE.test(withoutFlags)) errors.push("STEREOTYPE_ACCEPTED");
  }
  if (!src.certification || !/PROGRESSION_SHELL_PASS/.test(src.certification)) {
    errors.push("UX_CERT_MISSING");
  }
  if (!src.report) errors.push("REPORT_MISSING");
  return [...new Set(errors)];
}

export function checkRuntimeGuards(src = loadProgressionShellSources()) {
  const errors = [];
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (!/DISABLED_FOR_BETA/.test(src.billingAudit)) errors.push("BILLING_CHANGED");
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b(deploy|apply)\\s+${sibling}\\b`, "i").test(src.oaDeploy)) {
    errors.push("ATOMURUS_TOUCHED");
  }
  if (!src.curriculumFreeze) errors.push("CURRICULUM_CHANGED");
  // Locked culture incorrectly exposed: primary CTA must not point at locked seal-only content without nextId
  if (/data-cta-hierarchy="primary"[\s\S]{0,120}🔒/.test(src.cultureJourney)) {
    errors.push("LOCKED_CULTURE_EXPOSED");
  }
  if (!/cultureBridgeForLesson|CULTURE_JOURNEY_BRIDGES|JourneyCultureBridge/.test(src.bridges + src.journeyPage)) {
    // bridges catalog must still exist for 13E bridge tests
    if (!/CULTURE_JOURNEY_BRIDGES/.test(src.bridges)) errors.push("BRIDGE_CATALOG_MISSING");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadProgressionShellSources()) {
  return [
    ...checkShellAndSwitch(src),
    ...checkNavAndRoutes(src),
    ...checkPositionRestore(src),
    ...checkCultureHierarchy(src),
    ...checkNonBlockingAndMastery(src),
    ...checkDeepContent(src),
    ...checkRuntimeGuards(src),
  ];
}
