#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-boosters-"));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

try {
  const program = ts.createProgram(
    ["src/data/journeyOrchestrator.ts", "src/data/lessonCapsules.ts", "src/lib/journeyNodeProgress.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false, jsx: ts.JsxEmit.ReactJSX }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));
  const nodes = require(path.join(outDir, "src/data/journeyOrchestrator.js"));
  const capsules = require(path.join(outDir, "src/data/lessonCapsules.js"));
  const progress = require(path.join(outDir, "src/lib/journeyNodeProgress.js"));
  const routes = await readFile(path.join(rootDir, "src/routes.tsx"), "utf8");
  const journeyPage = await readFile(path.join(rootDir, "src/features/journey/JourneyPage.tsx"), "utf8");
  // V4.9.2: as URLs dos reforços saíram das nove cópias no JourneyPage e passaram
  // a viver em `routeForJourneyNode`. O contrato auditado é o mesmo — a Jornada
  // reusa os engines existentes —, só mudou onde a resposta é escrita.
  const orchestratorSrc = await readFile(path.join(rootDir, "src/data/journeyOrchestrator.ts"), "utf8");
  const inlineNode = await readFile(path.join(rootDir, "src/features/journey/JourneyInlineNode.tsx"), "utf8");
  const tonePage = await readFile(path.join(rootDir, "src/features/som/SomPage.tsx"), "utf8");
  const boosterPage = await readFile(path.join(rootDir, "src/features/journey/JourneyBoosterPage.tsx"), "utf8");

  const boosters = [
    nodes.TONE_CONTOUR_INTRO_NODE,
    nodes.TONE_NUMBER_NODE,
    nodes.PINYIN_PRACTICE_NODE,
    nodes.HANZI_BUILDER_NODE,
    nodes.FIRST_CONVERSATION_NODE,
    nodes.JOURNEY_REVIEW_NODE,
    nodes.IMMERSION_READINESS_NODE,
  ];
  check(boosters.every(Boolean), "all V4.9.1 booster nodes must exist");
  check(boosters.every((node) => node.affectsCoreMastery === false), "auxiliary boosters must never affect core mastery");
  check(boosters.every((node) => node.priority !== "CORE"), "boosters must remain recommended or optional");
  check(nodes.TONE_CONTOUR_INTRO_NODE.allowedTones.join(",") === "1,3", "early Tone Trainer must allow only 1st/3rd tones");
  check(nodes.TONE_NUMBER_NODE.allowedTones.join(",") === "1,2,3,4", "number booster must allow all four taught tones");
  // V4.9.2: a V4.9.1 declarava NOTICED enquanto o painel exigia mastery 1 (1×3)
  // e 2 (1–4). A declaração era mais frouxa do que o portão real, então este
  // gate petrificava o valor errado. Agora audita o piso pela ordem de estágio,
  // não por igualdade literal — assim uma correção para cima nunca falha, e um
  // afrouxamento silencioso continua falhando.
  const STAGE_ORDER = ["UNSEEN", "EXPOSED", "NOTICED", "GUIDED", "RECOGNIZED", "RECALLED", "PRODUCED", "TRANSFERRED", "MASTERED"];
  const atLeast = (actual, floor) => STAGE_ORDER.indexOf(actual) >= STAGE_ORDER.indexOf(floor);
  check(atLeast(nodes.TONE_CONTOUR_INTRO_NODE.minimumKnowledgeStages["concept:tone-1"], "GUIDED"), "tone 1 readiness missing");
  check(atLeast(nodes.TONE_CONTOUR_INTRO_NODE.minimumKnowledgeStages["concept:tone-3"], "GUIDED"), "tone 3 readiness missing");
  check(
    ["concept:tone-1", "concept:tone-2", "concept:tone-3", "concept:tone-4"].every((id) =>
      atLeast(nodes.TONE_NUMBER_NODE.minimumKnowledgeStages[id], "RECOGNIZED")
    ),
    "tone number booster must require discrimination-level readiness"
  );
  check(nodes.HANZI_BUILDER_NODE.allowedKnowledgeTargetIds.join(",") === "char:mu,char:ren", "Hanzi booster introduced unknown characters");
  check(nodes.JOURNEY_REVIEW_NODE.sourceId === "current-srs-queue", "Journey Review must reference the shared SRS queue");
  check(nodes.IMMERSION_READINESS_NODE.minimumKnownChunks > 0 && nodes.IMMERSION_READINESS_NODE.minimumKnownPatterns > 0, "Immersion readiness thresholds missing");
  check(progress.AUX_NODE_PROGRESS_LOCAL_ONLY === true, "local-only auxiliary progress contract missing");
  check(capsules.PINYIN_FOUNDATION_CAPSULE.mediaType === "ANIMATED_CAPSULE", "Pinyin capsule pilot changed media identity");
  check(Array.isArray(capsules.PINYIN_FOUNDATION_CAPSULE.localized.en.segments), "capsule EN contract missing");
  check(routes.includes("JourneyBoosterPage") && routes.includes("jornada/reforco/:nodeId"), "conversation booster route missing");
  check(tonePage.includes("<ToneTrainer journeyNode=") && tonePage.includes("completeJourneyNode(journeyNode.id)"), "Tone Trainer engine was not reused by Journey");
  check(boosterPage.includes("ConversationSceneStep") && !boosterPage.includes("function Conversation"), "conversation engine must be reused, not copied");
  check(boosterPage.includes("constrainSceneToKnownTargets") && boosterPage.includes("CONTROLLED_UNKNOWN_DISTRACTORS"), "early conversation must not expose untaught Mandarin distractors");
  check(
    orchestratorSrc.includes("/revisao?${query}") &&
      orchestratorSrc.includes("/pinyin?${query}") &&
      orchestratorSrc.includes("/hanzi?char=mu&${query}"),
    "Journey links must use existing Review/Pinyin/Hanzi engines"
  );
  check(
    inlineNode.includes("routeForJourneyNode(node)") && journeyPage.includes("auxiliaryJourneyNodesAfterTopic"),
    "Journey must render boosters inline from the shared route resolver"
  );

  if (failures.length) {
    console.error("FAIL test:v491-boosters");
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`PASS test:v491-boosters — ${boosters.length} contextual boosters · existing engines reused · core mastery false · auxiliary progress local-only.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
