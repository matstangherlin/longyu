#!/usr/bin/env node
/**
 * Mutações de feature fantasma (P23 · 1, 2, 3, 13).
 *
 * As três primeiras são literalmente a /fala da RC1.4, reconstruída em
 * miniatura: CTA "Praticar com IA", paywall por trás dele, e — para quem já
 * pagava — um handler que responde "em breve". As três coexistiam na mesma
 * tela, e é por isso que o gate olha as três separadamente: consertar uma
 * delas e não as outras foi o que manteve o bug vivo por quatro remessas.
 */
import assert from "node:assert/strict";
import { validateGhostFeatures } from "./lib/rc1-5-gates.mjs";

const registry = {
  journey_learning: { id: "journey_learning", status: "available", because: "no ar" },
  daily_energy: { id: "daily_energy", status: "available", because: "no ar" },
  ai_roleplay: { id: "ai_roleplay", status: "coming_soon", because: "não existe" },
  tone_scoring: { id: "tone_scoring", status: "coming_soon", because: "não existe" },
};

const paywallCapability = { content: "journey_learning", energy: "daily_energy" };

/** A /fala de hoje: anuncia roadmap pelo registro e só cobra por energia. */
const HONEST_FALA = `
  import { FeatureRoadmapNote } from "../../components/product/FeatureRoadmapNote";
  function grade() {
    if (!consumeCharge("extra_training")) { setPaywallKind("energy"); return; }
    recordDailyTask("phrasesReviewed");
  }
  return <FeatureRoadmapNote capability="ai_roleplay" />;
`;

const base = {
  registry,
  paywallCapability,
  surfaceSources: { "src/features/fala/FalaPage.tsx": HONEST_FALA },
};

assert.deepEqual(validateGhostFeatures(base).failures, [], "controle positivo");

const mutations = [
  [
    "M1 — volta o CTA \"Praticar com IA\"",
    {
      ...base,
      surfaceSources: {
        "src/features/fala/FalaPage.tsx": `${HONEST_FALA}\n<Button>Praticar com IA</Button>`,
      },
    },
    "GHOST_CTA",
  ],
  [
    "M2 — a tela volta a abrir paywall para o recurso inexistente",
    {
      ...base,
      paywallCapability: { ...paywallCapability, speech: "ai_roleplay" },
      surfaceSources: {
        "src/features/fala/FalaPage.tsx": `${HONEST_FALA}\nonClick={() => setPaywallKind("speech")}`,
      },
    },
    "GHOST_PAYWALL",
  ],
  [
    "M2 — paywall de um tipo que ninguém mapeou",
    {
      ...base,
      surfaceSources: {
        "src/features/fala/FalaPage.tsx": `${HONEST_FALA}\nonClick={() => setPaywallKind("inventado")}`,
      },
    },
    "GHOST_PAYWALL",
  ],
  [
    'M3 — o assinante clica em "usar agora" e o handler responde "em breve"',
    {
      ...base,
      surfaceSources: {
        "src/features/fala/FalaPage.tsx": `${HONEST_FALA}
          <Button onClick={() => setSpeechNotice("Em breve, você poderá praticar conversas com IA.")}>
            Usar agora
          </Button>`,
      },
    },
    "COMING_SOON_HANDLER",
  ],
  [
    "M13 — a tela cita o recurso fantasma sem consultar o registro",
    {
      ...base,
      surfaceSources: {
        "src/features/fala/FalaPage.tsx": 'const label = isPro ? "ai_roleplay disponível" : "assine";',
      },
    },
    "HARDCODED_AVAILABILITY",
  ],
];

for (const [label, input, expected] of mutations) {
  const codes = validateGhostFeatures(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

// O gate não pode punir quem documenta o bug removido: o comentário que conta
// a história da RC1.4 cita "Praticar com IA" e precisa continuar passando.
const documented = validateGhostFeatures({
  ...base,
  surfaceSources: {
    "src/features/fala/FalaPage.tsx": `
      /**
       * RC1.5 — esta tela vendia "Fala com IA · Pro" e um botão "Praticar com IA"
       * que abria ProPaywall para um recurso que nem o assinante podia usar.
       */
      ${HONEST_FALA}`,
  },
});
assert.deepEqual(documented.failures, [], "comentário histórico não pode reprovar a tela honesta");
console.log("OK contexto: comentário que documenta o bug removido não reprova");

console.log("PASS test:ghost-features");
