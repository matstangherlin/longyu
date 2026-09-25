/**
 * RC2.2.14 · AA — crawler estrutural de progressão.
 *
 * Compila os módulos de dados/planner (sem React) e percorre as 134 lições:
 * passos autorais + plano real de cada passe de maestria (o que o
 * LessonPlayer recebe). Para cada passo registra o StepKind, se há contrato
 * de avanço e se `validateExercise` aceita o passo (o contrário vira a tela
 * de passo quebrado). O resultado alimenta `validate:lesson-step-progression`
 * e a matriz de progressão do relatório.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);

let cached = null;

export async function crawlLessonSteps() {
  if (cached) return cached;
  const rootDir = process.cwd();
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-step-crawl-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/journey.ts",
        "src/data/topicMastery.ts",
        "src/features/lesson/lessonTasks.ts",
        "src/features/lesson/exerciseValidation.ts",
        "src/data/exerciseFeasibility.ts",
        "src/lib/lessonStepContract.ts",
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
    if (program.emit().emitSkipped) throw new Error("crawler: falha ao compilar os módulos de lição");
    const load = (relative) => require(path.join(outDir, relative));
    const { ALL_LESSONS } = load("src/data/journey.js");
    const topic = load("src/data/topicMastery.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
    const { STEP_ADVANCE_CONTRACT } = load("src/lib/lessonStepContract.js");
    // O StepRenderer valida o passo JÁ materializado (mesma transformação aqui).
    const { materializeRuntimeStep } = load("src/data/exerciseFeasibility.js");

    const steps = [];
    const push = (lessonId, source, index, step) => {
      let valid = true;
      let reason = "";
      try {
        const result = validateExercise(materializeRuntimeStep(step));
        valid = result?.ok !== false && result?.valid !== false;
        if (!valid) reason = String(result?.reason ?? result?.errors?.[0] ?? "invalid");
      } catch (error) {
        valid = false;
        reason = error instanceof Error ? error.message : String(error);
      }
      steps.push({ lessonId, source, index, kind: step?.kind ?? "none", valid, reason, ...(valid ? {} : { step }) });
    };
    for (const lesson of ALL_LESSONS) {
      lesson.steps.forEach((step, index) => push(lesson.id, "authored", index, step));
      const passCount = topic.isTopicMasteryLesson(lesson) ? 4 : 1;
      for (let pass = 1; pass <= passCount; pass += 1) {
        const plan = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true, attemptNumber: 0 });
        (plan ?? []).forEach((step, index) => push(lesson.id, `pass${pass}`, index, step));
      }
    }
    cached = { lessonCount: ALL_LESSONS.length, contractKinds: Object.keys(STEP_ADVANCE_CONTRACT), steps };
    return cached;
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}
