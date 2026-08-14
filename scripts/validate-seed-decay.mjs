/**
 * validate:seed-decay — LEX-022
 * Participação relativa de 你好/谢谢/再见/我很好 deve cair após o 1º módulo.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

async function compileAndLoad() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-seed-decay-"));
  const program = ts.createProgram(
    [
      "src/data/atlasCurriculum.ts",
      "src/data/lexicalProgression.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
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
  if (program.emit().emitSkipped) {
    await rm(outDir, { recursive: true, force: true });
    throw new Error("validate:seed-decay: compile failed");
  }
  return { outDir, load: (rel) => require(path.join(outDir, rel)) };
}

async function main() {
  const { outDir, load } = await compileAndLoad();
  try {
    const { buildLexicalGrowthCurve, seedDecayByBand } = load("src/data/atlasCurriculum.js");
    const { ALL_LESSONS } = load("src/data/journey.js");

    const points = buildLexicalGrowthCurve(ALL_LESSONS, { limit: 40 });
    const bands = seedDecayByBand(points, [
      { label: "module1-ish (1–12)", start: 0, end: 12 },
      { label: "next (13–24)", start: 12, end: 24 },
      { label: "later (25–36)", start: 24, end: 36 },
    ]);

    for (const band of bands) {
      console.log(`${band.label}: seedShare=${(band.seedShare * 100).toFixed(1)}% over ${band.lessons} lessons`);
    }

    const early = bands[0]?.seedShare ?? 1;
    const mid = bands[1]?.seedShare ?? 1;
    const late = bands[2]?.seedShare ?? 1;

    // Conceptual targets from LEX-022 — soft then hard.
    if (mid >= early && early > 0.25) {
      console.error("FAIL: seed share did not decay from early → mid band");
      process.exitCode = 1;
    }
    if (mid > 0.45) {
      console.error(`FAIL: mid-band seed share ${(mid * 100).toFixed(1)}% > 45%`);
      process.exitCode = 1;
    }
    if (late > 0.4) {
      console.error(`FAIL: late-band seed share ${(late * 100).toFixed(1)}% > 40%`);
      process.exitCode = 1;
    }
    if (!process.exitCode) console.log("OK seed decay");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
