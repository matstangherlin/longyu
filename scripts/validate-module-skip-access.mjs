import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-module-skip-access-"));

const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

try {
  const program = ts.createProgram(
    [
      "src/lib/moduleSkipAccess.ts",
      "src/features/challenge/examBuilder.ts",
      "src/data/journey.ts",
      "src/data/economy.ts",
      "src/lib/storage.ts",
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
    console.error("Falha ao compilar o grafo para validate:module-skip-access.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const load = (rel) => require(path.join(outDir, rel));
  const { JOURNEY, FOUNDATION_LESSON_IDS } = load("src/data/journey.js");
  const { MODULE_SKIP_VALIDATION_QI, MODULE_PASS_QI } = load("src/data/economy.js");
  const { weekKey } = load("src/lib/storage.js");
  const { buildModuleSkipTest, gradeModuleSkipTest, EXAM_PASS_RATIO } = load("src/features/challenge/examBuilder.js");
  const {
    getModuleSkipBand,
    getModuleSkipAccessInfo,
    unitHasPremiumContent,
    lessonsCompletableViaSkipTest,
  } = load("src/lib/moduleSkipAccess.js");

  const units = JOURNEY.flatMap((phase) => phase.units);

  const initialUnits = units.filter((unit) => getModuleSkipBand(unit) === "initial");
  const intermediateUnits = units.filter((unit) => getModuleSkipBand(unit) === "intermediate");
  const advancedUnits = units.filter((unit) => getModuleSkipBand(unit) === "advanced");
  const proUnits = units.filter((unit) => getModuleSkipBand(unit) === "pro_content");

  if (initialUnits.length === 0) err("bands", "initial", "Esperava módulos iniciais (fundamentos).");
  if (intermediateUnits.length === 0) err("bands", "intermediate", "Esperava módulos intermediários.");
  if (advancedUnits.length === 0) err("bands", "advanced", "Esperava ao menos um módulo avançado (p7).");
  if (proUnits.length === 0) err("bands", "pro_content", "Esperava módulos com conteúdo Pro.");

  for (const unit of initialUnits.slice(0, 2)) {
    const free = getModuleSkipAccessInfo(unit, { isPremium: false, moduleSkipUsage: {}, inventory: {}, points: 0 });
    if (free.requiresPro) err("initial", unit.id, "Módulo inicial não deve exigir Pro.");
    if (!free.requiresCharge) err("initial", unit.id, "Módulo inicial deve consumir Carga no grátis.");
  }

  for (const unit of advancedUnits) {
    const free = getModuleSkipAccessInfo(unit, { isPremium: false, moduleSkipUsage: {}, inventory: {}, points: 999 });
    if (!free.requiresPro) err("advanced", unit.id, "Módulo avançado deve exigir Pro.");
    if (free.allowed) err("advanced", unit.id, "Grátis não pode iniciar teste avançado.");
  }

  for (const unit of proUnits.slice(0, 2)) {
    const free = getModuleSkipAccessInfo(unit, { isPremium: false, moduleSkipUsage: {}, inventory: {}, points: 999 });
    if (!free.requiresPro) err("pro_content", unit.id, "Módulo Pro deve exigir assinatura.");
    if (free.allowed) err("pro_content", unit.id, "Grátis não pode iniciar teste em módulo Pro.");
    if (!unitHasPremiumContent(unit)) err("pro_content", unit.id, "Band pro_content sem lição premium.");
  }

  const intermediate = intermediateUnits[0];
  if (intermediate) {
    const first = getModuleSkipAccessInfo(intermediate, { isPremium: false, moduleSkipUsage: {}, inventory: {}, points: 0 });
    if (first.weeklyFreeRemaining !== 1) err("intermediate", intermediate.id, "Primeira tentativa semanal deve ser grátis.");
    const second = getModuleSkipAccessInfo(intermediate, {
      isPremium: false,
      moduleSkipUsage: { [intermediate.id]: { weekKey: weekKey(), attempts: 1 } },
      inventory: {},
      points: 0,
    });
    if (!second.requiresAttemptPayment) err("intermediate", intermediate.id, "Segunda tentativa na semana deve exigir Qi/passe.");
  }

  for (const unit of units) {
    const exam = buildModuleSkipTest(unit);
    if (exam.status !== "ok") continue;
    const essentials = exam.questions.filter((q) => q.isEssential);
    if (essentials.length === 0) err("essentials", unit.id, "Teste sem item essencial.");

    const allCorrect = new Set(exam.questions.map((q) => q.id));
    const perfect = gradeModuleSkipTest(exam.questions, allCorrect);
    if (!perfect.passed) err("grading", unit.id, "100% com essenciais deveria passar.");

    if (essentials[0]) {
      const missingEssential = new Set(allCorrect);
      missingEssential.delete(essentials[0].id);
      const blocked = gradeModuleSkipTest(exam.questions, missingEssential);
      if (blocked.passed) err("grading", unit.id, "Errar essencial deve bloquear aprovação.");
    }
  }

  if (MODULE_SKIP_VALIDATION_QI >= MODULE_PASS_QI) {
    err("rewards", "qi", "Validação por teste deve dar menos Qi que recompensa antiga de módulo.");
  }
  if (MODULE_SKIP_VALIDATION_QI > 10) {
    err("rewards", "qi", "Validação por teste deve ser recompensa pequena (<=10 Qi).");
  }

  if (Math.round(EXAM_PASS_RATIO * 100) !== 90) {
    err("grading", "ratio", "Aprovação do teste deve exigir 90%.");
  }

  for (const lessonId of FOUNDATION_LESSON_IDS) {
    const u11 = units.find((unit) => unit.id === "u1-1");
    if (!u11?.lessons.some((lesson) => lesson.id === lessonId)) {
      err("foundation", lessonId, "Lição fundamental deve existir em u1-1.");
    }
    const completable = lessonsCompletableViaSkipTest(u11);
    if (completable.includes(lessonId)) {
      err("foundation", lessonId, "Teste de pular não deve concluir lição fundamental.");
    }
  }

  if (errors.length) {
    console.error("validate:module-skip-access falhou:");
    for (const item of errors) {
      console.error(`- [${item.area}] ${item.ref}: ${item.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `validate:module-skip-access OK (${initialUnits.length} iniciais, ${intermediateUnits.length} intermediários, ${advancedUnits.length} avançados, ${proUnits.length} Pro).`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
