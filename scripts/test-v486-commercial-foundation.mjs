#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-v486-"));
const require = createRequire(import.meta.url);

async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: relativePath,
  }).outputText;
  const target = path.join(temp, relativePath.replace(/\.ts$/, ".js"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output);
}

for (const file of [
  "src/commercial/billing.ts",
  "src/commercial/family.ts",
  "src/commercial/entitlements.ts",
  "src/locales/pt-BR.ts",
  "src/locales/en.ts",
]) await compile(file);

const billing = require(path.join(temp, "src/commercial/billing.js"));
const family = require(path.join(temp, "src/commercial/family.js"));
const entitlement = require(path.join(temp, "src/commercial/entitlements.js"));
const { ptBR } = require(path.join(temp, "src/locales/pt-BR.js"));
const { en } = require(path.join(temp, "src/locales/en.js"));

for (const [country, locale, market, currency] of [
  ["BR", "pt-BR", "BR", "BRL"], ["BR", "en", "BR", "BRL"],
  ["US", "en", "INTERNATIONAL", "USD"], ["US", "pt-BR", "INTERNATIONAL", "USD"],
  ["DE", "en", "INTERNATIONAL", "USD"], ["JP", "en", "INTERNATIONAL", "USD"],
]) {
  assert.equal(billing.billingMarketFromCountry(country), market, `${country} + ${locale}`);
  assert.equal(billing.billingCurrencyForMarket(market), currency, `${country} currency`);
}

assert.match(billing.formatBillingAmount(2990, "BRL", "pt-BR"), /R\$/);
assert.match(billing.formatBillingAmount(2990, "BRL", "en"), /R\$/);
assert.match(billing.formatBillingAmount(2990, "USD", "en"), /\$/);
assert.match(billing.formatBillingAmount(2990, "USD", "pt-BR"), /US\$/);
assert.equal(billing.calculateAnnualSavingsPercent(1000, 9000), 25);
assert.equal(billing.calculateAnnualSavingsPercent(0, 9000), null);

const pending = billing.resolveAllowedPrice({ plan: "pro", cycle: "monthly", billingCountry: "BR", returnPath: "/pro" });
assert.equal(pending.status, billing.PRICE_PENDING);
assert.equal(pending.currency, "BRL");

const configured = billing.buildServerPriceMatrix((name) => ({
  LONGYU_PRICE_PRO_MONTHLY_BR_MINOR: "2990",
  STRIPE_PRICE_PRO_MONTHLY_BR: "price_test_pro_br_monthly",
}[name]));
const allowed = billing.resolveAllowedPrice({ plan: "pro", cycle: "monthly", billingCountry: "BR", returnPath: "/pro" }, configured);
assert.equal(allowed.amountMinor, 2990);
assert.equal(allowed.providerPriceId, "price_test_pro_br_monthly");

for (const request of [
  { plan: "unknown", cycle: "monthly", billingCountry: "BR" },
  { plan: "pro", cycle: "weekly", billingCountry: "BR" },
  { plan: "pro", cycle: "monthly", billingCountry: "Brazil" },
  { plan: "pro", cycle: "monthly", billingCountry: "BR", clientPriceId: "price_evil" },
  { plan: "pro", cycle: "monthly", billingCountry: "BR", providerPriceId: "price_evil" },
  { plan: "pro", cycle: "monthly", billingCountry: "BR", currency: "USD" },
  { plan: "pro", cycle: "monthly", billingCountry: "BR", amountMinor: 1 },
  { plan: "pro", cycle: "monthly", billingCountry: "BR", billingMarket: "INTERNATIONAL" },
]) assert.throws(() => billing.resolveAllowedPrice(request), billing.BillingContractError);

function membership(familyId, userId, role = "member", status = "active") {
  return { familyId, userId, role, status, joinedAt: 1 };
}
const base = { id: "family-a", ownerUserId: "owner", memberships: [membership("family-a", "owner", "owner")] };
family.validateFamily(base);
assert.equal(family.activeFamilyMembers(base).length, 1, "owner counts as member");
let full = base;
for (const userId of ["u1", "u2", "u3", "u4"]) full = family.addFamilyMember(full, membership("family-a", userId));
assert.equal(family.activeFamilyMembers(full).length, family.FAMILY_MAX_MEMBERS);
assert.throws(() => family.addFamilyMember(full, membership("family-a", "u5")), /limit/i);
assert.throws(() => family.addFamilyMember(full, membership("family-a", "u1")), /already/i);
assert.throws(() => family.removeFamilyMember(full, "owner"), /ownership/i);
assert.throws(() => family.assertOneActiveFamilyPerUser([base, { id: "family-b", ownerUserId: "owner", memberships: [membership("family-b", "owner", "owner")] }]), /one active family/i);

assert.equal(entitlement.familyEntitlementForUser(full, "u1"), "FAMILY_MEMBER");
assert.equal(entitlement.grantsProFeatures("FAMILY_MEMBER"), true);
const removed = family.removeFamilyMember(full, "u1");
assert.equal(entitlement.familyEntitlementForUser(removed, "u1"), "FREE");
assert.equal(entitlement.familyEntitlementForUser(removed, "owner"), "FAMILY_MEMBER");

const ownerProgress = { lessonMasteryById: { m1: 4 }, SRS: ["a"], completedLessons: ["m1"], XP: 10, Qi: 20, streak: 3 };
const memberProgress = { lessonMasteryById: { m1: 1 }, SRS: ["b"], completedLessons: [], XP: 2, Qi: 4, streak: 1 };
const before = JSON.stringify({ ownerProgress, memberProgress });
family.removeFamilyMember(full, "u2");
assert.equal(JSON.stringify({ ownerProgress, memberProgress }), before, "membership operations cannot alter learning state");

for (const key of ["planFree", "planPro", "planFamily", "planBusiness", "planEnterprise", "pricePending", "monthlyLabel", "annualLabel", "forCompanies", "meetBusiness", "pricingHeadline"]) {
  assert.ok(ptBR.pro[key], `pt-BR pro.${key}`);
  assert.ok(en.pro[key], `en pro.${key}`);
}
assert.equal(ptBR.pro.planFamily, "Longyu Família");
assert.equal(en.pro.planFamily, "Longyu Family");

const proPage = await readFile(path.join(root, "src/features/pro/ProPage.tsx"), "utf8");
for (const forbidden of ["R$ 10", "R$ 24", "60% OFF", "30 dias grátis", "Escolha o plano", "Matriz completa"]) {
  assert.equal(proPage.includes(forbidden), false, `pricing UI must not hardcode ${forbidden}`);
}
assert.match(proPage, /data-testid="qa-billing-market-switch"/);
assert.match(proPage, /isQaFastPathAllowed/);

const checkout = await readFile(path.join(root, "supabase/functions/create-checkout-session/index.ts"), "utf8");
assert.match(checkout, /resolveAllowedPrice/);
assert.match(checkout, /sk_live_/);
assert.match(checkout, /resolvedCurrency/);
assert.doesNotMatch(checkout, /clientPriceId/);

console.log("PASS: V4.8.6 commercial pricing and Family contracts");
