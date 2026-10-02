#!/usr/bin/env node
/**
 * RC2.3.1 — gates Visual First.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
export const FILES = {
  resolve: "src/lib/visualFirst/resolveCurriculumVisual.ts",
  apply: "src/lib/visualFirst/applyVisualFirst.ts",
  classify: "src/lib/visualFirst/classify.ts",
  scenes: "src/lib/visualFirst/contextScenes.ts",
  firstExposure: "src/lib/visualFirst/firstExposure.ts",
  scaffold: "src/lib/visualFirst/masteryVisualScaffold.ts",
  hanziPrep: "src/lib/visualFirst/hanziVisualPrep.ts",
  pedagogyApply: "src/lib/pedagogyV6/applyPedagogyV6.ts",
  earlyVisual: "src/lib/pedagogyV6/earlyVisual.ts",
  journey: "src/data/journey.ts",
  vocab: "src/data/visualVocabulary.ts",
  qa: "src/features/qa/VisualFirstQaPanel.tsx",
  appGradle: "android/app/build.gradle",
  reportAuditMd: "docs/reports/rc2-3-1-visual-curriculum-audit.md",
  reportAuditJson: "docs/reports/rc2-3-1-visual-curriculum-audit.json",
  reportFirst20Md: "docs/reports/rc2-3-1-first-20-visual.md",
  reportFirst20Json: "docs/reports/rc2-3-1-first-20-visual.json",
  reportFull: "docs/reports/rc2-3-1-full-visual-coverage.json",
  reportPerf: "docs/reports/rc2-3-1-visual-performance.md",
  reportClosure: "docs/reports/rc2-3-1-visual-first-closure.md",
  matrix: "docs/release/rc2-3-1-visual-matrix.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, exists(rel) ? read(rel) : ""]));
  return {
    src,
    matrix: exists(FILES.matrix) ? JSON.parse(read(FILES.matrix)) : null,
    audit: exists(FILES.reportAuditJson) ? JSON.parse(read(FILES.reportAuditJson)) : null,
    first20: exists(FILES.reportFirst20Json) ? JSON.parse(read(FILES.reportFirst20Json)) : null,
    full: exists(FILES.reportFull) ? JSON.parse(read(FILES.reportFull)) : null,
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

export async function validateVisualEngine(s) {
  const { failures, fail } = collector();
  if (!/resolveCurriculumVisual/.test(s.src.resolve)) fail("RESOLVE", FILES.resolve, "resolveCurriculumVisual");
  if (!/VISUAL_STYLE_FAMILY_MISMATCH/.test(s.src.resolve)) fail("STYLE", FILES.resolve, "style mismatch code");
  if (!/VISUAL_CURRICULUM_LEAK/.test(s.src.resolve)) fail("LEAK", FILES.resolve, "curriculum leak code");
  if (!/CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL/.test(s.src.firstExposure)) {
    fail("FIRST_EXPOSURE", FILES.firstExposure, "gate code");
  }
  if (!/applyVisualFirstToPlan/.test(s.src.apply)) fail("APPLY", FILES.apply, "applyVisualFirstToPlan");
  if (!/applyVisualFirstToPlan/.test(s.src.pedagogyApply)) fail("WIRE", FILES.pedagogyApply, "wired in V6 apply");
  if (!/PEDAGOGY_VISUAL_SCENES/.test(s.src.scenes)) fail("SCENES", FILES.scenes, "scene catalog");
  if (!/visualConceptId/.test(s.src.journey)) fail("STEP_FIELD", FILES.journey, "visualConceptId on LessonStep");
  if (!/hanziVisualPrepFor/.test(s.src.hanziPrep)) fail("HANZI_PREP", FILES.hanziPrep, "API for RC2.3.4");
  return failures;
}

export async function validateVisualAudit(s) {
  const { failures, fail } = collector();
  if (!s.reports.reportAuditMd || !s.reports.reportAuditJson) fail("AUDIT", FILES.reportAuditMd, "curriculum audit");
  if (!s.reports.reportFirst20Md || !s.reports.reportFirst20Json) fail("FIRST20", FILES.reportFirst20Md, "first-20");
  if (!s.reports.reportFull) fail("FULL", FILES.reportFull, "full coverage");
  if (!s.audit) fail("AUDIT_JSON", FILES.reportAuditJson, "parse");
  else {
    if ((s.audit.totalLessons ?? 0) < 100) fail("LESSONS", FILES.reportAuditJson, "expected full curriculum");
    if ((s.audit.visualConceptsInBank ?? 0) < 50) fail("BANK", FILES.reportAuditJson, "visual bank too small");
    // Coverage means plan encounter — unused bank assets OK to report, not auto-fail
    if ((s.full?.curriculumLeakViolations ?? 0) > 0) fail("LEAK_COUNT", FILES.reportFull, "VISUAL_CURRICULUM_LEAK > 0");
  }
  return failures;
}

export async function validateVisualQaAndClosure(s) {
  const { failures, fail } = collector();
  if (!s.reports.reportPerf) fail("PERF", FILES.reportPerf, "performance report");
  if (!s.reports.reportClosure) fail("CLOSURE", FILES.reportClosure, "closure");
  if (!exists(FILES.qa)) fail("QA_PANEL", FILES.qa, "VisualFirstQaPanel");
  if (!s.matrix) fail("MATRIX", FILES.matrix, "missing");
  else {
    for (const key of [
      "VISUAL_ENGINE_READY",
      "VISUAL_CURRICULUM_MIGRATED",
      "FIRST_EXPOSURE_PASS",
      "FIRST20_VISUAL_PASS",
      "FULL_CURRICULUM_AUDITED",
      "WEB_PASS",
      "ANDROID_BUILD_PASS",
      "APK_PASS",
      "OWNER_VISUAL_ACCEPTANCE",
    ]) {
      if (!(key in (s.matrix.statuses ?? {}))) fail("MATRIX_STATUS", FILES.matrix, key);
    }
    if (s.matrix.statuses?.OWNER_VISUAL_ACCEPTANCE === "PASS") {
      fail("FAKE_OWNER", FILES.matrix, "owner visual acceptance without physical");
    }
    if (s.matrix.waveReadyForClosedBeta === true) fail("BETA_CLAIM", FILES.matrix, "must not claim beta");
  }
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) fail("BILLING", FILES.appGradle, "#273 frozen");
  // EARLY_VISUAL_CONCRETE may remain as compat shim, but resolveCurriculumVisual must be the resolver
  if (!/resolveCurriculumVisual/.test(s.src.earlyVisual)) {
    fail("EARLY_DELEGATE", FILES.earlyVisual, "earlyVisual must delegate to resolveCurriculumVisual");
  }
  return failures;
}

export const VALIDATORS = {
  "visual-engine": validateVisualEngine,
  "visual-audit": validateVisualAudit,
  "visual-closure": validateVisualQaAndClosure,
};
