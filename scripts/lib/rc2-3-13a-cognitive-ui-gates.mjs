/**
 * Pure checkers for gate:rc2-3-13a-cognitive-ui.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export function loadCognitiveSources() {
  return {
    tabBar: read("src/components/layout/TabBar.tsx"),
    more: read("src/features/more/MorePage.tsx"),
    conta: read("src/features/conta/ContaPage.tsx"),
    nav: read("src/components/layout/nav.tsx"),
    signOut: read("src/components/account/SignOutControl.tsx"),
    settingsRow: read("src/components/ui/SettingsRow.tsx"),
    primitives: read("src/components/ui/primitives.tsx"),
    budgetPolicy: read("supabase/functions/_shared/budgetPolicy.ts"),
    packageJson: read("package.json"),
    featureFlags: read("docs/release/feature-flags.json"),
    curriculumFreeze: read("src/lib/curriculumFreeze.ts"),
    certification: read("docs/release/rc2-3-13a-ux-certification.json"),
    inventory: read("docs/ux/cognitive-ui-inventory.md"),
    homeAudit: read("docs/ux/home-cognitive-audit.md"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
  };
}

export function checkMoreOptionsHierarchy(src = loadCognitiveSources()) {
  const errors = [];
  const tab = src.tabBar;
  const primaryFooter = (tab.match(/data-cta-hierarchy=\{footer\.hierarchy\}|data-cta-hierarchy="primary"/g) ?? []).length;
  const maisBlock = /mais:\s*\{[\s\S]*?showSignOut:\s*true[\s\S]*?\},/.exec(tab)?.[0] ?? "";
  if (!/hierarchy:\s*"tertiary"/.test(maisBlock) || !/more-sheet-see-all/.test(tab)) {
    errors.push("MORE_OPTIONS_PRIMARY_SEE_ALL");
  }
  if (/hierarchy:\s*"primary"/.test(maisBlock)) errors.push("MORE_OPTIONS_PRIMARY_SEE_ALL");
  if (!/data-cognitive-sheet=\{showSignOut \? "more-options"/.test(tab) && !/data-cognitive-sheet="more-options"/.test(tab)) {
    errors.push("MORE_OPTIONS_PRIMARY_SEE_ALL");
  }
  // More Options = settings rows; practice sheet keeps RC2.2.13 compact 2-col grid.
  if (!/data-settings-row=/.test(tab)) errors.push("MORE_OPTIONS_CARD_GRID");
  if (!/data-cognitive-sheet=\{showSignOut \? "more-options"/.test(tab)) {
    errors.push("MORE_OPTIONS_CARD_GRID");
  }
  // Bifurcation required: showSignOut → rows, else → grid-cols-2 (not card grid for Mais).
  if (
    !/showSignOut \? \([\s\S]*?data-settings-row=[\s\S]*?\) : \([\s\S]*?grid grid-cols-2 gap-2/.test(tab)
  ) {
    errors.push("MORE_OPTIONS_CARD_GRID");
  }
  if ((tab.match(/hierarchy:\s*"primary"/g) ?? []).length > 2) errors.push("MORE_OPTIONS_MULTI_PRIMARY");
  return [...new Set(errors)];
}

export function checkLogoutHierarchy(src = loadCognitiveSources()) {
  const errors = [];
  const so = src.signOut;
  const more = src.more;
  const conta = src.conta;
  const tab = src.tabBar;
  if (!/data-sign-out-layout="compact"/.test(so)) errors.push("LOGOUT_AS_PRIMARY_CTA");
  if (!/data-cta-hierarchy="destructive"/.test(so)) errors.push("LOGOUT_AS_PRIMARY_CTA");
  if (/data-sign-out-layout="full-width"/.test(more) || /data-sign-out-layout="full-width"/.test(conta)) {
    errors.push("LOGOUT_AS_PRIMARY_CTA");
  }
  if (!/SignOutControl/.test(more) || !/SignOutControl/.test(conta) || !/SignOutControl/.test(tab)) {
    errors.push("LOGOUT_AS_PRIMARY_CTA");
  }
  if (!/signOutConfirmTitle|Confirm/.test(so)) errors.push("LOGOUT_NO_CONFIRMATION");
  // Filled danger on the trigger row is forbidden (confirm button may use variant=danger).
  const trigger = so.slice(0, so.indexOf("ModalOverlay") >= 0 ? so.indexOf("ModalOverlay") : so.length);
  if (/bg-\[rgb\(var\(--wrong\)\)\]|variant=["']danger["']/.test(trigger)) {
    errors.push("LOGOUT_AS_PRIMARY_CTA");
  }
  return [...new Set(errors)];
}

export function checkDeleteNotLearningPrimary(src = loadCognitiveSources()) {
  const errors = [];
  const conta = src.conta;
  if (!/data-testid="conta-danger-zone"/.test(conta)) errors.push("DELETE_AS_LEARNING_PRIMARY");
  if (/data-cta-hierarchy="primary"[\s\S]{0,120}conta-delete|conta-delete[\s\S]{0,80}bg-accent/.test(conta)) {
    errors.push("DELETE_AS_LEARNING_PRIMARY");
  }
  return errors;
}

export function checkAccountIa(src = loadCognitiveSources()) {
  const errors = [];
  const conta = src.conta;
  for (const id of ["conta-profile", "conta-security", "conta-appearance", "conta-sign-out"]) {
    if (!conta.includes(id)) errors.push("ACCOUNT_IA_INCOMPLETE");
  }
  if (!/SettingsGroup|SettingsRow/.test(conta)) errors.push("ACCOUNT_IA_INCOMPLETE");
  if (!/data-cognitive-account=/.test(conta)) errors.push("ACCOUNT_IA_INCOMPLETE");
  return [...new Set(errors)];
}

export function checkNavSheetOrder(src = loadCognitiveSources()) {
  const errors = [];
  const sheet = src.nav;
  const fn = sheet.slice(sheet.indexOf("export function moreMobileSheetGroups"));
  const pushes = [...fn.matchAll(/groups\.push\(\{ id: "(\w+)"/g)].map((m) => m[1]);
  if (JSON.stringify(pushes) !== JSON.stringify(["you", "progress", "help"])) {
    errors.push("MORE_SHEET_ORDER_WRONG");
  }
  return errors;
}

export function checkAffordanceAndTouch(src = loadCognitiveSources()) {
  const errors = [];
  if (!/min-h-12/.test(src.settingsRow)) errors.push("TOUCH_TARGET_TOO_SMALL");
  if (!/IconChevron/.test(src.settingsRow)) errors.push("SETTINGS_ROW_NO_AFFORDANCE");
  if (!/aria-label=\{navLabel/.test(src.tabBar) && !/aria-label=\{navLabel\(item/.test(src.tabBar)) {
    // TabBar uses aria-label={navLabel(item, t)}
    if (!/aria-label=\{navLabel\(item, t\)\}/.test(src.tabBar)) errors.push("NAV_MISSING_ACCESSIBLE_NAME");
  }
  if (!/data-nav-active=/.test(src.tabBar)) errors.push("NAV_ACTIVE_UNLABELLED");
  if (!/data-sheet-handle=/.test(src.tabBar)) errors.push("SHEET_NO_HANDLE");
  if (!/Escape/.test(src.tabBar)) errors.push("SHEET_NO_DISMISS");
  if (!/paddingBottom: "max\(.*app-safe-bottom/.test(src.tabBar)) errors.push("PRIMARY_CTA_BEHIND_SAFE_AREA");
  return [...new Set(errors)];
}

export function checkDestructiveColorSemantics(src = loadCognitiveSources()) {
  const errors = [];
  const primary = /primary:\s*\n\s*"([^"]+)"/.exec(src.primitives)?.[1] ?? "";
  const danger = /danger:\s*\n\s*"([^"]+)"/.exec(src.primitives)?.[1] ?? "";
  if (!primary.includes("bg-accent") || /wrong/.test(primary)) {
    errors.push("DESTRUCTIVE_COLOR_ON_LEARNING_CTA");
  }
  if (!/wrong/.test(danger)) errors.push("DESTRUCTIVE_COLOR_ON_LEARNING_CTA");
  return errors;
}

export function checkRuntimeGuards(src = loadCognitiveSources()) {
  const errors = [];
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(src.budgetPolicy)) errors.push("JEV_RUNTIME_ENABLED");
  if (!/"version": "0\.2\.0-rc\.2"/.test(src.packageJson)) errors.push("VERSION_NOT_RC2");
  if (/ANDROID_IN_APP_PURCHASE["']?\s*[:=]\s*["']ENABLED/.test(src.featureFlags)) errors.push("LIVE_BILLING_ENABLED");
  const sibling = ["Ato", "murus"].join("");
  if (new RegExp(`\\b(deploy|apply)\\s+${sibling}\\b`, "i").test(src.oaDeploy)) errors.push("ATOMURUS_TOUCHED");
  if (!src.inventory || !src.homeAudit) errors.push("UX_DOCS_MISSING");
  if (!src.certification) errors.push("UX_CERT_MISSING");
  return [...new Set(errors)];
}

export function checkAll(src = loadCognitiveSources()) {
  return [
    ...checkMoreOptionsHierarchy(src),
    ...checkLogoutHierarchy(src),
    ...checkDeleteNotLearningPrimary(src),
    ...checkAccountIa(src),
    ...checkNavSheetOrder(src),
    ...checkAffordanceAndTouch(src),
    ...checkDestructiveColorSemantics(src),
    ...checkRuntimeGuards(src),
  ];
}
