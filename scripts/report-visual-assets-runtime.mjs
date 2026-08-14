#!/usr/bin/env node
/**
 * V3.9 · IMG-018/019/020 — Os assets visuais chegam ao runtime?
 *
 * QA real: jogando sequencialmente no celular, as imagens não aparecem. A
 * métrica certa não é "quantos assets existem no repositório" e sim "quantos
 * entram nos planos que um aluno normal recebe".
 *
 * Classificação por asset:
 *   orphan    — existe no disco, fora do catálogo
 *   wired     — no catálogo, mas nenhum passo autoral o referencia
 *   reachable — referenciado por passo autoral da jornada
 *   observed  — apareceu num plano REALMENTE gerado pelo runtime
 *
 * Só `observed` conta como entregue.
 *
 * Roda: npm run report:visual-assets-runtime
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-visual-runtime-"));

const VISUAL_STEP_KINDS = new Set(["image_choice", "compare_with_image", "place_label", "sign_reading"]);

async function listAssets(dir) {
  const found = [];
  const walk = async (current) => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(svg|png|webp)$/i.test(entry.name)) found.push(path.relative(root, full));
    }
  };
  await walk(dir);
  return found;
}

try {
  const program = ts.createProgram(
    ["src/features/lesson/lessonTasks.ts", "src/data/journey.ts", "src/data/visualVocabulary.ts"],
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
  if (program.emit().emitSkipped) throw new Error("compile failed");

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const { lessonRoundStepsFor } = require(path.join(outDir, "src/features/lesson/lessonTasks.js"));
  const visual = require(path.join(outDir, "src/data/visualVocabulary.js"));

  const concepts = visual.VISUAL_CONCEPTS ?? Object.values(visual.visualByCharId ?? {}).filter(Boolean);
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));

  const assetFiles = await listAssets(path.join(root, "src/assets/visuals"));
  const assetBasenames = new Set(assetFiles.map((file) => path.basename(file).replace(/\.(svg|png|webp)$/i, "")));

  // ── Referências autorais (jornada escrita à mão) ────────────────────────
  const authored = new Map(); // conceptId -> { lessons:Set, steps:number }
  const noteAuthored = (conceptId, lessonId) => {
    if (!conceptId) return;
    const entry = authored.get(conceptId) ?? { lessons: new Set(), steps: 0 };
    entry.lessons.add(lessonId);
    entry.steps += 1;
    authored.set(conceptId, entry);
  };

  const conceptRefsOfStep = (step) => {
    const refs = [step.imageId, step.iconId, step.correctImageId, ...(step.imageOptions ?? [])];
    return refs.filter(Boolean);
  };

  for (const lesson of ALL_LESSONS) {
    for (const step of lesson.steps ?? []) {
      if (!VISUAL_STEP_KINDS.has(step.kind) && !step.imageId && !step.iconId) continue;
      for (const ref of conceptRefsOfStep(step)) noteAuthored(ref, lesson.id);
    }
  }

  // ── Runtime: planos realmente gerados ───────────────────────────────────
  const scenarios = [
    { label: "Primeiras 30 lições", lessons: ALL_LESSONS.slice(0, 30) },
    { label: "Primeiras 50 lições", lessons: ALL_LESSONS.slice(0, 50) },
    { label: "Jornada completa", lessons: ALL_LESSONS },
  ];

  const observed = new Map(); // conceptId -> count
  const scenarioRows = [];

  for (const scenario of scenarios) {
    let visualSteps = 0;
    let gradedSteps = 0;
    let lessonsWithVisual = 0;
    const byKind = new Map();
    const firstOccurrence = new Map();

    for (const [lessonIndex, lesson] of scenario.lessons.entries()) {
      let lessonHasVisual = false;
      for (const masteryLevel of [0, 1, 2, 3]) {
        let plan;
        try {
          plan = lessonRoundStepsFor(lesson, { masteryLevel, silent: true });
        } catch {
          continue;
        }
        for (const step of plan) {
          gradedSteps += 1;
          const refs = conceptRefsOfStep(step);
          const isVisual = VISUAL_STEP_KINDS.has(step.kind) || refs.length > 0;
          if (!isVisual) continue;
          visualSteps += 1;
          lessonHasVisual = true;
          byKind.set(step.kind, (byKind.get(step.kind) ?? 0) + 1);
          for (const ref of refs) {
            observed.set(ref, (observed.get(ref) ?? 0) + 1);
            if (!firstOccurrence.has(ref)) firstOccurrence.set(ref, `#${lessonIndex + 1} ${lesson.id}`);
          }
        }
      }
      if (lessonHasVisual) lessonsWithVisual += 1;
    }

    scenarioRows.push({
      label: scenario.label,
      lessons: scenario.lessons.length,
      lessonsWithVisual,
      visualSteps,
      gradedSteps,
      byKind,
      firstOccurrence,
    });
  }

  // ── Classificação por asset ─────────────────────────────────────────────
  const classify = (conceptId) => {
    if (!conceptById.has(conceptId)) return "orphan";
    if (observed.has(conceptId)) return "observed";
    if (authored.has(conceptId)) return "reachable";
    return "wired";
  };

  const allIds = new Set([...conceptById.keys(), ...assetBasenames]);
  const counts = { orphan: 0, wired: 0, reachable: 0, observed: 0 };
  const rows = [];
  for (const id of [...allIds].sort()) {
    const status = classify(id);
    counts[status] += 1;
    const concept = conceptById.get(id);
    const authoredEntry = authored.get(id);
    rows.push({
      id,
      status,
      hanzi: concept?.hanzi ?? "—",
      authoredLessons: authoredEntry ? authoredEntry.lessons.size : 0,
      observedSteps: observed.get(id) ?? 0,
      first: scenarioRows[2].firstOccurrence.get(id) ?? "—",
    });
  }

  const lines = [
    "# Assets visuais no runtime (IMG-018/019/020)",
    "",
    "Gerado por `npm run report:visual-assets-runtime`.",
    "",
    "Asset existente ≠ feature entregue. Só conta como **observed** o que aparece",
    "num plano realmente gerado pelo runtime — não basta estar no catálogo.",
    "",
    "## Resumo",
    "",
    `- arquivos em \`src/assets/visuals\`: **${assetFiles.length}**`,
    `- conceitos no catálogo: **${conceptById.size}**`,
    `- **observed** (aparecem em plano gerado): **${counts.observed}**`,
    `- **reachable** (passo autoral referencia, mas o plano não trouxe): **${counts.reachable}**`,
    `- **wired** (no catálogo, sem passo autoral): **${counts.wired}**`,
    `- **orphan** (arquivo fora do catálogo): **${counts.orphan}**`,
    "",
    "## Cadência por trecho da jornada",
    "",
    "| trecho | lições | lições com atividade visual | passos visuais | passos totais | 1 visual a cada N lições |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const row of scenarioRows) {
    const cadence = row.lessonsWithVisual > 0 ? (row.lessons / row.lessonsWithVisual).toFixed(1) : "—";
    lines.push(
      `| ${row.label} | ${row.lessons} | ${row.lessonsWithVisual} | ${row.visualSteps} | ${row.gradedSteps} | ${cadence} |`
    );
  }

  lines.push("");
  lines.push("## Tipos de passo visual gerados (jornada completa)");
  lines.push("");
  lines.push("| kind | ocorrências |");
  lines.push("| --- | ---: |");
  const fullKinds = scenarioRows[2].byKind;
  if (fullKinds.size === 0) lines.push("| _nenhum_ | 0 |");
  for (const [kind, count] of [...fullKinds.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${kind} | ${count} |`);
  }

  lines.push("");
  lines.push("## Inventário");
  lines.push("");
  lines.push("| assetId | hànzì | status | lições autorais | passos observados | 1ª ocorrência |");
  lines.push("| --- | --- | --- | ---: | ---: | --- |");
  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.hanzi} | ${row.status} | ${row.authoredLessons} | ${row.observedSteps} | ${row.first} |`
    );
  }
  lines.push("");

  const reportPath = path.join(root, "docs/reports/visual-assets-runtime.md");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${reportPath}`);
  for (const line of lines.slice(6, 16)) console.log(line);
  for (const row of scenarioRows) {
    const cadence = row.lessonsWithVisual > 0 ? (row.lessons / row.lessonsWithVisual).toFixed(1) : "—";
    console.log(
      `${row.label}: ${row.lessonsWithVisual}/${row.lessons} lições com visual · ${row.visualSteps} passos · 1 a cada ${cadence}`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
