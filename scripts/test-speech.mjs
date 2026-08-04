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
  assert.equal(scorePronunciation("谢谢", "你好").correct, false);
  assert.equal(scorePronunciation("", "你好").correct, false);

  // Ordem: 好你 nao cobre 你好.
  {
    const swapped = analyzePronunciation("好你", "你好");
    assert.equal(swapped.correct, false, "好你 vs 你好 → incorreto");
    assert.deepEqual(swapped.matchedMask, [true, false]);
    assert.deepEqual(swapped.matched, ["你"]);
    assert.deepEqual(swapped.missing, ["好"]);
  }

  // Repetidos: 谢 cobre só a primeira posição de 谢谢.
  {
    const onlyOne = analyzePronunciation("谢", "谢谢");
    assert.equal(onlyOne.correct, false);
    assert.deepEqual(onlyOne.matchedMask, [true, false], "apenas um caractere correto");
    assert.equal(onlyOne.matched.length, 1);
    assert.equal(onlyOne.missing.length, 1);
  }

  // Extras: 你好世界 cobre o alvo, com aviso de conteúdo a mais.
  {
    const longer = analyzePronunciation("你好世界", "你好");
    assert.equal(longer.correct, true);
    assert.equal(longer.hasExtra, true, "aviso de conteúdo extra");
    assert.deepEqual(longer.matchedMask, [true, true]);
    assert.deepEqual(longer.missing, []);
  }

  // Iguais.
  {
    const same = analyzePronunciation("你好", "你好");
    assert.equal(same.correct, true);
    assert.equal(same.hasExtra, false);
    assert.equal(same.ratio, 1);
    assert.deepEqual(same.matchedMask, [true, true]);
    assert.deepEqual(same.missing, []);
  }

  // Completamente diferente.
  {
    const different = analyzePronunciation("谢谢", "你好");
    assert.equal(different.correct, false);
    assert.equal(different.ratio, 0);
    assert.deepEqual(different.matchedMask, [false, false]);
  }

  // Parcial.
  {
    const partial = analyzePronunciation("你", "你好");
    assert.equal(partial.correct, false);
    assert.deepEqual(partial.matchedMask, [true, false]);
  }

  // 谢谢 completo.
  {
    const full = analyzePronunciation("谢谢", "谢谢");
    assert.equal(full.correct, true);
    assert.deepEqual(full.matchedMask, [true, true]);
  }

  // Vazio.
  {
    const empty = analyzePronunciation("", "你好");
    assert.equal(empty.correct, false);
    assert.deepEqual(empty.matchedMask, [false, false]);
  }

  // Regressão: qualquer hànzì nao aprova o alvo.
  {
    const bogus = analyzePronunciation("中", "你好");
    assert.equal(bogus.correct, false);
    assert.deepEqual(bogus.matchedMask, [false, false]);
  }

  // scorePronunciation também respeita ordem.
  assert.equal(scorePronunciation("好你", "你好").correct, false);
  assert.equal(scorePronunciation("你好世界", "你好").correct, true);
  assert.equal(scorePronunciation("你好世界", "你好").hasExtra, true);

  assert.match(speechErrorMessage("not-allowed"), /permissão/i);
  assert.match(speechErrorMessage("no-speech"), /ouvir/i);
  assert.match(speechErrorMessage("network"), /internet|conexão|conex/i);

  console.log("OK: speech helpers");
} finally {
  await rm(outDir, { recursive: true, force: true }).catch(() => {});
}
