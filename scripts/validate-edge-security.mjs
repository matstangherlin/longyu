/** Validação estática de segurança das Edge Functions. */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    errors.push(`Falta arquivo: ${rel}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

const shared = read("supabase/functions/_shared/security.ts");
const checkout = read("supabase/functions/create-checkout-session/index.ts");
const portal = read("supabase/functions/create-billing-portal/index.ts");
const webhook = read("supabase/functions/stripe-webhook/index.ts");
const deleteAccount = read("supabase/functions/delete-account/index.ts");
const migration = read("supabase/migrations/007_stripe_webhook_guard.sql");
const config = read("supabase/config.toml");

if (shared) {
  if (!/checkRateLimit/.test(shared)) errors.push("_shared sem rate limit");
  if (!/resolveAllowedOrigin/.test(shared)) errors.push("_shared sem whitelist de origem");
  if (!/getWhitelistedPriceId/.test(shared)) errors.push("_shared sem whitelist de price_id");
}

if (checkout) {
  if (!/getUser\(\)/.test(checkout)) errors.push("checkout sem validação JWT");
  if (/body\.user_id|payload\.user_id/.test(checkout)) errors.push("checkout confia em user_id do body");
  if (!/getWhitelistedPriceId/.test(checkout)) errors.push("checkout sem whitelist de plano");
  if (!/checkRateLimit/.test(checkout)) errors.push("checkout sem rate limit");
  if (!/buildReturnUrl/.test(checkout)) errors.push("checkout sem URLs permitidas");
}

if (portal) {
  if (!/getUser\(\)/.test(portal)) errors.push("portal sem validação JWT");
  if (!/eq\("user_id", user\.id\)/.test(portal)) errors.push("portal não filtra por user.id do JWT");
  if (!/checkRateLimit/.test(portal)) errors.push("portal sem rate limit");
}

if (deleteAccount) {
  if (!/getUser\(\)/.test(deleteAccount)) errors.push("delete-account sem validação JWT");
  if (!/const userId = user\.id/.test(deleteAccount)) errors.push("delete-account não usa user.id do JWT");
  if (!/checkRateLimit/.test(deleteAccount)) errors.push("delete-account sem rate limit");
}

if (webhook) {
  if (!/stripe_webhook_events/.test(webhook)) errors.push("webhook sem idempotência stripe_webhook_events");
  if (!/constructEvent/.test(webhook)) errors.push("webhook sem validação de assinatura Stripe");
  if (!/last_stripe_event_created/.test(webhook)) errors.push("webhook sem proteção de ordem de eventos");
}

if (migration) {
  if (!/stripe_webhook_events/.test(migration)) errors.push("migration 007 sem stripe_webhook_events");
  if (!/last_stripe_event_created/.test(migration)) errors.push("migration 007 sem last_stripe_event_created");
}

if (config) {
  if (!/\[functions\.stripe-webhook\][\s\S]*verify_jwt = false/.test(config)) {
    errors.push("config.toml: stripe-webhook deve ter verify_jwt=false");
  }
  if (!/\[functions\.create-checkout-session\]/.test(config)) {
    // default verify_jwt true — ok if not explicitly set
  }
}

const gate = read("scripts/gate-production.mjs");
if (gate && !/test:rls/.test(gate)) errors.push("gate:production sem test:rls");
if (gate && !/test:stripe/.test(gate)) errors.push("gate:production sem test:stripe");

if (errors.length > 0) {
  console.error("ERRO: validate:edge-security falhou:");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("OK: validate:edge-security passou.");
