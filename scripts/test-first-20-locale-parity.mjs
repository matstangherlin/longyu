#!/usr/bin/env node
/**
 * V4.8.2 — TOPIC_PROGRESS_LOCALE_PARITY + session-plan parity + scoring aliases.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const fail = (message) => failures.push(message);

const memory = new Map();
globalThis.document = {
  documentElement: {
    lang: "",
    dataset: {},
  },
};
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-first20-parity-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/i18n/overlays/instructionGloss.ts",
      "src/i18n/overlays/localizeLesson.ts",
      "src/i18n/overlays/first20.ts",
      "src/i18n/overlays/journeyChrome.ts",
      "src/i18n/catalog.ts",
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
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:first-20-locale-parity");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await mkdir(path.join(outDir, "src/locales"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const first20mod = load("src/i18n/overlays/first20.js");
  const gloss = load("src/i18n/overlays/instructionGloss.js");
  const localize = load("src/i18n/overlays/localizeLesson.js");
  const chrome = load("src/i18n/overlays/journeyChrome.js");
  const locale = load("src/i18n/locale.js");
  const catalog = load("src/i18n/catalog.js");

  if (typeof locale.resetInterfaceLocaleForTests === "function") locale.resetInterfaceLocaleForTests();

  if (!gloss.answersEquivalent("Olá", "Hello")) fail("Olá ≡ Hello");
  if (!gloss.answersEquivalent("Hello", "Olá")) fail("Hello ≡ Olá");
  if (!gloss.answersEquivalent("Hi", "Olá")) fail("Hi aliases to Olá");
  if (!gloss.scoredAnswersMatch("Hello", "Olá")) fail("scoredAnswersMatch Hello/Olá");
  if (!gloss.answersEquivalent("Iguais", "Same")) fail("Iguais ≡ Same");
  if (!gloss.answersEquivalent("Obrigado(a)", "Thanks")) fail("Obrigado(a) ≡ Thanks");
  if (gloss.answersEquivalent("Olá", "Thanks")) fail("Olá must not equal Thanks");

  const helloStep = {
    kind: "comprehend",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    options: ["Olá", "Obrigado(a)", "Tchau"],
    answer: "Olá",
    audioText: "你好",
  };
  const localizedHello = localize.localizeLessonStep(helloStep, "en");
  if (!localizedHello.options.includes("Hello")) fail("Olá option becomes Hello");
  if (localizedHello.answer !== "Hello") fail(`answer localized to ${localizedHello.answer}, expected Hello`);
  if (!gloss.scoredAnswersMatch("Hello", localizedHello.answer)) fail("clicking Hello matches localized answer");
  if (localize.canonicalStepFingerprint(helloStep) !== localize.canonicalStepFingerprint(localizedHello)) {
    fail("localizing Olá/Hello must not change canonical fingerprint");
  }
  if (localizedHello.hanzi !== "你好" || localizedHello.pinyin !== "nǐ hǎo" || localizedHello.audioText !== "你好") {
    fail("canonical Chinese changed while localizing Hello");
  }

  locale.setInterfaceLocale("en");
  if (catalog.t("journey.ctaStart") !== "Start") fail("EN Start CTA");
  if (catalog.t("player.continue") !== "Continue") fail("EN Continue");
  const enCta = chrome.localizedTopicCta(0, false, catalog.t);
  if (enCta.primary !== "Start") fail(`localizedTopicCta EN got ${enCta.primary}`);
  locale.setInterfaceLocale("pt-BR");
  const ptCta = chrome.localizedTopicCta(0, false, catalog.t);
  if (ptCta.primary !== "Começar") fail(`localizedTopicCta PT got ${ptCta.primary}`);
  if (topic.topicCtaForLevel(0, false).primary !== "Começar") {
    fail("canonical topicCtaForLevel must stay Portuguese for isolated tests");
  }

  const first20 = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson)).slice(0, 20);
  for (const lesson of first20) {
    if (!first20mod.isFirst20TeachingTopic(lesson.id)) fail(`${lesson.id} missing from FIRST_20 set`);
    for (const pass of [1, 2, 3, 4]) {
      const planA = lessonRoundStepsFor(lesson, {
        silent: true,
        attemptNumber: 0,
        masteryLevel: pass - 1,
        masteryPass: pass,
      });
      const planB = lessonRoundStepsFor(lesson, {
        silent: true,
        attemptNumber: 0,
        masteryLevel: pass - 1,
        masteryPass: pass,
      });
      if (planA.length !== planB.length) fail(`${lesson.id} M${pass} plan length jitter`);
      for (let index = 0; index < planA.length; index += 1) {
        const a = planA[index];
        const b = planB[index];
        if (a.kind !== b.kind) fail(`${lesson.id} M${pass} kind jitter ${a.kind} vs ${b.kind}`);
        const fp = localize.canonicalStepFingerprint(a);
        if (fp !== localize.canonicalStepFingerprint(b)) fail(`${lesson.id} M${pass} fingerprint jitter`);
        const en = localize.localizeLessonStep(a, "en");
        if (localize.canonicalStepFingerprint(en) !== fp) {
          fail(`${lesson.id} M${pass} ${a.kind} fingerprint changed in EN`);
        }
        if ((a.options ?? []).includes("Olá")) {
          if (!(en.options ?? []).includes("Hello")) fail(`${lesson.id} M${pass} Olá option not Hello`);
          if (typeof a.answer === "string" && gloss.answersEquivalent(a.answer, "Olá") && en.answer !== "Hello") {
            fail(`${lesson.id} M${pass} Olá answer not Hello (${en.answer})`);
          }
        }
      }
    }
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`test:first-20-locale-parity FAIL (${failures.length})`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log("test:first-20-locale-parity PASS");
