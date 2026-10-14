#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13b-home-cognitive
 * Home Cognitive Redesign — Continue → Today → Mandarim → Explore.
 * No pedagogy / curriculum / JEV runtime / billing / sibling projects.
 */
import {
  checkAll,
  checkContinuePrimary,
  checkHierarchyAndA11y,
  checkMasterySnapshot,
  checkRuntimeGuards,
  checkTodayRules,
  loadHomeCognitiveSources,
} from "./lib/rc2-3-13b-home-cognitive-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13b-home-cognitive");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13b-home-cognitive · Continue primary · Today one+explain · mastery snapshot · Explore gated · JEV OFF",
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
  const base = loadHomeCognitiveSources();

  expectKill("1 two primary CTAs", "TWO_PRIMARY_CTAS", () =>
    checkContinuePrimary({
      ...base,
      journey: `${base.journey}\nlocalizedReviewSessionLabel(reviewSplit, t)\n`,
    }),
  );
  expectKill("2 continue missing", "CONTINUE_MISSING", () =>
    checkContinuePrimary({
      ...base,
      blocks: base.blocks.replace(/home-continue/g, "x-continue"),
    }),
  );
  expectKill("3 dead continue new user", "DEAD_CONTINUE_NEW_USER", () =>
    checkContinuePrimary({
      ...base,
      resolver: base.resolver.replace(/START_FIRST/g, "X_FIRST"),
      blocks: base.blocks.replace(/home\.startFirstLesson/g, "journey.continue"),
    }),
  );
  expectKill("4 today duplicates continue", "TODAY_DUPLICATES_CONTINUE", () =>
    checkTodayRules({
      ...base,
      resolver: base.resolver.replace(/href === continueRec\.href/g, "href === 'never'"),
    }),
  );
  expectKill("5 today store/league", "TODAY_SHOWS_STORE_OR_LEAGUE", () => {
    const idx = base.resolver.indexOf("export function resolveTodayRecommendation");
    const mutated =
      base.resolver.slice(0, idx) +
      base.resolver.slice(idx).replace(
        "export function resolveTodayRecommendation",
        'export function resolveTodayRecommendation /* /loja /ligas */',
      );
    // Inject into today function body.
    const withRoute = mutated.replace(
      "if (reviewDueCount > 0 && !continueIsReview)",
      'if (false) { return { href: "/loja", surface: "store" as const }; }\n  if (reviewDueCount > 0 && !continueIsReview)',
    );
    return checkTodayRules({ ...base, resolver: withRoute });
  });
  expectKill("6 today uses jev", "TODAY_USES_JEV", () =>
    checkTodayRules({
      ...base,
      resolver: `${base.resolver}\nfunction callJev() {}\n`,
    }),
  );
  expectKill("7 explore exposes locked", "EXPLORE_EXPOSES_LOCKED", () =>
    checkTodayRules({
      ...base,
      resolver: base.resolver.replace(/cultureAvailable/g, "cultureAlways").replace(/afterTopicId/g, "topicRef"),
    }),
  );
  expectKill("8 mastery invents state", "MASTERY_INVENTS_STATE", () =>
    checkMasterySnapshot({
      ...base,
      resolver: `${base.resolver}\n// Mastery 2.0 inventState\n`,
      blocks: base.blocks.replace(/STATE_LABEL_PT/g, "FAKE_LABELS"),
    }),
  );
  expectKill("9 mastery recomputes", "MASTERY_RECOMPUTES_AUTHORITY", () =>
    checkMasterySnapshot({
      ...base,
      journey: base.journey.replace(/useLearnerMastery/g, "useFakeMastery"),
      resolver: base.resolver
        .replace(/getStrongTargets/g, "xStrong")
        .replace(/getWeakTargets/g, "xWeak")
        .replace(/getDevelopingTargets/g, "xDev")
        .replace(/getReviewDueTargets/g, "xRev"),
    }),
  );
  expectKill("10 promo before continue", "PROMO_BEFORE_CONTINUE", () =>
    checkHierarchyAndA11y({
      ...base,
      journey: base.journey
        .replace("<ProOfferBanner", "<XOffer")
        .replace(
          "<HomeContinueCard",
          '<ProOfferBanner offer={null} onDismiss={() => {}}\n          <HomeContinueCard',
        ),
    }),
  );
  expectKill("11 gamification dominates", "GAMIFICATION_DOMINATES", () =>
    checkHierarchyAndA11y({
      ...base,
      journey: base.journey.replace(
        /<HomeCompactChrome[\s\S]*?<HomeContinueCard/,
        '<JourneyMobileChips mission={undefined} streak={1} completedCount={0} totalLessons={1} />\n          <HomeCompactChrome greeting="x" streak={1} offline={false} />\n          <HomeContinueCard',
      ),
    }),
  );
  expectKill("12 inaccessible card", "INACCESSIBLE_CARD", () =>
    checkHierarchyAndA11y({
      ...base,
      blocks: base.blocks
        .replace(/aria-labelledby="home-continue-heading"/g, "")
        .replace(/home-continue-cta/g, "x-cta"),
    }),
  );
  expectKill("13 tiny touch target", "TINY_TOUCH_TARGET", () =>
    checkHierarchyAndA11y({
      ...base,
      blocks: base.blocks.replace(/min-h-12/g, "min-h-6").replace(/min-h-11/g, "min-h-6"),
    }),
  );
  expectKill("14 route regression", "ROUTE_REGRESSION", () =>
    checkRuntimeGuards({
      ...base,
      journey: base.journey.replace(/routeForLesson/g, "goLesson").replace(/\/licao\//g, "/x/"),
    }),
  );
  expectKill("15 jev runtime on", "JEV_RUNTIME_ENABLED", () =>
    checkRuntimeGuards({
      ...base,
      budgetPolicy: base.budgetPolicy.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("16 billing changed", "BILLING_CHANGED", () =>
    checkRuntimeGuards({
      ...base,
      billingAudit: base.billingAudit.replace(/DISABLED_FOR_BETA/g, "ENABLED"),
    }),
  );
  expectKill("17 sibling project touched", "ATOMURUS_TOUCHED", () => {
    const sibling = ["Ato", "murus"].join("");
    return checkRuntimeGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\ndeploy ${sibling} now\n`,
    });
  });
  expectKill("18 ux cert missing", "UX_CERT_MISSING", () =>
    checkRuntimeGuards({
      ...base,
      certification: "",
    }),
  );
  expectKill("19 ux docs missing", "UX_DOCS_MISSING", () =>
    checkRuntimeGuards({
      ...base,
      audit: "",
      report: "",
    }),
  );
  expectKill("20 cta hierarchy broken", "CTA_HIERARCHY_BROKEN", () =>
    checkContinuePrimary({
      ...base,
      blocks: base.blocks.replace(/data-cta-hierarchy="secondary"/g, 'data-cta-hierarchy="primary"'),
    }),
  );
  expectKill("21 today no explainability", "TODAY_NO_EXPLAINABILITY", () =>
    checkTodayRules({
      ...base,
      blocks: base.blocks.replace(/home-today-reason/g, "x-reason"),
    }),
  );
  expectKill("22 today missing", "TODAY_MISSING", () =>
    checkTodayRules({
      ...base,
      blocks: base.blocks.replace(/home-today/g, "x-today"),
      resolver: base.resolver.replace(/resolveTodayRecommendation/g, "resolveX"),
    }),
  );

  console.log("PASS test:rc2-3-13b-home-cognitive · 22 kills");
}

if (mode === "test") test();
else validate();
