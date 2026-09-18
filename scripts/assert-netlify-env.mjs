import process from "node:process";
import {
  QA_CANDIDATE_APP_ENV,
  isQaCandidateAppEnv,
  maskProjectRef,
  validateQaCandidateEnv,
} from "./lib/rc2-candidate-infra.mjs";
import { LONGYU_PRODUCTION_PROJECT_ID } from "./lib/staging-guard.mjs";

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

  // P7.1 — o ambiente principal nunca vira candidate QA.
  if (isQaCandidateAppEnv(appEnv)) {
    fail(
      `VITE_APP_ENV=${QA_CANDIDATE_APP_ENV} em CONTEXT=production. O candidate QA tem site/contexto próprio; ` +
        "produção permanece isolada."
    );
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
  if (String(process.env.VITE_DEV_ALLOW_LOCAL_AUTH ?? "") === "1") {
    fail("VITE_DEV_ALLOW_LOCAL_AUTH=1 bloqueado em Production Beta (conta local).");
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

// RC2.2 — QA candidate production-like (branch deploy dedicado ou site QA).
//
// Um deploy-preview em VITE_BACKEND_MODE=local NÃO é candidate: ele não prova
// auth, sync, feedback cloud nem entitlements. Por isso o candidate declara
// VITE_APP_ENV=qa_candidate e este guard exige o contrato inteiro — se faltar
// qualquer peça, o build falha em vez de publicar algo que parece candidate.
if (isQaCandidateAppEnv(appEnv)) {
  const { failures } = validateQaCandidateEnv(process.env);
  if (failures.length > 0) {
    console.error(`\nERRO: contrato do RC2 candidate (${QA_CANDIDATE_APP_ENV}) não foi satisfeito.\n`);
    for (const failure of failures) {
      console.error(`  - [${failure.code}] ${failure.where}: ${failure.why}`);
    }
    console.error(
      "\nConfigure no escopo do candidate (Netlify → Environment variables):\n" +
        "  VITE_APP_ENV=qa_candidate\n" +
        "  VITE_BACKEND_MODE=supabase\n" +
        "  VITE_SUPABASE_URL=https://<qa-ref>.supabase.co   (nunca " +
        `${LONGYU_PRODUCTION_PROJECT_ID})\n` +
        "  VITE_SUPABASE_ANON_KEY=<anon do projeto QA>\n" +
        "  VITE_USE_TEST_FIXTURES=false\n" +
        "  VITE_ALLOW_PRO_PREVIEW=false\n"
    );
    process.exit(1);
  }

  const maskedRef = maskProjectRef(process.env.VITE_SUPABASE_URL);
  console.log(
    `OK: RC2 candidate — backend supabase QA (ref ${maskedRef}), fixtures/Pro Preview/conta local desligados.`
  );
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

  const backendMode = String(process.env.VITE_BACKEND_MODE ?? "").trim().toLowerCase();
  const supabaseUrl = String(process.env.VITE_SUPABASE_URL ?? "").trim();
  const productionRef = LONGYU_PRODUCTION_PROJECT_ID;

  // Preview não pode escrever no projeto de produção.
  if (supabaseUrl.includes(productionRef)) {
    fail(
      "Deploy Preview aponta para o Supabase de produção. Use VITE_BACKEND_MODE=local ou um projeto preview separado."
    );
  }
  if (backendMode === "supabase" && !supabaseUrl) {
    fail('Deploy Preview com VITE_BACKEND_MODE=supabase exige VITE_SUPABASE_URL do projeto preview.');
  }
  if (backendMode && backendMode !== "local" && backendMode !== "supabase") {
    fail(`VITE_BACKEND_MODE="${backendMode}" inválido no Deploy Preview.`);
  }

  console.log(
    backendMode === "local" || !backendMode
      ? "OK: Deploy Preview — modo local (sem escrita no Supabase de produção)."
      : "OK: Deploy Preview — Supabase preview isolado do ambiente principal."
  );
  process.exit(0);
}

console.log(`OK: Netlify context="${context || "unknown"}" — sem checagens extras.`);
