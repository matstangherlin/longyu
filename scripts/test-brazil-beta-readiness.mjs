/**
 * Portao V4.7.2 — Brazil closed beta (codigo).
 * Nao promove READY_FOR_CLOSED_BETA_BR. CI sozinho nao libera a beta.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const require = createRequire(import.meta.url);

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const identity = read("src/lib/i18n/identity.ts");
const countries = read("src/data/countries.ts");
const fields = read("src/components/auth/ProfileDetailsFields.tsx");
const countrySelect = read("src/components/auth/CountrySelect.tsx");
const funnel = read("src/services/funnelEvents.ts");
const pedagogy = read("src/services/pedagogyEvents.ts");
const proOffer = read("src/lib/proOfferEngine.ts");
const revisao = read("src/features/revisao/RevisaoPage.tsx");
const progress = read("scripts/test-progress-loading.mjs");
const createAccount = read("supabase/functions/create-account/index.ts");
const businessLead = read("src/features/business/BusinessLeadForm.tsx");
const report = read("docs/reports/brazil-closed-beta-readiness.md");
const srcFiles = [
  "src/routes.tsx",
  "src/components/layout/AppShell.tsx",
  "src/features/onboarding/ComecarPage.tsx",
  "src/features/account/AccountPage.tsx",
  "src/lib/i18n/identity.ts",
];

assert(countries.includes('code: "BR"'), "catalogo ISO inclui BR");
assert(countrySelect.includes("data-country-select"), "CountrySelect marca o select canonico");
assert(fields.includes("CountrySelect"), "cadastro usa select de pais, nao texto livre");
assert(!/type=\"text\"[\s\S]{0,80}placeholder=\"Brasil\"/.test(fields), "cadastro nao usa input texto de pais");
assert(businessLead.includes("CountrySelect"), "lead Business usa pais canonico");
assert(createAccount.includes("countryLabelForCode"), "create-account normaliza rotulo a partir do ISO");
assert(createAccount.includes("country_code: countryCode"), "create-account persiste country_code");
assert(identity.includes("Pais nunca infere idioma") || identity.includes("launchLocaleFields() ignora country"), "pais nao infere locale");
assert(!identity.includes("en-US"), "lancamento sem locale en-US");
assert(identity.includes('LAUNCH_INTERFACE_LOCALE = "pt-BR"'), "interface pt-BR");
assert(identity.includes('LAUNCH_TARGET_LANGUAGE = "zh-CN"'), "alvo zh-CN");

for (const file of srcFiles) {
  const text = read(file);
  assert(!/interface_locale.*en-US/.test(text), `${file} nao define interface en-US`);
  assert(!/language-selector|seletor de idioma|English UI/.test(text), `${file} sem seletor English`);
}

const releaseEvents = [
  "signup_submitted",
  "placement_completed",
  "journey_entered",
  "review_started",
  "review_completed",
  "pro_offer_shown",
  "checkout_started",
  "subscription_activated",
];
for (const event of releaseEvents) {
  assert(funnel.includes(`"${event}"`), `funil de release inclui ${event}`);
}
assert(pedagogy.includes("lesson_started") && pedagogy.includes("lesson_completed"), "pedagogia: aula start/complete");
assert(pedagogy.includes("mastery_pass_completed"), "pedagogia: mastery pass");
assert(revisao.includes('trackFunnelEvent("review_started"'), "Review dispara review_started");
assert(revisao.includes('trackFunnelEvent("review_completed"'), "Review dispara review_completed");
assert(proOffer.includes('trackFunnelEvent("pro_offer_shown"'), "oferta Pro dispara funil");
assert(proOffer.includes('trackFunnelEvent("checkout_started"'), "checkout dispara funil");
assert(proOffer.includes('trackFunnelEvent("subscription_activated"'), "assinatura dispara funil");
assert(funnel.includes("PII_KEY") || /email\|name/.test(funnel), "funil remove PII");

assert(progress.includes("CLOUD_SYNC_TIMEOUT_MS"), "BR-007: timeout de sync no gate");
assert(progress.includes("watchdog unlocks a stuck planner"), "BR-007: watchdog do player no gate");

assert(report.includes("READY_FOR_CLOSED_BETA_BR"), "relatorio declara o estado final humano");
assert(/`NOT_READY`/.test(report), "relatorio nao promove a beta automaticamente");
assert(report.includes("ANDROID") && report.includes("NOT_RUN"), "Android humano permanece NOT_RUN");
assert(report.includes("IPHONE") && report.includes("NOT_RUN"), "iPhone humano permanece NOT_RUN");
assert(report.includes("PAYMENTS") && report.includes("NOT_RUN"), "Stripe humano permanece NOT_RUN");
assert(report.includes("CLOSE_SAFE") && report.includes("SUPERSEDED"), "BR-029 classifica PRs legadas");
assert(
  report.includes("BLOCKED_REMOTE_STAGING") || report.includes("MandarimProject"),
  "BR-001 registra staging remoto bloqueado / só MandarimProject"
);

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-brazil-beta-"));
try {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  };
  const countriesJs = ts.transpileModule(countries, { compilerOptions, fileName: "countries.ts" }).outputText;
  const identityJs = ts.transpileModule(identity, { compilerOptions, fileName: "identity.ts" }).outputText;
  await mkdir(path.join(outDir, "src/data"), { recursive: true });
  await mkdir(path.join(outDir, "src/lib/i18n"), { recursive: true });
  await writeFile(path.join(outDir, "src/data/countries.js"), countriesJs);
  await writeFile(path.join(outDir, "src/lib/i18n/identity.js"), identityJs);
  const mod = require(path.join(outDir, "src/lib/i18n/identity.js"));
  assert(mod.canonicalCountryCode("Brasil") === "BR", "Brasil -> BR");
  assert(mod.canonicalCountryCode("br") === "BR", "br -> BR");
  assert(mod.canonicalCountryCode("Portugal") === "PT", "Portugal -> PT");
  assert(mod.canonicalCountryCode("pt-BR") === "BR", "locale nao vira country");
  assert(mod.countryLabelForCode("BR") === "Brasil", "BR -> Brasil");
  assert(mod.LAUNCH_INTERFACE_LOCALE === "pt-BR", "interface pt-BR");
  assert(mod.LAUNCH_TARGET_LANGUAGE === "zh-CN", "alvo zh-CN");
  const locales = mod.launchLocaleFields();
  assert(locales.interface_locale === "pt-BR", "launch locale independente de pais");
  assert(locales.target_language === "zh-CN", "target independente de pais");
  assert(mod.canonicalCountryCode("US") === "US", "US permanece US");
  assert(locales.interface_locale === "pt-BR", "US nao muda interface");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (errors.length) {
  console.error("FAIL test:brazil-beta-readiness:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:brazil-beta-readiness (BR-023/024/025/026/027 codigo; humano permanece NOT_RUN)");
