#!/usr/bin/env node
/**
 * Mutação 12 do contrato: "Plus repete exatamente as mesmas questões → fail".
 *
 * Repetir o CONHECIMENTO é o objetivo da Plus. Repetir a PERGUNTA ensina a
 * decorar a posição da alternativa. Este script prova que o gate distingue as
 * duas coisas.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook, validateAdaptiveRemediationDiversity } from "./lib/rc1-1-gates.mjs";

const require = createRequire(import.meta.url);
installTsRequireHook();
const plus = require(path.join(process.cwd(), "src/features/lesson/plusRound.ts"));

assert.deepEqual(validateAdaptiveRemediationDiversity({ plusModule: plus }).failures, [], "controle positivo");

const mutations = [
  [
    // Mutar o export de `remediationKindFor` não bastaria: `buildPlusRoundPlan`
    // chama a função interna. A mutação precisa ser no plano, que é o que a
    // tela realmente recebe.
    "remediação devolve a mesma modalidade que falhou",
    {
      plusModule: {
        ...plus,
        buildPlusRoundPlan: (input) => {
          const plan = plus.buildPlusRoundPlan(input);
          return {
            ...plan,
            slots: plan.slots.map((slot) =>
              slot.previousKind ? { ...slot, kind: slot.previousKind } : slot
            ),
          };
        },
      },
    },
    "SAME_MODALITY",
  ],
  [
    "Plus vira clone puro da lista de erros",
    {
      plusModule: {
        ...plus,
        buildPlusRoundPlan: (input) => ({
          topicId: input.topicId,
          slots: input.evidence.slice(0, 6).map((item) => ({
            ref: item.ref,
            origin: "weak",
            kind: item.stepKind ?? "comprehend",
            previousKind: item.stepKind ?? "comprehend",
            skill: item.skill,
          })),
          weakShare: 1,
          recallShare: 0,
        }),
      },
    },
    "SAME_MODALITY",
  ],
  [
    "gate de diversidade fica cego",
    { plusModule: { ...plus, checkRemediationDiversity: () => ({ ok: true, failures: [], changedModality: 0, weakSlots: 0 }) } },
    "GATE_BLIND",
  ],
  [
    "Plus deixa de revisar o tema (só erros)",
    {
      plusModule: {
        ...plus,
        buildPlusRoundPlan: (input) => ({ ...plus.buildPlusRoundPlan(input), recallShare: 0 }),
      },
    },
    "RECALL",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateAdaptiveRemediationDiversity(patch).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// ── A escada de remediação, caso a caso (P8.1–P8.4) ───────────────────────
const ladder = [
  ["meaning", ["comprehend"], "significado errado em múltipla escolha não volta como múltipla escolha"],
  ["tone", ["tone"], "tom errado não volta no mesmo exercício de tom"],
  ["hanzi", ["recognize"], "reconhecimento de hànzì errado muda de abordagem"],
  ["conversation", ["conversation_scene"], "produção aberta errada começa por peças"],
  ["production", ["free_production"], "produção livre errada começa mais apoiada"],
];
for (const [skill, failedKinds, label] of ladder) {
  const next = plus.remediationKindFor({ skill, failedKinds });
  assert.ok(!failedKinds.includes(next), `${label} (recebeu ${next})`);
  console.log(`OK ${label} → ${next}`);
}

// P7.3 — a Plus é curta mesmo com muita evidência.
const heavyEvidence = Array.from({ length: 40 }, (_, index) => ({
  ref: `char:item${index}`,
  skill: "meaning",
  signal: "wrong",
  stepKind: "comprehend",
  pass: (index % 4) + 1,
}));
const heavyPlan = plus.buildPlusRoundPlan({ topicId: "l5", evidence: heavyEvidence, topicSteps: [], size: 30 });
assert.ok(
  heavyPlan.slots.length <= plus.PLUS_ROUND_MAX_TASKS,
  `Plus não pode passar de ${plus.PLUS_ROUND_MAX_TASKS} tarefas (recebeu ${heavyPlan.slots.length})`
);
assert.ok(heavyPlan.slots.length >= plus.PLUS_ROUND_MIN_TASKS, "Plus precisa ter ao menos 6 tarefas");

// P7.2 — erro repetido vem antes de item pulado.
const ranked = plus.rankWeaknessTargets([
  { ref: "char:a", skill: "meaning", signal: "wrong", pass: 1 },
  { ref: "char:a", skill: "meaning", signal: "wrong", pass: 2 },
  { ref: "char:b", skill: "meaning", signal: "skip", pass: 1 },
]);
assert.equal(ranked[0].ref, "char:a", "o erro repetido tem de liderar o ranking");

// P20 — pular conta como evidência fraca e entra na Plus.
assert.ok(
  ranked.some((target) => target.ref === "char:b"),
  "item pulado precisa entrar na Plus"
);

// P8 — nenhuma combinação (alvo, modalidade) aparece duas vezes.
const keys = heavyPlan.slots.map((slot) => `${slot.ref}#${slot.kind}`);
assert.equal(new Set(keys).size, keys.length, "a Plus não pode repetir a mesma tarefa");

console.log("PASS test:adaptive-remediation-diversity");
