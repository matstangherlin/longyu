/**
 * V4.7.4 — QA Fast Path: só preview/dev; nunca Production Beta.
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

const envSrc = read("src/lib/appEnvironment.ts");
assert(envSrc.includes("isQaFastPathAllowed"), "appEnvironment deve expor isQaFastPathAllowed");
assert(envSrc.includes("isProductionBetaEnv(env)) return false"), "QA Fast Path deve falhar fechado em production_beta");

assert(isQaFastPathAllowed({ MODE: "production" }) === false, "MODE production → Fast Path off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "production_beta" }) === false, "production_beta → Fast Path off");
assert(isQaFastPathAllowed({ VITE_APP_ENV: "preview" }) === true, "preview → Fast Path on");
assert(isQaFastPathAllowed({ DEV: true }) === true, "DEV → Fast Path on");
assert(
  isQaFastPathAllowed({ VITE_APP_ENV: "preview", MODE: "production" }) === true,
  "preview build (MODE production + VITE_APP_ENV preview) → on"
);

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
assert(read("src/components/qa/QaFastPathGate.tsx").includes("Navigate to=\"/\""), "gate redireciona produção para /");
assert(read("src/features/qa/QaScenarioPage.tsx").includes("window.location.replace"), "cenário faz load completo");

if (failures.length) {
  console.error("FAIL test:qa-fast-path:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: test:qa-fast-path — gate de produção e catálogo presentes.");
