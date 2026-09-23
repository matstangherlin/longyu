/**
 * RC2.2.8 — test:streak-recovery-prompt
 *
 * B1–B5 em runtime (sessionStorage falso = "sessão de entrada no site") e as
 * mutações 4–5 contra o gate.
 */
import assert from "node:assert/strict";
import {
  expectMutationCaught,
  gateStreakPrompt,
  it,
  mutate,
  rcRequire,
  readSources,
  runCases,
} from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const {
  isStreakRecoveryPromptEligible,
  markStreakRecoveryPromptShown,
  streakRecoveryEventKey,
  wasStreakRecoveryPromptShown,
} = rcRequire("../../src/lib/streakRecoveryPrompt.ts");
const { reconcileStreak } = rcRequire("../../src/lib/streak.ts");

function fakeSession() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)) };
}

const today = "2026-09-23";
const recovery = { streak: 12, brokenOn: today };

/** O que o watcher faz a cada render/rota: mostra se elegível e não mostrado na sessão. */
function wouldShow(session, pending, rec = recovery, accountId = "cloud:u1") {
  if (!isStreakRecoveryPromptEligible({ pending, recovery: rec, today })) return false;
  const key = streakRecoveryEventKey(accountId, rec);
  if (wasStreakRecoveryPromptShown(key, session)) return false;
  markStreakRecoveryPromptShown(key, session);
  return true;
}

it(cases, "B1 — abrir o app: o aviso aparece uma vez", () => {
  const session = fakeSession();
  assert.equal(wouldShow(session, 12), true);
});

it(cases, "B2.2/P4 — Agora não + Journey/Cultura/Revisão/Atlas/Loja/Perfil: NÃO reaparece", () => {
  const session = fakeSession();
  assert.equal(wouldShow(session, 12), true);
  // reconcileStreak reconstrói o pendente enquanto a janela vale (a causa do spam).
  for (const _route of ["/jornada", "/cultura", "/revisao", "/hanzi/atlas", "/loja", "/perfil"]) {
    const rebuilt = reconcileStreak(
      { streak: 0, lastStudyDate: "2026-09-21", lastActive: "2026-09-21", streakShields: 0, streakRecovery: recovery, pendingStreakRecovery: null },
      today
    );
    assert.equal(rebuilt.pendingStreakRecovery, 12, "pendente é reconstruído (comportamento antigo preservado)");
    assert.equal(wouldShow(session, rebuilt.pendingStreakRecovery), false);
  }
});

it(cases, "B3.1 — Agora não não apaga a oportunidade: a janela segue aberta", () => {
  const rebuilt = reconcileStreak(
    { streak: 0, lastStudyDate: "2026-09-21", lastActive: "2026-09-21", streakShields: 0, streakRecovery: recovery, pendingStreakRecovery: null },
    today
  );
  assert.deepEqual(rebuilt.streakRecovery, recovery);
});

it(cases, "B4/P4.1 — nova sessão do navegador com recuperação válida: pode aparecer uma vez", () => {
  const first = fakeSession();
  assert.equal(wouldShow(first, 12), true);
  const nextSession = fakeSession();
  assert.equal(wouldShow(nextSession, 12), true);
  assert.equal(wouldShow(nextSession, 12), false);
});

it(cases, "B5 — novo evento real de perda gera novo aviso", () => {
  const session = fakeSession();
  assert.equal(wouldShow(session, 12), true);
  const newLoss = { streak: 3, brokenOn: "2026-09-30" };
  assert.equal(
    isStreakRecoveryPromptEligible({ pending: 3, recovery: newLoss, today: "2026-09-30" }) &&
      !wasStreakRecoveryPromptShown(streakRecoveryEventKey("cloud:u1", newLoss), session),
    true
  );
});

it(cases, "B4 — janela vencida não gera aviso", () => {
  assert.equal(isStreakRecoveryPromptEligible({ pending: 12, recovery: { streak: 12, brokenOn: "2026-09-22" }, today }), false);
});

it(cases, "storage bloqueado não quebra", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(wasStreakRecoveryPromptShown("k", broken), false);
  markStreakRecoveryPromptShown("k", broken);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateStreakPrompt(src), []));
expectMutationCaught(cases, "4. modal reaparece após navegar (sem memória de sessão)", gateStreakPrompt,
  mutate(src, "streakWatcher", "if (promptedThisLoad.has(eventKey) || wasStreakRecoveryPromptShown(eventKey)) return;", "void promptedThisLoad;"));
expectMutationCaught(cases, "5. Agora não destrói a recuperação", gateStreakPrompt,
  mutate(src, "store", "const next = { ...s, pendingStreakRecovery: null };\n          return { pendingStreakRecovery: null, accounts: saveCurrentAccount(next) };",
    "const next = { ...s, pendingStreakRecovery: null, streakRecovery: null };\n          return { pendingStreakRecovery: null, streakRecovery: null, accounts: saveCurrentAccount(next) };"));
expectMutationCaught(cases, "B2.1. localStorage permanente", gateStreakPrompt,
  mutate(src, "streakPrompt", "window.sessionStorage", "window.localStorage"));

runCases("test:streak-recovery-prompt", cases);
