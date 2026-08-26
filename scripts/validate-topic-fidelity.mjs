#!/usr/bin/env node
/**
 * V4.6.1 — validate:topic-fidelity
 *
 * Audits actual player plans (lessonRoundStepsFor with masteryLevel)
 * for foundation concept topics. Writes docs/reports/topic-fidelity-foundations.md.
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
const reportPath = path.join(rootDir, "docs/reports/topic-fidelity-foundations.md");
const failures = [];
const fail = (message) => failures.push(message);

const DIRECT_MIN = 0.7;
const DIRECT_SUPPORT_MIN = 0.9;
const GENERIC_MAX = 0.1;
const PASSIVE_RUN_MAX = 2;
const CLOCK = { 1: [4, 7], 2: [4, 7], 3: [4, 8], 4: [5, 9] };

function clockMinutes(plan) {
  const scored = plan.filter((step) => step.kind !== "intro" && step.kind !== "listen");
  const intro = plan.length - scored.length;
  return Math.round((intro * 0.35 + scored.length * 0.75) * 10) / 10;
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-topic-fid-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicMasterySpecs.ts",
      "src/data/topicFidelity.ts",
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
    console.error("Falha ao compilar validate:topic-fidelity.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor, authoredTopicMasterySpecIds } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const fidelity = load("src/data/topicFidelity.js");
  const { hasFoundationAuthoredPlan } = load("src/data/foundationTopicPlans.js");

  const authored = new Set(authoredTopicMasterySpecIds());
  for (const id of topic.FOUNDATION_TOPIC_MASTERY_IDS) {
    if (!authored.has(id)) fail(`${id}: foundation topic caiu em defaultSpec (sem TopicMasterySpec autorado)`);
    const lesson = ALL_LESSONS.find((item) => item.id === id);
    if (!lesson) {
      fail(`${id}: id de fundação ausente da Jornada`);
      continue;
    }
    if (!topicMasterySpecFor(lesson)) fail(`${id}: topicMasterySpecFor retornou null`);
  }

  const focusIds = [...topic.CONCEPT_FOUNDATION_TOPIC_IDS];
  const sections = [];
  let overall = "PASS";

  for (const lessonId of focusIds) {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
    if (!lesson) {
      fail(`${lessonId}: lição não encontrada`);
      continue;
    }
    const spec = topicMasterySpecFor(lesson);
    if (!spec) {
      fail(`${lessonId}: sem spec autorado`);
      continue;
    }
    if (!hasFoundationAuthoredPlan(lessonId)) {
      fail(`${lessonId}: sem plano autorado por pass (não pode usar o planner genérico)`);
    }

    sections.push(`## ${lesson.title}`);
    sections.push("");
    sections.push(`Promessa: ${spec.promise}`);
    sections.push("");

    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      const percents = fidelity.fidelityPercents(lessonId, pass, plan);
      const run = fidelity.maxPassiveRun(plan);
      const minutes = clockMinutes(plan);
      const [minMin, maxMin] = CLOCK[pass];

      if (percents.scored === 0) fail(`${lessonId} M${pass}: nenhuma atividade (só passivo)`);
      if (percents.direct < DIRECT_MIN - 1e-9) {
        fail(`${lessonId} M${pass}: DIRECT ${(percents.direct * 100).toFixed(0)}% < 70%`);
      }
      if (percents.direct + percents.supporting < DIRECT_SUPPORT_MIN - 1e-9) {
        fail(`${lessonId} M${pass}: DIRECT+SUPPORTING ${((percents.direct + percents.supporting) * 100).toFixed(0)}% < 90%`);
      }
      if (percents.generic > GENERIC_MAX + 1e-9) {
        fail(`${lessonId} M${pass}: GENERIC ${(percents.generic * 100).toFixed(0)}% > 10%`);
      }
      if (run > PASSIVE_RUN_MAX) {
        fail(`${lessonId} M${pass}: parede de texto (${run} intros/passivos seguidos)`);
      }
      if (minutes > maxMin + 2) {
        fail(`${lessonId} M${pass}: sessão longa demais (~${minutes} min, alvo ${minMin}–${maxMin})`);
      }

      const nihaoCount = plan.filter((step) => {
        const blob = [step.correctAnswer, step.answer, step.audioText, step.title].join("");
        return blob.includes("你好") && fidelity.classifyTopicRelation(lessonId, pass, step) === "GENERIC_REUSE";
      }).length;
      if (nihaoCount >= Math.max(3, Math.ceil(plan.length * 0.5))) {
        fail(`${lessonId} M${pass}: pass dominada por reuso lexical de 你好`);
      }

      sections.push(`### M${pass} · ${spec.passObjectives[pass]}`);
      sections.push("");
      sections.push(
        `| passos | scored | DIRECT | SUPPORTING | GENERIC | ~min | passivo max |`
      );
      sections.push(`|---:|---:|---:|---:|---:|---:|---:|`);
      sections.push(
        `| ${plan.length} | ${percents.scored} | ${(percents.direct * 100).toFixed(0)}% | ${(percents.supporting * 100).toFixed(0)}% | ${(percents.generic * 100).toFixed(0)}% | ${minutes} | ${run} |`
      );
      sections.push("");
      sections.push("| # | kind | relação | título / razão |");
      sections.push("|---:|---|---|---|");
      plan.forEach((step, index) => {
        const relation = fidelity.isPassiveFidelityStep(step)
          ? "PASSIVE"
          : fidelity.classifyTopicRelation(lessonId, pass, step);
        const reason = fidelity.fidelityReason(lessonId, relation === "PASSIVE" ? "SUPPORTING_TOPIC" : relation, step);
        sections.push(
          `| ${index + 1} | ${step.kind} | ${relation} | ${(step.title ?? step.prompt ?? reason).replace(/\|/g, "/")} |`
        );
      });
      sections.push("");
    }
  }

  if (failures.length) overall = "FAIL";

  const lines = [
    "# V4.6.1 — Topic Fidelity (fundações)",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "",
    "Atividades pontuadas excluem intro/listen passivo. DIRECT ≥ 70%. DIRECT+SUPPORTING ≥ 90%. GENERIC ≤ 10%. Máx. 2 passivos seguidos.",
    "",
    `**Resultado: ${overall}**`,
    "",
    ...sections,
  ];
  if (failures.length) {
    lines.push("## Falhas");
    lines.push("");
    for (const message of failures) lines.push(`- ${message}`);
    lines.push("");
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines) + "\n", "utf8");

  if (failures.length) {
    console.error("FAIL validate:topic-fidelity");
    for (const message of failures) console.error(` - ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK validate:topic-fidelity — ${focusIds.length} temas de conceito, relatório ${path.relative(rootDir, reportPath)}`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
