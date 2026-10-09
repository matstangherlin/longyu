#!/usr/bin/env node
/**
 * RC2.3.13G — validate + ≥40 mutation kills.
 */
import { checkAll, load13gSources } from "./lib/rc2-3-13g-beta-feedback-learner-health-gates.mjs";

function mutate(src, key, from, to) {
  if (!src[key].includes(from)) {
    console.error(`MUTATION_SOURCE_MISSING ${key}: ${from.slice(0, 60)}`);
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
  console.log("PASS validate:rc2-3-13g-beta-feedback-learner-health · nav · feedback · freeze");
}

function test() {
  const base = load13gSources();
  let n = 0;
  const k = (label, code, mutant) => {
    n += 1;
    kill(`${n} ${label}`, code, mutant);
  };

  // NAV (10)
  k("Culture bottom tab restored", "CULTURE_BOTTOM_TAB_FORBIDDEN", mutate(base, "nav", "NAV.treino,\n    NAV.missoes,", "NAV.treino,\n    NAV.cultura,\n    NAV.missoes,"));
  k("upper Culture switch removed", "CULTURE_PROGRESSION_SWITCH_REQUIRED", mutate(base, "progressionShell", 'data-testid="progression-tab-culture"', 'data-testid="x"'));
  k("upper Journey switch removed", "JOURNEY_PROGRESSION_SWITCH_REQUIRED", mutate(base, "progressionShell", 'data-testid="progression-tab-journey"', 'data-testid="x"'));
  k("Culture route broken", "CULTURE_ROUTE_BROKEN", mutate(base, "routes", 'path: "cultura"', 'path: "cultura-removed"'));
  k("Journey route broken", "JOURNEY_ROUTE_BROKEN", mutate(base, "routes", 'path: "jornada"', 'path: "jornada-removed"'));
  k("bottom parent inactive in Culture", "NAV_PARENT_INACTIVE_ON_CULTURE", mutate(base, "nav", 'pathname === "/cultura"', 'pathname === "/never-cultura"'));
  k("switch target <44px", "SWITCH_TOUCH_TOO_SMALL", mutate(base, "progressionShell", "min-h-11", "min-h-8"));
  k("selected state color-only", "ACTIVE_STATE_COLOR_ONLY", mutate(base, "progressionShell", "aria-selected", "data-sel"));
  k("Journey restore breaks", "POSITION_RESTORE_BROKEN", mutate(base, "progressionState", "writeProgressionScroll", "writeGoneScroll"));
  k("Culture discovery still tab", "CULTURE_STILL_TAB_DISCOVERY", mutate(base, "progressiveDiscovery", 'navigationPlacement: "journey"', 'navigationPlacement: "tab"'));

  // FEEDBACK (10)
  k("survey during lesson allowed", "SURVEY_DURING_LESSON_ALLOWED", mutate(base, "microFeedback", "isMicroFeedbackBlocked", "isMicroFeedbackAlwaysOk"));
  k("survey every completion", "SURVEY_EVERY_COMPLETION", mutate(base, "microFeedback", "MICRO_FEEDBACK_EVERY_N_COMPLETIONS", "MICRO_FEEDBACK_GAP_GONE"));
  k("survey not dismissible", "SURVEY_NOT_DISMISSIBLE", mutate(base, "microSheet", "micro-feedback-dismiss", "micro-feedback-locked"));
  k("positive answer awards XP", "POSITIVE_ANSWER_AWARDS_XP", mutate(base, "microFeedback", "export function microFeedbackAwardsReward(_answerId: string): false {\n  return false;\n}", "export function microFeedbackAwardsReward(_answerId: string): boolean {\n  return true;\n}"));
  k("PII protection missing", "PII_PROTECTION_MISSING", mutate(base, "betaEvents", "FORBIDDEN_KEY_RE", "NEVER_MATCH_RE_XXXX"));
  k("safe diagnostics missing", "SAFE_DIAGNOSTICS_MISSING", mutate(base, "safeDiagnostics", "buildSafeDiagnostics", "buildUnsafeDiagnostics"));
  k("report categories thin", "REPORT_CATEGORIES_THIN", mutate(base, "feedback", '{ id: "fala", label: "Fala" },', '{ id: "xxx", label: "X" },'));
  k("survey mid-answer blocked type", "SURVEY_DURING_LESSON_ALLOWED", mutate(base, "microFeedback", "BlockedLearningContext", "OpenLearningContext"));
  k("diagnostic id missing", "DIAGNOSTIC_ID_MISSING", mutate(base, "betaEvents", "makeDiagnosticId", "makeRandomThing"));
  k("health model missing", "HEALTH_MODEL_MISSING", mutate(base, "healthModel", "Activated", "Nope"));

  // TELEMETRY (12)
  k("no event schema version", "NO_EVENT_SCHEMA_VERSION", mutate(base, "betaEvents", "BETA_EVENT_SCHEMA_VERSION", "BETA_EVENT_SCHEMA_GONE"));
  k("no event ID", "NO_EVENT_ID", mutate(base, "betaEvents", "eventId", "evtKey"));
  k("unknown fields accepted", "EVENT_SANITIZER_MISSING", mutate(base, "betaEvents", "sanitizeBetaEvent", "passThroughBetaEvent"));
  k("Culture discovery missing", "CULTURE_DISCOVERY_MISSING", mutate(mutate(base, "techEvents", "culture_first_switch", "culture_never"), "progressionShell", "culture_first_switch", "culture_never"));
  k("first lesson completion missing", "FIRST_LESSON_COMPLETE_MISSING", mutate(mutate(base, "techEvents", "first_lesson_completed", "first_lesson_gone"), "betaEvents", "first_lesson_completed", "first_lesson_gone"));
  k("First Mandarin missing", "FIRST_MANDARIN_MISSING", mutate(base, "betaEvents", "resolveFirstMandarinEvent", "resolveMarketingEvent"));
  k("Practice discovery missing", "PRACTICE_DISCOVERY_MISSING", mutate(mutate(base, "techEvents", "practice_first_open", "practice_never"), "betaEvents", "practice_first_open", "practice_never"));
  k("Mastery discovery missing", "MASTERY_DISCOVERY_MISSING", mutate(mutate(base, "techEvents", "mastery_first_open", "mastery_never"), "betaEvents", "mastery_first_open", "mastery_never"));
  k("health schema missing", "HEALTH_SCHEMA_MISSING", mutate(base, "healthSchema", "beta_health/1", "beta_health/0"));
  k("sanitize detail removed", "EVENT_SANITIZER_MISSING", mutate(base, "betaEvents", "sanitizeBetaEvent", "passThroughBetaEvent2"));
  k("stroke key allowlist gone", "PII_PROTECTION_MISSING", mutate(base, "betaEvents", "FORBIDDEN_KEY_RE", "HARMLESS_KEY_RE"));
  k("first mandarin authority gone", "FIRST_MANDARIN_MISSING", mutate(base, "betaEvents", "resolveFirstMandarinEvent", "resolveMarketingEvent2"));

  // FREEZE (12)
  k("Culture count changes", "CULTURE_COUNT_CHANGED", mutate(base, "curriculumFreeze", "cultureItems: 36", "cultureItems: 40"));
  k("Culture path count changes", "CULTURE_PATH_COUNT_CHANGED", {
    ...base,
    culturePaths: `${base.culturePaths}\nid: "extra_path_13"\nid: "extra_path_14"\n`,
  });
  k("fingerprint unexpected drift", "FINGERPRINT_UNEXPECTED_DRIFT", mutate(base, "curriculumFreeze", 'RC_BASE_FINGERPRINT = "fea5455e1461"', 'RC_BASE_FINGERPRINT = "deadbeef0001"'));
  k("Mandarin lesson count changes", "MANDARIN_LESSON_COUNT_CHANGED", mutate(base, "curriculumFreeze", "lessons: 134", "lessons: 135"));
  k("Mandarin topic count changes", "MANDARIN_TOPIC_COUNT_CHANGED", mutate(base, "curriculumFreeze", "teachingTopics: 113", "teachingTopics: 114"));
  k("Mastery math changes", "MASTERY_MATH_CHANGED", { ...base, personalMastery: `${base.personalMastery}\nexport function computeMasteryScore() { return 0; }\n` });
  k("SRS changes", "SRS_CHANGED", { ...base, srs: `${base.srs}\nexport function nextInterval() { return 99999; }\n` });
  k("billing changes", "BILLING_CHANGED", { ...base, billingAudit: `${base.billingAudit.replace(/\}$/, "")}, "enabled": true, "BILLING_ENABLED": true }` });
  k("JEV learner runtime ON", "JEV_RUNTIME_ON", { ...base, curriculumFreeze: `${base.curriculumFreeze}\nexport const JEV_LEARNER_RUNTIME = true;\n` });
  k("sibling touched", "SIBLING_PRODUCT_TOUCHED", { ...base, nav: `${base.nav}\n// ${["Ato", "murus"].join("")}\n` });
  k("cert missing", "CERT_MISSING", blank(base, "certification"));
  k("report missing", "REPORT_MISSING", blank(base, "report"));
  k("UI freeze missing", "UI_FREEZE_MISSING", blank(base, "uiFreeze"));
  k("nav freeze statement missing", "NAV_FREEZE_STATEMENT_MISSING", mutate(mutate(base, "report", "CULTURE IS NOT A BOTTOM NAV ITEM", "culture tab ok"), "uiFreeze", "CULTURE IS NOT A BOTTOM NAV ITEM", "culture tab ok"));
  k("flagship missing marker", "FLAGSHIP_COUNT_CHANGED", mutate(base, "cultureDeep", "FLAGSHIP_DEEP", "FLAGSHIP_GONE"));
  k("Culture native count", "CULTURE_NATIVE_CHANGED", mutate(base, "curriculumFreeze", "cultureNativeLessons: 36", "cultureNativeLessons: 40"));
  k("Journey culture nodes", "JOURNEY_CULTURE_NODES_CHANGED", mutate(base, "curriculumFreeze", "journeyCultureNodes: 20", "journeyCultureNodes: 21"));

  if (!process.exitCode) {
    console.log(`PASS test:rc2-3-13g-beta-feedback-learner-health · ${n} kills`);
    if (n < 40) {
      console.error(`NEED ≥40 kills, got ${n}`);
      process.exitCode = 1;
    }
  }
}

const cmd = process.argv[2] || "validate";
if (cmd === "validate") validate();
else if (cmd === "test") test();
else {
  console.error(`unknown command ${cmd}`);
  process.exitCode = 1;
}
