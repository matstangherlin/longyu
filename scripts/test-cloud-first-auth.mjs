#!/usr/bin/env node
/**
 * AUTH-001/022/031 — cloud-first onboarding: sem conta local no funil de produção.
 * Roda: npm run test:cloud-first-auth
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const read = (rel) => readFile(path.join(root, rel), "utf8");

const [
  store,
  accountPage,
  loginPage,
  landing,
  comecar,
  routes,
  policy,
  requireCloud,
  netlifyAssert,
  envExample,
  sql,
  commitFn,
  ptBR,
] = await Promise.all([
  read("src/lib/store.ts"),
  read("src/features/account/AccountPage.tsx"),
  read("src/features/auth/LoginPage.tsx"),
  read("src/features/landing/LandingPage.tsx"),
  read("src/features/onboarding/ComecarPage.tsx"),
  read("src/routes.tsx"),
  read("src/lib/auth/localAuthPolicy.ts"),
  read("src/components/auth/RequireCloudSession.tsx"),
  read("scripts/assert-netlify-env.mjs"),
  read(".env.example"),
  read("supabase/migrations/20260826230000_placement_onboarding.sql"),
  read("supabase/functions/commit-placement/index.ts"),
  read("src/locales/pt-BR.ts"),
]);

assert(!accountPage.includes("Deixar para depois"), "AccountPage não pode oferecer Deixar para depois");
assert(!loginPage.includes("Continuar sem login"), "LoginPage não pode oferecer Continuar sem login");
assert(!comecar.includes("Continuar sem conta"), "ComecarPage não pode oferecer Continuar sem conta");
assert(!comecar.includes("Deixar para depois"), "ComecarPage não pode oferecer Deixar para depois");
assert(!landing.includes("Seu progresso pode ser salvo na nuvem"), "Landing precisa da copy de conta obrigatória");
assert(landing.includes('t("marketing.noCard")'), "Landing usa a chave de progresso na conta");
assert(ptBR.includes("Seu progresso fica salvo na sua conta"), "pt-BR deve dizer que o progresso fica na conta");
assert(landing.includes('to="/comecar"'), "Começar agora deve ir para /comecar");
assert(routes.includes('path: "comecar"'), "rota /comecar precisa existir");
assert(routes.includes('path: "finalizar-cadastro"'), "rota /finalizar-cadastro precisa existir");
assert(routes.includes("RequireCloudSession"), "rotas protegidas exigem RequireCloudSession");
assert(store.includes("isDevLocalAuthAllowed()"), "finishLocalOnboarding deve hard-fail fora de DEV/E2E");
assert(store.includes("LEGACY_ONLY"), "authMode=local precisa estar marcado LEGACY_ONLY");
assert(store.includes("applyServerPlacement"), "store precisa aplicar placement recalculado no servidor");
assert(store.includes("wipeToGuestShell"), "logout deve limpar identidade ao vivo");
assert(policy.includes("VITE_DEV_ALLOW_LOCAL_AUTH cannot be enabled in production builds"), "flag local auth hard-fail em production");
assert(requireCloud.includes("auth-gate"), "guard não pode pintar conteúdo privado antes da sessão");
assert(requireCloud.includes("resolveSessionAudience"), "guard resolve sessão cloud, não authMode persistido");
assert(requireCloud.includes("cloud_ready"), "Journey exige cloud_ready");
assert(requireCloud.includes("cloud_pending_onboarding"), "pending não entra na Journey");
assert(requireCloud.includes("finalizeOnboardingPath"), "pending vai para /finalizar-cadastro");
assert(!requireCloud.includes('audience === "cloud"'), "audience cloud genérico saiu do guard");
assert(netlifyAssert.includes("VITE_DEV_ALLOW_LOCAL_AUTH"), "deploy production deve bloquear a flag de auth local");
assert(envExample.includes("VITE_DEV_ALLOW_LOCAL_AUTH"), ".env.example deve documentar a flag DEV/E2E");
assert(
  envExample.includes("VITE_CLOUD_ONBOARDING_V2_ENABLED"),
  ".env.example deve documentar o handoff V4.7.1"
);
assert(comecar.includes("Criar minha conta e salvar o resultado"), "CTA de conta obrigatória no resultado");
assert(!comecar.includes("finishLocalOnboarding"), "funil /comecar não pode chamar finishLocalOnboarding");
assert(!accountPage.includes("Conta local neste dispositivo"), "copy de conta local saiu da experiência normal");
assert(!requireCloud.includes('authMode === "cloud"'), "Jornada não abre só porque o persist diz authMode=cloud");
assert(sql.includes("create table if not exists public.placement_attempts"), "migration cria placement_attempts");
assert(sql.includes("placement_attempts_select_own"), "RLS: usuário só lê as próprias tentativas");
assert(sql.includes("to service_role"), "RPC de commit só para service_role");
assert(!commitFn.includes("skippedLessonIds"), "Edge não aceita skippedLessonIds do client");
assert(commitFn.includes("evaluatePlacementEvidence"), "Edge recalcula o placement no servidor");
assert(commitFn.includes("validatePlacementEvidence"), "Edge valida question IDs e versão");

const require = createRequire(import.meta.url);
const { mkdir, writeFile } = await import("node:fs/promises");
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-local-auth-"));
try {
  const shimImportMeta = "({ DEV: false, MODE: 'test', VITE_APP_ENV: '' })";
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  };
  const envText = ts.transpileModule(
    (await read("src/lib/appEnvironment.ts")).replaceAll("import.meta.env", shimImportMeta),
    { compilerOptions, fileName: "appEnvironment.ts" }
  ).outputText;
  const policyText = ts.transpileModule(
    (await read("src/lib/auth/localAuthPolicy.ts"))
      .replaceAll('from "../appEnvironment"', 'from "../appEnvironment.js"')
      .replaceAll("import.meta.env", shimImportMeta),
    { compilerOptions, fileName: "localAuthPolicy.ts" }
  ).outputText;
  await mkdir(path.join(outDir, "src/lib/auth"), { recursive: true });
  await writeFile(path.join(outDir, "src/lib/appEnvironment.js"), envText);
  await writeFile(path.join(outDir, "src/lib/auth/localAuthPolicy.js"), policyText);
  const mod = require(path.join(outDir, "src/lib/auth/localAuthPolicy.js"));
  let threw = false;
  try {
    mod.isDevLocalAuthAllowed({ MODE: "production", VITE_APP_ENV: "production_beta", VITE_DEV_ALLOW_LOCAL_AUTH: "1" });
  } catch {
    threw = true;
  }
  assert(threw, "flag VITE_DEV_ALLOW_LOCAL_AUTH=1 deve lançar em production_beta");
  assert(
    mod.isDevLocalAuthAllowed({ DEV: true, VITE_DEV_ALLOW_LOCAL_AUTH: "1" }) === true,
    "DEV com flag explícita pode usar bypass"
  );
  assert(
    mod.isDevLocalAuthAllowed({ DEV: true, VITE_DEV_ALLOW_LOCAL_AUTH: "" }) === false,
    "DEV sem flag não libera conta local silenciosa"
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:cloud-first-auth:");
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:cloud-first-auth");
