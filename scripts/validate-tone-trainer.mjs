import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

// Compila o validador do ToneTrainer (e o grafo de dados que ele importa)
// para um diretório temporário e o executa — mesmo padrão do validate-corpus.
const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-tonetrainer-"));

try {
  const program = ts.createProgram(["src/data/toneTrainerValidation.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  });

  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error(
      ts.formatDiagnosticsWithColorAndContext(emit.diagnostics, {
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => rootDir,
        getNewLine: () => "\n",
      })
    );
    process.exitCode = 1;
    throw new Error("Falha ao compilar o validador do ToneTrainer.");
  }

  const { validateToneTrainer } = require(
    path.join(outDir, "src/data/toneTrainerValidation.js")
  );
  const report = validateToneTrainer();
  const { stats } = report;

  console.log(
    `ToneTrainer: ${stats.packs} packs (${stats.tonePacks} de tom, ${stats.consonantPacks} de consoante), ${stats.rounds} rodadas.`
  );

  for (const warning of report.warnings) {
    console.warn(`AVISO [${warning.area}] ${warning.ref}: ${warning.message}`);
  }

  if (report.errors.length > 0) {
    console.error(`\nToneTrainer inválido: ${report.errors.length} erro(s).`);
    for (const error of report.errors.slice(0, 60)) {
      console.error(`- [${error.area}] ${error.ref}: ${error.message}`);
    }
    if (report.errors.length > 60) console.error(`...mais ${report.errors.length - 60} erro(s).`);
    process.exitCode = 1;
  } else {
    console.log(`OK: ToneTrainer validado sem erros (${report.warnings.length} aviso(s)).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
