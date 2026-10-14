#!/usr/bin/env node
/**
 * npm run gate:rc2-3-13a-cognitive-ui
 * Cognitive UI foundation — hierarchy, logout, More Options, Account IA.
 * No pedagogy / curriculum / JEV runtime / billing changes.
 */
import {
  checkAll,
  checkAccountIa,
  checkAffordanceAndTouch,
  checkDeleteNotLearningPrimary,
  checkDestructiveColorSemantics,
  checkLogoutHierarchy,
  checkMoreOptionsHierarchy,
  checkNavSheetOrder,
  checkRuntimeGuards,
  loadCognitiveSources,
} from "./lib/rc2-3-13a-cognitive-ui-gates.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:rc2-3-13a-cognitive-ui");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:rc2-3-13a-cognitive-ui · more-options rows · logout compact+confirm · account IA · nav ≤5 · JEV OFF · rc.2",
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
  const base = loadCognitiveSources();

  expectKill("1 more options multi primary", "MORE_OPTIONS_MULTI_PRIMARY", () =>
    checkMoreOptionsHierarchy({
      ...base,
      tabBar: `${base.tabBar}\nhierarchy: "primary"\nhierarchy: "primary"\nhierarchy: "primary"\n`,
    }),
  );
  expectKill("2 logout as primary CTA", "LOGOUT_AS_PRIMARY_CTA", () =>
    checkLogoutHierarchy({
      ...base,
      signOut: base.signOut.replace('data-sign-out-layout="compact"', 'data-sign-out-layout="full-width"'),
    }),
  );
  expectKill("3 delete as learning primary", "DELETE_AS_LEARNING_PRIMARY", () =>
    checkDeleteNotLearningPrimary({
      ...base,
      conta: base.conta.replace('data-testid="conta-danger-zone"', 'data-cta-hierarchy="primary" data-testid="conta-delete-account"'),
    }),
  );
  expectKill("4 see-all primary styling", "MORE_OPTIONS_PRIMARY_SEE_ALL", () =>
    checkMoreOptionsHierarchy({
      ...base,
      tabBar: base.tabBar
        .replace(
          /mais:\s*\{[\s\S]*?showSignOut:\s*true[\s\S]*?\},/,
          'mais: { title: "x", groups: [], footer: { to: "/mais", label: "x", hierarchy: "primary" as const }, showSignOut: true },',
        )
        .replace("more-sheet-see-all", "x"),
    }),
  );
  expectKill("5 settings row no affordance", "SETTINGS_ROW_NO_AFFORDANCE", () =>
    checkAffordanceAndTouch({
      ...base,
      settingsRow: base.settingsRow.replace(/IconChevron/g, "IconNope"),
    }),
  );
  expectKill("6 nav missing accessible name", "NAV_MISSING_ACCESSIBLE_NAME", () =>
    checkAffordanceAndTouch({
      ...base,
      tabBar: base.tabBar.replace(/aria-label=\{navLabel\(item, t\)\}/g, ""),
    }),
  );
  expectKill("7 touch target too small", "TOUCH_TARGET_TOO_SMALL", () =>
    checkAffordanceAndTouch({
      ...base,
      settingsRow: base.settingsRow.replace(/min-h-12/g, "min-h-6"),
    }),
  );
  expectKill("8 destructive on learning CTA", "DESTRUCTIVE_COLOR_ON_LEARNING_CTA", () =>
    checkDestructiveColorSemantics({
      ...base,
      primitives: base.primitives.replace(
        'primary:\n    "bg-accent text-white shadow-card hover:bg-accent-strong active:scale-[.98]"',
        'primary:\n    "bg-[rgb(var(--wrong))] text-white shadow-card hover:brightness-95 active:scale-[.98]"',
      ),
    }),
  );
  expectKill("9 primary behind safe area", "PRIMARY_CTA_BEHIND_SAFE_AREA", () =>
    checkAffordanceAndTouch({
      ...base,
      tabBar: base.tabBar
        .replace(/paddingBottom: "max\([^"]*app-safe-bottom[^"]*"/g, 'paddingBottom: "0"')
        .replace(/paddingBottom: "var\(--app-safe-bottom\)"/g, 'paddingBottom: "0"'),
    }),
  );
  expectKill("10 sheet no dismiss", "SHEET_NO_DISMISS", () =>
    checkAffordanceAndTouch({
      ...base,
      tabBar: base.tabBar.replace(/Escape/g, "Enter"),
    }),
  );
  expectKill("11 account IA incomplete", "ACCOUNT_IA_INCOMPLETE", () =>
    checkAccountIa({
      ...base,
      conta: base.conta.replace(/conta-profile/g, "x-profile"),
    }),
  );
  expectKill("12 nav active unlabelled", "NAV_ACTIVE_UNLABELLED", () =>
    checkAffordanceAndTouch({
      ...base,
      tabBar: base.tabBar.replace(/data-nav-active=/g, "data-x="),
    }),
  );
  expectKill("13 more sheet order wrong", "MORE_SHEET_ORDER_WRONG", () =>
    checkNavSheetOrder({
      ...base,
      nav: base.nav.replace('id: "help"', 'id: "system"'),
    }),
  );
  expectKill("14 logout no confirmation", "LOGOUT_NO_CONFIRMATION", () =>
    checkLogoutHierarchy({
      ...base,
      signOut: base.signOut
        .replace(/signOutConfirmTitle/g, "x")
        .replace(/signOutConfirmBody/g, "y")
        .replace(/signingOut/g, "z")
        .replace(/Confirm/g, "Ask"),
    }),
  );
  expectKill("15 version not rc2", "VERSION_NOT_RC2", () =>
    checkRuntimeGuards({
      ...base,
      packageJson: base.packageJson.replace("0.2.0-rc.2", "0.2.0-rc.1"),
    }),
  );
  expectKill("16 jev runtime on", "JEV_RUNTIME_ENABLED", () =>
    checkRuntimeGuards({
      ...base,
      budgetPolicy: base.budgetPolicy.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("17 ux docs missing", "UX_DOCS_MISSING", () =>
    checkRuntimeGuards({
      ...base,
      inventory: "",
    }),
  );
  expectKill("18 ux cert missing", "UX_CERT_MISSING", () =>
    checkRuntimeGuards({
      ...base,
      certification: "",
    }),
  );
  expectKill("19 sibling deploy", "ATOMURUS_TOUCHED", () => {
    const sibling = ["Ato", "murus"].join("");
    return checkRuntimeGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\ndeploy ${sibling} now\n`,
    });
  });
  expectKill("20 sheet no handle", "SHEET_NO_HANDLE", () =>
    checkAffordanceAndTouch({
      ...base,
      tabBar: base.tabBar.replace(/data-sheet-handle=/g, "data-x="),
    }),
  );

  console.log("PASS test:rc2-3-13a-cognitive-ui · 20 kills");
}

if (mode === "test") test();
else validate();
