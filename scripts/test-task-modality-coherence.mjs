#!/usr/bin/env node
/**
 * Mutações de P4 — coerência entre tarefa e modalidade.
 *
 * A mutação central é o bug original: um Phrase Builder cujo alvo é um
 * caractere só, com banco de enchimento. Se o gate não matar isso, ele não
 * teria encontrado 妈 / 一 / 人 / 木 sob "identificar 1º tom".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook, validateTaskModalityCoherence } from "./lib/rc1-1-gates.mjs";

const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(rel, "utf8");
const contractSource = read("src/features/lesson/taskModalityCoherence.ts");
const base = { contractSource, runtimeFailures: [] };

assert.deepEqual(validateTaskModalityCoherence(base).failures, [], "controle positivo (contrato)");

const mutations = [
  [
    "tarefa de tom aceita qualquer renderer",
    { contractSource: contractSource.replace(/tone_identification: \["tone", "tone_pair"/, 'tone_identification: ["produce", "sentence_build"') },
    "TONE_TASK",
  ],
  [
    "Phrase Builder deixa de exigir base",
    { contractSource: contractSource.replace(/phraseBuilderReadiness/g, "alwaysOk") },
    "CONTRACT",
  ],
  [
    "tom volta a ser pontuado por microfone sem avaliador",
    { contractSource: contractSource.replace(/hasAcousticToneEvaluator/g, "true") },
    "FAKE_TONE_SCORE",
  ],
  [
    "lista de habilidades proibidas para o builder some",
    { contractSource: contractSource.replace(/PHRASE_BUILDER_FORBIDDEN_SKILLS/g, "UNUSED_LIST") },
    "CONTRACT",
  ],
  [
    "plano real com Phrase Builder incoerente",
    { runtimeFailures: [{ ref: "p2-ma-primeiro-tom p3", message: "Phrase Builder sem base" }] },
    "RUNTIME",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateTaskModalityCoherence({ ...base, ...patch }).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// ── Comportamento real do contrato ────────────────────────────────────────
installTsRequireHook();
const contract = require(path.join(process.cwd(), "src/features/lesson/taskModalityCoherence.ts"));

// Mutação 8 do contrato: tone identification recebendo Phrase Builder.
const toneWithBuilder = {
  kind: "sentence_build",
  objective: "Identificar o 1º tom",
  targetParts: ["妈"],
  bank: ["妈", "一", "人", "木"],
};
const violations = contract.checkTaskModalityCoherence(toneWithBuilder);
const codes = violations.map((violation) => violation.code);
assert.ok(codes.includes("PHRASE_BUILDER_INJECTED"), "tone identification com Phrase Builder tem de falhar");
assert.ok(codes.includes("KIND_NOT_ALLOWED"), "sentence_build não é renderer de tom");

// O bug exato: alvo de um caractere com banco de enchimento.
const single = contract.phraseBuilderReadiness({ target: ["妈"], bank: ["妈", "一", "人"] });
assert.equal(single.ok, false, "um caractere não é frase montável");
assert.equal(single.hasProductionTarget, false);

// Uma montagem legítima continua passando — o gate não pode ser um veto geral.
const real = contract.phraseBuilderReadiness({ targetParts: ["你", "好"], bank: ["好", "你"] });
assert.equal(real.ok, true, `montagem real de 你好 precisa continuar válida: ${real.reasons.join("; ")}`);
const withDecoys = contract.phraseBuilderReadiness({
  targetParts: ["你", "好"],
  bank: ["你", "好", "会", "说", "中文"],
});
assert.equal(withDecoys.ok, true, "banco de frase com distratores é legítimo");

// P4.2 — a tarefa de tom usa interação de tom.
assert.deepEqual(
  contract.checkTaskModalityCoherence({ kind: "tone", objective: "Identificar o 1º tom", tone: 1 }),
  [],
  "áudio → 1/2/3/4 é o padrão correto e precisa passar"
);

// P4.3 — sem avaliador acústico, nada de score tonal por microfone.
assert.equal(contract.allowsSpeechScoring("tone_identification"), false);
assert.equal(contract.allowsSpeechScoring("tone_identification", true), true);
assert.equal(contract.allowsSpeechScoring("sentence_production"), true);

// O reparo em runtime: sem builder, o passo sai; com builder, vira hanzi_build.
const dropped = contract.repairPhraseBuilderCoherence([toneWithBuilder]);
assert.equal(dropped.length, 0, "sem builder, o Phrase Builder incoerente sai do plano");
const swapped = contract.repairPhraseBuilderCoherence([toneWithBuilder], () => ({
  id: "hb-ma",
  character: "妈",
  promptPt: "Monte 妈",
}));
assert.equal(swapped[0].kind, "hanzi_build", "com builder disponível, vira montagem de caractere");
assert.equal(swapped[0].builderId, "hb-ma");

console.log("PASS test:task-modality-coherence");
