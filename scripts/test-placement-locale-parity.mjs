#!/usr/bin/env node
/**
 * V4.8.1 — PLACEMENT_LOCALE_PARITY
 * Same answer IDs / PT labels / EN labels must produce the same Placement v2 result.
 * Roda: npm run test:placement-locale-parity
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-placement-parity-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/lib/placement/types.ts",
      "src/lib/placement/optionIdentity.ts",
      "src/lib/placement/questions.ts",
      "src/lib/placement/engine.ts",
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
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:placement-locale-parity");

  const engine = require(path.join(outDir, "src/lib/placement/engine.js"));
  const questions = require(path.join(outDir, "src/lib/placement/questions.js"));
  const identity = require(path.join(outDir, "src/lib/placement/optionIdentity.js"));
  const types = require(path.join(outDir, "src/lib/placement/types.js"));

  if (types.PLACEMENT_VERSION !== 2) fail("PLACEMENT_VERSION deve permanecer 2");

  const bank = questions.PLACEMENT_QUESTION_BANK;
  if (bank.length !== questions.VALID_PLACEMENT_QUESTIONS.length) {
    fail("alguma pergunta do banco falhou isValidQuizQuestion após IDs");
  }

  const identitySnapshot = bank.map((question) => identity.canonicalQuestionIdentity(question));
  const expectedIds = [
    "warm-nihao-meaning",
    "warm-xiexie-meaning",
    "warm-nihao-pinyin",
    "warm-thanks-context",
    "foundation-what-is-mandarin",
    "foundation-pinyin-role",
    "foundation-tone-role",
    "foundation-hanzi-role",
    "foundation-pinyin-vs-hanzi",
    "foundation-tone-marks",
    "foundation-audio-to-pinyin",
    "core-bu-meaning",
    "core-hao-meaning",
    "core-xiexie-pinyin",
    "core-third-tone",
    "core-wo-hanzi",
    "nohelp-nihao-pinyin",
    "nohelp-xiexie-tone",
    "nohelp-san-meaning",
    "nohelp-san-hanzi",
    "nohelp-ni-meaning",
    "nohelp-nihaoma-sentence",
    "nohelp-zaijian-pinyin",
    "phrase-brazilian",
    "phrase-dont-understand",
    "phrase-cannot-speak",
    "phrase-repeat",
    "phrase-price-clue",
    "audio-ma1-tone",
    "audio-ma3-tone",
    "audio-xiexie-phrase",
    "speech-nihao-self",
    "prod-nihao-build",
    "prod-thanks-build",
    "prod-woshi-gap",
    "prod-question-ma",
    "adv-ming-meaning",
    "adv-ma-phonetic",
    "adv-lin-meaning",
    "adv-zhongguo-pinyin",
    "adv-nice-meet",
  ];
  const liveIds = identitySnapshot.map((row) => row.id);
  if (JSON.stringify(liveIds) !== JSON.stringify(expectedIds)) {
    fail(`canonical question ids mudaram: ${liveIds.join(",")}`);
  }
  for (const row of identitySnapshot) {
    if (row.audioText && !/[\u3400-\u9fff]/.test(row.audioText) && !identity.isCanonicalOptionId?.(row.audioText)) {
      // audioText is always hanzi in this bank
    }
    if (row.stimulus && !/[\u3400-\u9fff？]/.test(row.stimulus)) {
      fail(`${row.id} stimulus deixou de ser chinês canônico`);
    }
  }
  const nihao = questions.getPlacementQuestion("warm-nihao-meaning");
  if (nihao.stimulus !== "你好" || nihao.answer !== "hello") fail("warm-nihao-meaning identity");
  if (questions.getPlacementQuestion("warm-thanks-context").answer !== "谢谢") fail("canonical Chinese option id lost");
  if (questions.getPlacementQuestion("speech-nihao-self").audioText !== "你好") fail("speech audio identity");

  function present(question, optionId, mode) {
    if (mode === "id") return optionId;
    return identity.optionLabelForLocale(optionId, mode === "en" ? "en" : "pt-BR");
  }

  function wrongOption(question) {
    return question.options.find((option) => option !== question.answer) ?? question.options[0];
  }

  function pedagogicalSlice(analysis, asked) {
    return {
      score: analysis.score,
      questionsAnswered: analysis.questionsAnswered,
      correctWithoutHint: analysis.correctWithoutHint,
      correctWithHint: analysis.correctWithHint,
      wrong: analysis.wrong,
      weightedScore: analysis.weightedScore,
      weightedPossible: analysis.weightedPossible,
      weightedAccuracy: analysis.weightedAccuracy,
      noHintAccuracy: analysis.noHintAccuracy,
      decisiveAccuracy: analysis.decisiveAccuracy,
      hintCount: analysis.hintCount,
      placementConfidence: analysis.placementConfidence,
      targetLessonId: analysis.placement.targetLessonId,
      masteredByPlacement: analysis.placement.masteredByPlacement,
      skippedLessonIds: analysis.skippedLessonIds,
      foundationLessonIdsRequired: analysis.foundationLessonIdsRequired,
      placementVersion: analysis.placementVersion,
      asked,
      difficulties: asked.map((id) => questions.getPlacementQuestion(id)?.difficulty ?? null),
      competency: Object.fromEntries(
        types.PLACEMENT_DIMENSIONS.map((dimension) => [
          dimension,
          {
            estimate: analysis.competency[dimension].estimate,
            evidenceCount: analysis.competency[dimension].evidenceCount,
            confidence: analysis.competency[dimension].confidence,
            highestProvenDifficulty: analysis.competency[dimension].highestProvenDifficulty,
            hintDependency: analysis.competency[dimension].hintDependency,
            contradictionCount: analysis.competency[dimension].contradictionCount,
          },
        ])
      ),
    };
  }

  function runLoop(declared, pick, mode) {
    const answers = [];
    const asked = [];
    let guard = 0;
    while (!engine.shouldStopPlacement(declared, answers) && guard < 40) {
      guard += 1;
      const question = engine.chooseNextQuestion(declared, answers, asked);
      if (!question) break;
      asked.push(question.id);
      const choice = pick(question, answers.length);
      answers.push({
        questionId: question.id,
        answer: present(question, choice.optionId, mode),
        hintUsed: Boolean(choice.hintUsed),
        responseMode: "choice",
      });
    }
    return {
      answers,
      asked,
      analysis: engine.evaluatePlacementEvidence(declared, answers),
    };
  }

  function assertParity(name, declared, pick) {
    const idRun = runLoop(declared, pick, "id");
    const ptRun = runLoop(declared, pick, "pt-BR");
    const enRun = runLoop(declared, pick, "en");
    const idSlice = JSON.stringify(pedagogicalSlice(idRun.analysis, idRun.asked));
    const ptSlice = JSON.stringify(pedagogicalSlice(ptRun.analysis, ptRun.asked));
    const enSlice = JSON.stringify(pedagogicalSlice(enRun.analysis, enRun.asked));
    if (idSlice !== ptSlice) fail(`${name}: PT labels divergiram dos option IDs`);
    if (idSlice !== enSlice) fail(`${name}: EN labels divergiram dos option IDs`);
    if (ptRun.asked.join(">") !== enRun.asked.join(">")) {
      fail(`${name}: ordem das perguntas mudou entre pt-BR e en`);
    }
    return idRun;
  }

  const trueBeginner = assertParity("TRUE_BEGINNER", "zero", (question) => ({
    optionId: wrongOption(question),
    hintUsed: false,
  }));
  const basic = assertParity("BASIC", "words", (question, index) => ({
    optionId: index < 2 ? question.answer : wrongOption(question),
    hintUsed: false,
  }));
  const intermediate = assertParity("INTERMEDIATE", "studied", (question, index) => ({
    optionId: index % 3 === 2 ? wrongOption(question) : question.answer,
    hintUsed: false,
  }));
  const advanced = assertParity("ADVANCED", "advanced", (question) => ({
    optionId: question.answer,
    hintUsed: false,
  }));
  const inconsistent = assertParity("INCONSISTENT", "phrases", (question, index) => ({
    optionId: index % 2 === 0 ? question.answer : wrongOption(question),
    hintUsed: false,
  }));
  const hintDependent = assertParity("HINT_DEPENDENT", "studied", (question) => ({
    optionId: question.answer,
    hintUsed: true,
  }));

  if (trueBeginner.analysis.placement.targetLessonId !== "p1-o-que-e-mandarim") {
    fail("TRUE_BEGINNER deveria começar do início");
  }
  if (hintDependent.analysis.foundationProofs.some((row) => row.proven)) {
    fail("HINT_DEPENDENT não pode provar fundamento");
  }
  if (advanced.asked.map((id) => questions.getPlacementQuestion(id)?.difficulty ?? 0).every((d) => d < 3)) {
    fail("ADVANCED deveria sondar dificuldade 3+");
  }

  const engineSrc = await import("node:fs").then((fs) =>
    fs.readFileSync(path.join(root, "src/lib/placement/engine.ts"), "utf8")
  );
  if (/answer\s*===\s*["']Olá["']/.test(engineSrc) || /answer\s*===\s*["']Hello["']/.test(engineSrc)) {
    fail("engine não pode pontuar por label Olá/Hello");
  }

  console.log(
    `OK parity beginner=${trueBeginner.answers.length} basic=${basic.answers.length} intermediate=${intermediate.answers.length} advanced=${advanced.answers.length} inconsistent=${inconsistent.answers.length} hinted=${hintDependent.answers.length}`
  );
} catch (error) {
  fail(error instanceof Error ? error.stack || error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:placement-locale-parity:");
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:placement-locale-parity");
