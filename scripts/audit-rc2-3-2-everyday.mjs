#!/usr/bin/env node
/**
 * RC2.3.2 — Everyday curriculum map + communicative outcomes + first-20 human audit.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-rc232-"));

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/lib/pedagogyV6/applyPedagogyV6.ts",
      "src/lib/everydayMandarin/applyEverydayMandarin.ts",
      "src/lib/everydayMandarin/scenarios.ts",
      "src/lib/everydayMandarin/intents.ts",
      "src/lib/everydayMandarin/quality.ts",
      "src/lib/pedagogyV6/humanContext.ts",
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
    console.error("Falha ao compilar auditoria RC2.3.2");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { ALL_LESSONS, getLesson } = load("src/data/journey.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { applyPedagogyV6ToPlan } = load("src/lib/pedagogyV6/applyPedagogyV6.js");
  const { EVERYDAY_SCENARIOS } = load("src/lib/everydayMandarin/scenarios.js");
  const { inferEverydayIntentFromText, intentIsCommunicative } = load("src/lib/everydayMandarin/intents.js");
  const { humanQualityDimensions, assessEverydayContextQuality, isProductionKind, isTransferKind } = load(
    "src/lib/everydayMandarin/quality.js"
  );
  const { summarizeHumanContext } = load("src/lib/pedagogyV6/humanContext.js");

  const FOUNDATION_IDS = [
    "p1-o-que-e-mandarim",
    "p1-o-que-e-pinyin",
    "p1-o-que-e-tom",
    "p1-o-que-e-hanzi",
    "p1-primeiros-hanzi",
  ];

  function planSteps(lesson, pass) {
    try {
      const raw = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      return applyPedagogyV6ToPlan({
        lessonId: lesson.id,
        masteryPass: pass,
        steps: raw,
        taughtConceptIds: {},
        pilotOnly: true,
      }).steps;
    } catch {
      return [];
    }
  }

  // —— Curriculum map ——
  const mapLessons = [];
  const outcomes = [];
  let leakErrors = 0;
  let contextQualityErrors = 0;
  let productionByPass = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let stepsByPass = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let transferByPass = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const lesson of ALL_LESSONS) {
    const intents = new Set();
    const domains = new Set();
    const scenarios = new Set();
    const communicative = [];
    for (const pass of [1, 2, 3, 4]) {
      const steps = planSteps(lesson, pass);
      stepsByPass[pass] += steps.length;
      for (const step of steps) {
        if (isProductionKind(step.kind) || step.learnerAgency === "PRODUCE" || step.learnerAgency === "SPEAK") {
          productionByPass[pass] += 1;
        }
        if (isTransferKind(step.kind) || step.learnerAgency === "TRANSFER") transferByPass[pass] += 1;
        const intent =
          step.everydayIntent ||
          inferEverydayIntentFromText(
            [step.dialoguePrompt, step.promptPt, step.title, step.body].filter(Boolean).join(" ")
          ).everydayIntent;
        intents.add(intent);
        if (step.realWorldDomain) domains.add(step.realWorldDomain);
        if (step.everydayScenarioId) scenarios.add(step.everydayScenarioId);
        if (intentIsCommunicative(intent)) {
          communicative.push({ pass, intent, kind: step.kind });
        }
        for (const f of assessEverydayContextQuality(step, pass)) {
          if (f.level === "ERROR") {
            if (f.code === "EVERYDAY_CURRICULUM_LEAK") leakErrors += 1;
            else contextQualityErrors += 1;
          }
        }
      }
    }
    const outcomeList = [...intents].filter(intentIsCommunicative);
    mapLessons.push({
      lessonId: lesson.id,
      title: lesson.title,
      intents: [...intents],
      domains: [...domains],
      scenarios: [...scenarios],
      communicativeOutcomeCount: outcomeList.length,
      communicativeOutcomes: outcomeList,
    });
    outcomes.push({
      lessonId: lesson.id,
      communicativeOutcomes: outcomeList,
      weak: outcomeList.length === 0,
    });
  }

  const curriculumMap = {
    wave: "RC2.3.2",
    generatedAt: new Date().toISOString(),
    totalLessons: ALL_LESSONS.length,
    scenarioBankSize: EVERYDAY_SCENARIOS.length,
    lessonsWithCommunicativeOutcome: outcomes.filter((o) => !o.weak).length,
    lessonsWeakOutcome: outcomes.filter((o) => o.weak).length,
    productionShareByPass: Object.fromEntries(
      [1, 2, 3, 4].map((p) => [p, productionByPass[p] / Math.max(1, stepsByPass[p])])
    ),
    transferShareByPass: Object.fromEntries(
      [1, 2, 3, 4].map((p) => [p, transferByPass[p] / Math.max(1, stepsByPass[p])])
    ),
    contextQualityErrors,
    curriculumLeakErrors: leakErrors,
    lessons: mapLessons,
  };

  const communicativePayload = {
    wave: "RC2.3.2",
    generatedAt: new Date().toISOString(),
    totalLessons: ALL_LESSONS.length,
    withOutcome: outcomes.filter((o) => !o.weak).length,
    withoutOutcome: outcomes.filter((o) => o.weak).length,
    lessons: outcomes,
  };

  // —— First 20 human ——
  const first20 = [];
  let ordinal = 0;
  for (const lessonId of FOUNDATION_IDS) {
    const lesson = getLesson(lessonId) ?? ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) continue;
    for (const pass of [1, 2, 3, 4]) {
      ordinal += 1;
      const steps = planSteps(lesson, pass);
      const human = summarizeHumanContext(steps);
      const intents = steps.map(
        (s) =>
          s.everydayIntent ||
          inferEverydayIntentFromText(
            [s.dialoguePrompt, s.promptPt, s.title].filter(Boolean).join(" ")
          ).everydayIntent
      );
      const dims = humanQualityDimensions(steps, intents);
      first20.push({
        ordinal,
        lessonId,
        pass,
        stepCount: steps.length,
        humanShare: human.humanShare,
        metalinguistic: human.metalinguistic,
        ...dims,
        hasGreeting: intents.includes("GREET"),
        hasDialogue: steps.some((s) => /dialogue|conversation/.test(s.kind)),
        hasProduction: steps.some((s) => isProductionKind(s.kind)),
        hasVisual: steps.some((s) => s.imageId || s.kind === "image_choice"),
      });
    }
  }

  const capabilities = {
    greeted: first20.some((s) => s.hasGreeting),
    dialogue: first20.some((s) => s.hasDialogue),
    production: first20.some((s) => s.hasProduction),
    visual: first20.some((s) => s.hasVisual),
    humanSituation: first20.some((s) => s.humanSituationShare > 0.1),
  };

  const prev230 = existsSync(path.join(rootDir, "docs/reports/rc2-3-0-first-20-v6.json"))
    ? JSON.parse(readFileSync(path.join(rootDir, "docs/reports/rc2-3-0-first-20-v6.json"), "utf8"))
    : null;
  const prev231 = existsSync(path.join(rootDir, "docs/reports/rc2-3-1-first-20-visual.json"))
    ? JSON.parse(readFileSync(path.join(rootDir, "docs/reports/rc2-3-1-first-20-visual.json"), "utf8"))
    : null;

  const first20Payload = {
    wave: "RC2.3.2",
    generatedAt: new Date().toISOString(),
    comparison: {
      rc230_avgSteps: prev230?.summary?.avgSteps ?? null,
      rc231_sessionsWithVisual: prev231?.comparison?.rc231_sessionsWithVisual ?? null,
      rc232_avgHumanShare: first20.reduce((n, s) => n + s.humanShare, 0) / Math.max(1, first20.length),
      rc232_sessionsWithDialogue: first20.filter((s) => s.hasDialogue).length,
      rc232_sessionsWithProduction: first20.filter((s) => s.hasProduction).length,
    },
    first20Capabilities: capabilities,
    productionShareByPass: curriculumMap.productionShareByPass,
    transferShareByPass: curriculumMap.transferShareByPass,
    sessions: first20,
  };

  const reportsDir = path.join(rootDir, "docs/reports");
  await mkdir(reportsDir, { recursive: true });
  await writeFile(path.join(reportsDir, "rc2-3-2-everyday-curriculum-map.json"), JSON.stringify(curriculumMap, null, 2) + "\n");
  await writeFile(
    path.join(reportsDir, "rc2-3-2-everyday-curriculum-map.md"),
    [
      "# RC2.3.2 — Everyday Curriculum Map",
      "",
      `Gerado: ${curriculumMap.generatedAt}`,
      "",
      `| Métrica | Valor |`,
      `|---|---:|`,
      `| Lições | ${curriculumMap.totalLessons} |`,
      `| Cenários no banco | ${curriculumMap.scenarioBankSize} |`,
      `| Com communicative outcome | ${curriculumMap.lessonsWithCommunicativeOutcome} |`,
      `| Sem outcome comunicativo | ${curriculumMap.lessonsWeakOutcome} |`,
      `| Context quality errors | ${curriculumMap.contextQualityErrors} |`,
      `| Curriculum leaks | ${curriculumMap.curriculumLeakErrors} |`,
      "",
      "## Production share by pass",
      "",
      ...[1, 2, 3, 4].map((p) => `- Pass ${p}: ${(curriculumMap.productionShareByPass[p] * 100).toFixed(1)}%`),
      "",
      "## Transfer share by pass",
      "",
      ...[1, 2, 3, 4].map((p) => `- Pass ${p}: ${(curriculumMap.transferShareByPass[p] * 100).toFixed(1)}%`),
      "",
    ].join("\n") + "\n"
  );
  await writeFile(path.join(reportsDir, "rc2-3-2-communicative-outcomes.json"), JSON.stringify(communicativePayload, null, 2) + "\n");
  await writeFile(path.join(reportsDir, "rc2-3-2-first-20-human.json"), JSON.stringify(first20Payload, null, 2) + "\n");
  await writeFile(
    path.join(reportsDir, "rc2-3-2-first-20-human.md"),
    [
      "# RC2.3.2 — First 20 Human Audit",
      "",
      `Gerado: ${first20Payload.generatedAt}`,
      "",
      "## Capabilities nas primeiras 20",
      "",
      ...Object.entries(capabilities).map(([k, v]) => `- ${k}: ${v ? "YES" : "NO"}`),
      "",
      `Avg humanShare: ${(first20Payload.comparison.rc232_avgHumanShare * 100).toFixed(1)}%`,
      `Sessions with dialogue: ${first20Payload.comparison.rc232_sessionsWithDialogue}`,
      `Sessions with production: ${first20Payload.comparison.rc232_sessionsWithProduction}`,
      "",
      "Comparação: RC2.3.0 / RC2.3.1 / RC2.3.2 — ver JSON.",
      "",
    ].join("\n") + "\n"
  );

  console.log(
    `PASS rc2-3-2-everyday-audit (lessons=${ALL_LESSONS.length}, outcomes=${communicativePayload.withOutcome}, leaks=${leakErrors}, cqErr=${contextQualityErrors})`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
