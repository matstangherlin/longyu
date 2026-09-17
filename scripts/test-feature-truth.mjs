#!/usr/bin/env node
/**
 * Mutações do registro de capacidades (P23 · 2, 12, 14, 15, 19, 20).
 *
 * A mutação que importa é a 12: alguém decide que "o assinante deveria ter
 * acesso" e marca `ai_roleplay` como disponível. Nada foi construído — só a
 * promessa mudou de lugar. O registro existe para que essa mudança seja uma
 * linha revisável e não um `if (isPro)` espalhado por seis componentes.
 */
import assert from "node:assert/strict";
import {
  validateFeatureTruth,
  validateRc15Freeze,
  RC15_FREEZE,
} from "./lib/rc1-5-gates.mjs";

const registry = {
  journey_learning: {
    id: "journey_learning",
    status: "available",
    because: "134 lições no ar, congeladas por fingerprint.",
    gatedBy: "content",
  },
  review_remediation: {
    id: "review_remediation",
    status: "available",
    because: "Revisão finita com resposta canônica desde a RC1.3.",
    gatedBy: "review",
  },
  tone_contrast_training: {
    id: "tone_contrast_training",
    status: "available",
    because: "Contraste tonal por par mínimo, sem pontuar acústica.",
  },
  tts_playback: {
    id: "tts_playback",
    status: "available",
    because: "Web Speech API do navegador, sem síntese própria.",
  },
  speech_recognition: {
    id: "speech_recognition",
    status: "beta",
    because: "Existe em Chrome/Edge com HTTPS; devolve texto, nunca acústica.",
  },
  family_management: {
    id: "family_management",
    status: "beta",
    offer: "family_plan",
    because: "Assentos funcionam; a assinatura ainda não pode ser comprada.",
  },
  ai_roleplay: {
    id: "ai_roleplay",
    status: "coming_soon",
    because: "Não existe conversação com IA: nenhum modelo, nenhum backend.",
  },
  pronunciation_feedback: {
    id: "pronunciation_feedback",
    status: "coming_soon",
    because: "Não existe analisador acústico no produto, e comparar texto não é avaliar.",
  },
  tone_scoring: {
    id: "tone_scoring",
    status: "coming_soon",
    because: "Não existe Tone Analyzer: nada mede f0, contorno ou duração.",
  },
};

const base = {
  registry,
  paywallCapability: { content: "journey_learning", review: "review_remediation" },
  paywallKinds: ["content", "review"],
  productTruth: {
    family_plan: { id: "family_plan", availability: "planned" },
  },
  surfaceSources: { "src/features/fala/FalaPage.tsx": 'featureStatus("ai_roleplay")' },
};

assert.deepEqual(validateFeatureTruth(base).failures, [], "controle positivo");

const mutations = [
  [
    "M12 — o status Pro promove um recurso inexistente a disponível",
    { ...base, registry: { ...registry, ai_roleplay: { ...registry.ai_roleplay, status: "available" } } },
    "CLAIMS_BEYOND_IMPLEMENTATION",
  ],
  [
    "M4/M18 — pontuação de tom se declara pronta sem motor acústico",
    { ...base, registry: { ...registry, tone_scoring: { ...registry.tone_scoring, status: "beta" } } },
    "CLAIMS_BEYOND_IMPLEMENTATION",
  ],
  [
    "M2 — recurso coming_soon ganha um paywall próprio",
    {
      ...base,
      registry: { ...registry, ai_roleplay: { ...registry.ai_roleplay, gatedBy: "speech" } },
    },
    "PAYWALL_ON_UNBUILT",
  ],
  [
    "M2 — o paywall volta a apontar para a conversação com IA",
    {
      ...base,
      paywallCapability: { ...base.paywallCapability, speech: "ai_roleplay" },
      paywallKinds: [...base.paywallKinds, "speech"],
    },
    "PAYWALL_FOR_GHOST",
  ],
  [
    "paywall sem capacidade nenhuma no registro",
    { ...base, paywallKinds: [...base.paywallKinds, "orphan"] },
    "PAYWALL_WITHOUT_CAPABILITY",
  ],
  [
    "mapeamento sobra depois de o paywall ser removido",
    { ...base, paywallCapability: { ...base.paywallCapability, speech: "ai_roleplay" } },
    "STALE_PAYWALL_MAPPING",
  ],
  [
    "M12 — a tela deriva disponibilidade do estado Pro",
    {
      ...base,
      surfaceSources: { "src/features/fala/FalaPage.tsx": "const status = isPro ? available : coming_soon;" },
    },
    "PRO_IMPLIES_FEATURE",
  ],
  [
    "M14/M15 — a capacidade inventa uma oferta que o PRODUCT_TRUTH não tem",
    {
      ...base,
      registry: { ...registry, family_management: { ...registry.family_management, offer: "family_ilimitado" } },
    },
    "UNKNOWN_OFFER",
  ],
  [
    "capacidade sem motivo declarado",
    { ...base, registry: { ...registry, tts_playback: { id: "tts_playback", status: "available", because: "ok" } } },
    "NO_REASON",
  ],
  [
    "estado inventado",
    { ...base, registry: { ...registry, tts_playback: { ...registry.tts_playback, status: "quase" } } },
    "UNKNOWN_STATUS",
  ],
  [
    "a capacidade que gerou o bug some do registro",
    { ...base, registry: Object.fromEntries(Object.entries(registry).filter(([id]) => id !== "ai_roleplay")) },
    "MISSING_CAPABILITY",
  ],
  ["registro vazio", { ...base, registry: {}, paywallKinds: [] }, "EMPTY_REGISTRY"],
];

for (const [label, input, expected] of mutations) {
  const codes = validateFeatureTruth(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

// ——— M19/M20 — congelamento de currículo e planner ————————————————————
const freezeBase = {
  fingerprint: RC15_FREEZE.fingerprint,
  counts: { lessons: RC15_FREEZE.lessons, teachingTopics: RC15_FREEZE.teachingTopics },
  forbiddenPaths: [],
};
assert.deepEqual(validateRc15Freeze(freezeBase).failures, [], "controle positivo do freeze");

const freezeMutations = [
  [
    "M19/M20 — o fingerprint da jornada muda (currículo ou planner mexido)",
    { ...freezeBase, fingerprint: "deadbeef1234" },
    "FINGERPRINT",
  ],
  ["M19 — aparece uma lição nova", { ...freezeBase, counts: { lessons: 135, teachingTopics: 113 } }, "LESSONS"],
  ["M19 — aparece um tema novo", { ...freezeBase, counts: { lessons: 134, teachingTopics: 114 } }, "TOPICS"],
  [
    "a remessa abre escopo que prometeu não abrir",
    { ...freezeBase, forbiddenPaths: ["src/lib/toneAnalyzer.ts"] },
    "SCOPE",
  ],
];

for (const [label, input, expected] of freezeMutations) {
  const codes = validateRc15Freeze(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

console.log("PASS test:feature-truth");
