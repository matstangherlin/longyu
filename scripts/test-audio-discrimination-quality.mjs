#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const failures = [];
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-audio-quality-"));

try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/topicMastery.ts", "src/features/lesson/lessonTasks.ts"],
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
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript não compilou o gate auditivo");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(root, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const load = (relative) => require(path.join(outDir, relative));
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { isTopicMasteryLesson } = load("src/data/topicMastery.js");
  const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");
  const topics = ALL_LESSONS.filter(isTopicMasteryLesson);
  const audit = [];

  for (const lesson of topics) {
    for (const pass of [1, 2, 3, 4]) {
      const steps = lessonRoundStepsFor(lesson, pass, { masteryLevel: pass - 1 });
      steps.forEach((step, index) => {
        if (step.kind !== "audio_discrimination" && step.kind !== "listen_select") return;
        let classification = "GOOD";
        if (!String(step.audioText ?? step.audioSequence?.[0] ?? "").trim()) classification = "MISSING_AUDIO_CUE";
        else if ((step.options?.length ?? 0) > 3) classification = "TOO_COMPLEX";
        else if (
          step.kind === "listen_select" &&
          (step.options ?? []).some((option) => /[\u3400-\u9fff]/u.test(String(option))) &&
          /som|ouça|pronúncia|sound|listen|pronunciation/iu.test(`${step.title ?? ""} ${step.prompt ?? ""}`)
        ) classification = "MIXES_UNRELATED_SKILLS";
        else if (/Discriminar os sons de|Descobrir de ouvido o que/iu.test(`${step.title ?? ""} ${step.prompt ?? ""}`)) {
          classification = "POOR_COPY";
        }
        audit.push({ lessonId: lesson.id, pass, index, kind: step.kind, classification });

        if (step.kind === "audio_discrimination") {
          if (!String(step.audioTextB ?? "").trim()) failures.push(`${lesson.id} M${pass}: segundo áudio ausente`);
          if (step.options?.length) failures.push(`${lesson.id} M${pass}: audio_discrimination não deve exigir opções de hànzì`);
          if (step.title !== "Os sons são iguais ou diferentes?") failures.push(`${lesson.id} M${pass}: título auditivo não simplificado`);
          if (step.prompt !== "Ouça os dois sons. Compare apenas o que você ouve.") failures.push(`${lesson.id} M${pass}: prompt auditivo não simplificado`);
        }
      });
    }
  }

  const stepsSource = await readFile(path.join(root, "src/features/lesson/steps.tsx"), "utf8");
  for (const sentinel of ["listenBothAgain", "data-lesson-feedback", "feedback && reveal.length > 0"]) {
    if (!stepsSource.includes(sentinel)) failures.push(`sentinela runtime ausente: ${sentinel}`);
  }

  const counts = Object.fromEntries(
    ["GOOD", "TOO_COMPLEX", "MIXES_UNRELATED_SKILLS", "MISSING_AUDIO_CUE", "POOR_COPY"].map((kind) => [
      kind,
      audit.filter((item) => item.classification === kind).length,
    ])
  );
  const audioDiscriminationCount = audit.filter((item) => item.kind === "audio_discrimination").length;
  const report = {
    teachingTopicCount: topics.length,
    auditedCount: audit.length,
    audioDiscriminationCount,
    simplifiedCount: audioDiscriminationCount,
    representativeAudioDiscrimination: audit
      .filter((item) => item.kind === "audio_discrimination")
      .slice(0, 24),
    counts,
    issues: audit.filter((item) => item.classification !== "GOOD"),
  };
  await writeFile(
    path.join(root, "docs/reports/v488-audio-discrimination-audit.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );

  if (failures.length) {
    console.error(`test:audio-discrimination-quality FAIL (${failures.length})`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(`test:audio-discrimination-quality PASS · auditadas ${audit.length} · simplificadas ${audioDiscriminationCount}`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
