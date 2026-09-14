#!/usr/bin/env node
/**
 * Mutações do registro de verdade.
 *
 * A mutação CLAIMS_BEYOND_EVIDENCE é a que importa: alguém marca o plano Pro
 * como disponível porque o código está pronto, e a tela passa a prometer uma
 * compra que ninguém consegue concluir. O P26.1 diz isso em palavras —
 * implementação verde não é evidência — e aqui vira verificação contra o
 * documento operacional de verdade.
 */
import assert from "node:assert/strict";
import { validateCommercialProductTruth } from "./lib/v410a1-gates.mjs";

const checks = { checks: { stripe_test_mode_e2e: { pass: false } } };
const registry = {
  journey: { id: "journey", availability: "available", because: "134 licoes no ar." },
  pro_individual: {
    id: "pro_individual",
    availability: "planned",
    gatedBy: "stripe_test_mode_e2e",
    because: "Checkout escrito, nenhum slot exercitado.",
  },
  family_plan: {
    id: "family_plan",
    availability: "planned",
    gatedBy: "stripe_test_mode_e2e",
    because: "Assentos prontos, falta poder comprar.",
  },
};
const base = {
  registry,
  operationalChecks: checks,
  paidCapabilities: ["pro_individual", "family_plan"],
  surfaceSources: { "src/features/pro/ProPage.tsx": 'import { productTruth } from "x";' },
};

assert.deepEqual(validateCommercialProductTruth(base).failures, [], "controle positivo");

const mutations = [
  [
    "plano pago se declara disponível sem o Stripe exercitado",
    {
      ...base,
      registry: { ...registry, pro_individual: { ...registry.pro_individual, availability: "available" } },
    },
    "CLAIMS_BEYOND_EVIDENCE",
  ],
  [
    "plano pago larga o check operacional para escapar da regra",
    {
      ...base,
      registry: { ...registry, family_plan: { id: "family_plan", availability: "available", because: "porque sim, ok" } },
    },
    "PAID_WITHOUT_GATE",
  ],
  [
    "estado inventado",
    { ...base, registry: { ...registry, journey: { ...registry.journey, availability: "beta" } } },
    "UNKNOWN_AVAILABILITY",
  ],
  [
    "entrada sem motivo declarado",
    { ...base, registry: { ...registry, journey: { id: "journey", availability: "available", because: "ok" } } },
    "NO_REASON",
  ],
  [
    "check que não existe na evidência",
    {
      ...base,
      registry: { ...registry, pro_individual: { ...registry.pro_individual, gatedBy: "stripe_inventado" } },
    },
    "UNKNOWN_CHECK",
  ],
  [
    "plano pago some do registro",
    { ...base, registry: { journey: registry.journey, pro_individual: registry.pro_individual } },
    "MISSING_PAID_CAPABILITY",
  ],
  [
    "a tela volta a afirmar disponibilidade por conta própria",
    { ...base, surfaceSources: { "src/features/pro/ProPage.tsx": 'const label = "Disponível";' } },
    "SURFACE_IGNORES_REGISTRY",
  ],
  ["registro vazio", { ...base, registry: {}, paidCapabilities: [] }, "EMPTY_REGISTRY"],
];

for (const [label, input, expected] of mutations) {
  const codes = validateCommercialProductTruth(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:commercial-product-truth");
