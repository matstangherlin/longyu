/**
 * Portão Stripe Test Mode (fluxo real).
 *
 * Sem STRIPE_SECRET_KEY / chaves de teste no ambiente, o script FALHA com
 * instruções — não passa em silêncio. O espelho local continua em
 * `npm run test:subscription-webhook`.
 *
 * Runbook completo: docs/SUBSCRIPTION_E2E_REPORT.md §7
 *
 * Variáveis mínimas em .env.local:
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_PRICE_PRO_MONTHLY=price_...
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   # para confirmar subscriptions após webhook
 */
import process from "node:process";
import { mergedEnv, readEnvFile } from "./lib/env-local.mjs";

const env = {
  ...readEnvFile(".env.production"),
  ...mergedEnv(),
};

const stripeKey = env.STRIPE_SECRET_KEY ?? "";
const priceMonthly = env.STRIPE_PRICE_PRO_MONTHLY ?? "";
const supabaseUrl = env.VITE_SUPABASE_URL ?? "";
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

console.log("== test:stripe (Test Mode E2E) ==");

if (!stripeKey.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY ausente ou não é sk_test_…");
  console.error("Configure Test Mode em .env.local e rode o runbook:");
  console.error("  docs/SUBSCRIPTION_E2E_REPORT.md §7");
  console.error("Enquanto isso, o espelho local cobre A–F:");
  console.error("  npm run test:subscription-webhook");
  process.exit(2);
}

if (!priceMonthly.startsWith("price_")) {
  console.error("STRIPE_PRICE_PRO_MONTHLY ausente.");
  process.exit(2);
}

if (!supabaseUrl || !serviceRole) {
  console.error("VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários para confirmar o webhook.");
  process.exit(2);
}

// Este agente não dispara checkout real automaticamente (exige browser + cartão).
// Quando as chaves estão presentes, validamos a API Stripe e a função remota.
const stripeRes = await fetch("https://api.stripe.com/v1/prices/" + priceMonthly, {
  headers: { Authorization: `Bearer ${stripeKey}` },
});
if (!stripeRes.ok) {
  const body = await stripeRes.text();
  console.error("Falha ao ler price no Stripe Test Mode:", stripeRes.status, body.slice(0, 200));
  process.exit(1);
}
const price = await stripeRes.json();
console.log(`ok: price ${price.id} ativo=${price.active} currency=${price.currency}`);

const webhookProbe = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/stripe-webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
const webhookBody = await webhookProbe.text();
if (webhookProbe.status === 501) {
  console.error("stripe-webhook retornou 501 — secrets Stripe ausentes no Supabase.");
  process.exit(1);
}
if (webhookProbe.status !== 400) {
  console.error(`stripe-webhook status inesperado: ${webhookProbe.status} ${webhookBody.slice(0, 160)}`);
  process.exit(1);
}
console.log("ok: stripe-webhook responde (400 sem assinatura = secrets presentes)");

console.log("\nParcial OK: API Stripe Test Mode + webhook remoto respondem.");
console.log("Ainda falta o runbook manual completo (checkout → Pro → cancel → ordem):");
console.log("  docs/SUBSCRIPTION_E2E_REPORT.md §7");
console.log("Marque o gate como completo só depois do runbook humano.");
process.exit(0);
