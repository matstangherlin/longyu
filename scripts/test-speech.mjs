import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-speech-"));
try {
  const program = ts.createProgram(["src/lib/speech.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  const emit = program.emit();
  assert.equal(emit.emitSkipped, false, "emit speech.ts");
  const { normalizeHan, scorePronunciation, speechErrorMessage } = require(
    path.join(outDir, "src/lib/speech.js")
  );

  assert.equal(normalizeHan("你好世界"), "你好世界");
  assert.equal(normalizeHan("ni 你 hao 好!"), "你好");
  assert.equal(normalizeHan("hello"), "");

  assert.equal(scorePronunciation("你好", "你好").correct, true);
  assert.equal(scorePronunciation("你好吗", "你好").correct, true);
  assert.equal(scorePronunciation("谢谢", "你好").correct, false);
  assert.equal(scorePronunciation("", "你好").correct, false);

  assert.match(speechErrorMessage("not-allowed"), /permissão/i);
  assert.match(speechErrorMessage("no-speech"), /ouvir/i);
  assert.match(speechErrorMessage("network"), /internet|conexão|conex/i);

  console.log("OK: speech helpers");
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
