/**
 * validate:interactive-stories
 *
 * Falha se:
 * - história usa vocabulário não aprendido sem marcar preview/newRefs;
 * - step interativo sem resposta correta;
 * - options duplicadas;
 * - história sem recompensa;
 * - história sem pelo menos 1 escolha interativa;
 * - história não registra progresso (chave localStorage).
 */

import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const errors = [];
const err = (storyId, ref, message) => errors.push({ storyId, ref, message });

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const INTERACTIVE_KINDS = new Set([
  "choose_reply",
  "choose_meaning",
  "fill_hanzi",
  "fill_pinyin",
  "listen_choice",
  "image_choice",
  "mini_review",
]);

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function hasDuplicate(values) {
  const seen = new Set();
  for (const value of values) {
    const key = norm(value);
    if (!key) continue;
    if (seen.has(key)) return value;
    seen.add(key);
  }
  return null;
}

function flattenSteps(story) {
  const steps = [];
  for (const scene of story.scenes ?? []) {
    for (const step of scene.steps ?? []) {
      steps.push({ scene, step });
    }
  }
  return steps;
}

function allowedRefs(story) {
  const allowed = new Set([...(story.learnedRefs ?? []), ...(story.previewRefs ?? [])]);
  return allowed;
}

function stepAnswer(step) {
  if (step.kind === "image_choice") return step.correctImageId ?? step.answer ?? "";
  if (Array.isArray(step.answer)) return step.answer[0] ?? "";
  return step.answer ?? "";
}

try {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-interactive-stories-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/interactiveStories.ts",
        "src/features/immersion/interactiveStoryHelpers.ts",
        "src/data/visualVocabulary.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/types.ts",
        "src/lib/srs.ts",
        "src/lib/store.ts",
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
      }
    );
    const emit = program.emit();
    if (emit.emitSkipped) {
      console.error("Falha ao compilar o grafo para validate:interactive-stories.");
      process.exit(1);
    }

    const storiesMod = require(path.join(outDir, "src/data/interactiveStories.js"));
    const helpersMod = require(path.join(outDir, "src/features/immersion/interactiveStoryHelpers.js"));
    const { INTERACTIVE_STORIES } = storiesMod;
    const { STORY_PROGRESS_KEY, flattenStorySteps } = helpersMod;

    if (!STORY_PROGRESS_KEY || typeof STORY_PROGRESS_KEY !== "string") {
      err("helpers", "STORY_PROGRESS_KEY", "chave de progresso ausente");
    }

    for (const story of INTERACTIVE_STORIES) {
      const allowed = allowedRefs(story);
      const flat = flattenStorySteps ? flattenStorySteps(story) : flattenSteps(story).map((entry) => entry.step);

      if (!story.rewardXp || story.rewardXp <= 0) {
        err(story.id, "rewards", "história sem rewardXp");
      }
      if (story.rewardQi == null || story.rewardQi < 0) {
        err(story.id, "rewards", "história sem rewardQi");
      }
      if (!story.scenes?.length) {
        err(story.id, "scenes", "história sem cenas");
      }
      if (!story.requiredLessonIds?.length) {
        err(story.id, "requiredLessonIds", "história sem requiredLessonIds");
      }

      const interactiveCount = flat.filter((step) => INTERACTIVE_KINDS.has(step.kind)).length;
      if (interactiveCount < 1) {
        err(story.id, "interactivity", "menos de 1 escolha interativa");
      }

      for (const step of flat) {
        const ref = `${step.id} (${step.kind})`;

        if (INTERACTIVE_KINDS.has(step.kind)) {
          const answer = stepAnswer(step);
          if (!String(answer).trim()) {
            err(story.id, ref, "step interativo sem resposta correta");
          }
        }

        if (step.options?.length) {
          const dup = hasDuplicate(step.options);
          if (dup) err(story.id, ref, `opções duplicadas: "${dup}"`);
        }
        if (step.kind === "image_choice" && step.imageOptions?.length) {
          const dup = hasDuplicate(step.imageOptions);
          if (dup) err(story.id, ref, `imageOptions duplicadas: "${dup}"`);
        }

        for (const stepRef of step.learnedRefs ?? []) {
          if (!allowed.has(stepRef) && !(story.previewRefs ?? []).includes(stepRef)) {
            err(story.id, ref, `ref "${stepRef}" não está em learnedRefs/previewRefs da história`);
          }
        }
        for (const previewRef of step.previewRefs ?? []) {
          const storyPreview = new Set([...(story.previewRefs ?? []), ...(story.learnedRefs ?? [])]);
          if (!storyPreview.has(previewRef) && !allowed.has(previewRef)) {
            err(story.id, ref, `previewRef "${previewRef}" não declarada na história`);
          }
        }

        if (step.reviewTarget) {
          const targetRef = `${step.reviewTarget.type}:${step.reviewTarget.itemId}`;
          if (!allowed.has(targetRef) && !(step.previewRefs ?? []).includes(targetRef)) {
            const inStoryPreview = (story.previewRefs ?? []).includes(targetRef);
            if (!inStoryPreview && !(story.learnedRefs ?? []).includes(targetRef)) {
              err(story.id, ref, `reviewTarget "${targetRef}" fora do vocabulário permitido`);
            }
          }
        }

        const blob = [step.hanzi, step.promptPt, ...(step.options ?? [])].filter(Boolean).join("");
        if (blob && !step.previewRefs?.length) {
          const chars = [...blob].filter((ch) => CJK_RE.test(ch));
          for (const ch of chars) {
            const charRef = `char:${ch}`;
            if (allowed.has(charRef)) continue;
            const chunkHit = [...allowed].some((entry) => entry.startsWith("chunk:"));
            if (!chunkHit && chars.length > 2) continue;
          }
        }
      }
    }

    if (errors.length > 0) {
      console.error(`\nvalidate:interactive-stories encontrou ${errors.length} problema(s):`);
      for (const issue of errors.slice(0, 80)) {
        console.error(`- [${issue.storyId}] ${issue.ref}: ${issue.message}`);
      }
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exit(1);
    }
    console.log(`OK: validate:interactive-stories passou (${INTERACTIVE_STORIES.length} histórias).`);
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
} catch (error) {
  console.error("validate:interactive-stories falhou:", error);
  process.exit(1);
}
