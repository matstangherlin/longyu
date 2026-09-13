#!/usr/bin/env node
/**
 * Mutações de P6/P10/P11 — gatilho, média e unicidade do Reforço +.
 *
 * As mutações 9 a 15 do contrato RC1.1 vivem aqui: Plus com média 2.5, Plus
 * ausente com 2.0, tema dominado antes da Plus, Plus infinita e farm de XP.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook, validateAdaptivePlusRound } from "./lib/rc1-1-gates.mjs";

const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(rel, "utf8");
installTsRequireHook();
const plus = require(path.join(process.cwd(), "src/features/lesson/plusRound.ts"));

const base = {
  plusSource: read("src/features/lesson/plusRound.ts"),
  playerSource: read("src/features/lesson/LessonPlayer.tsx"),
  detailSource: read("src/features/lesson/LessonDetailPage.tsx"),
  plusModule: plus,
};

assert.deepEqual(validateAdaptivePlusRound(base).failures, [], "controle positivo");

const mutations = [
  [
    "Plus aparece com média 2.5",
    { plusModule: { ...plus, needsPlusRound: (average) => average != null && average <= 2.6 } },
    "TRIGGER",
  ],
  [
    "Plus não aparece com média 2.0",
    { plusModule: { ...plus, needsPlusRound: (average) => average != null && average < 2.0 } },
    "TRIGGER",
  ],
  [
    "tema marcado como dominado antes da Plus",
    { plusModule: { ...plus, topicMasteryPhase: () => "mastered" } },
    "NOT_MASTERED",
  ],
  [
    "Plus pode reaparecer para sempre",
    { plusModule: { ...plus, plusRoundAvailable: () => true } },
    "PLUS_ONCE",
  ],
  [
    "média calculada antes das quatro rodadas",
    { plusModule: { ...plus, topicAverageStars: () => 2 } },
    "AVERAGE",
  ],
  [
    "XP da Plus com chave por dia (farm)",
    { plusModule: { ...plus, plusRoundXpRewardId: (id) => `plus-round:${id}:${new Date().toISOString()}` } },
    "XP_FARM",
  ],
  [
    "Plus vira lesson canônica",
    { plusSource: `${base.plusSource}\nexport const CANON = "lesson-5-plus";\n` },
    "FREEZE",
  ],
  [
    "sessão de Reforço + não ligada no player",
    { playerSource: base.playerSource.replace(/isPlusRoundSession/g, "unused") },
    "WIRING",
  ],
  [
    "card do tema sem estado de Reforço +",
    { detailSource: base.detailSource.replace(/data-topic-plus-round/g, "data-x") },
    "WIRING",
  ],
  [
    "Plus vira prova longa",
    { plusModule: { ...plus, PLUS_ROUND_MAX_TASKS: 30 } },
    "SIZE",
  ],
];

for (const [label, patch, expectedCode] of mutations) {
  const codes = validateAdaptivePlusRound({ ...base, ...patch }).failures.map((failure) => failure.code);
  assert.ok(codes.includes(expectedCode), `mutação "${label}" não detectada (esperado ${expectedCode})`);
  console.log(`KILLED ${label}: ${expectedCode}`);
}

// ── Os exemplos do contrato, um a um (P6.3) ───────────────────────────────
const examples = [
  [[3, 3, 2, 2], 2.5, false, "3+3+2+2 = 2.5 não abre Plus"],
  [[2, 2, 2, 2], 2.0, true, "2+2+2+2 = 2.0 abre Plus"],
  [[1, 2, 2, 3], 2.0, true, "1+2+2+3 = 2.0 abre Plus"],
  [[1, 1, 2, 2], 1.5, true, "1+1+2+2 = 1.5 abre Plus"],
  [[3, 3, 3, 2], 2.75, false, "3+3+3+2 = 2.75 conclui o tema"],
];
for (const [stars, expectedAverage, expectedPlus, label] of examples) {
  const passStars = { 1: stars[0], 2: stars[1], 3: stars[2], 4: stars[3] };
  const average = plus.topicAverageStars(passStars);
  assert.equal(average, expectedAverage, `${label}: média ${average}`);
  assert.equal(plus.needsPlusRound(average), expectedPlus, label);
  assert.equal(
    plus.topicMasteryPhase({ passStars }),
    expectedPlus ? "plus_required" : "mastered",
    `${label}: fase do tema`
  );
  console.log(`OK ${label}`);
}

// P6.5 — a copy da 4ª rodada não pode dizer "Tema dominado" com Plus pendente.
const weakResult = plus.topicRoundFourResult({ passStars: { 1: 2, 2: 2, 3: 2, 4: 2 } });
assert.equal(weakResult.mastered, false);
assert.ok(!/dominado/i.test(weakResult.headline), `headline não pode anunciar domínio: ${weakResult.headline}`);
assert.match(weakResult.ctaLabel, /Refor/i, "o CTA precisa levar ao Reforço +");
assert.match(weakResult.averageLine ?? "", /2\.0/, "a média do tema fica visível");

const strongResult = plus.topicRoundFourResult({ passStars: { 1: 3, 2: 3, 3: 3, 4: 2 } });
assert.equal(strongResult.mastered, true);
assert.match(strongResult.headline, /dominado/i);

// P10.1 — a média original continua registrada depois da Plus.
assert.equal(plus.topicAverageStars({ 1: 2, 2: 2, 3: 2, 4: 2 }), 2.0, "a história não é reescrita pela Plus");

console.log("PASS test:adaptive-plus-round");
