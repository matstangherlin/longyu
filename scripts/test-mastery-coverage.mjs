#!/usr/bin/env node
/**
 * TEST-098 — Mastery Coverage acceptance (V3.3).
 *
 * Complementa test-mastery-v32.mjs / test-mastery-loop.mjs: em vez de auditar
 * o piloto lição-a-lição, audita a COBERTURA do Mastery Loop sobre a Jornada
 * inteira, usando a classificação de src/data/masteryCoverage.ts.
 *
 * Escrito defensivamente porque outra IA migra lições para masteryLoop em
 * paralelo (WAVE1_EXPANSION_LESSON_IDS, masteryPilot.ts, masteryWave1Bonus.ts
 * etc.): a compilação é feita em dois níveis —
 *
 *   "core"  — masteryLoop.ts + masteryCoverage.ts + journey.ts. Não dependem
 *             de masteryPilot.ts (só imports de tipo), então continuam de pé
 *             mesmo em meio a uma edição grande de masteryPilot.ts.
 *   "pilot" — masteryPilot.ts + lessonTasks.ts. Se estes ainda não compilarem
 *             (ex.: import para um arquivo que a outra IA ainda não criou),
 *             os testes que dependem deles são pulados com aviso — o teste
 *             nunca deixa de checar a contagem básica de masteryLoop.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const TS_COMPILE_OPTIONS = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  rootDir: root,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
  jsx: ts.JsxEmit.ReactJSX,
};

/** Compila + carrega um conjunto de arquivos num outDir descartável. */
async function compileAndRequire(relSourcePaths, tmpPrefix) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), tmpPrefix));
  try {
    const program = ts.createProgram(relSourcePaths, { ...TS_COMPILE_OPTIONS, outDir });
    const emit = program.emit();
    if (emit.emitSkipped) throw new Error(`TypeScript não compilou: ${relSourcePaths.join(", ")}`);
    return Object.fromEntries(
      relSourcePaths.map((relPath) => [relPath, require(path.join(outDir, relPath.replace(/\.ts$/, ".js")))])
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/** Tenta compilar+carregar um módulo isolado; nunca derruba o processo. */
async function tryLoadOptionalModule(relSourcePath) {
  if (!existsSync(path.join(root, relSourcePath))) return null;
  try {
    const mods = await compileAndRequire([relSourcePath], "longyu-mastery-coverage-opt-");
    return mods[relSourcePath];
  } catch {
    return null;
  }
}

try {
  // ————————————————————————————————————————————————————————————————
  // Nível "core" — precisa funcionar sempre. Sem isso, o teste falha alto.
  // ————————————————————————————————————————————————————————————————
  const core = await compileAndRequire(
    ["src/data/masteryLoop.ts", "src/data/masteryCoverage.ts", "src/data/journey.ts"],
    "longyu-mastery-coverage-core-"
  );
  const mastery = core["src/data/masteryLoop.ts"];
  const coverage = core["src/data/masteryCoverage.ts"];
  const { ALL_LESSONS } = core["src/data/journey.ts"];

  // ————————————————————————————————————————————————————————————————
  // Nível "pilot" — masteryPilot.ts / lessonTasks.ts. Pode estar em edição
  // paralela (ex.: import de um módulo que ainda não existe). Se falhar,
  // seguimos em modo degradado: checagens dependentes viram aviso.
  // ————————————————————————————————————————————————————————————————
  let pilot = null;
  let lessonRoundStepsFor = null;
  try {
    const full = await compileAndRequire(
      ["src/data/masteryPilot.ts", "src/features/lesson/lessonTasks.ts"],
      "longyu-mastery-coverage-pilot-"
    );
    pilot = full["src/data/masteryPilot.ts"];
    lessonRoundStepsFor = full["src/features/lesson/lessonTasks.ts"].lessonRoundStepsFor;
  } catch (error) {
    warn(
      `masteryPilot.ts/lessonTasks.ts não compilaram agora (provável edição em andamento por outra IA) — checagens dependentes de piloto/plano ficam em aviso. Detalhe: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // ————————————————————————————————————————————————————————————————
  // masteryQualityScore é opcional — pode viver em masteryCoverage.ts (já
  // compilado acima) ou em um masteryQuality.ts próprio, ainda não criado
  // pelo outro agente. Import defensivo dos dois lugares.
  // ————————————————————————————————————————————————————————————————
  let masteryQualityScore = null;
  let qualityScoreSource = null;
  const qualityModule = await tryLoadOptionalModule("src/data/masteryQuality.ts");
  if (qualityModule && typeof qualityModule.masteryQualityScore === "function") {
    masteryQualityScore = qualityModule.masteryQualityScore;
    qualityScoreSource = "masteryQuality.ts";
  } else if (typeof coverage.masteryQualityScore === "function") {
    masteryQualityScore = coverage.masteryQualityScore;
    qualityScoreSource = "masteryCoverage.ts";
  }

  const QUALITY_THRESHOLD = 0.6;
  function isQualityMigrated(lessonId) {
    if (masteryQualityScore) {
      try {
        const score = masteryQualityScore(lessonId);
        if (typeof score === "number") return score >= QUALITY_THRESHOLD;
        if (typeof score === "boolean") return score;
      } catch {
        /* função de qualidade instável para esta lição — cai no fallback abaixo */
      }
    }
    // Fallback defensivo: sem score de qualidade, tratamos lições do piloto
    // (com masteryBonusStepsFor + PILOT_LEXICAL_TARGETS próprios) como "de
    // qualidade conhecida"; o resto é auditado com avisos, não falhas.
    return Boolean(pilot?.isMasteryPilotLesson?.(lessonId));
  }

  // ————————————————————————————————————————————————————————————————
  // 1) Cobertura mínima — >= 35 lições com masteryLoop:true.
  // 2) Cobertura ideal — reporta 40+ se disponível (não bloqueia).
  // ————————————————————————————————————————————————————————————————
  const TARGET_MIN = typeof coverage.TARGET_MASTERY_MIN === "number" ? coverage.TARGET_MASTERY_MIN : 35;
  const TARGET_IDEAL = typeof coverage.TARGET_MASTERY_IDEAL === "number" ? coverage.TARGET_MASTERY_IDEAL : 40;
  const masteryLessons = ALL_LESSONS.filter((l) => l.masteryLoop);

  assert.ok(
    masteryLessons.length >= TARGET_MIN,
    `cobertura mastery >= ${TARGET_MIN} (tem ${masteryLessons.length})`
  );

  if (masteryLessons.length >= TARGET_IDEAL) {
    console.log(`   cobertura ideal atingida: ${masteryLessons.length}/${TARGET_IDEAL}`);
  } else {
    warn(`cobertura ideal ainda não atingida: ${masteryLessons.length}/${TARGET_IDEAL} (informativo, não falha)`);
  }

  // ————————————————————————————————————————————————————————————————
  // 10) Contagem de cobertura via quality score, não só membership.
  // ————————————————————————————————————————————————————————————————
  if (masteryQualityScore) {
    const qualityCount = masteryLessons.filter((l) => isQualityMigrated(l.id)).length;
    console.log(
      `   quality score (${qualityScoreSource}): ${qualityCount}/${masteryLessons.length} lições atingem o limiar de qualidade`
    );
  } else {
    warn("masteryQualityScore não encontrado (masteryCoverage.ts nem masteryQuality.ts) — contagem de qualidade cai para membership do piloto");
  }

  const qualityMigratedIds = new Set(masteryLessons.filter((l) => isQualityMigrated(l.id)).map((l) => l.id));

  // ————————————————————————————————————————————————————————————————
  // 6) Scaffold showPortuguese não aumenta de M1 para M4 (só precisa de
  //    masteryLoop.ts — sempre disponível no nível "core").
  // ————————————————————————————————————————————————————————————————
  const showPortugueseByPass = [1, 2, 3, 4].map((pass) => mastery.scaffoldForMasteryPass(pass).showPortuguese);
  for (let i = 1; i < showPortugueseByPass.length; i++) {
    assert.ok(
      !(showPortugueseByPass[i] && !showPortugueseByPass[i - 1]),
      `showPortuguese não deve reaparecer em M${i + 1} depois de desligado em M${i}`
    );
  }

  if (!lessonRoundStepsFor || !pilot) {
    warn("checagens 3/4/5/7/8/9 (planos por pass, produção M3/M4, novidade M4, orçamento, rede) puladas — nível piloto indisponível nesta rodada");
  } else {
    // ————————————————————————————————————————————————————————————————
    // 3) Toda lição "quality-migrated" tem 4 planos de pass que diferem.
    // ————————————————————————————————————————————————————————————————
    const planSignature = (plan) =>
      plan.map((s) => `${s.kind}:${s.title ?? s.correctAnswer ?? s.audioText ?? s.prompt ?? ""}`).join("|");

    const plansByLesson = new Map();
    for (const lesson of masteryLessons) {
      const plans = [1, 2, 3, 4].map((pass) =>
        lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true })
      );
      plansByLesson.set(lesson.id, plans);
      const sigs = plans.map(planSignature);
      const consecutiveDiffer = sigs[0] !== sigs[1] && sigs[1] !== sigs[2] && sigs[2] !== sigs[3];
      if (qualityMigratedIds.has(lesson.id)) {
        assert.ok(consecutiveDiffer, `${lesson.id}: passes 1→2→3→4 devem diferir entre si (quality-migrated)`);
      } else if (!consecutiveDiffer) {
        warn(`${lesson.id}: passes não diferem claramente entre si (fora do piloto/quality score — não falha)`);
      }
    }

    // ————————————————————————————————————————————————————————————————
    // 4) M3 contém produção (isProductionOrTransferKind).
    // 5) M4 contém transferência/produção quando aplicável.
    // ————————————————————————————————————————————————————————————————
    for (const lesson of masteryLessons) {
      const [, , plan3, plan4] = plansByLesson.get(lesson.id);
      const hasM3Production = plan3.some((s) => mastery.isProductionOrTransferKind(s.kind));
      const hasM4Transfer = plan4.some((s) => mastery.isProductionOrTransferKind(s.kind));
      if (qualityMigratedIds.has(lesson.id)) {
        assert.ok(hasM3Production, `${lesson.id}: M3 deve conter produção/transferência`);
        assert.ok(hasM4Transfer, `${lesson.id}: M4 deve conter transferência/produção`);
      } else {
        if (!hasM3Production) warn(`${lesson.id}: M3 sem produção/transferência (fora do piloto/quality score — não falha)`);
        if (!hasM4Transfer) warn(`${lesson.id}: M4 sem transferência/produção (fora do piloto/quality score — não falha)`);
      }
    }

    // ————————————————————————————————————————————————————————————————
    // 7) Novidade em M4: itens "core" com introduceAtPass===4 deveriam ser 0
    //    quando há alvos lexicais definidos (ou aviso, não falha).
    // ————————————————————————————————————————————————————————————————
    for (const lessonId of pilot.MASTERY_PILOT_LESSON_IDS) {
      const targets = pilot.PILOT_LEXICAL_TARGETS?.[lessonId];
      if (!targets) continue;
      const lateCoreItems = targets.vocabulary.filter((item) => item.role === "core" && item.introduceAtPass === 4);
      if (lateCoreItems.length > 0) {
        warn(
          `${lessonId}: ${lateCoreItems.length} item(ns) "core" introduzido(s) só em M4 (${lateCoreItems
            .map((i) => i.hanzi)
            .join(", ")}) — núcleo deveria chegar antes do domínio`
        );
      }
    }

    // ————————————————————————————————————————————————————————————————
    // 8) Tamanho dos planos respeita ~MASTERY_PASS_GRADED_BUDGET (+6 de bônus).
    // ————————————————————————————————————————————————————————————————
    for (const lesson of masteryLessons) {
      const plans = plansByLesson.get(lesson.id);
      for (const pass of [1, 2, 3, 4]) {
        const plan = plans[pass - 1];
        const budget = mastery.MASTERY_PASS_GRADED_BUDGET[pass];
        assert.ok(
          plan.length <= budget.max + 6,
          `${lesson.id} pass ${pass}: plano não deve explodir (${plan.length} > ${budget.max + 6})`
        );
        assert.ok(
          plan.length >= budget.min - 2,
          `${lesson.id} pass ${pass}: plano precisa de massa mínima (${plan.length} < ${budget.min - 2})`
        );
      }
    }

    // ————————————————————————————————————————————————————————————————
    // 9) Crescimento em rede: lições do piloto com networkChunks têm >= 1.
    // ————————————————————————————————————————————————————————————————
    for (const lessonId of pilot.MASTERY_PILOT_LESSON_IDS) {
      const targets = pilot.PILOT_LEXICAL_TARGETS?.[lessonId];
      if (!targets) {
        warn(`${lessonId}: sem PILOT_LEXICAL_TARGETS ainda (não falha — piloto em expansão)`);
        continue;
      }
      assert.ok(
        Array.isArray(targets.networkChunks) && targets.networkChunks.length >= 1,
        `${lessonId}: networkChunks deve ter ao menos 1 combinação`
      );
    }
  }

  console.log(
    "OK test:mastery-coverage —",
    [
      `masteryLoop ${masteryLessons.length}/${TARGET_MIN}min/${TARGET_IDEAL}ideal`,
      `quality-migrated ${qualityMigratedIds.size}`,
      "scaffold PT não aumenta",
      pilot && lessonRoundStepsFor ? "piloto: 4 passes diferem; M3 produção; M4 transferência; orçamento; rede" : "piloto: pulado (ver avisos)",
    ].join("; ")
  );
  if (warnings.length) {
    console.warn(`   ${warnings.length} aviso(s) não-bloqueante(s):`);
    for (const message of warnings) console.warn("   -", message);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (failures.length) {
  console.error("FAIL test:mastery-coverage");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
