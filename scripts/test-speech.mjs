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
  const { normalizeHan, scorePronunciation, analyzePronunciation, speechErrorMessage } = require(
    path.join(outDir, "src/lib/speech.js")
  );

  assert.equal(normalizeHan("你好世界"), "你好世界");
  assert.equal(normalizeHan("ni 你 hao 好!"), "你好");
  assert.equal(normalizeHan("hello"), "");

  assert.equal(scorePronunciation("你好", "你好").correct, true);
  assert.equal(scorePronunciation("你好吗", "你好").correct, true);
  assert.equal(scorePronunciation("谢谢", "你好").correct, false);
  assert.equal(scorePronunciation("", "你好").correct, false);

  // analyzePronunciation: contagem a partir do texto ouvido (não do alvo).
  {
    const same = analyzePronunciation("你好", "你好");
    assert.equal(same.correct, true);
    assert.equal(same.ratio, 1);
    assert.deepEqual(same.matched, ["你", "好"]);
    assert.deepEqual(same.missing, []);
  }
  {
    const different = analyzePronunciation("谢谢", "你好");
    assert.equal(different.correct, false);
    assert.equal(different.ratio, 0);
    assert.deepEqual(different.matched, []);
    assert.deepEqual(different.missing, ["你", "好"]);
  }
  {
    const partial = analyzePronunciation("你", "你好");
    assert.equal(partial.correct, false);
    assert.ok(partial.ratio > 0 && partial.ratio < 1);
    assert.deepEqual(partial.matched, ["你"]);
    assert.deepEqual(partial.missing, ["好"]);
  }
  {
    // Caractere repetido no alvo: só conta as ocorrências ouvidas.
    const repeated = analyzePronunciation("谢谢你", "谢谢");
    assert.equal(repeated.correct, true);
    assert.equal(repeated.ratio, 1);
    assert.deepEqual(repeated.matched, ["谢", "谢"]);
    assert.deepEqual(repeated.missing, []);
  }
  {
    const onlyOne = analyzePronunciation("谢", "谢谢");
    assert.equal(onlyOne.correct, false);
    assert.equal(onlyOne.matched.length, 1);
    assert.equal(onlyOne.missing.length, 1);
  }
  {
    const empty = analyzePronunciation("", "你好");
    assert.equal(empty.correct, false);
    assert.equal(empty.ratio, 0);
    assert.deepEqual(empty.matched, []);
    assert.deepEqual(empty.missing, ["你", "好"]);
  }
  {
    // Fala maior que o alvo: caracteres extras não inventam acertos no alvo.
    const longer = analyzePronunciation("你好世界", "你好");
    assert.equal(longer.correct, true);
    assert.equal(longer.ratio, 1);
    assert.deepEqual(longer.matched, ["你", "好"]);
    assert.deepEqual(longer.missing, []);
  }
  {
    // Regressão do bug: qualquer hànzì reconhecido NÃO deve aprovar o alvo.
    const bogus = analyzePronunciation("中", "你好");
    assert.equal(bogus.correct, false);
    assert.equal(bogus.ratio, 0);
    assert.deepEqual(bogus.matched, []);
    assert.deepEqual(bogus.missing, ["你", "好"]);
  }

  assert.match(speechErrorMessage("not-allowed"), /permissão/i);
  assert.match(speechErrorMessage("no-speech"), /ouvir/i);
  assert.match(speechErrorMessage("network"), /internet|conexão|conex/i);

  console.log("OK: speech helpers");
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
