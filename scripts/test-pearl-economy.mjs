/**
 * TEST-025 — Economia de Pérolas / Pro temporário / ads (lógica pura).
 * Espelha pearlPro.ts + pearlEconomy.ts sem Vite.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const PEARL_PRO_COST = 12;
const PEARL_PRO_PASS_DAYS = 7;
const PEARL_PRO_COOLDOWN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function hasActivePearlPro(expiresAt, now = Date.now()) {
  return typeof expiresAt === "number" && expiresAt > now;
}

function shouldShowAds(ctx) {
  if (ctx.serverIsPro === true) return false;
  if (hasActivePearlPro(ctx.pearlProExpiresAt, ctx.now)) return false;
  if (ctx.accountAuthMode === "cloud" && ctx.accountEmail === "teste@longyu.app") return false;
  if (ctx.isPremiumPreview && ctx.devPreview) return false;
  return true;
}

function canActivatePearlPro(input) {
  const now = input.now ?? Date.now();
  const { state } = input;
  if (input.requireAuto && !state.pearlProAutoActivate) {
    return { allowed: false, reason: "auto_disabled" };
  }
  if (state.dragonPearls < PEARL_PRO_COST) {
    return { allowed: false, reason: "insufficient_pearls" };
  }
  if (input.serverIsPro === true) {
    return { allowed: false, reason: "paid_subscription" };
  }
  if (hasActivePearlPro(state.pearlProExpiresAt, now)) {
    return { allowed: false, reason: "pass_active" };
  }
  if (state.pearlProLastActivatedAt) {
    const cooldownMs = PEARL_PRO_COOLDOWN_DAYS * DAY_MS;
    if (now - state.pearlProLastActivatedAt < cooldownMs) {
      return { allowed: false, reason: "cooldown" };
    }
  }
  if (input.authMode === "cloud" && !input.online) {
    return { allowed: false, reason: "offline_cloud" };
  }
  return { allowed: true };
}

function applyActivate(state, now = Date.now()) {
  const decision = canActivatePearlPro({ state, serverIsPro: false, authMode: "local", online: true, now });
  if (!decision.allowed) return { ok: false, reason: decision.reason, state };
  return {
    ok: true,
    state: {
      ...state,
      dragonPearls: state.dragonPearls - PEARL_PRO_COST,
      pearlProExpiresAt: now + PEARL_PRO_PASS_DAYS * DAY_MS,
      pearlProLastActivatedAt: now,
      pearlProPendingOffline: false,
    },
  };
}

function claimMilestone(claimed, milestoneId, pearls, balance) {
  if (claimed[milestoneId]) return { claimed, dragonPearls: balance, granted: false };
  return {
    claimed: { ...claimed, [milestoneId]: Date.now() },
    dragonPearls: balance + pearls,
    granted: true,
  };
}

// ——— Artefatos ———
const economySrc = read("src/data/economy.ts");
assert(economySrc.includes("PEARL_PRICES"), "economy.ts deve exportar PEARL_PRICES");
assert(economySrc.includes("proPass7d: 12"), "12 Pérolas → Pro");
assert(economySrc.includes("qiPack: 3") || economySrc.includes("qiPackPearls: 3"), "3 Pérolas → Qi pack");
assert(economySrc.includes('id: "streak:7"'), "marco ofensiva 7 dias");
assert(economySrc.includes('id: "streak:365"'), "marco ofensiva 365 dias");

const pearlProSrc = read("src/lib/pearlPro.ts");
assert(pearlProSrc.includes("shouldShowAds"), "pearlPro deve exportar shouldShowAds");
assert(pearlProSrc.includes("canActivatePearlPro"), "pearlPro deve exportar canActivatePearlPro");
assert(pearlProSrc.includes("paid_subscription"), "nunca gastar Pérolas com Stripe ativo");

const pearlEconSrc = read("src/lib/pearlEconomy.ts");
assert(pearlEconSrc.includes("ADS_FORBIDDEN_CONTEXTS"), "infra de ads forbidden");
assert(pearlEconSrc.includes("during_question"), "ads nunca durante questão");
assert(pearlEconSrc.includes("PearlLedgerEntry"), "ledger de Pérolas");

const storeSrc = read("src/lib/store.ts");
assert(storeSrc.includes("pearlMilestonesClaimed"), "store deve ter pearlMilestonesClaimed");
assert(storeSrc.includes("pearlProExpiresAt"), "store deve ter pearlProExpiresAt");
assert(storeSrc.includes("activatePearlProPass"), "store deve ativar pass Pro");
assert(storeSrc.includes("version: 17"), "persist v17 para migração de Pérolas");
assert(storeSrc.includes("pearlProExpiresAt: s.pearlProExpiresAt"), "hasProAccess deve passar pearlProExpiresAt");

const shopSrc = read("src/data/shop.ts");
assert(shopSrc.includes('"perolas"'), "loja separa categoria Pérolas");
assert(shopSrc.includes("pearl_pro_pass"), "item Pro 7 dias na loja");
assert(shopSrc.includes("focus_pass_48h"), "sink 48h na loja");

const migration = read("supabase/migrations/20260813180000_pearl_pro_economy.sql");
assert(migration.includes("activate_pearl_pro_pass"), "RPC activate_pearl_pro_pass");
assert(migration.includes("claim_pearl_milestone"), "RPC claim_pearl_milestone");
assert(migration.includes("pearl_pro_pass"), "source entitlement pearl_pro_pass");

const lojaSrc = read("src/features/loja/LojaPage.tsx");
assert(lojaSrc.includes("Próximas Pérolas"), "Loja mostra próximas Pérolas");
assert(lojaSrc.includes("Pérolas de Jade"), "Loja mostra progresso de Pérolas");
assert(lojaSrc.includes("PurchaseFeedbackModal") || lojaSrc.includes("Compra confirmada"), "feedback de compra");

const lessonSrc = read("src/features/lesson/LessonPlayer.tsx");
assert(!lessonSrc.includes("daily-streak:${today.date}:pearl"), "não farmar pérola diária de ofensiva");
assert(lessonSrc.includes("maybeClaimPearlMilestonesFromProgress"), "lição usa marcos únicos");

// ——— Casos ———
const base = {
  dragonPearls: 11,
  pearlProExpiresAt: null,
  pearlProLastActivatedAt: null,
  pearlProAutoActivate: true,
  pearlProPendingOffline: false,
};

// 11 → insuficiente
assert(
  canActivatePearlPro({ state: base, serverIsPro: false, authMode: "local", online: true }).reason ===
    "insufficient_pearls",
  "11 Pérolas não ativam Pro"
);

// 12 → ativa, debita 12, 7 dias, ads off
{
  const now = Date.parse("2026-08-13T12:00:00Z");
  const result = applyActivate({ ...base, dragonPearls: 12 }, now);
  assert(result.ok, "12 Pérolas devem ativar");
  assert(result.state.dragonPearls === 0, "débito exato de 12");
  assert(result.state.pearlProExpiresAt === now + 7 * DAY_MS, "entitlement 7 dias");
  assert(
    !shouldShowAds({ serverIsPro: false, pearlProExpiresAt: result.state.pearlProExpiresAt, now }),
    "ads desligados com pass ativo"
  );
}

// Expiração
{
  const now = Date.parse("2026-08-13T12:00:00Z");
  const expired = now - 1000;
  assert(shouldShowAds({ serverIsPro: false, pearlProExpiresAt: expired, now }), "ads voltam após expirar");
  assert(!hasActivePearlPro(expired, now), "pass expirado não é ativo");
}

// Stripe Pro nunca perde Pérolas
assert(
  canActivatePearlPro({
    state: { ...base, dragonPearls: 20 },
    serverIsPro: true,
    authMode: "cloud",
    online: true,
    requireAuto: true,
  }).reason === "paid_subscription",
  "assinante pago não auto-gasta Pérolas"
);

// Pass ativo não acumula
{
  const now = Date.now();
  assert(
    canActivatePearlPro({
      state: {
        ...base,
        dragonPearls: 24,
        pearlProExpiresAt: now + DAY_MS,
        pearlProLastActivatedAt: now,
      },
      serverIsPro: false,
      authMode: "local",
      online: true,
    }).reason === "pass_active",
    "pass ativo não acumula outro"
  );
}

// Cooldown 30 dias
{
  const now = Date.now();
  assert(
    canActivatePearlPro({
      state: {
        ...base,
        dragonPearls: 12,
        pearlProExpiresAt: null,
        pearlProLastActivatedAt: now - 10 * DAY_MS,
      },
      serverIsPro: false,
      authMode: "local",
      online: true,
    }).reason === "cooldown",
    "cooldown de 30 dias"
  );
}

// Offline cloud
assert(
  canActivatePearlPro({
    state: { ...base, dragonPearls: 12 },
    serverIsPro: false,
    authMode: "cloud",
    online: false,
  }).reason === "offline_cloud",
  "cloud offline não fabrica Pro"
);

// Duas recompensas / mesmo milestone
{
  let claimed = {};
  let pearls = 0;
  const first = claimMilestone(claimed, "streak:7", 1, pearls);
  claimed = first.claimed;
  pearls = first.dragonPearls;
  const second = claimMilestone(claimed, "streak:7", 1, pearls);
  assert(first.granted && !second.granted, "mesmo milestone não paga duas vezes");
  assert(pearls === 1 && second.dragonPearls === 1, "saldo não dobra no replay");
}

// Duas abas / auto: segunda ativação bloqueada (pass_active ou cooldown)
{
  const now = Date.now();
  const first = applyActivate({ ...base, dragonPearls: 24 }, now);
  const second = applyActivate(first.state, now + 1000);
  assert(first.ok && !second.ok, "segunda aba não ativa de novo");
  assert(first.state.dragonPearls === 12, "só debita 12 na primeira ativação");
}

if (errors.length > 0) {
  console.error("ERRO: test:pearl-economy falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: test:pearl-economy passou.");
