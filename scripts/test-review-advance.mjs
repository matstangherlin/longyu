#!/usr/bin/env node
/**
 * Mutações do contrato RC1.1 P0/P12/P13.
 *
 * Um gate que só passa não prova nada. Cada mutação abaixo é um bug real que
 * o QA viu (ou que a correção poderia reintroduzir); se o gate continuar verde
 * com a mutação aplicada, ele não está protegendo nada.
 */
import assert from "node:assert/strict";
import { validateReviewAdvance } from "./lib/rc1-1-gates.mjs";
import fs from "node:fs";

const read = (rel) => fs.readFileSync(rel, "utf8");
const base = {
  machineSource: read("src/features/lesson/taskFlowMachine.ts"),
  reviewSource: read("src/features/revisao/RevisaoPage.tsx"),
  moduleTestSource: read("src/features/challenge/ModuleChallengePage.tsx"),
  playerSource: read("src/features/lesson/LessonPlayer.tsx"),
};

assert.deepEqual(validateReviewAdvance(base).failures, [], "controle positivo: o código atual passa");

const mutations = [
  [
    "estado de feedback removido da máquina",
    { machineSource: base.machineSource.replaceAll('"feedback"', '"revealed"') },
    "STATE_MACHINE",
  ],
  [
    "invariante feedback × waitingForAnswer removido",
    { machineSource: base.machineSource.replace(/assertTaskFlowInvariant/g, "unusedCheck") },
    "INVARIANT",
  ],
  [
    "destino resolvido por vários caminhos",
    { machineSource: base.machineSource.replace(/resolvePostResultDestination/g, "maybeNext") },
    "NEXT_POINTER",
  ],
  [
    "conclusão deixa de ser local-first",
    { machineSource: base.machineSource.replace(/completeLocalFirst/g, "completeAndWait") },
    "LOCAL_FIRST",
  ],
  [
    "sync da nuvem volta a decidir a navegação",
    { playerSource: `${base.playerSource}\nconst gate = useStore((s) => s.cloudSyncState);\n` },
    "SYNC_BLOCKS",
  ],
  [
    "feedback sem CTA Continuar",
    { reviewSource: base.reviewSource.replace(/data-review-continue/g, "data-review-x") },
    "CONTINUE_CTA",
  ],
  [
    "CTA deixa de ser sticky no mobile",
    { reviewSource: base.reviewSource.replace(/data-review-sticky-actions/g, "data-review-actions") },
    "STICKY_CTA",
  ],
  [
    "duplo Continuar volta a contar duas vezes",
    { reviewSource: base.reviewSource.replace(/gradedReviewKeysRef/g, "noGuardRef") },
    "IDEMPOTENT",
  ],
  [
    "item respondido volta colado na fila",
    { reviewSource: base.reviewSource.replace(/nextQueuePosition/g, "justIncrement") },
    "DUE_RACE",
  ],
  [
    "último item não encerra a sessão",
    { moduleTestSource: base.moduleTestSource.replaceAll("pos + 1 >= questions.length", "false") },
    "LAST_ITEM",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const { failures } = validateReviewAdvance({ ...base, ...patch });
  const codes = failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não foi detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

console.log("PASS test:review-advance");
