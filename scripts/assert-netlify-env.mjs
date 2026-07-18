import process from "node:process";

const onNetlify = process.env.NETLIFY === "true" || Boolean(process.env.NETLIFY_DEV);
const context = String(process.env.CONTEXT ?? "").toLowerCase();
const isProduction = context === "production";
const isDeployPreview = context === "deploy-preview" || context === "branch-deploy";

if (!onNetlify) {
  process.exit(0);
}

const appEnv = String(process.env.VITE_APP_ENV ?? "").trim().toLowerCase();
const allowPreview = process.env.VITE_ALLOW_PRO_PREVIEW === "true";
const useFixtures = process.env.VITE_USE_TEST_FIXTURES === "true";

function fail(message) {
  console.error(`\nERRO: ${message}\n`);
  process.exit(1);
}

if (isProduction) {
  const required = ["VITE_BACKEND_MODE", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error("\nERRO: deploy Netlify sem backend Supabase configurado.\n");
    console.error("Defina no painel Netlify → Site settings → Environment variables:");
    for (const key of required) console.error(`  - ${key}`);
    console.error("\nValores em .env.example / docs/BETA_RELEASE_CHECKLIST.md\n");
    process.exit(1);
  }

  if (process.env.VITE_BACKEND_MODE !== "supabase") {
    fail('VITE_BACKEND_MODE deve ser "supabase" em Production Beta.');
  }

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const jwtParts = anonKey.split(".");
  if (jwtParts.length !== 3 || anonKey.length < 200) {
    fail("VITE_SUPABASE_ANON_KEY parece truncada ou inválida.");
  }

  // Ambiente principal: nunca Preview nem fixtures de teste.
  if (appEnv && appEnv !== "production_beta" && appEnv !== "production" && appEnv !== "beta") {
    fail(
      `VITE_APP_ENV="${appEnv}" não é válido em CONTEXT=production. Use production_beta.`
    );
  }
  if (allowPreview) {
    fail(
      "VITE_ALLOW_PRO_PREVIEW=true bloqueado em Production Beta (evita liberar Pro Preview acidentalmente)."
    );
  }
  if (useFixtures) {
    fail("VITE_USE_TEST_FIXTURES=true bloqueado em Production Beta (dados de teste).");
  }

  // Service role / secrets nunca entram no bundle via VITE_*.
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("VITE_") || !value) continue;
    if (/service_role|SECRET|PRIVATE|sk_live|sk_test|whsec_/i.test(key) || /service_role|sk_live|whsec_/i.test(value)) {
      fail(`Variável perigosa no frontend: ${key}. Remova do build Netlify.`);
    }
  }

  console.log("OK: Production Beta — env Supabase presente; Pro Preview e fixtures bloqueados.");
  process.exit(0);
}

if (isDeployPreview) {
  if (appEnv === "production_beta" || appEnv === "production") {
    fail(
      "Deploy Preview não pode usar VITE_APP_ENV=production_beta (variáveis de preview vs ambiente principal)."
    );
  }
  if (!appEnv) {
    console.warn(
      "AVISO: Deploy Preview sem VITE_APP_ENV — defina VITE_APP_ENV=preview no contexto deploy-preview."
    );
  }
  console.log("OK: Deploy Preview — contexto isolado do ambiente principal.");
  process.exit(0);
}

console.log(`OK: Netlify context="${context || "unknown"}" — sem checagens extras.`);
