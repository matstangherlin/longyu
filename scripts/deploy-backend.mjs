import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const pushDb = args.has("--db") || args.has("--all");
const deployFunctions = args.has("--functions") || args.has("--all");
const showHelp = args.has("--help") || args.has("-h");

const EDGE_FUNCTIONS = [
  "create-checkout-session",
  "create-billing-portal",
  "stripe-webhook",
  "delete-account",
  "submit-analytics",
];

const SECRETS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function log(step) {
  console.log(`\n== ${step} ==`);
}

function run(command, commandArgs, options = {}) {
  const printable = [command, ...commandArgs].join(" ");
  console.log(`> ${printable}`);
  if (dryRun) return 0;
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: root,
    ...options,
  });
  return result.status ?? 1;
}

function runSupabase(commandArgs, options = {}) {
  return run("npx", ["supabase", ...commandArgs], options);
}

function hasCli() {
  const result = spawnSync("npx", ["supabase", "--version"], {
    encoding: "utf8",
    cwd: root,
    shell: process.platform === "win32",
  });
  return result.status === 0;
}

if (showHelp) {
  console.log(`Uso: node scripts/deploy-backend.mjs [opções]

Opções:
  --dry-run      Mostra comandos sem executar
  --db           Aplica migrations (supabase db push)
  --functions    Publica Edge Functions
  --all          --db + --functions
  --help         Esta ajuda

Fluxo recomendado:
  1. supabase login
  2. supabase link --project-ref <ref>
  3. npm run deploy:backend -- --all
  4. Configurar secrets (ver lista abaixo)
  5. Stripe webhook → https://<ref>.supabase.co/functions/v1/stripe-webhook
  6. Netlify: VITE_BACKEND_MODE=supabase + URL/anon key
`);
  process.exit(0);
}

log("Validação local");
const validateStatus = run(process.execPath, ["scripts/validate-backend-ready.mjs"]);
if (validateStatus !== 0) process.exit(validateStatus);

if (!pushDb && !deployFunctions) {
  console.log("\nNada a executar. Use --db, --functions ou --all.");
  console.log("Exemplo: npm run deploy:backend -- --all --dry-run");
  process.exit(0);
}

if (!dryRun && !hasCli()) {
  console.error("\nERRO: Supabase CLI não encontrado. Rode: npm install");
  process.exit(1);
}

if (pushDb) {
  log("Migrations");
  const status = runSupabase(["db", "push"]);
  if (status !== 0) process.exit(status);
}

if (deployFunctions) {
  log("Edge Functions");
  const status = runSupabase(["functions", "deploy", ...EDGE_FUNCTIONS]);
  if (status !== 0) process.exit(status);
}

log("Secrets necessários no Supabase");
for (const secret of SECRETS) {
  console.log(`  - ${secret}`);
}

log("Stripe Dashboard");
console.log("  Webhook URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook");
console.log("  Eventos: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed");

log("Netlify (Site settings → Environment variables)");
console.log("  VITE_BACKEND_MODE=supabase");
console.log("  VITE_SUPABASE_URL=https://<project-ref>.supabase.co");
console.log("  VITE_SUPABASE_ANON_KEY=<anon-key>");

console.log(dryRun ? "\nDry-run concluído." : "\nDeploy backend concluído.");
