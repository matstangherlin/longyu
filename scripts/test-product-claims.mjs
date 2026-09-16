#!/usr/bin/env node
/**
 * Mutações de afirmação pública (P23 · 4, 16, 17, 18).
 *
 * A mutação 16 é a mais fácil de cometer sem má-fé: alguém traduz a copy
 * antiga e o EN volta a prometer "AI pronunciation feedback available now"
 * enquanto o PT-BR já está honesto. O mesmo produto mentindo em um idioma só
 * continua sendo o produto mentindo — a verdade da capacidade é comum, só a
 * copy é localizada (P17).
 */
import assert from "node:assert/strict";
import { validateProductClaims, validateClaimLocaleParity } from "./lib/rc1-5-gates.mjs";

const registry = {
  speech_recognition: { id: "speech_recognition", status: "beta", because: "Web Speech nativa." },
  ai_roleplay: { id: "ai_roleplay", status: "coming_soon", because: "não existe" },
  pronunciation_feedback: { id: "pronunciation_feedback", status: "coming_soon", because: "não existe" },
  tone_scoring: { id: "tone_scoring", status: "coming_soon", because: "não existe" },
};

const base = {
  registry,
  surfaceSources: {
    "src/features/fala/FalaPage.tsx": `
      <h2>O que este treino faz</h2>
      <p>Hànzì, pinyin e áudio de cada bloco, com revisão espaçada.</p>`,
  },
};

assert.deepEqual(validateProductClaims(base).failures, [], "controle positivo");

const mutations = [
  [
    "M17 — o SEO anuncia correção de pronúncia sem motor",
    {
      ...base,
      surfaceSources: {
        "src/lib/seo.ts": 'description: "Aprenda mandarim com correção de pronúncia frase por frase."',
      },
    },
    "PRONUNCIATION_CLAIM",
  ],
  [
    "M17 — a meta description em inglês promete pronunciation feedback",
    {
      ...base,
      surfaceSources: { "index.html": '<meta name="description" content="AI pronunciation feedback for Mandarin" />' },
    },
    "PRONUNCIATION_CLAIM",
  ],
  [
    "M4 — o reconhecimento de fala vira nota de pronúncia",
    {
      ...base,
      surfaceSources: { "src/features/lesson/PronunciationPractice.tsx": 'const label = "Sua pronúncia: 87% correta";' },
    },
    "PRONUNCIATION_CLAIM",
  ],
  [
    "M18 — nasce um Tone Score",
    { ...base, surfaceSources: { "src/features/som/SomPage.tsx": 'title: "Análise dos seus tons"' } },
    "TONE_SCORE_CLAIM",
  ],
  [
    "M1 — a landing volta a vender roleplays",
    { ...base, surfaceSources: { "src/features/landing/LandingPage.tsx": "<li>Roleplays guiados com IA</li>" } },
    "AI_CLAIM",
  ],
  [
    "M1/M12 — o selo Pro volta para cima do recurso inexistente",
    { ...base, surfaceSources: { "src/features/fala/FalaPage.tsx": '<div>Fala com IA · Pro</div>' } },
    "PRO_CLAIM",
  ],
  [
    "conversação com IA anunciada como disponível agora",
    {
      ...base,
      surfaceSources: { "src/features/pro/ProPage.tsx": '<li>Conversação com IA já disponível</li>' },
    },
    "AVAILABLE_CLAIM",
  ],
  [
    "promessa de fala em tempo real",
    {
      ...base,
      surfaceSources: { "src/features/pro/ProPage.tsx": '<p>Correção da sua fala em tempo real.</p>' },
    },
    "REALTIME_CLAIM",
  ],
];

for (const [label, input, expected] of mutations) {
  const codes = validateProductClaims(input).failures.map((failure) => failure.code);
  assert.ok(
    codes.includes(expected),
    `mutação "${label}" não detectada (esperado ${expected}, obtido ${codes.join(",") || "nenhum"})`
  );
  console.log(`KILLED ${label}: ${expected}`);
}

// Roadmap declarado continua permitido (P18.1): "IA" pode aparecer, desde que
// o texto ao redor diga que ainda não dá para usar.
const roadmap = validateProductClaims({
  ...base,
  surfaceSources: {
    "src/components/product/FeatureRoadmapNote.tsx": `
      <div>Em desenvolvimento</div>
      <div>Conversação com IA</div>
      <p>Ainda não existe no app. Quando existir, aparece aqui.</p>`,
  },
});
assert.deepEqual(roadmap.failures, [], "roadmap explícito não pode ser tratado como promessa");
console.log("OK contexto: roadmap declarado continua permitido (P18.1)");

// ——— M16 — divergência entre idiomas ——————————————————————————————
const locales = {
  "src/locales/pt-BR.ts": 'proFalaFeatures: "chunks ilimitados · revisão espaçada"',
  "src/locales/en.ts": 'proFalaFeatures: "unlimited chunks · spaced review"',
};
assert.deepEqual(
  validateClaimLocaleParity({ registry, locales }).failures,
  [],
  "controle positivo de paridade"
);

const divergent = validateClaimLocaleParity({
  registry,
  locales: { ...locales, "src/locales/en.ts": 'proFalaFeatures: "AI pronunciation feedback available now"' },
});
assert.ok(
  divergent.failures.some((failure) => failure.code === "LOCALE_PRONUNCIATION_CLAIM"),
  "M16 — EN divergindo do PT-BR não foi detectado"
);
console.log("KILLED M16 — o EN promete o que o PT-BR já parou de prometer: LOCALE_PRONUNCIATION_CLAIM");

console.log("PASS test:product-claims");
