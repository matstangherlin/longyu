#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const tmp = await mkdtemp(path.join(os.tmpdir(), "longyu-schema-drift-"));
const source = await readFile("src/lib/cloud/schemaDrift.ts", "utf8");
const outDir = path.join(tmp, "lib/cloud");
await mkdir(outDir, { recursive: true });
await writeFile(path.join(tmp, "package.json"), JSON.stringify({ type: "commonjs" }));
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true },
  fileName: "schemaDrift.ts",
}).outputText;
await writeFile(path.join(outDir, "schemaDrift.js"), js);
const drift = require(path.join(outDir, "schemaDrift.js"));

const missingColumn = { code: "42703", message: "column profiles.instruction_locale does not exist" };
const missingTable = { code: "PGRST205", message: "Could not find the table public.user_follows in the schema cache" };
const other = { code: "23505", message: "duplicate key" };

assert.equal(drift.isMissingColumnError(missingColumn), true);
assert.equal(drift.isMissingColumnError(other), false);
assert.equal(drift.isMissingRelationError(missingTable), true);
assert.equal(drift.isMissingRelationError({ status: 404, message: "not found" }), true);
assert.equal(drift.isMissingRelationError({ message: "Could not find the function public.search_public_profiles" }), true);
assert.equal(drift.isMissingRelationError(missingColumn), false);

const reports = [];
drift.setSchemaDriftReporter((name) => reports.push(name));
assert.equal(drift.markMissing("profiles.instruction_locale"), true);
assert.equal(drift.markMissing("profiles.instruction_locale"), false);
assert.deepEqual(reports, ["profiles.instruction_locale"]);
assert.equal(drift.isKnownMissing("profiles.instruction_locale"), true);

const payload = drift.withoutMissingLocaleColumns({
  name: "Ana",
  instruction_locale: "pt-BR",
  interface_locale: "pt-BR",
  country_code: "BR",
  native_language: "pt-BR",
});
assert.equal(payload.name, "Ana");
assert.equal(payload.native_language, "pt-BR");
assert.equal("instruction_locale" in payload, false);
assert.equal("interface_locale" in payload, false);
assert.equal("country_code" in payload, false);

drift.resetSchemaDriftForTests();
let selects = 0;
const noted = [];
drift.setSchemaDriftReporter((name) => noted.push(name));
const selectMissing = async () => {
  selects += 1;
  return { data: null, error: missingColumn };
};
const first = await drift.readInstructionLocale("user-1", selectMissing);
const second = await drift.readInstructionLocale("user-1", selectMissing);
assert.equal(first, null);
assert.equal(second, null);
assert.equal(selects, 1, "42703 não dispara outra leitura na sessão");
assert.deepEqual(noted, ["profiles.instruction_locale"]);

drift.resetSchemaDriftForTests();
let parallel = 0;
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
const slowSelect = async () => {
  parallel += 1;
  await gate;
  return { data: { instruction_locale: "en" }, error: null };
};
const a = drift.readInstructionLocale("user-2", slowSelect);
const b = drift.readInstructionLocale("user-2", slowSelect);
release();
assert.deepEqual(await Promise.all([a, b]), ["en", "en"]);
assert.equal(parallel, 1, "duas leituras simultâneas compartilham um único select");

console.log("OK: test:schema-drift");
