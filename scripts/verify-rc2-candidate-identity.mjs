#!/usr/bin/env node
/**
 * RC2.2 — Deployment identity gate (P37) + medição real do candidate publicado.
 *
 * Entrada:  RC2_CANDIDATE_URL (ou --url), RC2_EXPECTED_SHA (ou --sha,
 *           default: candidateSha do manifesto).
 * Saída:    expected SHA · actual SHA · environment · backend mode · headers
 *           reais · refresh de rota profunda · manifest/SW do PWA.
 *
 * A URL do candidate NÃO é hardcoded em código de runtime (P37.1). Ela vem do
 * ambiente ou do manifesto de release, que é config, não bundle.
 *
 * Sem URL → BLOCKED_CREDENTIALS e exit 2. Não inventa, não marca nada como
 * verificado. Este script mede; ele não escreve manifesto nenhum.
 */
import process from "node:process";
import {
  BLOCKED_CREDENTIALS,
  CANDIDATE_REQUIRED_HEADERS,
  isProductionProjectId,
  maskProjectRef,
  validateCandidateIdentity,
} from "./lib/rc2-candidate-infra.mjs";
import { loadRc2CandidateManifest } from "./lib/rc2-content-freeze.mjs";

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** Rotas SPA profundas: refresh direto não pode dar 404 do Netlify (P29). */
const DEEP_ROUTES = ["/jornada", "/cultura", "/cultura/colecao/china_history", "/perfil"];

const manifest = loadRc2CandidateManifest(process.cwd()) ?? {};
const baseUrl = String(argValue("--url") ?? process.env.RC2_CANDIDATE_URL ?? manifest.deploymentUrl ?? "").trim();
const expectedSha = String(argValue("--sha") ?? process.env.RC2_EXPECTED_SHA ?? manifest.candidateSha ?? "").trim();

if (!baseUrl) {
  console.error(`${BLOCKED_CREDENTIALS} verify:rc2-candidate-identity`);
  console.error("  Falta: URL do candidate publicado (RC2_CANDIDATE_URL ou --url).");
  console.error("  Nada foi verificado. Não marque candidateSha nem release_candidate_sha.");
  process.exit(2);
}

if (!/^https:\/\//i.test(baseUrl)) {
  console.error(`ERRO: candidate URL precisa ser HTTPS (P19). Recebido: ${baseUrl}`);
  process.exit(1);
}

const failures = [];
const report = {
  candidateUrl: baseUrl,
  expectedSha: expectedSha || null,
  actual: null,
  headers: {},
  deepRoutes: {},
  pwa: {},
  checkedAt: new Date().toISOString(),
};

function fail(code, where, why) {
  failures.push({ code, where, why });
}

async function get(pathname, init = {}) {
  const url = new URL(pathname, baseUrl).toString();
  return fetch(url, { redirect: "follow", ...init });
}

// ── P10/P11/P13.1 — identidade do deploy ──────────────────────────────────────
let identityJson = null;
try {
  const response = await get("/version.json", { cache: "no-store" });
  if (!response.ok) {
    fail("IDENTITY_HTTP", "/version.json", `HTTP ${response.status}`);
  } else {
    identityJson = await response.json();
    report.actual = identityJson;
  }
} catch (error) {
  fail("IDENTITY_FETCH", "/version.json", error instanceof Error ? error.message : String(error));
}

if (identityJson) {
  const { failures: identityFailures } = validateCandidateIdentity({ actual: identityJson, expectedSha });
  failures.push(...identityFailures);
}

// ── P30 — headers medidos no deploy real, não inferidos do netlify.toml ───────
try {
  const response = await get("/", { cache: "no-store" });
  for (const header of CANDIDATE_REQUIRED_HEADERS) {
    const value = response.headers.get(header);
    report.headers[header] = value;
    if (!value) fail("MISSING_HEADER", header, "header de segurança ausente no deploy real");
  }
  const csp = report.headers["content-security-policy"] ?? "";
  // O candidate fala com o Supabase QA: connect-src precisa permitir supabase.co.
  if (csp && !/connect-src[^;]*supabase\.co/.test(csp)) {
    fail("CSP_NO_SUPABASE", "content-security-policy", "connect-src não permite supabase.co — auth/sync falhariam");
  }
} catch (error) {
  fail("ROOT_FETCH", "/", error instanceof Error ? error.message : String(error));
}

for (const swPath of ["/sw.js", "/manifest.webmanifest"]) {
  try {
    const response = await get(swPath, { cache: "no-store" });
    const cacheControl = response.headers.get("cache-control");
    report.headers[`${swPath}:cache-control`] = cacheControl;
    report.pwa[swPath] = response.status;
    if (!response.ok) fail("PWA_ASSET", swPath, `HTTP ${response.status}`);
    // P31 — SW/manifest servidos com cache agressivo travam o upgrade N→N+1.
    if (response.ok && !/no-cache|no-store|max-age=0/i.test(cacheControl ?? "")) {
      fail("PWA_CACHE", swPath, `Cache-Control="${cacheControl ?? "(ausente)"}" — upgrade de PWA fica preso`);
    }
  } catch (error) {
    fail("PWA_FETCH", swPath, error instanceof Error ? error.message : String(error));
  }
}

// ── P29 — refresh direto em rota profunda não pode dar 404 ────────────────────
for (const route of DEEP_ROUTES) {
  try {
    const response = await get(route, { cache: "no-store" });
    report.deepRoutes[route] = response.status;
    if (response.status === 404) fail("SPA_404", route, "refresh direto devolveu 404 (redirect SPA ausente)");
    else if (!response.ok) fail("SPA_HTTP", route, `HTTP ${response.status}`);
  } catch (error) {
    fail("SPA_FETCH", route, error instanceof Error ? error.message : String(error));
  }
}

// ── P26/P42 mutação 3 — o candidate não pode falar com o Supabase de produção ─
try {
  const response = await get("/", { cache: "no-store" });
  const html = await response.text();
  const refs = new Set();
  for (const match of html.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/gi)) refs.add(match[1].toLowerCase());
  report.supabaseRefsInHtml = [...refs].map((ref) => maskProjectRef(ref));
  for (const ref of refs) {
    if (isProductionProjectId(ref)) {
      fail("PRODUCTION_REF_IN_CANDIDATE", "/", "candidate serve o project ref de PRODUÇÃO");
    }
  }
} catch {
  /* já reportado acima */
}

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  console.error("\nFAIL verify:rc2-candidate-identity");
  for (const failure of failures) console.error(`  - [${failure.code}] ${failure.where}: ${failure.why}`);
  process.exit(1);
}

console.log(`\nPASS verify:rc2-candidate-identity — ${baseUrl} reporta ${identityJson?.commitSha}`);
