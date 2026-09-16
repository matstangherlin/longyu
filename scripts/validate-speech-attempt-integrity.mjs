#!/usr/bin/env node
/**
 * validate:speech-attempt-integrity — P4, P5, P6.
 *
 * O contrato: `phrasesSpoken` só cresce quando o microfone abriu e a voz foi
 * capturada; a mesma tentativa nunca conta duas vezes; e o histórico antigo,
 * que misturava revisão e fala, não é convertido em nada.
 */
import fs from "node:fs";
import path from "node:path";
import { validateSpeechAttemptIntegrity, simulateSpeechAttempts } from "./lib/rc1-5-gates.mjs";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const { failures } = validateSpeechAttemptIntegrity({
  storeSource: read("src/lib/store.ts"),
  speechSurfaceSource: read("src/features/lesson/PronunciationPractice.tsx"),
  falaSource: read("src/features/fala/FalaPage.tsx"),
});

// Contrato executado, não só lido: seis revisões não viram fala, uma tentativa
// real vira exatamente uma, e a repetição da mesma tentativa não soma.
const runtime = [];
const noCapture = simulateSpeechAttempts([
  { id: "a1", captured: false },
  { id: "a2", captured: false },
]);
if (noCapture.phrasesSpoken !== 0) {
  runtime.push({ code: "CAPTURE_IGNORED", where: "simulate", message: "sessão sem captura contou como fala" });
}
const once = simulateSpeechAttempts([
  { id: "a1", captured: true },
  { id: "a1", captured: true },
  { id: "a1", captured: true },
]);
if (once.phrasesSpoken !== 1) {
  runtime.push({
    code: "DOUBLE_COUNT",
    where: "simulate",
    message: `a mesma tentativa contou ${once.phrasesSpoken} vezes`,
  });
}

const all = [...failures, ...runtime];
if (all.length > 0) {
  console.error(`validate:speech-attempt-integrity falhou com ${all.length} problema(s):`);
  for (const failure of all) console.error(`- [${failure.code}] ${failure.where}: ${failure.message}`);
  process.exit(1);
}

console.log(
  "OK: validate:speech-attempt-integrity — captura obrigatória, tentativa idempotente, histórico antigo intacto"
);
