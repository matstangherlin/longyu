#!/usr/bin/env node
/**
 * Mutações 16–21 do contrato: upsell, texto de sync, dois CTAs, elogio falso,
 * som com mute e animação ignorando reduced-motion.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook, validateVictoryMinimalism } from "./lib/rc1-1-gates.mjs";

const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(rel, "utf8");
installTsRequireHook();
const summaryModule = require(path.join(process.cwd(), "src/features/lesson/buildLessonCompletionSummary.ts"));

const base = {
  victorySource: read("src/features/lesson/LessonVictory.tsx"),
  playerSource: read("src/features/lesson/LessonPlayer.tsx"),
  summarySource: read("src/features/lesson/buildLessonCompletionSummary.ts"),
  summaryModule,
};

assert.deepEqual(validateVictoryMinimalism(base).failures, [], "controle positivo");

const mutations = [
  [
    "Victory volta a mostrar oferta Pro",
    { victorySource: base.victorySource.replace("<section", '<ProOfferBanner />\n      <section') },
    "PRO_UPSELL",
  ],
  [
    "Victory volta a mostrar estado de sincronização",
    { victorySource: base.victorySource.replace("<section", "{saveStatusLabel}\n      <section") },
    "SYNC_TEXT",
  ],
  [
    // Markup de verdade: o gate ignora comentários de propósito, então uma
    // mutação comentada não provaria nada.
    "Victory ganha um segundo CTA primário",
    { victorySource: base.victorySource.replace("<section", "<button data-victory-primary />\n      <section") },
    "CTA_COUNT",
  ],
  [
    "Victory volta a ter CTA secundário de erros",
    { victorySource: base.victorySource.replace("<section", "<button data-victory-review-errors />\n      <section") },
    "CTA_COUNT",
  ],
  [
    "Victory volta a virar dashboard de missões",
    { victorySource: base.victorySource.replace("<section", "{t(\"player.missionsUpdated\")}\n      <section") },
    "MISSIONS",
  ],
  [
    "Victory ganha acordeão",
    { victorySource: base.victorySource.replace("<section", "<details />\n      <section") },
    "ACCORDION",
  ],
  [
    "Victory ganha nav inferior",
    { victorySource: base.victorySource.replace("<section", "{t(\"player.navReview\")}\n      <section") },
    "BOTTOM_NAV",
  ],
  [
    "animação ignora prefers-reduced-motion",
    { victorySource: base.victorySource.replaceAll("prefers-reduced-motion", "prefers-anything") },
    "REDUCED_MOTION",
  ],
  [
    "som toca mesmo com mute",
    { victorySource: base.victorySource.replaceAll("soundEffects", "alwaysOn") },
    "SOUND",
  ],
  [
    "efeitos repetem a cada render",
    { victorySource: base.victorySource.replaceAll("playedRef", "noGuard") },
    "REPLAY",
  ],
  [
    "destaque volta a elogiar precisão ruim",
    {
      summaryModule: {
        buildLessonCompletionSummary: (input) => ({
          ...summaryModule.buildLessonCompletionSummary(input),
          highlight: `Precisão de ${Math.round(input.accuracy)}%.`,
          hasRealStrength: true,
        }),
      },
    },
    "FAKE_STRENGTH",
  ],
  [
    "sessão ruim fica sem foco",
    {
      summaryModule: {
        buildLessonCompletionSummary: (input) => ({
          ...summaryModule.buildLessonCompletionSummary(input),
          focus: undefined,
        }),
      },
    },
    "FOCUS",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateVictoryMinimalism({ ...base, ...patch }).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// ── Comportamento real do resumo (P14.4/P14.6) ────────────────────────────
const { buildLessonCompletionSummary } = summaryModule;

// Mutação 19: "ponto forte: precisão de 20%".
const terrible = buildLessonCompletionSummary({ accuracy: 20, errorCount: 8, mistakesBySkill: { tone: 4 } });
assert.equal(terrible.hasRealStrength, false, "20% não é ponto forte");
assert.ok(!/20/.test(terrible.highlight), `destaque não pode citar 20%: ${terrible.highlight}`);
assert.match(terrible.highlight, /concluiu a prática/, "sessão ruim recebe constatação neutra");
assert.match(terrible.focus ?? "", /Tons/, "P14.5: o foco aponta o que reforçar");

// Um resultado bom mantém o destaque — o gate não pode ser um veto geral.
const good = buildLessonCompletionSummary({ accuracy: 85, errorCount: 1, mistakesBySkill: { tone: 1 } });
assert.equal(good.hasRealStrength, true, "85% de precisão é evidência positiva real");

const perfect = buildLessonCompletionSummary({ accuracy: 100, errorCount: 0, displayName: "Ana" });
assert.equal(perfect.perfect, true);
assert.equal(perfect.hasRealStrength, true);
assert.ok(!perfect.focus, "sessão perfeita não precisa de foco");
assert.match(perfect.greeting ?? "", /Ana/);

// P14.1 — no máximo um destaque e um foco.
for (const input of [
  { accuracy: 10, errorCount: 9, mistakesBySkill: { tone: 3, hanzi: 2, listening: 1 } },
  { accuracy: 55, errorCount: 4, mistakesBySkill: { production: 2 } },
]) {
  const summary = buildLessonCompletionSummary(input);
  assert.equal(typeof summary.highlight, "string");
  assert.ok(summary.focus === undefined || typeof summary.focus === "string");
}

// EN mantém o mesmo contrato.
const en = buildLessonCompletionSummary({ accuracy: 20, errorCount: 8, locale: "en" });
assert.equal(en.hasRealStrength, false);
assert.match(en.highlight, /finished the practice/);

console.log("PASS test:victory-minimalism");
