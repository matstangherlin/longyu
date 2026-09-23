/**
 * RC2.2.8 — test:phase-challenge
 *
 * P9: próxima fase = 3 Fôlegos · avançada = 4 · reprovar = 48h · 47h59
 * bloqueado · 48h liberado · Qi/Pro/Pérola não furam. K10/K11: passar marca
 * só o provado, sem cultura, sem fundamentos. Mutações 25–31.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gatePhaseChallengeEconomy, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const pc = rcRequire("../../src/lib/phaseChallenge.ts");
const { JOURNEY, FOUNDATION_LESSON_IDS } = rcRequire("../../src/data/journey.ts");
const { isCultureLessonId } = rcRequire("../../src/data/cultureNative.ts");
const { CULTURE_SEALS } = rcRequire("../../src/data/cultureQuest.ts");

const H = 60 * 60 * 1000;
const allSeals = CULTURE_SEALS.map((seal) => seal.id);
const fresh = { completedLessons: [], cultureSeals: [], cultureCompletedIds: [], cultureMasteryById: {} };
const sealed = { ...fresh, cultureSeals: allSeals };
const p = (i) => JOURNEY[i].id;

it(cases, "K3 — alvos: próxima fase e uma além, nada mais", () => {
  const targets = pc.listPhaseChallengeTargets(sealed);
  assert.deepEqual(targets.map((t) => [t.phase.id, t.kind]), [[p(1), "next"], [p(2), "advanced"]]);
});

it(cases, "P9 mutação 25 — próxima fase custa 3 Fôlegos", () => {
  assert.equal(pc.evaluatePhaseChallengeTarget(p(1), sealed).cost, 3);
});

it(cases, "P9.1 mutação 26 — fase avançada custa 4 Fôlegos", () => {
  assert.equal(pc.evaluatePhaseChallengeTarget(p(2), sealed).cost, 4);
});

it(cases, "K4.1 — pular direto ao fim é recusado", () => {
  const far = pc.evaluatePhaseChallengeTarget(p(JOURNEY.length - 1), sealed);
  assert.equal(far.eligible, false);
  assert.equal(far.reason, "too_far");
  assert.equal(pc.evaluatePhaseChallengeTarget(p(0), sealed).reason, "already_reached");
});

it(cases, "K4.1 — banco de questões suficiente e cobrindo todas as unidades do escopo", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(2), sealed);
  const exam = pc.buildPhaseChallengeExam(target.scopeUnits);
  assert.equal(exam.status, "ok");
  assert.ok(exam.questions.length >= pc.PHASE_CHALLENGE_MIN_QUESTIONS);
  assert.ok(exam.questions.length <= pc.PHASE_CHALLENGE_MAX_QUESTIONS);
  const lessonUnit = new Map(target.scopeUnits.flatMap((u) => u.lessons.map((l) => [l.id, u.id])));
  const covered = new Set(exam.questions.map((q) => lessonUnit.get(q.lessonId)));
  for (const unit of target.scopeUnits) assert.ok(covered.has(unit.id), `unidade ${unit.id} sem pergunta`);
  assert.equal(pc.buildPhaseChallengeExam([]).status, "insufficient");
});

it(cases, "K11 / K10.1 — fundamentos e lições culturais nunca entram no que o PASS marca", () => {
  for (const i of [1, 2]) {
    const target = pc.evaluatePhaseChallengeTarget(p(i), sealed);
    for (const id of target.skippableLessonIds) {
      assert.ok(!FOUNDATION_LESSON_IDS.includes(id), `fundamento ${id}`);
      assert.ok(!isCultureLessonId(id), `cultura ${id}`);
    }
  }
});

it(cases, "K10 — PASS só marca o escopo (fases antes do alvo), nunca o alvo em si", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(1), sealed);
  const targetLessons = new Set(JOURNEY[1].units.flatMap((u) => u.lessons.map((l) => l.id)));
  for (const id of target.skippableLessonIds) assert.ok(!targetLessons.has(id));
});

it(cases, "K10.2 — marco cultural trancado no caminho bloqueia o alvo (não o atravessa)", () => {
  const blocked = pc.listPhaseChallengeTargets(fresh).find((t) => t.reason === "culture_gate");
  assert.ok(blocked, "com selos zerados algum alvo precisa esbarrar num marco");
  assert.equal(blocked.eligible, false);
  assert.ok(blocked.cultureGateItemId, "CTA aponta o CultureItem que falta");
});

const ledger = (folego = 5) => ({ folego, phaseChallengeAttempts: [], phaseChallengeCooldowns: {} });

it(cases, "K5.3 — débito único por attemptId", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(1), sealed);
  const first = pc.applyPhaseChallengeDebit(ledger(5), { attemptId: "a1", target, now: 0 });
  assert.equal(first.ok && first.charged, true);
  const state = { ...ledger(5), ...first.patch };
  assert.equal(state.folego, 2);
  const again = pc.applyPhaseChallengeDebit(state, { attemptId: "a1", target, now: 1 });
  assert.equal(again.ok && again.charged, false);
  assert.deepEqual(again.patch, {});
});

it(cases, "K5 — Fôlego insuficiente bloqueia", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(2), sealed);
  const result = pc.applyPhaseChallengeDebit(ledger(3), { attemptId: "b1", target, now: 0 });
  assert.deepEqual(result, { ok: false, reason: "folego" });
});

function failAt(t0) {
  const target = pc.evaluatePhaseChallengeTarget(p(1), sealed);
  const debit = pc.applyPhaseChallengeDebit(ledger(5), { attemptId: "c1", target, now: t0 });
  const state = { ...ledger(5), ...debit.patch };
  return { target, state: { ...state, ...pc.applyPhaseChallengeResult(state, { attemptId: "c1", passed: false, now: t0 }) } };
}

it(cases, "P9.2 — reprovou: retry imediato BLOQUEADO", () => {
  const { target, state } = failAt(1_000);
  assert.equal(pc.canStartPhaseChallenge({ target, folego: 5, cooldowns: state.phaseChallengeCooldowns, now: 1_000 }).reason, "cooldown");
});

it(cases, "P9.3 mutação 27 — 47h59 BLOQUEADO", () => {
  const { target, state } = failAt(0);
  const at = 47 * H + 59 * 60 * 1000;
  assert.equal(pc.canStartPhaseChallenge({ target, folego: 5, cooldowns: state.phaseChallengeCooldowns, now: at }).ok, false);
  const left = pc.formatCooldownRemaining(pc.phaseChallengeCooldown(state.phaseChallengeCooldowns, target.phase.id, at).remainingMs);
  assert.deepEqual(left, { hours: 0, minutes: 1 });
});

it(cases, "P9.4 — 48h LIBERADO", () => {
  const { target, state } = failAt(0);
  assert.equal(pc.canStartPhaseChallenge({ target, folego: 5, cooldowns: state.phaseChallengeCooldowns, now: 48 * H }).ok, true);
});

it(cases, "P9.5 mutações 28/29 — Pro, Pérola, Qi não furam o cooldown", () => {
  const { target, state } = failAt(0);
  const bribe = { target, folego: 999, cooldowns: state.phaseChallengeCooldowns, now: H, isPremium: true, dragonPearls: 999, points: 99999, inventory: { "shop-module-retry": 9 } };
  assert.equal(pc.canStartPhaseChallenge(bribe).ok, false);
  const cd = pc.phaseChallengeCooldown(state.phaseChallengeCooldowns, target.phase.id, H);
  assert.equal(cd.blocked, true);
  assert.equal(pc.phaseChallengeCooldown.length, 3, "assinatura sem plano/moeda");
});

it(cases, "K7 — fechar a mesma tentativa de novo não estende nem encurta", () => {
  const { state } = failAt(0);
  assert.equal(pc.applyPhaseChallengeResult(state, { attemptId: "c1", passed: false, now: 10 * H }), null);
});

it(cases, "K7 — aprovado não gera cooldown", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(1), sealed);
  const debit = pc.applyPhaseChallengeDebit(ledger(5), { attemptId: "d1", target, now: 0 });
  const state = { ...ledger(5), ...debit.patch };
  const done = pc.applyPhaseChallengeResult(state, { attemptId: "d1", passed: true, now: 0 });
  assert.equal(done.phaseChallengeCooldowns, undefined);
});

it(cases, "sync — cooldown mais longo vence entre aparelhos", () => {
  const merged = pc.mergePhaseChallengeState({ phaseChallengeCooldowns: { p2: 100 } }, { phaseChallengeCooldowns: { p2: 500, p3: 7 } });
  assert.deepEqual(merged.phaseChallengeCooldowns, { p2: 500, p3: 7 });
});

it(cases, "K13 — resultado com áreas fortes e fracas", () => {
  const target = pc.evaluatePhaseChallengeTarget(p(1), sealed);
  const exam = pc.buildPhaseChallengeExam(target.scopeUnits);
  const all = pc.gradePhaseChallenge(exam.questions, new Set(exam.questions.map((q) => q.id)));
  assert.equal(all.passed, true);
  assert.ok(all.strongAreas.length > 0);
  const none = pc.gradePhaseChallenge(exam.questions, new Set());
  assert.equal(none.passed, false);
  assert.ok(none.weakAreas.length > 0);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gatePhaseChallengeEconomy(src), []));
expectMutationCaught(cases, "25. próxima fase != 3 Fôlegos", gatePhaseChallengeEconomy, mutate(src, "phaseChallenge", "next: 3,", "next: 2,"));
expectMutationCaught(cases, "26. avançada != 4 Fôlegos", gatePhaseChallengeEconomy, mutate(src, "phaseChallenge", "advanced: 4,", "advanced: 3,"));
expectMutationCaught(cases, "27. retry < 48h", gatePhaseChallengeEconomy, mutate(src, "phaseChallenge", "PHASE_CHALLENGE_COOLDOWN_HOURS = 48;", "PHASE_CHALLENGE_COOLDOWN_HOURS = 24;"));
expectMutationCaught(cases, "28. Pro fura 48h", gatePhaseChallengeEconomy,
  mutate(src, "phaseChallenge", "  if (!retryAt || !Number.isFinite(retryAt) || now >= retryAt) {", "  if ((globalThis as { isPremium?: boolean }).isPremium || !retryAt || !Number.isFinite(retryAt) || now >= retryAt) {"));
expectMutationCaught(cases, "29. Pérola fura 48h", gatePhaseChallengeEconomy,
  mutate(src, "store", "{ attemptId, target, now: Date.now() }", "{ attemptId, target, now: s.dragonPearls > 0 ? Date.now() + 48 * 3600000 : Date.now() }"));
expectMutationCaught(cases, "30. Phase Challenge concede Selo", gatePhaseChallengeEconomy,
  mutate(src, "phaseChallengePage", "finishAttempt(attemptId, final.passed,", "useStore.getState().completeCultureMission({ itemId: \"x\", score: 1, memoryCorrect: true, scoredCount: 1, correctCount: 1 });\n    finishAttempt(attemptId, final.passed,"));
expectMutationCaught(cases, "31. lições puladas dão XP falso", gatePhaseChallengeEconomy,
  mutate(src, "phaseChallengePage", "finishAttempt(attemptId, final.passed,", "useStore.getState().addXp(200);\n    finishAttempt(attemptId, final.passed,"));
expectMutationCaught(cases, "K9. reusa shop-module-retry", gatePhaseChallengeEconomy,
  mutate(src, "phaseChallengePage", 'playSoundFx("spend", soundEffects);', 'useStore.getState().useInventoryItem("shop-module-retry");\n    playSoundFx("spend", soundEffects);'));

runCases("test:phase-challenge", cases);
