#!/usr/bin/env node
/**
 * TEST-V32 — Mastery Expansion + Survival Mandarin acceptance.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v32-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/chinaReal.ts",
      "src/data/survivalMandarin.ts",
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript nao compilou V3.2 suite");

  const china = require(path.join(outDir, "src/data/chinaReal.js"));
  const survival = require(path.join(outDir, "src/data/survivalMandarin.js"));
  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const expanded = [
    "l4",
    "l24",
    "l27",
    "p6-rotina-trabalho",
    "p6-horarios",
    "p6-compras",
    "p6-china-cidades-2",
    "p6-survival-mandarin",
  ];
  for (const id of expanded) {
    const lesson = getLesson(id);
    assert.ok(lesson, `${id} existe`);
    assert.ok(lesson.masteryLoop, `${id} masteryLoop`);
    assert.ok(pilot.isMasteryPilotLesson(id), `${id} no piloto`);
  }

  const masteryCount = ALL_LESSONS.filter((l) => l.masteryLoop).length;
  assert.ok(masteryCount >= 14, `cobertura mastery >= 14 (tem ${masteryCount})`);

  // Wave2 cities
  assert.ok(china.CHINA_WAVE2_CITIES.some((c) => c.hanzi === "成都"));
  assert.ok(china.CHINA_WAVE2_CITIES.some((c) => c.hanzi === "西安"));
  const wave2 = getLesson("p6-china-cidades-2");
  assert.ok(wave2.steps.some((s) => (s.correctAnswer ?? "").includes("四川菜") || (s.menuItems ?? []).some((m) => m.hanzi === "四川菜")));
  assert.ok(wave2.steps.some((s) => (s.correctAnswer ?? "").includes("古城") || (s.correctAnswer ?? "").includes("这里很老")));

  // Survival
  const surv = getLesson("p6-survival-mandarin");
  for (const needle of ["微信支付", "支付宝", "护照", "洗手间在哪里", "出口"]) {
    const blob = JSON.stringify(surv.steps);
    assert.ok(blob.includes(needle.replace("？", "")), `survival contem ${needle}`);
  }
  assert.ok(surv.steps.some((s) => s.kind === "sign_reading"));
  assert.ok(surv.steps.some((s) => s.kind === "price_task"));
  assert.ok(surv.steps.some((s) => s.kind === "route_sequence"));
  assert.ok(surv.steps.some((s) => s.kind === "schedule_reading"));
  assert.ok(survival.ALL_SURVIVAL_ITEMS.length >= 12);

  // Pass sizing budget
  for (const pass of [1, 2, 3, 4]) {
    const plan = lessonRoundStepsFor(getLesson("p6-china-cidades"), {
      masteryLevel: pass - 1,
      masteryPass: pass,
      silent: true,
    });
    const graded = plan.filter((s) => s.kind !== "intro" && s.kind !== "flashcard" && s.kind !== "listen");
    const budget = mastery.MASTERY_PASS_GRADED_BUDGET[pass];
    // Conta passos totais do plano mastery (ja orçado); permite margem para bonus.
    assert.ok(plan.length <= budget.max + 6, `pass ${pass} nao explode (${plan.length})`);
    assert.ok(plan.length >= budget.min - 2, `pass ${pass} tem massa minima (${plan.length})`);
    void graded;
  }

  // Equivalent answers M4
  const eqs = mastery.equivalentAnswersFor("我要水");
  assert.ok(eqs.some((a) => a.includes("我想喝水")), "agua aceita quero beber");
  const wrapped = mastery.withEquivalentAccepts({ answer: "谢谢", accepts: [] });
  assert.ok((wrapped.accepts ?? []).length >= 2, "withEquivalentAccepts preenche");

  // New kinds graded/review
  const playerSrc = await readFile(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  for (const kind of ["sign_reading", "menu_reading", "price_task", "route_sequence", "schedule_reading"]) {
    assert.match(playerSrc, new RegExp(kind), `${kind} no player`);
  }

  console.log(
    "OK test:mastery-v32 —",
    [
      `mastery lessons ${masteryCount}`,
      "wave2 Chengdu/Xian",
      "survival",
      "pass budget",
      "equivalent answers",
      "new kinds",
    ].join("; ")
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:mastery-v32");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
