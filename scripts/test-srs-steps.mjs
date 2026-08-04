import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

// Testa os learning steps intra-dia do SRS: item novo deixa de pular direto
// para 1 dia. hard repete o passo em 10 min sem avançar a graduação; somente
// "good" conta — o 1º agenda 1 h; o 2º (ou "easy") gradua para um intervalo
// de dia. Itens graduados mantêm o SM-2 original.
const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-srs-steps-"));

let failures = 0;
function assert(cond, message) {
  if (cond) {
    console.log(`ok: ${message}`);
  } else {
    failures += 1;
    console.error(`FALHOU: ${message}`);
  }
}

try {
  const program = ts.createProgram(["src/lib/srs.ts"], {
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
    throw new Error("Falha ao compilar o grafo para test:srs-steps.");
  }

  const { newItem, review, isDue } = require(path.join(outDir, "src/lib/srs.js"));
  const NOW = 1_000_000;
  const HOUR = 60 * 60 * 1000;
  const MIN = 60 * 1000;

  // 1. Novo item + good → passo de aprendizado de 1 h (não 1 dia).
  {
    const r = review(newItem("chunk", "nihao", { now: NOW }), "good", NOW);
    assert(r.intervalDays === 0 && r.reps === 1, "novo+good → passo 1h (intervalDays 0)");
    assert(r.due === NOW + HOUR, "novo+good → due +1h");
    assert(!isDue(r, NOW + 59 * MIN), "não vence antes de 1h");
    assert(isDue(r, NOW + HOUR + 1), "vence a partir de 1h");
  }

  // 2. 2º good (após o passo de 1h) → gradua para 1 dia.
  {
    const step = review(newItem("chunk", "nihao", { now: NOW }), "good", NOW);
    const r = review(step, "good", NOW + HOUR);
    assert(r.intervalDays === 1 && r.reps === 2, "2º good → gradua 1 dia");
    assert(r.due === NOW + HOUR + 1 * 24 * 60 * 60 * 1000, "2º good → due +1 dia");
  }

  // 3. Novo item + hard → repete o passo em 10 min (sem avançar reps).
  {
    const r = review(newItem("chunk", "nihao", { now: NOW }), "hard", NOW);
    assert(r.intervalDays === 0 && r.reps === 0, "novo+hard → continua em learning sem avançar reps");
    assert(r.due === NOW + 10 * MIN, "novo+hard → due +10min");
  }

  // 3b. novo → hard → good: hard não conta; o good seguinte ainda é o 1º passo (1 h).
  {
    const hard = review(newItem("chunk", "nihao", { now: NOW }), "hard", NOW);
    const r = review(hard, "good", NOW + 10 * MIN);
    assert(r.intervalDays === 0 && r.reps === 1, "hard→good → ainda passo de 1h (não gradua)");
    assert(r.due === NOW + 10 * MIN + HOUR, "hard→good → due +1h após o good");
  }

  // 4. Novo item + easy → gradua direto (3 dias, comportamento original).
  {
    const r = review(newItem("chunk", "nihao", { now: NOW }), "easy", NOW);
    assert(r.intervalDays === 3 && r.reps === 1, "novo+easy → 3 dias");
  }

  // 5. again → 10 min e volta para a fase de aprendizado.
  {
    const r = review(newItem("chunk", "nihao", { now: NOW }), "again", NOW);
    assert(r.intervalDays === 0 && r.reps === 0, "again → reset para learning");
    assert(r.due === NOW + 10 * MIN, "again → due +10min");
    const again = review(r, "good", NOW + 11 * MIN);
    assert(again.intervalDays === 0 && again.due === NOW + 11 * MIN + HOUR, "pós-again + good → novo passo de 1h");
  }

  // 6. Item graduado mantém SM-2 original (não entra em learning).
  {
    const base = newItem("chunk", "nihao", { now: NOW });
    const graduated = { ...base, intervalDays: 5, reps: 3, ease: 2.5, due: NOW - 1000 };
    const r = review(graduated, "good", NOW);
    assert(r.intervalDays > 1 && r.reps === 4, "graduado+good → SM-2 normal");
    assert(r.due > NOW + 24 * 60 * 60 * 1000, "graduado+good → intervalo de dias");
  }

  // 7. Intervalo com peso de domínio ainda é aplicado na graduação.
  {
    const base = newItem("chunk", "nihao", { now: NOW, reviewDomain: "leitura" });
    const r = review(review(base, "good", NOW), "good", NOW + HOUR);
    assert(r.intervalDays >= 1, "graduação respeita peso de domínio (>= 1 dia)");
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} verificação(ões) falharam.`);
  process.exitCode = 1;
} else {
  console.log("OK: learning steps do SRS validados.");
}
