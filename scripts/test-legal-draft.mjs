#!/usr/bin/env node
/**
 * LGY-040 — [PREENCHER] pode existir na beta fechada.
 * VITE_PUBLIC_RELEASE=true recusa o rascunho.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const pt = await readFile(path.join(root, "src/locales/pt-BR.ts"), "utf8");
const en = await readFile(path.join(root, "src/locales/en.ts"), "utf8");
for (const needle of ["[PREENCHER:", "A data de nascimento não é pedida", "18 anos ou mais", "vigora quando a cobrança"]) {
  assert.ok(pt.includes(needle), needle);
}
assert.ok(en.includes("[PREENCHER:"));
assert.doesNotMatch(await readFile(path.join(root, "src/features/conta/ContaPage.tsx"), "utf8"), /landing\.privacy|landing\.terms/);

const out = await mkdtemp(path.join(os.tmpdir(), "longyu-legal-"));
try {
  const program = ts.createProgram(["src/lib/legalDraft.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir: out,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const file = path.join(out, "src/lib/legalDraft.js");
  const js = (await readFile(file, "utf8")).replaceAll("import.meta.env", "({})");
  await writeFile(file, js);
  const legal = createRequire(import.meta.url)(file);
  assert.equal(legal.legalPlaceholdersAllowed({}), true);
  assert.equal(legal.legalPlaceholdersAllowed({ VITE_PUBLIC_RELEASE: "true" }), false);
} finally {
  await rm(out, { recursive: true, force: true });
}

if (process.env.VITE_PUBLIC_RELEASE === "true" && (pt.includes("[PREENCHER:") || en.includes("[PREENCHER:"))) {
  console.error("FAIL test:legal-draft: rascunho com [PREENCHER] não pode ir para a beta pública");
  process.exit(1);
}

console.log("test:legal-draft PASS (beta fechada ainda tem [PREENCHER])");
