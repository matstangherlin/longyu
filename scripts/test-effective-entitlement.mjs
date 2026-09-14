#!/usr/bin/env node
/**
 * P26 / P27 — união de entitlement, e o que ela não pode fazer.
 *
 * O erro caro aqui não é negar acesso a quem tem: é uma origem cancelar outra.
 * Se a assinatura da empresa expirar e isso derrubar o Pro pessoal de alguém
 * que paga do próprio bolso, a pessoa perde acesso que comprou. Metade das
 * asserções abaixo existe só para impedir esse caso.
 */
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const temp = await mkdtemp(path.join(os.tmpdir(), "longyu-entitlement-"));
const require = createRequire(import.meta.url);

async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: relativePath,
  }).outputText;
  const target = path.join(temp, relativePath.replace(/\.tsx?$/, ".js"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, output);
}

for (const file of [
  "src/lib/accessTier.ts",
  "src/commercial/billing.ts",
  "src/commercial/family.ts",
  "src/commercial/entitlements.ts",
]) await compile(file);

const { resolveEffectiveEntitlement } = require(path.join(temp, "src/commercial/entitlements.js"));

const NOW = 1_800_000_000_000;
const live = (source, extra = {}) => ({ source, active: true, ...extra });

// Sem origem nenhuma: Free, e nada de premium por engano.
const none = resolveEffectiveEntitlement({ candidates: [], now: NOW });
assert.equal(none.premiumAccess, false);
assert.equal(none.tier, "free");
assert.equal(none.source, "none");
assert.deepEqual(none.activeSources, []);
console.log("OK sem origem ativa não há acesso");

// P26.1 — qualquer origem ativa concede Pro, e a origem continua identificada.
for (const source of [
  "individual_subscription",
  "family_membership",
  "business_seat",
  "enterprise_seat",
  "promotion",
  "pearl",
  "internal",
]) {
  const resolved = resolveEffectiveEntitlement({ candidates: [live(source)], now: NOW });
  assert.equal(resolved.premiumAccess, true, `${source} precisa conceder acesso`);
  assert.equal(resolved.source, source, `${source} precisa continuar identificada`);
  assert.deepEqual(resolved.activeSources, [source]);
}
console.log("OK as sete origens concedem acesso e preservam a identificação");

// Empresa aparece com a organização junto, como o P26.1 pede.
const business = resolveEffectiveEntitlement({
  candidates: [live("business_seat", { organizationId: "org-acme", organizationRole: "learner" })],
  now: NOW,
});
assert.equal(business.tier, "business");
assert.equal(business.organizationId, "org-acme");
assert.equal(business.organizationRole, "learner");
console.log("OK origem empresarial carrega organizationId e papel");

// P27 — coexistência. Nenhuma origem cancela a outra.
const both = resolveEffectiveEntitlement({
  candidates: [live("individual_subscription"), live("family_membership")],
  now: NOW,
});
assert.equal(both.premiumAccess, true);
assert.deepEqual(
  both.activeSources,
  ["individual_subscription", "family_membership"],
  "as duas origens precisam continuar visíveis"
);
console.log("OK assinatura pessoal e Family coexistem sem se cancelar");

// P27.1 — a empresa expira e a assinatura pessoal segura o acesso.
const businessExpired = resolveEffectiveEntitlement({
  candidates: [
    { source: "business_seat", active: true, expiresAt: NOW - 1, organizationId: "org-acme" },
    live("individual_subscription"),
  ],
  now: NOW,
});
assert.equal(businessExpired.premiumAccess, true, "expirar a empresa não pode derrubar o Pro pessoal");
assert.equal(businessExpired.source, "individual_subscription");
assert.deepEqual(businessExpired.activeSources, ["individual_subscription"]);
assert.equal(businessExpired.organizationId, undefined, "organização expirada não pode continuar colada");
console.log("OK empresa expirada não derruba assinatura pessoal");

// E o simétrico: a pessoal expira, a empresa segura.
const personalExpired = resolveEffectiveEntitlement({
  candidates: [
    { source: "individual_subscription", active: true, expiresAt: NOW - 1 },
    live("business_seat", { organizationId: "org-acme" }),
  ],
  now: NOW,
});
assert.equal(personalExpired.premiumAccess, true);
assert.equal(personalExpired.source, "business_seat");
console.log("OK assinatura pessoal expirada não derruba acesso pela empresa");

// Family cancelada não pode continuar dando Pro (mutação 17 do contrato).
const familyCanceled = resolveEffectiveEntitlement({
  candidates: [{ source: "family_membership", active: false }],
  now: NOW,
});
assert.equal(familyCanceled.premiumAccess, false, "Family cancelada não concede acesso");
console.log("OK Family cancelada deixa de conceder acesso");

// Organização inativa idem (mutação 16).
const orgInactive = resolveEffectiveEntitlement({
  candidates: [{ source: "business_seat", active: false, organizationId: "org-acme" }],
  now: NOW,
});
assert.equal(orgInactive.premiumAccess, false, "organização inativa não concede acesso");
assert.equal(orgInactive.organizationId, undefined);
console.log("OK organização inativa deixa de conceder acesso");

// Prazo exatamente no limite conta como expirado — não dá meio segundo de graça.
assert.equal(
  resolveEffectiveEntitlement({
    candidates: [{ source: "individual_subscription", active: true, expiresAt: NOW }],
    now: NOW,
  }).premiumAccess,
  false
);
console.log("OK prazo no instante exato já está expirado");

// Ordem de precedência é determinística, não depende da ordem de chegada.
const shuffled = resolveEffectiveEntitlement({
  candidates: [live("pearl"), live("family_membership"), live("enterprise_seat"), live("individual_subscription")],
  now: NOW,
});
assert.equal(shuffled.source, "enterprise_seat");
assert.deepEqual(shuffled.activeSources, [
  "enterprise_seat",
  "individual_subscription",
  "family_membership",
  "pearl",
]);
console.log("OK precedência é determinística e independe da ordem de entrada");

console.log("PASS test:effective-entitlement");
