#!/usr/bin/env node
/**
 * V4.7.1 — ONB/PLACEMENT/AUTH contract tests (TEST-022..027, ONB-001).
 * Roda: npm run test:onboarding-handoff
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";

const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const read = (rel) => readFile(path.join(root, rel), "utf8");

const [
  createAccount,
  finalizeFn,
  sql,
  sessionAudience,
  requireCloud,
  postAuth,
  authService,
  profileTypes,
  finalizePage,
  confirmEmail,
  loginPage,
  routes,
  identity,
  evidence,
  comecar,
  profileFields,
] = await Promise.all([
  read("supabase/functions/create-account/index.ts"),
  read("supabase/functions/finalize-onboarding/index.ts"),
  read("supabase/migrations/20260827023000_placement_onboarding_handoff.sql"),
  read("src/lib/auth/sessionAudience.ts"),
  read("src/components/auth/RequireCloudSession.tsx"),
  read("src/services/postAuthOnboarding.ts"),
  read("src/services/authService.ts"),
  read("src/services/profileTypes.ts"),
  read("src/features/auth/FinalizeCadastroPage.tsx"),
  read("src/features/auth/ConfirmEmailPage.tsx"),
  read("src/features/auth/LoginPage.tsx"),
  read("src/routes.tsx"),
  read("src/lib/i18n/identity.ts"),
  read("src/lib/placement/evidence.ts"),
  read("src/features/onboarding/ComecarPage.tsx"),
  read("src/components/auth/ProfileDetailsFields.tsx"),
]);

assert(
  /onboarding_completed:\s*false/.test(createAccount),
  "ONB-001: create-account grava onboarding_completed=false"
);
assert(
  !/onboarding_completed:\s*true/.test(createAccount),
  "ONB-001 hard fail: create-account nao pode gravar onboarding_completed=true"
);
assert(createAccount.includes("save_placement_onboarding_draft"), "PLACEMENT-006: create-account salva draft");
assert(createAccount.includes("parsePlacementEvidence"), "PLACEMENT-004: evidencia parseada no Edge");
assert(!createAccount.includes("skippedLessonIds"), "PLACEMENT-004: create-account nao envia skippedLessonIds");
assert(!createAccount.includes("masteredByPlacement"), "PLACEMENT-004: create-account nao envia mastery");
assert(
  createAccount.indexOf("return genericOk()") < createAccount.indexOf("save_placement_onboarding_draft"),
  "PLACEMENT-006: email existente retorna antes de gravar draft"
);

assert(sql.includes("create table if not exists public.placement_onboarding_drafts"), "PLACEMENT-005: tabela draft");
assert(sql.includes("user_id uuid primary key"), "PLACEMENT-005: user_id unique");
assert(sql.includes("to service_role"), "draft/RPC so service_role");
assert(sql.includes("onboarding_completed = true"), "commit marca onboarding true");
assert(sql.includes("alreadyCompleted"), "PLACEMENT-009/011: ja onboarded e idempotente");
assert(sql.includes("when unique_violation"), "PLACEMENT-009: unique_violation");
assert(sql.includes("delete from public.placement_onboarding_drafts"), "PLACEMENT-012: consome draft");
assert(sql.includes("interface_locale"), "I18N-017: interface_locale");
assert(sql.includes("instruction_locale"), "I18N-017: instruction_locale");
assert(sql.includes("country_code"), "I18N-018: country_code ISO");
assert(
  sql.includes("Nao marca onboarding_completed") || sql.includes("never flips onboarding_completed"),
  "ensure_own_profile nao completa onboarding"
);

assert(finalizeFn.includes("missing_draft"), "PLACEMENT-010: codigo missing_draft");
assert(finalizeFn.includes("onboarding-v2:") || finalizeFn.includes("onboardingIdempotencyKey"), "PLACEMENT-009: chave onboarding-v2");
assert(finalizeFn.includes("evaluatePlacementEvidence"), "finalize recalcula no servidor");
assert(!finalizeFn.includes("skippedLessonIds"), "finalize nao aceita skippedLessonIds do client");
assert(finalizeFn.includes("placement_onboarding_drafts"), "TEST-023: draft por user_id");

assert(sessionAudience.includes("cloud_pending_onboarding"), "ONB-002: audience pending");
assert(sessionAudience.includes("cloud_ready"), "ONB-002: audience cloud_ready");
assert(sessionAudience.includes("onboarding_completed"), "ONB-002: le profile servidor");
assert(sessionAudience.includes("isCloudOnboardingV2Enabled"), "ONB-002: flag de compatibilidade production");
assert(sessionAudience.includes('return "cloud_pending_onboarding"'), "fail-closed vira pending");
assert(!sessionAudience.includes('return "cloud"'), "audience cloud generico removido");

assert(requireCloud.includes("canEnterJourney"), "ONB-003: Journey so cloud_ready/seeded");
assert(requireCloud.includes("auth-gate"), "AUTH-014: sem flash privado");
assert(requireCloud.includes("finalizeOnboardingPath"), "AUTH-014: pending -> /finalizar-cadastro");

assert(!postAuth.includes("p_onboarding_completed: true"), "post-auth nao marca onboarding via ensure_own_profile");
assert(postAuth.includes("isCloudOnboardingV2Enabled"), "post-auth ramifica na flag V2");
assert(postAuth.includes("finalizeOnboardingOnServer"), "commit V2 passa pelo Edge finalize-onboarding");
assert(postAuth.includes("commitPlacementToServer"), "compat production usa commit-placement ate backend V4.7");
assert(!profileTypes.includes("onboarding_completed:"), "payload de perfil nao envia onboarding_completed");
assert(authService.includes("toServerPlacementEvidence"), "signup envia evidencia Placement V2");
assert(authService.includes("canonicalCountryCode"), "signup envia country_code canonico");

assert(finalizePage.includes("FINALIZE_ONBOARDING_HEADING"), "AUTH-013: copy de ponto de partida");
assert(finalizePage.includes("FINALIZE_ONBOARDING_BUSY"), "AUTH-013: estado busy");
assert(finalizePage.includes("missing_draft"), "AUTH-013: placement ausente");
assert(finalizePage.includes("redoPlacementPath") || finalizePage.includes("refazer=1"), "PLACEMENT-010: refazer teste");
assert(!finalizePage.includes("AppShell"), "AUTH-013: sem AppShell");
assert(!finalizePage.includes("readPendingPlacement"), "TEST-023: pagina finalize nao le sessionStorage");
assert(confirmEmail.includes("isCloudOnboardingV2Enabled"), "confirmacao ramifica na flag V2");
assert(confirmEmail.includes("finalizeOnboardingPath"), "confirmacao V2 redireciona para finalize");
assert(confirmEmail.includes("completeAuthenticatedOnboarding"), "confirmacao compat chama onboarding atual");
assert(loginPage.includes("finalizeOnboardingPath"), "login pending vai para finalize");
assert(routes.includes("FinalizeCadastroPage"), "rota FinalizeCadastroPage");
assert(comecar.includes("refazer"), "redo placement autenticado");

assert(identity.includes("LAUNCH_INTERFACE_LOCALE"), "I18N-017: interface_locale");
assert(identity.includes("LAUNCH_INSTRUCTION_LOCALE"), "I18N-017: instruction_locale");
assert(identity.includes("LAUNCH_COUNTRY_CODE"), "I18N-018: country code");
assert(profileFields.includes("CountrySelect"), "cadastro usa pais canonico");
assert(identity.includes('zh-CN'), "lancamento continua zh-CN");
assert(!identity.includes("en-US") || identity.includes("pt-BR"), "sem UI EN nesta PR");
assert(evidence.includes("skippedLessonIds") === false || evidence.includes("Sem score"), "evidencia sem score/skip");

const require = createRequire(import.meta.url);
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-onboarding-handoff-"));
try {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  };
  const identityText = ts.transpileModule(await read("src/lib/i18n/identity.ts"), {
    compilerOptions,
    fileName: "identity.ts",
  }).outputText;
  const countriesText = ts.transpileModule(await read("src/data/countries.ts"), {
    compilerOptions,
    fileName: "countries.ts",
  }).outputText;
  const envText = ts.transpileModule(
    (await read("src/lib/appEnvironment.ts")).replaceAll("= import.meta.env", "= {}"),
    { compilerOptions, fileName: "appEnvironment.ts" }
  ).outputText;
  const flagsText = ts.transpileModule(
    (await read("src/lib/featureFlags.ts")).replaceAll("= import.meta.env", "= {}"),
    { compilerOptions, fileName: "featureFlags.ts" }
  ).outputText;
  await mkdir(path.join(outDir, "src/lib/i18n"), { recursive: true });
  await mkdir(path.join(outDir, "src/data"), { recursive: true });
  await mkdir(path.join(outDir, "src/lib"), { recursive: true });
  await writeFile(path.join(outDir, "src/lib/i18n/identity.js"), identityText);
  await writeFile(path.join(outDir, "src/data/countries.js"), countriesText);
  await writeFile(path.join(outDir, "src/lib/appEnvironment.js"), envText);
  await writeFile(path.join(outDir, "src/lib/featureFlags.js"), flagsText);
  const mod = require(path.join(outDir, "src/lib/i18n/identity.js"));
  assert(mod.canonicalCountryCode("Brasil") === "BR", "Brasil -> BR");
  assert(mod.canonicalCountryCode("br") === "BR", "br -> BR");
  assert(mod.canonicalCountryCode("Portugal") === "PT", "Portugal -> PT");
  assert(mod.canonicalCountryCode("pt-BR") !== "pt-BR", "nao misturar locale com country");
  assert(mod.launchLocaleFields().interface_locale === "pt-BR", "locale nao deriva do pais");
  assert(mod.launchLocaleFields().target_language === "zh-CN", "target permanece zh-CN");
  assert(mod.LAUNCH_INTERFACE_LOCALE === "pt-BR", "interface pt-BR");
  assert(mod.LAUNCH_TARGET_LANGUAGE === "zh-CN", "target zh-CN");
  assert(mod.LAUNCH_COUNTRY_CODE === "BR", "country BR");
  const flags = require(path.join(outDir, "src/lib/featureFlags.js"));
  assert(
    flags.isCloudOnboardingV2Enabled({ VITE_APP_ENV: "production_beta" }) === false,
    "production_beta desliga V2 por default"
  );
  assert(
    flags.isCloudOnboardingV2Enabled({ VITE_APP_ENV: "preview" }) === true,
    "preview liga V2 por default"
  );
  assert(
    flags.isCloudOnboardingV2Enabled({
      VITE_APP_ENV: "production_beta",
      VITE_CLOUD_ONBOARDING_V2_ENABLED: "true",
    }) === true,
    "flag explicita liga V2 em production_beta"
  );
  assert(
    flags.isCloudOnboardingV2Enabled({
      VITE_APP_ENV: "preview",
      VITE_CLOUD_ONBOARDING_V2_ENABLED: "false",
    }) === false,
    "flag explicita desliga V2 em preview"
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:onboarding-handoff:");
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:onboarding-handoff (ONB-001..003, PLACEMENT-004..012, AUTH-013..015, I18N-016..018)");
