#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13e-progression-shell-culture
 */
import {
  checkAll,
  checkShellAndSwitch,
  checkNavAndRoutes,
  checkPositionRestore,
  checkCultureHierarchy,
  checkNonBlockingAndMastery,
  checkDeepContent,
  checkRuntimeGuards,
  loadProgressionShellSources,
} from "./lib/rc2-3-13e-progression-shell-culture-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13e-progression-shell-culture");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13e-progression-shell-culture · shell · restore · culture journey · non-blocking · flagships · JEV OFF",
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
  const base = loadProgressionShellSources();

  expectKill("1 unlabeled switch", "UNLABELED_PROGRESSION_SWITCH", () =>
    checkShellAndSwitch({ ...base, shell: base.shell.replace(/role="tablist"/g, 'role="group"').replace(/progression-tab-journey/g, "x") }),
  );
  expectKill("2 culture sixth tab", "CULTURE_SIXTH_TAB", () =>
    checkNavAndRoutes({
      ...base,
      nav: base.nav.replace(
        /export function mobileNavForStage[\s\S]*?\n\}/,
        `export function mobileNavForStage() {\n  return [\n    NAV.jornada,\n    NAV.treino,\n    NAV.cultura,\n    NAV.cultura,\n    NAV.missoes,\n    NAV.mais,\n  ];\n}`,
      ),
    }),
  );
  expectKill("3 journey state lost", "JOURNEY_STATE_LOST", () =>
    checkPositionRestore({
      ...base,
      shellState: base.shellState.replace(/writeProgressionAnchor/g, "writeX"),
      shell: base.shell.replace(/writeProgressionAnchor/g, "writeX"),
      cultureJourney: base.cultureJourney.replace(/rememberProgressionAnchor|writeProgressionAnchor/g, "x"),
    }),
  );
  expectKill("4 culture state lost", "CULTURE_STATE_LOST", () =>
    checkPositionRestore({
      ...base,
      shell: base.shell.replace(/readProgressionAnchor/g, "readX"),
      shellState: base.shellState.replace(/readProgressionAnchor/g, "readX"),
    }),
  );
  expectKill("5 shared scroll only", "SHARED_SCROLL_ONLY", () =>
    checkPositionRestore({
      ...base,
      shellState: base.shellState.replace(/journeyAnchor/g, "xAnchor").replace(/cultureAnchor/g, "yAnchor"),
    }),
  );
  expectKill("6 culture blocks journey", "CULTURE_BLOCKS_JOURNEY", () =>
    checkNonBlockingAndMastery({
      ...base,
      policy: base.policy.replace(/CULTURE_MAY_BLOCK_JOURNEY\s*=\s*false/, "CULTURE_MAY_BLOCK_JOURNEY = true"),
    }),
  );
  expectKill("7 culture marks language mastered", "CULTURE_MARKS_LANGUAGE_MASTERED", () =>
    checkNonBlockingAndMastery({
      ...base,
      cultureJourney: `${base.cultureJourney}\ncompleteCultureItem(); markLanguageMastered();\n`,
    }),
  );
  expectKill("8 locked exposed", "LOCKED_CULTURE_EXPOSED", () =>
    checkRuntimeGuards({
      ...base,
      cultureJourney: `${base.cultureJourney}\n<button data-cta-hierarchy="primary">🔒 locked</button>\n`,
    }),
  );
  expectKill("9 multi primary", "CULTURE_MULTI_PRIMARY", () =>
    checkCultureHierarchy({
      ...base,
      cultureJourney: `${base.cultureJourney}\n<a data-cta-hierarchy="primary">x</a>\n`,
    }),
  );
  expectKill("10 explore dominates", "EXPLORE_DOMINATES_CONTINUE", () =>
    checkCultureHierarchy({
      ...base,
      cultureJourney: base.cultureJourney.replace(
        'data-cta-hierarchy="primary"',
        'data-cta-hierarchy="primary" culture-explore-atlas',
      ),
    }),
  );
  expectKill("11 review dominates", "REVIEW_DOMINATES_CONTINUE", () =>
    checkCultureHierarchy({
      ...base,
      cultureJourney: base.cultureJourney.replace(
        'data-testid="culture-review-cta"\n                data-cta-hierarchy="secondary"',
        'data-testid="culture-review-cta"\n                data-cta-hierarchy="primary"',
      ),
    }),
  );
  expectKill("12 journey route broken", "JOURNEY_ROUTE_BROKEN", () =>
    checkNavAndRoutes({ ...base, routes: base.routes.replace(/path:\s*"jornada"/, 'path: "xornada"') }),
  );
  expectKill("13 old deep link / atlas", "ATLAS_ROUTE_MISSING", () =>
    checkNavAndRoutes({ ...base, routes: base.routes.replace(/cultura\/explorar/g, "cultura/x") }),
  );
  expectKill("14 culture route broken", "CULTURE_ROUTE_BROKEN", () =>
    checkNavAndRoutes({
      ...base,
      routes: base.routes.replace(/CultureHubPage/g, "XPage"),
      cultureHub: "export const x = 1",
    }),
  );
  expectKill("15 switch touch", "SWITCH_TOUCH_TOO_SMALL", () =>
    checkShellAndSwitch({ ...base, shell: base.shell.replace(/min-h-11/g, "min-h-8") }),
  );
  expectKill("16 active color only", "ACTIVE_STATE_COLOR_ONLY", () =>
    checkShellAndSwitch({ ...base, shell: base.shell.replace(/aria-selected/g, "data-sel").replace(/bg-accent/g, "bg-x") }),
  );
  expectKill("17 talkback silent", "SWITCH_TALKBACK_SILENT", () =>
    checkShellAndSwitch({
      ...base,
      shell: base.shell.replace(/sr-only/g, "x").replace(/selectedSuffix/g, "x"),
    }),
  );
  expectKill("18 reduced motion", "REDUCED_MOTION_BREAKS_SWITCH", () =>
    checkShellAndSwitch({ ...base, shell: base.shell.replace(/motion-reduce:transition-none/g, "x") }),
  );
  expectKill("19 stereotype accepted", "STEREOTYPE_ACCEPTED", () =>
    checkDeepContent({
      ...base,
      deep: `${base.deep}\nconst bad = "chineses sempre fazem isso";\n`,
    }),
  );
  expectKill("20 deep claim no source", "DEEP_CLAIM_NO_SOURCE", () =>
    checkDeepContent({ ...base, deep: base.deep.replace(/sourceRequired:\s*true/g, "sourceRequired: false") }),
  );
  expectKill("21 mastery math", "MASTERY_MATH_CHANGED", () =>
    checkNonBlockingAndMastery({ ...base, personalMastery: "export const x = 1" }),
  );
  expectKill("22 srs changed", "SRS_CHANGED", () =>
    checkNonBlockingAndMastery({ ...base, srs: "export const x = 1" }),
  );
  expectKill("23 jev on", "JEV_RUNTIME_ENABLED", () =>
    checkRuntimeGuards({
      ...base,
      budgetPolicy: base.budgetPolicy.replace(/JEV_RUNTIME_ENABLED:\s*false/, "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("24 billing", "BILLING_CHANGED", () =>
    checkRuntimeGuards({ ...base, billingAudit: "{}" }),
  );
  expectKill("25 sibling touched", "ATOMURUS_TOUCHED", () => {
    const sibling = ["Ato", "murus"].join("");
    return checkRuntimeGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\nPlease deploy ${sibling} now\n`,
    });
  });
  expectKill("26 flagship missing", "FLAGSHIP_CONTENT_MISSING", () =>
    checkDeepContent({ ...base, deep: "export const x = 1" }),
  );
  expectKill("27 cert missing", "UX_CERT_MISSING", () =>
    checkDeepContent({ ...base, certification: "" }),
  );

  console.log("PASS test:rc2-3-13e-progression-shell-culture · 27 kills");
}

if (mode === "test") test();
else validate();
