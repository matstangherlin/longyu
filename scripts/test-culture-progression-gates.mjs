/**
 * RC2.2.6 — test:culture-progression-gates
 *
 * Comportamento do loop: Jornada libera Cultura, Cultura gera Selo, Selo libera
 * Jornada. Exercita a MESMA função pura que a UI e o deep link consultam, para
 * que passar aqui signifique passar lá.
 */

import assert from "node:assert/strict";
import { require } from "./lib/v495a-runtime.mjs";

const { ALL_LESSONS } = require("../../src/data/journey.ts");
const {
  CULTURE_PROGRESSION_GATES,
  requiredCultureItemIdsForGate,
  cultureProgressionGateForItem,
  cultureProgressionGateBeforeTopic,
} = require("../../src/data/cultureProgressionGates.ts");
const {
  evaluateCultureProgressionGate,
  isTopicBlockedByCultureGate,
  isCultureItemDone,
  hasLegacyProgressPastGate,
} = require("../../src/lib/cultureProgressionGate.ts");

const cases = [];
const it = (name, fn) => {
  try {
    fn();
    cases.push({ name, ok: true });
  } catch (error) {
    cases.push({ name, ok: false, why: error?.message ?? String(error) });
  }
};

const gate = CULTURE_PROGRESSION_GATES.find((g) => g.id === "gate-social-etiquette");
assert.ok(gate, "gate-social-etiquette precisa existir");
const required = requiredCultureItemIdsForGate(gate);

/** Progresso cultural com N requisitos concluídos via mastery (caminho Jornada). */
const masteryFor = (itemIds) =>
  Object.fromEntries(itemIds.map((id) => [id, { itemId: id, completed: true, stars: 1 }]));

// ── A26.2 — usuário novo: 0/N e tópico trancado ────────────────────────────────
it("fresh user: 0/N e alvo bloqueado", () => {
  const evaluation = evaluateCultureProgressionGate(gate, {});
  assert.equal(evaluation.completed, 0);
  assert.equal(evaluation.total, required.length);
  assert.equal(evaluation.status, "locked");
  assert.equal(evaluation.ready, false);
  assert.equal(evaluation.nextItemId, required[0]);
  assert.equal(isTopicBlockedByCultureGate(gate.beforeTopicId, {}), true);
});

// ── A26.3 — um requisito feito: progride mas segue trancado ────────────────────
it("1/N: progresso conta, alvo continua bloqueado", () => {
  const progress = { cultureMasteryById: masteryFor([required[0]]) };
  const evaluation = evaluateCultureProgressionGate(gate, progress);
  assert.equal(evaluation.completed, 1);
  assert.equal(evaluation.status, "locked");
  assert.equal(evaluation.ready, false);
  assert.equal(evaluation.nextItemId, required[1]);
  assert.equal(isTopicBlockedByCultureGate(gate.beforeTopicId, progress), true);
});

// ── A26.4 — último requisito: selo e destravamento ─────────────────────────────
it("N/N: marco destrava", () => {
  const progress = { cultureMasteryById: masteryFor(required) };
  const evaluation = evaluateCultureProgressionGate(gate, progress);
  assert.equal(evaluation.completed, required.length);
  assert.equal(evaluation.status, "unlocked");
  assert.equal(evaluation.ready, true);
  assert.equal(evaluation.missingItemIds.length, 0);
  assert.equal(evaluation.nextItemId, undefined);
  assert.equal(isTopicBlockedByCultureGate(gate.beforeTopicId, progress), false);
});

it("selo já na mão destrava mesmo sem mastery registrado", () => {
  const progress = { cultureSeals: [gate.requiredSealId] };
  const evaluation = evaluateCultureProgressionGate(gate, progress);
  assert.equal(evaluation.status, "unlocked");
  assert.equal(evaluation.ready, true);
});

// ── A26.5 — concluir pelo Hub também libera ────────────────────────────────────
it("Hub: cultureCompletedIds libera igual à Jornada", () => {
  const viaHub = { cultureCompletedIds: [...required] };
  const viaJourney = { cultureMasteryById: masteryFor(required) };
  const hub = evaluateCultureProgressionGate(gate, viaHub);
  const journey = evaluateCultureProgressionGate(gate, viaJourney);
  assert.equal(hub.ready, true, "Hub precisa liberar");
  assert.equal(journey.ready, true, "Jornada precisa liberar");
  assert.equal(hub.status, journey.status, "Hub não é uma segunda realidade");
  assert.equal(hub.completed, journey.completed);
});

// ── A26.6 — deep link respeita o marco ────────────────────────────────────────
it("deep link: bloqueado sem selo, aberto com selo", () => {
  assert.equal(isTopicBlockedByCultureGate(gate.beforeTopicId, {}), true);
  assert.equal(
    isTopicBlockedByCultureGate(gate.beforeTopicId, { cultureSeals: [gate.requiredSealId] }),
    false
  );
});

it("tópico sem marco nunca é bloqueado por esta camada", () => {
  const ungated = ALL_LESSONS.find(
    (lesson) => !CULTURE_PROGRESSION_GATES.some((g) => g.beforeTopicId === lesson.id)
  );
  assert.ok(ungated);
  assert.equal(isTopicBlockedByCultureGate(ungated.id, {}), false);
});

// ── A26.7 — legado não regride ─────────────────────────────────────────────────
it("legacy: quem já passou do marco não retrocede", () => {
  const gateIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === gate.beforeTopicId);
  const laterLesson = ALL_LESSONS[gateIndex + 3];
  assert.ok(laterLesson, "precisa haver lição posterior ao marco");
  const progress = { completedLessons: [laterLesson.id] };
  assert.equal(hasLegacyProgressPastGate(gate, [laterLesson.id]), true);
  const evaluation = evaluateCultureProgressionGate(gate, progress);
  assert.equal(evaluation.status, "legacy_passed");
  assert.equal(evaluation.ready, true);
  assert.equal(isTopicBlockedByCultureGate(gate.beforeTopicId, progress), false);
});

it("legacy: concluir o próprio alvo também conta", () => {
  assert.equal(hasLegacyProgressPastGate(gate, [gate.beforeTopicId]), true);
});

it("legacy: progresso ANTES do marco não dá passe livre", () => {
  const gateIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === gate.beforeTopicId);
  const earlier = ALL_LESSONS[gateIndex - 1];
  assert.ok(earlier);
  assert.equal(hasLegacyProgressPastGate(gate, [earlier.id]), false);
  assert.equal(
    evaluateCultureProgressionGate(gate, { completedLessons: [earlier.id] }).status,
    "locked"
  );
});

// ── A18 — review_due não revoga selo ──────────────────────────────────────────
it("review_due não relocka: selo adquirido permanece", () => {
  const due = Object.fromEntries(
    required.map((id) => [
      id,
      { itemId: id, completed: true, stars: 1, reviewDueAt: Date.now() - 86_400_000, reviewStage: 2 },
    ])
  );
  const evaluation = evaluateCultureProgressionGate(gate, {
    cultureMasteryById: due,
    cultureSeals: [gate.requiredSealId],
  });
  assert.equal(evaluation.status, "unlocked");
  assert.equal(evaluation.ready, true);
});

// ── A19 — uma estrela basta; 3 estrelas não é exigido ─────────────────────────
it("uma estrela conclui: não exige perfect nem 3 estrelas", () => {
  const oneStar = Object.fromEntries(
    required.map((id) => [id, { itemId: id, completed: false, stars: 1, bestScore: 0.7 }])
  );
  assert.equal(evaluateCultureProgressionGate(gate, { cultureMasteryById: oneStar }).ready, true);
  for (const id of required) {
    assert.equal(isCultureItemDone(id, { cultureMasteryById: oneStar }), true);
  }
});

it("zero estrela e não concluído não conta", () => {
  const zero = Object.fromEntries(
    required.map((id) => [id, { itemId: id, completed: false, stars: 0 }])
  );
  assert.equal(evaluateCultureProgressionGate(gate, { cultureMasteryById: zero }).ready, false);
});

// ── A8 — nenhum aux node local-only na autoridade ─────────────────────────────
it("aux node local-only não influencia o marco", () => {
  const withAuxNoise = {
    auxNodeProgress: { "aux-anything": true },
    journeyNodeProgress: { foo: true },
  };
  assert.equal(evaluateCultureProgressionGate(gate, withAuxNoise).status, "locked");
});

// ── Registry: derivação e lookups ────────────────────────────────────────────
it("lookup por item e por tópico são consistentes", () => {
  for (const g of CULTURE_PROGRESSION_GATES) {
    assert.equal(cultureProgressionGateBeforeTopic(g.beforeTopicId)?.id, g.id);
    for (const itemId of requiredCultureItemIdsForGate(g)) {
      assert.equal(cultureProgressionGateForItem(itemId)?.id, g.id);
    }
  }
  assert.equal(cultureProgressionGateBeforeTopic("nao-existe"), undefined);
  assert.equal(cultureProgressionGateForItem(undefined), undefined);
});

it("os três marcos avaliam de forma independente", () => {
  const social = CULTURE_PROGRESSION_GATES.find((g) => g.id === "gate-social-etiquette");
  const table = CULTURE_PROGRESSION_GATES.find((g) => g.id === "gate-chinese-table");
  const progress = { cultureSeals: [social.requiredSealId] };
  assert.equal(evaluateCultureProgressionGate(social, progress).ready, true);
  assert.equal(evaluateCultureProgressionGate(table, progress).ready, false);
});

const failed = cases.filter((entry) => !entry.ok);
console.log(JSON.stringify({ total: cases.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
else console.log(`PASS test:culture-progression-gates (${cases.length} casos)`);
