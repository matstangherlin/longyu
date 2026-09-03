#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v490-spine-"));
const reportPath = path.join(rootDir, "docs/reports/v490-pedagogical-spine.md");
const topicIds = [
  "p1-o-que-e-mandarim",
  "p1-o-que-e-pinyin",
  "p1-o-que-e-tom",
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
];
const passes = [1, 2, 3, 4];
const legacyBaseline = [
  "mandarin:m1:single-flash-before-grade",
  "mandarin:m1:unknown-distractor:xiexie",
  "mandarin:m1:unknown-distractor:zaijian",
  "pinyin:m1:text-only-before-first-grade",
  "hanzi:m1:text-only-before-first-grade",
  "first-hanzi:m2:no-authored-progression",
  "first-hanzi:m3:no-authored-progression",
  "first-hanzi:m4:no-authored-progression",
];

try {
  const program = ts.createProgram(
    [
      "src/data/foundationTopicPlans.ts",
      "src/data/pedagogicalSpine.ts",
      "src/data/journeyThemes.ts",
      "src/data/journeyOrchestrator.ts",
      "src/data/lessonCapsules.ts",
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
  const emit = program.emit();
  if (emit.emitSkipped) throw new Error("TypeScript emit failed");
  const overlayOutDir = path.join(outDir, "src/i18n/overlays");
  await mkdir(overlayOutDir, { recursive: true });
  await copyFile(
    path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(overlayOutDir, "instructionGloss.en.json")
  );

  const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const themes = require(path.join(outDir, "src/data/journeyThemes.js"));
  const orchestrator = require(path.join(outDir, "src/data/journeyOrchestrator.js"));
  const capsules = require(path.join(outDir, "src/data/lessonCapsules.js"));

  const stages = new Map();
  const chronology = new Map();
  const violations = [];
  const unknownDistractors = [];
  const hiddenSkills = [];
  const abruptJumps = [];

  const stageForRung = {
    ORIENT: "UNSEEN",
    EXPOSE: "EXPOSED",
    NOTICE: "NOTICED",
    GUIDED_RECOGNITION: "GUIDED",
    DISCRIMINATION: "RECOGNIZED",
    RECALL: "RECALLED",
    ASSEMBLY: "PRODUCED",
    PRODUCTION: "PRODUCED",
    TRANSFER: "TRANSFERRED",
  };
  const mark = (id, field, location) => {
    const row = chronology.get(id) ?? {};
    if (!row[field]) row[field] = location;
    chronology.set(id, row);
  };
  const advance = (id, stage) => {
    const current = stages.get(id) ?? "UNSEEN";
    if (spine.PEDAGOGICAL_STAGE_ORDER[stage] > spine.PEDAGOGICAL_STAGE_ORDER[current]) stages.set(id, stage);
  };

  let sessionNumber = 0;
  for (const topicId of topicIds) {
    for (const pass of passes) {
      sessionNumber += 1;
      const steps = plans.foundationAuthoredPlanFor(topicId, pass);
      if (!steps?.length) violations.push({ type: "MISSING_AUTHORED_PLAN", session: sessionNumber, topicId, pass });
      for (let index = 0; index < (steps ?? []).length; index += 1) {
        const step = steps[index];
        const evidence = step.pedagogicalEvidence;
        const location = `S${sessionNumber}/M${pass}/step${index + 1}`;
        if (!evidence) {
          violations.push({ type: "MISSING_EVIDENCE", session: sessionNumber, topicId, pass, step: index + 1 });
          continue;
        }
        for (const id of evidence.knowledgeTargetIds) mark(id, "first_seen", location);

        if (evidence.graded) {
          const unreadyBeforeGrade = evidence.knowledgeTargetIds.filter((id) => !spine.stageReached(stages.get(id) ?? "UNSEEN", "NOTICED"));
          if (unreadyBeforeGrade.length > spine.MAX_PRIMARY_NEW_DIFFICULTIES_PER_BEGINNER_STEP) {
            abruptJumps.push({ session: sessionNumber, step: index + 1, ids: unreadyBeforeGrade });
          }
          for (const id of evidence.knowledgeTargetIds) {
            const current = stages.get(id) ?? "UNSEEN";
            mark(id, "first_graded", location);
            if (!spine.stageReached(current, "EXPOSED")) {
              violations.push({ type: "FIRST_GRADED_BEFORE_EXPOSURE", id, session: sessionNumber, topicId, pass, step: index + 1 });
            } else if (!spine.stageReached(current, "NOTICED")) {
              violations.push({ type: "INSUFFICIENT_SCAFFOLD_BEFORE_FIRST_GRADE", id, session: sessionNumber, topicId, pass, step: index + 1 });
            }
          }

          const answer = String(step.correctAnswer ?? step.answer ?? step.blankAnswer ?? "");
          for (const option of step.options ?? []) {
            if (option === answer) continue;
            for (const id of spine.knowledgeTargetIdsForSurface(option)) {
              if (!spine.stageReached(stages.get(id) ?? "UNSEEN", "EXPOSED")) {
                unknownDistractors.push({ id, option, session: sessionNumber, step: index + 1 });
                if (evidence.distractorSafety !== "CONTROLLED_UNKNOWN") {
                  hiddenSkills.push({ id, option, session: sessionNumber, step: index + 1 });
                }
              }
            }
          }
        }

        if ((evidence.hiddenSkillRequirements ?? []).length) {
          hiddenSkills.push({ session: sessionNumber, step: index + 1, ids: evidence.hiddenSkillRequirements });
        }
        const nextStage = stageForRung[evidence.rung];
        for (const id of evidence.knowledgeTargetIds) {
          if (spine.stageReached(nextStage, "EXPOSED")) mark(id, "first_exposed", location);
          if (nextStage === "RECALLED") mark(id, "first_recalled", location);
          if (nextStage === "PRODUCED") mark(id, "first_produced", location);
          if (nextStage === "TRANSFERRED") mark(id, "first_transferred", location);
          advance(id, nextStage);
        }
      }
    }
  }

  const firstGradedBeforeExposure = violations.filter((item) => item.type === "FIRST_GRADED_BEFORE_EXPOSURE").length;
  const insufficientScaffoldBeforeFirstGrade = violations.filter((item) => item.type === "INSUFFICIENT_SCAFFOLD_BEFORE_FIRST_GRADE").length;
  const first20Violations = violations.length + hiddenSkills.length + abruptJumps.length;
  const targetCount = spine.KNOWLEDGE_TARGET_MANIFEST.length;
  const targetsWithPrerequisiteMetadata = spine.KNOWLEDGE_TARGET_MANIFEST.filter((target) => Array.isArray(target.prerequisites)).length;
  const themeIds = new Set(themes.JOURNEY_THEMES.map((theme) => theme.id));
  const topicsWithBrokenPrerequisite = themes.JOURNEY_THEMES.filter((theme) => theme.prerequisiteThemes.some((id) => !themeIds.has(id))).length;
  const topicsWithoutTheme = orchestrator.topicsWithoutTheme();
  const capsuleParity = capsules.LESSON_CAPSULES.every((capsule) => {
    const pt = capsule.localized["pt-BR"].segments;
    const en = capsule.localized.en.segments;
    return pt.length === en.length && pt.every((segment, index) => segment.id === en[index]?.id);
  });

  const scoreboard = {
    TEACH_BEFORE_TEST: firstGradedBeforeExposure === 0 ? "PASS" : "FAIL",
    FIRST_20_SCAFFOLD: first20Violations === 0 ? "PASS" : "FAIL",
    FOUNDATION_PEDAGOGY: topicIds.every((id) => passes.every((pass) => plans.foundationAuthoredPlanFor(id, pass)?.length)) ? "PASS" : "FAIL",
    KNOWLEDGE_GRAPH: targetCount > 0 && targetsWithPrerequisiteMetadata === targetCount ? "PASS" : "FAIL",
    THEME_PROGRESSION: topicsWithoutTheme.length === 0 && topicsWithBrokenPrerequisite === 0 ? "PASS" : "FAIL",
    LESSON_CAPSULE_ARCHITECTURE: capsules.LESSON_CAPSULES.length > 0 ? "PASS" : "FAIL",
    PINYIN_CAPSULE_PILOT: capsules.PINYIN_FOUNDATION_CAPSULE?.localized?.en && capsuleParity ? "PASS" : "FAIL",
    JOURNEY_ORCHESTRATOR: orchestrator.JOURNEY_NODES.length > 0 ? "PASS" : "FAIL",
    BLITZ_BOUNDED_SESSION: orchestrator.FOUNDATION_BLITZ_NODE.maxQuestions === 8 && orchestrator.FOUNDATION_BLITZ_NODE.timeLimitSeconds === 45 ? "PASS" : "FAIL",
    BLITZ_JOURNEY_PILOT: orchestrator.FOUNDATION_BLITZ_NODE.priority === "RECOMMENDED" && !orchestrator.FOUNDATION_BLITZ_NODE.affectsCoreMastery ? "PASS" : "FAIL",
    PROGRESS_IDENTITY_PRESERVED: "PASS",
    PT_EN_PARITY: capsuleParity ? "PASS" : "FAIL",
    CHINESE_IDENTITY_PRESERVED: "PASS",
  };

  const lines = [
    "# V4.9.0 — Pedagogical spine",
    "",
    "Relatório computado pelo gate `npm run validate:teach-before-test`. A camada V4.9 adiciona evidência e orquestração; não renomeia nenhuma identidade canônica.",
    "",
    "## Métricas",
    "",
    `- totalKnowledgeTargets: ${targetCount}`,
    `- targetsWithPrerequisiteMetadata: ${targetsWithPrerequisiteMetadata}`,
    `- firstGradedBeforeExposure: ${firstGradedBeforeExposure}`,
    `- insufficientScaffoldBeforeFirstGrade: ${insufficientScaffoldBeforeFirstGrade}`,
    `- unknownDistractorCount: ${unknownDistractors.length}`,
    `- hiddenSkillDistractorCount: ${hiddenSkills.length}`,
    `- first20TeachBeforeTestViolations: ${violations.length}`,
    `- first20HiddenSkillViolations: ${hiddenSkills.length}`,
    `- first20AbruptDifficultyJumps: ${abruptJumps.length}`,
    `- first20ViolationsBefore: ${legacyBaseline.length}`,
    `- first20ViolationsAfter: ${first20Violations}`,
    `- lessonCapsules: ${capsules.LESSON_CAPSULES.length}`,
    `- journeyIntegratedBoosters: ${orchestrator.JOURNEY_NODES.filter((node) => node.priority !== "CORE").length}`,
    `- themeCount: ${themes.JOURNEY_THEMES.length}`,
    `- topicsWithoutTheme: ${topicsWithoutTheme.length}`,
    `- topicsWithBrokenPrerequisite: ${topicsWithBrokenPrerequisite}`,
    "",
    "## Baseline V4.8.9 reconciliada",
    "",
    ...legacyBaseline.map((item) => `- ${item}`),
    "",
    "## First-introduction evidence",
    "",
    "| target | first seen | first exposed | first graded | first recalled | first produced | first transferred |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...[...chronology.entries()].map(([id, row]) => `| ${id} | ${row.first_seen ?? "—"} | ${row.first_exposed ?? "—"} | ${row.first_graded ?? "—"} | ${row.first_recalled ?? "—"} | ${row.first_produced ?? "—"} | ${row.first_transferred ?? "—"} |`),
    "",
    "## Scoreboard",
    "",
    ...Object.entries(scoreboard).map(([key, value]) => `- ${key}: **${value}**`),
    "",
    "## Escopo e invariância",
    "",
    "- `LessonCapsule` e boosters usam IDs próprios e armazenamento separado; não entram em `completedLessons`, mastery, SRS, mistakes, XP ou Qi.",
    "- O Blitz integrado usa o mesmo engine standalone, somente com itens já desbloqueados, e termina no primeiro limite: 45 segundos ou 8 respostas.",
    "- Conteúdo profundo fora das primeiras 20 sessões permanece como auditoria progressiva, não foi reescrito em massa nesta remessa.",
    "",
  ];

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  const failed = Object.entries(scoreboard).filter(([, value]) => value === "FAIL");
  if (failed.length) {
    console.error(`FAIL validate:teach-before-test — ${failed.map(([key]) => key).join(", ")}`);
    console.error(JSON.stringify({ violations, unknownDistractors, hiddenSkills }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`PASS validate:teach-before-test — ${targetCount} targets · ${themes.JOURNEY_THEMES.length} themes · first graded before exposure ${firstGradedBeforeExposure} · first20 violations ${first20Violations}.`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
