#!/usr/bin/env node
/**
 * Mutações do contrato de tentativa de fala (P23 · 8, 10, 11).
 *
 * As duas que mais assustam são silenciosas. A 10 incrementa sem tentativa
 * nenhuma — e um painel adaptativo passa a "saber" que o aluno produz fala. A
 * 11 conta a mesma tentativa duas vezes, o que parece inofensivo até virar
 * medalha e missão pagas por um único "alô".
 */
import assert from "node:assert/strict";
import { validateSpeechAttemptIntegrity, simulateSpeechAttempts } from "./lib/rc1-5-gates.mjs";

// ——— O contrato em execução ——————————————————————————————————————
const sixSelfRatings = simulateSpeechAttempts([]); // seis cliques não chegam aqui
assert.equal(sixSelfRatings.phrasesSpoken, 0, "autoavaliação não pode virar fala");
console.log("OK P15.2 — seis revisões por autoavaliação somam phrasesSpoken += 0");

const oneRealAttempt = simulateSpeechAttempts([{ id: "pron:你好:1", captured: true }]);
assert.equal(oneRealAttempt.phrasesSpoken, 1, "uma tentativa real soma exatamente 1");
console.log("OK P15.3 — uma tentativa real soma phrasesSpoken += 1");

const mutations = [
  [
    "M10 — incrementa sem captura de voz (mic negado, no-speech, sem suporte)",
    [
      { id: "a1", captured: false },
      { id: "a2", captured: false },
      { id: "a3", captured: false },
    ],
    0,
  ],
  [
    "M11 — a mesma tentativa chega três vezes (re-render, onend duplo, duplo clique)",
    [
      { id: "mesma", captured: true },
      { id: "mesma", captured: true },
      { id: "mesma", captured: true },
    ],
    1,
  ],
  [
    "tentativa sem chave idempotente",
    [
      { id: "", captured: true },
      { id: "   ", captured: true },
    ],
    0,
  ],
];

for (const [label, attempts, expected] of mutations) {
  const result = simulateSpeechAttempts(attempts);
  assert.equal(
    result.phrasesSpoken,
    expected,
    `mutação "${label}" não contida (esperado ${expected}, obtido ${result.phrasesSpoken})`
  );
  console.log(`KILLED ${label}: phrasesSpoken = ${expected}`);
}

// Tentativas distintas continuam contando — o contrato não pode virar mordaça.
const three = simulateSpeechAttempts([
  { id: "a1", captured: true },
  { id: "a2", captured: true },
  { id: "a3", captured: true },
]);
assert.equal(three.phrasesSpoken, 3, "tentativas distintas precisam contar");
console.log("OK controle: três tentativas reais e distintas somam 3");

// ——— O contrato no código ————————————————————————————————————————
const honestStore = `
export type DailyTaskKey = | "audioHeard" | "phrasesReviewed" | "reviewsDone";
recordSpeechAttempt: (attempt) => {
  const key = attempt?.id?.trim();
  if (!key || !attempt.captured) return false;
  const seen = dailyTasks.speechAttemptKeys ?? [];
  if (seen.includes(key)) return {};
};
phrasesReviewed: Math.max(0, tasks.phrasesReviewed ?? 0),
`;
const honest = {
  storeSource: honestStore,
  speechSurfaceSource: "recordSpeechAttempt({ id, captured: true })",
  falaSource: 'recordDailyTask("phrasesReviewed")',
};
assert.deepEqual(validateSpeechAttemptIntegrity(honest).failures, [], "controle positivo do código");

const sourceMutations = [
  [
    "M8 — phrasesSpoken volta a ser DailyTaskKey e recordDailyTask volta a compilar",
    {
      ...honest,
      storeSource: honestStore.replace('| "phrasesReviewed"', '| "phrasesReviewed" | "phrasesSpoken"'),
    },
    "SPEECH_STILL_A_DAILY_TASK",
  ],
  [
    "M10 — a captura deixa de ser obrigatória",
    { ...honest, storeSource: honestStore.replace("if (!key || !attempt.captured) return false;", "if (!key) return false;") },
    "NO_CAPTURE_REQUIREMENT",
  ],
  [
    "M11 — a idempotência é removida do store",
    { ...honest, storeSource: honestStore.replace("if (seen.includes(key)) return {};", "") },
    "NOT_IDEMPOTENT",
  ],
  [
    "P4.3 — a migração converte histórico antigo em revisão",
    {
      ...honest,
      storeSource: honestStore.replace(
        "phrasesReviewed: Math.max(0, tasks.phrasesReviewed ?? 0),",
        "phrasesReviewed: tasks.phrasesReviewed ?? tasks.phrasesSpoken ?? 0,"
      ),
    },
    "HISTORY_REWRITE",
  ],
  [
    "M6 — a /fala volta a registrar fala sem microfone",
    { ...honest, falaSource: 'recordDailyTask("phrasesReviewed"); recordSpeechAttempt({ id, captured: true });' },
    "FALA_FAKES_SPEECH",
  ],
  [
    "a /fala para de registrar a revisão que realmente acontece",
    { ...honest, falaSource: "gradeSrs(item);" },
    "FALA_WITHOUT_REVIEW_METRIC",
  ],
  [
    "a única tela que escuta para de registrar tentativa",
    { ...honest, speechSurfaceSource: "recognizeOnce(onResult, onError);" },
    "SPEECH_SURFACE_SILENT",
  ],
];

for (const [label, input, expected] of sourceMutations) {
  const codes = validateSpeechAttemptIntegrity(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:speech-attempt-integrity");
