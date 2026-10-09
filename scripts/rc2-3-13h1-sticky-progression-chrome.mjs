#!/usr/bin/env node
/**
 * RC2.3.13H.1 — validate + ≥35 mutation kills.
 */
import { checkAll, load13h1Sources } from "./lib/rc2-3-13h1-sticky-progression-chrome-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${from.slice(0, 80)}`);
    process.exitCode = 1;
  }
  return { ...src, [key]: src[key].split(from).join(to) };
}

function blank(src, key) {
  return { ...src, [key]: "" };
}

function kill(label, code, mutant) {
  const errors = checkAll(mutant);
  if (!errors.includes(code)) {
    console.error(`MISS ${label} → expected ${code}, got [${errors.join(", ")}]`);
    process.exitCode = 1;
    return;
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log("PASS validate:rc2-3-13h1-sticky-progression-chrome · sticky · preserve · freeze");
}

function test() {
  const base = load13h1Sources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("Global Top Bar scrolls away", "GLOBAL_TOPBAR_SCROLLS_AWAY", mutate(base, "topBar", "sticky top-0", "relative top-auto"));
  k("Progression switch scrolls away", "PROGRESSION_SWITCH_SCROLLS_AWAY", mutate(base, "progressionShell", "sticky", "relative"));
  k("switch placed above topbar", "SWITCH_ABOVE_TOPBAR", mutate(base, "progressionShell", "progression-sticky-offset", "zero-offset"));
  k("switch sticky at viewport top", "SWITCH_ABOVE_TOPBAR", {
    ...base,
    progressionShell: base.progressionShell.replace(
      '"sticky z-20 -mx-1',
      '"sticky top-0 z-20 -mx-1',
    ),
  });
  k("progression obscured", "PROGRESSION_OBSCURED_BY_SWITCH", mutate(base, "indexCss", "scroll-padding-top", "scroll-padding-x"));
  k("safe-top ignored", "SAFE_TOP_IGNORED", mutate(base, "indexCss", "--app-safe-top", "--app-safe-x"));
  k("magic top offsets", "MAGIC_TOP_OFFSETS", mutate(base, "indexCss", "--progression-switch-height", "--x-switch-height"));
  k("Journey scroll state lost", "JOURNEY_SCROLL_STATE_LOST", mutate(base, "progressionState", "writeProgressionScroll", "writeGone"));
  k("Culture scroll state lost", "CULTURE_SCROLL_STATE_LOST", mutate(base, "progressionState", "writeProgressionAnchor", "writeGoneAnchor"));
  k("shared scroll position", "SHARED_SCROLL_POSITION", mutate(base, "progressionState", "export type ProgressionMode", "export type GoneMode"));
  k("GlobalTopBar remounts", "GLOBAL_TOPBAR_REMOUNTS", {
    ...base,
    progressionShell: `${base.progressionShell}\nimport { TopBar } from "../layout/TopBar";\n<TopBar />\n`,
  });
  k("branding jumps", "BRANDING_JUMPS", mutate(base, "topBar", "BrandWordmark", "BrandX"));
  k("counters stale", "COUNTERS_STALE_SNAPSHOT", mutate(base, "topBar", "useStore", "useFrozen"));
  k("Profile action broken", "PROFILE_ACTION_BROKEN", mutate(base, "topBar", "topbar-avatar", "topbar-x"));
  k("Profile target <44px", "PROFILE_TARGET_TOO_SMALL", mutate(base, "topBar", "h-12 w-12", "h-8 w-8"));
  k("switch target <44px", "SWITCH_TARGET_TOO_SMALL", mutate(base, "progressionShell", "min-h-11", "min-h-8"));
  k("sticky chrome transparent", "STICKY_CHROME_TRANSPARENT", mutate(base, "topBar", "bg-bg", "bg-transparent"));
  k("modal below sticky", "MODAL_BELOW_STICKY", mutate(base, "indexCss", "--z-modal: 80", "--z-modal: 10"));
  k("lesson duplicate chrome", "LESSON_SHOWS_DUPLICATE_CHROME", mutate(base, "appShell", "focusMode", "neverFocus"));
  k("Journey bubble V2 gone", "JOURNEY_BUBBLE_V2_GONE", mutate(base, "journeyPage", "ProgressionNodeBubble", "OldBubble"));
  k("Culture bubbles regress", "CULTURE_BUBBLES_REGRESS", mutate(base, "cultureJourney", "ProgressionPath", "RowList"));
  k("Culture bottom tab returns", "CULTURE_BOTTOM_TAB_RETURNS", mutate(base, "nav", "NAV.treino,\n    NAV.missoes,", "NAV.treino,\n    NAV.cultura,\n    NAV.missoes,"));
  k("nav parent active breaks", "NAV_PARENT_ACTIVE_BREAKS", mutate(base, "nav", 'pathname === "/cultura"', 'pathname === "/never"'));
  k("Dynamic Aula regressed", "DYNAMIC_AULA_REGRESSED", blank(base, "dynamicSeq"));
  k("reduced motion breaks", "REDUCED_MOTION_BREAKS_SELECTOR", mutate(base, "progressionShell", "motion-reduce", "motion-x"));
  k("topbar testid gone", "GLOBAL_TOPBAR_SCROLLS_AWAY", mutate(base, "topBar", 'data-testid="global-topbar"', 'data-testid="x"'));
  k("TopBar z below switch", "SWITCH_ABOVE_TOPBAR", mutate(base, "topBar", "z-[25]", "z-10"));
  k("switch sticky offset gone", "PROGRESSION_SWITCH_SCROLLS_AWAY", mutate(base, "progressionShell", "progression-sticky-offset", "gone-offset"));
  k("sticky height token gone", "PROGRESSION_OBSCURED_BY_SWITCH", mutate(base, "indexCss", "--progression-sticky-height", "--gone-height"));
  k("lesson count", "LESSON_COUNT_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count", "TOPIC_COUNT_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("Culture count", "CULTURE_COUNT_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("fingerprint", "FINGERPRINT_CHANGED", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "fea5455e1461"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("Mastery", "MASTERY_MATH_CHANGED", { ...base, personalMastery: `${base.personalMastery}\nexport function computeMasteryScore() { return 0; }\n` });
  k("SRS", "SRS_CHANGED", { ...base, srs: `${base.srs}\nexport function nextInterval() { return 99999; }\n` });
  k("billing", "BILLING_CHANGED", { ...base, billingAudit: `${base.billingAudit.replace(/\}$/, "")}, "enabled": true, "BILLING_ENABLED": true }` });
  k("JEV ON", "JEV_RUNTIME_ON", { ...base, curriculumFreeze: `${base.curriculumFreeze}\nexport const JEV_LEARNER_RUNTIME = true;\n` });
  k("sibling", "SIBLING_PRODUCT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("cert missing", "CERT_MISSING", blank(base, "certification"));
  k("report missing", "REPORT_MISSING", blank(base, "report"));
  k("UI freeze missing", "UI_FREEZE_MISSING", blank(base, "uiFreeze"));
  k("path count", "CULTURE_PATH_COUNT_CHANGED", blank(base, "culturePaths"));
  k("profile target dup", "PROFILE_TARGET_TOO_SMALL", mutate(base, "topBar", "h-12 w-12", "h-9 w-9"));

  if (!process.exitCode) console.log(`PASS test:rc2-3-13h1-sticky-progression-chrome · ${n} kills`);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
