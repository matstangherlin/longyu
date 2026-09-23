/**
 * RC2.2.8 — test:pearl-cosmetics
 *
 * H: cosmético real, comprado com Pérola pelo ledger idempotente, equipável,
 * sem nunca comprar progresso. Mutações 16–19. A compra ponta a ponta (Loja →
 * Perfil → reload) é o E2E rc2-2-8-learning-gamification (P7).
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gatePearlShop, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const { SHOP_ITEMS, shopItemLifetime } = rcRequire("../../src/data/shop.ts");
const { PROFILE_COSMETICS, equipAfterPurchase, resolveEquippedCosmetic } = rcRequire("../../src/data/profileCosmetics.ts");
const { applyPearlSpend } = rcRequire("../../src/lib/pearlEconomy.ts");
const { PEARL_PRICES } = rcRequire("../../src/data/economy.ts");

it(cases, "H2 — shop-pearl-cosmetic deixou de ser placeholder (é a Moldura de Jade)", () => {
  const jade = SHOP_ITEMS.find((item) => item.id === "shop-pearl-cosmetic");
  assert.ok(jade, "item continua existindo (quem comprou não perde)");
  assert.match(jade.name, /Moldura de Jade/);
  assert.doesNotMatch(`${jade.name} ${jade.desc}`, /em breve|soon/i);
});

it(cases, "H3 — pelo menos Moldura de Jade, Moldura Dourada e um Título", () => {
  const slots = PROFILE_COSMETICS.map((cosmetic) => cosmetic.slot);
  assert.ok(PROFILE_COSMETICS.length >= 3);
  assert.ok(slots.filter((slot) => slot === "frame").length >= 2);
  assert.ok(slots.includes("title"));
});

it(cases, "H — todo cosmético é Pérola, 2–6, permanente e com efeito visível", () => {
  for (const cosmetic of PROFILE_COSMETICS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === cosmetic.id);
    assert.equal(item.currency, "pearl", cosmetic.id);
    assert.ok(item.cost >= PEARL_PRICES.cosmeticMin && item.cost <= PEARL_PRICES.cosmeticMax, cosmetic.id);
    assert.equal(shopItemLifetime(item), "permanent");
    assert.ok(cosmetic.className.trim().length > 0, `mutação 19: ${cosmetic.id} sem efeito visual`);
  }
});

it(cases, "H — nenhum cosmético de Qi 'em breve' continua à venda", () => {
  for (const item of SHOP_ITEMS) assert.doesNotMatch(`${item.name} ${item.desc}`, /em breve/i, item.id);
});

it(cases, "H6 — cada item diz se é consumível, temporário ou permanente", () => {
  for (const item of SHOP_ITEMS) assert.ok(["consumable", "timed", "permanent", "link"].includes(shopItemLifetime(item)), item.id);
  assert.equal(shopItemLifetime(SHOP_ITEMS.find((i) => i.id === "shop-pearl-focus-48")), "timed");
  assert.equal(shopItemLifetime(SHOP_ITEMS.find((i) => i.id === "shop-pearl-charge")), "consumable");
});

it(cases, "H1 mutação 16/17 — Pérola não compra progresso nem selo", () => {
  const allowed = new Set(["charge", "focus_pass", "focus_pass_48h", "shield", "cosmetic", "qi_pack", "pearl_pro_pass"]);
  for (const item of SHOP_ITEMS.filter((candidate) => candidate.currency === "pearl")) {
    assert.ok(allowed.has(item.kind), `${item.id} (${item.kind}) não é conveniência/cosmético`);
    assert.doesNotMatch(item.id, /lesson|star|seal|selo|medal|mastery|placement/i, item.id);
  }
});

it(cases, "P7/H7 — Pérola debita UMA vez por cosmético (ledger idempotente)", () => {
  const state = { dragonPearls: 10, pearlLedger: [] };
  const first = applyPearlSpend(state, { amount: 4, source: "Cosmético", idempotencyKey: "cosmetic:shop-pearl-cosmetic" });
  assert.equal(first.dragonPearls, 6);
  const second = applyPearlSpend({ ...state, ...first }, { amount: 4, source: "Cosmético", idempotencyKey: "cosmetic:shop-pearl-cosmetic" });
  assert.equal(second, null, "segunda compra do mesmo cosmético não debita");
});

it(cases, "H4.2 — comprar não troca o que já está equipado", () => {
  assert.equal(equipAfterPurchase(null, "shop-pearl-cosmetic"), "shop-pearl-cosmetic");
  assert.equal(equipAfterPurchase("shop-pearl-frame-gold", "shop-pearl-cosmetic"), "shop-pearl-frame-gold");
});

it(cases, "H5 — só equipa o que possui e no slot certo", () => {
  assert.equal(resolveEquippedCosmetic("shop-pearl-cosmetic", "frame", []), null);
  assert.equal(resolveEquippedCosmetic("shop-pearl-cosmetic", "frame", ["shop-pearl-cosmetic"]), "shop-pearl-cosmetic");
  assert.equal(resolveEquippedCosmetic("shop-pearl-cosmetic", "title", ["shop-pearl-cosmetic"]), null);
  assert.equal(resolveEquippedCosmetic("inexistente", "frame", ["inexistente"]), null);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gatePearlShop(src), []));
expectMutationCaught(cases, "16. Pérola compra progresso acadêmico", gatePearlShop,
  mutate(src, "store", "const ownedCosmetics = [...(s.ownedCosmetics ?? []), item.id];", "const ownedCosmetics = [...(s.ownedCosmetics ?? []), item.id];\n            const completedLessons = [...s.completedLessons, \"l9\"];"));
expectMutationCaught(cases, "17. Pérola compra Selo Cultural", gatePearlShop,
  mutate(src, "store", "const ownedCosmetics = [...(s.ownedCosmetics ?? []), item.id];", "const ownedCosmetics = [...(s.ownedCosmetics ?? []), item.id];\n            const cultureSeals = [...s.cultureSeals, \"festivals\"];"));
expectMutationCaught(cases, "18. cosmético ainda diz 'em breve'", gatePearlShop,
  mutate(src, "shop", "desc: cosmetic.effectPt,", 'desc: "Visual raro do dragão. Em breve.",'));
expectMutationCaught(cases, "19. compra sem efeito visível", gatePearlShop,
  mutate(src, "profilePage", "const frameClass = useProfileFrameClass();", "const frameClass = \"\";"));
expectMutationCaught(cases, "H7. cosmético fora do ledger", gatePearlShop,
  mutate(src, "store", "idempotencyKey: `cosmetic:${item.id}`,", "idempotencyKey: `cosmetic:${Date.now()}`,"));

runCases("test:pearl-cosmetics", cases);
