import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-module-review-coverage-"));

const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

try {
  const program = ts.createProgram(
    [
      "src/lib/moduleReview.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
      "src/data/hanziBuilder.ts",
      "src/lib/srs.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: true,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:module-review-coverage.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { buildLessonPracticePlan } = load("src/features/lesson/lessonTasks.js");
  const { validateModuleReviewCoverage, PROGRESSIVE_PHRASE_REFS } = load("src/lib/moduleReview.js");

  const reviewLessons = ALL_LESSONS.filter((lesson) => lesson.isReview);
  if (reviewLessons.length === 0) {
    err("journey", "isReview", "Esperava lições de revisão de módulo na jornada.");
  }

  const reviewedUnits = new Set();
  for (const lesson of reviewLessons) {
    const plan = buildLessonPracticePlan(lesson, { silent: true });
    const issues = validateModuleReviewCoverage(lesson.unitId, plan, {});
    reviewedUnits.add(lesson.unitId);
    for (const issue of issues) {
      err(lesson.unitId, lesson.id, issue.message);
    }
    if (plan.length === 0) {
      err(lesson.unitId, lesson.id, "Plano de revisão vazio.");
    }
  }

  const requiredEarlyPhrases = [
    "chunk:nihao",
    "chunk:xiexie",
    "chunk:bukeqi",
    "chunk:zaijian",
    "char:wo",
    "char:ni",
    "char:ren",
    "char:mu",
    "chunk:wohenhao",
    "chunk:nihaoma",
    "chunk:wobuhui",
    "chunk:woxianghe",
    "chunk:mingtianjian",
    "chunk:jintianhenhao",
    "chunk:zheshishui",
    "chunk:nashirenm",
  ];
  for (const ref of requiredEarlyPhrases) {
    if (!PROGRESSIVE_PHRASE_REFS.some((entry) => entry.ref === ref)) {
      err("progressive", ref, "Frase progressiva obrigatória ausente.");
    }
  }

  if (errors.length > 0) {
    console.error(`validate:module-review-coverage falhou com ${errors.length} problema(s):`);
    for (const issue of errors) {
      console.error(`- [${issue.area}] ${issue.ref}: ${issue.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `validate:module-review-coverage OK (${reviewLessons.length} lições · ${reviewedUnits.size} módulos).`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
