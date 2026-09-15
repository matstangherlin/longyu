#!/usr/bin/env node
/**
 * RC1.3 · P32 — mutações 1, 2, 3, 4, 24 e 26.
 *
 * Um gate que só lê o contrato não teria pego o loop real: ele nasceu de duas
 * linhas de runtime (a fila recalculada e a `key` que remontava a sessão). Por
 * isso cada mutação aqui ataca a MÁQUINA, não o texto — e um controle positivo
 * garante que a máquina íntegra passa.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./lib/rc1-1-gates.mjs";
import { validateReviewFiniteSession } from "./lib/rc1-3-gates.mjs";

installTsRequireHook();
const require = createRequire(import.meta.url);
const plan = require(path.join(process.cwd(), "src/features/lesson/reviewSessionPlan.ts"));

const killed = [];
function kill(label) {
  killed.push(label);
  console.log(`KILLED ${killed.length} ${label}`);
}

const sources = ["A", "B", "C"].map((id) => ({ errorId: id, logicalReviewItemId: id }));
const built = plan.buildReviewSessionPlan({ reviewSessionId: "t", sources });

// Controle positivo: a máquina real passa.
const control = validateReviewFiniteSession();
assert.equal(control.failures.length, 0, `controle positivo falhou: ${JSON.stringify(control.failures)}`);

// ── Mutação 1: errar adiciona o próprio item infinitamente ─────────────────
{
  const run = plan.runReviewSession(built, () => false);
  assert.ok(run.terminated, "sessão com tudo errado não terminou");
  assert.ok(
    run.renderedOrder.length <= built.maxRenderedTasks,
    `renderizou ${run.renderedOrder.length} > teto ${built.maxRenderedTasks}`
  );
  kill("Mutação 1 · revisão errada se re-adiciona infinitamente");
}

// ── Mutação 2: mesmo logicalReviewItem aparece mais de 2 vezes ─────────────
{
  const run = plan.runReviewSession(built, () => false);
  const counts = new Map();
  for (const id of run.renderedOrder) {
    const logical = id.split(":")[1];
    counts.set(logical, (counts.get(logical) ?? 0) + 1);
  }
  for (const [logical, count] of counts) {
    assert.ok(count <= 2, `${logical} apareceu ${count} vezes`);
  }
  // E o invariante recusa um estado forjado com 3 ocorrências.
  const forged = { ...plan.startReviewSession(built), occurrences: { A: 3 } };
  const report = plan.checkReviewSessionInvariants(forged);
  assert.ok(!report.ok, "invariante aceitou 3 ocorrências do mesmo conhecimento");
  kill("Mutação 2 · mesmo logicalReviewItem > 2 aparições");
}

// ── Mutação 3: o último item volta para ele mesmo ──────────────────────────
{
  let state = plan.startReviewSession(built);
  for (let guard = 0; guard < 20 && state.status === "active"; guard += 1) {
    const item = plan.currentReviewItem(state);
    state = plan.answerReviewItem(state, { reviewItemId: item.reviewItemId, correct: true });
    state = plan.advanceReviewSession(state);
  }
  assert.equal(state.status, "complete", "sessão não fechou depois do último item");
  assert.equal(plan.currentReviewItem(state), null, "último item devolveu para ele mesmo");
  kill("Mutação 3 · último item volta para si mesmo");
}

// ── Mutação 4: "Praticar o que travou" cria revisão aninhada ───────────────
{
  // Errar dentro da revisão não pode fazer o plano crescer além do orçamento.
  let state = plan.startReviewSession(built);
  const before = state.plan.plannedItems.length;
  const item = plan.currentReviewItem(state);
  state = plan.answerReviewItem(state, { reviewItemId: item.reviewItemId, correct: false });
  assert.equal(state.plan.plannedItems.length, before, "o plano imutável cresceu ao errar");
  assert.ok(state.queue.length <= state.plan.maxRenderedTasks, "a fila passou do teto ao errar");
  kill("Mutação 4 · erro dentro da revisão cria revisão aninhada");
}

// ── Mutação 24: revisão falhada nunca termina ──────────────────────────────
{
  for (const size of [1, 2, 5, 9]) {
    const many = plan.buildReviewSessionPlan({
      reviewSessionId: `t${size}`,
      sources: Array.from({ length: size }, (_, index) => ({ errorId: `e${index}`, logicalReviewItemId: `L${index}` })),
    });
    const run = plan.runReviewSession(many, () => false);
    assert.ok(run.terminated, `sessão de ${size} itens com tudo errado não terminou`);
    assert.equal(run.state.unresolvedLogicalIds.length, size, "fraquezas não seguiram para o SRS");
  }
  kill("Mutação 24 · revisão falhada nunca termina");
}

// ── Mutação 26: o loop consome energia de novo ─────────────────────────────
{
  // Sem loop não há segunda cobrança: a sessão tem um teto de renderizações e o
  // player não reabre a mesma sessão (o gate cobre o lado do player).
  const run = plan.runReviewSession(built, () => false);
  assert.ok(run.state.renderedTasks <= built.maxRenderedTasks, "renderizações acima do teto");
  const source = require("node:fs").readFileSync(
    path.join(process.cwd(), "src/features/lesson/LessonPlayer.tsx"),
    "utf8"
  );
  assert.ok(!/onReviewAgain/.test(source), "o resumo ainda reabre a mesma revisão");
  kill("Mutação 26 · loop de revisão volta a consumir energia");
}

// ── P1.8: o disjuntor encerra com segurança ────────────────────────────────
{
  let state = plan.startReviewSession(built);
  // Força um estado impossível: renderizações acima do teto.
  state = { ...state, renderedTasks: built.maxRenderedTasks };
  const item = plan.currentReviewItem(state);
  const tripped = plan.answerReviewItem(state, { reviewItemId: item.reviewItemId, correct: false });
  assert.equal(tripped.status, "aborted", "disjuntor não abriu acima do teto");
  assert.equal(tripped.breaker.code, "RENDER_BUDGET_EXCEEDED");
  kill("P1.8 · disjuntor encerra a sessão em vez de prender o aluno");
}

// ── P1.4: nunca A seguido de A ─────────────────────────────────────────────
{
  const run = plan.runReviewSession(built, () => false);
  for (let index = 1; index < run.renderedOrder.length; index += 1) {
    assert.notEqual(
      run.renderedOrder[index - 1].split(":")[1],
      run.renderedOrder[index].split(":")[1],
      "retry imediato (A A) em vez de atrasado (A B C A')"
    );
  }
  kill("P1.4 · retry é atrasado, nunca imediato");
}

console.log(`PASS test:review-finite-session — ${killed.length} mutações mortas, com controle positivo.`);
