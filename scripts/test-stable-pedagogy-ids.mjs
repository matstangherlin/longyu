#!/usr/bin/env node
/**
 * V4.8.3 — stable pedagogical loc ids exist for topics 21–50.
 * First 20 remain on the PT-text overlay (compatibility resolver).
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-stable-ids-"));
try {
  const program = ts.createProgram(
    [
      "src/i18n/overlays/stablePedagogy.ts",
      "src/i18n/overlays/teachingTopics.ts",
      "src/i18n/overlays/instructionGloss.ts",
      "src/i18n/overlays/first20.ts",
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
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou test:stable-pedagogy-ids");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );
  await copyFile(
    path.join(root, "src/i18n/overlays/stablePedagogy.en.json"),
    path.join(outDir, "src/i18n/overlays/stablePedagogy.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const teaching = load("src/i18n/overlays/teachingTopics.js");
  const stable = load("src/i18n/overlays/stablePedagogy.js");
  const gloss = load("src/i18n/overlays/instructionGloss.js");
  const first20 = load("src/i18n/overlays/first20.js");

  const topicIds = stable.stablePedagogyTopicIds();
  if (topicIds.join("|") !== [...teaching.TOPICS_21_50_TEACHING_TOPIC_IDS].join("|")) {
    fail("stable catalog topicIds drifted from teachingTopics.ts");
  }
  if (stable.stablePedagogyEntryCount() < 1000) {
    fail(`expected a dense 21–50 loc catalog, got ${stable.stablePedagogyEntryCount()}`);
  }

  const sample = teaching.pedagogyMetaLocId("l9", "title");
  if (sample !== "p.l9.meta.title") fail(`pedagogyMetaLocId shape ${sample}`);
  const looked = stable.lookupStablePedagogy(sample);
  if (!looked?.en) fail("l9 meta title loc id missing EN");

  const first20Id = first20.FIRST_20_TEACHING_TOPIC_IDS[0];
  if (!first20.isFirst20TeachingTopic(first20Id)) fail("first-20 compatibility helper broken");
  if (!gloss.hasEnglishOverlay("Olá")) fail("first-20 PT overlay Olá missing");
  if (gloss.resolveInstructionText("Olá", "en") !== "Hello") fail("Olá overlay regression");

  const kinds = new Set(["DIRECT_TRANSLATION", "NATURAL_REWRITE", "SOURCE_LANGUAGE_ADAPTATION"]);
  const catalog = require(path.join(outDir, "src/i18n/overlays/stablePedagogy.en.json"));
  const seen = new Set();
  for (const entry of catalog.entries) {
    if (seen.has(entry.id)) fail(`duplicate loc id ${entry.id}`);
    seen.add(entry.id);
    if (!/^p\.[a-z0-9-]+\.(m[1-4]\.s\d{2}|meta)\./.test(entry.id)) fail(`bad loc id ${entry.id}`);
    if (!kinds.has(entry.kind)) fail(`bad kind ${entry.kind} on ${entry.id}`);
    if (!entry.en) fail(`empty EN on ${entry.id}`);
    if (first20.isFirst20TeachingTopic(entry.id.split(".")[1])) {
      fail(`first-20 topic leaked into 21–50 catalog: ${entry.id}`);
    }
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`test:stable-pedagogy-ids FAIL (${failures.length})`);
  for (const item of failures) console.error(` - ${item}`);
  process.exit(1);
}
console.log("test:stable-pedagogy-ids PASS");
