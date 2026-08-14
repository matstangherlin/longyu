#!/usr/bin/env node
/**
 * PED-119 — relatório agregável de duração de passes Mastery.
 *
 * Sem dados de produção ainda: emite o schema e placeholders.
 * Não aplica thresholds — apenas coleta/estrutura.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const rootDir = process.cwd();
await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });

const provenance = reportProvenanceLines(rootDir, { lessonCount: 127 });
const lines = [
  "# Mastery pass duration (telemetria)",
  "",
  ...provenance,
  "",
  "Eventos: `mastery_pass_started` / `mastery_pass_completed` (V3.3).",
  "",
  "Schema agregado (ainda sem amostra de produção neste ambiente):",
  "",
  "| lessonId | pass | medianDuration | p75 | completionRate | abandonRate | n |",
  "|----------|-----:|---------------:|----:|---------------:|------------:|--:|",
  "| — | — | — | — | — | — | 0 |",
  "",
  "Metas iniciais de produto (orientação, não gate):",
  "",
  "- M1/M2: ~4–7 min",
  "- M3/M4: ~5–8 min",
  "",
  "Quando houver dados reais no pipeline de telemetria, este relatório",
  "deve ser preenchido a partir da agregação server-side — sem hard gate.",
  "",
];

const outPath = path.join(rootDir, "docs/reports/mastery-pass-duration.md");
await writeFile(outPath, finalizeReport(lines), "utf8");
console.log("Wrote docs/reports/mastery-pass-duration.md — schema only (n=0)");
