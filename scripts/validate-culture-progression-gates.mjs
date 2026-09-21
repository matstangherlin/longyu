/**
 * RC2.2.6 — validate:culture-progression-gates
 *
 * Contrato estrutural dos marcos culturais. Tudo aqui é computado contra a
 * ordem REAL de ALL_LESSONS e contra CULTURE_SEALS — nada é hardcoded, para que
 * mexer no currículo quebre este gate em vez de silenciosamente criar deadlock.
 */

import { require } from "./lib/v495a-runtime.mjs";

const { ALL_LESSONS } = require("../../src/data/journey.ts");
const { CULTURE_SEALS } = require("../../src/data/cultureQuest.ts");
const { CULTURE_ITEMS } = require("../../src/data/culture.ts");
const { CULTURE_LESSON_ENTRIES } = require("../../src/data/cultureNative.ts");
const { CULTURE_NATIVE_LESSONS } = require("../../src/data/cultureLessons.ts");
const {
  CULTURE_PROGRESSION_GATES,
  requiredCultureItemIdsForGate,
} = require("../../src/data/cultureProgressionGates.ts");

const failures = [];
const fail = (code, where, why) => failures.push({ code, where, why });

const lessonIndex = (id) => ALL_LESSONS.findIndex((lesson) => lesson.id === id);
const entryFor = (itemId) => CULTURE_LESSON_ENTRIES.find((row) => row.itemId === itemId);

// Wave 1 é deliberadamente pequena: cultura necessária, não cultura o tempo todo.
if (CULTURE_PROGRESSION_GATES.length !== 3) {
  fail("WAVE_SIZE", "cultureProgressionGates", `esperado 3 marcos nesta wave, obtido ${CULTURE_PROGRESSION_GATES.length}`);
}

// Seals que não podem virar gate obrigatório nesta wave (EXPLORE / hub-only / tardio).
const FORBIDDEN_SEAL_IDS = new Set(["visitor-ready", "gift-sense", "festivals", "work-school"]);

const seenIds = new Set();
const seenTargets = new Set();

for (const gate of CULTURE_PROGRESSION_GATES) {
  const where = gate.id;

  if (seenIds.has(gate.id)) fail("DUPLICATE_GATE", where, "id repetido");
  seenIds.add(gate.id);

  // PT + EN obrigatórios em tudo que o aluno lê.
  for (const field of ["titlePt", "titleEn", "reasonPt", "reasonEn"]) {
    if (!String(gate[field] ?? "").trim()) fail("MISSING_COPY", where, `${field} vazio`);
  }
  if (gate.titlePt === gate.titleEn) fail("UNTRANSLATED", where, "titlePt === titleEn");
  if (gate.reasonPt === gate.reasonEn) fail("UNTRANSLATED", where, "reasonPt === reasonEn");

  // A linguagem do marco é preparo, nunca punição nem pedágio.
  const copy = `${gate.reasonPt} ${gate.reasonEn}`.toLowerCase();
  for (const banned of ["bloqueado", "bloqueada", "you can't", "you cannot", "pedágio", "obrigatório", "proibido"]) {
    if (copy.includes(banned)) fail("PUNITIVE_COPY", where, `copy usa "${banned}"`);
  }

  // Seal precisa existir e ser um dos permitidos nesta wave.
  const seal = CULTURE_SEALS.find((item) => item.id === gate.requiredSealId);
  if (!seal) {
    fail("UNKNOWN_SEAL", where, `seal ${gate.requiredSealId} não existe`);
    continue;
  }
  if (FORBIDDEN_SEAL_IDS.has(gate.requiredSealId)) {
    fail("FORBIDDEN_SEAL", where, `${gate.requiredSealId} não pode ser gate obrigatório nesta wave`);
  }

  // Requisitos derivados do seal — nunca uma segunda lista.
  const required = requiredCultureItemIdsForGate(gate);
  if (!required.length) fail("EMPTY_REQUIREMENTS", where, "seal sem requiredItemIds");
  const sealIds = [...seal.requiredItemIds].sort().join(",");
  if ([...required].sort().join(",") !== sealIds) {
    fail("REQUIREMENT_DRIFT", where, "requisitos divergem de CULTURE_SEALS");
  }

  // Alvo precisa existir na Jornada.
  const gateIndex = lessonIndex(gate.beforeTopicId);
  if (gateIndex < 0) {
    fail("UNKNOWN_TARGET", where, `beforeTopicId ${gate.beforeTopicId} não está em ALL_LESSONS`);
    continue;
  }
  if (seenTargets.has(gate.beforeTopicId)) {
    fail("DUPLICATE_TARGET", where, `dois marcos guardam ${gate.beforeTopicId}`);
  }
  seenTargets.add(gate.beforeTopicId);

  for (const itemId of required) {
    const item = CULTURE_ITEMS.find((entry) => entry.id === itemId);
    if (!item) {
      fail("UNKNOWN_ITEM", where, `CultureItem ${itemId} não existe`);
      continue;
    }

    const entry = entryFor(itemId);
    if (!entry) {
      fail("NO_LESSON", where, `${itemId} não tem Culture Lesson`);
      continue;
    }

    // CORE apenas: EXPLORE é enriquecimento e não pode travar currículo.
    if (entry.track !== "core") {
      fail("EXPLORE_REQUIREMENT", where, `${itemId} é track="${entry.track}", exigido core`);
    }

    // Hub-only não tem lugar na Jornada — não pode ser pré-requisito de trilha.
    if (!entry.afterTopicId) {
      fail("HUB_ONLY_REQUIREMENT", where, `${itemId} é hub-only (sem afterTopicId)`);
      continue;
    }

    // DEADLOCK GUARD: o requisito tem de ser alcançável ANTES do marco.
    const anchorIndex = lessonIndex(entry.afterTopicId);
    if (anchorIndex < 0) {
      fail("UNKNOWN_ANCHOR", where, `${itemId} ancorado em ${entry.afterTopicId}, ausente de ALL_LESSONS`);
      continue;
    }
    if (anchorIndex >= gateIndex) {
      fail(
        "DEADLOCK",
        where,
        `${itemId} abre em ${entry.afterTopicId} (#${anchorIndex}) mas o marco guarda ${gate.beforeTopicId} (#${gateIndex})`
      );
    }

    // A Culture Lesson em si precisa ser gratuita: o marco é obrigatório, então
    // exigir Pro nele seria transformar pedagogia em paywall.
    const lesson = CULTURE_NATIVE_LESSONS.find((row) => row.id === `culture-${itemId}`);
    if (!lesson) {
      fail("NO_NATIVE_LESSON", where, `culture-${itemId} ausente de CULTURE_NATIVE_LESSONS`);
    } else if (lesson.premium) {
      fail("PREMIUM_REQUIREMENT", where, `culture-${itemId} é premium`);
    }
  }
}

// Nenhum ciclo: um alvo de marco jamais pode ancorar um requisito de marco.
const allAnchors = new Set(
  CULTURE_PROGRESSION_GATES.flatMap((gate) =>
    requiredCultureItemIdsForGate(gate)
      .map((itemId) => entryFor(itemId)?.afterTopicId)
      .filter(Boolean)
  )
);
for (const gate of CULTURE_PROGRESSION_GATES) {
  if (allAnchors.has(gate.beforeTopicId)) {
    fail("CYCLE", gate.id, `${gate.beforeTopicId} é alvo de marco E âncora de requisito`);
  }
}

// Nem todo CultureItem pode virar obrigatório — isso seria o pedágio que o
// produto rejeitou explicitamente.
const requiredTotal = new Set(
  CULTURE_PROGRESSION_GATES.flatMap((gate) => requiredCultureItemIdsForGate(gate))
).size;
if (requiredTotal >= CULTURE_ITEMS.length) {
  fail("ALL_CULTURE_REQUIRED", "cultureProgressionGates", `${requiredTotal}/${CULTURE_ITEMS.length} obrigatórios`);
}
if (requiredTotal > 10) {
  fail("TOO_MANY_REQUIRED", "cultureProgressionGates", `${requiredTotal} itens obrigatórios é pedágio, não preparo`);
}

console.log(
  JSON.stringify(
    {
      gates: CULTURE_PROGRESSION_GATES.length,
      requiredItems: requiredTotal,
      cultureItems: CULTURE_ITEMS.length,
      placements: CULTURE_PROGRESSION_GATES.map((gate) => ({
        id: gate.id,
        seal: gate.requiredSealId,
        target: gate.beforeTopicId,
        targetIndex: lessonIndex(gate.beforeTopicId),
        requirements: requiredCultureItemIdsForGate(gate).map((itemId) => ({
          itemId,
          anchor: entryFor(itemId)?.afterTopicId,
          anchorIndex: lessonIndex(entryFor(itemId)?.afterTopicId ?? ""),
          track: entryFor(itemId)?.track,
        })),
      })),
      failures,
    },
    null,
    2
  )
);

if (failures.length) process.exitCode = 1;
else console.log("PASS validate:culture-progression-gates");
