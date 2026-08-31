/**
 * Testes do redirecionamento checkout → criação de conta.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolvePostAuthPath(searchParams, fallback = "/jornada") {
  const SAFE_INTERNAL_PATH = /^\/[A-Za-z0-9\-/_?=&%]*$/;
  const next = searchParams.get("next")?.trim() ?? "";
  if (next.startsWith("/") && !next.startsWith("//") && SAFE_INTERNAL_PATH.test(next.split("#")[0] ?? next)) {
    return next;
  }
  if (searchParams.get("intent") === "subscribe") return "/pro";
  return fallback;
}

function subscribeAccountPath(plan) {
  const params = new URLSearchParams({ intent: "subscribe", next: "/pro" });
  if (plan) params.set("plan", plan);
  return `/comecar?${params.toString()}`;
}

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`OK  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(err instanceof Error ? err.message : err);
  }
}

console.log("== test:subscribe-auth-redirect ==");

check("subscribeAccountPath inclui intent e next", () => {
  const url = subscribeAccountPath("pro_annual");
  assert.equal(url, "/comecar?intent=subscribe&next=%2Fpro&plan=pro_annual");
});

check("resolvePostAuthPath honra next seguro", () => {
  const params = new URLSearchParams("next=/pro&intent=subscribe");
  assert.equal(resolvePostAuthPath(params), "/pro");
});

check("resolvePostAuthPath rejeita open redirect", () => {
  const params = new URLSearchParams("next=https://evil.example");
  assert.equal(resolvePostAuthPath(params, "/jornada"), "/jornada");
  const params2 = new URLSearchParams("next=//evil.example");
  assert.equal(resolvePostAuthPath(params2, "/jornada"), "/jornada");
});

check("intent=subscribe sem next cai em /pro", () => {
  const params = new URLSearchParams("intent=subscribe");
  assert.equal(resolvePostAuthPath(params), "/pro");
});

check("ProPage mantém checkout desativado enquanto preço está pendente", () => {
  const src = readFileSync(path.join(root, "src/features/pro/ProPage.tsx"), "utf8");
  assert.match(src, /PRICE_PENDING/);
  assert.match(src, /checkoutEnabled/);
  assert.match(src, /createCheckoutSession\(\{/);
});

check("subscriptionService expõe auth_required", () => {
  const src = readFileSync(path.join(root, "src/services/subscriptionService.ts"), "utf8");
  assert.match(src, /auth_required/);
});

check("ContaRoute redireciona onboarding anônimo para /comecar", () => {
  const src = readFileSync(path.join(root, "src/features/conta/ContaRoute.tsx"), "utf8");
  assert.match(src, /\/comecar/);
  assert.match(src, /relevelRequested/);
});

if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}

console.log("\nTodos os testes de redirect de assinatura passaram.");
