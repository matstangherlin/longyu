/**
 * Production Beta must never ship test fixtures, Pro Preview, or local auth.
 * Source/config only — does not require dist/.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (message) => errors.push(message);
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const netlify = read("netlify.toml");
const productionBlock = netlify.slice(
  netlify.indexOf("[context.production.environment]"),
  netlify.indexOf("[context.deploy-preview.environment]")
);
if (!productionBlock.includes("[context.production.environment]")) {
  fail("netlify.toml sem bloco [context.production.environment]");
}
if (!/VITE_USE_TEST_FIXTURES\s*=\s*"false"/.test(productionBlock)) {
  fail("Netlify production deve definir VITE_USE_TEST_FIXTURES = \"false\"");
}
if (!/VITE_ALLOW_PRO_PREVIEW\s*=\s*"false"/.test(productionBlock)) {
  fail("Netlify production deve definir VITE_ALLOW_PRO_PREVIEW = \"false\"");
}
if (/VITE_DEV_ALLOW_LOCAL_AUTH\s*=\s*"1"/.test(productionBlock)) {
  fail("Netlify production não pode ligar VITE_DEV_ALLOW_LOCAL_AUTH");
}

const envSrc = read("src/lib/appEnvironment.ts");
if (!envSrc.includes("export function isTestFixturesAllowed")) {
  fail("appEnvironment deve exportar isTestFixturesAllowed");
}
if (!envSrc.includes("isProductionBetaEnv(env)) return false")) {
  fail("isTestFixturesAllowed deve recusar production_beta mesmo com a flag");
}

const assertNetlify = read("scripts/assert-netlify-env.mjs");
if (!assertNetlify.includes("VITE_USE_TEST_FIXTURES")) {
  fail("assert-netlify-env deve bloquear fixtures em produção");
}
if (!assertNetlify.includes("VITE_ALLOW_PRO_PREVIEW")) {
  fail("assert-netlify-env deve bloquear Pro Preview em produção");
}

const playwright = read("playwright.config.ts");
if (!playwright.includes('VITE_USE_TEST_FIXTURES: "true"')) {
  fail("E2E preview isolado deve continuar com fixtures — o build de produção não");
}
if (!playwright.includes("reuseExistingServer")) {
  fail("playwright.config.ts deve documentar o preview isolado");
}

if (errors.length) {
  console.error("ERRO: validate:production-no-fixtures falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: validate:production-no-fixtures — production Beta sem fixtures.");
