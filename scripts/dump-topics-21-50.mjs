#!/usr/bin/env node
/**
 * Dump localizable copy from teaching topics 21–50 (M1–M4).
 * Authoring helper for V4.8.3. Not a CI gate.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outJson = path.join(rootDir, "docs/localization/topics-21-50.dump.json");
const manifestJson = path.join(rootDir, "docs/localization/topics-21-50-manifest.json");

const STRING_FIELDS = [
  "title",
  "body",
  "prompt",
  "promptPt",
  "pt",
  "targetMeaningPt",
  "explanation",
  "situationPt",
  "patternPt",
  "productionHintPt",
  "groupLabelPt",
  "contrastLabel",
  "suggestion",
  "dialoguePrompt",
  "placeholder",
  "speaker",
  "sourceMeaning",
  "answer",
  "correctAnswer",
  "blankAnswer",
  "text",
];

const CJK_RE = /[\u3400-\u9fff]/;
const PINYIN_MARK_RE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/;

function looksCanonicalZh(value) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (/^[\u3400-\u9fff\s。？！，、·]+$/.test(text)) return true;
  if (/^[a-züv\s\d'’\-]+$/i.test(text) && PINYIN_MARK_RE.test(text)) return true;
  if (/^(same|different)$/i.test(text)) return true;
  if (CJK_RE.test(text)) {
    const withoutMarks = text.replace(PINYIN_MARK_RE, "");
    if (!/[A-Za-zÀ-ÿ]/.test(withoutMarks)) return true;
  }
  return false;
}

function collectFromStep(step, bag) {
  const add = (value, field) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (looksCanonicalZh(trimmed)) return;
    if (!bag.has(trimmed)) bag.set(trimmed, new Set());
    bag.get(trimmed).add(field);
  };
  for (const field of STRING_FIELDS) add(step[field], field);
  for (const option of step.options ?? []) add(option, "options");
  for (const piece of step.wordBank ?? []) add(piece, "wordBank");
  for (const piece of step.bank ?? []) add(piece, "bank");
  for (const piece of step.target ?? []) add(piece, "target");
  for (const piece of step.targetParts ?? []) add(piece, "targetParts");
  for (const piece of step.distractors ?? []) add(piece, "distractors");
  for (const acc of step.accepts ?? []) add(acc, "accepts");
  for (const pair of step.pairs ?? []) {
    add(pair.left, pair.leftType === "pt" ? "pairs.pt" : "pairs.left");
    add(pair.right, pair.rightType === "pt" ? "pairs.pt" : "pairs.right");
  }
  for (const line of step.lines ?? []) add(line.pt, "lines.pt");
  if (step.optionMeta) {
    for (const meta of Object.values(step.optionMeta)) add(meta?.meaningPt, "optionMeta.meaningPt");
  }
  for (const reveal of step.pairReveal ?? []) add(reveal.meaningPt, "pairReveal.meaningPt");
  for (const slot of step.patternSlots ?? []) add(slot.label, "patternSlots");
  for (const node of step.nodes ?? []) {
    add(node.pt, "nodes.pt");
    if (node.interaction) {
      add(node.interaction.prompt, "nodes.prompt");
      add(node.interaction.correctAnswer, "nodes.correctAnswer");
      add(node.interaction.explanation, "nodes.explanation");
      for (const option of node.interaction.options ?? []) add(option, "nodes.options");
      for (const acc of node.interaction.accepts ?? []) add(acc, "nodes.accepts");
    }
  }
  if (step.checkpoint) {
    add(step.checkpoint.prompt, "checkpoint.prompt");
    add(step.checkpoint.correctAnswer, "checkpoint.correctAnswer");
    add(step.checkpoint.explanation, "checkpoint.explanation");
    for (const option of step.checkpoint.options ?? []) add(option, "checkpoint.options");
  }
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-t2150-dump-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicMasterySpecs.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/data/hanziBuilder.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("dump-topics-21-50: TypeScript emit failed");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { getHanziBuilder } = load("src/data/hanziBuilder.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");

  const teaching = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson));
  const slice = teaching.slice(20, 50);
  if (slice.length !== 30) {
    console.error(`expected 30 topics 21–50, got ${slice.length} of ${teaching.length} teaching`);
    process.exit(1);
  }

  const strings = new Map();
  const topics = [];
  const lexicalIds = { chars: new Set(), chunks: new Set() };

  for (const [offset, lesson] of slice.entries()) {
    const index = offset + 21;
    const passes = {};
    const kinds = new Set();
    let hasConversation = false;
    let hasTransfer = false;
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        silent: true,
        attemptNumber: 0,
        masteryLevel: pass - 1,
        masteryPass: pass,
      });
      passes[pass] = plan.length;
      for (const step of plan) {
        kinds.add(step.kind);
        if (step.kind === "conversation_scene" || step.sceneId) hasConversation = true;
        if (String(step.kind).includes("transfer") || step.kind === "free_production") hasTransfer = true;
        collectFromStep(step, strings);
        const builder = getHanziBuilder(step.builderId);
        if (builder) {
          collectFromStep(
            {
              promptPt: builder.promptPt,
              targetMeaningPt: builder.meaningPt,
              productionHintPt: builder.hintPt,
              explanation: builder.explanationPt,
              pt: builder.relatedPt,
              suggestion: builder.errorHintPt,
            },
            strings
          );
          collectFromStep({ pt: builder.context?.sentencePt }, strings);
          for (const piece of builder.components ?? []) {
            collectFromStep({ title: piece.label, pt: piece.rolePt }, strings);
          }
        }
        if (step.charId) lexicalIds.chars.add(step.charId);
        if (step.chunkId) lexicalIds.chunks.add(step.chunkId);
        for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? []), ...(lesson.libraryItems ?? [])]) {
          if (ref.startsWith("char:")) lexicalIds.chars.add(ref.slice(5));
          if (ref.startsWith("chunk:")) lexicalIds.chunks.add(ref.slice(6));
        }
      }
    }
    const spec = topicMasterySpecFor(lesson);
    if (spec) {
      collectFromStep({ title: spec.promise }, strings);
      for (const text of spec.mustUnderstand ?? []) collectFromStep({ body: text }, strings);
      for (const text of spec.mustRecognize ?? []) collectFromStep({ body: text }, strings);
      for (const text of spec.mustProduce ?? []) collectFromStep({ body: text }, strings);
      for (const text of spec.mustTransfer ?? []) collectFromStep({ body: text }, strings);
      for (const text of spec.commonMisconceptions ?? []) collectFromStep({ body: text }, strings);
      for (const text of Object.values(spec.passObjectives ?? {})) collectFromStep({ body: text }, strings);
    }
    collectFromStep({ title: lesson.title }, strings);
    topics.push({
      index,
      topicId: lesson.id,
      title: lesson.title,
      skill: lesson.skill,
      unitId: lesson.unitId ?? null,
      unitTitle: lesson.unitTitle ?? null,
      phaseId: lesson.phaseId ?? null,
      phaseTitle: lesson.phaseTitle ?? null,
      passes,
      kinds: [...kinds].sort(),
      hasConversation,
      hasTransfer,
      libraryItems: lesson.libraryItems ?? [],
    });
  }

  const unitIds = new Set(topics.map((row) => row.unitId).filter(Boolean));
  const phaseIds = new Set(topics.map((row) => row.phaseId).filter(Boolean));
  for (const phase of JOURNEY) {
    if (!phaseIds.has(phase.id) && !topics.some((row) => row.phaseTitle === phase.title)) continue;
    collectFromStep({ title: phase.title, body: phase.why }, strings);
    for (const unit of phase.units ?? []) {
      if (!unitIds.has(unit.id) && !topics.some((row) => row.unitTitle === unit.title)) continue;
      collectFromStep({ title: unit.title, body: unit.subtitle, prompt: unit.goal }, strings);
    }
  }

  const lexical = {
    characters: CHARACTERS.filter((item) => lexicalIds.chars.has(item.id)).map((item) => ({
      id: item.id,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaningPt: item.meaningPt,
      mnemonicPt: item.mnemonicPt ?? null,
    })),
    chunks: CHUNKS.filter((item) => lexicalIds.chunks.has(item.id)).map((item) => ({
      id: item.id,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaningPt: item.meaningPt,
      literalPt: item.literalPt ?? null,
    })),
  };
  for (const row of lexical.characters) collectFromStep({ pt: row.meaningPt, explanation: row.mnemonicPt }, strings);
  for (const row of lexical.chunks) collectFromStep({ pt: row.meaningPt, explanation: row.literalPt }, strings);

  let existingGloss = {};
  try {
    existingGloss = require(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"));
  } catch {
    existingGloss = {};
  }
  const unique = [...strings.entries()]
    .map(([pt, fields]) => ({
      pt,
      fields: [...fields].sort(),
      alreadyInFirst20: Boolean(existingGloss[pt]),
    }))
    .sort((a, b) => a.pt.localeCompare(b.pt, "pt-BR"));

  const payload = {
    generatedAt: new Date().toISOString(),
    teachingTopicCount: teaching.length,
    topicCount: slice.length,
    topicIds: slice.map((lesson) => lesson.id),
    uniqueStringCount: unique.length,
    newStringCount: unique.filter((row) => !row.alreadyInFirst20).length,
    reusedFirst20Count: unique.filter((row) => row.alreadyInFirst20).length,
    topics,
    lexical,
    strings: unique,
  };

  await mkdir(path.dirname(outJson), { recursive: true });
  await writeFile(outJson, JSON.stringify(payload, null, 2));
  await writeFile(
    manifestJson,
    JSON.stringify(
      {
        generatedAt: payload.generatedAt,
        rule: "ALL_LESSONS.filter(isTopicMasteryLesson).slice(20, 50)",
        topics: topics.map((row) => ({
          index: row.index,
          topicId: row.topicId,
          title: row.title,
          skill: row.skill,
          passes: row.passes,
          kinds: row.kinds,
          hasConversation: row.hasConversation,
          hasTransfer: row.hasTransfer,
          libraryItems: row.libraryItems,
        })),
      },
      null,
      2
    )
  );
  console.log(
    `dumped ${unique.length} unique (${payload.newStringCount} new) across ${slice.length} topics → ${outJson}`
  );
  console.log(slice.map((lesson, i) => `${i + 21}. ${lesson.id}\t${lesson.title}`).join("\n"));
} finally {
  await rm(outDir, { recursive: true, force: true });
}
