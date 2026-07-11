import process from "node:process";
import { mergedEnv, readEnvFile } from "./lib/env-local.mjs";

const warnings = [];
const errors = [];

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  errors.push(message);
}

async function checkUrl(label, url, options = {}) {
  try {
    const response = await fetch(url, { method: options.method ?? "GET", redirect: "follow" });
    if (!response.ok && !options.allowNotOk) {
      fail(`${label}: HTTP ${response.status} em ${url}`);
      return null;
    }
    return response;
  } catch (error) {
    fail(`${label}: ${error instanceof Error ? error.message : "falha de rede"}`);
    return null;
  }
}

const env = mergedEnv();
const backendMode = env.VITE_BACKEND_MODE;
const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const hasLocalEnv = Object.keys(readEnvFile(".env.local")).length > 0;

console.log("== verify:production ==");

if (backendMode !== "supabase") {
  warn('VITE_BACKEND_MODE não é "supabase" — produção ainda usará modo local.');
}

if (!supabaseUrl || !anonKey) {
  console.log("\nBackend Supabase ainda não configurado neste ambiente.");
  console.log("Execute: npm run setup:supabase -- --init-env");
  console.log("Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local\n");
  process.exit(0);
}

if (supabaseUrl && !supabaseUrl.includes(".supabase.co")) {
  warn("VITE_SUPABASE_URL não parece um host Supabase padrão.");
}

const health = await checkUrl("Supabase REST", `${supabaseUrl}/rest/v1/`, {
  method: "GET",
  allowNotOk: true,
});
if (health && (health.status === 401 || health.status === 200)) {
  console.log("OK: Supabase REST alcançável.");
} else if (health) {
  fail(`Supabase REST respondeu ${health.status} (esperado 401 ou 200).`);
}

const authHealth = await checkUrl("Supabase Auth", `${supabaseUrl}/auth/v1/health`, {
  allowNotOk: true,
});
if (authHealth?.ok) {
  console.log("OK: Supabase Auth health.");
} else if (authHealth) {
  warn(`Supabase Auth health retornou ${authHealth.status}.`);
}

for (const [name, path] of [
  ["stripe-webhook", "stripe-webhook"],
  ["create-checkout-session", "create-checkout-session"],
  ["create-billing-portal", "create-billing-portal"],
  ["delete-account", "delete-account"],
  ["submit-feedback", "submit-feedback"],
  ["submit-app-error", "submit-app-error"],
]) {
  const probe = await checkUrl(
    `Edge Function ${name}`,
    `${supabaseUrl}/functions/v1/${path}`,
    { method: "OPTIONS", allowNotOk: true }
  );
  if (probe && (probe.status === 200 || probe.status === 204)) {
    console.log(`OK: ${name} responde.`);
  } else if (probe) {
    warn(`${name} retornou ${probe.status} — rode npm run deploy:backend -- --functions`);
  }
}

if (backendMode === "supabase" && supabaseUrl && anonKey && errors.length === 0) {
  console.log("\nOK: variáveis e endpoints mínimos verificados.");
}

if (warnings.length > 0) {
  console.log("\nAvisos:");
  for (const message of warnings) console.log(`  - ${message}`);
}

if (errors.length > 0) {
  console.error("\nERRO: verify:production falhou.");
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

if (hasLocalEnv) {
  console.log("\nPróximo: npm run dev → Conta → criar conta → progresso sincroniza sozinho.");
  console.log("Produção: defina VITE_* no Netlify e rode configure:supabase-auth com --add-prod-url.");
  console.log("Checklist: docs/DEPLOY_CHECKLIST.md");
}
console.log("Stripe: use cartões de teste antes do modo live.\n");
