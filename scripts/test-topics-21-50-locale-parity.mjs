#!/usr/bin/env node
/**
 * V4.8.3 — locale parity for teaching topics 21–50 + SRS/mistake identity.
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-t2150-parity-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/features/lesson/lessonTasks.ts",
      "src/i18n/overlays/instructionGloss.ts",
      "src/i18n/overlays/localizeLesson.ts",
      "src/i18n/overlays/teachingTopics.ts",
      "src/i18n/overlays/first20.ts",
      "src/i18n/overlays/localizeReview.ts",
      "src/lib/srs.ts",
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
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:topics-21-50-locale-parity");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const teaching = load("src/i18n/overlays/teachingTopics.js");
  const gloss = load("src/i18n/overlays/instructionGloss.js");
  const localize = load("src/i18n/overlays/localizeLesson.js");
  const review = load("src/i18n/overlays/localizeReview.js");
  const srs = load("src/lib/srs.js");

  if (!gloss.answersEquivalent("Sou brasileiro", "I'm Brazilian")) fail("Sou brasileiro ≡ I'm Brazilian");
  if (!gloss.answersEquivalent("I'm Brazilian", "Sou brasileiro")) fail("I'm Brazilian ≡ Sou brasileiro");
  if (!gloss.answersEquivalent("I am Brazilian", "Sou brasileiro")) fail("I am Brazilian aliases Sou brasileiro");
  if (!gloss.answersEquivalent("Tudo bem?", "How are you?")) fail("Tudo bem? ≡ How are you?");
  if (gloss.answersEquivalent("Sou brasileiro", "Hello")) fail("Brazilian must not equal Hello");

  const slice = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson)).slice(20, 50);
  if (slice.map((lesson) => lesson.id).join("|") !== [...teaching.TOPICS_21_50_TEACHING_TOPIC_IDS].join("|")) {
    fail("21–50 slice drifted from teachingTopics.ts");
  }

  for (const lesson of slice) {
    if (!teaching.isTopics2150TeachingTopic(lesson.id)) fail(`${lesson.id} missing from 21–50 set`);
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
        if (a.charId && a.charId !== en.charId) fail(`${lesson.id} M${pass} charId changed`);
        if (a.chunkId && a.chunkId !== en.chunkId) fail(`${lesson.id} M${pass} chunkId changed`);
        if (a.hanzi && a.hanzi !== en.hanzi) fail(`${lesson.id} M${pass} hanzi changed`);
        if (a.pinyin && a.pinyin !== en.pinyin) fail(`${lesson.id} M${pass} pinyin changed`);
        if ((a.options ?? []).includes("Sou brasileiro")) {
          if (!(en.options ?? []).includes("I'm Brazilian")) {
            fail(`${lesson.id} M${pass} Sou brasileiro option not I'm Brazilian`);
          }
        }
      }
    }
  }

  const charKeyPt = srs.makeKey("char", "mu");
  const charKeyEn = srs.makeKey("char", "mu");
  if (charKeyPt !== charKeyEn || charKeyPt !== "char:mu") fail("SRS key must ignore locale");

  const fakeExercise = {
    kind: "flashcard",
    prompt: "O que significa?",
    answer: "árvore",
    answerLabel: "árvore",
    explanation: "木 é árvore.",
    entity: {
      id: "mu",
      type: "char",
      hanzi: "木",
      pinyin: "mù",
      meaningPt: "árvore",
    },
  };
  const localizedEx = review.localizeReviewExercise(fakeExercise, "en");
  if (localizedEx.entity.id !== "mu" || localizedEx.entity.hanzi !== "木") {
    fail("review localization mutated Mandarin identity");
  }
  if (localizedEx.entity.meaningPt === "árvore") fail("review meaningPt should overlay to English");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`test:topics-21-50-locale-parity FAIL (${failures.length})`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log("test:topics-21-50-locale-parity PASS");
