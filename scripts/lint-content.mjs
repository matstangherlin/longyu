#!/usr/bin/env node
/**
 * lint:content — falha em regressão de texto. A linha de base só encolhe.
 * Fases p1 e p2 não podem ter violação, nem dentro da linha de base.
 *
 *   npm run lint:content
 *   npm run lint:content -- --json
 *   npm run lint:content -- --update-baseline
 *   npm run lint:content -- --update-baseline --allow-grow   (proibido em CI)
 */
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import {
  CHOICE_KINDS,
  cjkGlyphs,
  hasDoublePunctuation,
  hasUnresolvedPlaceholder,
  isChoiceQuestion,
  missingPieces,
} from "./lib/content-lint-rules.mjs";

const require = createRequire(import.meta.url);
const root = process.cwd();
const baselinePath = path.join(root, "scripts/lint-content.baseline.json");
const exceptionsPath = path.join(root, "scripts/lint-content.exceptions.json");
const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const update = args.has("--update-baseline");
const allowGrow = args.has("--allow-grow");
const EARLY = new Set(["p1", "p2"]);
const TEXT_FIELDS = ["dialoguePrompt", "prompt", "situationPt", "title", "body"];

if (allowGrow && process.env.CI) {
  console.error("lint:content: --allow-grow não pode rodar no CI.");
  process.exit(2);
}

const started = Date.now();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-lint-content-"));
const program = ts.createProgram(
  [
    "src/data/journey.ts",
    "src/features/lesson/lessonTasks.ts",
    "src/features/lesson/exerciseValidation.ts",
    "src/data/exerciseFeasibility.ts",
    "src/features/lesson/reviewTargets.ts",
    "src/lib/text/learnerCopy.ts",
    "src/data/characters.ts",
    "src/data/radicals.ts",
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
const emit = program.emit();
if (emit.emitSkipped) {
  console.error("lint:content: falha ao compilar as lições.");
  process.exit(1);
}
const load = (relative) => require(path.join(outDir, relative));
const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
const { lessonRoundStepsFor, curriculumGlyphsThroughLesson } = load("src/features/lesson/lessonTasks.js");
const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
const { materializeRuntimeStep, isEvaluableQuestionStep } = load("src/data/exerciseFeasibility.js");
const { reviewTargetsForMistake, taughtRefsForLesson, SKILL_TRACK } = load("src/features/lesson/reviewTargets.js");
const { polishLearnerText } = load("src/lib/text/learnerCopy.js");
const { CHARACTERS } = load("src/data/characters.js");
const { radicalById } = load("src/data/radicals.js");

const phaseOf = new Map();
for (const phase of JOURNEY) {
  for (const unit of phase.units ?? []) {
    for (const lesson of unit.lessons ?? []) phaseOf.set(lesson.id, phase.id);
  }
}

const exceptions = existsSync(exceptionsPath) ? JSON.parse(readFileSync(exceptionsPath, "utf8")) : { glyphs: [] };
const exceptGlyphs = new Set((exceptions.glyphs ?? []).map((item) => item.glyph));
const exceptSteps = new Set((exceptions.steps ?? []).map((item) => `${item.ruleId}|${item.step}`));

const focusIntro = new Map();
ALL_LESSONS.forEach((lesson, index) => {
  for (const glyph of curriculumGlyphsThroughLesson(lesson.id)) {
    if (!focusIntro.has(glyph)) focusIntro.set(glyph, index);
  }
});
const lessonIndex = new Map(ALL_LESSONS.map((lesson, index) => [lesson.id, index]));

function shown(step, field) {
  const raw = step?.[field];
  if (!raw) return "";
  return polishLearnerText(String(raw).replaceAll("我叫Matheus", "我叫 Lucas").replaceAll("Matheus", "Lucas"), step.sourceText) ?? "";
}

function violation(ruleId, lesson, pass, index, step, excerpt) {
  const phase = phaseOf.get(lesson.id) ?? "other";
  const stepId = `${lesson.id}|${pass}|${index}|${step.kind}`;
  if (exceptSteps.has(`${ruleId}|${stepId}`)) return null;
  return {
    ruleId,
    lessonId: lesson.id,
    phase,
    pass,
    step: stepId,
    kind: step.kind,
    excerpt: String(excerpt ?? "").replace(/\s+/g, " ").slice(0, 90),
  };
}

function keyOf(item) {
  return `${item.ruleId}|${item.step}`;
}

const fresh = [];

for (const lesson of ALL_LESSONS) {
  const introduced = taughtRefsForLesson(lesson);
  const track = SKILL_TRACK[lesson.skill] ?? "fala";
  const indexInJourney = lessonIndex.get(lesson.id) ?? 0;
  for (const pass of [1, 2, 3, 4]) {
    let steps = [];
    try {
      steps = lessonRoundStepsFor(lesson, { masteryPass: pass }) ?? [];
    } catch (error) {
      const planned = violation("CL006-runtime-validator-reject", lesson, pass, 0, { kind: "plan" }, String(error?.message ?? error));
      if (planned) fresh.push(planned);
      continue;
    }
    steps.forEach((rawStep, index) => {
      const step = materializeRuntimeStep(rawStep);
      for (const field of TEXT_FIELDS) {
        const text = shown(step, field);
        if (text && hasDoublePunctuation(text)) {
          const item = violation("CL001-double-punctuation", lesson, pass, index, step, text);
          if (item) fresh.push(item);
        }
        if (text && hasUnresolvedPlaceholder(text)) {
          const item = violation("CL002-unresolved-placeholder", lesson, pass, index, step, text);
          if (item) fresh.push(item);
        }
      }
      if (CHOICE_KINDS.has(step.kind)) {
        const enunciado = shown(step, "dialoguePrompt") || shown(step, "prompt") || shown(step, "situationPt") || shown(step, "title");
        if (enunciado && !isChoiceQuestion(enunciado)) {
          const item = violation("CL003-choice-prompt-not-question", lesson, pass, index, step, enunciado);
          if (item) fresh.push(item);
        }
      }
      if (step.kind === "sentence_build" || step.kind === "reverse_recall") {
        const target = step.correctAnswer || step.answer || (step.target ?? []).join("") || (step.targetParts ?? []).join("");
        const pieces = [
          ...(step.bank ?? []),
          ...(step.wordBank ?? []),
          ...(step.productionHelpBuildBank ?? []),
          ...(step.targetParts ?? []),
          ...(step.target ?? []),
        ];
        const missing = missingPieces(target, pieces);
        if (missing.length) {
          const item = violation("CL004-unassemblable-target", lesson, pass, index, step, `${target} sem ${missing.join("")}`);
          if (item) fresh.push(item);
        }
      }
      if (step.kind === "fill_blank" && step.blankAnswer && (step.bank ?? []).length) {
        const missing = missingPieces(step.blankAnswer, step.bank);
        if (missing.length) {
          const item = violation("CL004-unassemblable-target", lesson, pass, index, step, `${step.blankAnswer} sem ${missing.join("")}`);
          if (item) fresh.push(item);
        }
      }
      for (const field of ["correctAnswer", "answer", "hanzi", "blankAnswer", "audioText", "text"]) {
        const glyphs = cjkGlyphs(step[field]);
        if (glyphs.length !== 1) continue;
        const glyph = glyphs[0];
        if (exceptGlyphs.has(glyph)) continue;
        const intro = focusIntro.get(glyph);
        if (intro == null || intro <= indexInJourney) continue;
        const item = violation("CL005-hanzi-before-intro", lesson, pass, index, step, glyph);
        if (item) fresh.push(item);
      }
      const checked = validateExercise(step);
      if (!checked.valid) {
        const item = violation("CL006-runtime-validator-reject", lesson, pass, index, step, (checked.errors ?? []).join("; "));
        if (item) fresh.push(item);
      }
      const cjkAnswer = cjkGlyphs([step.correctAnswer, step.answer, step.hanzi, step.audioText, (step.target ?? []).join(""), (step.targetParts ?? []).join("")].join("")).length > 0;
      if (isEvaluableQuestionStep(step) && cjkAnswer) {
        const targets = reviewTargetsForMistake(step, track, introduced);
        const unfiltered = reviewTargetsForMistake(step, track, undefined);
        if (targets.length === 0 && unfiltered.length === 0) {
          const item = violation("CL007-evaluated-step-without-review-target", lesson, pass, index, step, step.correctAnswer || step.answer || step.hanzi || step.kind);
          if (item) fresh.push(item);
        }
      }
    });
  }
}

const charIds = new Set(CHARACTERS.map((char) => char.id));
for (const char of CHARACTERS) {
  for (const componentId of char.components ?? []) {
    if (radicalById[componentId] || charIds.has(componentId)) continue;
    const intro = focusIntro.get(char.hanzi);
    const host = intro == null ? null : ALL_LESSONS[intro];
    fresh.push({
      ruleId: "CL008-unknown-component",
      lessonId: host?.id ?? "catalog",
      phase: host ? phaseOf.get(host.id) ?? "other" : "catalog",
      pass: 0,
      step: `catalog|${char.id}|${componentId}`,
      kind: "character",
      excerpt: `${char.hanzi} componente ${componentId}`,
    });
  }
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, "utf8")) : { version: 1, entries: [] };
const baselineEntries = baseline.entries ?? [];
const freshKeys = new Set(fresh.map(keyOf));
const baseKeys = new Set(baselineEntries.map(keyOf));
const early = fresh.filter((item) => EARLY.has(item.phase));
const novel = fresh.filter((item) => !baseKeys.has(keyOf(item)) && !EARLY.has(item.phase));
const stale = baselineEntries.filter((item) => !freshKeys.has(keyOf(item)));
const earlyInBaseline = baselineEntries.filter((item) => EARLY.has(item.phase));

if (update) {
  if (novel.length && !allowGrow) {
    console.error(`lint:content: ${novel.length} violação(ões) nova(s). --update-baseline só remove. Use --allow-grow fora do CI para registrar dívida.`);
    process.exit(1);
  }
  if (early.length) {
    console.error(`lint:content: fases 1–2 têm ${early.length} violação(ões). A linha de base não pode escondê-las.`);
    for (const item of early.slice(0, 30)) console.error(`  ${item.ruleId} ${item.step} ${item.excerpt}`);
    process.exit(1);
  }
  const next = {
    version: 1,
    entries: fresh
      .filter((item) => !EARLY.has(item.phase))
      .map((item) => ({ ruleId: item.ruleId, lessonId: item.lessonId, phase: item.phase, pass: item.pass, step: item.step, excerpt: item.excerpt }))
      .sort((a, b) => keyOf(a).localeCompare(keyOf(b))),
  };
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`lint:content: linha de base atualizada (${next.entries.length} entradas, removidas ${stale.length}, novas ${novel.length}).`);
  process.exit(0);
}

const failures = [];
if (!existsSync(baselinePath)) failures.push("linha de base ausente");
if (early.length) failures.push(`${early.length} violação(ões) nas fases 1–2`);
if (earlyInBaseline.length) failures.push(`${earlyInBaseline.length} entrada(s) de fase 1–2 na linha de base`);
if (novel.length) failures.push(`${novel.length} violação(ões) nova(s) fora da linha de base`);
if (stale.length) failures.push(`${stale.length} entrada(s) obsoleta(s) na linha de base — rode --update-baseline`);

const byRule = new Map();
for (const item of fresh) byRule.set(item.ruleId, (byRule.get(item.ruleId) ?? 0) + 1);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

if (asJson) {
  console.log(JSON.stringify({ elapsedSec: Number(elapsed), total: fresh.length, byRule: Object.fromEntries(byRule), early, novel, stale: stale.length, failures }, null, 2));
} else {
  console.log(`lint:content ${fresh.length} violação(ões) atuais em ${elapsed}s`);
  for (const [ruleId, count] of [...byRule.entries()].sort()) console.log(`  ${ruleId}  ${count}`);
  if (failures.length) {
    console.error("FALHA");
    for (const line of failures) console.error(`  ${line}`);
    for (const item of early.slice(0, 20)) console.error(`  fase ${item.phase} ${item.ruleId} ${item.step} ${item.excerpt}`);
    for (const item of novel.slice(0, 20)) console.error(`  nova ${item.ruleId} ${item.step} ${item.excerpt}`);
  } else {
    console.log("OK lint:content");
  }
}
process.exit(failures.length ? 1 : 0);
