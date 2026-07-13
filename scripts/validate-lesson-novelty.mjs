/**
 * validate:lesson-novelty
 *
 * Gera o plano REAL de cada lição e falha se:
 * - lição comum sem item novo (exceto revisão);
 * - excesso de repetição pedagógica;
 * - revisão sem conteúdo antigo;
 * - sem uso em contexto;
 * - menos de 3 famílias de exercício;
 * - conteúdo antigo fora de contexto novo.
 */

import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const addError = (lessonId, message) => errors.push(`[${lessonId}] ${message}`);

const SOURCE_FILES = [
  "src/features/lesson/lessonTasks.ts",
  "src/lib/lessonNovelty.ts",
  "src/lib/moduleReview.ts",
  "src/lib/pinyin.ts",
  "src/data/journey.ts",
  "src/data/characters.ts",
  "src/data/chunks.ts",
  "src/data/conversationScenes.ts",
  "src/data/visualVocabulary.ts",
  "src/data/hanziBuilder.ts",
  "src/data/types.ts",
];

async function main() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-novelty-"));
  try {
    const program = ts.createProgram(SOURCE_FILES, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    });
    const emit = program.emit();
    if (emit.emitSkipped) {
      console.error("validate:lesson-novelty: falha ao compilar o grafo.");
      process.exit(1);
    }

    const tasks = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
    const journey = require(path.join(outDir, "src/data/journey.js"));
    const { lessonRoundStepsFor, lessonNoveltyIssues } = tasks;
    const lessons = journey.ALL_LESSONS;

    let planCount = 0;
    for (const lesson of lessons) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      planCount += 1;
      const issues = lessonNoveltyIssues(lesson, plan, { silent: true });
      for (const issue of issues) addError(lesson.id, issue);
    }

    if (errors.length > 0) {
      console.error(`\nvalidate:lesson-novelty encontrou ${errors.length} problema(s):`);
      for (const error of errors.slice(0, 100)) console.error(`- ${error}`);
      if (errors.length > 100) console.error(`...mais ${errors.length - 100}.`);
      process.exit(1);
    }
    console.log(`OK: validate:lesson-novelty passou (${planCount} planos verificados).`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

await main();
