#!/usr/bin/env node
/**
 * RC2.3.0 — gates Pedagogy V6.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
export const FILES = {
  mastery: "src/data/masteryLoop.ts",
  discovery: "src/lib/pedagogyV6/discovery.ts",
  perceptual: "src/lib/pedagogyV6/perceptualRepetition.ts",
  contract: "src/lib/pedagogyV6/activityContract.ts",
  visual: "src/lib/pedagogyV6/earlyVisual.ts",
  human: "src/lib/pedagogyV6/humanContext.ts",
  apply: "src/lib/pedagogyV6/applyPedagogyV6.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  journey: "src/data/journey.ts",
  foundation: "src/data/foundationTopicPlans.ts",
  appGradle: "android/app/build.gradle",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  reportDiscovery: "docs/reports/rc2-3-0-discovery-stage.md",
  reportMastery: "docs/reports/rc2-3-0-progressive-mastery.md",
  reportPerceptual: "docs/reports/rc2-3-0-perceptual-repetition.md",
  reportVisual: "docs/reports/rc2-3-0-early-visual-learning.md",
  reportHuman: "docs/reports/rc2-3-0-human-context-pilot.md",
  reportFirst20Md: "docs/reports/rc2-3-0-first-20-v6.md",
  reportFirst20Json: "docs/reports/rc2-3-0-first-20-v6.json",
  reportClosure: "docs/reports/rc2-3-0-pedagogy-v6-closure.md",
  matrix: "docs/release/rc2-3-0-pedagogy-matrix.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [k, exists(rel) ? read(rel) : ""]));
  return {
    src,
    matrix: exists(FILES.matrix) ? JSON.parse(read(FILES.matrix)) : null,
    first20: exists(FILES.reportFirst20Json) ? JSON.parse(read(FILES.reportFirst20Json)) : null,
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

export async function validateDiscoveryStage(s) {
  const { failures, fail } = collector();
  if (!/hasLearnerBeenTaught/.test(s.src.discovery)) fail("TAUGHT_API", FILES.discovery, "hasLearnerBeenTaught");
  if (!/TeachingMoment|PILOT_TEACHING_MOMENTS/.test(s.src.discovery)) fail("TEACHING_MOMENTS", FILES.discovery, "catalog");
  if (!/withDiscoveryStage/.test(s.src.discovery)) fail("DISCOVERY_INJECT", FILES.discovery, "withDiscoveryStage");
  if (!/pedagogyRole/.test(s.src.journey)) fail("STEP_ROLE", FILES.journey, "pedagogyRole on LessonStep");
  if (!/applyPedagogyV6ToPlan/.test(s.src.player)) fail("PLAYER_WIRE", FILES.player, "V6 wired in LessonPlayer");
  if (!/markConceptsTaught/.test(s.src.player)) fail("MARK_TAUGHT", FILES.player, "discovery marks taught");
  if (!/Descoberta/.test(s.src.discovery) || /video lesson|VideoLesson/.test(s.src.discovery)) {
    fail("NAMING", FILES.discovery, "must be Descoberta, not video lesson");
  }
  if (!s.reports.reportDiscovery) fail("REPORT", FILES.reportDiscovery, "missing");
  return failures;
}

export async function validateProgressiveMastery(s) {
  const { failures, fail } = collector();
  const budget = s.src.mastery.match(/MASTERY_PASS_GRADED_BUDGET[\s\S]*?\};/)?.[0] ?? "";
  if (!/1:\s*\{\s*min:\s*7,\s*max:\s*9/.test(budget)) fail("BUDGET_P1", FILES.mastery, "Pass1 7-9");
  if (!/2:\s*\{\s*min:\s*8,\s*max:\s*11/.test(budget)) fail("BUDGET_P2", FILES.mastery, "Pass2 8-11");
  if (!/3:\s*\{\s*min:\s*10,\s*max:\s*13/.test(budget)) fail("BUDGET_P3", FILES.mastery, "Pass3 10-13");
  if (!/4:\s*\{\s*min:\s*12,\s*max:\s*15/.test(budget)) fail("BUDGET_P4", FILES.mastery, "Pass4 12-15");
  if (/escolher aproximadamente 7–10|sem sessões de 15\+/.test(budget)) {
    fail("OLD_COMMENT", FILES.mastery, "old anti-15 comment still driving policy");
  }
  if (!/Fixação/.test(s.src.mastery)) fail("LABEL_FIXACAO", FILES.mastery, "Pass 2 = Fixação");
  if (!s.reports.reportMastery) fail("REPORT", FILES.reportMastery, "missing");
  return failures;
}

export async function validatePerceptualRepetition(s) {
  const { failures, fail } = collector();
  if (!/saturationScore/.test(s.src.perceptual)) {
    fail("SATURATION_API", FILES.perceptual, "saturationScore");
  }
  if (!/diversifyPerceptualSession/.test(s.src.perceptual)) {
    fail("PERCEPTUAL_API", FILES.perceptual, "diversifyPerceptualSession");
  }
  if (!/interactionFamilyFor/.test(s.src.perceptual)) fail("FAMILY", FILES.perceptual, "interaction family");
  if (!/diversifyPerceptualSession/.test(s.src.apply)) fail("APPLY", FILES.apply, "diversify in apply");
  if (!s.reports.reportPerceptual) fail("REPORT", FILES.reportPerceptual, "missing");
  return failures;
}

export async function validateEarlyVisual(s) {
  const { failures, fail } = collector();
  if (!/VISUAL_SUPPORT_MISSING/.test(s.src.visual)) fail("GATE_CODE", FILES.visual, "VISUAL_SUPPORT_MISSING");
  if (!/EARLY_VISUAL_CONCRETE|enrichStepWithVisual/.test(s.src.visual)) fail("CONCRETE", FILES.visual, "concrete map");
  if (!s.reports.reportVisual) fail("REPORT", FILES.reportVisual, "missing");
  return failures;
}

export async function validateHumanContext(s) {
  const { failures, fail } = collector();
  if (!/classifyHumanContext|summarizeHumanContext/.test(s.src.human)) {
    fail("HUMAN_API", FILES.human, "classifier");
  }
  if (!/Você encontra alguém pela manhã/.test(s.src.foundation)) {
    fail("HUMAN_PILOT_COPY", FILES.foundation, "human situation in mandarim P1");
  }
  if (!s.reports.reportHuman) fail("REPORT", FILES.reportHuman, "missing");
  return failures;
}

export async function validateActivityContract(s) {
  const { failures, fail } = collector();
  if (!/auditPedagogicalSession/.test(s.src.contract)) fail("CONTRACT", FILES.contract, "auditPedagogicalSession");
  if (!/taught_before_tested|no_padding/.test(s.src.contract)) fail("CHECKS", FILES.contract, "key checks");
  return failures;
}

export async function validateFirst20AndClosure(s) {
  const { failures, fail } = collector();
  if (!s.reports.reportFirst20Md || !s.reports.reportFirst20Json) {
    fail("FIRST20", FILES.reportFirst20Md, "first-20 audit missing");
  }
  if (!s.reports.reportClosure) fail("CLOSURE", FILES.reportClosure, "missing");
  if (!s.matrix) fail("MATRIX", FILES.matrix, "missing");
  else {
    for (const key of [
      "ENGINE_READY",
      "PILOT_CONTENT_READY",
      "WEB_PASS",
      "ANDROID_BUILD_PASS",
      "APK_PASS",
      "OWNER_PEDAGOGICAL_ACCEPTANCE",
    ]) {
      if (!(key in (s.matrix.statuses ?? {}))) fail("MATRIX_STATUS", FILES.matrix, key);
    }
    if (s.matrix.statuses?.OWNER_PEDAGOGICAL_ACCEPTANCE === "PASS" && s.matrix.statuses?.OWNER_PEDAGOGICAL_ACCEPTANCE_EVIDENCE !== "PHYSICAL") {
      fail("FAKE_OWNER_PASS", FILES.matrix, "owner acceptance without physical");
    }
    if (s.matrix.waveReadyForClosedBeta === true) fail("BETA_CLAIM", FILES.matrix, "must not claim beta");
  }
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) fail("BILLING", FILES.appGradle, "#273 frozen");
  if (!/RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION/.test(s.src.curriculumFreeze)) {
    fail("FP_EXCEPTION", FILES.curriculumFreeze, "RC2_3_0_PEDAGOGY_V6_CONTENT_EXCEPTION");
  }
  if (!/RC_BASE_FINGERPRINT = "c3861b5fb65f"/.test(s.src.curriculumFreeze)) {
    fail("FP_BUMP", FILES.curriculumFreeze, "fingerprint c3861b5fb65f");
  }
  if (s.matrix && s.matrix.curriculumFingerprint !== "c3861b5fb65f") {
    fail("MATRIX_FP", FILES.matrix, "curriculumFingerprint");
  }
  return failures;
}

export const VALIDATORS = {
  "discovery-stage": validateDiscoveryStage,
  "progressive-mastery": validateProgressiveMastery,
  "perceptual-repetition": validatePerceptualRepetition,
  "early-visual": validateEarlyVisual,
  "human-context": validateHumanContext,
  "activity-contract": validateActivityContract,
  "first20-closure": validateFirst20AndClosure,
};
