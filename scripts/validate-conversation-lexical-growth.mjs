/**
 * validate:conversation-lexical-growth — LEX-019..021
 * Garante intents preenchidos e que conversas pós-expansão não ficam só em seed.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();

const SEED_INTENTS = new Set(["greet", "farewell", "thank", "greet-review", "ask-wellbeing"]);
const SEED_ANSWERS = new Set(["你好", "谢谢", "再见", "我很好", "不客气", "你好吗"]);

async function compileAndLoad() {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-lex-"));
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/conversationScenes.ts",
      "src/features/lesson/lessonTasks.ts",
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
  if (program.emit().emitSkipped) {
    await rm(outDir, { recursive: true, force: true });
    throw new Error("validate:conversation-lexical-growth: compile failed");
  }
  return { outDir, load: (rel) => require(path.join(outDir, rel)) };
}

async function main() {
  const { outDir, load } = await compileAndLoad();
  try {
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
    const { conversationSceneMainAnswer, conversationSceneById } = load(
      "src/data/conversationScenes.js"
    );

    const recentScenes = [];
    const recentIntents = [];
    let emptyIntent = 0;
    let totalScenes = 0;
    let seedOnlyAfterExpansion = 0;
    let expansionOpportunities = 0;
    const answers = [];

    const sample = ALL_LESSONS.filter((l) => !l.isReview).slice(0, 35);
    for (const lesson of sample) {
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: 0,
        silent: true,
        recentConversationSceneIds: [...recentScenes],
        recentConversationIntentIds: [...recentIntents],
      });
      const scenes = plan.filter((step) => step.kind === "conversation_scene");
      const lessonHasExpansion = (lesson.libraryItems ?? []).some(
        (ref) =>
          !["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao", "chunk:xiexie", "chunk:bukeqi", "chunk:zaijian", "chunk:nine"].includes(
            ref
          )
      );
      for (const scene of scenes) {
        totalScenes += 1;
        const sceneId = scene.sceneId ?? "";
        const intent =
          scene.sceneIntent ??
          scene.intent ??
          (sceneId ? conversationSceneById[sceneId]?.intent : undefined) ??
          "";
        if (!intent) emptyIntent += 1;
        const main = conversationSceneMainAnswer(scene) ?? "";
        answers.push(main);
        const catalog = conversationSceneById[sceneId];
        const refs = [...(catalog?.learnedRefs ?? []), ...(catalog?.newRefs ?? [])];
        const seedRefs = new Set([
          "chunk:nihao",
          "chunk:nihaoma",
          "chunk:wohenhao",
          "chunk:xiexie",
          "chunk:bukeqi",
          "chunk:zaijian",
          "chunk:nine",
        ]);
        const expansion = refs.filter((r) => !seedRefs.has(r));
        if (lessonHasExpansion) {
          expansionOpportunities += 1;
          if (expansion.length === 0 && SEED_INTENTS.has(intent)) seedOnlyAfterExpansion += 1;
        }
        recentScenes.unshift(sceneId);
        recentIntents.unshift(intent);
        if (recentScenes.length > 12) recentScenes.length = 12;
        if (recentIntents.length > 12) recentIntents.length = 12;
      }
    }

    console.log(`Scenes simulated: ${totalScenes}`);
    console.log(`Empty intents: ${emptyIntent}`);
    console.log(`Seed-only scenes on expansion lessons: ${seedOnlyAfterExpansion}/${expansionOpportunities}`);

    if (emptyIntent > 0) {
      console.error(`FAIL: ${emptyIntent} conversation steps missing intent (LEX-021)`);
      process.exitCode = 1;
    }
    if (totalScenes < 8) {
      console.error(`FAIL: too few conversation scenes in sample (${totalScenes})`);
      process.exitCode = 1;
    }
    // After expansion opportunities, at least 35% of scenes should carry non-seed refs.
    if (expansionOpportunities >= 6) {
      const seedRatio = seedOnlyAfterExpansion / expansionOpportunities;
      if (seedRatio > 0.7) {
        console.error(
          `FAIL: ${(seedRatio * 100).toFixed(0)}% of expansion-lesson conversations are seed-only (>70%)`
        );
        process.exitCode = 1;
      }
    }
    const distinctAnswers = new Set(answers.filter(Boolean));
    const seedAnswerHits = answers.filter((a) => SEED_ANSWERS.has(a)).length;
    console.log(`Distinct mainAnswers: ${distinctAnswers.size}; seed answer hits: ${seedAnswerHits}`);
    if (!process.exitCode) console.log("OK conversation lexical growth");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
