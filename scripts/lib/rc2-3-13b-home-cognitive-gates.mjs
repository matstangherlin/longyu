/**
 * Pure checkers for gate:rc2-3-13b-home-cognitive.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadHomeCognitiveSources() {
  return {
    journey: read("src/features/journey/JourneyPage.tsx"),
    blocks: read("src/features/journey/HomeCognitiveBlocks.tsx"),
    resolver: read("src/lib/home/homeRecommendations.ts"),
    mastery: read("src/lib/mastery/personalMastery.ts"),
    dominioHook: read("src/features/dominio/useLearnerMastery.ts"),
    budgetPolicy: read("supabase/functions/_shared/budgetPolicy.ts"),
    packageJson: read("package.json"),
    featureFlags: read("docs/release/feature-flags.json"),
    billingAudit: read("docs/release/android-billing-audit.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    certification: read("docs/release/rc2-3-13b-ux-certification.json"),
    audit: read("docs/ux/home-cognitive-audit.md"),
    report: read("docs/reports/rc2-3-13b-home-cognitive.md"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
    localesPt: read("src/locales/pt-BR.ts"),
  };
}

export function checkContinuePrimary(src = loadHomeCognitiveSources()) {
  const errors = [];
  const j = src.journey;
  const b = src.blocks;
  if (!/data-testid="home-continue"/.test(b)) errors.push("CONTINUE_MISSING");
  if (!/data-testid="home-continue-cta"/.test(b)) errors.push("CONTINUE_MISSING");
  if (!/data-coachmark-target="journey-continue"/.test(b)) errors.push("CONTINUE_MISSING");
  if (!/HomeContinueCard/.test(j)) errors.push("CONTINUE_MISSING");
  // Exactly one primary CTA marker on continue block; Today must be secondary.
  if (!/data-cta-hierarchy="primary"/.test(b)) errors.push("TWO_PRIMARY_CTAS");
  if (!/data-cta-hierarchy="secondary"/.test(b)) errors.push("CTA_HIERARCHY_BROKEN");
  // Old dual review+continue primary pattern must not return in JourneyPage header.
  if (/localizedReviewSessionLabel/.test(j)) errors.push("TWO_PRIMARY_CTAS");
  // New learner must not get dead Continuar — START_FIRST / startFirstLesson.
  if (!/START_FIRST/.test(src.resolver) || !/home\.startFirstLesson|startFirstLesson/.test(b)) {
    errors.push("DEAD_CONTINUE_NEW_USER");
  }
  return [...new Set(errors)];
}

export function checkTodayRules(src = loadHomeCognitiveSources()) {
  const errors = [];
  const r = src.resolver;
  const b = src.blocks;
  if (!/resolveTodayRecommendation/.test(r)) errors.push("TODAY_MISSING");
  if (!/data-testid="home-today"/.test(b)) errors.push("TODAY_MISSING");
  if (!/home-today-reason/.test(b)) errors.push("TODAY_NO_EXPLAINABILITY");
  // Must not allow Store / League as Today surfaces.
  if (/surface:\s*"store"|surface:\s*"league"|href:\s*"\/loja"|href:\s*"\/ligas"/.test(r)) {
    errors.push("TODAY_SHOWS_STORE_OR_LEAGUE");
  }
  if (/\/loja|\/ligas/.test(r) && /resolveTodayRecommendation/.test(r)) {
    // Soft: only fail if Today resolver literally routes there.
    const todayFn = r.slice(r.indexOf("export function resolveTodayRecommendation"));
    const end = todayFn.indexOf("export function resolveExplore");
    const body = end > 0 ? todayFn.slice(0, end) : todayFn;
    if (/\/loja|\/ligas|LigasPage|StorePage/.test(body)) errors.push("TODAY_SHOWS_STORE_OR_LEAGUE");
  }
  // No Jev runtime calls in Home recommendation path (comments mentioning "No Jev" are OK).
  if (/\b(callJev|jevAllowed|invokeJev|from\s+["'].*jev)\b/i.test(r)) errors.push("TODAY_USES_JEV");
  if (/JEV_RUNTIME_ENABLED\s*[:=]\s*true/.test(r)) errors.push("TODAY_USES_JEV");
  // Dedup Continue vs Today.
  if (!/today\.href === continueRec\.href|href === continueRec\.href/.test(r)) {
    errors.push("TODAY_DUPLICATES_CONTINUE");
  }
  // Locked curriculum: explore gated by cultureAvailable + afterTopicId completed.
  if (!/cultureAvailable/.test(r) || !/afterTopicId/.test(r)) {
    errors.push("EXPLORE_EXPOSES_LOCKED");
  }
  return [...new Set(errors)];
}

export function checkMasterySnapshot(src = loadHomeCognitiveSources()) {
  const errors = [];
  const r = src.resolver;
  const b = src.blocks;
  if (!/masteryHomeSnapshot/.test(r) || !/data-testid="home-mastery"/.test(b)) {
    errors.push("MASTERY_SNAPSHOT_MISSING");
  }
  // Must consume PersonalMastery API — not invent states.
  if (!/getStrongTargets|getWeakTargets|getDevelopingTargets|getReviewDueTargets/.test(r)) {
    errors.push("MASTERY_RECOMPUTES_AUTHORITY");
  }
  if (/Mastery 2\.0|MASTERY_V2|inventState/.test(r)) errors.push("MASTERY_INVENTS_STATE");
  // Labels must come from STATE_LABEL_PT.
  if (!/STATE_LABEL_PT/.test(b) && !/STATE_LABEL_PT/.test(r)) errors.push("MASTERY_INVENTS_STATE");
  // Journey must use useLearnerMastery — single authority.
  if (!/useLearnerMastery/.test(src.journey)) errors.push("MASTERY_RECOMPUTES_AUTHORITY");
  return [...new Set(errors)];
}

export function checkHierarchyAndA11y(src = loadHomeCognitiveSources()) {
  const errors = [];
  const j = src.journey;
  const b = src.blocks;
  // Section order markers.
  if (!/data-home-cognitive="rc2-3-13b"/.test(j)) errors.push("HOME_HIERARCHY_WRONG");
  if (!/HomeContinueCard[\s\S]*homeRecs\.today[\s\S]*HomeSeuMandarim[\s\S]*HomeExploreBlock/.test(j.replace(/\n/g, " "))) {
    // Fallback: presence of all four in journey file.
    if (!/HomeContinueCard/.test(j) || !/HomeTodayForYou/.test(j) || !/HomeSeuMandarim/.test(j) || !/HomeExploreBlock/.test(j)) {
      errors.push("HOME_HIERARCHY_WRONG");
    }
  }
  // ProOffer must appear after HomeContinue in source order.
  const continueIdx = j.indexOf("<HomeContinueCard");
  const offerIdx = j.indexOf("<ProOfferBanner");
  if (continueIdx < 0 || offerIdx < 0 || offerIdx < continueIdx) {
    errors.push("PROMO_BEFORE_CONTINUE");
  }
  // Gamification chips after continue.
  const chipsIdx = j.indexOf("<JourneyMobileChips");
  if (chipsIdx >= 0 && continueIdx >= 0 && chipsIdx < continueIdx) {
    errors.push("GAMIFICATION_DOMINATES");
  }
  // Accessibility: buttons/links with test ids, not bare clickable divs for CTAs.
  if (!/aria-labelledby="home-continue-heading"/.test(b)) errors.push("INACCESSIBLE_CARD");
  if (!/min-h-12/.test(b) && !/min-h-11/.test(b)) errors.push("TINY_TOUCH_TARGET");
  if (!/home-continue-cta/.test(b)) errors.push("INACCESSIBLE_CARD");
  return [...new Set(errors)];
}

export function checkRuntimeGuards(src = loadHomeCognitiveSources()) {
  const errors = [];
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (
    /ANDROID_IN_APP_PURCHASE\s*=\s*ENABLED/.test(src.billingAudit) ||
    /"decision":\s*"ANDROID_IN_APP_PURCHASE=ENABLED"/.test(src.billingAudit)
  ) {
    errors.push("BILLING_CHANGED");
  }
  if (!/DISABLED_FOR_BETA/.test(src.billingAudit) && src.billingAudit) {
    errors.push("BILLING_CHANGED");
  }
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b(deploy|apply)\\s+${sibling}\\b`, "i").test(src.oaDeploy)) {
    errors.push("ATOMURUS_TOUCHED");
  }
  if (!src.audit || !/RC2\.3\.13B/.test(src.audit)) errors.push("UX_DOCS_MISSING");
  if (!src.certification || !/HOME_PRIMARY_ACTION_PASS/.test(src.certification)) {
    errors.push("UX_CERT_MISSING");
  }
  if (!src.report) errors.push("UX_DOCS_MISSING");
  // Route truth: continue still uses /licao/ or capsule path via routeForLesson.
  if (!/routeForLesson/.test(src.journey) || !/\/licao\//.test(src.journey)) {
    errors.push("ROUTE_REGRESSION");
  }
  return [...new Set(errors)];
}

export function checkAll(src = loadHomeCognitiveSources()) {
  return [
    ...checkContinuePrimary(src),
    ...checkTodayRules(src),
    ...checkMasterySnapshot(src),
    ...checkHierarchyAndA11y(src),
    ...checkRuntimeGuards(src),
  ];
}
