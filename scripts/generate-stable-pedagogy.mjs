#!/usr/bin/env node
/**
 * V4.8.5 — generate stable pedagogical loc ids for teaching topics 21–80.
 *
 * Identity: p.{topicId}.m{pass}.s{nn}.{field}
 * First 20 stay on the PT-text overlay (compatibility resolver).
 *
 * Writes src/i18n/overlays/stablePedagogy.en.json
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const kindsPath = path.join(root, "docs/localization/t2150-kinds.json");
const kinds5180Path = path.join(root, "docs/localization/t5180-kinds.json");
const outJson = path.join(root, "src/i18n/overlays/stablePedagogy.en.json");

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
];

function pedagogyLocId(topicId, pass, stepIndex, field) {
  const nn = String(stepIndex + 1).padStart(2, "0");
  return `p.${topicId}.m${pass}.s${nn}.${field}`;
}

function pedagogyMetaLocId(topicId, field) {
  return `p.${topicId}.meta.${field}`;
}

function collectStepFields(step, emit) {
  for (const field of STRING_FIELDS) {
    if (typeof step[field] === "string" && step[field].trim()) emit(field, step[field]);
  }
  for (const [index, option] of (step.options ?? []).entries()) {
    if (typeof option === "string" && option.trim()) emit(`options.${index}`, option);
  }
  for (const [index, piece] of (step.wordBank ?? []).entries()) {
    if (typeof piece === "string" && piece.trim()) emit(`wordBank.${index}`, piece);
  }
  for (const [index, piece] of (step.bank ?? []).entries()) {
    if (typeof piece === "string" && piece.trim()) emit(`bank.${index}`, piece);
  }
  for (const [index, piece] of (step.target ?? []).entries()) {
    if (typeof piece === "string" && piece.trim()) emit(`target.${index}`, piece);
  }
  for (const [index, piece] of (step.targetParts ?? []).entries()) {
    if (typeof piece === "string" && piece.trim()) emit(`targetParts.${index}`, piece);
  }
  for (const [index, piece] of (step.distractors ?? []).entries()) {
    if (typeof piece === "string" && piece.trim()) emit(`distractors.${index}`, piece);
  }
  for (const [index, acc] of (step.accepts ?? []).entries()) {
    if (typeof acc === "string" && acc.trim()) emit(`accepts.${index}`, acc);
  }
  for (const [index, pair] of (step.pairs ?? []).entries()) {
    if (pair.left) emit(`pairs.${index}.left`, pair.left);
    if (pair.right) emit(`pairs.${index}.right`, pair.right);
  }
  for (const [index, line] of (step.lines ?? []).entries()) {
    if (line.pt) emit(`lines.${index}.pt`, line.pt);
  }
  if (step.optionMeta) {
    for (const [key, meta] of Object.entries(step.optionMeta)) {
      if (meta?.meaningPt) emit(`optionMeta.${key}.meaningPt`, meta.meaningPt);
    }
  }
  for (const [index, reveal] of (step.pairReveal ?? []).entries()) {
    if (reveal.meaningPt) emit(`pairReveal.${index}.meaningPt`, reveal.meaningPt);
  }
  for (const [nIndex, node] of (step.nodes ?? []).entries()) {
    if (node.pt) emit(`nodes.${nIndex}.pt`, node.pt);
    if (node.interaction) {
      if (node.interaction.prompt) emit(`nodes.${nIndex}.prompt`, node.interaction.prompt);
      if (node.interaction.correctAnswer) emit(`nodes.${nIndex}.correctAnswer`, node.interaction.correctAnswer);
      if (node.interaction.explanation) emit(`nodes.${nIndex}.explanation`, node.interaction.explanation);
      for (const [oIndex, option] of (node.interaction.options ?? []).entries()) {
        emit(`nodes.${nIndex}.options.${oIndex}`, option);
      }
      for (const [aIndex, acc] of (node.interaction.accepts ?? []).entries()) {
        emit(`nodes.${nIndex}.accepts.${aIndex}`, acc);
      }
    }
  }
  if (step.checkpoint) {
    if (step.checkpoint.prompt) emit("checkpoint.prompt", step.checkpoint.prompt);
    if (step.checkpoint.correctAnswer) emit("checkpoint.correctAnswer", step.checkpoint.correctAnswer);
    if (step.checkpoint.explanation) emit("checkpoint.explanation", step.checkpoint.explanation);
    for (const [index, option] of (step.checkpoint.options ?? []).entries()) {
      emit(`checkpoint.options.${index}`, option);
    }
  }
}

function collectBuilder(builder, emit) {
  if (!builder) return;
  const add = (field, value) => {
    if (typeof value === "string" && value.trim()) emit(field, value);
  };
  add("builder.promptPt", builder.promptPt);
  add("builder.meaningPt", builder.meaningPt);
  add("builder.hintPt", builder.hintPt);
  add("builder.explanationPt", builder.explanationPt);
  add("builder.relatedPt", builder.relatedPt);
  add("builder.errorHintPt", builder.errorHintPt);
  add("builder.sentencePt", builder.context?.sentencePt);
  for (const [index, piece] of (builder.components ?? []).entries()) {
    add(`builder.components.${index}.label`, piece.label);
    add(`builder.components.${index}.rolePt`, piece.rolePt);
  }
}

const memory = new Map();
globalThis.document = { documentElement: { lang: "", dataset: {} } };
globalThis.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(String(key), String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
  clear() {
    memory.clear();
  },
};

const kinds = {
  ...JSON.parse(await readFile(kindsPath, "utf8")),
  ...JSON.parse(await readFile(kinds5180Path, "utf8")),
};
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-stable-pedagogy-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicMasterySpecs.ts",
      "src/data/hanziBuilder.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/i18n/overlays/instructionGloss.ts",
      "src/i18n/overlays/teachingTopics.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("generate-stable-pedagogy: TypeScript emit failed");
    process.exit(1);
  }
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const { getHanziBuilder } = load("src/data/hanziBuilder.js");
  const { CHARACTERS } = load("src/data/characters.js");
  const { CHUNKS } = load("src/data/chunks.js");
  const teaching = load("src/i18n/overlays/teachingTopics.js");
  const gloss = load("src/i18n/overlays/instructionGloss.js");

  const expectedIds = [...teaching.TOPICS_21_80_TEACHING_TOPIC_IDS];
  const slice = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson)).slice(20, 80);
  if (slice.map((lesson) => lesson.id).join("|") !== expectedIds.join("|")) {
    console.error("topics 21–80 ids drifted vs teachingTopics.ts");
    process.exit(1);
  }

  const entries = [];
  const seenIds = new Set();
  const missing = [];

  const push = (id, pt, field) => {
    const text = String(pt ?? "").trim();
    if (!text) return;
    if (seenIds.has(id)) return;
    if (gloss.isCanonicalZhOrPinyin(text)) return;
    seenIds.add(id);
    const en = gloss.resolveInstructionText(text, "en");
    if (!gloss.hasEnglishOverlay(text)) missing.push({ id, pt: text, field });
    const kind = kinds[text] ?? (en !== text ? "DIRECT_TRANSLATION" : "DIRECT_TRANSLATION");
    entries.push({ id, pt: text, en, kind, field });
  };

  for (const lesson of slice) {
    push(pedagogyMetaLocId(lesson.id, "title"), lesson.title, "title");
    if (lesson.unitTitle) push(pedagogyMetaLocId(lesson.id, "unitTitle"), lesson.unitTitle, "unitTitle");
    if (lesson.phaseTitle) push(pedagogyMetaLocId(lesson.id, "phaseTitle"), lesson.phaseTitle, "phaseTitle");
    const spec = topicMasterySpecFor(lesson);
    if (spec) {
      push(pedagogyMetaLocId(lesson.id, "spec.promise"), spec.promise, "spec.promise");
      for (const [index, text] of (spec.mustUnderstand ?? []).entries()) {
        push(pedagogyMetaLocId(lesson.id, `spec.mustUnderstand.${index}`), text, "spec.mustUnderstand");
      }
      for (const [index, text] of (spec.mustRecognize ?? []).entries()) {
        push(pedagogyMetaLocId(lesson.id, `spec.mustRecognize.${index}`), text, "spec.mustRecognize");
      }
      for (const [index, text] of (spec.mustProduce ?? []).entries()) {
        push(pedagogyMetaLocId(lesson.id, `spec.mustProduce.${index}`), text, "spec.mustProduce");
      }
      for (const [index, text] of (spec.mustTransfer ?? []).entries()) {
        push(pedagogyMetaLocId(lesson.id, `spec.mustTransfer.${index}`), text, "spec.mustTransfer");
      }
      for (const [index, text] of (spec.commonMisconceptions ?? []).entries()) {
        push(pedagogyMetaLocId(lesson.id, `spec.misconception.${index}`), text, "spec.commonMisconceptions");
      }
      for (const [passKey, text] of Object.entries(spec.passObjectives ?? {})) {
        push(pedagogyMetaLocId(lesson.id, `spec.pass.${passKey}`), text, "spec.passObjectives");
      }
    }
    const lexicalIds = { chars: new Set(), chunks: new Set() };
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        silent: true,
        attemptNumber: 0,
        masteryLevel: pass - 1,
        masteryPass: pass,
      });
      for (const [stepIndex, step] of plan.entries()) {
        collectStepFields(step, (field, value) => {
          push(pedagogyLocId(lesson.id, pass, stepIndex, field), value, field);
        });
        collectBuilder(getHanziBuilder(step.builderId), (field, value) => {
          push(pedagogyLocId(lesson.id, pass, stepIndex, field), value, field);
        });
        if (step.charId) lexicalIds.chars.add(step.charId);
        if (step.chunkId) lexicalIds.chunks.add(step.chunkId);
        for (const ref of [...(step.learnedRefs ?? []), ...(step.newRefs ?? []), ...(lesson.libraryItems ?? [])]) {
          if (ref.startsWith("char:")) lexicalIds.chars.add(ref.slice(5));
          if (ref.startsWith("chunk:")) lexicalIds.chunks.add(ref.slice(6));
        }
      }
    }
    for (const row of CHARACTERS.filter((item) => lexicalIds.chars.has(item.id))) {
      push(pedagogyMetaLocId(lesson.id, `lex.char.${row.id}.meaningPt`), row.meaningPt, "lex.meaningPt");
      if (row.mnemonicPt) {
        push(pedagogyMetaLocId(lesson.id, `lex.char.${row.id}.mnemonicPt`), row.mnemonicPt, "lex.mnemonicPt");
      }
    }
    for (const row of CHUNKS.filter((item) => lexicalIds.chunks.has(item.id))) {
      push(pedagogyMetaLocId(lesson.id, `lex.chunk.${row.id}.meaningPt`), row.meaningPt, "lex.meaningPt");
      if (row.literalPt) {
        push(pedagogyMetaLocId(lesson.id, `lex.chunk.${row.id}.literalPt`), row.literalPt, "lex.literalPt");
      }
    }
  }

  for (const phase of JOURNEY.filter((entry) =>
    slice.some((lesson) => lesson.phaseId === entry.id || lesson.phaseTitle === entry.title)
  )) {
    const topicId = slice.find((lesson) => lesson.phaseId === phase.id || lesson.phaseTitle === phase.title)?.id;
    if (!topicId) continue;
    push(pedagogyMetaLocId(topicId, "phase.title"), phase.title, "phase.title");
    if (phase.why) push(pedagogyMetaLocId(topicId, "phase.why"), phase.why, "phase.why");
    for (const unit of phase.units ?? []) {
      if (slice.some((lesson) => lesson.unitId === unit.id || lesson.unitTitle === unit.title)) {
        const unitTopic = slice.find((lesson) => lesson.unitId === unit.id || lesson.unitTitle === unit.title);
        if (!unitTopic) continue;
        push(pedagogyMetaLocId(unitTopic.id, "unit.title"), unit.title, "unit.title");
        if (unit.subtitle) push(pedagogyMetaLocId(unitTopic.id, "unit.subtitle"), unit.subtitle, "unit.subtitle");
        if (unit.goal) push(pedagogyMetaLocId(unitTopic.id, "unit.goal"), unit.goal, "unit.goal");
      }
    }
  }

  if (missing.length) {
    console.error(`generate-stable-pedagogy: ${missing.length} strings still missing EN overlay`);
    for (const row of missing.slice(0, 30)) {
      console.error(` - ${row.id} ${JSON.stringify(row.pt)}`);
    }
    process.exit(1);
  }

  const uniquePt = new Set(entries.map((row) => row.pt));
  const kindCounts = { DIRECT_TRANSLATION: 0, NATURAL_REWRITE: 0, SOURCE_LANGUAGE_ADAPTATION: 0 };
  for (const pt of uniquePt) {
    const kind = kinds[pt] ?? "DIRECT_TRANSLATION";
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
  }

  const catalog = {
    version: "v4.8.5",
    generatedAt: new Date().toISOString(),
    rule: "ALL_LESSONS.filter(isTopicMasteryLesson).slice(20, 80)",
    topicIds: expectedIds,
    entryCount: entries.length,
    uniquePtCount: uniquePt.size,
    kindCounts,
    entries: entries.map(({ id, pt, en, kind }) => ({ id, pt, en, kind })),
  };
  await writeFile(outJson, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(
    `generate-stable-pedagogy: ${entries.length} loc ids · ${uniquePt.size} unique PT strings · ${outJson}`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
