#!/usr/bin/env node
/**
 * Status rápido para congelar RC / saber o que ainda é humano.
 * Não substitui QA de aparelho — só organiza o próximo passo.
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

const remainingDoc = existsSync("docs/BETA_LAUNCH_REMAINING.md")
  ? readFileSync("docs/BETA_LAUNCH_REMAINING.md", "utf8")
  : "";
const runbook = existsSync("docs/BETA_HUMAN_QA_RUNBOOK.md");
const bugLog = existsSync("docs/BETA_BUG_LOG.md");

console.log("=== Longyu beta RC status ===");
console.log(`version:     ${pkg.version}`);
console.log(`branch:      ${branch}`);
console.log(`HEAD:        ${sha}`);
console.log(`short:       ${short}`);
console.log(`working tree:${dirty ? " DIRTY — não congele RC assim" : " limpa"}`);
console.log("");
console.log("Próximos comandos (só na SHA congelada):");
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
} else {
  console.log(`Sugestão de tag: v${pkg.version}-rc1  (em ${short})`);
}
