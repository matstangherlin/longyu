#!/usr/bin/env node
/**
 * RC2.2.24 — inventário de TODAS as conversation_scene das aulas (Pro
 * incluído) e matriz de StepKinds para a paridade Web × APK.
 *
 * Gera docs/reports/rc2-2-24-native-step-parity.json (dados) e confere com
 * `--check`. O relatório humano (.md) cita estes números e marca a coluna
 * ANDROID APK como NOT_RUN até haver teste físico — Web PASS não é APK PASS.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs/reports/rc2-2-24-native-step-parity.json");
const PASSES = [0, 1, 2, 3];
const FOCUS_KINDS = ["listen", "listen_select", "conversation_scene", "dialogue_choice", "tone", "free_production", "pronunciation", "contextual_choice"];

async function load() {
  const result = await build({
    stdin: { contents: 'export * as journey from "./src/data/journey.ts";\nexport * as tasks from "./src/features/lesson/lessonTasks.ts";', resolveDir: ROOT, loader: "ts" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    jsx: "automatic",
    define: { "import.meta.env": '{"DEV":false}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty", ".mp3": "empty" },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2224-parity-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function buildAudit() {
  const { journey, tasks } = await load();
  const lessons = journey.ALL_LESSONS;
  const scenes = new Map();
  const kinds = new Map();
  let planned = 0;
  for (const lesson of lessons) {
    for (const masteryLevel of PASSES) {
      let plan = [];
      try {
        plan = tasks.lessonRoundStepsFor(lesson, { masteryLevel, silent: true });
      } catch {
        plan = lesson.steps ?? [];
      }
      planned += 1;
      for (const step of plan) {
        const kindRow = kinds.get(step.kind) ?? { kind: step.kind, occurrences: 0, lessons: new Set(), premiumLessons: new Set() };
        kindRow.occurrences += 1;
        kindRow.lessons.add(lesson.id);
        if (lesson.premium) kindRow.premiumLessons.add(lesson.id);
        kinds.set(step.kind, kindRow);
        if (step.kind !== "conversation_scene") continue;
        const sceneId = step.sceneId ?? `${lesson.id}:inline`;
        const row = scenes.get(sceneId) ?? { sceneId, version: (step.nodes?.length ?? 0) > 0 ? "V2" : "V1", nodes: step.nodes?.length ?? 0, lines: step.lines?.length ?? 0, lessons: new Set(), premium: false, hasWrongBranch: false };
        row.lessons.add(lesson.id);
        row.premium = row.premium || Boolean(lesson.premium);
        row.hasWrongBranch = row.hasWrongBranch || (step.nodes ?? []).some((node) => node.interaction?.wrongNextNodeId);
        scenes.set(sceneId, row);
      }
    }
  }
  const sceneRows = [...scenes.values()].map((row) => ({ ...row, lessons: [...row.lessons].sort() })).sort((a, b) => a.sceneId.localeCompare(b.sceneId));
  const kindRows = [...kinds.values()]
    .map((row) => ({ kind: row.kind, occurrences: row.occurrences, lessons: row.lessons.size, premiumLessons: row.premiumLessons.size, focus: FOCUS_KINDS.includes(row.kind), webMobile: "WEB_E2E_COVERED_BY_SUITE", androidApk: "NOT_RUN" }))
    .sort((a, b) => a.kind.localeCompare(b.kind));
  return {
    schema: "longyu-rc2-2-24-native-step-parity/1",
    note: "Inventário gerado do plano real (todas as aulas × passes 0–3). ANDROID APK = NOT_RUN até teste físico; Web PASS ≠ APK PASS.",
    totals: {
      lessons: lessons.length,
      premiumLessons: lessons.filter((lesson) => lesson.premium).length,
      plansBuilt: planned,
      conversationScenes: sceneRows.length,
      conversationV1: sceneRows.filter((row) => row.version === "V1").length,
      conversationV2: sceneRows.filter((row) => row.version === "V2").length,
      premiumConversationScenes: sceneRows.filter((row) => row.premium).length,
      stepKinds: kindRows.length,
    },
    conversationScenes: sceneRows,
    stepKinds: kindRows,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const audit = await buildAudit();
  const text = `${JSON.stringify(audit, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== text) {
      console.error("FAIL audit:rc2-2-24-native-step-parity — inventário desatualizado (rode sem --check)");
      process.exit(1);
    }
    console.log(`PASS audit:rc2-2-24-native-step-parity (${audit.totals.conversationScenes} cenas, ${audit.totals.stepKinds} StepKinds)`);
  } else {
    fs.writeFileSync(OUT, text);
    console.log(`wrote ${path.relative(ROOT, OUT)}`, JSON.stringify(audit.totals));
  }
}
