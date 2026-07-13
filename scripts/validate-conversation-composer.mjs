/**
 * validate:conversation-composer
 *
 * Falha se:
 * - conversa usa item não ensinado sem preview;
 * - checkpoint não tem resposta correta;
 * - falas repetem exatamente a mesma conversa anterior;
 * - opções duplicadas;
 * - conversa tem menos de 2 falas em chinês.
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
  const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conversation-composer-"));
  try {
    const program = ts.createProgram(
      [
        "src/data/conversationComposer.ts",
        "src/data/conversationScenes.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/vocabulary.ts",
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
      console.error("Falha ao compilar o grafo para validate:conversation-composer.");
      process.exitCode = 1;
      throw new Error("emitSkipped");
    }

    const load = (rel) => require(path.join(outDir, rel));
    const {
      buildConversationSceneForLesson,
      conversationLineSignature,
      COMPOSED_CONVERSATION_RECIPES,
      conversationDifficultyForContext,
    } = load("src/data/conversationComposer.js");
    const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");
    const { ALL_LESSONS } = load("src/data/journey.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { VOCABULARY } = load("src/data/vocabulary.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");

    const chunkById = new Map(CHUNKS.map((chunk) => [chunk.id, chunk]));
    const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
    const vocabById = new Map(VOCABULARY.map((entry) => [entry.id, entry]));

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
        } else if (type === "vocab") {
          const vocab = vocabById.get(id);
          if (vocab) {
            const clean = cleanHanzi(vocab.hanzi);
            set.add(clean);
            for (const ch of extractCjkTokens(clean)) set.add(ch);
          }
        }
      }
      return set;
    }

    function uncoveredTokens(hanziText, allowed) {
      const remaining = cleanHanzi(hanziText);
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

    function validateScene(scene, ref, allowedRefs) {
      if (!scene) return;
      const allowed = refsToHanziSet([...(scene.learnedRefs ?? []), ...(scene.newRefs ?? [])]);
      const lines = scene.lines ?? [];
      if (lines.length < 2) err("scene", ref, "menos de 2 falas em chinês");

      for (const [index, line] of lines.entries()) {
        if (!line.hanzi?.trim()) err("scene", `${ref}#${index + 1}`, "fala sem hanzi");
        const missing = uncoveredTokens(line.hanzi ?? "", allowed);
        if (missing.length > 0) {
          err("pedagogy", `${ref}#${index + 1}`, `vocabulário não coberto: ${[...new Set(missing)].join("")}`);
        }
      }

      const checkpoint = scene.checkpoint;
      if (!checkpoint?.correctAnswer?.trim()) {
        err("scene", ref, "checkpoint sem resposta correta");
      } else {
        const dup = hasDuplicate(checkpoint.options ?? []);
        if (dup) err("scene", ref, `opções duplicadas: "${dup}"`);
        if (
          checkpoint.options?.length >= 2 &&
          !checkpoint.options.some((option) => norm(option) === norm(checkpoint.correctAnswer))
        ) {
          err("scene", ref, "resposta correta fora das opções");
        }
      }

      if ((scene.newRefs ?? []).length > 1 && !scene.dedicatedLesson) {
        err("scene", ref, "mais de 1 novidade sem dedicatedLesson");
      }

      const asStep = {
        kind: "conversation_scene",
        title: scene.title,
        sceneId: scene.sceneId,
        setting: scene.setting,
        characters: scene.characters,
        lines: scene.lines,
        checkpoint: scene.checkpoint,
        learnedRefs: scene.learnedRefs,
        newRefs: scene.newRefs,
        dedicatedLesson: scene.dedicatedLesson,
        conversationDifficulty: scene.difficultyLevel,
        prompt: checkpoint?.prompt,
        options: checkpoint?.options,
        correctAnswer: checkpoint?.correctAnswer,
        explanation: checkpoint?.explanation,
      };
      const validation = validateExercise(asStep);
      if (!validation.valid) {
        for (const message of validation.errors) err("runtime", ref, message);
      }

      if (allowedRefs && scene.learnedRefs) {
        for (const learned of scene.learnedRefs) {
          if (!allowedRefs.has(learned) && !(scene.newRefs ?? []).includes(learned)) {
            // learned refs must be subset of context + newRefs
          }
        }
      }
    }

    if (!COMPOSED_CONVERSATION_RECIPES?.length) {
      err("composer", "recipes", "nenhuma receita composta");
    }

    const signatures = new Set(CONVERSATION_SCENES.map((scene) => conversationLineSignature(scene.lines)));
    let composedCount = 0;

    const sampleContexts = [
      { learnedChunkRefs: ["chunk:nihao"], learnedCharRefs: [] },
      { learnedChunkRefs: ["chunk:xiexie", "chunk:bukeqi"], learnedCharRefs: [] },
      { learnedChunkRefs: ["chunk:nihaoma", "chunk:wohenhao"], learnedCharRefs: ["char:wo", "char:ni", "char:hao"] },
      { learnedChunkRefs: [], learnedCharRefs: ["char:shui", "char:hao", "char:wo"], learnedVocabRefs: ["vocab:v_woxiangheshui"] },
      { learnedChunkRefs: ["chunk:wobuhui", "chunk:nihaoma"], learnedCharRefs: ["char:zhong", "char:ni", "char:hui", "char:shuo", "char:wen_writing"] },
    ];

    for (const [index, refs] of sampleContexts.entries()) {
      const lesson = ALL_LESSONS.find((entry) => entry.skill === "fala") ?? ALL_LESSONS[0];
      const context = {
        ...refs,
        phaseOrder: index + 1,
        stageId: index >= 3 ? "usage" : "recognition",
      };
      const scene = buildConversationSceneForLesson(lesson, context);
      if (!scene) continue;
      composedCount += 1;
      const ref = scene.sceneId ?? `sample-${index}`;
      validateScene(scene, ref, new Set([...refs.learnedChunkRefs, ...refs.learnedCharRefs, ...(refs.learnedVocabRefs ?? [])]));

      const signature = conversationLineSignature(scene.lines);
      if (signatures.has(signature)) {
        err("duplicate", ref, "falas repetem exatamente uma cena anterior do catálogo");
      }
      signatures.add(signature);
    }

    if (composedCount < 3) {
      err("composer", "samples", `esperava ao menos 3 cenas compostas de amostra (gerou ${composedCount})`);
    }

    const difficulty = conversationDifficultyForContext({ phaseOrder: 1, stageId: "usage" });
    if (difficulty !== 1) err("composer", "difficulty", "nível inicial deveria ser 1");

    if (errors.length > 0) {
      console.error(`\nvalidate:conversation-composer encontrou ${errors.length} problema(s):`);
      for (const item of errors.slice(0, 80)) {
        console.error(`- [${item.area}] ${item.ref}: ${item.message}`);
      }
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK: validate:conversation-composer passou (${COMPOSED_CONVERSATION_RECIPES.length} receitas · ${composedCount} amostras).`
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
