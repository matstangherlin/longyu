#!/usr/bin/env node
/**
 * RC-006 — pacote de auditoria humana das primeiras 20 sessões.
 *
 * Classifica. Não altera conteúdo automaticamente.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, journeyFingerprint, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outPath = path.join(rootDir, "docs/reports/first-20-sessions-human-review.md");
const checkOnly = process.argv.includes("--check");

const TOPIC_IDS = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
];
const PASSES = [1, 2, 3, 4];

const STEP_SECONDS = {
  intro: 18,
  listen: 12,
  listen_select: 22,
  comprehend: 18,
  dialogue_choice: 22,
  match_pairs: 35,
  sentence_build: 40,
  tone: 18,
  conversation_scene: 70,
  hanzi_build: 40,
  image_choice: 22,
  reverse_recall: 32,
  contextual_choice: 22,
  produce: 28,
  recognize: 16,
  flashcard: 16,
};

function csvEscape(value) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.includes("|")) return text.replace(/\|/g, "/");
  return text;
}

function stepSeconds(kind) {
  return STEP_SECONDS[kind] ?? 22;
}

function extractFields(step) {
  const hanzi = step.hanzi || step.text || step.targetHanzi || step.correctAnswer || "";
  const pinyin = step.pinyin || step.targetPinyin || step.sourcePinyin || "";
  const meaning = step.pt || step.targetMeaningPt || step.meaning || step.answer || "";
  const instruction =
    step.prompt ||
    step.promptPt ||
    step.dialoguePrompt ||
    step.title ||
    step.body ||
    "";
  const audioText = step.audioText || step.slowAudioText || step.text || "";
  const correctAnswer = step.correctAnswer || step.answer || step.blankAnswer || "";
  const scaffold = [step.helpMode, step.assist, step.explanation ? "explanation" : ""]
    .filter(Boolean)
    .join(" · ");
  return { hanzi, pinyin, meaning, instruction, audioText, correctAnswer, scaffold };
}

function classify(step, fields, options) {
  const flags = [];
  const graded = [
    "listen_select",
    "comprehend",
    "dialogue_choice",
    "match_pairs",
    "sentence_build",
    "contextual_choice",
    "reverse_recall",
    "tone",
  ].includes(step.kind);
  if (graded && !fields.correctAnswer && step.kind !== "match_pairs" && step.kind !== "sentence_build" && step.kind !== "tone") {
    flags.push("GRADED_MISSING_ANSWER");
  }
  if (Array.isArray(options) && options.length > 1 && new Set(options).size !== options.length) {
    flags.push("DUPLICATE_OPTIONS");
  }
  if (step.kind === "listen_select" && !fields.audioText) {
    flags.push("LISTEN_WITHOUT_AUDIO");
  }
  if (flags.includes("GRADED_MISSING_ANSWER") || flags.includes("DUPLICATE_OPTIONS")) {
    return { severity: "P0_CANDIDATE", flags };
  }
  if (flags.length) return { severity: "REVIEW", flags };
  return { severity: "OK", flags };
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-first20-"));
let sessions = [];
try {
  const program = ts.createProgram(
    [
      "src/data/foundationTopicPlans.ts",
      "src/data/journey.ts",
      "src/data/masteryLoop.ts",
      "src/data/topicMastery.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("FAIL report:first-20-sessions — TypeScript não compilou.");
    process.exit(1);
  }
  const { foundationAuthoredPlanFor } = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));

  let sessionNumber = 0;
  for (const topicId of TOPIC_IDS) {
    const lesson = ALL_LESSONS.find((item) => item.id === topicId);
    if (!lesson) {
      console.error(`FAIL: tópico ausente ${topicId}`);
      process.exit(1);
    }
    for (const pass of PASSES) {
      sessionNumber += 1;
      const authored = foundationAuthoredPlanFor(topicId, pass);
      const steps = authored && authored.length ? authored : lesson.steps;
      const estimated = steps.reduce((sum, step) => sum + stepSeconds(step.kind), 0);
      sessions.push({
        session: sessionNumber,
        topicId,
        topic: lesson.title,
        pass,
        estimatedMinutes: Math.max(1, Math.round(estimated / 60)),
        source: authored && authored.length ? "foundationAuthoredPlan" : "journey.steps (referência; planner pode variar)",
        steps: steps.map((step, index) => {
          const fields = extractFields(step);
          const options = step.options ?? [];
          const verdict = classify(step, fields, options);
          return {
            step: index + 1,
            kind: step.kind,
            ...fields,
            options,
            ...verdict,
          };
        }),
      });
    }
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (sessions.length < 20) {
  console.error(`FAIL: ${sessions.length} sessões (mínimo 20).`);
  process.exit(1);
}

const p0 = sessions.flatMap((session) =>
  session.steps.filter((step) => step.severity === "P0_CANDIDATE").map((step) => ({ session: session.session, ...step }))
);

const lines = [
  "# First 20 sessions — human-review pack",
  "",
  "Pacote de auditoria rápida dos primeiros passos reais (5 temas × 4 passes).",
  "Classifica apenas. **Não altera conteúdo automaticamente.** Corrigir só P0/P1 comprovado.",
  "",
  ...reportProvenanceLines(rootDir, { lessonCount: String(sessions.length) }),
  "## Como usar",
  "",
  "1. Abrir o QA Fast Path em Deploy Preview (`/qa`).",
  "2. Percorrer M1–M4 de cada tema abaixo.",
  "3. Registrar PASS humano só com evidência de dispositivo — automação não preenche.",
  "",
  "## Sessões",
  "",
];

for (const session of sessions) {
  lines.push(
    `### Sessão ${session.session} — ${session.topic} · M${session.pass}/4`,
    "",
    `- topic: \`${session.topicId}\``,
    `- pass: ${session.pass}`,
    `- estimated time: ~${session.estimatedMinutes} min`,
    `- source: ${session.source}`,
    "",
    "| step | kind | instruction | hanzi | pinyin | meaning | audioText | correctAnswer | scaffold | flag |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const step of session.steps) {
    lines.push(
      `| ${step.step} | ${step.kind} | ${csvEscape(step.instruction)} | ${csvEscape(step.hanzi)} | ${csvEscape(step.pinyin)} | ${csvEscape(step.meaning)} | ${csvEscape(step.audioText)} | ${csvEscape(step.correctAnswer)} | ${csvEscape(step.scaffold)} | ${step.severity}${step.flags.length ? ` (${step.flags.join(",")})` : ""} |`
    );
  }
  lines.push("");
}

lines.push(
  "## Classificação automática (não é correção)",
  "",
  p0.length
    ? p0.map((item) => `- Sessão ${item.session} passo ${item.step} (${item.kind}): ${item.flags.join(", ")}`).join("\n")
    : "Nenhum P0_CANDIDATE estrutural nas 20 sessões (faltando resposta, opções repetidas).",
  "",
  "P1/P2 (instrução ambígua, copy, visual) exigem humano. Não promover V5 pedagógica daqui.",
  ""
);

const report = finalizeReport(lines);

if (checkOnly) {
  if (p0.length) {
    console.error("FAIL test:first-20-sessions-pack — P0_CANDIDATE estrutural:");
    for (const item of p0) {
      console.error(` - sessão ${item.session} passo ${item.step} ${item.kind}: ${item.flags.join(",")}`);
    }
    process.exit(1);
  }
  console.log(
    `OK: test:first-20-sessions-pack — ${sessions.length} sessões · ${sessions.reduce((n, s) => n + s.steps.length, 0)} passos · fingerprint ${journeyFingerprint(rootDir)}.`
  );
  process.exit(0);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, report);
console.log(`Wrote ${path.relative(rootDir, outPath)} (${sessions.length} sessões).`);
if (!existsSync(outPath)) process.exit(1);
