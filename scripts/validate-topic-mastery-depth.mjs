#!/usr/bin/env node
/**
 * V4.6 — validate:topic-mastery-depth
 *
 * Cada tema normal precisa de 4 objetivos cognitivos distintos, fiéis ao
 * título, sem pass vazia/duplicada/genérica de 你好. Gera
 * docs/reports/topic-mastery-path.md.
 */
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";
import {
  extractCanonicalCjk,
  isIndependentProduction,
  isTransferProduction,
} from "./lib/pedagogical-cjk.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "docs/reports/topic-mastery-path.md");
const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const BUDGET = {
  1: { min: 5, max: 8 },
  2: { min: 6, max: 8 },
  3: { min: 6, max: 9 },
  4: { min: 6, max: 9 },
};

const RECOGNITION = new Set([
  "intro",
  "listen",
  "listen_select",
  "comprehend",
  "flashcard",
  "image_choice",
  "match_pairs",
  "dialogue_choice",
]);
const DISCRIMINATION = new Set([
  "listen_select",
  "odd_one_out",
  "tone",
  "tone_pair",
  "audio_discrimination",
  "match_pairs",
  "dialogue_choice",
  "compare_with_image",
]);
const PRODUCTION = new Set([
  "sentence_build",
  "produce",
  "write",
  "free_production",
  "reverse_recall",
  "dialogue_completion",
  "hanzi_build",
]);
const TRANSFER = new Set(["transfer_task", "conversation_scene", "conversation_repair", "contextual_choice"]);

const GREETING_OK =
  /mandarim|pinyin|hànzì|hanzi|tom|nihao|olá|cumpriment|engine-2|primeiros-hanzi|\bl2\b|l2-rev/i;

function kindSig(plan) {
  return plan.map((step) => `${step.kind}:${step.correctAnswer ?? step.answer ?? step.audioText ?? step.title ?? ""}`).join("|");
}

function overlap(a, b) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b.split("|"));
  const parts = a.split("|");
  let hit = 0;
  for (const part of parts) if (setB.has(part)) hit += 1;
  return hit / Math.max(parts.length, setB.size);
}

function allowsNihao(lesson) {
  return GREETING_OK.test(`${lesson.id} ${lesson.title}`);
}

function planUsesNihao(plan) {
  return plan.some((step) => {
    const blob = [step.correctAnswer, step.answer, step.audioText, step.hanzi].filter(Boolean).join("");
    return blob.includes("你好");
  });
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-topic-depth-"));
try {
  const program = ts.createProgram(
    [
      "src/data/journey.ts",
      "src/data/topicMastery.ts",
      "src/data/topicMasterySpecs.ts",
      "src/features/lesson/lessonTasks.ts",
    ],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir: rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar validate:topic-mastery-depth.");
    process.exit(1);
  }

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const topic = load("src/data/topicMastery.js");
  const { topicMasterySpecFor, authoredTopicMasterySpecIds } = load("src/data/topicMasterySpecs.js");
  const { lessonRoundStepsFor, estimatePassMinutesFromPlan } = load("src/features/lesson/lessonTasks.js");
  const { topicMasteryBonusStepsFor } = load("src/data/topicMasteryBonus.js");

  const teaching = ALL_LESSONS.filter((lesson) => topic.isTopicMasteryLesson(lesson));
  const exceptions = ALL_LESSONS.filter((lesson) => !topic.isTopicMasteryLesson(lesson)).map((lesson) => ({
    lesson,
    exception: topic.topicMasteryExceptionFor(lesson),
  }));

  const rows = [];
  let totalSessions = 0;
  let totalHours = 0;
  let stepSum = 0;
  let stepCount = 0;

  for (const lesson of ALL_LESSONS) {
    if (!topic.isTopicMasteryLesson(lesson)) {
      totalSessions += 1;
      const plan = lessonRoundStepsFor(lesson, { silent: true, attemptNumber: 0 });
      totalHours += estimatePassMinutesFromPlan(plan) / 60;
      continue;
    }

    const spec = topicMasterySpecFor(lesson);
    if (!spec) {
      fail(`${lesson.id}: tema de ensino sem TopicMasterySpec`);
      continue;
    }
    const objectives = [1, 2, 3, 4].map((pass) => spec.passObjectives[pass] ?? "");
    if (objectives.some((text) => !text.trim())) {
      fail(`${lesson.id}: pass objective vazio`);
    }
    const uniqueObjectives = new Set(objectives.map((text) => text.trim().toLowerCase()));
    if (uniqueObjectives.size < 4) {
      fail(`${lesson.id}: objetivos de pass duplicados — as quatro não são cognitivamente distintas`);
    }

    const titleTokens = lesson.title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);
    const blob = `${lesson.title} ${spec.promise} ${objectives.join(" ")} ${spec.canonicalExamples.join(" ")}`.toLowerCase();
    const related = titleTokens.length === 0 || titleTokens.some((token) => blob.includes(token));
    if (!related) {
      fail(`${lesson.id}: objetivos não falam da promessa "${lesson.title}"`);
    }

    const plans = {};
    for (const pass of [1, 2, 3, 4]) {
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: pass - 1,
        masteryPass: pass,
        silent: true,
        attemptNumber: 0,
      });
      plans[pass] = plan;
      totalSessions += 1;
      const minutes = estimatePassMinutesFromPlan(plan);
      totalHours += minutes / 60;
      stepSum += plan.length;
      stepCount += 1;
      if (plan.length === 0) fail(`${lesson.id} M${pass}: pass vazia`);
      const budget = BUDGET[pass];
      if (plan.length > 16) fail(`${lesson.id} M${pass}: padding excessivo (${plan.length} passos)`);
      if (plan.length < 3) fail(`${lesson.id} M${pass}: pass curta demais (${plan.length})`);
      if (plan.length < budget.min - 2 || plan.length > budget.max + 4) {
        warn(`${lesson.id} M${pass}: ${plan.length} passos (alvo ${budget.min}–${budget.max})`);
      }
    }

    if (!plans[1].some((step) => RECOGNITION.has(step.kind))) {
      fail(`${lesson.id} M1: sem reconhecimento/introdução concreta`);
    }
    if (!plans[2].some((step) => DISCRIMINATION.has(step.kind) || RECOGNITION.has(step.kind))) {
      fail(`${lesson.id} M2: sem discriminação/consolidação`);
    }
    if (!plans[3].some((step) => PRODUCTION.has(step.kind) || step.kind === "dialogue_choice")) {
      fail(`${lesson.id} M3: sem produção/recuperação`);
    }
    if (!spec.transferOptionalReason && !plans[4].some((step) => TRANSFER.has(step.kind) || PRODUCTION.has(step.kind))) {
      fail(`${lesson.id} M4: sem transferência/aplicação`);
    }

    for (const [a, b] of [
      [1, 2],
      [2, 3],
      [3, 4],
    ]) {
      const ratio = overlap(kindSig(plans[a]), kindSig(plans[b]));
      if (ratio >= 0.92) {
        fail(`${lesson.id}: M${a} e M${b} são cópias mecânicas (overlap ${ratio.toFixed(2)})`);
      }
    }

    if (!allowsNihao(lesson) && !spec.canonicalExamples.some((item) => item.includes("你好"))) {
      for (const pass of [1, 2, 3, 4]) {
        const bonus = topicMasteryBonusStepsFor(lesson.id, pass);
        if (
          bonus.some(
            (step) =>
              step.correctAnswer === "你好" || step.answer === "你好" || step.audioText === "你好"
          )
        ) {
          fail(`${lesson.id} M${pass}: bônus genérico usa 你好 fora da promessa do tema`);
        }
      }
    }

    rows.push({ lesson, spec, plans, objectives });
  }

  for (const item of exceptions) {
    if (!item.exception?.reason) {
      fail(`${item.lesson.id}: exceção sem reason`);
    }
  }

  const sessions = [];
  let elapsed = 0;
  let ordinal = 0;
  for (const lesson of ALL_LESSONS) {
    const topicNode = topic.isTopicMasteryLesson(lesson);
    const passes = topicNode ? [1, 2, 3, 4] : [1];
    for (const pass of passes) {
      ordinal += 1;
      const plan = lessonRoundStepsFor(lesson, {
        masteryLevel: topicNode ? pass - 1 : undefined,
        masteryPass: topicNode ? pass : undefined,
        silent: true,
        attemptNumber: 0,
      });
      const minutes = estimatePassMinutesFromPlan(plan);
      sessions.push({
        ordinal,
        lesson,
        pass,
        plan,
        minutes,
        elapsedBefore: elapsed,
      });
      elapsed += minutes;
    }
  }

  const first = (predicate) => sessions.find((row) => predicate(row));
  const isMandarin = (step) =>
    step.kind === "conversation_scene" ||
    ["listen_select", "listen", "comprehend", "sentence_build", "produce"].includes(step.kind) &&
      extractCanonicalCjk(step).length > 0;
  const firstInteraction = first((row) => row.plan.some(isMandarin));
  const firstConversation = first((row) => row.plan.some((step) => step.kind === "conversation_scene"));
  const firstIndependent = first((row) => row.plan.some(isIndependentProduction));
  const firstTransfer = first(
    (row) =>
      row.plan.some(isTransferProduction) ||
      (row.pass === 4 && row.plan.some((step) => step.kind === "conversation_scene" || step.kind === "contextual_choice"))
  );

  if (!firstInteraction || firstInteraction.ordinal !== 1) {
    fail(`timeToFirstInteraction sessionOrdinal=${firstInteraction?.ordinal ?? "nunca"} (precisa ser 1)`);
  }
  if (!firstConversation || firstConversation.elapsedBefore > 10) {
    fail(
      `timeToFirstConversation=${firstConversation ? `${firstConversation.elapsedBefore.toFixed(1)} min` : "nunca"} (teto 10)`
    );
  }
  if (!firstIndependent || firstIndependent.elapsedBefore > 30) {
    fail(
      `timeToFirstIndependentProduction=${firstIndependent ? `${firstIndependent.elapsedBefore.toFixed(1)} min` : "nunca"} (teto 30)`
    );
  }
  if (!firstTransfer || firstTransfer.elapsedBefore > 60) {
    fail(
      `timeToFirstTransfer=${firstTransfer ? `${firstTransfer.elapsedBefore.toFixed(1)} min` : "nunca"} (teto 60)`
    );
  }

  const avgSteps = stepCount ? stepSum / stepCount : 0;
  const authoredIds = new Set(authoredTopicMasterySpecIds());
  const first30 = rows.slice(0, 30);

  const lines = [
    "# V4.6 — Topic Mastery Path",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
    "",
    "Semântica (TM-015): **ACQUIRED** = `completedLessons` (primeira exposição válida; SRS/achievements/analytics).",
    "**MASTERED** = `lessonMasteryById.level >= 4` (path complete da Jornada). Unlock usa MASTERED, não ACQUIRED.",
    "",
    "Energia (TM-018): uma carga por pass, chave `consume:lesson:{id}:pass:{n}:{day}`. Não cobra por exercício nem no reload da mesma pass.",
    "XP (TM-019): `lesson:{id}:pass:{n}:xp` na primeira vez; prática menor e diária; bônus único 4/4.",
    "Estrelas (TM-017): qualidade, não o anel 4/4.",
    "",
    "## Resumo",
    "",
    "| Métrica | Valor |",
    "|---------|------:|",
    `| Nós totais | ${ALL_LESSONS.length} |`,
    `| Temas 4-pass | ${teaching.length} |`,
    `| Exceções (review/checkpoint) | ${exceptions.length} |`,
    `| Specs autoradas | ${authoredIds.size} |`,
    `| Sessões estimadas | ${totalSessions} |`,
    `| Horas estimadas | ${totalHours.toFixed(1)} |`,
    `| Média de passos/pass | ${avgSteps.toFixed(1)} |`,
    "",
    "## Primeira vitória (sessão + minutos)",
    "",
    "Métricas antigas por `lessonIndex` continuam em `reports/first-communicative-win.md`. Aqui a unidade é a **pass** (4 por tema de ensino).",
    "",
    "| Métrica | Sessão | Minutos até o início | Onde |",
    "|---------|------:|---------------------:|------|",
    `| timeToFirstInteraction | ${firstInteraction?.ordinal ?? "—"} | ${firstInteraction?.elapsedBefore.toFixed(1) ?? "—"} | ${firstInteraction ? `${firstInteraction.lesson.title} M${firstInteraction.pass}` : "—"} |`,
    `| timeToFirstConversation | ${firstConversation?.ordinal ?? "—"} | ${firstConversation?.elapsedBefore.toFixed(1) ?? "—"} | ${firstConversation ? `${firstConversation.lesson.title} M${firstConversation.pass}` : "—"} |`,
    `| timeToFirstIndependentProduction | ${firstIndependent?.ordinal ?? "—"} | ${firstIndependent?.elapsedBefore.toFixed(1) ?? "—"} | ${firstIndependent ? `${firstIndependent.lesson.title} M${firstIndependent.pass}` : "—"} |`,
    `| timeToFirstTransfer | ${firstTransfer?.ordinal ?? "—"} | ${firstTransfer?.elapsedBefore.toFixed(1) ?? "—"} | ${firstTransfer ? `${firstTransfer.lesson.title} M${firstTransfer.pass}` : "—"} |`,
    "",
    "## Exceções",
    "",
    "| Lição | Tipo | Passes | Motivo |",
    "|-------|------|-------:|--------|",
    ...exceptions.map(
      (item) =>
        `| ${item.lesson.title} (\`${item.lesson.id}\`) | ${item.exception?.kind ?? "?"} | 1 | ${item.exception?.reason ?? "sem reason"} |`
    ),
    "",
    "## Primeiros 30 temas",
    "",
    "| Tema | M1 | M2 | M3 | M4 |",
    "|------|----|----|----|----|",
    ...first30.map(
      (row) =>
        `| ${row.lesson.title} | ${row.objectives[0]} | ${row.objectives[1]} | ${row.objectives[2]} | ${row.objectives[3]} |`
    ),
    "",
    "## Avisos",
    "",
    warnings.length === 0 ? "Nenhum." : warnings.map((message) => `- ${message}`).join("\n"),
    "",
    "## Falhas",
    "",
    failures.length === 0 ? "Nenhuma." : failures.map((message) => `- ${message}`).join("\n"),
    "",
  ];

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, finalizeReport(lines), "utf8");

  if (failures.length) {
    console.error("FAIL validate:topic-mastery-depth");
    for (const message of failures) console.error(" -", message);
    process.exit(1);
  }
  console.log(
    `OK validate:topic-mastery-depth — ${teaching.length} temas, ${exceptions.length} exceções, ~${totalSessions} sessões, ${avgSteps.toFixed(1)} passos/pass`
  );
} catch (error) {
  console.error("FAIL validate:topic-mastery-depth");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
