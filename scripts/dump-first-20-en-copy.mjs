#!/usr/bin/env node
/**
 * Dump localizable instruction copy from the first 20 teaching topics (M1–M4).
 * Used to author V4.8.2 overlays. Not a CI gate.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outJson = path.join(rootDir, "docs/localization/first-20-topics-en.dump.json");

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
  if (CJK_RE.test(text)) {
    const stripped = text.replace(/[\u3400-\u9fff\s·.,!?;:'"()\-—/0-9]/g, "");
    if (!stripped || PINYIN_MARK_RE.test(text) || /[a-zāáǎà]/i.test(stripped) === false) {
      return stripped.length === 0 || PINYIN_MARK_RE.test(text);
    }
  }
  if (/^[\u3400-\u9fff\s。？！，、]+$/.test(text)) return true;
  if (/^[a-züv\s\d'’\-]+$/i.test(text) && PINYIN_MARK_RE.test(text)) return true;
  if (/^(same|different)$/i.test(text)) return true;
  return false;
}

function collectFromStep(step, bag) {
  const add = (value, field) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (looksCanonicalZh(trimmed) && CJK_RE.test(trimmed) && !/[A-Za-zÀ-ÿ]/.test(trimmed.replace(PINYIN_MARK_RE, ""))) {
      return;
    }
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
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-first20-dump-"));
try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/topicMastery.ts", "src/data/topicMasterySpecs.ts", "src/features/lesson/lessonTasks.ts"],
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
    console.error("dump-first-20-en-copy: TypeScript emit failed");
    process.exit(1);
  }
  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");

  const first20 = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson)).slice(0, 20);
  const strings = new Map();
  const topics = [];
  const lexicalIds = { chars: new Set(), chunks: new Set() };

  for (const lesson of first20) {
    const passes = {};
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        silent: true,
        attemptNumber: 0,
        masteryLevel: pass - 1,
        masteryPass: pass,
      });
      passes[pass] = plan.map((step) => ({
        kind: step.kind,
        hanzi: step.hanzi ?? step.targetHanzi ?? step.audioText ?? null,
        pinyin: step.pinyin ?? step.targetPinyin ?? null,
        charId: step.charId ?? null,
        chunkId: step.chunkId ?? null,
        sceneId: step.sceneId ?? null,
      }));
      for (const step of plan) {
        collectFromStep(step, strings);
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
      for (const text of spec.mustUnderstand) collectFromStep({ body: text }, strings);
      for (const text of spec.mustRecognize) collectFromStep({ body: text }, strings);
      for (const text of spec.mustProduce) collectFromStep({ body: text }, strings);
      for (const text of spec.mustTransfer) collectFromStep({ body: text }, strings);
      for (const text of spec.commonMisconceptions) collectFromStep({ body: text }, strings);
      for (const text of Object.values(spec.passObjectives)) collectFromStep({ body: text }, strings);
    }
    collectFromStep({ title: lesson.title }, strings);
    topics.push({
      id: lesson.id,
      titlePt: lesson.title,
      skill: lesson.skill,
      unitTitle: lesson.unitTitle,
      phaseTitle: lesson.phaseTitle,
      kinds: Object.fromEntries(
        [1, 2, 3, 4].map((pass) => [pass, passes[pass].map((s) => s.kind)])
      ),
    });
  }

  for (const phase of JOURNEY) {
    collectFromStep({ title: phase.title, body: phase.why }, strings);
    for (const unit of phase.units) {
      collectFromStep({ title: unit.title, body: unit.subtitle, prompt: unit.goal }, strings);
    }
  }

  const lexical = {
    characters: CHARACTERS.filter((c) => lexicalIds.chars.has(c.id)).map((c) => ({
      id: c.id,
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      meaningPt: c.meaningPt,
      mnemonicPt: c.mnemonicPt ?? null,
    })),
    chunks: CHUNKS.filter((c) => lexicalIds.chunks.has(c.id)).map((c) => ({
      id: c.id,
      hanzi: c.hanzi,
      pinyin: c.pinyin,
      meaningPt: c.meaningPt,
      literalPt: c.literalPt ?? null,
    })),
  };
  for (const row of lexical.characters) {
    collectFromStep({ pt: row.meaningPt, explanation: row.mnemonicPt }, strings);
  }
  for (const row of lexical.chunks) {
    collectFromStep({ pt: row.meaningPt, explanation: row.literalPt }, strings);
  }

  const unique = [...strings.entries()]
    .map(([pt, fields]) => ({ pt, fields: [...fields].sort() }))
    .sort((a, b) => a.pt.localeCompare(b.pt, "pt-BR"));

  const payload = {
    generatedAt: new Date().toISOString(),
    topicCount: first20.length,
    topicIds: first20.map((l) => l.id),
    uniqueStringCount: unique.length,
    topics,
    lexical,
    strings: unique,
  };

  await mkdir(path.dirname(outJson), { recursive: true });
  await writeFile(outJson, JSON.stringify(payload, null, 2));
  console.log(`dumped ${unique.length} unique strings across ${first20.length} topics → ${outJson}`);
  console.log(first20.map((l, i) => `${i + 1}. ${l.id}\t${l.title}`).join("\n"));
} finally {
  await rm(outDir, { recursive: true, force: true });
}
