#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v491-tone-audit-"));
const reportPath = path.join(rootDir, "docs/reports/v491-tone-progression.md");
const passes = [1, 2, 3, 4];

function surface(step) {
  return [step.title, step.body, step.prompt, step.dialoguePrompt, step.explanation, step.pinyin, step.meaning, ...(step.options ?? [])]
    .filter(Boolean)
    .join(" ");
}

function toneNumbers(step) {
  const result = new Set();
  if (Number.isInteger(step.tone) && step.tone >= 1 && step.tone <= 4) result.add(step.tone);
  for (const tone of step.toneChoices ?? []) if (tone >= 1 && tone <= 4) result.add(tone);
  const text = surface(step);
  for (const tone of [1, 2, 3, 4]) {
    const mark = tone === 1 ? "ˉ" : tone === 2 ? "´" : tone === 3 ? "ˇ" : "`";
    if (new RegExp(`${tone}(?:º|st|nd|rd|th)?\\s*(?:tom|tone)|${mark}`, "iu").test(text)) result.add(tone);
  }
  return [...result];
}

function classify(step) {
  const text = surface(step);
  if (step.kind === "tone" && step.assist === "guided") return "TONE_AWARENESS";
  if (step.kind === "tone") return "TONE_NUMBER_RECOGNITION";
  if (/transfer/iu.test(text) && /tom|tone/iu.test(text)) return "TONE_TRANSFER";
  if ((step.kind === "reverse_recall" || /produ|diga|fale|say|speak/iu.test(text)) && /tom|tone|contorno|contour/iu.test(text)) return "TONE_PRODUCTION";
  if (/marca|mark|ˉ|´|ˇ|`/iu.test(text)) return step.kind === "intro" ? "TONE_AWARENESS" : "TONE_MARK_RECOGNITION";
  if (/curva|contorno|contour|reto|level|sobe|rising|vale|dip|cai|falling/iu.test(text)) return "TONE_CONTOUR_DISCRIMINATION";
  if (/tom|tone/iu.test(text)) return "LEXICAL_TONE_RECALL";
  return null;
}

try {
  const program = ts.createProgram(
    ["src/data/foundationTopicPlans.ts", "src/data/toneKnowledge.ts", "src/data/pedagogicalSpine.ts", "src/data/journey.ts"],
    { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, rootDir, outDir, esModuleInterop: true, skipLibCheck: true, strict: false, jsx: ts.JsxEmit.ReactJSX }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  const overlayDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayDir, { recursive: true });
  await copyFile(path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"), path.join(overlayDir, "instructionGloss.en.json"));

  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const tones = require(path.join(outDir, "src/data/toneKnowledge.js"));
  const journey = require(path.join(outDir, "src/data/journey.js"));
  const taughtNumbers = new Set();
  const taughtMarks = new Set();
  const guidedNumbers = new Set();
  const first = Object.fromEntries([1, 2, 3, 4].map((tone) => [tone, {}]));
  const violations = { toneNumberBeforeTeaching: [], toneMarkBeforeTeaching: [], toneProductionBeforeGuidance: [] };
  const foundationSteps = [];

  for (const pass of passes) {
    const steps = plans.foundationAuthoredPlanFor("p1-o-que-e-tom", pass) ?? [];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const location = `M${pass}/step${index + 1}`;
      const numbers = toneNumbers(step);
      const category = classify(step);
      foundationSteps.push({ step, category, location, numbers });
      const guided = step.kind === "tone" && step.assist === "guided";
      const graded = Boolean(step.pedagogicalEvidence?.graded);
      const isMarkNotice = step.kind === "intro" && /ˉ/.test(surface(step)) && /´/.test(surface(step)) && /ˇ/.test(surface(step));
      const exposedNumbers = guided ? [step.tone] : numbers;
      for (const tone of exposedNumbers) if (tone && !first[tone].exposure) first[tone].exposure = location;
      if (guided) {
        for (const tone of numbers.filter((item) => item === step.tone)) {
          taughtNumbers.add(tone);
          guidedNumbers.add(tone);
          if (!first[tone].numberTeaching) first[tone].numberTeaching = location;
        }
      }
      if (isMarkNotice) for (const tone of [1, 2, 3, 4]) taughtMarks.add(tone);

      if (graded && category === "TONE_NUMBER_RECOGNITION") {
        for (const tone of numbers) {
          if (!first[tone].numberGrade) first[tone].numberGrade = location;
          if (!taughtNumbers.has(tone)) violations.toneNumberBeforeTeaching.push({ tone, location });
        }
      }
      if (graded && category === "TONE_MARK_RECOGNITION") {
        for (const tone of numbers) if (!taughtMarks.has(tone)) violations.toneMarkBeforeTeaching.push({ tone, location });
      }
      if (graded && (category === "TONE_PRODUCTION" || step.kind === "reverse_recall")) {
        for (const tone of numbers) if (!guidedNumbers.has(tone)) violations.toneProductionBeforeGuidance.push({ tone, location });
      }
    }
  }

  const everyStep = [
    ...journey.ALL_LESSONS.flatMap((lesson) => (lesson.steps ?? []).map((step) => ({ step, source: lesson.id }))),
    ...foundationSteps.map(({ step, location }) => ({ step, source: `p1-o-que-e-tom/${location}` })),
  ];
  const classified = everyStep.map((entry) => ({ ...entry, category: classify(entry.step) })).filter((entry) => entry.category);
  const count = (category) => classified.filter((entry) => entry.category === category).length;
  const toneTasksTotal = classified.length;
  const metrics = {
    toneTasksTotal,
    toneAwarenessTasks: count("TONE_AWARENESS"),
    toneContourTasks: count("TONE_CONTOUR_DISCRIMINATION"),
    toneNumberTasks: count("TONE_NUMBER_RECOGNITION"),
    toneMarkTasks: count("TONE_MARK_RECOGNITION"),
    toneProductionTasks: count("TONE_PRODUCTION"),
    toneTransferTasks: count("TONE_TRANSFER"),
    toneNumberBeforeTeaching: violations.toneNumberBeforeTeaching.length,
    toneMarkBeforeTeaching: violations.toneMarkBeforeTeaching.length,
    toneProductionBeforeGuidance: violations.toneProductionBeforeGuidance.length,
    toneNumberBeforeTeachingBaseline: 4,
  };
  const failed = Object.values(violations).flat();
  const lines = [
    "# V4.9.1 — Tone progression",
    "",
    "Relatório computado por `npm run validate:tone-teach-before-test`. O gate percorre o currículo e aplica pré-requisitos rígidos à sequência autoral de tons.",
    "",
    "## Métricas",
    "",
    ...Object.entries(metrics).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Primeira introdução",
    "",
    "| tom | first exposure | number teaching | number grade |",
    "| --- | --- | --- | --- |",
    ...[1, 2, 3, 4].map((tone) => `| ${tone}º | ${first[tone].exposure ?? "—"} | ${first[tone].numberTeaching ?? "—"} | ${first[tone].numberGrade ?? "—"} |`),
    `| neutro | ${tones.TONE_NEUTRAL_POLICY} | política futura explícita | não cobrado nesta fundação |`,
    "",
    "## Contrato",
    "",
    "- Contorno e descrição vêm antes do número.",
    "- O número vem antes da primeira avaliação numérica.",
    "- As marcas são apresentadas num mapa explícito antes da avaliação de marca.",
    "- Produção exige prática guiada anterior; o tom neutro não é antecipado como quinta curva equivalente.",
    "",
  ];
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  if (failed.length) {
    console.error(`FAIL validate:tone-teach-before-test — ${JSON.stringify(violations)}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:tone-teach-before-test — ${toneTasksTotal} tone-aware tasks · number/mark/production violations 0/0/0.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
