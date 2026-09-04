#!/usr/bin/env node
/**
 * A autoridade de readiness (V4.9.2) substituiu as condições escritas à mão no
 * FoundationOrchestrationPanel. Unificar duas fontes de verdade só é seguro se
 * a fonte que sobra disser exatamente o que a outra dizia — do contrário o
 * portão afrouxa ou aperta em silêncio, que é pior que a duplicação removida.
 *
 * Este gate roda as duas implementações sobre uma matriz de estados de aluno e
 * exige acordo. Divergências deliberadas precisam estar declaradas em
 * INTENTIONAL_DIVERGENCES com justificativa; qualquer outra falha o CI.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492-readiness-"));

const program = ts.createProgram(
  ["src/lib/journeyReadiness.ts", "src/data/journeyOrchestrator.ts", "src/lib/srs.ts"],
  {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  }
);
const emit = program.emit();
if (emit.emitSkipped) throw new Error("TypeScript emit failed");

await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
await copyFile(
  path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
  path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
);

const readiness = require(path.join(outDir, "src/lib/journeyReadiness.js"));
const orchestrator = require(path.join(outDir, "src/data/journeyOrchestrator.js"));
const srsLib = require(path.join(outDir, "src/lib/srs.js"));

const {
  PINYIN_CAPSULE_NODE,
  FOUNDATION_BLITZ_NODE,
  TONE_CONTOUR_INTRO_NODE,
  TONE_NUMBER_NODE,
  PINYIN_PRACTICE_NODE,
  HANZI_BUILDER_NODE,
  FIRST_CONVERSATION_NODE,
  JOURNEY_REVIEW_NODE,
  IMMERSION_READINESS_NODE,
} = orchestrator;

// ── Referência: as condições exatamente como o painel da V4.9.1 as escrevia ──
const LEGACY = {
  [PINYIN_CAPSULE_NODE.id]: (s) => s.foundationReady,
  [FOUNDATION_BLITZ_NODE.id]: (s) => s.foundationReady && s.blitzReady,
  [TONE_CONTOUR_INTRO_NODE.id]: (s) => s.toneMastery >= 1,
  [TONE_NUMBER_NODE.id]: (s) => s.toneMastery >= 2,
  [PINYIN_PRACTICE_NODE.id]: (s) => s.capsuleComplete && s.pinyinMastery >= 1,
  [HANZI_BUILDER_NODE.id]: (s) => s.hanziMastery >= 1 && s.learnedChars.includes("mu"),
  [FIRST_CONVERSATION_NODE.id]: (s) => s.firstTopicMastery >= 2 && s.learnedChunks.includes("nihao"),
  [JOURNEY_REVIEW_NODE.id]: (s) => srsLib.dueItems(s.srs, s.now).length > 0,
  [IMMERSION_READINESS_NODE.id]: (s) =>
    s.learnedChunks.length >= 8 && s.knownPatternCount >= 2 && s.firstTopicMastery >= 4,
};

/**
 * Divergências deliberadas: casos em que a declaração da V4.9.1 já dizia algo
 * que a condição manual não aplicava. Manter a condição manual seria preservar
 * o bug; então a declaração vence e a diferença fica registrada aqui.
 */
const INTENTIONAL_DIVERGENCES = [
  {
    nodeId: HANZI_BUILDER_NODE.id,
    why:
      "A V4.9.1 já declarava `concept:hanzi-writing >= GUIDED`, mas o painel só lia o mastery " +
      "de p1-primeiros-hanzi. O Hànzì Builder monta caracteres a partir de componentes: exigir " +
      "que a lição que introduz o próprio sistema de escrita tenha ao menos um pass é o que a " +
      "declaração sempre disse. A autoridade é mais estrita aqui, nunca mais frouxa.",
    // A autoridade só pode ser MAIS estrita: legacy=true & authority=false.
    allow: (legacy, authority) => legacy === true && authority === false,
  },
  {
    nodeId: IMMERSION_READINESS_NODE.id,
    why:
      "`minimumRecognitionRate: 0.7` não tinha semântica na V4.9.1 — nada media taxa, então o " +
      "campo era decorativo e o painel o ignorava. Agora a taxa sai do SRS e falha fechado quando " +
      "a amostra receptiva é pequena demais para sustentar a afirmação. Mais estrita, nunca menos.",
    allow: (legacy, authority) => legacy === true && authority === false,
  },
];

// ── Matriz de estados ─────────────────────────────────────────────────────
const NOW = 1_800_000_000_000;

function srsFixture(kind) {
  if (kind === "empty") return {};
  if (kind === "due") {
    return {
      "chunk:nihao:som": {
        id: "chunk:nihao:som",
        type: "chunk",
        itemId: "nihao",
        reviewDomain: "som",
        ease: 2.5,
        intervalDays: 1,
        due: NOW - 1000,
        reps: 2,
        lapses: 0,
        createdAt: NOW - 100000,
        reviewedAt: NOW - 90000,
      },
    };
  }
  // Amostra receptiva ampla — 10 itens, 9 retidos: taxa 0.9.
  const items = {};
  for (let index = 0; index < 10; index += 1) {
    items[`chunk:c${index}:som`] = {
      id: `chunk:c${index}:som`,
      type: "chunk",
      itemId: `c${index}`,
      reviewDomain: "som",
      ease: 2.5,
      intervalDays: 3,
      due: NOW + 86_400_000,
      reps: index === 0 ? 0 : 3,
      lapses: index === 0 ? 1 : 0,
      createdAt: NOW - 500000,
      reviewedAt: NOW - 400000,
    };
  }
  return items;
}

const TOPICS = {
  mandarin: "p1-o-que-e-mandarim",
  pinyin: "p1-o-que-e-pinyin",
  tone: "p1-o-que-e-tom",
  hanziConcept: "p1-o-que-e-hanzi",
  firstHanzi: "p1-primeiros-hanzi",
};

const states = [];
const masteryLevels = [0, 1, 2, 4];
const chunkSets = [[], ["nihao"], ["nihao", "xiexie", "zaijian", "a", "b", "c", "d", "e"]];
const charSets = [[], ["ni"], ["ni", "hao"], ["ni", "hao", "mu"]];

for (const mandarinM of masteryLevels)
  for (const toneM of masteryLevels)
    for (const pinyinM of masteryLevels)
      for (const firstHanziM of masteryLevels)
        for (const hanziConceptM of masteryLevels)
          for (const learnedChunks of chunkSets)
            for (const learnedChars of charSets)
              for (const capsuleComplete of [false, true])
                for (const currentId of [undefined, TOPICS.pinyin])
                  for (const srsKind of ["empty", "due", "wide"])
                    for (const knownPatternCount of [0, 2]) {
                      const lessonMasteryById = {
                        [TOPICS.mandarin]: { level: mandarinM },
                        [TOPICS.tone]: { level: toneM },
                        [TOPICS.pinyin]: { level: pinyinM },
                        [TOPICS.firstHanzi]: { level: firstHanziM },
                        [TOPICS.hanziConcept]: { level: hanziConceptM },
                      };
                      const completedLessons = Object.entries(lessonMasteryById)
                        .filter(([, value]) => value.level >= 1)
                        .map(([id]) => id);
                      states.push({
                        completedLessons,
                        lessonMasteryById,
                        learnedChunks,
                        learnedChars,
                        knownPatternCount,
                        srs: srsFixture(srsKind),
                        completedNodeIds: capsuleComplete ? [PINYIN_CAPSULE_NODE.id] : [],
                        currentTopicId: currentId,
                        now: NOW,
                        // Derivados só para a referência legada:
                        firstTopicMastery: mandarinM,
                        toneMastery: toneM,
                        pinyinMastery: pinyinM,
                        hanziMastery: firstHanziM,
                        capsuleComplete,
                        foundationReady: mandarinM >= 4 || currentId === TOPICS.pinyin,
                        blitzReady:
                          learnedChunks.includes("nihao") &&
                          learnedChars.some((id) => id === "ni" || id === "hao"),
                      });
                    }

// ── Comparação ────────────────────────────────────────────────────────────
const nodes = [
  PINYIN_CAPSULE_NODE,
  FOUNDATION_BLITZ_NODE,
  TONE_CONTOUR_INTRO_NODE,
  TONE_NUMBER_NODE,
  PINYIN_PRACTICE_NODE,
  HANZI_BUILDER_NODE,
  FIRST_CONVERSATION_NODE,
  JOURNEY_REVIEW_NODE,
  IMMERSION_READINESS_NODE,
];

const EXPECTED_REASONS = new Set([
  "READY",
  "MISSING_TARGET",
  "TARGET_STAGE_TOO_LOW",
  "INSUFFICIENT_CHUNKS",
  "INSUFFICIENT_PATTERNS",
  "INSUFFICIENT_RECOGNITION",
  "NO_REVIEW_DUE",
  "CAPSULE_PREREQUISITE",
  "UNKNOWN_REQUIREMENT",
]);

const mismatches = [];
const divergenceCounts = new Map();
const reasonsSeen = new Set();
let comparisons = 0;

for (const node of nodes) {
  const divergence = INTENTIONAL_DIVERGENCES.find((entry) => entry.nodeId === node.id);
  for (const state of states) {
    const verdict = readiness.evaluateJourneyNodeReadiness(node, state);
    const legacy = LEGACY[node.id](state);
    comparisons += 1;
    reasonsSeen.add(verdict.reason);

    if (!EXPECTED_REASONS.has(verdict.reason)) {
      mismatches.push(`${node.id}: reason fora do contrato: ${verdict.reason}`);
      continue;
    }
    if (verdict.ready === legacy) continue;

    if (divergence && divergence.allow(legacy, verdict.ready)) {
      divergenceCounts.set(node.id, (divergenceCounts.get(node.id) ?? 0) + 1);
      continue;
    }
    if (mismatches.length < 6) {
      mismatches.push(
        `${node.id}: legado=${legacy} autoridade=${verdict.ready} razão=${verdict.reason} ` +
          `estado=${JSON.stringify({
            mandarin: state.firstTopicMastery,
            tone: state.toneMastery,
            pinyin: state.pinyinMastery,
            firstHanzi: state.hanziMastery,
            chunks: state.learnedChunks.length,
            chars: state.learnedChars,
            capsula: state.capsuleComplete,
            atual: state.currentTopicId,
          })}`
      );
    }
  }
}

// Alvo fora do manifesto tem de falhar fechado e nomear a razão — um node mal
// escrito não pode destravar por omissão.
const bogusNode = {
  ...TONE_CONTOUR_INTRO_NODE,
  id: "booster:__probe__:v1",
  requiredKnowledgeTargetIds: ["concept:esse-alvo-nao-existe"],
  minimumKnowledgeStages: {},
};
const bogusVerdict = readiness.evaluateJourneyNodeReadiness(bogusNode, states[states.length - 1]);
reasonsSeen.add(bogusVerdict.reason);
if (bogusVerdict.ready || bogusVerdict.reason !== "UNKNOWN_REQUIREMENT") {
  mismatches.push(
    `alvo fora do manifesto devia falhar com UNKNOWN_REQUIREMENT; veio ready=${bogusVerdict.ready} razão=${bogusVerdict.reason}`
  );
}

// Uma razão que nunca aparece é uma razão que ninguém testou.
const unreachable = [...EXPECTED_REASONS].filter((reason) => !reasonsSeen.has(reason));

if (mismatches.length) {
  console.error("ERRO: validate:journey-readiness-authority falhou.");
  for (const line of mismatches) console.error(`  - ${line}`);
  process.exit(1);
}

console.log(
  `OK: validate:journey-readiness-authority — ${comparisons} comparações em ${states.length} estados × ${nodes.length} nodes.`
);
for (const [nodeId, count] of divergenceCounts) {
  const entry = INTENTIONAL_DIVERGENCES.find((item) => item.nodeId === nodeId);
  console.log(`   divergência deliberada (${count} estados) — ${nodeId}`);
  console.log(`     ${entry.why}`);
}
console.log(`   razões exercitadas: ${[...reasonsSeen].sort().join(", ")}`);
if (unreachable.length) console.log(`   razões não exercitadas por esta matriz: ${unreachable.join(", ")}`);
