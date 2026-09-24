/**
 * RC2.2.8 — test:profile-medal-showcase
 *
 * G5: vitrine (até 3, só desbloqueadas). G2/L: medalhas culturais derivadas
 * de progresso real. G7.1: selo ≠ medalha. Mutações 13–15.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gateAchievementCulture, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const { ACHIEVEMENTS, isAchievementComplete } = rcRequire("../../src/data/achievements.ts");
const { CULTURE_SEALS } = rcRequire("../../src/data/cultureQuest.ts");
const { cultureItemsInCollection } = rcRequire("../../src/data/cultureCollections.ts");
const { normalizeFeaturedAchievementIds, toggleFeaturedAchievement, FEATURED_ACHIEVEMENTS_MAX } = rcRequire("../../src/lib/profileShowcase.ts");

const base = {
  completedLessons: [],
  longestStreak: 0,
  xpTotal: 0,
  learnedChars: [],
  learnedChunks: [],
  srs: {},
  lifetimeStats: { audioHeard: 0, phrasesSpoken: 0, phrasesReviewed: 0, reviewsDone: 0, hanziDecomposed: 0, microtextsRead: 0, reviewDays: [] },
  medals: [],
  missionHistory: [],
  rewardHistory: [],
  mandarinDisplayMode: "pinyin_hanzi",
  validatedModules: [],
};
const byId = (id) => ACHIEVEMENTS.find((def) => def.id === id);

it(cases, "G1 — categorias cultura e atlas existem no catálogo", () => {
  assert.ok(ACHIEVEMENTS.some((def) => def.category === "cultura"));
  assert.ok(ACHIEVEMENTS.some((def) => def.category === "atlas"));
});

it(cases, "G2.1 mutação 13 — sem progresso cultural, nenhuma medalha cultural progride", () => {
  for (const def of ACHIEVEMENTS.filter((d) => d.category === "cultura")) {
    assert.equal(def.progress(base).current, 0, def.id);
    assert.equal(def.progress({ ...base, cultureSeals: [], cultureCompletedIds: [], cultureKnowledgeById: {} }).current, 0, def.id);
  }
});

it(cases, "P6 — ganhar selo cultural avança a medalha cultural", () => {
  const snapshot = { ...base, cultureSeals: ["social-etiquette"] };
  assert.equal(isAchievementComplete(byId("cultura-primeiro-selo"), snapshot), true);
  assert.equal(byId("cultura-3-selos").progress(snapshot).current, 1);
  const all = { ...base, cultureSeals: CULTURE_SEALS.map((seal) => seal.id) };
  assert.equal(isAchievementComplete(byId("cultura-todos-selos"), all), true);
});

it(cases, "G2 — selo desconhecido não conta (sem inflar)", () => {
  assert.equal(byId("cultura-primeiro-selo").progress({ ...base, cultureSeals: ["fake-seal"] }).current, 0);
});

it(cases, "G2 — Explorador da História exige a coleção inteira", () => {
  const ids = cultureItemsInCollection("china_history").map((item) => item.id);
  assert.equal(isAchievementComplete(byId("cultura-historia"), { ...base, cultureCompletedIds: ids.slice(0, -1) }), false);
  assert.equal(isAchievementComplete(byId("cultura-historia"), { ...base, cultureCompletedIds: ids }), true);
});

it(cases, "G2 — Cultura na Jornada conta só conceitos vistos na Jornada", () => {
  const knowledge = {
    a: { conceptId: "a", cultureItemId: "a", state: "introduced", source: "journey", updatedAt: 1 },
    b: { conceptId: "b", cultureItemId: "b", state: "practiced", source: "journey", updatedAt: 1 },
    c: { conceptId: "c", cultureItemId: "c", state: "practiced", source: "mission", updatedAt: 1 },
    d: { conceptId: "d", cultureItemId: "d", state: "unseen", source: "journey", updatedAt: 1 },
  };
  assert.equal(byId("cultura-na-jornada").progress({ ...base, cultureKnowledgeById: knowledge }).current, 2);
});

it(cases, "G3/L2 — revisar Hànzì avança a medalha do Atlas", () => {
  const srs = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`char:c${i}:significado`, { id: `char:c${i}:significado`, type: "char", itemId: `c${i}`, reps: 1, lapses: 0, ease: 2.5, intervalDays: 1, due: 0, createdAt: 0 }])
  );
  assert.equal(isAchievementComplete(byId("atlas-10-revisados"), { ...base, srs }), true);
});

it(cases, "L5.1 — nenhuma medalha paga Pérola", () => {
  for (const def of ACHIEVEMENTS) assert.ok(!("pearl" in def.reward) && !("dragonPearl" in def.reward), def.id);
});

const unlocked = { "cultura-primeiro-selo": 1, "hanzi-10": 2, "xp-100": 3, "sequencia-3": 4 };
it(cases, "G5.1 — até 3 em destaque", () => {
  assert.equal(FEATURED_ACHIEVEMENTS_MAX, 3);
  assert.equal(normalizeFeaturedAchievementIds(Object.keys(unlocked), unlocked).length, 3);
});

it(cases, "P6.1 — medalha desbloqueada pode ser escolhida", () => {
  const result = toggleFeaturedAchievement([], "cultura-primeiro-selo", unlocked);
  assert.equal(result.changed, true);
  assert.deepEqual(result.ids, ["cultura-primeiro-selo"]);
});

it(cases, "P6.2 mutação 14 — medalha bloqueada NÃO pode ser destacada", () => {
  const result = toggleFeaturedAchievement([], "cultura-todos-selos", unlocked);
  assert.equal(result.changed, false);
  assert.equal(result.reason, "locked");
  assert.deepEqual(normalizeFeaturedAchievementIds(["cultura-todos-selos"], unlocked), []);
});

it(cases, "G5 — quarta medalha é recusada com motivo", () => {
  const three = ["cultura-primeiro-selo", "hanzi-10", "xp-100"];
  const result = toggleFeaturedAchievement(three, "sequencia-3", unlocked);
  assert.equal(result.reason, "full");
});

it(cases, "G7.1 mutação 15 — selo não é medalha: id de selo nunca vira destaque", () => {
  for (const seal of CULTURE_SEALS) {
    assert.ok(!ACHIEVEMENTS.some((def) => def.id === seal.id), `colisão de id ${seal.id}`);
    assert.equal(toggleFeaturedAchievement([], seal.id, unlocked).changed, false);
  }
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateAchievementCulture(src), []));
expectMutationCaught(cases, "13. medalha cultural com contador falso", gateAchievementCulture,
  mutate(src, "achievements", "progress: (s) => capped(cultureSealCount(s), 1),", "progress: (s) => capped(Math.random() > 2 ? 1 : 0, 1),"));
expectMutationCaught(cases, "14. medalha bloqueada destacável", gateAchievementCulture,
  mutate(src, "profileShowcaseLib", "    if (!unlocked?.[id]) continue;\n", ""));
expectMutationCaught(cases, "15. selo tratado como medalha", gateAchievementCulture,
  // RC2.2.11 — a vitrine agora também filtra por medalha (isMedalAchievementId).
  mutate(src, "profileShowcase", "const featured = normalizeFeaturedAchievementIds(featuredRaw, unlocked, undefined, isMedalAchievementId);", "const featured = [...normalizeFeaturedAchievementIds(featuredRaw, unlocked, undefined, isMedalAchievementId), ...useStore.getState().cultureSeals];"));

runCases("test:profile-medal-showcase", cases);
