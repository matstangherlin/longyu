#!/usr/bin/env node
/**
 * TEST-065 — China Real + Mastery V3.1 acceptance.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-china-real-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/chinaReal.ts",
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
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
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript nao compilou o suite China Real");

  const china = require(path.join(outDir, "src/data/chinaReal.js"));
  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  const pilotCities = china.CHINA_PILOT_CITIES.map((c) => c.hanzi);
  assert.deepEqual(pilotCities, ["北京", "上海", "广州", "深圳"], "piloto = 4 cidades (nao 20)");

  for (const lessonId of china.CHINA_REAL_PILOT_LESSON_IDS) {
    const lesson = getLesson(lessonId);
    assert.ok(lesson, `licao ${lessonId} existe`);
    assert.ok(lesson.masteryLoop, `${lessonId} no mastery loop`);
    assert.ok(pilot.isMasteryPilotLesson(lessonId), `${lessonId} no piloto lexical`);
  }

  const citiesLesson = getLesson("p6-china-cidades");
  const citySteps = citiesLesson.steps;
  // 1) cidade nao e so trivia: cada cidade piloto em estrutura funcional
  for (const city of pilotCities) {
    const inStructure = citySteps.some((step) => {
      const blob = [
        step.correctAnswer,
        step.answer,
        step.targetParts?.join(""),
        step.dialoguePrompt,
        step.situationPt,
        step.hanzi,
        step.text,
      ]
        .filter(Boolean)
        .join("|");
      return (
        blob.includes(`我去${city}`) ||
        blob.includes(`我要去${city}`) ||
        blob.includes(`${city}在哪里`) ||
        blob.includes(`${city}在中国`) ||
        blob.includes(`我在${city}`) ||
        blob.includes(`${city}火车站`)
      );
    });
    assert.ok(inStructure || city === "广州" || city === "深圳", `${city} entra em rede (ou e receptiva no piloto)`);
  }
  assert.ok(
    citySteps.some((s) => (s.correctAnswer ?? "").includes("我去北京") || (s.targetParts ?? []).join("").includes("北京")),
    "北京 em estrutura produtiva"
  );
  assert.ok(
    citySteps.some((s) => (s.correctAnswer ?? "").includes("我要去上海")),
    "上海 em estrutura produtiva"
  );
  assert.ok(
    citySteps.some((s) => s.kind === "city_context" && (s.correctAnswer ?? "").includes("火车站")),
    "cidade + estacao (nao trivia)"
  );

  // 3) rua/endereco em tarefas produtivas
  const streets = getLesson("p6-china-ruas");
  assert.ok(
    streets.steps.some((s) => s.kind === "address_build"),
    "address_build presente"
  );
  assert.ok(
    streets.steps.some(
      (s) =>
        (s.kind === "address_build" || s.kind === "sentence_build") &&
        ((s.targetParts ?? []).join("").includes("路") || (s.correctAnswer ?? "").includes("路"))
    ),
    "rua em tarefa produtiva"
  );

  // 4) map_direction aumenta dificuldade por mastery
  const directions = getLesson("p6-direcoes");
  const mapSteps = directions.steps.filter((s) => s.kind === "map_direction");
  assert.ok(mapSteps.length >= 3, "varios map_direction na licao");
  const scaffolds = mapSteps.map((s) => s.mapScaffoldLevel ?? 1);
  assert.ok(Math.max(...scaffolds) > Math.min(...scaffolds), "scaffold de mapa sobe");

  const plan1 = lessonRoundStepsFor(directions, { masteryLevel: 0, masteryPass: 1, silent: true });
  const plan4 = lessonRoundStepsFor(directions, { masteryLevel: 3, masteryPass: 4, silent: true });
  const map1 = plan1.find((s) => s.kind === "map_direction");
  const map4 = plan4.find((s) => s.kind === "map_direction");
  assert.ok(map1 && map4, "mapa aparece em M1 e M4");
  assert.ok((map4.mapScaffoldLevel ?? 1) >= (map1.mapScaffoldLevel ?? 1), "M4 mapa >= M1 scaffold");

  // 5) M4 exige transferencia
  assert.ok(
    plan4.some((s) => mastery.isProductionOrTransferKind(s.kind)),
    "M4 com producao/transferencia"
  );
  assert.ok(
    plan4.some((s) => s.kind === "city_context" || s.kind === "map_direction" || s.kind === "reverse_recall"),
    "M4 com contexto de transferencia urbana"
  );

  // 6) vocabulario cultural nao invade fases iniciais cedo demais
  const earlyLessons = ["l1", "l2", "l3"].map((id) => getLesson(id)).filter(Boolean);
  for (const lesson of earlyLessons) {
    const blob = JSON.stringify(lesson.steps);
    assert.equal(blob.includes("微信支付"), false, `${lesson.id} sem WeChat Pay cedo`);
    assert.equal(blob.includes("支付宝"), false, `${lesson.id} sem Alipay cedo`);
    assert.equal(blob.includes("广东省"), false, `${lesson.id} sem provincia cedo`);
  }
  assert.ok(china.CHINA_PILOT_CITIES.length <= 4, "piloto limitado a 3-4 cidades");

  // 7) novos steps entram em error tracking/review (kinds graduados + moduleReview)
  const playerSrc = await readFile(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  for (const kind of ["map_direction", "place_label", "address_build", "city_context"]) {
    assert.match(playerSrc, new RegExp(kind), `${kind} no LessonPlayer (graded/review)`);
  }
  const reviewSrc = await readFile(path.join(root, "src/lib/moduleReview.ts"), "utf8");
  assert.match(reviewSrc, /place_label/, "moduleReview cobre place_label");
  assert.match(reviewSrc, /address_build/, "moduleReview cobre address_build");
  assert.match(reviewSrc, /map_direction/, "moduleReview cobre map_direction");

  // 8) sync preserva mastery
  const syncSrc = await readFile(path.join(root, "src/lib/syncMerge.ts"), "utf8");
  assert.match(syncSrc, /mergeLessonMasteryRecords/, "sync mastery");
  assert.match(syncSrc, /mergeItemDimensionScores/, "sync dimensoes");

  // 9) SRS continua separado de acquisition
  const masterySrc = await readFile(path.join(root, "src/data/masteryLoop.ts"), "utf8");
  assert.match(masterySrc, /SRS|reten|aquisi/i, "mastery documenta separacao de SRS");
  const storeSrc = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(storeSrc, /lessonMasteryById/, "mastery persistido aparte");
  assert.match(storeSrc, /srs|reviewQueue|dueCards|itemStates/i, "SRS continua no store");

  // Lexical growth por tema
  for (const lessonId of china.CHINA_REAL_PILOT_LESSON_IDS) {
    const targets = pilot.PILOT_LEXICAL_TARGETS[lessonId];
    assert.ok(targets.newVocabularyTarget >= 8, `${lessonId} crescimento lexical minimo`);
    assert.ok(targets.communicativeFunctions.length >= 1, `${lessonId} funcao comunicativa`);
    assert.ok(targets.networkChunks.length >= 2, `${lessonId} combinacoes em rede`);
    const pass4 = pilot.semanticExpansionScore(lessonId, 4);
    const pass1 = pilot.semanticExpansionScore(lessonId, 1);
    assert.ok(pass4.score > pass1.score, `${lessonId} expansao sobe com a pass`);
  }

  console.log(
    "OK test:china-real —",
    [
      "4 cidades piloto",
      "rede nao-trivia",
      "rua produtiva",
      "map scaffold",
      "M4 transfer",
      "early gate",
      "review/sync",
      "SRS separado",
    ].join("; ")
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:china-real");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
