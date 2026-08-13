#!/usr/bin/env node
/**
 * PED-064 — docs/reports/china-real-curriculum.md
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
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-china-real-report-"));

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
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("Falha ao compilar relatorio China Real");

  const china = require(path.join(outDir, "src/data/chinaReal.js"));
  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const pilot = require(path.join(outDir, "src/data/masteryPilot.js"));
  const { getLesson, ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));

  await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
  const provenance = reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length });

  const lines = [
    "# China Real curriculum — Pedagogia V3.1",
    "",
    ...provenance,
    "",
    "Eixo urbano/cultural como **linguagem funcional**, nao lista escolar.",
    "Mastery Loop 0–4 continua o motor da #168; esta remessa enche o motor com China real.",
    "",
    "## Cidades introduzidas (piloto)",
    "",
  ];

  for (const city of china.CHINA_PILOT_CITIES) {
    lines.push(`- **${city.hanzi}** ${city.pinyin} — ${city.meaningPt}. Gancho: ${city.culturalHookPt}`);
    lines.push(`  - Rede: ${china.cityNetworkChunks(city.hanzi).join(" · ")}`);
  }

  lines.push("", "## Cidades reservadas (expansao futura)", "");
  for (const city of china.CHINA_CITIES.filter((c) => !c.pilot)) {
    lines.push(`- ${city.hanzi} ${city.pinyin} — ${city.meaningPt} (${city.culturalHookPt})`);
  }

  lines.push("", "## Ruas e enderecos", "");
  for (const street of china.CHINA_STREETS) {
    lines.push(`- ${street.hanzi} (${street.pinyin}) — ${street.meaningPt}`);
  }
  lines.push("", "Estruturas: `路` / `街` / `号` / `区` · exemplos `北京路10号`, `上海市南京路20号`.", "");

  lines.push("## Vocabulario administrativo / navegacao", "");
  for (const unit of china.ADMIN_UNITS) {
    lines.push(`- ${unit.hanzi} — ${unit.meaningPt} (${unit.role})`);
  }
  for (const item of china.NAV_CORE) {
    lines.push(`- ${item.hanzi} — ${item.meaningPt}`);
  }

  lines.push("", "## Licoes do piloto + mastery passes", "");

  for (const lessonId of china.CHINA_REAL_PILOT_LESSON_IDS) {
    const lesson = getLesson(lessonId);
    const targets = pilot.PILOT_LEXICAL_TARGETS[lessonId];
    lines.push(`### ${lessonId} — ${lesson?.title ?? targets.themePt}`, "");
    lines.push(`- Funcoes: ${targets.communicativeFunctions.join("; ")}`);
    lines.push(`- Estruturas: ${targets.structuresTarget.join("; ")}`);
    lines.push(`- Lexemas (meta): ${targets.newVocabularyTarget} novos / ${targets.productiveVocabularyTarget} produtivos`);
    lines.push(`- Rede: ${targets.networkChunks.join(" · ")}`, "");

    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, { masteryLevel: pass - 1, masteryPass: pass, silent: true });
      const kinds = [...new Set(plan.map((s) => s.kind))];
      const scaffold = mastery.scaffoldForMasteryPass(pass);
      const expansion = pilot.semanticExpansionScore(lessonId, pass);
      const transfer = plan.filter((s) => mastery.isProductionOrTransferKind(s.kind)).map((s) => s.kind);
      const mapKinds = plan.filter((s) => s.kind === "map_direction").map((s) => `scaffold ${s.mapScaffoldLevel ?? "?"}`);
      lines.push(`#### Pass ${pass} — ${mastery.MASTERY_PASS_LABELS[pass]}`);
      lines.push(`- Scaffold: ${scaffold.labelPt}`);
      lines.push(`- Kinds: ${kinds.join(", ")}`);
      if (mapKinds.length) lines.push(`- map_direction: ${mapKinds.join("; ")}`);
      lines.push(
        `- Expansao: lexemas+${expansion.newLexemes}, chunks+${expansion.newChunks}, score ${expansion.score}`
      );
      lines.push(`- Producao/transferencia: ${transfer.length ? transfer.join(", ") : "(reconhecimento)"}`, "");
    }
  }

  lines.push("## Transferencia (cenarios M4)", "");
  lines.push("- Pequim + estacao: `北京火车站在哪里？`");
  lines.push("- Nanjing Road + metro: `南京路地铁站在哪里？` / `怎么走？`");
  lines.push("- Mapa so em chines: `左转` / `一直走` sem PT antecipado");
  lines.push("");
  lines.push("## Separacao Mastery × SRS", "");
  lines.push("- Mastery = aquisicao inicial 0–4 nestas licoes.");
  lines.push("- SRS = retencao depois; sync preserva `lessonMasteryById` e dimensoes sem misturar filas.");
  lines.push("");

  const reportPath = path.join(rootDir, "docs/reports/china-real-curriculum.md");
  await writeFile(reportPath, finalizeReport(lines), "utf8");
  console.log(`Wrote ${path.relative(rootDir, reportPath)}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
