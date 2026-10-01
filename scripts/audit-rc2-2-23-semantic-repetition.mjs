#!/usr/bin/env node
/**
 * RC2.2.23 — as 20 primeiras sessões reauditadas com a definição SEMÂNTICA de
 * repetição (alvo pela forma, operação cognitiva, família, contexto), porque
 * "badRepetitions = 0" da RC2.2.22 não bate com o que o owner sente.
 *
 *   node scripts/audit-rc2-2-23-semantic-repetition.mjs          → escreve
 *   node scripts/audit-rc2-2-23-semantic-repetition.mjs --check  → confere
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/reports/rc2-2-23-semantic-repetition.json");
const TOPICS = ["p1-o-que-e-mandarim", "p1-o-que-e-pinyin", "p1-o-que-e-tom", "p1-o-que-e-hanzi", "p1-primeiros-hanzi"];
const PASSES = [1, 2, 3, 4];

async function load() {
  const result = await build({
    stdin: { contents: 'export * as plans from "./src/data/foundationTopicPlans.ts";\nexport * as rep from "./src/lib/semanticRepetition.ts";\nexport * as lint from "./src/lib/screenComplexity.ts";', resolveDir: ROOT, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2223-rep-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const str = (value) => (typeof value === "string" ? value.trim() : "");

/** Alvo pela FORMA: o hànzì do passo (ou a resposta), senão o 1º alvo de conhecimento. */
function semanticTargetKey(step) {
  const surface = str(step.targetHanzi) || str(step.hanzi) || (/[一-鿿]/.test(str(step.text)) ? str(step.text) : "") || (/[一-鿿]/.test(str(step.answer)) ? str(step.answer) : "") || (/[一-鿿]/.test(str(step.correctAnswer)) ? str(step.correctAnswer) : "");
  if (surface) return `surface:${surface}`;
  const ids = step.pedagogicalEvidence?.knowledgeTargetIds ?? [];
  return ids.find((id) => /^(chunk|char|word|tone):/.test(id)) ?? ids[0] ?? `kind:${step.kind}`;
}

function contextKey(step) {
  return str(step.sceneId) || str(step.situationPt) || str(step.dialoguePrompt) || str(step.prompt) || "none";
}

export async function buildAudit() {
  const { plans, rep, lint } = await load();
  const sessions = [];
  let number = 0;
  for (const topicId of TOPICS) {
    for (const pass of PASSES) {
      number += 1;
      const steps = plans.foundationAuthoredPlanFor(topicId, pass) ?? [];
      const items = steps.map((step) => ({
        semanticTargetKey: semanticTargetKey(step),
        cognitiveOperation: rep.cognitiveOperationFor(step.kind),
        interactionFamily: lint.taskFamily(step.kind),
        contextKey: contextKey(step),
      }));
      const report = rep.repetitionReport(items);
      const classes = rep.classifyRepetitions(items);
      sessions.push({
        session: number,
        topicId,
        pass,
        steps: steps.length,
        redundant: report.redundant,
        transformed: report.transformed,
        interleaved: report.interleaved,
        dominated: report.dominated,
        clean: report.clean,
        sequence: items.map((item, index) => `${item.semanticTargetKey}|${item.cognitiveOperation}|${classes[index]}`),
      });
    }
  }
  const totals = {
    sessions: sessions.length,
    redundant: sessions.reduce((sum, s) => sum + s.redundant, 0),
    transformed: sessions.reduce((sum, s) => sum + s.transformed, 0),
    interleaved: sessions.reduce((sum, s) => sum + s.interleaved, 0),
    sessionsDominated: sessions.filter((s) => s.dominated.length > 0).map((s) => s.session),
    sessionsClean: sessions.filter((s) => s.clean).length,
  };
  return {
    schema: "longyu-rc2-2-23-semantic-repetition/1",
    note: "Definição semântica (alvo pela forma + operação + contexto). 'clean' só sem REDUNDANT e sem domínio de um alvo. Conteúdo congelado: achados viram bug, não edição de lição.",
    totals,
    sessions,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = await buildAudit();
  const text = `${JSON.stringify(audit, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== text) {
      console.error("FAIL audit:rc2-2-23-semantic-repetition — relatório desatualizado");
      process.exit(1);
    }
    console.log(`PASS audit:rc2-2-23-semantic-repetition (${audit.totals.redundant} REDUNDANT, ${audit.totals.sessionsDominated.length} sessões dominadas)`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)}`, JSON.stringify(audit.totals));
  }
}
