#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const memory = new Map();
globalThis.document = { documentElement: { lang: "", dataset: {} } };
globalThis.localStorage = {
  getItem: (key) => memory.get(String(key)) ?? null,
  setItem: (key, value) => memory.set(String(key), String(value)),
  removeItem: (key) => memory.delete(String(key)),
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-course-locale-"));
try {
  const program = ts.createProgram(
    [
      "src/i18n/locale.ts",
      "src/i18n/instructionLocale.ts",
      "src/i18n/overlays/localizeLesson.ts",
      "src/lib/i18n/identity.ts",
      "src/data/journey.ts",
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
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:course-language-switch");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(path.join(root, "src/i18n/overlays/instructionGloss.en.json"), path.join(outDir, "src/i18n/overlays/instructionGloss.en.json"));

  const load = (relative) => require(path.join(outDir, relative));
  const ui = load("src/i18n/locale.js");
  const course = load("src/i18n/instructionLocale.js");
  const identity = load("src/lib/i18n/identity.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const localize = load("src/i18n/overlays/localizeLesson.js");

  ui.resetInterfaceLocaleForTests();
  course.resetInstructionLocaleForTests();
  assert.equal(course.getInstructionLocale(), "pt-BR");
  ui.setInterfaceLocale("en");
  course.followInterfaceLocale("en");
  assert.equal(course.getInstructionLocale(), "en", "primeira troca acompanha app language");

  course.setInstructionLocale("pt-BR", { userOverride: true });
  ui.setInterfaceLocale("en");
  course.followInterfaceLocale("en");
  assert.equal(course.getInstructionLocale(), "pt-BR", "override manual não é sobrescrito");
  assert.equal(identity.launchLocaleFields().interface_locale, "en");
  assert.equal(identity.launchLocaleFields().instruction_locale, "pt-BR");
  assert.equal(identity.launchLocaleFields().native_language, "pt-BR");
  assert.equal(identity.launchLocaleFields().target_language, "zh-CN");

  const lesson = ALL_LESSONS.find((item) => item.steps?.some((step) => step.title));
  assert(lesson, "lesson fixture");
  const canonical = JSON.stringify(lesson);
  const pt = localize.localizeLessonStep(lesson.steps[0], "pt-BR");
  const en = localize.localizeLessonStep(lesson.steps[0], "en");
  assert.equal(JSON.stringify(lesson), canonical, "localização não muta currículo");
  assert.equal(pt.kind, en.kind);
  assert.equal(pt.hanzi, en.hanzi);
  assert.equal(pt.pinyin, en.pinyin);
  assert.equal(pt.audioText, en.audioText);
  assert.equal(pt.correctAnswer, en.correctAnswer);

  for (const key of ["char:ren", "chunk:ni-hao", "lessonMasteryById", "completedLessons", "XP", "Qi", "streak"]) {
    assert(!key.startsWith("en:") && !key.startsWith("pt:"));
  }
  console.log("test:course-language-switch PASS");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
