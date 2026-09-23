/**
 * RC2.2.8 — test:hanzi-atlas-study-sets
 *
 * F: conjunto do Atlas → Revisão, pelo MESMO SRS. P8: "fracos" → treinar →
 * só Hànzì elegíveis. Mutações 20–21.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gateAtlasStudySets, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const {
  ATLAS_STUDY_SET_MAX,
  atlasSmartSetItems,
  atlasStudySetHref,
  atlasStudySetSrsItems,
  buildAtlasStudySet,
  parseAtlasStudySet,
  reviewCharIdForAtlasItem,
} = rcRequire("../../src/lib/atlasStudySet.ts");
const { HANZI_ATLAS } = rcRequire("../../src/data/hanziAtlas.ts");
const { canPromoteAtlasItemToReview } = rcRequire("../../src/data/contentArchitecture.ts");
const { makeKey } = rcRequire("../../src/lib/srs.ts");

const learnable = HANZI_ATLAS.filter((item) => item.sourceCharacter?.id).slice(0, 30);
const learnedSet = new Set(learnable.slice(0, 12).map((item) => item.sourceCharacter.id));
const ctx = { completedLessons: [], learnedSet };
const now = Date.now();

it(cases, "F1 — conjunto nasce do filtro e só com aprendidos", () => {
  const ids = buildAtlasStudySet(learnable, ctx);
  assert.ok(ids.length > 0);
  for (const id of ids) assert.ok(learnedSet.has(id), `${id} não aprendido entrou no treino`);
});

it(cases, "mutação 21 — futuro/não aprendido nunca entra", () => {
  const future = learnable.filter((item) => !canPromoteAtlasItemToReview(item, [], learnedSet));
  assert.ok(future.length > 0);
  assert.deepEqual(buildAtlasStudySet(future, ctx), []);
});

it(cases, "F1 — teto do conjunto", () => {
  const everyone = new Set(HANZI_ATLAS.map((item) => item.sourceCharacter?.id ?? item.id));
  const ids = buildAtlasStudySet(HANZI_ATLAS, { completedLessons: [], learnedSet: everyone });
  assert.ok(ids.length <= ATLAS_STUDY_SET_MAX);
});

it(cases, "P8 — 'fracos' → treinar → Revisão recebe só os Hànzì fracos elegíveis", () => {
  const weakChar = [...learnedSet][0];
  const strongChar = [...learnedSet][1];
  const srs = {
    [makeKey("char", weakChar, "significado")]: { id: makeKey("char", weakChar, "significado"), type: "char", itemId: weakChar, reviewDomain: "significado", ease: 2, intervalDays: 1, due: now + 86400000, reps: 0, lapses: 2, createdAt: now - 1000 },
    [makeKey("char", strongChar, "significado")]: { id: makeKey("char", strongChar, "significado"), type: "char", itemId: strongChar, reviewDomain: "significado", ease: 2.5, intervalDays: 10, due: now + 864000000, reps: 5, lapses: 0, createdAt: now - 1000 },
  };
  const weak = atlasSmartSetItems("weak", HANZI_ATLAS, { ...ctx, favoriteSet: new Set(), srs, now });
  const ids = buildAtlasStudySet(weak, ctx);
  assert.deepEqual(ids, [weakChar]);
  const href = atlasStudySetHref(ids);
  const parsed = parseAtlasStudySet(new URL(`https://x${href}`).searchParams);
  assert.deepEqual(parsed, [weakChar]);
  const allowed = new Set(HANZI_ATLAS.filter((item) => canPromoteAtlasItemToReview(item, [], learnedSet)).map(reviewCharIdForAtlasItem));
  const items = atlasStudySetSrsItems(parsed, srs, allowed, now);
  assert.equal(items.length, 1);
  assert.equal(items[0].itemId, weakChar);
  assert.equal(items[0].id, makeKey("char", weakChar, "significado"), "mesmo SRSItem do srs existente (sem SRS paralelo)");
});

it(cases, "F2 — favoritos só mostra favoritos", () => {
  const fav = learnable[0];
  const items = atlasSmartSetItems("favorites", HANZI_ATLAS, { ...ctx, favoriteSet: new Set([`char:${fav.id}`]), srs: {}, now });
  assert.deepEqual(items.map((item) => item.id), [fav.id]);
});

it(cases, "mutação 21 — URL editada com id não elegível é descartada", () => {
  const allowed = new Set([[...learnedSet][0]]);
  const items = atlasStudySetSrsItems(["nao-existe", [...learnedSet][0]], {}, allowed, now);
  assert.equal(items.length, 1);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateAtlasStudySets(src), []));
expectMutationCaught(cases, "20. Atlas cria segundo SRS", gateAtlasStudySets,
  mutate(src, "atlasStudySet", "export const ATLAS_STUDY_SET_MAX = 20;", "export const ATLAS_STUDY_SET_MAX = 20;\nconst studySetSrs: Record<string, number> = JSON.parse(localStorage.getItem(\"atlas-srs\") ?? \"{}\");"));
expectMutationCaught(cases, "21. treino inclui futuro sem elegibilidade", gateAtlasStudySets,
  mutate(src, "atlasStudySet", "    if (!allowedCharIds.has(charId)) continue;\n", ""));

runCases("test:hanzi-atlas-study-sets", cases);
