#!/usr/bin/env node
/**
 * A voz do app é chinesa, então tudo que chega ao TTS é pronunciado como
 * mandarim. Um prompt de diálogo como "A: 谢谢！ B: ___" saía como "A, xièxie,
 * B, sublinhado": o aluno pediu o áudio da frase e recebeu a marcação da tela
 * junto. O mesmo valia para enunciados que misturam português e hànzì.
 *
 * A regra que este gate protege: texto COM hànzì tem o latim tratado como
 * andaime visual e só os trechos chineses são falados; texto SEM hànzì passa
 * intacto, porque é o caso do pinyin, que precisa ser pronunciado como está.
 */
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-speech-"));

// `tts.ts` importa store e soundFx, que puxam a árvore inteira. Compilamos só
// a função pura, extraída do próprio arquivo, para o gate não virar refém do
// grafo de dependências da UI.
const source = require("node:fs").readFileSync(path.join(rootDir, "src/lib/tts.ts"), "utf8");
const start = source.indexOf("const CJK_RANGE");
const end = source.indexOf("export function speak(");
if (start < 0 || end < 0 || end < start) throw new Error("bloco mandarinSpeechText não encontrado em src/lib/tts.ts");
const isolated = source.slice(start, end);

const emitted = ts.transpileModule(isolated, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
require("node:fs").writeFileSync(path.join(outDir, "speech.js"), emitted);
const { mandarinSpeechText } = require(path.join(outDir, "speech.js"));

const failures = [];
const check = (input, expected, why) => {
  const actual = mandarinSpeechText(input);
  if (actual !== expected) {
    failures.push(`${why}\n     entrada:  ${JSON.stringify(input)}\n     esperado: ${JSON.stringify(expected)}\n     obtido:   ${JSON.stringify(actual)}`);
  }
};

// ── O caso relatado: rótulos de diálogo de uma letra ──────────────────────
// `A` e `B` têm uma letra só, então qualquer guarda que exija "2+ letras
// latinas" os deixa passar. Este é o bug exato que o aluno ouviu.
check("A: 谢谢！ B: ___", "谢谢！", "rótulo de falante não pode ser falado");
check("A: 谢谢！ B: 不客气！ A: ___", "谢谢！不客气！", "vários rótulos e a lacuna somem, a fala fica");

// ── Enunciado que mistura português e hànzì ───────────────────────────────
check(
  "Alguem chega e voce diz 你好. Alguem sai. O que voce diz?",
  "你好",
  "enunciado em português não pode ser lido com voz chinesa"
);
check("Diga 谢谢 quando alguém ajudar", "谢谢", "instrução em torno do alvo é andaime, não fala");
check("Escolha entre 你好 e 再见", "你好再见", "alternativas em hànzì continuam faladas");

// ── Nomenclatura em inglês junto do hànzì ─────────────────────────────────
check("Hello — 你好", "你好", "glosa em inglês não é falada");
check("water (shuǐ) 水", "水", "nome latino e pinyin de apoio não são falados junto do hànzì");

// ── Pinyin puro continua intocado ─────────────────────────────────────────
// Sem hànzì não há andaime a remover: o texto É o conteúdo.
check("nǐ hǎo", "nǐ hǎo", "pinyin puro precisa ser pronunciado como está");
check("mā má mǎ mà", "mā má mǎ mà", "sílabas de treino de tom passam intactas");

// ── Hànzì puro não é alterado ─────────────────────────────────────────────
check("你好", "你好", "hànzì puro passa intacto");
check("你好，我在学中文", "你好，我在学中文", "pontuação chinesa faz parte da prosódia e fica");
check("再见！", "再见！", "exclamação chinesa fica");

// ── Bordas ────────────────────────────────────────────────────────────────
check("", "", "texto vazio não quebra");
check("___", "___", "sem hànzì, nada é removido");

if (failures.length) {
  console.error("FAIL test:mandarin-speech-text");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  "PASS test:mandarin-speech-text — rótulos de diálogo, enunciados em PT/EN e glosas não são falados; " +
    "pinyin e hànzì puros passam intactos."
);
