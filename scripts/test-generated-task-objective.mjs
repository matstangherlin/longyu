#!/usr/bin/env node
/**
 * RC1.4 — Generated Learning Integrity
 *
 * Regression for the four frozen answer mismatches from RC1.3:
 *   - p2-comparar-tom-2-3 pass 4 (tone contrast ≠ 你好 gabarito)
 *   - p4-num-910 pass 4 (十 from pass text, not 九)
 *   - p4-char-zhong pass 2 (中 from title/library, not 人 review)
 *   - l19-logica-ma pass 2 (phonetic: 妈 uses 马, not "vizinhos")
 *
 * Lesson IDs appear only here (tests), never in generatedTaskObjective switches.
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-gen-task-obj-"));
const failures = [];
const fail = (message) => failures.push(message);

try {
  const program = ts.createProgram(
    [
      "src/data/generatedTaskObjective.ts",
      "src/data/topicMasteryBonus.ts",
      "src/data/topicMasterySpecs.ts",
      "src/data/journey.ts",
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
  if (emit.emitSkipped) throw new Error("TypeScript não compilou test:generated-task-objective");

  const { getLesson } = require(path.join(outDir, "src/data/journey.js"));
  const { topicMasterySpecFor } = require(path.join(outDir, "src/data/topicMasterySpecs.js"));
  const {
    resolveGeneratedTaskObjective,
    surfacesForObjective,
    assertGeneratedSurfacesCoherent,
    buildGeneratedBonusStep,
  } = require(path.join(outDir, "src/data/generatedTaskObjective.js"));
  const { topicMasteryBonusStepsFor } = require(path.join(outDir, "src/data/topicMasteryBonus.js"));

  function checkCase(lessonId, pass, expect) {
    const lesson = getLesson(lessonId);
    assert.ok(lesson, `lesson ${lessonId}`);
    const spec = topicMasterySpecFor(lesson);
    const objective = resolveGeneratedTaskObjective(lesson, pass, spec);
    const surfaces = surfacesForObjective(objective, spec, pass, lesson);
    const issues = assertGeneratedSurfacesCoherent(objective, surfaces);
    if (issues.length) fail(`${lessonId}#${pass}: integrity ${issues.join("; ")}`);

    if (expect.targetRef && objective.targetRef !== expect.targetRef) {
      fail(`${lessonId}#${pass}: targetRef=${objective.targetRef} want ${expect.targetRef}`);
    }
    if (expect.relationType && objective.relationType !== expect.relationType) {
      fail(`${lessonId}#${pass}: relationType=${objective.relationType} want ${expect.relationType}`);
    }
    if (expect.anchor && !(objective.anchorRefs ?? []).includes(expect.anchor)) {
      fail(`${lessonId}#${pass}: missing anchor ${expect.anchor} in ${JSON.stringify(objective.anchorRefs)}`);
    }
    if (expect.promptIncludes) {
      for (const fragment of expect.promptIncludes) {
        if (!surfaces.prompt.includes(fragment)) {
          fail(`${lessonId}#${pass}: prompt missing "${fragment}": ${surfaces.prompt}`);
        }
      }
    }
    if (expect.promptExcludes) {
      for (const fragment of expect.promptExcludes) {
        if (surfaces.prompt.includes(fragment) || new RegExp(fragment, "i").test(surfaces.prompt)) {
          fail(`${lessonId}#${pass}: prompt should not contain /${fragment}/: ${surfaces.prompt}`);
        }
      }
    }
    if (expect.explanationIncludes) {
      for (const fragment of expect.explanationIncludes) {
        if (!surfaces.explanation.includes(fragment)) {
          fail(`${lessonId}#${pass}: explanation missing "${fragment}": ${surfaces.explanation}`);
        }
      }
    }

    const steps = buildGeneratedBonusStep(lesson, pass, spec);
    const graded = steps.find((step) => step.correctAnswer || step.answer);
    if (!graded) {
      fail(`${lessonId}#${pass}: no graded bonus step`);
    } else {
      const answer = graded.correctAnswer ?? graded.answer;
      if (expect.targetRef && answer !== expect.targetRef) {
        fail(`${lessonId}#${pass}: step answer=${answer} want ${expect.targetRef}`);
      }
      if (!graded.generatedTaskTrace?.targetRef) {
        fail(`${lessonId}#${pass}: missing generatedTaskTrace`);
      }
    }

    // Wired path through topicMasteryBonus (authored lessons skip generator).
    const wired = topicMasteryBonusStepsFor(lessonId, pass);
    if (wired.length === 0) fail(`${lessonId}#${pass}: topicMasteryBonusStepsFor empty`);
  }

  // Known RC1.3 frozen mismatches — structural fixes.
  checkCase("p2-comparar-tom-2-3", 4, {
    relationType: "tone_contrast",
    targetRef: "麻",
    promptExcludes: ["Aplicar o contraste", "你好"],
    promptIncludes: ["sobe", "2"],
    explanationIncludes: ["麻"],
  });

  checkCase("p4-num-910", 4, {
    relationType: "numeric_value",
    targetRef: "十",
    promptIncludes: ["十"],
    explanationIncludes: ["十"],
  });

  checkCase("p4-char-zhong", 2, {
    relationType: "hanzi_form",
    targetRef: "中",
    promptIncludes: ["中"],
    promptExcludes: ["vizinhos"],
    explanationIncludes: ["中"],
  });

  checkCase("l19-logica-ma", 2, {
    relationType: "phonetic_component",
    targetRef: "妈",
    anchor: "马",
    promptIncludes: ["马", "pista sonora"],
    promptExcludes: ["vizinhos"],
    explanationIncludes: ["妈", "马"],
  });

  // No lessonId switch/case in the implementation module.
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(path.join(root, "src/data/generatedTaskObjective.ts"), "utf8")
  );
  for (const banned of ["p2-comparar-tom-2-3", "p4-num-910", "p4-char-zhong", "l19-logica-ma"]) {
    if (src.includes(`"${banned}"`) || src.includes(`'${banned}'`)) {
      fail(`generatedTaskObjective.ts must not hardcode lessonId ${banned}`);
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await rm(outDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error("FAIL test:generated-task-objective");
  for (const message of failures) console.error(" -", message);
  process.exit(1);
}
console.log("PASS test:generated-task-objective");
