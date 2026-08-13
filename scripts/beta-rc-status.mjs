#!/usr/bin/env node
/**
 * Status rápido para congelar RC / saber o que ainda é humano.
 * Não substitui QA de aparelho — só organiza o próximo passo.
 *
 * Sempre mostra a SHA real de `origin/main` (além do HEAD local),
 * para não confundir tip da main com um branch de feature.
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "(indisponível)";
  }
}

const sha = sh("git rev-parse HEAD");
const short = sh("git rev-parse --short HEAD");
const branch = sh("git branch --show-current");
const status = sh("git status --porcelain");
const dirty = status.length > 0;

// Preferir tip remota da main (o que a RC deve seguir).
const mainSha = sh("git rev-parse origin/main 2>/dev/null || git rev-parse main 2>/dev/null");
const mainShort = mainSha.startsWith("(") ? mainSha : mainSha.slice(0, 7);
const onMainTip = !mainSha.startsWith("(") && sha === mainSha;

const remainingDoc = existsSync("docs/BETA_LAUNCH_REMAINING.md")
  ? readFileSync("docs/BETA_LAUNCH_REMAINING.md", "utf8")
  : "";
const bugLogDoc = existsSync("docs/BETA_BUG_LOG.md")
  ? readFileSync("docs/BETA_BUG_LOG.md", "utf8")
  : "";
const runbook = existsSync("docs/BETA_HUMAN_QA_RUNBOOK.md");
const bugLog = existsSync("docs/BETA_BUG_LOG.md");

/** Extrai tip citada nos docs como tip atual (não histórico de PR). */
function docTipSha(text) {
  const m =
    text.match(/Tip `main`:\s*`([0-9a-f]{7,40})`/i) ||
    text.match(/SHA tip `main`\s*\|\s*`([0-9a-f]{7,40})`/i) ||
    text.match(/tip `main`\s*=\s*`([0-9a-f]{7,40})`/i) ||
    text.match(/tip `main`:\s*`([0-9a-f]{7,40})`/i);
  return m?.[1] ?? null;
}

const docTips = [
  { file: "BETA_LAUNCH_REMAINING.md", tip: docTipSha(remainingDoc) },
  { file: "BETA_BUG_LOG.md", tip: docTipSha(bugLogDoc) },
].filter((row) => row.tip);

console.log("=== Longyu beta RC status ===");
console.log("fonte tip:   origin/main  (oficial — docs não substituem este comando)");
console.log(`version:     ${pkg.version}`);
console.log(`branch:      ${branch}`);
console.log(`HEAD:        ${sha}`);
console.log(`short:       ${short}`);
console.log(`origin/main: ${mainSha}`);
console.log(`main short:  ${mainShort}`);
console.log(`on main tip: ${onMainTip ? "sim" : "NÃO — HEAD ≠ origin/main"}`);
console.log(`working tree:${dirty ? " DIRTY — não congele RC assim" : " limpa"}`);
console.log("");
console.log("RC checklist rápida:");
console.log("  1) tip limpa = origin/main");
console.log("  2) npm run gate:public-beta");
console.log("  3) npm run test:e2e:webkit   # Safari — obrigatório antes da beta pública");
console.log("  4) workflow Security verde na tip");
console.log("");

if (!onMainTip && !mainSha.startsWith("(")) {
  console.log("Aviso: congele a RC na tip de origin/main, não neste HEAD.");
  console.log(`  git checkout main && git pull origin main`);
  console.log("");
}

for (const { file, tip } of docTips) {
  const tipShort = tip.slice(0, 7);
  const matchesMain = !mainSha.startsWith("(") && mainSha.startsWith(tipShort);
  if (!matchesMain) {
    console.log(`Aviso: docs/${file} cita tip \`${tipShort}\` ≠ origin/main \`${mainShort}\`.`);
  }
}
if (docTips.length) console.log("");

console.log("Próximos comandos (só na SHA congelada = tip origin/main):");
console.log("  npm run gate:public-beta");
console.log("  npm run gate:production   # opcional, mais estrito");
console.log("");
console.log("QA humano (obrigatório antes do beta):");
console.log(`  runbook:  ${runbook ? "docs/BETA_HUMAN_QA_RUNBOOK.md" : "AUSENTE"}`);
console.log(`  bug log:  ${bugLog ? "docs/BETA_BUG_LOG.md" : "AUSENTE"}`);
console.log("  mapa:     docs/BETA_LAUNCH_REMAINING.md");
console.log("");
console.log("Não fingir em código:");
let inBlock = false;
for (const line of remainingDoc.split("\n")) {
  if (line.startsWith("## Não fingir")) {
    inBlock = true;
    continue;
  }
  if (inBlock && line.startsWith("## ")) break;
  if (inBlock && line.startsWith("- ")) console.log(`  ${line}`);
}
console.log("");
if (dirty) {
  console.log("Aviso: commit/stash antes de marcar RC.");
  process.exitCode = 2;
} else if (!onMainTip && !mainSha.startsWith("(")) {
  console.log(`Sugestão: alinhar à tip main \`${mainShort}\` antes da tag RC.`);
  process.exitCode = 0;
} else {
  console.log(`Sugestão de tag: v${pkg.version}-rc1  (em ${mainShort})`);
}
