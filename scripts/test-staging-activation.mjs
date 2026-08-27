/**
 * Portão V4.7.3 — staging activation (código + guarda).
 * Não promove READY_FOR_CLOSED_BETA_BR. Não inventa PASS humano.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  extractProjectRef,
  isProductionProjectId,
} from "./lib/staging-guard.mjs";
import { LONGYU_EDGE_FUNCTIONS, verifyJwtForSlug } from "./lib/edge-functions.mjs";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function runScript(script, env, extraArgs = []) {
  return spawnSync(process.execPath, [path.join(root, script), ...extraArgs], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

assert(
  extractProjectRef("https://drjcfalvlbbeblmmyhwj.supabase.co") === LONGYU_PRODUCTION_PROJECT_ID,
  "extractProjectRef lê URL de produção"
);
assert(
  extractProjectRef("https://db.wpnmygzxqvmpdlcuwrjp.supabase.co") === "wpnmygzxqvmpdlcuwrjp",
  "extractProjectRef lê host db.*"
);
assert(isProductionProjectId("drjcfalvlbbeblmmyhwj"), "MandarimProject é produção");
assert(!isProductionProjectId("wpnmygzxqvmpdlcuwrjp"), "longyu-preview não é produção");

const prodIdentify = runScript("scripts/identify-staging.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "",
});
assert(prodIdentify.status === 2, "identify:staging recusa produção (exit 2)");
assert(/HARD FAIL/.test(prodIdentify.stderr + prodIdentify.stdout), "identify:staging HARD FAIL em produção");

const atomurusIdentify = runScript("scripts/identify-staging.mjs", {
  LONGYU_STAGING_PROJECT_ID: "ylofdottauzcqcifnnpm",
  SUPABASE_ACCESS_TOKEN: "",
});
assert(atomurusIdentify.status === 2, "identify:staging recusa atomurus (exit 2)");
assert(/atomurus/.test(atomurusIdentify.stderr + atomurusIdentify.stdout), "identify:staging cita atomurus");

const missingIdentify = runScript("scripts/identify-staging.mjs", {
  LONGYU_STAGING_PROJECT_ID: "",
  SUPABASE_ACCESS_TOKEN: "",
});
assert(missingIdentify.status === 2, "identify:staging recusa ID ausente");

const prodMigrate = runScript("scripts/apply-staging-migrations.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(prodMigrate.status === 2, "migrate:staging recusa produção");
assert(/HARD FAIL/.test(prodMigrate.stderr + prodMigrate.stdout), "migrate:staging HARD FAIL em produção");

const prodDeploy = runScript("scripts/deploy-staging-functions.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "sbp_fake",
});
assert(prodDeploy.status === 2, "deploy:staging-functions recusa produção");

const prodRls = runScript("scripts/test-rls-staging.mjs", {
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  STAGING_SUPABASE_URL: "https://drjcfalvlbbeblmmyhwj.supabase.co",
  STAGING_SUPABASE_ANON_KEY: "anon",
  STAGING_SUPABASE_SERVICE_ROLE_KEY: "service",
  ALLOW_STAGING_SECURITY_TESTS: "true",
});
assert(prodRls.status === 2, "test:rls:staging recusa produção");

const mismatch = runScript("scripts/test-rls-staging.mjs", {
  LONGYU_STAGING_PROJECT_ID: "wpnmygzxqvmpdlcuwrjp",
  STAGING_SUPABASE_URL: "https://drjcfalvlbbeblmmyhwj.supabase.co",
  STAGING_SUPABASE_ANON_KEY: "anon",
  STAGING_SUPABASE_SERVICE_ROLE_KEY: "service",
  ALLOW_STAGING_SECURITY_TESTS: "true",
});
assert(mismatch.status === 2, "test:rls:staging recusa URL de produção mesmo com ID de preview");

const applyApi = read("scripts/apply-migrations-api.mjs");
assert(applyApi.includes('?? "drjcfalvlbbeblmmyhwj"'), "apply-migrations-api ainda defaulta produção — staging não deve chamá-lo");
assert(!read("scripts/apply-staging-migrations.mjs").includes("apply-migrations-api"), "migrate:staging não delega para apply-migrations-api");

const deployBackend = read("scripts/deploy-backend.mjs");
const deployEnv = read("scripts/deploy-functions-env.mjs");
const edgeLib = read("scripts/lib/edge-functions.mjs");
const validateBackend = read("scripts/validate-backend-ready.mjs");
assert(deployBackend.includes("LONGYU_EDGE_FUNCTIONS"), "deploy-backend usa a lista canônica");
assert(deployEnv.includes("LONGYU_EDGE_FUNCTIONS"), "deploy-functions-env usa a lista canônica");
for (const slug of LONGYU_EDGE_FUNCTIONS) {
  assert(edgeLib.includes(`"${slug}"`), `edge-functions lista ${slug}`);
  assert(validateBackend.includes(slug), `validate:backend-ready inclui ${slug}`);
}
assert(validateBackend.includes("create-account"), "validate:backend-ready inclui create-account");
assert(validateBackend.includes("finalize-onboarding"), "validate:backend-ready inclui finalize-onboarding");
assert(
  validateBackend.includes("20260827023000_placement_onboarding_handoff.sql"),
  "validate:backend-ready inclui handoff SQL"
);

const config = read("supabase/config.toml");
assert(verifyJwtForSlug("stripe-webhook", config) === false, "stripe-webhook verify_jwt=false");
assert(verifyJwtForSlug("create-account", config) === false, "create-account verify_jwt=false");
assert(verifyJwtForSlug("commit-placement", config) === true, "commit-placement verify_jwt=true");
assert(verifyJwtForSlug("finalize-onboarding", config) === true, "finalize-onboarding verify_jwt=true");
assert(verifyJwtForSlug("create-checkout-session", config) === true, "checkout default verify_jwt=true");

const copy = read("src/lib/auth/onboardingCopy.ts");
assert(
  copy.includes("Precisamos finalizar seu ponto de partida."),
  "AUTH-007 copy de heading presente"
);
assert(copy.includes("Refazer teste de nivelamento"), "AUTH-007 oferece refazer Placement");
const finalizePage = read("src/features/auth/FinalizeCadastroPage.tsx");
assert(finalizePage.includes("missing_draft"), "AUTH-007 UI missing_draft");
assert(finalizePage.includes("FINALIZE_REDO_PLACEMENT_LABEL"), "AUTH-007 CTA refazer Placement");

const identity = read("src/lib/i18n/identity.ts");
assert(!identity.includes("en-US"), "COUNTRY-023 sem locale en-US");
assert(identity.includes('LAUNCH_INTERFACE_LOCALE = "pt-BR"'), "COUNTRY-023 interface pt-BR");

const envExample = read(".env.example");
assert(envExample.includes("LONGYU_STAGING_PROJECT_ID"), ".env.example documenta LONGYU_STAGING_PROJECT_ID");
assert(envExample.includes("STAGING_SUPABASE_URL"), ".env.example documenta STAGING_SUPABASE_URL");
assert(envExample.includes("ALLOW_STAGING_SECURITY_TESTS"), ".env.example documenta ALLOW_STAGING_SECURITY_TESTS");
assert(
  !/LONGYU_STAGING_PROJECT_ID\s*=\s*drjcfalvlbbeblmmyhwj/.test(envExample),
  ".env.example não defaulta staging para produção"
);

const advisors = read("docs/reports/staging-supabase-advisors.md");
assert(advisors.includes("BLOCKED"), "advisors de staging não inventam PASS");
assert(!/staging[\s\S]{0,80}Security[\s\S]{0,40}PASS/i.test(advisors), "advisors staging sem Security PASS inventado");

const report = read("docs/reports/brazil-closed-beta-readiness.md");
assert(/`NOT_READY`/.test(report), "relatório permanece NOT_READY");
assert(report.includes("STAGE-001"), "relatório registra STAGE-001");
assert(report.includes("AUTH-005"), "relatório tem AUTH-005");
assert(report.includes("AUTH-006"), "relatório tem AUTH-006");
assert(report.includes("AUTH-007"), "relatório tem AUTH-007");
assert(report.includes("DEVICE-013"), "relatório tem DEVICE-013");
assert(report.includes("DEVICE-014"), "relatório tem DEVICE-014");
assert(report.includes("STRIPE-016"), "relatório tem STRIPE-016");
assert(report.includes("READY_FOR_CLOSED_BETA_BR"), "relatório declara decisão humana");
assert(report.includes("wpnmygzxqvmpdlcuwrjp"), "STAGE-001 registra longyu-preview");
assert(report.includes("drjcfalvlbbeblmmyhwj"), "STAGE-001 registra produção proibida");
assert(report.includes("INACTIVE"), "preview continua INACTIVE");
assert(report.includes("2 project limit"), "bloqueio Free permanece documentado");
assert(report.includes("ANDROID") && report.includes("NOT_RUN"), "Android humano NOT_RUN");
assert(report.includes("IPHONE") && report.includes("NOT_RUN"), "iPhone humano NOT_RUN");
assert(report.includes("PAYMENTS") && report.includes("NOT_RUN"), "pagamentos humanos NOT_RUN");

const pkg = JSON.parse(read("package.json"));
assert(pkg.scripts["identify:staging"], "script identify:staging");
assert(pkg.scripts["migrate:staging"], "script migrate:staging");
assert(pkg.scripts["deploy:staging-functions"], "script deploy:staging-functions");
assert(pkg.scripts["test:staging-activation"], "script test:staging-activation");
assert(pkg.scripts["test:rls:staging"], "script test:rls:staging");
assert(
  pkg.scripts["validate:beta"].includes("test:staging-activation"),
  "validate:beta inclui test:staging-activation"
);

const pearl = read("scripts/test-pearl-pro-staging.mjs");
assert(pearl.includes("requireStagingProjectId"), "pearl staging exige LONGYU_STAGING_PROJECT_ID");
assert(pearl.includes("assertStagingUrlMatches"), "pearl staging confere URL vs project id");

const netlify = read("netlify.toml");
assert(
  netlify.includes('VITE_CLOUD_ONBOARDING_V2_ENABLED = "false"'),
  "Netlify production desliga handoff V4.7.1 até o backend V4.7"
);
assert(read("src/lib/featureFlags.ts").includes("isCloudOnboardingV2Enabled"), "flag V2 existe");

const live = read("docs/reports/staging-live-inventory.md");
assert(live.includes("2 project limit"), "live inventory registra limite Free");
assert(live.includes("HARD FAIL"), "live inventory marca produção como HARD FAIL");
assert(live.includes("commit-placement"), "live inventory registra Edges ausentes em prod");
assert(!/STAGING_READY[^\n]*PASS/.test(live), "live inventory não promove STAGING_READY");

const family = [
  "src/lib/auth/sessionAudience.ts",
  "src/components/auth/RequireCloudSession.tsx",
  "src/features/auth/FinalizeCadastroPage.tsx",
  "src/lib/i18n/identity.ts",
  "docs/reports/i18n-readiness.md",
  "src/components/auth/CountrySelect.tsx",
  "docs/reports/brazil-closed-beta-readiness.md",
  "scripts/lib/staging-guard.mjs",
  "scripts/identify-staging.mjs",
  "scripts/apply-staging-migrations.mjs",
  "scripts/deploy-staging-functions.mjs",
  "docs/reports/staging-activation.md",
  "docs/reports/staging-live-inventory.md",
  "supabase/functions/finalize-onboarding/index.ts",
  "supabase/migrations/20260827023000_placement_onboarding_handoff.sql",
];
for (const file of family) {
  assert(fs.existsSync(path.join(root, file)), `família V4.7 presente: ${file}`);
}

if (errors.length) {
  console.error("FAIL test:staging-activation:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log("OK: test:staging-activation (guarda + scripts + relatório honesto; humano permanece NOT_RUN)");
