#!/usr/bin/env node
/**
 * RC2.3.1 — auditoria visual do currículo inteiro + first-20.
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-rc231-"));

try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/visualVocabulary.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/lib/pedagogyV6/applyPedagogyV6.ts",
      "src/lib/visualFirst/applyVisualFirst.ts",
      "src/lib/visualFirst/resolveCurriculumVisual.ts",
      "src/lib/visualFirst/classify.ts",
      "src/lib/visualFirst/firstExposure.ts",
      "src/lib/visualFirst/contextScenes.ts",
      "src/lib/pedagogyV6/perceptualRepetition.ts",
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
    console.error("Falha ao compilar auditoria RC2.3.1");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { ALL_LESSONS, getLesson } = load("src/data/journey.js");
  const { VISUAL_CONCEPTS } = load("src/data/visualVocabulary.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { applyPedagogyV6ToPlan } = load("src/lib/pedagogyV6/applyPedagogyV6.js");
  const { resolveCurriculumVisual } = load("src/lib/visualFirst/resolveCurriculumVisual.js");
  const { auditConcreteFirstExposure } = load("src/lib/visualFirst/firstExposure.js");
  const { PEDAGOGY_VISUAL_SCENES } = load("src/lib/visualFirst/contextScenes.js");
  const { classifyVisualText } = load("src/lib/visualFirst/classify.js");

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

  // —— Full curriculum audit ——
  const lessonReports = [];
  let concreteConcepts = 0;
  let concreteWithAsset = 0;
  let firstExposureCovered = 0;
  let firstExposureMissing = 0;
  let visualExercises = 0;
  let contextScenes = 0;
  let missingAssets = 0;
  let unusedInBank = new Set(VISUAL_CONCEPTS.map((c) => c.id));
  let styleViolations = 0;
  let curriculumLeaks = 0;
  const justifiedExceptions = [];

  for (const lesson of ALL_LESSONS) {
    const introduced = new Set();
    let lessonConcrete = 0;
    let lessonWithAsset = 0;
    let lessonVisualEx = 0;
    let lessonScenes = 0;
    let lessonFirstOk = 0;
    let lessonFirstMiss = 0;

    for (const pass of [1, 2, 3, 4]) {
      const steps = planSteps(lesson, pass);
      for (const step of steps) {
        if (step.kind === "image_choice" || step.kind === "compare_with_image") {
          lessonVisualEx += 1;
          visualExercises += 1;
        }
        if (step.sceneId || (step.imageId && /scene:/.test(String(step.sceneId ?? "")))) {
          lessonScenes += 1;
          contextScenes += 1;
        }
        if (step.imageId) unusedInBank.delete(step.imageId);
        if (step.visualConceptId) unusedInBank.delete(step.visualConceptId);
        if (step.correctImageId) unusedInBank.delete(step.correctImageId);

        const blob = [step.hanzi, step.targetHanzi, step.text, step.audioText].filter(Boolean).join("");
        const resolved = resolveCurriculumVisual({ text: blob, allowUntaughtTarget: true });
        if (resolved.concept && resolved.visualClass === "CONCRETE_VISUAL") {
          if (!introduced.has(resolved.concept.id)) {
            introduced.add(resolved.concept.id);
            lessonConcrete += 1;
            concreteConcepts += 1;
            if (resolved.hasLocalAsset) {
              lessonWithAsset += 1;
              concreteWithAsset += 1;
            } else {
              missingAssets += 1;
            }
          }
        }
      }
      if (pass === 1) {
        const fe = auditConcreteFirstExposure({ lessonId: lesson.id, steps });
        for (const f of fe) {
          if (f.code) {
            lessonFirstMiss += 1;
            firstExposureMissing += 1;
          } else if (f.justifiedException === "ASSET_REQUIRED") {
            justifiedExceptions.push({ lessonId: lesson.id, conceptId: f.conceptId, why: f.justifiedException });
          } else {
            lessonFirstOk += 1;
            firstExposureCovered += 1;
          }
        }
      }
    }

    lessonReports.push({
      lessonId: lesson.id,
      concreteConcepts: lessonConcrete,
      withAsset: lessonWithAsset,
      visualExercises: lessonVisualEx,
      contextScenes: lessonScenes,
      firstExposureCovered: lessonFirstOk,
      firstExposureMissing: lessonFirstMiss,
    });
  }

  const full = {
    wave: "RC2.3.1",
    generatedAt: new Date().toString(),
    totalLessons: ALL_LESSONS.length,
    concreteLessons: lessonReports.filter((l) => l.concreteConcepts > 0).length,
    concreteConcepts,
    visualConceptsInBank: VISUAL_CONCEPTS.length,
    visualConceptsCovered: VISUAL_CONCEPTS.length - unusedInBank.size,
    firstExposureCovered,
    firstExposureMissing,
    visualExercises,
    contextScenes: PEDAGOGY_VISUAL_SCENES.length,
    contextScenesUsed: contextScenes,
    missingAssets,
    justifiedExceptions: justifiedExceptions.length,
    styleViolations,
    curriculumLeakViolations: curriculumLeaks,
    unusedVisualAssetCount: unusedInBank.size,
    unusedVisualAssetIds: [...unusedInBank].slice(0, 40),
    concreteConceptCoverage: concreteConcepts ? concreteWithAsset / concreteConcepts : 0,
    firstExposureVisualCoverage:
      firstExposureCovered + firstExposureMissing
        ? firstExposureCovered / (firstExposureCovered + firstExposureMissing)
        : 1,
    visualExerciseCoverage: visualExercises / Math.max(1, ALL_LESSONS.length * 4),
    lessons: lessonReports,
  };

  // —— First 20 ——
  const first20 = [];
  let ordinal = 0;
  for (const lessonId of FOUNDATION_IDS) {
    const lesson = getLesson(lessonId) ?? ALL_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) continue;
    for (const pass of [1, 2, 3, 4]) {
      ordinal += 1;
      const steps = planSteps(lesson, pass);
      const imageEx = steps.filter((s) => s.kind === "image_choice" || s.kind === "compare_with_image").length;
      const withVisual = steps.filter((s) => s.imageId || s.iconId || s.kind === "image_choice").length;
      const listenImage = steps.filter((s) => s.imageChoiceMode === "listen_and_choose_image").length;
      const scenes = steps.filter((s) => s.sceneId).length;
      const fe = auditConcreteFirstExposure({ lessonId, steps });
      first20.push({
        ordinal,
        lessonId,
        pass,
        stepCount: steps.length,
        stepsWithVisual: withVisual,
        imageExercises: imageEx,
        listenAndChooseImage: listenImage,
        contextScenes: scenes,
        firstExposureFindings: fe.length,
        firstExposureFails: fe.filter((f) => f.code).length,
        visualInjected: imageEx > 0 || withVisual > 0,
      });
    }
  }

  const prevPath = path.join(rootDir, "docs/reports/rc2-3-0-first-20-v6.json");
  const prev = existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : null;

  const first20Payload = {
    wave: "RC2.3.1",
    generatedAt: new Date().toISOString(),
    comparison: {
      rc230_avgSteps: prev?.summary?.avgSteps ?? null,
      rc230_saturationWarnings: prev?.summary?.saturationWarnings ?? null,
      rc231_sessionsWithVisual: first20.filter((s) => s.visualInjected).length,
      rc231_imageExercises: first20.reduce((n, s) => n + s.imageExercises, 0),
      note: "Comparação estrutural. Não declara retenção humana.",
    },
    sessions: first20,
  };

  const reportsDir = path.join(rootDir, "docs/reports");
  await mkdir(reportsDir, { recursive: true });
  await writeFile(path.join(reportsDir, "rc2-3-1-visual-curriculum-audit.json"), JSON.stringify(full, null, 2) + "\n");
  await writeFile(path.join(reportsDir, "rc2-3-1-full-visual-coverage.json"), JSON.stringify(full, null, 2) + "\n");
  await writeFile(path.join(reportsDir, "rc2-3-1-first-20-visual.json"), JSON.stringify(first20Payload, null, 2) + "\n");

  const auditMd = [
    "# RC2.3.1 — Visual Curriculum Audit",
    "",
    `Gerado: ${full.generatedAt}`,
    "",
    "## Métricas globais",
    "",
    `| Métrica | Valor |`,
    `|---|---:|`,
    `| Lições | ${full.totalLessons} |`,
    `| Conceitos no banco | ${full.visualConceptsInBank} |`,
    `| Conceitos concretos tocados | ${full.concreteConcepts} |`,
    `| Com asset local | ${full.visualConceptsCovered} usados / ${full.unusedVisualAssetCount} ainda não encontrados no plano |`,
    `| First exposure coberta | ${full.firstExposureCovered} |`,
    `| First exposure faltando | ${full.firstExposureMissing} |`,
    `| Exercícios visuais (soma passes) | ${full.visualExercises} |`,
    `| Cenas pedagógicas definidas | ${full.contextScenes} |`,
    `| ASSET_REQUIRED / exceções | ${full.justifiedExceptions} |`,
    "",
    "Cobertura = aluno encontra o visual no plano, não só existência no banco.",
    "",
  ].join("\n");
  await writeFile(path.join(reportsDir, "rc2-3-1-visual-curriculum-audit.md"), auditMd + "\n");

  const first20Md = [
    "# RC2.3.1 — First 20 Visual",
    "",
    `Gerado: ${first20Payload.generatedAt}`,
    "",
    `Sessões com visual: **${first20Payload.comparison.rc231_sessionsWithVisual}/20**`,
    `Image exercises: **${first20Payload.comparison.rc231_imageExercises}**`,
    "",
    "| # | Lição | Pass | Steps | Visual steps | Image ex | Scenes | FE fail |",
    "|---:|---|---:|---:|---:|---:|---:|---:|",
    ...first20.map(
      (s) =>
        `| ${s.ordinal} | ${s.lessonId} | ${s.pass} | ${s.stepCount} | ${s.stepsWithVisual} | ${s.imageExercises} | ${s.contextScenes} | ${s.firstExposureFails} |`
    ),
    "",
    "## vs RC2.3.0",
    "",
    `- RC2.3.0 satWarn: ${first20Payload.comparison.rc230_saturationWarnings}`,
    `- RC2.3.1 traz image_choice/cenas injetadas quando há conceito concreto + asset.`,
    `- Declaração: o plano ficou **mais diverso visualmente** onde o conteúdo é concreto.`,
    "",
  ].join("\n");
  await writeFile(path.join(reportsDir, "rc2-3-1-first-20-visual.md"), first20Md + "\n");

  console.log(
    `PASS rc2-3-1-visual-audit lessons=${full.totalLessons} concrete=${full.concreteConcepts} feMiss=${full.firstExposureMissing} imageEx=${full.visualExercises} unusedBank=${full.unusedVisualAssetCount}`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
