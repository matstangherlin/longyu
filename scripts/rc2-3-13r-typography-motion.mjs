#!/usr/bin/env node
/**
 * RC2.3.13R — validate + mutation kills (typography / motion).
 */
import { checkAll, load13rSources } from "./lib/rc2-3-13r-typography-motion-gates.mjs";

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
  console.log("PASS validate:rc2-3-13r-typography-motion · type · motion · freeze");
}

function test() {
  const base = load13rSources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  k("type system missing", "TYPOGRAPHY_SYSTEM_MISSING", mutate(base, "indexCss", ".type-page-title", ".type-x-page"));
  k("page title inconsistent", "PAGE_TITLE_INCONSISTENT", mutate(base, "progressionShell", "type-page-title", "text-sm"));
  k("culture card title", "CULTURE_CARD_TITLE_WRONG", mutate(base, "cultureJourney", "type-card-title", "text-xs"));
  k("eyebrow becomes body", "EYEBROW_BECOMES_BODY", mutate(base, "cultureJourney", "type-eyebrow", "type-body"));
  k("CTA typography", "CTA_TYPOGRAPHY_DIVERGES", mutate(base, "primitives", "type-button", "text-[22px]"));
  k("review prompt", "REVIEW_PROMPT_INCONSISTENT", mutate(base, "revisao", "type-page-title", "text-xs"));
  k("secondary stronger", "SECONDARY_STRONGER_THAN_PRIMARY", mutate(base, "cultureJourney", 'data-cta-hierarchy="primary"', 'data-cta-hierarchy="tertiary"'));
  k("mandarin role", "MANDARIN_TOO_SMALL", mutate(base, "indexCss", ".type-mandarin-example {", ".type-x-hanzi {"));
  k("type inventory", "TYPOGRAPHY_INVENTORY_MISSING", blank(base, "typeInventory"));
  k("motion tokens", "MOTION_SYSTEM_MISSING", mutate(base, "indexCss", "--motion-normal", "--x-normal"));
  k("JC transition removed", "JOURNEY_CULTURE_TRANSITION_REMOVED", mutate(base, "progressionShell", "progression-panel-enter", "panel-static"));
  k("segment snaps", "SEGMENT_INDICATOR_SNAPS", mutate(base, "progressionShell", 'data-motion="segment-indicator"', 'data-motion="x"'));
  k("scroll flash", "SCROLL_RESTORE_FLASH", mutate(base, "progressionShell", "useLayoutEffect", "useEffect"));
  k("path transition", "CULTURE_PATH_TRANSITION_REMOVED", mutate(base, "cultureJourney", "culture-path-card-enter", "static-card"));
  k("reduced motion slides", "REDUCED_MOTION_STILL_SLIDES", mutate(base, "indexCss", ".progression-panel-enter[data-enter", ".gone-panel[data-enter"));
  k("framer added", "REDUNDANT_MOTION_DEPENDENCY", {
    ...base,
    packageJson: base.packageJson.replace('"dependencies": {', '"dependencies": {\n    "framer-motion": "^11.0.0",'),
  });
  k("TopBar remount", "GLOBAL_TOPBAR_ANIMATES", {
    ...base,
    progressionShell: `${base.progressionShell}\nimport { TopBar } from "../layout/TopBar";\n<TopBar />\n`,
  });
  k("Dynamic Aula", "DYNAMIC_AULA_REGRESSED", blank(base, "dynamicSeq"));
  k("motion doc", "MOTION_DOC_MISSING", blank(base, "motionDoc"));
  k("lesson count", "LESSON_COUNT_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("topic count", "TOPIC_COUNT_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("culture count", "CULTURE_COUNT_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("fingerprint", "FINGERPRINT_CHANGED", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "29bb02ec0336"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("cert", "CERT_MISSING", blank(base, "certification"));
  k("report", "REPORT_MISSING", blank(base, "report"));
  k("freeze", "UI_FREEZE_MISSING", blank(base, "uiFreeze"));
  k("sha semantics", "SHA_SEMANTICS_MISSING", mutate(base, "certification", '"learnerRuntimeSha"', '"legacyRuntimeSha"'));
  k("enter direction helper", "JOURNEY_CULTURE_TRANSITION_REMOVED", mutate(base, "progressionState", "progressionEnterDirection", "goneEnter"));
  k("last mode write", "JOURNEY_CULTURE_TRANSITION_REMOVED", mutate(base, "progressionShell", "writeProgressionLastMode", "writeGoneMode"));
  k("type body missing", "TYPOGRAPHY_SYSTEM_MISSING", mutate(base, "indexCss", ".type-body {", ".type-x-body {"));
  k("type supporting", "TYPOGRAPHY_SYSTEM_MISSING", mutate(base, "indexCss", ".type-supporting", ".type-x-support"));
  k("ease enter", "MOTION_SYSTEM_MISSING", mutate(base, "indexCss", "--ease-enter", "--ease-x"));
  k("page header role", "PAGE_TITLE_INCONSISTENT", mutate(base, "page", "type-page-title", "text-base"));
  k("eyebrow class gone", "EYEBROW_BECOMES_BODY", mutate(base, "cultureJourney", "type-eyebrow", "text-base font-normal"));
  k("pinyin role", "TYPOGRAPHY_SYSTEM_MISSING", mutate(base, "indexCss", ".type-pinyin", ".type-x-pinyin"));
  k("card enter css", "CULTURE_PATH_TRANSITION_REMOVED", mutate(base, "indexCss", ".culture-path-card-enter", ".culture-path-card-x"));

  if (!process.exitCode) console.log(`PASS test:rc2-3-13r-typography-motion · ${n} kills`);
}

const mode = process.argv[2] ?? "validate";
if (mode === "validate") validate();
else if (mode === "test") test();
else {
  console.error(`Unknown mode ${mode}`);
  process.exitCode = 1;
}
