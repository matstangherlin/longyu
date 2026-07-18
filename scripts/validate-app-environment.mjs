/**
 * Garante que o código e a config de deploy isolam Development / Preview / Production Beta.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const envSrc = read("src/lib/appEnvironment.ts");
assert(envSrc.includes("production_beta"), "appEnvironment deve definir production_beta");
assert(envSrc.includes("isProPreviewBuildAllowed"), "appEnvironment deve expor isProPreviewBuildAllowed");
assert(envSrc.includes("isTestFixturesAllowed"), "appEnvironment deve expor isTestFixturesAllowed");

const entitlements = read("src/lib/entitlements.ts");
assert(entitlements.includes("isProPreviewBuildAllowed"), "entitlements deve usar isProPreviewBuildAllowed");
assert(entitlements.includes("INTERNAL_TEST_PRO_EMAILS"), "entitlements deve listar e-mails QA");

const store = read("src/lib/store.ts");
assert(store.includes("serverIsPro: false"), "logout deve zerar serverIsPro");
assert(store.includes("serverIsPro: qaPro"), "switchAccount deve recalcular Pro de QA");

const flags = read("src/lib/featureFlags.ts");
assert(flags.includes("VITE_ENABLE_CONVERSATION_V2"), "featureFlags deve cobrir conversation V2");
assert(flags.includes("VITE_ENABLE_TELEMETRY"), "featureFlags deve cobrir telemetria");

const netlify = read("netlify.toml");
assert(netlify.includes('VITE_APP_ENV = "production_beta"'), "netlify production deve ser production_beta");
assert(netlify.includes('VITE_APP_ENV = "preview"'), "netlify deploy-preview deve ser preview");
assert(netlify.includes('VITE_ALLOW_PRO_PREVIEW = "false"'), "Pro Preview deve estar false nos contextos Netlify");

const assertNetlify = read("scripts/assert-netlify-env.mjs");
assert(assertNetlify.includes("VITE_ALLOW_PRO_PREVIEW"), "assert-netlify-env deve bloquear Pro Preview em prod");
assert(assertNetlify.includes("VITE_USE_TEST_FIXTURES"), "assert-netlify-env deve bloquear fixtures em prod");

const pkg = JSON.parse(read("package.json"));
assert(pkg.version === "0.2.0-beta.1", `package.json version deve ser 0.2.0-beta.1 (obtido ${pkg.version})`);

const feedback = read("src/lib/feedback.ts");
assert(feedback.includes("0.2.0-beta.1"), "getAppVersion default deve ser 0.2.0-beta.1");

if (errors.length) {
  console.error("ERRO: validate:app-environment falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:app-environment — ambientes e guardrails presentes.");
