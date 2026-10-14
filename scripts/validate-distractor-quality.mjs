#!/usr/bin/env node
/**
 * RC2.3.13R.3.1 — reject name-only / duplicate / unique-script leaks after personalize.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const CJK_RE = /[㐀-鿿]/u;

function studentFirstName(name) {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || ["Aluno", "Novo"].includes(first)) return undefined;
  return first;
}

function hasNameLeak(options, answer, name) {
  if (!options || options.length < 2 || !answer || !name) return false;
  if (!String(answer).includes(name)) return false;
  // Skip piece assembly: short glyphs + bare name
  const shortGlyphs = options.filter((o) => {
    if (o === name) return false;
    const cjk = [...o].filter((ch) => CJK_RE.test(ch));
    return cjk.length > 0 && cjk.length <= 2 && !/[A-Za-zÀ-ÿ]/.test(o);
  });
  if (shortGlyphs.length >= 2 && options.includes(name)) return false;
  const withName = options.filter((o) => String(o).includes(name));
  return withName.length === 1 && /我叫|wǒ\s*jiào|meu nome/i.test(String(answer));
}

async function main() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-distractor-"));
  try {
    const files = [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/features/lesson/lessonTasks.ts",
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
    const { materializeRuntimeStep } = load("src/data/exerciseFeasibility.js");
    const {
      personalizeName,
      personalizeConversationPrompt,
      personalizeChoiceList,
      repairNameOnlyAnswerLeak,
    } = load("src/lib/personalize.js");

    const leaks = [];
    const NAMES = ["Matheus", "João", "Ana"];
    for (const lesson of ALL_LESSONS) {
      const passCount = topic.isTopicMasteryLesson?.(lesson) ? 2 : 1;
      for (let pass = 1; pass <= passCount; pass += 1) {
        const plan = lessonRoundStepsFor(lesson, {
          masteryLevel: pass - 1,
          masteryPass: pass,
          silent: true,
          attemptNumber: 0,
        });
        for (const [index, raw] of (plan ?? []).entries()) {
          for (const full of NAMES) {
            const name = studentFirstName(full) ?? full;
            const p = (v) => personalizeName(v, name);
            let step = {
              ...materializeRuntimeStep(raw),
              options: personalizeChoiceList(raw.options, name),
              correctAnswer: p(raw.correctAnswer),
              answer: p(raw.answer),
              blankAnswer: p(raw.blankAnswer),
              dialoguePrompt: personalizeConversationPrompt(raw.dialoguePrompt, name),
            };
            step = repairNameOnlyAnswerLeak(step, name);
            const answer = step.correctAnswer ?? step.answer ?? step.blankAnswer;
            if (hasNameLeak(step.options, answer, name)) {
              leaks.push({ lessonId: lesson.id, pass, index, name, kind: step.kind, options: step.options, answer });
            }
            // duplicates
            if (step.options?.length) {
              const seen = new Set();
              for (const o of step.options) {
                const k = String(o).trim().toLocaleLowerCase("pt-BR");
                if (seen.has(k)) leaks.push({ lessonId: lesson.id, pass, index, name, kind: step.kind, error: "DUPLICATE", options: step.options });
                seen.add(k);
              }
            }
          }
        }
      }
    }

    if (leaks.length) {
      console.error(`FAIL validate:distractor-quality — ${leaks.length} leaks/duplicates`);
      console.error(JSON.stringify(leaks.slice(0, 25), null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(`PASS validate:distractor-quality — ${ALL_LESSONS.length} lessons · name-leak=0`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
