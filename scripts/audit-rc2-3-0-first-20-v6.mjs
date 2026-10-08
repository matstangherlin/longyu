#!/usr/bin/env node
/**
 * RC2.3.0 — auditoria das primeiras 20 sessões (5 foundation topics × 4 passes)
 * com métricas Pedagogy V6 (não reutiliza só o audit RC2.2.23).
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const rootDir = process.cwd();
const require = createRequire(import.meta.url);

const FOUNDATION_IDS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
];

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-rc230-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/lib/pedagogyV6/applyPedagogyV6.ts",
      "src/lib/pedagogyV6/discovery.ts",
      "src/lib/pedagogyV6/perceptualRepetition.ts",
      "src/lib/pedagogyV6/activityContract.ts",
      "src/lib/pedagogyV6/humanContext.ts",
      "src/lib/pedagogyV6/earlyVisual.ts",
      "src/lib/semanticRepetition.ts",
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
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar auditoria RC2.3.0");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { ALL_LESSONS, getLesson } = load("src/data/journey.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { applyPedagogyV6ToPlan } = load("src/lib/pedagogyV6/applyPedagogyV6.js");
  const { auditPedagogicalSession } = load("src/lib/pedagogyV6/activityContract.js");
  const { summarizeHumanContext } = load("src/lib/pedagogyV6/humanContext.js");
  const { auditEarlyVisualSupport } = load("src/lib/pedagogyV6/earlyVisual.js");
  const { saturationScore, saturationWarningForLesson, perceptualItemFromStep, interactionFamilyFor } = load(
    "src/lib/pedagogyV6/perceptualRepetition.js"
  );
  const { cognitiveOperationFor } = load("src/lib/semanticRepetition.js");

  const sessions = [];
  let ordinal = 0;
  for (const lessonId of FOUNDATION_IDS) {
    const lesson = getLesson(lessonId) ?? ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) continue;
    for (const pass of [1, 2, 3, 4]) {
      ordinal += 1;
      let raw = [];
      try {
        raw = lessonRoundStepsFor(lesson, {
          masteryLevel: pass - 1,
          masteryPass: pass,
          silent: true,
          attemptNumber: 0,
        });
      } catch (err) {
        sessions.push({ ordinal, lessonId, pass, error: String(err) });
        continue;
      }
      const v6 = applyPedagogyV6ToPlan({
        lessonId,
        masteryPass: pass,
        steps: raw,
        taughtConceptIds: {},
        pilotOnly: true,
      });
      const steps = v6.steps;
      const sat = saturationScore(steps.map(perceptualItemFromStep));
      const satWarning = saturationWarningForLesson(lessonId, sat);
      const human = summarizeHumanContext(steps);
      const visual = auditEarlyVisualSupport(lessonId, steps);
      const contract = auditPedagogicalSession({
        lessonId,
        masteryPass: pass,
        steps,
        taught: {},
      });
      const families = {};
      const ops = {};
      for (const step of steps) {
        const f = interactionFamilyFor(step.kind);
        const op = cognitiveOperationFor(step.kind);
        families[f] = (families[f] ?? 0) + 1;
        ops[op] = (ops[op] ?? 0) + 1;
      }
      sessions.push({
        ordinal,
        lessonId,
        pass,
        stepCount: steps.length,
        discoveryInjected: v6.discoveryInjected,
        discoveryMomentId: v6.discoveryMomentId,
        perceptualRemoved: v6.perceptualRemoved,
        perceptualReordered: v6.perceptualReordered,
        saturation: {
          targetDominance: Number(sat.targetDominance.toFixed(3)),
          interactionDominance: Number(sat.interactionDominance.toFixed(3)),
          presentationDominance: Number(sat.presentationDominance.toFixed(3)),
          semanticRedundancy: Number(sat.semanticRedundancy.toFixed(3)),
          dominantTarget: sat.dominantTarget,
          dominantFamily: sat.dominantFamily,
          warning: satWarning,
          redundant: sat.report.redundant,
        },
        human,
        visualMissing: visual.filter((v) => v.code).length,
        contractFail: contract.fail,
        contractWarn: contract.warn,
        chargedBeforeTaught: contract.chargedBeforeTaught.length,
        interactionFamilies: families,
        cognitiveOperations: ops,
        estimatedMinutesHint: Math.round(steps.length * 0.7 * 10) / 10,
      });
    }
  }

  const prevPath = path.join(rootDir, "docs/reports/rc2-2-23-semantic-repetition.json");
  let before = null;
  if (existsSync(prevPath)) {
    try {
      before = JSON.parse(readFileSync(prevPath, "utf8"));
    } catch {
      before = null;
    }
  }

  const warnings = sessions.filter((s) => s.saturation?.warning).length;
  const discoveries = sessions.filter((s) => s.discoveryInjected).length;
  const payload = {
    wave: "RC2.3.0",
    version: "Pedagogy V6",
    generatedAt: new Date().toISOString(),
    scope: "5 foundation topics × 4 passes = 20 sessions",
    lessonIds: FOUNDATION_IDS,
    summary: {
      sessions: sessions.length,
      discoveryInjected: discoveries,
      saturationWarnings: warnings,
      avgSteps: Number(
        (sessions.reduce((n, s) => n + (s.stepCount ?? 0), 0) / Math.max(1, sessions.length)).toFixed(2)
      ),
      avgHumanShare: Number(
        (
          sessions.reduce((n, s) => n + (s.human?.humanShare ?? 0), 0) / Math.max(1, sessions.length)
        ).toFixed(3)
      ),
    },
    comparisonNote:
      "Comparação estrutural com RC2.2.x (repetição semântica). Não declara melhoria de retenção humana.",
    previousSemanticAuditPresent: Boolean(before),
    sessions,
  };

  const reportsDir = path.join(rootDir, "docs/reports");
  await mkdir(reportsDir, { recursive: true });
  await writeFile(path.join(reportsDir, "rc2-3-0-first-20-v6.json"), JSON.stringify(payload, null, 2) + "\n");

  const md = [
    "# RC2.3.0 — First 20 Sessions (Pedagogy V6)",
    "",
    `Gerado: ${payload.generatedAt}`,
    "",
    "## Escopo",
    "",
    "5 foundation topics × 4 passes = 20 sessões (mesmo conjunto do audit semântico RC2.2.23).",
    "",
    "## Resumo",
    "",
    `| Métrica | Valor |`,
    `|---|---:|`,
    `| Sessões | ${payload.summary.sessions} |`,
    `| Descoberta injetada | ${payload.summary.discoveryInjected} |`,
    `| Warnings de saturação | ${payload.summary.saturationWarnings} |`,
    `| Média de passos | ${payload.summary.avgSteps} |`,
    `| Human share médio | ${payload.summary.avgHumanShare} |`,
    "",
    "## Comparação RC2.2.x vs RC2.3.0",
    "",
    "- RC2.2.x: orçamento 5–9; saturação de 你好 em sessões 5/6/16 no audit semântico.",
    "- RC2.3.0: orçamento 7–15 (teto); Descoberta no Pass 1; diversificação perceptiva; piloto humano/visual.",
    "- Declaração válida: **o plano pedagógico ficou mais diverso estruturalmente** quando discovery/diversify atuam.",
    "- Declaração **não** feita: melhoria percentual de retenção humana.",
    "",
    "## Sessões",
    "",
    "| # | Lição | Pass | Steps | Discovery | Saturation warn | Human share | Dominant |",
    "|---:|---|---:|---:|---|---|---:|---|",
    ...sessions.map(
      (s) =>
        `| ${s.ordinal} | ${s.lessonId} | ${s.pass} | ${s.stepCount ?? "ERR"} | ${s.discoveryInjected ? "yes" : "no"} | ${
          s.saturation?.warning ? "yes" : "no"
        } | ${(s.human?.humanShare ?? 0).toFixed(2)} | ${s.saturation?.dominantTarget ?? "—"} |`
    ),
    "",
  ].join("\n");
  await writeFile(path.join(reportsDir, "rc2-3-0-first-20-v6.md"), md + "\n");
  console.log(`PASS rc2-3-0-first-20-v6 (${sessions.length} sessions, discovery=${discoveries}, satWarn=${warnings})`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
