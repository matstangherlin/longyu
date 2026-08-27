import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function requirePath(relativePath, label) {
  const full = path.join(root, relativePath);
  if (!fs.existsSync(full)) {
    errors.push(`Falta ${label}: ${relativePath}`);
    return false;
  }
  return true;
}

const migrations = [
  "supabase/migrations/001_initial_schema.sql",
  "supabase/migrations/002_client_snapshot.sql",
  "supabase/migrations/003_profile_trigger.sql",
  "supabase/migrations/004_leagues.sql",
  "supabase/migrations/006_economy_server.sql",
  "supabase/migrations/007_internal_test_pro.sql",
  "supabase/migrations/008_server_entitlement_rpc.sql",
  "supabase/migrations/010_beta_feedback.sql",
  "supabase/migrations/011_pedagogy_analytics_consent.sql",
  "supabase/migrations/012_pedagogy_consent_rpc_gate.sql",
  "supabase/migrations/013_pedagogy_rpc_hardening.sql",
  "supabase/migrations/20260808081000_harden_anonymous_ingestion.sql",
  "supabase/migrations/20260808093000_harden_referral_qualification.sql",
  "supabase/migrations/20260809160306_require_referral_reward_review.sql",
  "supabase/migrations/20260809161134_index_referral_review_reviewer.sql",
  "supabase/seed/test-account.sql",
  "supabase/migrations/20260812180000_production_help_telemetry.sql",
  "supabase/migrations/20260813180000_pearl_pro_economy.sql",
  "supabase/migrations/20260814010000_mastery_pass_telemetry.sql",
  "supabase/migrations/20260825043000_business_foundation.sql",
  "supabase/migrations/20260825062000_business_operational_hardening.sql",
  "supabase/migrations/20260826230000_placement_onboarding.sql",
  "supabase/migrations/20260827023000_placement_onboarding_handoff.sql",
];
const functions = [
  "supabase/functions/create-account/index.ts",
  "supabase/functions/commit-placement/index.ts",
  "supabase/functions/finalize-onboarding/index.ts",
  "supabase/functions/submit-business-lead/index.ts",
  "supabase/functions/create-checkout-session/index.ts",
  "supabase/functions/create-billing-portal/index.ts",
  "supabase/functions/stripe-webhook/index.ts",
  "supabase/functions/delete-account/index.ts",
  "supabase/functions/issue-anon-ingestion-session/index.ts",
];

for (const migration of migrations) requirePath(migration, "migration");
for (const fn of functions) requirePath(fn, "edge function");
requirePath("supabase/config.toml", "supabase config");

const envExample = path.join(root, ".env.example");
if (fs.existsSync(envExample)) {
  const envText = fs.readFileSync(envExample, "utf8");
  for (const key of [
    "VITE_BACKEND_MODE",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_ADMIN_EMAILS",
  ]) {
    if (!envText.includes(key)) errors.push(`.env.example sem ${key}`);
  }
} else {
  errors.push("Falta .env.example");
}

const backendConfig = path.join(root, "src/lib/backendConfig.ts");
if (fs.existsSync(backendConfig)) {
  const text = fs.readFileSync(backendConfig, "utf8");
  if (!text.includes("supabase")) errors.push("backendConfig.ts não referencia modo supabase");
} else {
  errors.push("Falta src/lib/backendConfig.ts");
}

if (errors.length > 0) {
  console.error("ERRO: validate:backend-ready falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:backend-ready passou.");
console.log("");
console.log("Checklist: docs/DEPLOY_CHECKLIST.md");
console.log("");
console.log("Próximos passos:");
console.log("  npm run setup:supabase -- --init-env");
console.log("  npm run deploy:backend -- --all");
console.log("  npm run verify:production");
console.log("");
console.log("Deploy manual (Supabase CLI):");
console.log("  1. supabase login && supabase link --project-ref <ref>");
console.log("  2. npm run deploy:backend -- --db");
console.log("  3. supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_PRICE_PRO_MONTHLY=... STRIPE_PRICE_PRO_ANNUAL=...");
console.log("  4. npm run deploy:backend -- --functions");
console.log("  5. Stripe webhook → https://<ref>.supabase.co/functions/v1/stripe-webhook");
console.log("  6. Netlify: VITE_BACKEND_MODE=supabase, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY");
