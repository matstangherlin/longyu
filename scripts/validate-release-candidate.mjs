/**
 * RC1 launch-readiness gate.
 *
 * Passes when the freeze contract is honest: fingerprint, lesson counts,
 * health-plan names, operational JSON still false / evidence-backed, and
 * every Journey plan still builds a first step. Does not promote a GO.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import { require as tsRequire } from "./lib/v495a-runtime.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (message) => errors.push(message);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const FREEZE = "RC1";
const FINGERPRINT = "38e70062857d";
const LESSONS = 134;
const TEACHING = 113;
const MERGE_SHA = "c4441b68ae2388027d72e3af748417ef7caf2bb6";
const REQUIRED_CHECKS = [
  "stripe_live",
  "android_real_device",
  "ios_real_device",
  "rollback_drill",
  "cloud_auth",
  "cloud_sync",
  "feedback_backend",
];

const freezeSrc = read("src/lib/curriculumFreeze.ts");
if (!freezeSrc.includes(`CURRICULUM_FREEZE = "${FREEZE}"`)) {
  fail(`CURRICULUM_FREEZE deve ser ${FREEZE}`);
}
if (!freezeSrc.includes(`RC_BASE_FINGERPRINT = "${FINGERPRINT}"`)) {
  fail(`RC_BASE_FINGERPRINT deve ser ${FINGERPRINT}`);
}
if (!freezeSrc.includes(`RC1_EXPECTED_LESSON_COUNT = ${LESSONS}`)) {
  fail(`RC1_EXPECTED_LESSON_COUNT deve ser ${LESSONS}`);
}
if (!freezeSrc.includes(`RC1_EXPECTED_TEACHING_TOPIC_COUNT = ${TEACHING}`)) {
  fail(`RC1_EXPECTED_TEACHING_TOPIC_COUNT deve ser ${TEACHING}`);
}
if (!freezeSrc.includes(`RC1_MERGE_SHA = "${MERGE_SHA}"`)) {
  fail("RC1_MERGE_SHA deve ser o squash real da #254, nunca 241386c");
}
if (freezeSrc.includes('RC1_MERGE_SHA = "241386c8fc814ebdfa166dde1035bc3d7ca195f5"')) {
  fail("RC1_MERGE_SHA não pode ser o SHA da branch 9B");
}

const fingerprint = journeyFingerprint(root);
if (fingerprint !== FINGERPRINT) {
  fail(
    `fingerprint da Jornada ${fingerprint} ≠ ${FINGERPRINT}. RC1 não cria currículo; se mudou, documente BLOCKER.`
  );
}

const { ALL_LESSONS } = tsRequire("../../src/data/journey.ts");
const { lessonRoundStepsFor } = tsRequire("../../src/features/lesson/lessonTasks.ts");
const teachingCount = ALL_LESSONS.filter((lesson) => !lesson.isReview && !lesson.reviewMasteryMode).length;
if (ALL_LESSONS.length !== LESSONS) {
  fail(`ALL_LESSONS.length ${ALL_LESSONS.length} ≠ ${LESSONS}`);
}
if (teachingCount !== TEACHING) {
  fail(`tópicos de ensino ${teachingCount} ≠ ${TEACHING}`);
}

const tasksSrc = read("src/features/lesson/lessonTasks.ts");
const healthSrc = read("src/data/healthSurvivalPlans.ts");
if (!tasksSrc.includes("saudeSurvivalPlanFor") || !tasksSrc.includes("const saudePlan")) {
  fail("lessonTasks.ts deve continuar com saudeSurvivalPlanFor / saudePlan");
}
if (/\bhealthPlan\b/.test(tasksSrc) || /\bhealthPlan\b/.test(healthSrc)) {
  fail("healthPlan é nome bloqueado (PHI / CodeQL). Use saudeSurvivalPlanFor / saudePlan.");
}
if (!healthSrc.includes("export function saudeSurvivalPlanFor")) {
  fail("healthSurvivalPlans.ts deve exportar saudeSurvivalPlanFor");
}

const checksPath = "docs/release/rc1-operational-checks.json";
let checksDoc;
try {
  checksDoc = JSON.parse(read(checksPath));
} catch (error) {
  fail(`${checksPath} inválido: ${error instanceof Error ? error.message : error}`);
}

if (checksDoc) {
  if (checksDoc.curriculum_freeze !== FREEZE) fail("operational-checks.curriculum_freeze ≠ RC1");
  if (checksDoc.base_fingerprint !== FINGERPRINT) fail("operational-checks.base_fingerprint drift");
  if (checksDoc.merge_sha !== MERGE_SHA) fail("operational-checks.merge_sha deve ser o merge real da #254");
  if (checksDoc.merge_sha === "241386c8fc814ebdfa166dde1035bc3d7ca195f5") {
    fail("operational-checks não pode usar o SHA da branch 9B");
  }

  const checkMap = checksDoc.checks ?? {};
  for (const key of REQUIRED_CHECKS) {
    const row = checkMap[key];
    if (!row || typeof row.pass !== "boolean") {
      fail(`check ${key} ausente ou sem pass boolean`);
      continue;
    }
    if (typeof row.evidence !== "string") {
      fail(`check ${key} precisa de evidence string`);
      continue;
    }
    if (row.pass === true) {
      if (!row.evidence.trim()) {
        fail(`check ${key} está true sem evidence — automação não marca PASS`);
      } else if (!fs.existsSync(path.join(root, row.evidence))) {
        fail(`check ${key} aponta evidence inexistente: ${row.evidence}`);
      }
    }
  }

  const allPassed = REQUIRED_CHECKS.every((key) => checkMap[key]?.pass === true);
  if (checksDoc.verdict === "GO" && !allPassed) {
    fail("verdict GO recusado: ainda há check operacional false");
  }
  if (!allPassed && checksDoc.verdict !== "NO-GO") {
    fail("sem evidência operacional o verdict deve ser NO-GO");
  }
}

const report = read("docs/reports/rc1-launch-readiness.md");
if (!report.includes("NO-GO")) fail("relatório RC1 deve declarar NO-GO");
if (!report.includes(FINGERPRINT)) fail("relatório RC1 deve citar o fingerprint");
if (!report.includes(MERGE_SHA)) fail("relatório RC1 deve citar o SHA real da #254");
if (/Real merge SHA[\s\S]{0,80}241386c8fc814ebdfa166dde1035bc3d7ca195f5/.test(report)) {
  fail("relatório RC1 não pode tratar o SHA da branch 9B como merge SHA");
}

const runbook = read("docs/release/RC1_MANUAL_RUNBOOK.md");
if (!runbook.includes("NO-GO")) fail("runbook RC1 deve declarar NO-GO");
if (!runbook.includes("Stripe")) fail("runbook RC1 deve cobrir Stripe");
if (!runbook.includes("rollback")) fail("runbook RC1 deve cobrir rollback");

for (const lesson of ALL_LESSONS) {
  let steps;
  try {
    steps = lessonRoundStepsFor(lesson, {
      silent: true,
      masteryLevel: 1,
      masteryPass: 1,
      attemptNumber: 0,
    });
  } catch (error) {
    fail(`${lesson.id}: lessonRoundStepsFor lançou (${error instanceof Error ? error.message : error})`);
    continue;
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    fail(`${lesson.id}: plano vazio`);
    continue;
  }
  const first = steps[0];
  if (!first || typeof first.kind !== "string" || !/^[a-z][a-z0-9_]*$/.test(first.kind)) {
    fail(`${lesson.id}: primeiro passo sem kind válido (${first?.kind ?? "ausente"})`);
  }
}

const pkg = JSON.parse(read("package.json"));
if (pkg.scripts?.["validate:release-candidate"] !== "node scripts/validate-release-candidate.mjs") {
  fail("package.json deve expor validate:release-candidate");
}
if (pkg.scripts?.["validate:production-no-fixtures"] !== "node scripts/validate-production-no-fixtures.mjs") {
  fail("package.json deve expor validate:production-no-fixtures");
}
if (!String(pkg.scripts?.["validate:beta"] ?? "").includes("validate:release-candidate")) {
  fail("validate:beta deve encadear validate:release-candidate");
}

if (errors.length) {
  console.error("ERRO: validate:release-candidate falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `OK: validate:release-candidate — freeze ${FREEZE}, fingerprint ${fingerprint}, ${ALL_LESSONS.length} lições / ${teachingCount} ensino, verdict NO-GO.`
);
