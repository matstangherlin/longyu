#!/usr/bin/env node
/**
 * V4.9.4 — P0.19: a tabela de normalização, verificada.
 *
 * O bug que originou este arquivo veio de uso real: o campo prometia "hànzì ou
 * pinyin", o aluno escrevia `zài jiàn` contra a resposta `再见`, e a única
 * saída era "Pular". Medido antes da correção, o avaliador antigo recusava as
 * três formas de pinyin — a promessa da interface não existia no código.
 *
 * Cada linha aqui é uma afirmação sobre o que o aluno pode escrever. A linha
 * que mais importa é a última: `再现` continua reprovado. Aceitar "parecido"
 * resolveria a fricção e ensinaria o aluno a não olhar para o caractere.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v494-response-"));

try {
  const program = ts.createProgram(["src/lib/learnerResponse.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const lib = require(path.join(outDir, "src/lib/learnerResponse.js"));

  const failures = [];
  let assertions = 0;
  const expect = (label, actual, wanted) => {
    assertions += 1;
    if (actual !== wanted) failures.push(`${label}: esperado ${wanted}, obtido ${actual}`);
  };

  const verdict = (draft, answers, options = {}) =>
    lib.evaluateLearnerResponse({ draft, acceptedAnswers: answers, ...options }).accepted;

  // ── A tabela da P0.19, contra a resposta modelo 再见 ────────────────────
  const bye = ["再见"];
  expect("再见", verdict("再见", bye), true);
  expect("再见！", verdict("再见！", bye), true);
  expect("zài jiàn", verdict("zài jiàn", bye), true);
  expect("zai4 jian4", verdict("zai4 jian4", bye), true);
  expect("zai jian (sem tom, atividade não tonal)", verdict("zai jian", bye), true);
  expect("再现 (typo semântico)", verdict("再现", bye), false);

  // Um caractere errado nunca vira ponte para o pinyin: 再现 não pode ser
  // aceito só porque a leitura latina de 再见 casaria.
  expect("再现 mesmo com pinyin certo disponível", verdict("再现", ["再见", "zàijiàn"]), false);

  // Homófono: 在 e 再 soam igual (zài). Quem escreve 在见 escolheu o caractere
  // errado, e a ponte para o pinyin não pode salvá-lo — é o "fuzzy-match de
  // hànzì que deixa caractere errado passar" que a P0.6 proíbe.
  expect("在见 (homófono de 再见) é recusado", verdict("在见", ["再见"]), false);
  expect("你好 escrito 你号 é recusado", verdict("你号", ["你好"]), false);

  // ── Tom: quando a atividade mede tom, sem tom não passa ────────────────
  expect("zài jiàn em atividade tonal", verdict("zài jiàn", bye, { tonesRequired: true }), true);
  expect("zai4 jian4 em atividade tonal", verdict("zai4 jian4", bye, { tonesRequired: true }), true);
  expect("zai jian em atividade tonal", verdict("zai jian", bye, { tonesRequired: true }), false);

  // ── Ambiguidade sem tom ────────────────────────────────────────────────
  // Duas respostas autorizadas que colidem sem o tom não podem ser decididas
  // por adivinhação: aceitar diria "certo" para quem talvez quisesse a outra.
  const collide = ["再见", "在见"];
  expect("colisão sem tom é recusada", verdict("zai jian", collide), false);
  expect("colisão com tom explícito é decidida", verdict("zàijiàn", collide), true);

  // ── Outras respostas do arco ───────────────────────────────────────────
  expect("你好 em hànzì", verdict("你好", ["你好"]), true);
  expect("nǐ hǎo", verdict("nǐ hǎo", ["你好"]), true);
  expect("ni3 hao3", verdict("ni3 hao3", ["你好"]), true);
  expect("ni hao", verdict("ni hao", ["你好"]), true);
  expect("谢谢 em pinyin", verdict("xièxie", ["谢谢"]), true);
  expect("我很好 em pinyin", verdict("wǒ hěn hǎo", ["我很好"]), true);
  expect("resposta vazia", verdict("   ", ["你好"]), false);
  expect("resposta em português", verdict("até logo", ["再见"]), false);

  // ── As normalizações, isoladas ─────────────────────────────────────────
  expect(
    "tone-number vira tone-mark",
    lib.normalizePinyinResponse("zai4 jian4", { keepTones: true }),
    lib.normalizePinyinResponse("zài jiàn", { keepTones: true })
  );
  expect("sem tom apaga o acento", lib.normalizePinyinResponse("zài jiàn"), "zaijian");
  expect("hànzì perde pontuação", lib.normalizeHanziResponse("再见！"), "再见");
  expect("hànzì mantém o caractere", lib.normalizeHanziResponse("再现"), "再现");

  // ── A ponte hànzì → pinyin vem dos dados, não de palpite ───────────────
  const forms = lib.pinyinFormsFor("再见");
  expect("再见 tem leitura conhecida", forms.length > 0, true);
  expect(
    "caractere fora do léxico não inventa leitura",
    lib.pinyinFormsFor("龘").length,
    0
  );

  if (failures.length) {
    console.error("FAIL test:learner-response");
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS test:learner-response — ${assertions} asserções sobre o que o aluno pode escrever.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
