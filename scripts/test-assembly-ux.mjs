/**
 * Feedback parcial de montagem com peças — sem entregar a resposta completa.
 * Roda: npm run test:assembly-ux
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-assembly-ux-"));
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

try {
  const program = ts.createProgram(
    ["src/features/lesson/buildAssemblyFeedback.ts", "src/data/errorDiagnosis.ts"],
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
  if (emit.emitSkipped) throw new Error("falha ao compilar buildAssemblyFeedback");

  const { buildAssemblyFeedback, countPrefixMatch } = require(
    path.join(outDir, "src/features/lesson/buildAssemblyFeedback.js")
  );

  assert(countPrefixMatch(["我", "很", "好"], ["我", "很", "好"]) === 3, "prefix total");
  assert(countPrefixMatch(["我", "好", "很"], ["我", "很", "好"]) === 1, "prefix parcial");
  assert(countPrefixMatch(["好", "我"], ["我", "很", "好"]) === 0, "prefix zero");

  const incomplete = buildAssemblyFeedback({
    picked: ["我"],
    target: ["我", "很", "好"],
    requiredCount: 3,
    kind: "sentence_build",
  });
  assert(incomplete.kind === "incomplete", `incomplete kind: ${incomplete.kind}`);
  assert(/falt/i.test(incomplete.message), `incomplete msg: ${incomplete.message}`);
  assert(!/ordem correta|这是|模型/i.test(incomplete.message), "incomplete não revela modelo");

  const order = buildAssemblyFeedback({
    picked: ["我", "好", "很"],
    target: ["我", "很", "好"],
    requiredCount: 3,
    kind: "sentence_build",
  });
  assert(order.kind === "order" || order.prefixMatch >= 1, `order: ${order.kind} pref=${order.prefixMatch}`);
  assert(/ordem|lugar|primeir/i.test(order.message), `order msg: ${order.message}`);
  assert(!order.message.includes("我很好"), "order não entrega frase completa");

  const empty = buildAssemblyFeedback({
    picked: [],
    target: ["你", "好"],
    requiredCount: 2,
  });
  assert(/toque|peças/i.test(empty.message), `empty: ${empty.message}`);

  const steps = await readFile(path.join(rootDir, "src/features/lesson/steps.tsx"), "utf8");
  assert(steps.includes("PieceAssemblyBoard"), "BuildExercise usa PieceAssemblyBoard");
  assert(steps.includes("buildAssemblyFeedback"), "BuildExercise usa buildAssemblyFeedback");
  assert(!/A ordem ainda não fechou — ainda faltam peças/.test(steps), "copy incompleta antiga removida");

  const player = await readFile(path.join(rootDir, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert(player.includes("PieceAssemblyBoard"), "revisão usa PieceAssemblyBoard");
  assert(player.includes("AssemblyCheckActions"), "revisão tem Limpar+Verificar");
  assert(player.includes("data-assembly-tray") || player.includes("PieceAssemblyTray"), "revisão tem tray");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:assembly-ux:");
  for (const e of failures) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:assembly-ux passou (feedback parcial + wiring).");
