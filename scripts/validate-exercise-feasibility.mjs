#!/usr/bin/env node
/**
 * V4.6.2 — validate:exercise-feasibility
 *
 * Audits the runtime plan that LessonPlayer receives
 * (`lessonRoundStepsFor` + materializeRuntimeStep) for every lesson ×
 * applicable mastery pass. Writes docs/reports/exercise-feasibility.md.
 *
 * Hard fail when invalid interaction, instruction mismatch, answer leak,
 * IME-only Hanzi production, or dead screens are non-zero.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "docs/reports/exercise-feasibility.md");
const failures = [];
const fail = (message) => failures.push(message);

const FOUNDATION_CONCEPT = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
];

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-ex-feas-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicFidelity.ts",
      "src/data/exerciseFeasibility.ts",
      "src/data/foundationTopicPlans.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:exercise-feasibility.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const feas = load("src/data/exerciseFeasibility.js");
  const fidelity = load("src/data/topicFidelity.js");

  const sentinel = feas.auditStepFeasibility(feas.HUMAN_QA_DEAD_SCREEN, {
    lessonId: "sentinel",
    pass: 3,
    index: 0,
    stage: "usage",
  });
  if (sentinel.feasible) {
    fail("sentinel human QA: a tela Reflexão + Diga + 木 + Continuar deveria falhar");
  }

  const totals = feas.emptyFeasibilityTotals();
  const failingRows = [];
  const foundationRows = [];

  for (const lesson of ALL_LESSONS) {
    const passCount = topic.isTopicMasteryLesson(lesson) ? 4 : 1;
    for (let pass = 1; pass <= passCount; pass += 1) {
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      if (!Array.isArray(plan) || plan.length === 0) {
        fail(`${lesson.id} M${pass}: plano vazio`);
        continue;
      }
      plan.forEach((step, index) => {
        const row = feas.auditStepFeasibility(step, {
          lessonId: lesson.id,
          pass,
          index,
          stage: step.lessonStageId ?? "",
        });
        feas.addFeasibilityTotals(totals, row);
        if (!row.feasible) failingRows.push(row);
        if (FOUNDATION_CONCEPT.includes(lesson.id)) foundationRows.push(row);
      });
    }
  }

  const hardZero = [
    ["invalid interaction", totals.invalidInteraction],
    ["instruction mismatch", totals.instructionMismatch],
    ["answer leak", totals.answerLeak],
    ["IME-only block", totals.imeOnly],
    ["dead screen", totals.deadScreen],
  ];
  for (const [label, count] of hardZero) {
    if (count > 0) fail(`${label} = ${count} (meta = 0)`);
  }

  for (const row of foundationRows.filter((item) => !item.feasible)) {
    fail(
      `foundation ${row.lessonId} M${row.pass} #${row.index + 1} ${row.kind}: ${row.detail.join("; ")}`
    );
  }

  for (const lessonId of FOUNDATION_CONCEPT) {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
    if (!lesson) {
      fail(`${lessonId}: lição de fundação ausente`);
      continue;
    }
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      const percents = fidelity.fidelityPercents(lessonId, pass, plan);
      if (percents.direct < 0.7 - 1e-9) {
        fail(`${lessonId} M${pass}: topic fidelity DIRECT ${(percents.direct * 100).toFixed(0)}% < 70%`);
      }
    }
  }

  const observed = failingRows.filter(
    (row) =>
      /diga sem apoio extra/i.test(row.title) &&
      row.detail.some((line) => /monte|montar|reflex/i.test(line) || /木/.test(line))
  );
  if (observed.length) {
    fail(`tela observada ainda no plano: ${observed.map((row) => `${row.lessonId} M${row.pass}`).join(", ")}`);
  }

  const primeiros = ALL_LESSONS.find((item) => item.id === "p1-primeiros-hanzi");
  if (primeiros) {
    const planM3 = lessonRoundStepsFor(primeiros, {
      masteryLevel: 2,
      masteryPass: 3,
      silent: true,
      attemptNumber: 0,
    });
    if (planM3.some((step) => /diga sem apoio extra/i.test(step.title ?? ""))) {
      fail("p1-primeiros-hanzi M3 ainda emite Diga sem apoio extra");
    }
    if (
      !planM3.some(
        (step) =>
          step.kind === "hanzi_build" &&
          (step.correctAnswer === "木" || /monte o caractere/i.test(step.title ?? ""))
      )
    ) {
      fail("p1-primeiros-hanzi M3 precisa montar 木 com hanzi_build, nao reflexao");
    }
  }

  const overall =
    totals.invalidInteraction === 0 &&
    totals.instructionMismatch === 0 &&
    totals.answerLeak === 0 &&
    totals.imeOnly === 0 &&
    totals.deadScreen === 0 &&
    failures.length === 0
      ? "PASS"
      : "FAIL";

  const byLesson = new Map();
  for (const row of failingRows) {
    const key = `${row.lessonId} M${row.pass}`;
    if (!byLesson.has(key)) byLesson.set(key, []);
    byLesson.get(key).push(row);
  }

  const lines = [
    "# V4.6.2 — Exercise feasibility",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "",
    "Auditoria do plano real (`lessonRoundStepsFor`) × pass de mastery. Meta: invalid = 0, mismatch = 0, leak = 0, IME-only = 0, dead screen = 0.",
    "",
    `**Resultado: ${overall}**`,
    "",
    "## Totais",
    "",
    "| métrica | n |",
    "|---|---:|",
    `| total steps | ${totals.totalSteps} |`,
    `| interactive | ${totals.interactive} |`,
    `| passive | ${totals.passive} |`,
    `| intentional reflection | ${totals.intentionalReflection} |`,
    `| invalid interaction | ${totals.invalidInteraction} |`,
    `| instruction mismatch | ${totals.instructionMismatch} |`,
    `| answer leak | ${totals.answerLeak} |`,
    `| IME-only block | ${totals.imeOnly} |`,
    `| dead screen | ${totals.deadScreen} |`,
    "",
  ];

  if (failingRows.length) {
    lines.push("## Falhas");
    lines.push("");
    lines.push("| lesson | pass | # | kind | title | issues |");
    lines.push("|---|---:|---:|---|---|---|");
    for (const row of failingRows.slice(0, 80)) {
      const title = String(row.title ?? "").replace(/\|/g, "/").slice(0, 60);
      lines.push(
        `| ${row.lessonId} | ${row.pass} | ${row.index + 1} | ${row.kind} | ${title} | ${row.issues.join(", ")} |`
      );
    }
    if (failingRows.length > 80) {
      lines.push("");
      lines.push(`… e mais ${failingRows.length - 80} passos.`);
    }
    lines.push("");
  }

  lines.push("## Fundação (Mandarim / Pinyin / Tom / Hànzì)");
  lines.push("");
  lines.push("Cada pass precisa de topic fidelity DIRECT ≥ 70% **e** feasibility = 0 falhas.");
  lines.push("");

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines) + "\n", "utf8");

  if (failures.length) {
    console.error("FAIL validate:exercise-feasibility");
    for (const message of failures.slice(0, 40)) console.error(` - ${message}`);
    if (failures.length > 40) console.error(` - … +${failures.length - 40} falhas`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK validate:exercise-feasibility — ${ALL_LESSONS.length} lições, ${totals.totalSteps} passos, relatório ${path.relative(rootDir, reportPath)}`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
