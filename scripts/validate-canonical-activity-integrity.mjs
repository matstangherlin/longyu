#!/usr/bin/env node
/**
 * RC2.3.13R.3.1 — zero canonical skips after personalization × seeds.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();

function studentFirstName(name) {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || ["Aluno", "Novo"].includes(first)) return undefined;
  return first;
}

async function compile() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-canonical-integrity-"));
  const files = [
    "src/data/journey.ts",
    "src/data/topicMastery.ts",
    "src/features/lesson/lessonTasks.ts",
    "src/features/lesson/exerciseValidation.ts",
    "src/data/exerciseFeasibility.ts",
    "src/lib/personalize.ts",
  ];
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    jsx: ts.JsxEmit.ReactJSX,
  });
  if (program.emit().emitSkipped) throw new Error("emit failed");
  return outDir;
}

function personalizeStepMirror(step, name, helpers) {
  const {
    personalizeName,
    personalizeConversationPrompt,
    personalizeChoiceList,
    repairNameOnlyAnswerLeak,
  } = helpers;
  const p = (v) => personalizeName(v, name);
  const pc = (v) => personalizeConversationPrompt(v, name);
  const personalized = {
    ...step,
    title: p(step.title),
    body: p(step.body),
    text: p(step.text),
    pinyin: p(step.pinyin),
    pt: p(step.pt),
    hanzi: p(step.hanzi),
    answer: p(step.answer),
    options: personalizeChoiceList(step.options, name),
    bank: personalizeChoiceList(step.bank, name),
    wordBank: personalizeChoiceList(step.wordBank, name),
    distractors: personalizeChoiceList(step.distractors, name),
    target: step.target?.map((x) => p(x) ?? x),
    targetParts: step.targetParts?.map((x) => p(x) ?? x),
    accepts: step.accepts?.map((x) => p(x) ?? x),
    audioText: p(step.audioText),
    prompt: pc(step.prompt),
    dialoguePrompt: pc(step.dialoguePrompt),
    correctAnswer: p(step.correctAnswer),
    blankAnswer: p(step.blankAnswer),
    sentenceBefore: p(step.sentenceBefore),
    sentenceAfter: p(step.sentenceAfter),
    explanation: pc(step.explanation),
    speaker: p(step.speaker),
    charId: step.charId,
    builderId: step.builderId,
    kind: step.kind,
    nodes: step.nodes?.map((node) => ({
      ...node,
      hanzi: p(node.hanzi) ?? node.hanzi,
      pinyin: p(node.pinyin) ?? node.pinyin,
      pt: p(node.pt) ?? node.pt,
      audioText: p(node.audioText) ?? node.audioText,
      interaction: node.interaction
        ? repairNameOnlyAnswerLeak(
            {
              ...node.interaction,
              prompt: pc(node.interaction.prompt) ?? node.interaction.prompt,
              correctAnswer: p(node.interaction.correctAnswer) ?? node.interaction.correctAnswer,
              options: personalizeChoiceList(node.interaction.options, name),
              accepts: node.interaction.accepts?.map((a) => p(a) ?? a),
            },
            name
          )
        : node.interaction,
    })),
    checkpoint: step.checkpoint
      ? repairNameOnlyAnswerLeak(
          {
            ...step.checkpoint,
            prompt: pc(step.checkpoint.prompt) ?? step.checkpoint.prompt,
            correctAnswer: p(step.checkpoint.correctAnswer) ?? step.checkpoint.correctAnswer,
            options: personalizeChoiceList(step.checkpoint.options, name),
          },
          name
        )
      : step.checkpoint,
  };
  return repairNameOnlyAnswerLeak(personalized, name);
}

async function main() {
  const outDir = await compile();
  try {
    // personalize.ts imports zustand via store — stub store before load
    const storePath = path.join(outDir, "src/lib/store.js");
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(
      storePath,
      `exports.useStore = Object.assign(() => ({}), { getState: () => ({ accounts: {}, currentAccountId: null }) });\n`
    );

    const load = (rel) => require(path.join(outDir, rel));
    const { ALL_LESSONS } = load("src/data/journey.js");
    const topic = load("src/data/topicMastery.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
    const { materializeRuntimeStep } = load("src/data/exerciseFeasibility.js");
    const helpers = load("src/lib/personalize.js");

    const NAMES = ["Matheus", "João", "Ana", "André", "Maria Clara"];
    const SEEDS = [1, 2, 3, 4, 5];
    const failures = [];
    let total = 0;

    for (const lesson of ALL_LESSONS) {
      const batches = [["authored", lesson.steps ?? []]];
      const passCount = topic.isTopicMasteryLesson?.(lesson) ? 4 : 1;
      for (let pass = 1; pass <= passCount; pass += 1) {
        for (const seed of SEEDS) {
          const plan = lessonRoundStepsFor(lesson, {
            masteryLevel: pass - 1,
            masteryPass: pass,
            silent: true,
            attemptNumber: seed - 1,
          });
          batches.push([`pass${pass}s${seed}`, plan ?? []]);
        }
      }
      for (const [source, steps] of batches) {
        for (const [index, raw] of steps.entries()) {
          for (const full of NAMES) {
            const name = studentFirstName(full) ?? full;
            total += 1;
            let step;
            try {
              step = personalizeStepMirror(materializeRuntimeStep(raw), name, helpers);
            } catch (error) {
              failures.push({
                lessonId: lesson.id,
                source,
                index,
                name,
                kind: raw?.kind,
                errors: [String(error)],
              });
              continue;
            }
            const result = validateExercise(step);
            if (!result.valid) {
              failures.push({
                lessonId: lesson.id,
                source,
                index,
                name,
                kind: step.kind,
                errors: result.errors,
              });
            }
          }
        }
      }
    }

    const report = {
      lessons: ALL_LESSONS.length,
      totalChecks: total,
      canonicalActivitiesInvalid: failures.length,
      sample: failures.slice(0, 30),
    };
    await mkdir(path.join(rootDir, "docs/reports"), { recursive: true });
    await writeFile(
      path.join(rootDir, "docs/reports/canonical-activity-integrity.json"),
      JSON.stringify(report, null, 2)
    );

    if (failures.length > 0) {
      console.error(`FAIL validate:canonical-activity-integrity — ${failures.length} invalid of ${total}`);
      console.error(JSON.stringify(failures.slice(0, 20), null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(
      `PASS validate:canonical-activity-integrity — ${ALL_LESSONS.length} lessons · ${total} personalized checks · invalid=0`
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
