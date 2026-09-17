#!/usr/bin/env node
/**
 * RC2.2 — mutações do contrato de candidate (P42).
 *
 * Cada mutação abaixo é uma forma concreta de publicar algo que PARECE um
 * candidate e não é. Um gate que não mata a mutação não está protegendo nada.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { validateCandidateInfra } from "./lib/rc2-candidate-infra-gate.mjs";
import {
  QA_CANDIDATE_APP_ENV,
  isQaCandidateAppEnv,
  maskProjectRef,
  validateCandidateIdentity,
  validateQaCandidateEnv,
} from "./lib/rc2-candidate-infra.mjs";
import { LONGYU_PRODUCTION_PROJECT_ID } from "./lib/staging-guard.mjs";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const GOOD_SHA = "a".repeat(40);
const OTHER_SHA = "b".repeat(40);
const QA_URL = "https://qaqaqaqaqaqaqaqaqaqa.supabase.co";

function killEnv(label, mutate, code) {
  const env = {
    VITE_APP_ENV: "qa_candidate",
    VITE_BACKEND_MODE: "supabase",
    VITE_SUPABASE_URL: QA_URL,
    VITE_SUPABASE_ANON_KEY: "header.payload.signature",
    VITE_USE_TEST_FIXTURES: "false",
    VITE_ALLOW_PRO_PREVIEW: "false",
  };
  mutate(env);
  const { failures } = validateQaCandidateEnv(env);
  assert.ok(
    failures.some((f) => f.code === code),
    `${label} → ${code}; got ${JSON.stringify(failures.map((f) => f.code))}`
  );
  console.log(`KILLED env/${label}: ${code}`);
}

// ── Contrato de env do candidate ─────────────────────────────────────────────
{
  const { failures } = validateQaCandidateEnv({
    VITE_APP_ENV: "qa_candidate",
    VITE_BACKEND_MODE: "supabase",
    VITE_SUPABASE_URL: QA_URL,
    VITE_SUPABASE_ANON_KEY: "header.payload.signature",
    VITE_USE_TEST_FIXTURES: "false",
    VITE_ALLOW_PRO_PREVIEW: "false",
  });
  assert.deepEqual(failures, [], `candidate QA válido não deve falhar: ${JSON.stringify(failures)}`);
  console.log("PASS positive qa_candidate env");
}

// P42 mutação 1 — candidate usa backend local.
killEnv("backend local", (env) => (env.VITE_BACKEND_MODE = "local"), "LOCAL_BACKEND");
// P42 mutação 2 — candidate usa fixtures.
killEnv("fixtures on", (env) => (env.VITE_USE_TEST_FIXTURES = "true"), "FIXTURES_ON");
// P42 mutações 3 e 5 — candidate aponta para o projeto de produção.
killEnv(
  "supabase de produção",
  (env) => (env.VITE_SUPABASE_URL = `https://${LONGYU_PRODUCTION_PROJECT_ID}.supabase.co`),
  "PRODUCTION_REF"
);
// P42 mutação 4 — candidate roda com o app env de produção.
killEnv("app env de produção", (env) => (env.VITE_APP_ENV = "production_beta"), "NOT_CANDIDATE_ENV");
// Pro Preview / conta local ligados no candidate.
killEnv("pro preview on", (env) => (env.VITE_ALLOW_PRO_PREVIEW = "true"), "PRO_PREVIEW_ON");
killEnv("conta local on", (env) => (env.VITE_DEV_ALLOW_LOCAL_AUTH = "1"), "LOCAL_AUTH_ON");
// P42 mutações 15/16/17 — segredo no frontend.
killEnv("service_role em VITE_", (env) => (env.VITE_SUPABASE_SERVICE_ROLE = "service_role_abcdef"), "SECRET_IN_FRONTEND");
killEnv("stripe secret em VITE_", (env) => (env.VITE_STRIPE_KEY = "sk_live_abcdefghijklmnopqrst"), "SECRET_IN_FRONTEND");
killEnv("turnstile secret em VITE_", (env) => (env.VITE_TURNSTILE_SECRET_KEY = "x"), "SECRET_IN_FRONTEND");
// Credenciais QA ausentes → não vira candidate por omissão.
killEnv("sem URL do Supabase QA", (env) => (env.VITE_SUPABASE_URL = ""), "MISSING_SUPABASE_URL");
killEnv("sem anon key", (env) => (env.VITE_SUPABASE_ANON_KEY = ""), "MISSING_ANON_KEY");

// ── Identidade do deploy ─────────────────────────────────────────────────────
function killIdentity(label, actual, expectedSha, code) {
  const { failures } = validateCandidateIdentity({ actual, expectedSha });
  assert.ok(
    failures.some((f) => f.code === code),
    `${label} → ${code}; got ${JSON.stringify(failures.map((f) => f.code))}`
  );
  console.log(`KILLED identity/${label}: ${code}`);
}

{
  const { failures } = validateCandidateIdentity({
    actual: { commitSha: GOOD_SHA, appVersion: "0.2.0-beta.1", environment: "qa_candidate", builtAt: "2026-09-17T00:00:00Z" },
    expectedSha: GOOD_SHA,
  });
  assert.deepEqual(failures, [], `identidade válida não deve falhar: ${JSON.stringify(failures)}`);
  console.log("PASS positive candidate identity");
}

// P42 mutação 7 — candidateSha ≠ SHA deployada.
killIdentity(
  "sha deployada diferente",
  { commitSha: OTHER_SHA, environment: "qa_candidate", builtAt: "x" },
  GOOD_SHA,
  "SHA_MISMATCH"
);
// P42 mutação 8 — não existe identidade de deployment.
killIdentity("sem identidade", null, GOOD_SHA, "NO_IDENTITY");
// P11.1 — branch/label não é identidade.
killIdentity(
  "branch como identidade",
  { commitSha: "rc2-candidate", environment: "qa_candidate", builtAt: "x" },
  "",
  "AMBIGUOUS_SHA"
);
killIdentity(
  "short sha como identidade",
  { commitSha: GOOD_SHA.slice(0, 7), environment: "qa_candidate", builtAt: "x" },
  "",
  "AMBIGUOUS_SHA"
);
// P42 mutação 4 — candidate publicado com env de produção.
killIdentity(
  "environment production_beta",
  { commitSha: GOOD_SHA, environment: "production_beta", builtAt: "x" },
  GOOD_SHA,
  "BAD_ENVIRONMENT"
);
// P10.3 — identidade pública não vaza env/credencial.
killIdentity(
  "identidade vazando env",
  { commitSha: GOOD_SHA, environment: "qa_candidate", builtAt: "x", supabaseAnonKey: "eyJ..." },
  GOOD_SHA,
  "IDENTITY_OVERSHARE"
);

// ── Gate de infraestrutura ───────────────────────────────────────────────────
const REAL = {
  appEnvironmentSrc: read("src/lib/appEnvironment.ts"),
  assertNetlifySrc: read("scripts/assert-netlify-env.mjs"),
  netlifyToml: read("netlify.toml"),
  viteBuildSrc: read("scripts/vite-build.mjs"),
  candidateManifest: JSON.parse(read("docs/release/rc2-candidate.json")),
  publicBetaCore: JSON.parse(read("docs/release/public-beta-core.json")),
  operationalChecks: JSON.parse(read("docs/release/rc1-operational-checks.json")),
};

{
  const { failures } = validateCandidateInfra(REAL);
  assert.deepEqual(failures, [], `infra real não deve falhar: ${JSON.stringify(failures, null, 2)}`);
  console.log("PASS positive candidate infra");
}

function killInfra(label, mutate, code) {
  const sources = structuredClone(REAL);
  mutate(sources);
  const { failures } = validateCandidateInfra(sources);
  assert.ok(
    failures.some((f) => f.code === code),
    `${label} → ${code}; got ${JSON.stringify(failures.map((f) => f.code))}`
  );
  console.log(`KILLED infra/${label}: ${code}`);
}

// P42 mutação 6 — manifesto alega candidate antes do deploy.
killInfra("sha sem deploy", (s) => (s.candidateManifest.candidateSha = GOOD_SHA), "SHA_WITHOUT_DEPLOY");
killInfra("url sem deploy", (s) => (s.candidateManifest.deploymentUrl = "https://x.netlify.app"), "URL_WITHOUT_DEPLOY");
// P42 mutação 9 — DEPLOYED sem deploymentUrl.
killInfra(
  "DEPLOYED sem url",
  (s) => {
    s.candidateManifest = {
      status: "DEPLOYED",
      candidateSha: GOOD_SHA,
      backendMode: "supabase",
      fixtures: false,
      environment: "qa",
      contentFreezeSha: "x",
      deployedAt: "2026-09-17T00:00:00Z",
    };
    s.publicBetaCore.releaseCandidateSha = GOOD_SHA;
  },
  "MISSING_URL"
);
// P42 mutação 10 — deployedAt vazio com status DEPLOYED.
killInfra(
  "DEPLOYED sem deployedAt",
  (s) => {
    s.candidateManifest = {
      status: "DEPLOYED",
      candidateSha: GOOD_SHA,
      deploymentUrl: "https://x.netlify.app",
      backendMode: "supabase",
      fixtures: false,
      environment: "qa",
      contentFreezeSha: "x",
    };
    s.publicBetaCore.releaseCandidateSha = GOOD_SHA;
  },
  "MISSING_DEPLOYED_AT"
);
// P42 mutação 11 — backendMode ≠ supabase.
killInfra(
  "DEPLOYED com backend local",
  (s) => {
    s.candidateManifest = {
      status: "DEPLOYED",
      candidateSha: GOOD_SHA,
      deploymentUrl: "https://x.netlify.app",
      backendMode: "local",
      fixtures: false,
      environment: "qa",
      contentFreezeSha: "x",
      deployedAt: "2026-09-17T00:00:00Z",
    };
    s.publicBetaCore.releaseCandidateSha = GOOD_SHA;
  },
  "LOCAL_BACKEND"
);
// P42 mutação 20/19 — manifesto do core aponta para outra SHA.
killInfra(
  "core releaseCandidateSha divergente",
  (s) => (s.publicBetaCore.releaseCandidateSha = OTHER_SHA),
  "CORE_SHA_DRIFT"
);
// P16.1 — verdict vira GO só porque existe candidate.
killInfra("verdict GO precoce", (s) => (s.publicBetaCore.verdict = "GO"), "EARLY_GO");
// P42 mutação 26 — League habilitada sem decisão explícita.
killInfra("league ligada", (s) => (s.publicBetaCore.leaguePubliclyEnabled = true), "LEAGUE_ENABLED");
// P42 mutação 27 — check operacional vira PASS só porque o candidate deployou.
killInfra(
  "check PASS sem runbook",
  (s) => (s.operationalChecks.checks.cloud_auth = { pass: true, testedAt: null }),
  "CHECK_PASS_WITHOUT_RUN"
);
// Regressões do contrato de código.
killInfra(
  "qa_candidate removido do runtime",
  (s) => (s.appEnvironmentSrc = s.appEnvironmentSrc.replaceAll('"qa_candidate"', '"preview"')),
  "NO_CANDIDATE_ENV"
);
killInfra(
  "fixtures liberadas no candidate",
  (s) =>
    (s.appEnvironmentSrc = s.appEnvironmentSrc.replace(
      /export function isTestFixturesAllowed[\s\S]*?\n}/,
      "export function isTestFixturesAllowed(env) {\n  return env.VITE_USE_TEST_FIXTURES === \"true\";\n}"
    )),
  "AFFORDANCE_NOT_LOCKED"
);
killInfra("guard de build removido", (s) => (s.assertNetlifySrc = "process.exit(0);"), "NO_BUILD_GUARD");
killInfra("contexto candidate removido", (s) => (s.netlifyToml = s.netlifyToml.replace('[context."rc2-candidate".environment]', "[context.unused.environment]")), "NO_CANDIDATE_CONTEXT");
killInfra(
  "contexto candidate em modo local",
  (s) =>
    (s.netlifyToml = s.netlifyToml.replace(
      /(\[context\."rc2-candidate"\.environment\][\s\S]*?)VITE_BACKEND_MODE = "supabase"/,
      '$1VITE_BACKEND_MODE = "local"'
    )),
  "CONTEXT_BACKEND"
);
killInfra(
  "produção apontada para QA",
  (s) =>
    (s.netlifyToml = s.netlifyToml.replace(
      /(\[context\.production\.environment\][\s\S]*?)VITE_APP_ENV = "production_beta"/,
      '$1VITE_APP_ENV = "qa_candidate"'
    )),
  "PRODUCTION_DRIFT"
);
killInfra("identidade de deploy removida", (s) => (s.viteBuildSrc = "// no identity"), "NO_DEPLOY_IDENTITY");

// ── Helpers ──────────────────────────────────────────────────────────────────
assert.equal(isQaCandidateAppEnv("rc2-candidate"), true, "alias rc2-candidate deve normalizar");
assert.equal(isQaCandidateAppEnv(QA_CANDIDATE_APP_ENV), true);
assert.equal(isQaCandidateAppEnv("production_beta"), false);
assert.ok(!maskProjectRef(QA_URL).includes("qaqaqaqaqaqaqaqaqaqa"), "ref mascarado não deve sair inteiro");

console.log("PASS test:rc2-candidate-infra");
