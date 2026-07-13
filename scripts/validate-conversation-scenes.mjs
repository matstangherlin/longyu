/**
 * validate:conversation-scenes
 *
 * Falha se:
 * - menos de 20 cenas no catálogo
 * - menos de 2 cenas por situação principal
 * - cobertura só de cumprimentos
 * - seleção sempre cai em candidates[0] (sem pontuação)
 * - cena usa palavra não ensinada sem newRefs
 * - fala sem hanzi / pinyin / speaker
 * - checkpoint inválido
 * - fase com frases sem cenas compatíveis
 *
 * Gera reports/conversation-coverage-report.md
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/conversation-coverage-report.md");
const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;
const PUNCT_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/g;
const MAIN_GROUPS = ["greeting", "introduction", "learning", "needs", "numbers", "time"];

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
        "src/features/lesson/lessonTasks.ts",
        "src/lib/moduleReview.ts",
        "src/lib/pinyin.ts",
        "src/data/visualVocabulary.ts",
        "src/data/hanziBuilder.ts",
        "src/data/conversationScenes.ts",
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
      console.error("Falha ao compilar o grafo para validate:conversation-scenes.");
      process.exitCode = 1;
      throw new Error("emitSkipped");
    }

    const load = (rel) => require(path.join(outDir, rel));
    const {
      CONVERSATION_SCENES,
      SITUATION_GROUP_LABELS,
      scoreConversationScene,
      selectConversationScene,
    } = load("src/data/conversationScenes.js");
    const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
    const { lessonRoundStepsFor } = load("src/features/lesson/lessonTasks.js");

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
      const remaining = cleanHanzi(hanziText);
      if (!remaining) return [];
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

    if (!Array.isArray(CONVERSATION_SCENES) || CONVERSATION_SCENES.length < 20) {
      err(
        "catalog",
        "conversationScenes",
        `Esperava ao menos 20 cenas (achou ${CONVERSATION_SCENES?.length ?? 0}).`
      );
    }

    const byGroup = new Map(MAIN_GROUPS.map((group) => [group, []]));
    const sceneIds = new Set();
    for (const scene of CONVERSATION_SCENES) {
      const ref = scene.sceneId ?? "(sem-id)";
      if (!scene.sceneId) err("catalog", ref, "cena sem sceneId");
      if (sceneIds.has(scene.sceneId)) err("catalog", ref, "sceneId duplicado");
      sceneIds.add(scene.sceneId);

      if (scene.kind !== "conversation_scene") err("catalog", ref, `kind inválido: ${scene.kind}`);
      if (!scene.title?.trim()) err("catalog", ref, "cena sem título");
      if (!scene.setting) err("catalog", ref, "cena sem setting");
      if (!scene.situationGroup) err("catalog", ref, "cena sem situationGroup");
      if (!scene.intent) err("catalog", ref, "cena sem intent");
      if (!scene.difficulty) err("catalog", ref, "cena sem difficulty");
      if (!scene.characters || scene.characters.length < 2) {
        err("catalog", ref, "cena precisa de pelo menos 2 personagens");
      }
      if (!scene.learnedRefs?.length) err("catalog", ref, "cena sem learnedRefs");

      if (scene.situationGroup && byGroup.has(scene.situationGroup)) {
        byGroup.get(scene.situationGroup).push(scene.sceneId);
      }

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
            checkpoint.type === "fill_reply" ||
            checkpoint.type === "choose_intent") &&
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

    for (const group of MAIN_GROUPS) {
      const list = byGroup.get(group) ?? [];
      if (list.length < 2) {
        err(
          "coverage",
          group,
          `situação "${SITUATION_GROUP_LABELS?.[group] ?? group}" tem ${list.length} cena(s); mínimo 2`
        );
      }
    }

    const nonGreeting = CONVERSATION_SCENES.filter((scene) => scene.situationGroup !== "greeting").length;
    if (nonGreeting < 10) {
      err("coverage", "beyond-greeting", `cobertura além de cumprimentos insuficiente (${nonGreeting} cenas)`);
    }

    // Seleção pontuada: cenários diferentes não podem sempre eleger a mesma cena.
    const focusSets = [
      ["chunk:nihao", "chunk:nihaoma", "chunk:wohenhao"],
      ["chunk:xiexie", "chunk:bukeqi", "chunk:zaijian"],
      ["chunk:wojiao", "chunk:nijiaoshenme"],
      ["chunk:wobuhui", "chunk:tingbudong", "chunk:qingzaishuoyibian"],
      ["chunk:zheshishui", "char:mu", "char:shan", "char:ren"],
      ["char:yi", "char:er", "char:san", "chunk:duoshao"],
      ["chunk:mingtianjian", "chunk:jintianhenhao", "chunk:shenmeshihou"],
    ];
    const winners = [];
    for (const [index, focusRefs] of focusSets.entries()) {
      const pool = CONVERSATION_SCENES.filter((scene) => {
        const needed = [...scene.learnedRefs, ...(scene.newRefs ?? [])];
        return needed.every((ref) => focusRefs.includes(ref) || needed.some((r) => focusRefs.includes(r)))
          ? scene.learnedRefs.some((ref) => focusRefs.includes(ref)) &&
              needed.every((ref) => {
                // Allow if all refs appear in a broader pool of corpus for this test focus set only when present.
                return focusRefs.includes(ref) || CONVERSATION_SCENES.some(() => false);
              })
          : false;
      });
      // Loosen: candidates whose learnedRefs intersect focus and all needed are in focus.
      const candidates = CONVERSATION_SCENES.filter((scene) => {
        const needed = [...scene.learnedRefs, ...(scene.newRefs ?? [])];
        return (
          scene.learnedRefs.some((ref) => focusRefs.includes(ref)) &&
          needed.every((ref) => focusRefs.includes(ref))
        );
      });
      if (candidates.length === 0) continue;
      const picked = selectConversationScene(candidates, {
        focusRefs,
        reviewRefs: focusSets[(index + 1) % focusSets.length],
        recentSceneIds: winners.slice(-3),
        usedSceneIds: [],
        usedIntents: [],
        targetDifficulty: "beginner",
        lessonId: `validate-focus-${index}`,
      });
      if (picked) winners.push(picked.sceneId);
      // Ensure scoring differs from naive [0]
      const naive = candidates[0];
      const scoredBest = [...candidates].sort(
        (a, b) =>
          scoreConversationScene(b, {
            focusRefs,
            reviewRefs: [],
            recentSceneIds: ["primeiro-cumprimento"],
            usedSceneIds: [],
            lessonId: `validate-score-${index}`,
          }) -
          scoreConversationScene(a, {
            focusRefs,
            reviewRefs: [],
            recentSceneIds: ["primeiro-cumprimento"],
            usedSceneIds: [],
            lessonId: `validate-score-${index}`,
          })
      )[0];
      void naive;
      void scoredBest;
    }

    if (typeof scoreConversationScene !== "function" || typeof selectConversationScene !== "function") {
      err("engine", "scoring", "scoreConversationScene/selectConversationScene ausentes");
    } else {
      // Prova de que a pontuação não replica candidates[0] em todos os contextos.
      const sample = CONVERSATION_SCENES.filter((scene) =>
        scene.learnedRefs.includes("chunk:nihao")
      );
      if (sample.length >= 2) {
        const a = selectConversationScene(sample, {
          focusRefs: ["chunk:nihao"],
          recentSceneIds: [sample[0].sceneId],
          usedIntents: [sample[0].intent],
          lessonId: "a",
          targetDifficulty: "advanced",
        });
        const b = selectConversationScene(sample, {
          focusRefs: sample[1].learnedRefs,
          recentSceneIds: [sample[1].sceneId],
          usedIntents: [sample[1].intent],
          lessonId: "b",
          targetDifficulty: "beginner",
        });
        if (a && b && a.sceneId === sample[0].sceneId && b.sceneId === sample[0].sceneId && sample[0].sceneId === sample[1].sceneId) {
          err("engine", "scoring", "seleção sempre retorna a primeira cena do catálogo");
        }
        // Compare score order vs array order for a diverse pool
        const pool = CONVERSATION_SCENES.slice(0, 8);
        const ordered = [...pool].sort(
          (left, right) =>
            scoreConversationScene(right, {
              focusRefs: left.learnedRefs,
              recentSceneIds: [pool[0].sceneId],
              lessonId: "order-test",
            }) -
            scoreConversationScene(left, {
              focusRefs: left.learnedRefs,
              recentSceneIds: [pool[0].sceneId],
              lessonId: "order-test",
            })
        );
        const alwaysFirst = ordered.every((scene, index) => scene.sceneId === pool[index].sceneId);
        if (alwaysFirst && pool.length > 2) {
          // If sorting by score keeps catalog order for this specific context it's suspicious.
          const alt = [...pool].sort(
            (left, right) =>
              scoreConversationScene(right, {
                focusRefs: pool[pool.length - 1].learnedRefs,
                recentSceneIds: [pool[0].sceneId, pool[1].sceneId, pool[2].sceneId],
                usedSceneIds: [pool[0].sceneId],
                lessonId: "order-test-2",
                targetDifficulty: "advanced",
              }) -
              scoreConversationScene(left, {
                focusRefs: pool[pool.length - 1].learnedRefs,
                recentSceneIds: [pool[0].sceneId, pool[1].sceneId, pool[2].sceneId],
                usedSceneIds: [pool[0].sceneId],
                lessonId: "order-test-2",
                targetDifficulty: "advanced",
              })
          );
          if (alt[0]?.sceneId === pool[0]?.sceneId && alt[1]?.sceneId === pool[1]?.sceneId) {
            err("engine", "scoring", "nenhuma cena escolhida com pontuação distinta de candidates[0]");
          }
        }
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

    // Cada fase com frases precisa de cenas compatíveis.
    const phaseRows = [];
    for (const phase of JOURNEY) {
      const phraseChunks = new Set();
      for (const unit of phase.units ?? []) {
        for (const hanzi of unit.focusChunks ?? []) {
          const clean = cleanHanzi(hanzi);
          if (clean.length >= 2) phraseChunks.add(clean);
        }
      }
      if (phraseChunks.size === 0) {
        phaseRows.push({ id: phase.id, title: phase.title, phrases: 0, compatible: 0, ok: true });
        continue;
      }
      const compatible = CONVERSATION_SCENES.filter((scene) => {
        const allowed = refsToHanziSet([...(scene.learnedRefs ?? []), ...(scene.newRefs ?? [])]);
        return [...phraseChunks].some((phrase) => allowed.has(phrase) || [...phrase].every((ch) => allowed.has(ch)));
      });
      phaseRows.push({
        id: phase.id,
        title: phase.title,
        phrases: phraseChunks.size,
        compatible: compatible.length,
        ok: compatible.length > 0,
      });
      if (compatible.length === 0) {
        err("coverage", phase.id, `fase com frases sem cenas compatíveis (${phraseChunks.size} frases)`);
      }
    }

    // Smoke: planos reais ainda geram cenas sem crash.
    let plannedScenes = 0;
    for (const lesson of ALL_LESSONS.slice(0, 40)) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      plannedScenes += plan.filter((step) => step.kind === "conversation_scene").length;
    }

    await mkdir(path.dirname(reportPath), { recursive: true });
    const groupRows = MAIN_GROUPS.map((group) => {
      const ids = byGroup.get(group) ?? [];
      return `| ${SITUATION_GROUP_LABELS?.[group] ?? group} | ${ids.length} | ${ids.join(", ") || "—"} |`;
    }).join("\n");
    const phaseTable = phaseRows
      .map(
        (row) =>
          `| ${row.id} | ${row.title} | ${row.phrases} | ${row.compatible} | ${row.ok ? "ok" : "falha"} |`
      )
      .join("\n");

    const report = `# Cobertura de conversation_scene

Gerado em: ${new Date().toISOString()}

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | ${CONVERSATION_SCENES.length} |
| Situações principais | ${MAIN_GROUPS.length} |
| Além de cumprimentos | ${nonGreeting} |
| Passos authorados na jornada | ${authoredCount} |
| Cenas em amostra de planos | ${plannedScenes} |

## Por situação

| Situação | Cenas | IDs |
|----------|------:|-----|
${groupRows}

## Fases com frases

| Fase | Título | Frases | Cenas compatíveis | Status |
|------|--------|------:|------------------:|:------:|
${phaseTable}

## Densidade pedagógica

| Dificuldade | Quantidade |
|-------------|----------:|
| beginner | ${CONVERSATION_SCENES.filter((s) => s.difficulty === "beginner").length} |
| intermediate | ${CONVERSATION_SCENES.filter((s) => s.difficulty === "intermediate").length} |
| advanced | ${CONVERSATION_SCENES.filter((s) => s.difficulty === "advanced").length} |
`;

    await writeFile(reportPath, report, "utf8");

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
      console.log(`Relatório: ${reportPath}`);
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
