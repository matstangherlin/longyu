import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

// Compila o validador de corpus (e o grafo de dados que ele importa) para um
// diretório temporário e o executa — mesmo padrão do validate-hanzi-atlas.
const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-corpus-"));

try {
  const program = ts.createProgram(["src/data/corpusValidation.ts"], {
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
    throw new Error("Falha ao compilar o validador de corpus.");
  }

  const { validateCorpus } = require(path.join(outDir, "src/data/corpusValidation.js"));
  const report = validateCorpus();
  const { stats } = report;

  console.log(
    `Corpus: ${stats.characters} caracteres, ${stats.chunks} chunks, ` +
      `${stats.vocabulary} itens de vocabulário (${stats.vocabularyWords} palavras, ${stats.vocabularyPhrases} microfrases), ` +
      `${stats.microtexts} microtextos, ${stats.lessons} lições (${stats.usefulItems} palavras/chunks, ${stats.totalItems} itens de estudo).`
  );

  for (const warning of report.warnings) {
    console.warn(`AVISO [${warning.area}] ${warning.ref}: ${warning.message}`);
  }

  if (report.errors.length > 0) {
    console.error(`\nCorpus inválido: ${report.errors.length} erro(s).`);
    for (const error of report.errors.slice(0, 60)) {
      console.error(`- [${error.area}] ${error.ref}: ${error.message}`);
    }
    if (report.errors.length > 60) console.error(`...mais ${report.errors.length - 60} erro(s).`);
    process.exitCode = 1;
  } else {
    console.log(`\nOK: corpus validado sem erros (${report.warnings.length} aviso(s)).`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
