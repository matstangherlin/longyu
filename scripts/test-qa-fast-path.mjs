/**
 * V4.7.4 — QA Fast Path: só preview/dev; nunca Production Beta.
 * Marker, query string, deep link e refresh não abrem em production.
 * TEST STATE não sincroniza nem altera conta cloud.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function resolveAppEnvironment(env) {
  if (env.DEV === true) return "development";
  const raw = String(env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (raw === "development" || raw === "dev") return "development";
  if (raw === "preview" || raw === "deploy_preview" || raw === "staging") return "preview";
  if (raw === "production_beta" || raw === "production" || raw === "prod" || raw === "beta") {
    return "production_beta";
  }
  if (env.MODE === "production") return "production_beta";
  return "production_beta";
}

function isQaFastPathAllowed(env) {
  if (resolveAppEnvironment(env) === "production_beta") return false;
  const appEnv = resolveAppEnvironment(env);
  return appEnv === "development" || appEnv === "preview";
}

function productionGate(env, pathName) {
  if (!isQaFastPathAllowed(env)) return "/";
  return pathName;
}

const envSrc = read("src/lib/appEnvironment.ts");
assert(envSrc.includes("isQaFastPathAllowed"), "appEnvironment deve expor isQaFastPathAllowed");
assert(envSrc.includes("isProductionBetaEnv(env)) return false"), "QA Fast Path deve falhar fechado em production_beta");

assert(isQaFastPathAllowed({ MODE: "production" }) === false, "MODE production → Fast Path off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "production_beta" }) === false, "production_beta → Fast Path off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "production" }) === false, "VITE_APP_ENV production → off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "prod" }) === false, "VITE_APP_ENV prod → off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "beta" }) === false, "VITE_APP_ENV beta → off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "preview" }) === true, "preview → Fast Path on");
assert(isQaFastPathAllowed({ DEV: true }) === true, "DEV → Fast Path on");
assert(
  isQaFastPathAllowed({ VITE_APP_ENV: "preview", MODE: "production" }) === true,
  "preview build (MODE production + VITE_APP_ENV preview) → on"
);
assert(
  isQaFastPathAllowed({ MODE: "production", VITE_USE_TEST_FIXTURES: "true" }) === false,
  "fixtures não ligam /qa em production"
);
assert(
  isQaFastPathAllowed({ MODE: "production", VITE_ALLOW_PRO_PREVIEW: "true" }) === false,
  "Pro Preview flag não liga /qa em production"
);

for (const pathName of ["/qa", "/qa/player", "/qa/m1", "/qa/player?seed=1", "/qa?marker=1"]) {
  assert(productionGate({ MODE: "production" }, pathName) === "/", `production + ${pathName} → /`);
  assert(productionGate({ VITE_APP_ENV: "production_beta" }, pathName) === "/", `production_beta + ${pathName} → /`);
  assert(productionGate({ DEV: true }, pathName) === pathName, `dev + ${pathName} permanece`);
}

const srcTree = [
  "src/lib/qaFastPath.ts",
  "src/lib/qaFastPathAccess.ts",
  "src/lib/appEnvironment.ts",
  "src/components/qa/QaFastPathGate.tsx",
  "src/features/qa/QaHubPage.tsx",
  "src/features/qa/QaScenarioPage.tsx",
  "src/lib/auth/sessionAudience.ts",
  "src/routes.tsx",
].map(read).join("\n");

assert(!/searchParams\.get\(\s*["']qa["']/.test(srcTree), "nenhum searchParams.get('qa') ativa Fast Path");
assert(!/URLSearchParams[\s\S]{0,80}qa/.test(srcTree), "query string não é vetor de ativação");

const routes = read("src/routes.tsx");
assert(routes.includes("qa/player"), "rota /qa/player");
assert(routes.includes("QaFastPathGate"), "gate de produção nas rotas /qa");

const robots = read("public/robots.txt");
assert(robots.includes("Disallow: /qa"), "robots.txt não indexa /qa");
const seo = read("src/lib/seo.ts");
assert(seo.includes('"/qa"'), "NOINDEX inclui /qa");

assert(!read("src/lib/auth/publicRoutes.ts").includes('"/qa"'), "/qa não entra em PUBLIC_APP_PATHS de produção");

const audience = read("src/lib/auth/sessionAudience.ts");
assert(audience.includes("isQaFastPathAllowed"), "override de audience QA exige ambiente permitido");
assert(audience.includes("isQaFastPathSessionMarked"), "sessão QA seedada entra na Journey só com marker");
assert(audience.includes("qaFastPathAccess"), "override de audience QA não puxa o currículo");

assert(!read("netlify.toml").includes("VITE_DEV_ALLOW_LOCAL_AUTH"), "preview/prod não ligam auth local no toml");
assert(read("netlify.toml").includes('VITE_APP_ENV = "production_beta"'), "produção declara production_beta");

const accessSrc = read("src/lib/qaFastPathAccess.ts");
assert(accessSrc.includes("snapshotRealStateForQa"), "backup do estado real antes do seed");
assert(accessSrc.includes("restoreRealStateFromQaBackup"), "restore do estado real ao sair");
assert(accessSrc.includes("isQaTestStateActive"), "flag TEST STATE");
assert(accessSrc.includes("QA_REAL_STATE_BACKUP_KEY"), "chave de backup isolada");

const qaSrc = read("src/lib/qaFastPath.ts");
for (const id of [
  "m1",
  "m2",
  "m3",
  "m4",
  "pinyin",
  "tone",
  "hanzi",
  "conversation",
  "review",
  "transfer",
  "energy-empty",
  "pro",
  "mission",
  "sync-error",
  "topic-mastery-1",
  "topic-mastery-3",
]) {
  assert(qaSrc.includes(`id: "${id}"`), `cenário ausente: ${id}`);
}
assert(qaSrc.includes("QA_STORE_VERSION = 20"), "seed usa STORE_VERSION 20");
assert(qaSrc.includes('case "topic-mastery-1"'), "seed 1/4");
assert(qaSrc.includes('case "topic-mastery-3"'), "seed 3/4");
assert(qaSrc.includes("qa_fast_path_disabled"), "apply recusa produção");
assert(qaSrc.includes("snapshotRealStateForQa"), "apply faz backup antes de escrever seed");
assert(qaSrc.includes('currentAccountId: "local"'), "seed força conta local");
assert(read("src/components/qa/QaFastPathGate.tsx").includes('Navigate to="/"'), "gate redireciona produção para /");
assert(read("src/features/qa/QaScenarioPage.tsx").includes("window.location.replace"), "cenário faz load completo");
assert(read("src/features/qa/QaHubPage.tsx").includes("exitQaFastPathSession"), "hub sai restaurando estado real");

const syncSrc = read("src/services/cloudSyncCoordinator.ts");
assert(syncSrc.includes("isQaTestStateActive"), "sync consulta TEST STATE");
assert(syncSrc.includes("QA test state"), "sync recusa push/restore em TEST STATE");
assert(read("src/components/auth/AuthBootstrap.tsx").includes("isQaTestStateActive"), "AuthBootstrap não restaura cloud no QA");
assert(read("src/components/auth/CloudSyncBootstrap.tsx").includes("isQaTestStateActive"), "CloudSyncBootstrap off no QA");
assert(read("src/components/auth/EntitlementBootstrap.tsx").includes("isQaTestStateActive"), "entitlement off no QA");
assert(read("src/components/economy/EconomyBootstrap.tsx").includes("isQaTestStateActive"), "economy server off no QA");
const shellSrc = read("src/components/layout/AppShell.tsx");
assert(shellSrc.includes("QaTestStateBanner"), "banner de TEST STATE no shell");
assert(
  /flex-1 flex-col[\s\S]{0,280}QaTestStateBanner/.test(shellSrc),
  "banner QA fica na coluna do conteúdo (não irmão da row — espreme o main no 390px)"
);

if (failures.length) {
  console.error("FAIL test:qa-fast-path:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: test:qa-fast-path — production fail-closed, isolamento TEST vs REAL.");
