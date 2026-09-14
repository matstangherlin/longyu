import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";
import { STRIPE_PRICE_SLOTS } from "./lib/stripe-price-slots.mjs";

const root = projectRoot();
const env = mergedEnv();

const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

/**
 * Os oito slots, nomeados.
 *
 * A versao anterior recebia dois price ids posicionais e gravava
 * STRIPE_PRICE_PRO_MONTHLY / _ANNUAL. Esses nomes nao sao lidos por ninguem
 * desde que o catalogo passou a ter plano x mercado x ciclo: a Edge Function
 * monta STRIPE_PRICE_<PLANO>_<CICLO>_<MERCADO>. Rodar o script antigo deixava
 * todo checkout devolvendo PRICE_PENDING, em silencio.
 */
const assignments = new Map();
const unknown = [];
for (const argument of process.argv.slice(2)) {
  const [rawSlot, ...rest] = argument.split("=");
  const priceId = rest.join("=");
  const slot = rawSlot.toUpperCase().startsWith("STRIPE_PRICE_")
    ? rawSlot.toUpperCase()
    : `STRIPE_PRICE_${rawSlot.toUpperCase()}`;
  if (!STRIPE_PRICE_SLOTS.includes(slot)) unknown.push(rawSlot);
  else if (priceId) assignments.set(slot, priceId);
}

if (unknown.length > 0) {
  console.error(`Slot desconhecido: ${unknown.join(", ")}`);
  console.error(`Slots validos:\n  ${STRIPE_PRICE_SLOTS.join("\n  ")}`);
  process.exit(1);
}

if (assignments.size === 0) {
  console.error("Uso: node scripts/set-stripe-price-secrets.mjs PRO_MONTHLY_BR=price_... [PRO_ANNUAL_BR=price_... ...]");
  console.error(`Slots:\n  ${STRIPE_PRICE_SLOTS.join("\n  ")}`);
  process.exit(1);
}

const missing = STRIPE_PRICE_SLOTS.filter((slot) => !assignments.has(slot));

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN ausente em .env.local");
  process.exit(1);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
  return result.status ?? 1;
}

if (run("npx", ["supabase", "login", "--token", token]) !== 0) process.exit(1);
if (run("npx", ["supabase", "link", "--project-ref", ref, "--yes"]) !== 0) process.exit(1);
if (
  run("npx", [
    "supabase",
    "secrets",
    "set",
    ...[...assignments].map(([slot, priceId]) => `${slot}=${priceId}`),
  ]) !== 0
) {
  process.exit(1);
}
if (
  run("npx", [
    "supabase",
    "functions",
    "deploy",
    "create-checkout-session",
    "create-billing-portal",
    "stripe-webhook",
    "delete-account",
  ]) !== 0
) {
  process.exit(1);
}

console.log(`Slots aplicados (${assignments.size}/${STRIPE_PRICE_SLOTS.length}): ${[...assignments.keys()].join(", ")}`);
if (missing.length > 0) {
  // Dito em voz alta de proposito: um slot sem price id nao quebra o deploy,
  // ele so recusa aquele checkout com PRICE_PENDING. Sem esta linha, ninguem
  // descobre ate um cliente tentar comprar.
  console.log(`Ainda sem price id (checkout recusado nesses slots): ${missing.join(", ")}`);
}
console.log("Functions republicadas.");
