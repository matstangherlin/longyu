#!/usr/bin/env node
/**
 * Gera docs/reports/curriculum-depth.md, mastery-difficulty-ramp.md e vocabulary-growth.md
 * para o piloto Pedagogia V3.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-mastery-report-"));

try {
  const program = ts.createProgram(
    [
      "src/data/masteryLoop.ts",
      "src/data/masteryPilot.ts",
      "src/data/journey.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatórios de mastery");

  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });

  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const depthLines = [
    "# Curriculum depth — piloto Pedagogia V3",
    "",
    ...provenance,
    "Mastery Loop ≠ SRS. Mastery = aquisição inicial em 4 passes; SRS = retenção depois.",
    "",
  ];

  const rampLines = ["# Mastery difficulty ramp", "", ...provenance];
  const vocabLines = ["# Vocabulary growth — piloto", "", ...provenance];

  for (const lessonId of pilot.MASTERY_PILOT_LESSON_IDS) {
    const lesson = getLesson(lessonId);
    const targets = pilot.PILOT_LEXICAL_TARGETS[lessonId];
    depthLines.push(`## ${lessonId} — ${lesson?.title ?? targets.themePt}`, "");
    depthLines.push(`- Tema: ${targets.themePt}`);
    depthLines.push(`- Funções: ${targets.communicativeFunctions.join("; ")}`);
    depthLines.push(`- Estruturas: ${targets.structuresTarget.join("; ")}`);
    depthLines.push(`- Meta lexical nova: ${targets.newVocabularyTarget}`);
    depthLines.push(`- Meta produtiva: ${targets.productiveVocabularyTarget}`, "");

    rampLines.push(`## ${lessonId}`, "");
    vocabLines.push(`## ${lessonId}`, "");

    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true });
      const kinds = [...new Set(plan.map((s) => s.kind))];
      const scaffold = mastery.scaffoldForMasteryPass(pass);
      const expansion = pilot.semanticExpansionScore(lessonId, pass);
      const lexemes = pilot.lexemesForPass(lessonId, pass);
      const production = plan.filter((s) => mastery.isProductionOrTransferKind(s.kind)).map((s) => s.kind);

      depthLines.push(`### Pass ${pass} — ${mastery.MASTERY_PASS_LABELS[pass]}`);
      depthLines.push(`- Tipos: ${kinds.join(", ")}`);
      depthLines.push(`- Scaffold removido: ${scaffold.labelPt}`);
      depthLines.push(`- Produção exigida: ${production.length ? production.join(", ") : "(reconhecimento)"}`);
      depthLines.push(
        `- Expansão semântica: score ${expansion.score} (lexemas novos ${expansion.newLexemes}, chunks ${expansion.newChunks}, combinações ${expansion.newCombinations})`
      );
      depthLines.push(`- Reaproveitado em rede: ${targets.networkChunks.slice(0, pass).join(" → ")}`, "");

      rampLines.push(`### Pass ${pass}`);
      rampLines.push(`- Objetivo: ${mastery.masteryPassProfile(pass).objectivePt}`);
      rampLines.push(`- PT visível: ${scaffold.showPortuguese ? "sim" : "não"}`);
      rampLines.push(`- Pinyin: ${scaffold.showPinyin ? "sim" : scaffold.pinyinOnDemand ? "sob demanda" : "não"}`);
      rampLines.push(`- Distractors próximos: ${scaffold.closeDistractors ? "sim" : "não"}`);
      rampLines.push(`- helpMode: ${scaffold.helpMode}`);
      rampLines.push(`- Exemplos de tarefa: ${plan.slice(0, 5).map((s) => s.kind).join(", ")}`, "");

      vocabLines.push(`### Pass ${pass}`);
      vocabLines.push(`- Lexemas disponíveis: ${lexemes.map((l) => l.hanzi).join(", ")}`);
      vocabLines.push(
        `- Novos nesta pass: ${
          lexemes
            .filter((l) => l.introduceAtPass === pass)
            .map((l) => `${l.hanzi} (${l.role})`)
            .join(", ") || "—"
        }`,
        ""
      );
    }
  }

  await writeFile(path.join(rootDir, "docs/reports/curriculum-depth.md"), finalizeReport(depthLines));
  await writeFile(path.join(rootDir, "docs/reports/mastery-difficulty-ramp.md"), finalizeReport(rampLines));
  await writeFile(path.join(rootDir, "docs/reports/vocabulary-growth.md"), finalizeReport(vocabLines));
  console.log("OK report:mastery-pedagogy → docs/reports/{curriculum-depth,mastery-difficulty-ramp,vocabulary-growth}.md");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
