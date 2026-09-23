/**
 * RC2.2.8 — test:culture-guide-voice
 *
 * Runtime: quando o dragão fala na Cultura (e quando fica quieto) e quando o
 * reveal de selo aparece. Mutações 1–3 contra o gate de voz.
 */
import assert from "node:assert/strict";
import {
  expectMutationCaught,
  gateCultureGuideVoice,
  it,
  mutate,
  rcRequire,
  readSources,
  runCases,
} from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const { pickCultureGuideMessage, CULTURE_GUIDE_INTRO_KEY } = rcRequire("../../src/lib/cultureGuide.ts");
const { pendingCultureSealReveals, markCultureSealRevealed } = rcRequire("../../src/lib/profileShowcase.ts");
const { cultureItemsInCollection } = rcRequire("../../src/data/cultureCollections.ts");

const fresh = { cultureCompletedIds: [], cultureMasteryById: {}, cultureSeals: [], completedLessons: [] };

it(cases, "A2 — primeira visita: o dragão se apresenta", () => {
  const message = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set() });
  assert.equal(message?.kind, "intro");
});

it(cases, "A2 — intro ouvida: próxima fala é a missão recomendada do marco", () => {
  const message = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set([CULTURE_GUIDE_INTRO_KEY]) });
  assert.equal(message?.kind, "gate_mission");
  assert.ok(message.itemId, "missão recomendada aponta um CultureItem");
});

it(cases, "A2 — nada novo: o dragão NÃO fala", () => {
  const first = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set([CULTURE_GUIDE_INTRO_KEY]) });
  const message = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set([CULTURE_GUIDE_INTRO_KEY, first.key]) });
  assert.equal(message, null);
});

it(cases, "A2 — coleção concluída ganha fala própria, uma vez", () => {
  const ids = cultureItemsInCollection("legends_literature").map((item) => item.id);
  const progress = { ...fresh, cultureCompletedIds: ids };
  const message = pickCultureGuideMessage({ progress, seenKeys: new Set([CULTURE_GUIDE_INTRO_KEY]) });
  assert.equal(message?.kind, "collection_done");
  const again = pickCultureGuideMessage({ progress, seenKeys: new Set([CULTURE_GUIDE_INTRO_KEY, message.key]) });
  assert.notEqual(again?.key, message.key);
});

it(cases, "A2.1 — a decisão não depende de filtro (mesma entrada → mesma fala)", () => {
  const a = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set() });
  const b = pickCultureGuideMessage({ progress: fresh, seenKeys: new Set() });
  assert.deepEqual(a, b);
});

it(cases, "A4.3 — conta antiga (campo ausente): selos antigos não viram enxurrada de reveals", () => {
  assert.deepEqual(pendingCultureSealReveals(["social-etiquette", "festivals"], undefined), []);
});

it(cases, "A4.1 — selo novo gera exatamente um reveal", () => {
  assert.deepEqual(pendingCultureSealReveals(["social-etiquette"], []), ["social-etiquette"]);
});

it(cases, "A4.2 — idempotente: marcar duas vezes não duplica, e o reveal some", () => {
  const once = markCultureSealRevealed([], ["social-etiquette"], "social-etiquette");
  const twice = markCultureSealRevealed(once, ["social-etiquette"], "social-etiquette");
  assert.deepEqual(twice, ["social-etiquette"]);
  assert.deepEqual(pendingCultureSealReveals(["social-etiquette"], twice), []);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateCultureGuideVoice(src), []));

expectMutationCaught(cases, "1. dragão da Cultura com motor de som novo", gateCultureGuideVoice,
  mutate(src, "sealReveal", 'import { playSoundFx } from "../../lib/soundFx";', 'import { playSoundFx } from "../../lib/soundFx";\nconst ctx = new AudioContext();'));
expectMutationCaught(cases, "2. GuideDialogue sem text blip", gateCultureGuideVoice,
  mutate(src, "guideDialogue", "if (blipPlan.has(revealIndex)) guideTextBlip(revealIndex);", "void revealIndex;"));
expectMutationCaught(cases, "3. antecipar texto não corta o som", gateCultureGuideVoice,
  mutate(src, "guideDialogue", "if (wasTyping) stopGuideTextVoice();", "void wasTyping;"));
expectMutationCaught(cases, "A1. CultureDialogue paralelo", gateCultureGuideVoice,
  mutate(src, "cultureHub", "<GuideDialogue", "<CultureDialogue"));

runCases("test:culture-guide-voice", cases);
