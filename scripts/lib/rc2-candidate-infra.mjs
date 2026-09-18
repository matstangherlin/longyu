/**
 * RC2.2 — Contrato de ambiente do candidate QA.
 *
 * Um "deploy preview" NÃO é um RC2 candidate. O preview roda com
 * VITE_BACKEND_MODE=local, então não prova auth, sync, feedback cloud nem
 * entitlements. Este módulo define o que um build precisa carregar para poder
 * ser chamado de candidate, e é a única autoridade sobre isso — reusada pelo
 * guard de build (assert-netlify-env), pelo gate de infra e pelos testes.
 *
 * Reusa o guard de projeto que já conhece produção (scripts/lib/staging-guard.mjs).
 * Não duplica o ref de produção nem inventa uma segunda noção de "não-produção".
 */
import {
  LONGYU_PRODUCTION_PROJECT_ID,
  LONGYU_PRODUCTION_PROJECT_NAME,
  extractProjectRef,
  isProductionProjectId,
} from "./staging-guard.mjs";

/** Valor canônico de VITE_APP_ENV para o candidate. */
export const QA_CANDIDATE_APP_ENV = "qa_candidate";

/** Aceitos por resolveAppEnvironment() e normalizados para qa_candidate. */
export const QA_CANDIDATE_APP_ENV_ALIASES = ["qa_candidate", "rc2_candidate", "candidate", "qa"];

export const BLOCKED_CREDENTIALS = "BLOCKED_CREDENTIALS";

/**
 * Mascara um project ref para relatório/log. O ref não é segredo (aparece na
 * URL pública do Supabase), mas o relatório não precisa carimbá-lo inteiro.
 */
export function maskProjectRef(urlOrId) {
  const ref = extractProjectRef(urlOrId);
  if (!ref) return "";
  if (ref.length <= 8) return `${ref.slice(0, 2)}…`;
  return `${ref.slice(0, 4)}…${ref.slice(-4)}`;
}

function normalizeAppEnv(value) {
  return String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
}

export function isQaCandidateAppEnv(value) {
  return QA_CANDIDATE_APP_ENV_ALIASES.includes(normalizeAppEnv(value));
}

/**
 * Contrato do candidate QA sobre um mapa de env (process.env do build Netlify,
 * ou um objeto sintético nos testes). Retorna failures; nunca lança.
 *
 * Regras (RC2.2 P8.2):
 *   backendMode=supabase · Supabase URL + anon key presentes · fixtures=false
 *   Pro Preview=false · conta local=false · ref Supabase ≠ produção.
 */
export function validateQaCandidateEnv(env = {}) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });

  const appEnv = normalizeAppEnv(env.VITE_APP_ENV);
  if (!isQaCandidateAppEnv(appEnv)) {
    fail("NOT_CANDIDATE_ENV", "VITE_APP_ENV", `esperado ${QA_CANDIDATE_APP_ENV}, got "${appEnv || "(vazio)"}"`);
    return { failures, appEnv };
  }

  const backendMode = String(env.VITE_BACKEND_MODE ?? "").trim().toLowerCase();
  const supabaseUrl = String(env.VITE_SUPABASE_URL ?? "").trim();
  const anonKey = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();

  // P8.3 / P42 mutação 1 — candidate com backend local não é candidate.
  if (backendMode === "local") {
    fail("LOCAL_BACKEND", "VITE_BACKEND_MODE", "qa_candidate não pode rodar com VITE_BACKEND_MODE=local");
  } else if (backendMode !== "supabase") {
    fail("BAD_BACKEND", "VITE_BACKEND_MODE", `esperado supabase, got "${backendMode || "(vazio)"}"`);
  }

  if (!supabaseUrl) {
    fail("MISSING_SUPABASE_URL", "VITE_SUPABASE_URL", `${BLOCKED_CREDENTIALS} URL do Supabase QA ausente`);
  }
  if (!anonKey) {
    fail("MISSING_ANON_KEY", "VITE_SUPABASE_ANON_KEY", `${BLOCKED_CREDENTIALS} anon key do Supabase QA ausente`);
  } else if (anonKey.split(".").length !== 3 && !/^sb_publishable_/.test(anonKey)) {
    fail("BAD_ANON_KEY", "VITE_SUPABASE_ANON_KEY", "anon key não parece JWT nem sb_publishable_");
  }

  // P2.1 / P42 mutações 3 e 5 — QA nunca pode ser o projeto de produção.
  if (supabaseUrl && isProductionProjectId(supabaseUrl)) {
    fail(
      "PRODUCTION_REF",
      "VITE_SUPABASE_URL",
      `candidate QA aponta para ${LONGYU_PRODUCTION_PROJECT_NAME} (${LONGYU_PRODUCTION_PROJECT_ID}). Recusado.`
    );
  }

  if (String(env.VITE_ALLOW_PRO_PREVIEW ?? "") === "true") {
    fail("PRO_PREVIEW_ON", "VITE_ALLOW_PRO_PREVIEW", "Pro Preview deve ser false no candidate");
  }
  if (String(env.VITE_USE_TEST_FIXTURES ?? "") === "true") {
    fail("FIXTURES_ON", "VITE_USE_TEST_FIXTURES", "fixtures devem ser false no candidate");
  }
  if (String(env.VITE_DEV_ALLOW_LOCAL_AUTH ?? "") === "1") {
    fail("LOCAL_AUTH_ON", "VITE_DEV_ALLOW_LOCAL_AUTH", "conta local deve estar desligada no candidate");
  }

  // P42 mutações 15/16/17 — segredo nunca entra por VITE_*.
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("VITE_") || !value) continue;
    if (
      /service_role|SECRET|PRIVATE|sk_live|sk_test|whsec_/i.test(key) ||
      /service_role|sk_live|sk_test|whsec_/i.test(String(value))
    ) {
      fail("SECRET_IN_FRONTEND", key, "variável perigosa no bundle do candidate");
    }
  }

  return { failures, appEnv };
}

/**
 * Identidade de deploy (P10/P11): o que o candidate publicado precisa dizer
 * sobre si mesmo. `actual` é o JSON servido em /version.json.
 */
export function validateCandidateIdentity({ actual, expectedSha, expectedAppEnv = QA_CANDIDATE_APP_ENV } = {}) {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });

  if (!actual || typeof actual !== "object") {
    fail("NO_IDENTITY", "/version.json", "candidate não expõe identidade de deploy");
    return { failures };
  }

  const commitSha = String(actual.commitSha ?? "").trim();
  if (!commitSha) {
    fail("NO_SHA", "/version.json", "commitSha ausente na identidade do candidate");
  } else if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
    // P11.1 — branch name, "latest", número de PR ou short label não são identidade.
    fail("AMBIGUOUS_SHA", "/version.json", `commitSha="${commitSha}" não é um SHA completo de 40 hex`);
  }

  if (expectedSha) {
    if (!/^[0-9a-f]{40}$/i.test(String(expectedSha))) {
      fail("AMBIGUOUS_EXPECTED_SHA", "expected", `SHA esperado "${expectedSha}" não é um SHA completo`);
    } else if (commitSha && commitSha.toLowerCase() !== String(expectedSha).toLowerCase()) {
      // P13.1 / P42 mutação 7 — o que está no ar não é o commit C.
      fail("SHA_MISMATCH", "/version.json", `deployado ${commitSha} ≠ esperado ${expectedSha}`);
    }
  }

  const environment = normalizeAppEnv(actual.environment);
  if (expectedAppEnv && !isQaCandidateAppEnv(environment)) {
    fail("BAD_ENVIRONMENT", "/version.json", `environment="${environment || "(vazio)"}" não é ${expectedAppEnv}`);
  }

  if (!String(actual.builtAt ?? "").trim()) {
    fail("NO_BUILT_AT", "/version.json", "builtAt ausente");
  }

  // P10.3 — identidade é pública e mínima; não vaza env nem credencial.
  const allowed = new Set(["commitSha", "appVersion", "environment", "builtAt"]);
  for (const key of Object.keys(actual)) {
    if (!allowed.has(key)) {
      fail("IDENTITY_OVERSHARE", `/version.json:${key}`, "identidade pública só expõe commitSha/appVersion/environment/builtAt");
    }
  }

  return { failures };
}

/** Headers que o candidate real precisa devolver (P30). Medidos, não inferidos. */
export const CANDIDATE_REQUIRED_HEADERS = [
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export { LONGYU_PRODUCTION_PROJECT_ID, LONGYU_PRODUCTION_PROJECT_NAME, extractProjectRef, isProductionProjectId };
