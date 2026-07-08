import { spawnSync } from "node:child_process";
import process from "node:process";
import { mergedEnv, projectRoot } from "./lib/env-local.mjs";

const root = projectRoot();
const env = mergedEnv();

const monthly = process.argv[2];
const annual = process.argv[3];
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF ?? "drjcfalvlbbeblmmyhwj";

if (!monthly || !annual) {
  console.error("Uso: node scripts/set-stripe-price-secrets.mjs <monthly_price_id> <annual_price_id>");
  process.exit(1);
}

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
    `STRIPE_PRICE_PRO_MONTHLY=${monthly}`,
    `STRIPE_PRICE_PRO_ANNUAL=${annual}`,
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

console.log("Secrets de preços Stripe aplicados e functions republicadas.");
