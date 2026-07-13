/**
 * validate:conversation-scenes
 *
 * Falha se:
 * - cena usa palavra não ensinada sem newRefs
 * - fala sem hanzi
 * - pinyin ausente
 * - checkpoint sem resposta correta
 * - options duplicadas
 * - cena tem mais de 1 novidade sem ser lição dedicada
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
const err = (area, ref, message) => errors.push({ area, ref, message });

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;

function norm(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function cleanHanzi(value) {
  return String(value ?? "").replace(PUNCT_RE, "").trim();
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

function extractCjkTokens(text) {
  const clean = cleanHanzi(text);
  if (!clean) return [];
  return [...clean].filter((ch) => CJK_RE.test(ch));
}

try {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conversation-scenes-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/conversationScenes.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/types.ts",
        "src/features/lesson/exerciseValidation.ts",
      ],
      {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        rootDir,
        outDir,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
      }
    );
    const emit = program.emit();
    if (emit.emitSkipped) {
      console.error("Falha ao compilar o grafo para validate:conversation-scenes.");
      process.exitCode = 1;
      throw new Error("emitSkipped");
    }

    const load = (rel) => require(path.join(outDir, rel));
    const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");

    const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
    const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
    const chunkByHanzi = new Map(CHUNKS.map((chunk) => [cleanHanzi(chunk.hanzi), chunk]));
    const charByHanzi = new Map(CHARACTERS.map((char) => [cleanHanzi(char.hanzi), char]));

    function refsToHanziSet(refs) {
      const set = new Set();
      for (const ref of refs ?? []) {
        const [type, id] = String(ref).split(":");
        if (type === "chunk") {
          const chunk = chunkById.get(id);
          if (chunk) {
            const clean = cleanHanzi(chunk.hanzi);
            set.add(clean);
            for (const ch of extractCjkTokens(clean)) set.add(ch);
          }
        } else if (type === "char") {
          const char = charById.get(id);
          if (char) set.add(cleanHanzi(char.hanzi));
        }
      }
      return set;
    }

    function uncoveredTokens(hanziText, allowed) {
      const clean = cleanHanzi(hanziText);
      if (!clean) return [];
      // Prefer longest chunk matches first.
      const remaining = clean;
      const uncovered = [];
      let cursor = 0;
      while (cursor < remaining.length) {
        let matched = false;
        for (let len = remaining.length - cursor; len >= 1; len -= 1) {
          const slice = remaining.slice(cursor, cursor + len);
          if (allowed.has(slice)) {
            cursor += len;
            matched = true;
            break;
          }
        }
        if (!matched) {
          uncovered.push(remaining[cursor]);
          cursor += 1;
        }
      }
      return uncovered;
    }

    if (!Array.isArray(CONVERSATION_SCENES) || CONVERSATION_SCENES.length < 5) {
      err("catalog", "conversationScenes", "Esperava ao menos 5 cenas iniciais.");
    }

    const sceneIds = new Set();
    for (const scene of CONVERSATION_SCENES) {
      const ref = scene.sceneId ?? "(sem-id)";
      if (!scene.sceneId) err("catalog", ref, "cena sem sceneId");
      if (sceneIds.has(scene.sceneId)) err("catalog", ref, "sceneId duplicado");
      sceneIds.add(scene.sceneId);

      if (scene.kind !== "conversation_scene") err("catalog", ref, `kind inválido: ${scene.kind}`);
      if (!scene.title?.trim()) err("catalog", ref, "cena sem título");
      if (!scene.setting) err("catalog", ref, "cena sem setting");
      if (!scene.characters || scene.characters.length < 2) {
        err("catalog", ref, "cena precisa de pelo menos 2 personagens");
      }
      if (!scene.learnedRefs?.length) err("catalog", ref, "cena sem learnedRefs");

      const newRefs = scene.newRefs ?? [];
      if (newRefs.length > 1 && !scene.dedicatedLesson) {
        err("catalog", ref, `mais de 1 novidade (${newRefs.length}) sem dedicatedLesson`);
      }

      const allowed = refsToHanziSet([...(scene.learnedRefs ?? []), ...newRefs]);
      const lines = scene.lines ?? [];
      if (lines.length === 0) err("catalog", ref, "cena sem falas");

      for (const [index, line] of lines.entries()) {
        const lineRef = `${ref}#linha${index + 1}`;
        if (!line.hanzi?.trim()) err("catalog", lineRef, "fala sem hanzi");
        if (!line.pinyin?.trim()) err("catalog", lineRef, "pinyin ausente");
        if (!line.speakerId?.trim()) err("catalog", lineRef, "fala sem speakerId");
        else if (!scene.characters?.some((character) => character.id === line.speakerId)) {
          err("catalog", lineRef, `speakerId desconhecido "${line.speakerId}"`);
        }

        if (line.hanzi?.trim()) {
          const missing = uncoveredTokens(line.hanzi, allowed);
          if (missing.length > 0) {
            // Also try resolving unknown chars/chunks against corpus — still fail if not in learned/new refs.
            const unknown = missing.filter((token) => {
              const asChunk = chunkByHanzi.get(token);
              const asChar = charByHanzi.get(token);
              return Boolean(asChunk || asChar || CJK_RE.test(token));
            });
            if (unknown.length > 0) {
              err(
                "pedagogy",
                lineRef,
                `palavra/hànzì não coberto por learnedRefs/newRefs: ${[...new Set(unknown)].join(" ")}`
              );
            }
          }
        }
      }

      const checkpoint = scene.checkpoint;
      if (checkpoint) {
        if (!checkpoint.prompt?.trim()) err("catalog", ref, "checkpoint sem prompt");
        if (!checkpoint.correctAnswer?.trim()) err("catalog", ref, "checkpoint sem resposta correta");
        const options = checkpoint.options ?? [];
        const duplicate = hasDuplicate(options);
        if (duplicate) err("catalog", ref, `options duplicadas: "${duplicate}"`);
        if (
          (checkpoint.type === "choose_reply" ||
            checkpoint.type === "choose_meaning" ||
            checkpoint.type === "fill_reply") &&
          options.length >= 2
        ) {
          if (!options.some((option) => norm(option) === norm(checkpoint.correctAnswer))) {
            err("catalog", ref, `resposta correta fora das options: "${checkpoint.correctAnswer}"`);
          }
        }
      }

      const asStep = {
        ...scene,
        prompt: checkpoint?.prompt,
        options: checkpoint?.options,
        correctAnswer: checkpoint?.correctAnswer,
        explanation: checkpoint?.explanation,
      };
      const validation = validateExercise(asStep);
      if (!validation.valid) {
        for (const message of validation.errors) err("runtime", ref, message);
      }
    }

    // Authored steps in journey must reference known scenes and obey caps.
    let authoredCount = 0;
    for (const lesson of ALL_LESSONS) {
      const scenes = (lesson.steps ?? []).filter((step) => step.kind === "conversation_scene");
      authoredCount += scenes.length;
      const maxAllowed = lesson.isReview ? 2 : lesson.id.toLowerCase().includes("immersion") ? 99 : 1;
      if (scenes.length > maxAllowed) {
        err(
          "engine",
          lesson.id,
          `lição tem ${scenes.length} conversation_scene (máx. ${maxAllowed}${lesson.isReview ? " em revisão" : ""})`
        );
      }
      for (const [stepIndex, step] of scenes.entries()) {
        const ref = `${lesson.id}#${stepIndex + 1}`;
        if (!step.sceneId || !sceneIds.has(step.sceneId)) {
          err("journey", ref, `sceneId desconhecido: ${step.sceneId}`);
        }
        const validation = validateExercise(step);
        if (!validation.valid) {
          for (const message of validation.errors) err("journey", ref, message);
        }
        const newRefs = step.newRefs ?? [];
        if (newRefs.length > 1 && !step.dedicatedLesson) {
          err("journey", ref, `mais de 1 novidade sem dedicatedLesson`);
        }
      }
    }

    if (authoredCount < 5) {
      err("journey", "authored", `Esperava ao menos 5 conversation_scene na jornada (achou ${authoredCount}).`);
    }

    if (errors.length > 0) {
      console.error(`\nvalidate:conversation-scenes encontrou ${errors.length} problema(s):`);
      for (const item of errors.slice(0, 80)) {
        console.error(`- [${item.area}] ${item.ref}: ${item.message}`);
      }
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK: validate:conversation-scenes passou (${CONVERSATION_SCENES.length} cenas, ${authoredCount} passos na jornada).`
      );
    }
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error);
    process.exitCode = 1;
  }
}
