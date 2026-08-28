import fs from "node:fs";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const gloss = JSON.parse(fs.readFileSync("src/i18n/overlays/instructionGloss.en.json", "utf8"));
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lex-"));
const program = ts.createProgram(["src/data/characters.ts", "src/data/chunks.ts"], {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  outDir,
  rootDir: root,
});
program.emit();
const { CHARACTERS } = require(path.join(outDir, "src/data/characters.js"));
const { CHUNKS } = require(path.join(outDir, "src/data/chunks.js"));
const missing = [];
for (const row of [...CHARACTERS, ...CHUNKS]) {
  for (const field of ["meaningPt", "literalPt", "mnemonicPt"]) {
    const v = row[field];
    if (typeof v === "string" && v.trim() && !(v in gloss)) missing.push(v);
  }
}
console.log("missing lexical", new Set(missing).size);
console.log([...new Set(missing)].join("\n"));
await rm(outDir, { recursive: true, force: true });
