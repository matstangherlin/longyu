#!/usr/bin/env node
/**
 * validate:tone-progression (PED-005)
 *
 * Impede regressão da escada de tons em `p1-o-que-e-tom`:
 *   2 tons contrastantes → 4 contornos → pinyin/palavra → mistura
 *
 * Falha se um exercício complexo (4 opções + quiz/mistura) aparecer
 * antes dos degraus iniciais com `toneChoices` de tamanho 2.
 */
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-tone-progression-"));

const TONE_LESSON_ID = "p1-o-que-e-tom";
const errors = [];
const warnings = [];

try {
  const program = ts.createProgram(
    ["src/data/journey.ts", "src/data/characters.ts", "src/data/chunks.ts", "src/data/types.ts", "src/data/visualVocabulary.ts"],
    {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      rootDir,
      outDir,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
    }
  );
  const emit = program.emit();
  if (emit.emitSkipped) {
    console.error("Falha ao compilar journey para validate:tone-progression.");
    process.exitCode = 1;
    throw new Error("emitSkipped");
  }

  const { ALL_LESSONS } = require(path.join(outDir, "src/data/journey.js"));
  const lesson = ALL_LESSONS.find((item) => item.id === TONE_LESSON_ID);
  if (!lesson) {
    errors.push(`lição ${TONE_LESSON_ID} não encontrada`);
  } else {
    const steps = lesson.steps ?? [];
    const toneSteps = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => step.kind === "tone");

    if (toneSteps.length < 4) {
      errors.push(`${TONE_LESSON_ID}: esperava ≥4 passos tone, achou ${toneSteps.length}`);
    }

    // Fase 1: primeiros tone steps devem ser contraste binário (2 tons).
    const firstTwo = toneSteps.slice(0, 2);
    for (const { step, index } of firstTwo) {
      const choices = step.toneChoices ?? [];
      if (choices.length !== 2) {
        errors.push(
          `${TONE_LESSON_ID}#${index + 1}: primeiros tons precisam de toneChoices com 2 tons (achou ${choices.length || "todos"})`
        );
      }
      if (step.assist === "quiz") {
        errors.push(`${TONE_LESSON_ID}#${index + 1}: quiz cedo demais — comece em guided`);
      }
    }

    // Fase 2: depois do contraste, deve existir tone com família completa (sem toneChoices ou ≥4).
    const laterTones = toneSteps.slice(2);
    const hasFullFamily = laterTones.some(({ step }) => {
      const choices = step.toneChoices;
      return !choices || choices.length >= 4;
    });
    if (!hasFullFamily) {
      errors.push(`${TONE_LESSON_ID}: falta degrau de 4 contornos após o contraste 2 tons`);
    }

    // Fase 3: quiz (palavra/tom) só depois do contraste e da família.
    const firstQuiz = toneSteps.find(({ step }) => step.assist === "quiz");
    if (firstQuiz) {
      const quizOrdinal = toneSteps.findIndex(({ index }) => index === firstQuiz.index);
      if (quizOrdinal < 3) {
        errors.push(
          `${TONE_LESSON_ID}#${firstQuiz.index + 1}: quiz antes da escada (índice tone ${quizOrdinal}; mínimo 3)`
        );
      }
      const quizChoices = firstQuiz.step.toneChoices ?? [];
      // Quiz leve pode manter contraste 2-way — ok. Bloqueia só se vier antes.
      if (quizChoices.length === 0) {
        warnings.push(
          `${TONE_LESSON_ID}#${firstQuiz.index + 1}: quiz sem toneChoices (4 opções de uma vez) — preferir contraste leve`
        );
      }
    } else {
      warnings.push(`${TONE_LESSON_ID}: nenhum tone quiz no fim da escada`);
    }

    // Mistura (dialogue/comp com significado) só depois dos primeiros tons.
    const firstMix = steps.findIndex(
      (step) => step.kind === "dialogue_choice" || step.kind === "comprehend" || step.kind === "match_pairs"
    );
    const firstToneIndex = toneSteps[0]?.index ?? -1;
    if (firstMix >= 0 && firstToneIndex >= 0 && firstMix < firstToneIndex + 3) {
      errors.push(
        `${TONE_LESSON_ID}: mistura (dialogue/comp/match) cedo demais (step ${firstMix + 1}) — complete 2→4 tons antes`
      );
    }

    // Ordem global pedida: 2 tons → 4 tons → pinyin/palavra (quiz) → mistura.
    const phaseFlags = {
      twoTone: firstTwo.every(({ step }) => (step.toneChoices ?? []).length === 2),
      fourTone: hasFullFamily,
      quiz: Boolean(firstQuiz),
      mix: firstMix >= 0,
    };
    console.log(
      `Escada ${TONE_LESSON_ID}: 2tons=${phaseFlags.twoTone ? "ok" : "falha"} · 4tons=${
        phaseFlags.fourTone ? "ok" : "falha"
      } · quiz=${phaseFlags.quiz ? "ok" : "avisar"} · mistura=${phaseFlags.mix ? "ok" : "avisar"}`
    );
  }

  for (const warning of warnings) console.warn(`AVISO: ${warning}`);
  if (errors.length) {
    console.error(`\nProgressão de tons inválida: ${errors.length} erro(s).`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`OK: progressão de tons validada (${warnings.length} aviso(s)).`);
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
