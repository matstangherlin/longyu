#!/usr/bin/env node
/**
 * Mutações 1–5 e 18 do contrato V4.10A.
 *
 * Cada mutação move o contrato comercial para um estado que alguém poderia
 * introduzir sem querer — preço trocado, anual que não fecha, Price ID
 * vazando para o cliente — e exige que o gate recuse.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import {
  validateCommercialPricing,
  validateNoStripeIdsInClient,
  loadSource,
} from "./lib/v410a-gates.mjs";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-v410a-test-"));
const require = createRequire(import.meta.url);

const relative = "src/commercial/billing.ts";
const billingSource = await readFile(path.join(root, relative), "utf8");
const output = ts.transpileModule(billingSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  fileName: relative,
}).outputText;
const target = path.join(temp, "billing.js");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, output);
const billing = require(target);

const base = {
  catalog: billing.PUBLIC_COMMERCIAL_CATALOG,
  billingSource,
};

assert.deepEqual(
  validateCommercialPricing(base).failures,
  [],
  "controle positivo: o contrato real precisa passar"
);

function withPrice(plan, market, cycle, amountMinor) {
  const catalog = structuredClone(billing.PUBLIC_COMMERCIAL_CATALOG);
  catalog[plan][market][cycle].amountMinor = amountMinor;
  return { ...base, catalog };
}

const mutations = [
  ["Individual BR deixa de ser R$17", withPrice("pro", "BR", "monthly", 1690), "PRICE_NOT_APPROVED"],
  ["Family BR deixa de ser R$27", withPrice("family", "BR", "monthly", 2690), "PRICE_NOT_APPROVED"],
  ["Individual internacional deixa de ser US$5", withPrice("pro", "INTERNATIONAL", "monthly", 499), "PRICE_NOT_APPROVED"],
  ["Family internacional deixa de ser US$8", withPrice("family", "INTERNATIONAL", "monthly", 799), "PRICE_NOT_APPROVED"],
  ["anual deixa de equivaler a dez meses", withPrice("pro", "BR", "annual", 18_000), "ANNUAL_NOT_TEN_MONTHS"],
  [
    "moeda do mercado é trocada",
    (() => {
      const catalog = structuredClone(billing.PUBLIC_COMMERCIAL_CATALOG);
      catalog.pro.BR.monthly.currency = "USD";
      return { ...base, catalog };
    })(),
    "CURRENCY_MISMATCH",
  ],
  [
    "Stripe Price ID entra no catálogo público",
    (() => {
      const catalog = structuredClone(billing.PUBLIC_COMMERCIAL_CATALOG);
      catalog.pro.BR.monthly.providerPriceId = "price_1RealLooking";
      return { ...base, catalog };
    })(),
    "PRICE_ID_IN_PUBLIC_CATALOG",
  ],
  [
    "preço passa a sair de cotação de câmbio",
    { ...base, billingSource: `${billingSource}\nexport const exchangeRate = 5.2;\n` },
    "FX_CONVERSION",
  ],
  [
    "cliente volta a poder mandar priceId",
    { ...base, billingSource: billingSource.replaceAll('"priceId",', "") },
    "CLIENT_AUTHORITY_UNGUARDED",
  ],
  [
    "cliente volta a poder mandar desconto",
    { ...base, billingSource: billingSource.replaceAll('"discount",', "") },
    "CLIENT_AUTHORITY_UNGUARDED",
  ],
  [
    "a guarda de autoridade do cliente some inteira",
    { ...base, billingSource: billingSource.replaceAll("assertNoClientPriceAuthority", "naoChecaNada") },
    "NO_CLIENT_AUTHORITY_GUARD",
  ],
];

for (const [label, input, expectedCode] of mutations) {
  const codes = validateCommercialPricing(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expectedCode),
    `mutação "${label}" não detectada (esperado ${expectedCode}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// Price ID literal e chave secreta no cliente.
const clientReal = Object.fromEntries(
  ["src/commercial/billing.ts", "src/features/pro/ProPage.tsx"].map((file) => [file, loadSource(file)])
);
assert.deepEqual(
  validateNoStripeIdsInClient({ clientSources: clientReal }).failures,
  [],
  "controle positivo: o cliente real não carrega Price ID"
);

for (const [label, injected, expectedCode] of [
  ["Price ID literal no cliente", 'const p = "price_1QabcdEFGH";', "STRIPE_ID_IN_CLIENT"],
  ["chave secreta do Stripe no cliente", 'const k = "sk_test_abc123";', "STRIPE_SECRET_IN_CLIENT"],
]) {
  const codes = validateNoStripeIdsInClient({
    clientSources: { "src/features/pro/ProPage.tsx": injected },
  }).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (${codes.join(",") || "nenhum"})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// Mutação 18 do contrato: o cliente manda o preço e o servidor precisa recusar.
for (const field of ["priceId", "providerPriceId", "amountMinor", "currency", "discount", "coupon", "promotionCode"]) {
  assert.throws(
    () => billing.resolveAllowedPrice({ plan: "pro", cycle: "monthly", billingCountry: "BR", [field]: "x" }),
    billing.BillingContractError,
    `cliente mandando ${field} precisa ser recusado`
  );
}
console.log("KILLED cliente enviando preço/desconto ao checkout: CLIENT_PRICE_OVERRIDE");

// Anual é dez meses, e a copy sai do cálculo — não de um número fixo.
assert.equal(billing.freeMonthsOnAnnual(1700, 17_000), 2, "anual precisa dar exatamente 2 meses grátis");
assert.equal(billing.calculateAnnualSavingsPercent(1700, 17_000), 17, "economia real é 17%");
assert.equal(billing.freeMonthsOnAnnual(1700, 17_500), null, "anual que não fecha não promete mês grátis");
console.log("OK anual = 10 meses → 2 meses grátis, 17% real");

console.log("PASS test:commercial-pricing");
