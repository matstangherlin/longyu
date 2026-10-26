#!/usr/bin/env node
/**
 * Falha se uma Edge Function chamada pelo navegador não anuncia os headers
 * x-longyu-* no CORS, ou se não trata OPTIONS.
 * O próprio script prova o negativo com uma função fictícia antes de ler o repo.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const functionsDir = path.join(root, "supabase/functions");
const NON_BROWSER = new Set(["stripe-webhook"]);
const REQUIRED = ["x-longyu-correlation-id", "x-longyu-session-id", "x-longyu-op"];

export function headersCoverLongyu(source, sharedCors) {
  if (source.includes("browserAllowedHeaders(") || source.includes("OPS_CORS_EXTRA_HEADERS")) {
    return REQUIRED.every((name) => sharedCors.includes(name));
  }
  const match = source.match(/Access-Control-Allow-Headers["']?\s*[:=]\s*["'`]([^"'`]+)["'`]/);
  if (!match) return false;
  return REQUIRED.every((name) => match[1].includes(name));
}

export function checkFunctionSource(name, source, { invoked, sharedCors, nonBrowser }) {
  const errors = [];
  if (nonBrowser.has(name)) return errors;
  if (!/OPTIONS/.test(source)) errors.push(`${name}: não trata OPTIONS`);
  if (!headersCoverLongyu(source, sharedCors)) {
    errors.push(`${name}: Access-Control-Allow-Headers não inclui os três x-longyu-*`);
  }
  if (/\bAccess-Control-Allow-Origin["']?\s*[:=]\s*["'`]\*/.test(source)) {
    errors.push(`${name}: Access-Control-Allow-Origin * é proibido`);
  }
  if (invoked && !/Access-Control-Allow-Headers/.test(source) && !source.includes("browserAllowedHeaders(")) {
    errors.push(`${name}: chamada por src/ sem CORS`);
  }
  return errors;
}

function assertNegative() {
  const shared = REQUIRED.join(", ");
  const bad = `
    if (req.method === "OPTIONS") return new Response("ok");
    "Access-Control-Allow-Headers": "authorization, content-type",
  `;
  const errors = checkFunctionSource("exemplo", bad, { invoked: true, sharedCors: shared, nonBrowser: new Set() });
  if (!errors.some((line) => line.includes("x-longyu"))) {
    console.error("FALHOU: o validador não recusou uma função sem x-longyu-*");
    process.exit(1);
  }
  const good = `if (req.method === "OPTIONS") {}\n"Access-Control-Allow-Headers": browserAllowedHeaders(),`;
  const ok = checkFunctionSource("exemplo", good, { invoked: true, sharedCors: shared, nonBrowser: new Set() });
  if (ok.length) {
    console.error("FALHOU: o validador recusou browserAllowedHeaders()");
    console.error(ok.join("\n"));
    process.exit(1);
  }
}

function invokedNames() {
  const srcDir = path.join(root, "src");
  const chunks = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) chunks.push(fs.readFileSync(full, "utf8"));
    }
  };
  walk(srcDir);
  return chunks.join("\n");
}

function main() {
  assertNegative();
  const sharedCors = fs.readFileSync(path.join(functionsDir, "_shared/cors.ts"), "utf8")
    + fs.readFileSync(path.join(functionsDir, "_shared/opsCorrelation.ts"), "utf8");
  const src = invokedNames();
  const errors = [];
  for (const name of fs.readdirSync(functionsDir)) {
    if (name === "_shared" || name.startsWith(".")) continue;
    const file = path.join(functionsDir, name, "index.ts");
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    const invoked = src.includes(`"${name}"`) || src.includes(`'${name}'`);
    errors.push(...checkFunctionSource(name, source, { invoked, sharedCors, nonBrowser: NON_BROWSER }));
  }
  if (errors.length) {
    console.error("ERRO: validate:edge-cors");
    for (const line of errors) console.error(`  - ${line}`);
    process.exit(1);
  }
  console.log("OK: validate:edge-cors");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
