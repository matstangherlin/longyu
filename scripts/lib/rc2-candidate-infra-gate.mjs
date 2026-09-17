/**
 * RC2.2 — Regras do gate de infraestrutura do candidate (P38).
 *
 * Separado do runner para que as mutações possam ser testadas sem tocar em
 * arquivo: o teste injeta fontes e manifestos sintéticos e exige que cada
 * afrouxamento seja morto por um código específico.
 */
import { validateRc2CandidateConfig } from "./rc2-content-freeze.mjs";
import { isProductionProjectId } from "./staging-guard.mjs";

export function validateCandidateInfra(sources = {}) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });

  const appEnvSrc = String(sources.appEnvironmentSrc ?? "");
  const assertNetlifySrc = String(sources.assertNetlifySrc ?? "");
  const netlifyToml = String(sources.netlifyToml ?? "");
  const viteBuildSrc = String(sources.viteBuildSrc ?? "");
  const candidate = sources.candidateManifest ?? {};
  const core = sources.publicBetaCore ?? {};
  const operational = sources.operationalChecks ?? {};

  // ── Ambiente: qa_candidate precisa existir e ser production-like ───────────
  if (!appEnvSrc.includes('"qa_candidate"')) {
    fail("NO_CANDIDATE_ENV", "src/lib/appEnvironment.ts", "qa_candidate não é um AppEnvironment reconhecido");
  }
  if (!appEnvSrc.includes("isProductionLikeEnv")) {
    fail("NO_PRODUCTION_LIKE", "src/lib/appEnvironment.ts", "falta isProductionLikeEnv (candidate + beta pública)");
  }
  for (const affordance of ["isProPreviewBuildAllowed", "isTestFixturesAllowed", "isQaFastPathAllowed"]) {
    const body = appEnvSrc.split(`export function ${affordance}`)[1]?.split("\n}")[0] ?? "";
    if (!body.includes("isProductionLikeEnv")) {
      fail("AFFORDANCE_NOT_LOCKED", affordance, "afrouxamento de dev/preview não está bloqueado em qa_candidate");
    }
  }

  // ── Guard de build: o contrato do candidate é exigido no Netlify ───────────
  if (!assertNetlifySrc.includes("validateQaCandidateEnv")) {
    fail("NO_BUILD_GUARD", "scripts/assert-netlify-env.mjs", "build do candidate não valida o contrato qa_candidate");
  }

  // ── Topologia Netlify: contexto candidate existe e é production-like ───────
  const candidateContext = netlifyToml.split('[context."rc2-candidate".environment]')[1]?.split("\n[")[0] ?? "";
  if (!candidateContext) {
    fail("NO_CANDIDATE_CONTEXT", "netlify.toml", "nenhum contexto de deploy declarado para o candidate");
  } else {
    if (!candidateContext.includes('VITE_APP_ENV = "qa_candidate"')) {
      fail("CONTEXT_APP_ENV", "netlify.toml", "contexto candidate não declara VITE_APP_ENV=qa_candidate");
    }
    // P6.3 / P42 mutação 1 — candidate com backend local não é candidate.
    if (!candidateContext.includes('VITE_BACKEND_MODE = "supabase"')) {
      fail("CONTEXT_BACKEND", "netlify.toml", "contexto candidate não declara VITE_BACKEND_MODE=supabase");
    }
    if (!candidateContext.includes('VITE_USE_TEST_FIXTURES = "false"')) {
      fail("CONTEXT_FIXTURES", "netlify.toml", "contexto candidate não desliga fixtures");
    }
    if (!candidateContext.includes('VITE_ALLOW_PRO_PREVIEW = "false"')) {
      fail("CONTEXT_PRO_PREVIEW", "netlify.toml", "contexto candidate não desliga Pro Preview");
    }
    // P7.2 / P42 mutação 3 — o ref de produção nunca entra no contexto QA.
    for (const match of candidateContext.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/gi)) {
      if (isProductionProjectId(match[1])) {
        fail("CONTEXT_PRODUCTION_REF", "netlify.toml", "contexto candidate carrega o Supabase de produção");
      }
    }
  }

  // P7.1 — produção permanece produção.
  const productionContext = netlifyToml.split("[context.production.environment]")[1]?.split("\n[")[0] ?? "";
  if (!productionContext.includes('VITE_APP_ENV = "production_beta"')) {
    fail("PRODUCTION_DRIFT", "netlify.toml", "contexto production deixou de ser production_beta");
  }

  // ── Identidade de deploy (P10) ────────────────────────────────────────────
  if (!viteBuildSrc.includes("version.json") || !viteBuildSrc.includes("commitSha")) {
    fail("NO_DEPLOY_IDENTITY", "scripts/vite-build.mjs", "build não emite identidade pública com commitSha");
  }

  // ── Manifestos ────────────────────────────────────────────────────────────
  failures.push(...validateRc2CandidateConfig({ candidateManifest: candidate }).failures);

  const coreSha = String(core.releaseCandidateSha ?? "");
  const candidateSha = String(candidate.candidateSha ?? "");
  if (coreSha && coreSha !== candidateSha) {
    fail("CORE_SHA_DRIFT", "public-beta-core", "releaseCandidateSha ≠ candidateSha do manifesto do candidate");
  }
  // P16.1 — candidate existir não é beta pronta.
  if (core.verdict && core.verdict !== "NO-GO") {
    fail("EARLY_GO", "public-beta-core", `verdict=${core.verdict} antes das evidências operacionais`);
  }
  if (core.leaguePubliclyEnabled === true) {
    // P24 / P42 mutação 26 — League só liga com decisão explícita.
    fail("LEAGUE_ENABLED", "public-beta-core", "League habilitada publicamente sem decisão explícita");
  }

  // P17.1 / P42 mutação 27 — deploy não é evidência.
  for (const [key, row] of Object.entries(operational.checks ?? {})) {
    if (row?.pass === true && !row.testedAt) {
      fail("CHECK_PASS_WITHOUT_RUN", key, "check marcado pass=true sem testedAt (runbook não foi executado)");
    }
  }

  return { failures };
}
