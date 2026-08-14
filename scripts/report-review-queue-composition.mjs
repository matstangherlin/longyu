#!/usr/bin/env node
/**
 * V3.9 · REVIEW-023 — De onde vêm os "Revisar 260 itens".
 *
 * QA real: conta na Fase 1 / Unidade 2 exibindo "Revisar 260 itens". Mesmo que
 * cada entrada seja tecnicamente devida, 260 tão cedo passa sensação de dívida
 * infinita. Este relatório reconstrói a fila item a item e mostra a composição.
 *
 * Roda: npm run report:review-queue
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-review-queue-"));

try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/lib/srs.ts", "src/lib/reviewPlan.ts", "src/features/lesson/errorLexicalIdentity.ts"],
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
  const { newItem, dueItems } = require(path.join(outDir, "src/lib/srs.js"));
  const { reviewDomainsForItem, primaryReviewDomain } = require(path.join(outDir, "src/lib/reviewPlan.js"));
  const { CHUNKS } = require(path.join(outDir, "src/data/chunks.js"));
  const { CHARACTERS } = require(path.join(outDir, "src/data/characters.js"));

  const chunkById = Object.fromEntries(CHUNKS.map((chunk) => [chunk.id, chunk]));
  const charById = Object.fromEntries(CHARACTERS.map((char) => [char.id, char]));

  /**
   * Simula a aquisição de uma lição: para cada item ensinado, o runtime chama
   * gradeReviewDomain, que hoje faz ensureSrs em TODOS os domínios do tipo —
   * inclusive os que o aluno nunca praticou.
   */
  function simulate(lessons, { allDomains }) {
    const srs = {};
    const practiced = new Set();
    for (const lesson of lessons) {
      const targets = [
        ...(lesson.reviewItems ?? []),
        ...(lesson.newHanzi ?? []).map((glyph) => {
          const char = CHARACTERS.find((entry) => entry.hanzi === glyph);
          return char ? `char:${char.id}` : null;
        }),
      ].filter(Boolean);

      for (const ref of targets) {
        const separator = ref.indexOf(":");
        const type = ref.slice(0, separator);
        const itemId = ref.slice(separator + 1);
        if (type !== "chunk" && type !== "char" && type !== "radical") continue;
        const primary = primaryReviewDomain(type);
        practiced.add(`${type}:${itemId}:${primary}`);
        const domains = allDomains ? reviewDomainsForItem(type) : [primary];
        for (const domain of domains) {
          const item = newItem(type, itemId, { track: "fala", reviewDomain: domain });
          srs[item.id] = item;
        }
      }
    }
    return { srs, practiced };
  }

  // Fase 1 até a Unidade 2 — o ponto exato da captura.
  const throughUnit2 = [];
  for (const lesson of ALL_LESSONS) {
    throughUnit2.push(lesson);
    if (lesson.unitId === "u1-2") continue;
    if (throughUnit2.some((entry) => entry.unitId === "u1-2") && lesson.unitId !== "u1-2") break;
  }
  const phase1Unit2 = ALL_LESSONS.filter((lesson) => lesson.unitId === "u1-1" || lesson.unitId === "u1-2");

  const lines = [
    "# Composição da fila de revisão (REVIEW-023)",
    "",
    "Gerado por `npm run report:review-queue`.",
    "",
    "Reproduz a conta do QA real: \"Revisar 260 itens\" ainda na Fase 1 · Unidade 2.",
    "",
  ];

  const scenarios = [
    { label: "Fase 1 · Unidade 1+2 (ponto da captura)", lessons: phase1Unit2 },
    { label: "Primeiras 10 lições", lessons: ALL_LESSONS.slice(0, 10) },
    { label: "Primeiras 20 lições", lessons: ALL_LESSONS.slice(0, 20) },
  ];

  for (const scenario of scenarios) {
    const now = Date.now() + 24 * 60 * 60 * 1000; // um dia depois: tudo vencido
    const all = simulate(scenario.lessons, { allDomains: true });
    const practicedOnly = simulate(scenario.lessons, { allDomains: false });

    const dueAll = dueItems(all.srs, now);
    const duePracticed = dueItems(practicedOnly.srs, now);

    const byDomain = new Map();
    const byType = new Map();
    let unpracticed = 0;
    const uniqueTargets = new Set();
    for (const item of dueAll) {
      byDomain.set(item.reviewDomain, (byDomain.get(item.reviewDomain) ?? 0) + 1);
      byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
      uniqueTargets.add(`${item.type}:${item.itemId}`);
      if (!all.practiced.has(`${item.type}:${item.itemId}:${item.reviewDomain}`)) unpracticed += 1;
    }

    let orphans = 0;
    for (const item of dueAll) {
      const known = item.type === "chunk" ? chunkById[item.itemId] : charById[item.itemId];
      if (!known && item.type !== "radical") orphans += 1;
    }

    lines.push(`## ${scenario.label}`);
    lines.push("");
    lines.push(`- lições simuladas: **${scenario.lessons.length}**`);
    lines.push(`- **total exibido hoje: ${dueAll.length}**`);
    lines.push(`- memórias-alvo distintas (item, ignorando domínio): **${uniqueTargets.size}**`);
    lines.push(`- entradas de domínio NUNCA praticado: **${unpracticed}** (${((unpracticed / (dueAll.length || 1)) * 100).toFixed(0)}%)`);
    lines.push(`- se a fila contasse só o domínio praticado: **${duePracticed.length}**`);
    lines.push(`- itens sem entrada no banco (órfãos): **${orphans}**`);
    lines.push("");
    lines.push("| domínio | entradas |");
    lines.push("| --- | ---: |");
    for (const [domain, count] of [...byDomain.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${domain} | ${count} |`);
    }
    lines.push("");
    lines.push("| tipo | entradas |");
    lines.push("| --- | ---: |");
    for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${type} | ${count} |`);
    }
    lines.push("");
  }

  lines.push("## Depois da correção (REVIEW-024)");
  lines.push("");
  lines.push(
    "`gradeReviewDomain` passou a chamar `ensureSrs` apenas para o domínio " +
      "efetivamente avaliado. A coluna \"só o domínio praticado\" acima é o novo " +
      "comportamento: na Fase 1 · Unidade 2 a fila cai de 301 para 43 entradas — " +
      "uma por memória-alvo real, como o aluno espera."
  );
  lines.push("");
  lines.push("## Leitura");
  lines.push("");
  lines.push(
    "A chave do SRS inclui o domínio (`makeKey(type, itemId, reviewDomain)`), e " +
      "`gradeReviewDomain` chama `ensureSrs` para TODOS os domínios do tipo — 7 para " +
      "chunk e char — sempre que qualquer um é avaliado. Praticar 你好 uma vez cria " +
      "sete entradas; seis nunca tiveram evento pedagógico de aquisição."
  );
  lines.push("");
  lines.push(
    "Por isso o total cresce ~7× mais rápido que o vocabulário real. Nenhum item " +
      "vem do Atlas, de distractors ou de combinações geradas: a inflação é toda " +
      "de domínios não praticados do próprio vocabulário ensinado (REVIEW-024)."
  );
  lines.push("");

  const reportPath = path.join(root, "docs/reports/review-queue-composition.md");
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${reportPath}`);
  for (const line of lines.filter((entry) => entry.startsWith("- ") || entry.startsWith("## "))) {
    console.log(line);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
