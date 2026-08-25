#!/usr/bin/env node
/**
 * V4.6 — Topic Mastery Path (unlock, grandfather, energy/XP ids, skip-ahead).
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-topic-mastery-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/topicMastery.ts",
      "src/data/masteryLoop.ts",
      "src/data/journey.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: root,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:topic-mastery-path");

  const topic = require(path.join(outDir, "src/data/topicMastery.js"));
  const mastery = require(path.join(outDir, "src/data/masteryLoop.js"));
  const { ALL_LESSONS, currentLessonId, lessonState } = require(path.join(outDir, "src/data/journey.js"));

  const teaching = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson));
  const reviews = ALL_LESSONS.filter((lesson) => !topic.isTopicMasteryLesson(lesson));
  assert.ok(teaching.length > 40, `nós de ensino: ${teaching.length}`);
  assert.ok(reviews.length > 0, "reviews/checkpoints existem como exceção");

  const first = ALL_LESSONS[0];
  const second = ALL_LESSONS[1];
  assert.equal(first.id, "p1-o-que-e-mandarim");
  assert.equal(topic.isTopicMasteryLesson(first), true);
  assert.equal(topic.requiredMasteryPasses(first), 4);

  const emptyCtx = { completedLessons: [], lessonMasteryById: {} };
  assert.equal(topic.isJourneyTopicComplete(first, emptyCtx), false);
  assert.equal(topic.currentJourneyLessonId(ALL_LESSONS, emptyCtx), first.id);

  const afterM1 = {
    completedLessons: [first.id],
    lessonMasteryById: { [first.id]: { level: 1 } },
  };
  assert.equal(topic.isJourneyTopicComplete(first, afterM1), false, "1/4 não conclui o tema");
  assert.equal(
    topic.currentJourneyLessonId(ALL_LESSONS, afterM1),
    first.id,
    "depois da pass 1 o ponteiro continua no mesmo tema"
  );
  assert.equal(currentLessonId(afterM1.completedLessons, false, afterM1.lessonMasteryById), first.id);
  assert.equal(lessonState(second.id, afterM1.completedLessons, false, afterM1.lessonMasteryById), "locked");

  const afterM3 = {
    completedLessons: [first.id],
    lessonMasteryById: { [first.id]: { level: 3 } },
  };
  assert.equal(topic.isJourneyTopicComplete(first, afterM3), false, "3/4 ainda bloqueia o próximo");
  assert.equal(topic.currentJourneyLessonId(ALL_LESSONS, afterM3), first.id);

  const mastered = {
    completedLessons: [first.id],
    lessonMasteryById: { [first.id]: { level: 4 } },
  };
  assert.equal(topic.isJourneyTopicComplete(first, mastered), true);
  assert.equal(topic.currentJourneyLessonId(ALL_LESSONS, mastered), second.id);
  assert.equal(lessonState(first.id, mastered.completedLessons, false, mastered.lessonMasteryById), "done");
  assert.equal(lessonState(second.id, mastered.completedLessons, false, mastered.lessonMasteryById), "current");

  const legacy = { completedLessons: [first.id] };
  assert.equal(
    topic.isJourneyTopicComplete(first, { ...legacy, legacyAcquiredMeansPathComplete: true }),
    true,
    "legado sem masteryById: ACQUIRED = path complete"
  );
  assert.equal(currentLessonId([first.id]), second.id, "currentLessonId sem mastery usa legado");

  const review = reviews[0];
  assert.ok(review);
  assert.equal(topic.requiredMasteryPasses(review), 1);
  assert.equal(
    topic.isJourneyTopicComplete(review, { completedLessons: [review.id], lessonMasteryById: {} }),
    true,
    "review path-complete = ACQUIRED"
  );
  const exception = topic.topicMasteryExceptionFor(review);
  assert.ok(exception?.reason, "exceção de review tem reason");

  const pointerLessons = ALL_LESSONS.slice(0, 8);
  const completed = pointerLessons.slice(0, 5).map((lesson) => lesson.id);
  const grandfathered = topic.grandfatherTopicMastery(ALL_LESSONS, completed, {
    [completed[4]]: { level: 1, passCount: 1, lastPass: 1, updatedAt: 1 },
  });
  for (let index = 0; index < 5; index += 1) {
    const lesson = pointerLessons[index];
    if (!topic.isTopicMasteryLesson(lesson)) continue;
    assert.equal(grandfathered[lesson.id]?.level, 4, `${lesson.id} atrás do ponteiro → 4/4`);
  }
  const livePointer = pointerLessons[5];
  if (livePointer && topic.isTopicMasteryLesson(livePointer)) {
    assert.ok(
      (grandfathered[livePointer.id]?.level ?? 0) < 4,
      "o ponteiro legado (primeira não concluída) não é forçado a 4/4"
    );
  }
  const later = ALL_LESSONS[20];
  assert.ok(!grandfathered[later.id] || (grandfathered[later.id].level ?? 0) < 4, "não relocka/não auto-M4 o futuro");

  const skipOff = mastery.advanceLessonMastery({
    current: { level: 1, passCount: 1, updatedAt: 0 },
    pass: 2,
    accuracy: 1,
    mistakeCount: 0,
    hadProductionOrTransfer: true,
    allowSkipAhead: false,
  });
  assert.equal(skipOff.record.level, 2, "sem skip-ahead, 2/4 abre M3 — não M4");

  const skipOn = mastery.advanceLessonMastery({
    current: { level: 1, passCount: 1, updatedAt: 0 },
    pass: 2,
    accuracy: 1,
    mistakeCount: 0,
    hadProductionOrTransfer: true,
    allowSkipAhead: true,
  });
  assert.ok(skipOn.record.level >= 2, "legado ainda pode skip-ahead");

  assert.notEqual(
    topic.energyIdempotencyKeyForPass("p1-o-que-e-mandarim", 1, "2026-08-25"),
    topic.energyIdempotencyKeyForPass("p1-o-que-e-mandarim", 2, "2026-08-25"),
    "energia é por pass, não por exercício"
  );
  assert.equal(
    topic.energyIdempotencyKeyForPass("p1-o-que-e-mandarim", 1, "2026-08-25"),
    topic.energyIdempotencyKeyForPass("p1-o-que-e-mandarim", 1, "2026-08-25"),
    "reload da mesma pass reusa a chave"
  );
  assert.notEqual(
    topic.lessonPassXpRewardId("p1-o-que-e-mandarim", 1),
    topic.lessonPassPracticeXpRewardId("p1-o-que-e-mandarim", 1, "2026-08-25")
  );
  assert.ok(topic.lessonTopicMasteredXpRewardId("p1-o-que-e-mandarim").includes("topic-mastered"));

  const cta0 = topic.topicCtaForLevel(0, false);
  const cta1 = topic.topicCtaForLevel(1, false);
  const cta4 = topic.topicCtaForLevel(4, false);
  assert.equal(cta0.primary, "Começar");
  assert.match(cta1.secondary, /Lição 2 de 4/);
  assert.equal(cta4.primary, "Praticar novamente");

  const storeSrc = await readFile(path.join(root, "src/lib/store.ts"), "utf8");
  assert.match(storeSrc, /version: 20/, "persist v20 grandfather Topic Mastery");
  assert.match(storeSrc, /grandfatherTopicMastery/, "migração chama grandfather");
  assert.match(storeSrc, /lessonSessionStepById/, "resume de pass persistido");
  assert.match(storeSrc, /consumedChargeKeys/, "energia idempotente por pass");

  const playerSrc = await readFile(path.join(root, "src/features/lesson/LessonPlayer.tsx"), "utf8");
  assert.match(playerSrc, /allowSkipAhead: !topicNode/, "player não pula passes no anel 0–4");
  assert.match(playerSrc, /lessonPassXpRewardId/, "XP por pass");
  assert.match(playerSrc, /setLessonSessionStep/, "grava cursor da pass");

  const journeySrc = await readFile(path.join(root, "src/features/journey/JourneyPage.tsx"), "utf8");
  assert.match(journeySrc, /data-topic-progress/, "anel expõe 0/4–4/4");
  assert.match(journeySrc, /stageTotal = topicNode \? 4 : 1/, "ensino tem 4 segmentos");

  const proSrc = await readFile(path.join(root, "src/lib/proAccess.ts"), "utf8");
  assert.doesNotMatch(proSrc, /PHASE_MASTERY_STARS/, "3★ não é mais gate de fase");
  assert.match(proSrc, /isJourneyTopicComplete/, "unlock usa mastery 4/4");

  console.log(
    "OK test:topic-mastery-path —",
    [
      `${teaching.length} temas 4/4`,
      `${reviews.length} exceções`,
      "1/4 não destrava",
      "grandfather",
      "energia/XP ids",
      "sem skip-ahead visual",
    ].join("; ")
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:topic-mastery-path");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
