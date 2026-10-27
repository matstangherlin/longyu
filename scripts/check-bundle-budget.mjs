#!/usr/bin/env node
/**
 * LGY-030 / R-20 — mede o JS inicial e recusa um entry maior que o teto.
 * A meta de 300 KB gzip só falha o processo quando enforceGoal é true.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const distArg = process.argv.find((arg) => arg.startsWith("--dist="));
const budgetArg = process.argv.find((arg) => arg.startsWith("--budget="));
const dist = distArg ? path.resolve(distArg.slice("--dist=".length)) : path.join(root, "dist");
const budgetPath = budgetArg ? path.resolve(budgetArg.slice("--budget=".length)) : path.join(root, "scripts/bundle-budget.json");

const budget = JSON.parse(readFileSync(budgetPath, "utf8"));
const htmlPath = path.join(dist, "index.html");
if (!existsSync(htmlPath)) {
  console.error(`FAIL check:bundle-budget: ${htmlPath} não existe. Rode npm run build.`);
  process.exit(1);
}

const html = readFileSync(htmlPath, "utf8");
const src = html.match(/<script type="module" crossorigin src="([^"]+)"/)?.[1]
  ?? html.match(/<script type="module" src="([^"]+)"/)?.[1];
if (!src) {
  console.error("FAIL check:bundle-budget: index.html sem <script type=\"module\">");
  process.exit(1);
}

function rel(url) {
  return url.replace(/^\//, "");
}

function staticImports(code) {
  const found = [];
  const re = /\bimport(?:\s*[^"'()]*?from)?\s*["'](\.[^"']+\.js)["']/g;
  for (const match of code.matchAll(re)) found.push(match[1]);
  return found;
}

const seen = new Set();
const files = [];
function walk(url) {
  const file = rel(url);
  if (seen.has(file)) return;
  seen.add(file);
  const abs = path.join(dist, file);
  if (!existsSync(abs)) {
    console.error(`FAIL check:bundle-budget: chunk ausente ${file}`);
    process.exit(1);
  }
  const buf = readFileSync(abs);
  files.push({ file, raw: buf.length, gzip: gzipSync(buf).length });
  const dir = path.posix.dirname(file);
  for (const spec of staticImports(buf.toString("utf8"))) {
    const next = path.posix.normalize(path.posix.join(dir, spec));
    walk(next);
  }
}

walk(src);
const entry = files[0];
const gzip = files.reduce((sum, file) => sum + file.gzip, 0);
const raw = files.reduce((sum, file) => sum + file.raw, 0);

console.log("JS inicial (entry + imports estáticos)");
for (const file of files) {
  console.log(`  ${file.file}  raw=${file.raw}  gzip=${file.gzip}`);
}
console.log(`total raw=${raw} gzip=${gzip}  meta gzip=${budget.goalGzipBytes}  teto entry raw=${budget.entryRawCeilingBytes}`);

let failed = false;
if (entry.raw > budget.entryRawCeilingBytes) {
  console.error(`FAIL entry ${entry.raw} > teto ${budget.entryRawCeilingBytes}`);
  failed = true;
}
if (budget.enforceGoal && gzip > budget.goalGzipBytes) {
  console.error(`FAIL gzip inicial ${gzip} > meta ${budget.goalGzipBytes}`);
  failed = true;
} else if (gzip > budget.goalGzipBytes) {
  console.log(`R-20 ainda aberto: gzip ${gzip} acima de ${budget.goalGzipBytes}. O teto de crescimento é que está ativo.`);
}

if (failed) process.exit(1);
console.log("check:bundle-budget PASS");
