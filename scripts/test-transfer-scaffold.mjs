/**
 * test:transfer-scaffold — regressão da escada guided → supported → question.
 *
 * Garante que a primeira transferência não cobra 我要这个 → 你要茶吗？ e que
 * os pré-requisitos / ranking por tentativa batem com a progressão pedagógica.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-transfer-scaffold-"));
try {
  const program = ts.createProgram(
    ["src/data/productionTasks.ts", "src/data/chunks.ts", "src/data/vocabulary.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("emit falhou");
    process.exit(1);
  }

  const {
    SENTENCE_FRAMES,
    FRAME_TASKS,
    transferTasksFor,
    maxTransferAssistForAttempt,
    isTransferTaskEligible,
    PRODUCTION_ASSIST_RANK,
  } = require(path.join(outDir, "src/data/productionTasks.js"));

  assert(maxTransferAssistForAttempt(0) === "guided", "attempt 0 deve limitar a guided");
  assert(maxTransferAssistForAttempt(1) === "supported", "attempt 1 deve limitar a supported");
  assert(maxTransferAssistForAttempt(2) === "question", "attempt 2+ deve permitir question");

  const niyao = SENTENCE_FRAMES.find((frame) => frame.id === "frame_niyao");
  const niyaoma = SENTENCE_FRAMES.find((frame) => frame.id === "frame_niyaoma");
  const woyao = SENTENCE_FRAMES.find((frame) => frame.id === "frame_woyao");
  assert(Boolean(niyao) && niyao.transferAssist === "supported", "frame_niyao supported");
  assert(Boolean(niyaoma) && niyaoma.transferAssist === "question", "frame_niyaoma question");
  assert(Boolean(woyao) && woyao.transferAssist === "guided", "frame_woyao guided");
  assert(Boolean(niyaoma.transferRequiresMa), "niyaoma exige 吗");
  assert(
    (niyaoma.transferRequiresFrameIds ?? []).includes("frame_niyao"),
    "niyaoma exige frame_niyao antes"
  );

  // Glifos suficientes para o anti-padrão antigo 我要这个 → 你要茶吗？
  // Inclui peças novel de guided (苹果/热水) e negação (不喝).
  const rich = new Set([..."我要这个茶水你吗请问在哪里银行不喝热牛奶苹果香蕉菜"]);
  const first = transferTasksFor(rich, {
    maxAssist: maxTransferAssistForAttempt(0),
    preferLowestRung: true,
  });
  assert(first.length > 0, "deve haver transferência guided com glifos ricos");
  assert(
    first.every((task) => task.transferAssist === "guided"),
    `attempt 0 misturou degraus: ${[...new Set(first.map((t) => t.transferAssist))].join(",")}`
  );
  assert(
    first.every((task) => task.frameId !== "frame_niyaoma"),
    "attempt 0 não pode devolver frame_niyaoma"
  );
  assert(
    first.every((task) => !/吗/.test(task.targetHanzi)),
    "attempt 0 não pode cobrar alvo com 吗"
  );

  const guidedWoyao = first.filter((task) => task.frameId === "frame_woyao");
  assert(
    guidedWoyao.some((task) => /我要苹果|我要热水/.test(task.targetHanzi)),
    "guided woyao deve cobrar só troca de objeto (combinação inédita)"
  );

  const mid = transferTasksFor(rich, {
    maxAssist: maxTransferAssistForAttempt(1),
    preferLowestRung: false,
  });
  assert(
    mid.some((task) => task.frameId === "frame_niyao" && task.transferAssist === "supported"),
    "attempt 1 deve poder cobrar frame_niyao (我→你)"
  );
  assert(
    mid.every((task) => PRODUCTION_ASSIST_RANK[task.transferAssist] <= PRODUCTION_ASSIST_RANK.supported),
    "attempt 1 não pode subir a question"
  );

  const late = transferTasksFor(rich, {
    maxAssist: maxTransferAssistForAttempt(2),
    preferLowestRung: false,
  });
  assert(
    late.some((task) => task.frameId === "frame_niyaoma"),
    "attempt 2+ deve poder cobrar 你要…吗？ depois dos pré-requisitos"
  );

  const niyaomaTask = FRAME_TASKS.find(
    (task) => task.frameId === "frame_niyaoma" && task.targetHanzi.includes("茶")
  );
  assert(Boolean(niyaomaTask), "tarefa 你要茶吗 deve existir");
  assert(
    !isTransferTaskEligible(niyaomaTask, rich, "guided"),
    "niyaoma não é elegível sob maxAssist=guided"
  );
  assert(
    isTransferTaskEligible(niyaomaTask, rich, "question"),
    "niyaoma é elegível sob maxAssist=question com 吗 conhecido"
  );
  const withoutMa = new Set([..."我要这个茶水你"]);
  assert(
    !isTransferTaskEligible(niyaomaTask, withoutMa, "question"),
    "niyaoma bloqueia sem glifo 吗"
  );

  if (failures.length > 0) {
    console.error(`FAIL test:transfer-scaffold (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      `OK: test:transfer-scaffold (escada guided→supported→question · ${FRAME_TASKS.length} tarefas).`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
