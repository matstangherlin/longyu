#!/usr/bin/env node
/**
 * RC2.3.2 — gates Human & Everyday Mandarin.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
export const FILES = {
  intents: "src/lib/everydayMandarin/intents.ts",
  scenarios: "src/lib/everydayMandarin/scenarios.ts",
  apply: "src/lib/everydayMandarin/applyEverydayMandarin.ts",
  quality: "src/lib/everydayMandarin/quality.ts",
  pedagogyApply: "src/lib/pedagogyV6/applyPedagogyV6.ts",
  humanContext: "src/lib/pedagogyV6/humanContext.ts",
  perceptual: "src/lib/pedagogyV6/perceptualRepetition.ts",
  scenes: "src/lib/visualFirst/contextScenes.ts",
  firstExposure: "src/lib/visualFirst/firstExposure.ts",
  journey: "src/data/journey.ts",
  qa: "src/features/qa/EverydayMandarinQaPanel.tsx",
  appGradle: "android/app/build.gradle",
  reportMapMd: "docs/reports/rc2-3-2-everyday-curriculum-map.md",
  reportMapJson: "docs/reports/rc2-3-2-everyday-curriculum-map.json",
  reportFirst20Md: "docs/reports/rc2-3-2-first-20-human.md",
  reportFirst20Json: "docs/reports/rc2-3-2-first-20-human.json",
  reportOutcomes: "docs/reports/rc2-3-2-communicative-outcomes.json",
  reportClosure: "docs/reports/rc2-3-2-human-everyday-closure.md",
  matrix: "docs/release/rc2-3-2-human-everyday-matrix.json",
  matrix231: "docs/release/rc2-3-1-visual-matrix.json",
  audit231: "docs/reports/rc2-3-1-visual-curriculum-audit.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, exists(rel) ? read(rel) : ""]));
  return {
    src,
    matrix: exists(FILES.matrix) ? JSON.parse(read(FILES.matrix)) : null,
    matrix231: exists(FILES.matrix231) ? JSON.parse(read(FILES.matrix231)) : null,
    audit231: exists(FILES.audit231) ? JSON.parse(read(FILES.audit231)) : null,
    map: exists(FILES.reportMapJson) ? JSON.parse(read(FILES.reportMapJson)) : null,
    first20: exists(FILES.reportFirst20Json) ? JSON.parse(read(FILES.reportFirst20Json)) : null,
    outcomes: exists(FILES.reportOutcomes) ? JSON.parse(read(FILES.reportOutcomes)) : null,
    reports: Object.fromEntries(
      Object.entries(FILES)
        .filter(([k]) => k.startsWith("report"))
        .map(([k, rel]) => [k, exists(rel)])
    ),
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

export async function validateEverydayEngine(s) {
  const { failures, fail } = collector();
  if (!/EverydayIntent/.test(s.src.intents)) fail("INTENT", FILES.intents, "EverydayIntent");
  if (!/EVERYDAY_SCENARIOS/.test(s.src.scenarios)) fail("SCENARIOS", FILES.scenarios, "scenario bank");
  if (!/applyEverydayMandarinToPlan/.test(s.src.apply)) fail("APPLY", FILES.apply, "applyEverydayMandarinToPlan");
  if (!/applyEverydayMandarinToPlan/.test(s.src.pedagogyApply)) fail("WIRE", FILES.pedagogyApply, "wired in V6");
  if (!/CONTEXT_LEAKS_EXPECTED_ANSWER/.test(s.src.quality)) fail("LEAK_ANSWER", FILES.quality, "context answer leak");
  if (!/EVERYDAY_CURRICULUM_LEAK/.test(s.src.quality)) fail("CURR_LEAK", FILES.quality, "curriculum leak");
  if (!/EVERYDAY_CONTEXT_QUALITY/.test(s.src.quality)) fail("CTX_Q", FILES.quality, "context quality");
  if (!/CONTEXTUAL_REUSE/.test(s.src.perceptual)) fail("REUSE", FILES.perceptual, "TARGET vs REUSE");
  if (!/scenePromptForPass/.test(s.src.scenes)) fail("SCENE_PASS", FILES.scenes, "mastery scene prompts");
  if (!/everydayIntent\?/.test(s.src.journey)) fail("STEP_META", FILES.journey, "everyday metadata on LessonStep");
  if (!/inferEverydayIntentFromText/.test(s.src.humanContext)) fail("HUMAN_DELEGATE", FILES.humanContext, "uses EverydayIntent");
  return failures;
}

export async function validateEverydayAudit(s) {
  const { failures, fail } = collector();
  if (!s.reports.reportMapMd || !s.reports.reportMapJson) fail("MAP", FILES.reportMapMd, "curriculum map");
  if (!s.reports.reportFirst20Md || !s.reports.reportFirst20Json) fail("FIRST20", FILES.reportFirst20Md, "first-20 human");
  if (!s.reports.reportOutcomes) fail("OUTCOMES", FILES.reportOutcomes, "communicative outcomes");
  if (!s.map) fail("MAP_JSON", FILES.reportMapJson, "parse");
  else {
    if ((s.map.totalLessons ?? 0) < 100) fail("LESSONS", FILES.reportMapJson, "full curriculum");
    if ((s.map.scenarioBankSize ?? 0) < 8) fail("BANK", FILES.reportMapJson, "scenario bank too small");
    if ((s.map.curriculumLeakErrors ?? 0) > 0) fail("EVERYDAY_CURRICULUM_LEAK", FILES.reportMapJson, "leaks > 0");
  }
  if (s.first20 && !s.first20.first20Capabilities?.greeted) {
    fail("FIRST20_GREET", FILES.reportFirst20Json, "first 20 must include greeting");
  }
  // MATRIX_STATUS_MUST_MATCH_AUDIT for inherited RC2.3.1 first exposure
  if (s.matrix231 && s.audit231) {
    const fePass = s.matrix231.statuses?.FIRST_EXPOSURE_PASS;
    const missing = Number(s.audit231.firstExposureMissing ?? 0);
    const covered = Number(s.audit231.firstExposureCovered ?? 0);
    if ((fePass === "YES" || fePass === "PASS") && missing > 0) {
      fail(
        "MATRIX_STATUS_MUST_MATCH_AUDIT",
        FILES.matrix231,
        `FIRST_EXPOSURE_PASS=${fePass} but missing=${missing} covered=${covered}`
      );
    }
  }
  return failures;
}

export async function validateEverydayClosure(s) {
  const { failures, fail } = collector();
  if (!s.reports.reportClosure) fail("CLOSURE", FILES.reportClosure, "closure");
  if (!exists(FILES.qa)) fail("QA_PANEL", FILES.qa, "EverydayMandarinQaPanel");
  if (!s.matrix) fail("MATRIX", FILES.matrix, "missing");
  else {
    for (const key of [
      "EVERYDAY_ENGINE_READY",
      "COMMUNICATIVE_MAP_READY",
      "FIRST20_HUMAN_PASS",
      "FULL_CURRICULUM_AUDITED",
      "CONTEXT_QUALITY_PASS",
      "CURRICULUM_LEAK_PASS",
      "PRODUCTION_PROGRESSION_PASS",
      "TRANSFER_PROGRESSION_PASS",
      "WEB_PASS",
      "ANDROID_BUILD_PASS",
      "APK_PASS",
      "OWNER_HUMAN_ACCEPTANCE",
    ]) {
      if (!(key in (s.matrix.statuses ?? {}))) fail("MATRIX_STATUS", FILES.matrix, key);
    }
    if (s.matrix.statuses?.OWNER_HUMAN_ACCEPTANCE === "PASS") {
      fail("FAKE_OWNER", FILES.matrix, "owner human acceptance without physical");
    }
    if (s.matrix.waveReadyForClosedBeta === true) fail("BETA_CLAIM", FILES.matrix, "must not claim beta");
    // matrix must match audit for leak / quality
    if (s.matrix.statuses?.CURRICULUM_LEAK_PASS === "YES" || s.matrix.statuses?.CURRICULUM_LEAK_PASS === "PASS") {
      if ((s.map?.curriculumLeakErrors ?? 0) > 0) {
        fail("MATRIX_STATUS_MUST_MATCH_AUDIT", FILES.matrix, "CURRICULUM_LEAK_PASS but audit has leaks");
      }
    }
    if (s.matrix.statuses?.CONTEXT_QUALITY_PASS === "YES" || s.matrix.statuses?.CONTEXT_QUALITY_PASS === "PASS") {
      if ((s.map?.contextQualityErrors ?? 0) > 0) {
        fail("MATRIX_STATUS_MUST_MATCH_AUDIT", FILES.matrix, "CONTEXT_QUALITY_PASS but audit has errors");
      }
    }
  }
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) fail("BILLING", FILES.appGradle, "#273 frozen");
  return failures;
}

export const VALIDATORS = {
  "everyday-engine": validateEverydayEngine,
  "everyday-audit": validateEverydayAudit,
  "everyday-closure": validateEverydayClosure,
};
