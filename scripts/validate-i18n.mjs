/**
 * Gate: catalogs pt-BR and en must share keys, namespaces, and non-empty strings.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const errors = [];

function fail(message) {
  errors.push(message);
}

function flatten(tree, prefix = "", out = {}) {
  if (tree == null || typeof tree !== "object") return out;
  for (const [key, value] of Object.entries(tree)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[next] = value;
      continue;
    }
    if (value && typeof value === "object") {
      flatten(value, next, out);
      continue;
    }
    fail(`non-string value at ${next}: ${typeof value}`);
  }
  return out;
}

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
};

function transpile(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  return ts.transpileModule(source, { compilerOptions, fileName: relativePath }).outputText;
}

const NAMESPACES = [
  "common",
  "navigation",
  "auth",
  "onboarding",
  "placement",
  "journey",
  "player",
  "review",
  "missions",
  "pro",
  "settings",
  "errors",
  "marketing",
  "shell",
  "hub",
  "feedback",
  "achievements",
];

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-i18n-"));
try {
  await mkdir(path.join(outDir, "src/locales"), { recursive: true });
  await writeFile(path.join(outDir, "src/locales/pt-BR.js"), transpile("src/locales/pt-BR.ts"));
  await writeFile(path.join(outDir, "src/locales/en.js"), transpile("src/locales/en.ts"));
  const pt = require(path.join(outDir, "src/locales/pt-BR.js")).ptBR;
  const en = require(path.join(outDir, "src/locales/en.js")).en;
  if (!pt || !en) fail("catalogs failed to load");

  const ptFlat = flatten(pt);
  const enFlat = flatten(en);
  const ptKeys = Object.keys(ptFlat).sort();
  const enKeys = Object.keys(enFlat).sort();

  for (const ns of NAMESPACES) {
    if (!(ns in pt)) fail(`pt-BR missing namespace ${ns}`);
    if (!(ns in en)) fail(`en missing namespace ${ns}`);
  }
  for (const ns of Object.keys(pt)) {
    if (!NAMESPACES.includes(ns)) fail(`pt-BR unknown namespace ${ns}`);
  }
  for (const ns of Object.keys(en)) {
    if (!NAMESPACES.includes(ns)) fail(`en unknown namespace ${ns}`);
  }

  const ptSet = new Set(ptKeys);
  const enSet = new Set(enKeys);
  for (const key of ptKeys) {
    if (!enSet.has(key)) fail(`en missing key ${key}`);
  }
  for (const key of enKeys) {
    if (!ptSet.has(key)) fail(`orphan en key ${key}`);
  }

  for (const [key, value] of Object.entries(ptFlat)) {
    if (!value || !String(value).trim()) fail(`empty pt-BR translation: ${key}`);
    if (String(value).includes("[object Object]")) fail(`pt-BR [object Object]: ${key}`);
  }
  for (const [key, value] of Object.entries(enFlat)) {
    if (!value || !String(value).trim()) fail(`empty en translation: ${key}`);
    if (String(value).includes("[object Object]")) fail(`en [object Object]: ${key}`);
  }

  if (!/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)*$/.test(ptKeys[0] ?? "common.a")) {
    fail("unexpected key shape");
  }
  for (const key of ptKeys) {
    if (!/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9-]*)*$/.test(key)) {
      fail(`unstable key identity: ${key}`);
    }
  }

  if (ptFlat["common.appName"] !== "Longyu" || enFlat["common.appName"] !== "Longyu") {
    fail("product name Longyu must not be translated");
  }
  if (ptFlat["common.appNameZh"] !== "龙语" || enFlat["common.appNameZh"] !== "龙语") {
    fail("龙语 must stay canonical");
  }

  console.log(`OK validate:i18n (${ptKeys.length} keys, namespaces ${NAMESPACES.join(",")})`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error("FAIL validate:i18n:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
