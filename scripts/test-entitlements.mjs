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

// ——— Espelho da lógica pura (testável sem Vite) ———
function resolveAppEnvironment(env = process.env) {
  if (env.NODE_ENV === "development" || env.DEV === "true") return "development";
  const raw = String(env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (raw === "preview" || raw === "deploy_preview" || raw === "staging") return "preview";
  if (raw === "development" || raw === "dev") return "development";
  return "production_beta";
}

function isDevPreviewAllowed(env = process.env) {
  const appEnv = resolveAppEnvironment(env);
  if (appEnv === "production_beta") return false;
  if (appEnv === "development") return true;
  return env.VITE_ALLOW_PRO_PREVIEW === "true";
}

function hasActivePearlPro(expiresAt, now = Date.now()) {
  return typeof expiresAt === "number" && expiresAt > now;
}

function effectivePremium(isPreview, serverIsPro, env = process.env, options = {}) {
  if (options.accountAuthMode === "cloud") return serverIsPro === true;
  if (serverIsPro === true) return true;
  if (hasActivePearlPro(options.pearlProExpiresAt, options.now)) return true;
  if (isPreview && isDevPreviewAllowed(env)) return true;
  return false;
}

const INACTIVE_STATUSES = new Set(["past_due", "unpaid", "incomplete", "incomplete_expired"]);
const ACTIVE_STATUSES = new Set(["trialing", "active"]);

function resolveServerSubscriptionRow(input, now = Date.now()) {
  const status = input.status ?? "";
  const periodEnd = input.current_period_end ? Date.parse(input.current_period_end) : undefined;
  const stillValid = !periodEnd || periodEnd > now;
  const base = { planName: "Longyu Pro", currentPeriodEnd: periodEnd, nextBillingAt: periodEnd };

  if (INACTIVE_STATUSES.has(status)) return { ...base, state: "real_expired" };
  if (status === "trialing") return stillValid ? { ...base, state: "real_trialing" } : { ...base, state: "real_expired" };
  if (status === "active" && stillValid) return { ...base, state: "real_active" };
  if ((status === "canceled" || input.cancel_at_period_end) && stillValid) return { ...base, state: "real_canceling" };
  if (ACTIVE_STATUSES.has(status) && stillValid) return { ...base, state: "real_active" };
  if (status === "canceled") return { ...base, state: stillValid ? "real_canceling" : "real_expired" };
  return { ...base, state: "real_expired" };
}

function subscriptionGrantsPro(snapshot) {
  if (!snapshot) return false;
  return ["real_trialing", "real_active", "real_canceling"].includes(snapshot.state);
}

function reconcileFreePlanEnergy(energy, date = "2026-07-11") {
  const FREE = 5;
  const current = energy?.date === date ? energy : { date, charges: FREE, maxCharges: FREE, usedCharges: 0, bonusChargesClaimed: {} };
  const prefix = `story-energy:${date}:`;
  const bonus = Object.keys(current.bonusChargesClaimed ?? {}).filter(
    (key) => key.startsWith(prefix) && current.bonusChargesClaimed[key]
  ).length;
  const maxCharges = FREE + bonus;
  return {
    date,
    maxCharges,
    charges: Math.min(maxCharges, Math.max(0, current.charges ?? maxCharges)),
    usedCharges: Math.max(0, current.usedCharges ?? 0),
    bonusChargesClaimed: current.bonusChargesClaimed ?? {},
  };
}

// ——— Artefatos ———
const entitlementsSrc = read("src/lib/entitlements.ts");
assert(entitlementsSrc.includes("isDevPreviewAllowed"), "entitlements.ts sem isDevPreviewAllowed");
assert(entitlementsSrc.includes("isProPreviewBuildAllowed"), "entitlements.ts deve usar isProPreviewBuildAllowed");
assert(entitlementsSrc.includes('options?.accountAuthMode === "cloud"'), "effectivePremium deve isolar conta cloud");
assert(entitlementsSrc.includes("return serverIsPro === true"), "cloud deve depender exclusivamente de serverIsPro");

const appEnvSrc = read("src/lib/appEnvironment.ts");
assert(appEnvSrc.includes("VITE_ALLOW_PRO_PREVIEW"), "appEnvironment deve checar VITE_ALLOW_PRO_PREVIEW");
assert(appEnvSrc.includes("production_beta"), "appEnvironment deve definir production_beta");

const storeSrc = read("src/lib/store.ts");
assert(storeSrc.includes("version: 19"), "Persist deve estar na versão 19 (Mastery Loop + entitlement cloud efêmero)");
assert(
  storeSrc.includes("partialize: (state) => ({ ...state, serverIsPro: false })"),
  "serverIsPro não pode ser hidratado do navegador"
);
assert(storeSrc.includes("moduleSkipUsage"), "Store deve persistir moduleSkipUsage");
assert(storeSrc.includes("reconcileFreePlanEnergy"), "Store deve reconciliar energia ao sair do Pro");
assert(storeSrc.includes("effectivePremium"), "hasProAccess deve usar effectivePremium");
assert(storeSrc.includes("pearlProExpiresAt"), "Store deve persistir pearlProExpiresAt");
assert(
  storeSrc.includes("stripAccountPreview"),
  "migração deve reconciliar a energia das contas guardadas (sem teto inflado sobrevivendo)"
);
assert(entitlementsSrc.includes("pearl_pass") || entitlementsSrc.includes("pearlProExpiresAt"), "entitlements deve considerar pass de Pérolas");

const accessTierSrc = read("src/lib/accessTier.ts");
assert(accessTierSrc.includes('type AccessTier = "free" | "pro" | "business" | "enterprise"'), "AccessTier deve incluir business e enterprise");
assert(accessTierSrc.includes("premiumAccessFromTier"), "premiumAccessFromTier deve existir");
assert(accessTierSrc.includes("individual_subscription"), "source individual_subscription");
assert(accessTierSrc.includes("organization"), "source organization");

function premiumAccessFromTier(tier) {
  return tier === "pro" || tier === "business" || tier === "enterprise";
}
assert(premiumAccessFromTier("business"), "Business concede premiumAccess");
assert(premiumAccessFromTier("enterprise"), "Enterprise concede premiumAccess");
assert(!premiumAccessFromTier("free"), "free não concede premiumAccess");

const entitlementServiceSrc = read("src/services/entitlementService.ts");
assert(entitlementServiceSrc.includes("resolveServerSubscriptionRow"), "entitlementService deve expor resolveServerSubscriptionRow");
assert(entitlementServiceSrc.includes("real_trialing"), "entitlementService deve tratar trial");
assert(entitlementServiceSrc.includes("real_canceling"), "entitlementService deve tratar cancelamento com período futuro");

// ——— Casos de entitlement ———
const prodEnv = {
  NODE_ENV: "production",
  VITE_APP_ENV: "production_beta",
  VITE_ALLOW_PRO_PREVIEW: "true", // flag vazada não deve liberar Pro no ambiente principal
};

// Preview antigo no localStorage não libera Pro em Production Beta
assert(!effectivePremium(true, false, prodEnv), "Preview persistido não deve liberar Pro em Production Beta");
assert(!isDevPreviewAllowed(prodEnv), "isDevPreviewAllowed deve ser false em production_beta");

// serverIsPro false derruba Pro
assert(!effectivePremium(true, false, prodEnv), "serverIsPro false deve derrubar preview em produção");
assert(!effectivePremium(false, false, prodEnv), "Sem servidor nem preview = grátis");

// serverIsPro true libera Pro (assinatura real)
assert(effectivePremium(false, true, prodEnv), "serverIsPro true deve liberar Pro");
assert(effectivePremium(true, true, prodEnv), "serverIsPro true prevalece sobre preview");

// Pass de Pérolas ativo libera Pro sem Stripe
assert(
  effectivePremium(false, false, prodEnv, { accountAuthMode: "local", pearlProExpiresAt: Date.now() + 60_000 }),
  "Pass de Pérolas ativo deve liberar Pro local"
);
assert(
  !effectivePremium(false, false, prodEnv, { pearlProExpiresAt: Date.now() - 60_000 }),
  "Pass de Pérolas expirado não libera Pro"
);

// Conta cloud nunca aceita expiração/preview/e-mail persistidos como autoridade.
assert(
  !effectivePremium(true, false, { NODE_ENV: "development", VITE_APP_ENV: "development" }, {
    accountAuthMode: "cloud",
    accountEmail: "teste@longyu.app",
    pearlProExpiresAt: Date.now() + 60_000,
  }),
  "Cloud não deve liberar Pro com preview, e-mail ou expiração local"
);
assert(
  effectivePremium(false, true, prodEnv, {
    accountAuthMode: "cloud",
    accountEmail: "aluno@example.com",
  }),
  "Cloud deve liberar Pro somente quando serverIsPro confirma"
);

// Preview só em Development, ou Preview com flag
const devEnv = { NODE_ENV: "development", VITE_APP_ENV: "development" };
const previewFlagEnv = {
  NODE_ENV: "production",
  VITE_APP_ENV: "preview",
  VITE_ALLOW_PRO_PREVIEW: "true",
};
const previewNoFlagEnv = {
  NODE_ENV: "production",
  VITE_APP_ENV: "preview",
  VITE_ALLOW_PRO_PREVIEW: "false",
};
assert(effectivePremium(true, false, devEnv), "Preview permitido em Development");
assert(effectivePremium(true, false, previewFlagEnv), "Preview permitido em Preview com flag");
assert(!effectivePremium(true, false, previewNoFlagEnv), "Preview bloqueado em Preview sem flag");
assert(!effectivePremium(true, false, prodEnv), "Preview bloqueado em Production Beta mesmo com flag");

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

// Trial ativo com período futuro = Pro
const trialing = resolveServerSubscriptionRow({ status: "trialing", current_period_end: future });
assert(subscriptionGrantsPro(trialing), "Trial com período futuro deve conceder Pro");

// Trial expirado sem pagamento = grátis
const trialingExpired = resolveServerSubscriptionRow(
  { status: "trialing", current_period_end: past },
  Date.now()
);
assert(!subscriptionGrantsPro(trialingExpired), "Trial expirado não deve continuar Pro");

// active + período futuro = Pro
const active = resolveServerSubscriptionRow({ status: "active", current_period_end: future });
assert(subscriptionGrantsPro(active), "Assinatura ativa deve conceder Pro");

// Cancelar plano mantém Pro só até current_period_end
const canceling = resolveServerSubscriptionRow({
  status: "canceled",
  current_period_end: future,
  cancel_at_period_end: true,
});
assert(subscriptionGrantsPro(canceling), "Cancelado com período futuro ainda é Pro");

const canceledExpired = resolveServerSubscriptionRow(
  { status: "canceled", current_period_end: past, cancel_at_period_end: true },
  Date.now()
);
assert(!subscriptionGrantsPro(canceledExpired), "Cancelado vencido não é Pro");

// past_due / unpaid = grátis
const pastDue = resolveServerSubscriptionRow({ status: "past_due", current_period_end: future });
assert(!subscriptionGrantsPro(pastDue), "past_due não deve conceder Pro");

const unpaid = resolveServerSubscriptionRow({ status: "unpaid", current_period_end: future });
assert(!subscriptionGrantsPro(unpaid), "unpaid não deve conceder Pro");

// Reconciliar energia ao sair do Pro
const proInflated = {
  date: "2026-07-11",
  charges: 999,
  maxCharges: 999,
  usedCharges: 0,
  bonusChargesClaimed: {
    "story-energy:2026-07-11:primeiro-encontro": true,
    "story-energy:2026-07-11:segunda-historia": true,
  },
};
const normalized = reconcileFreePlanEnergy(proInflated);
assert(normalized.maxCharges === 7, `maxCharges deve ser 5+2 bônus, obteve ${normalized.maxCharges}`);
assert(normalized.charges === 7, "charges não podem exceder maxCharges legítimo");
assert(normalized.charges < 999, "cargas infinitas devem ser removidas");

if (errors.length > 0) {
  console.error("ERRO: test:entitlements falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: test:entitlements passou.");
