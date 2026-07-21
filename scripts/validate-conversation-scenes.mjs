/**
 * validate:conversation-scenes
 *
 * Falha se:
 * - cena usa palavra/hànzì não coberto por learnedRefs/newRefs (inclui ramos de erro V2);
 * - fala/nó sem hanzi ou sem pinyin;
 * - interação/checkpoint sem resposta correta, com opções duplicadas ou com
 *   resposta fora das opções;
 * - mais de 1 novidade (newRefs) sem dedicatedLesson;
 * - cena V2 com nó inalcançável, referência de nó inexistente ou loop infinito
 *   (nó alcançável sem caminho até um terminal);
 * - cena V2 fora dos limites do papel (comum 6–10 falas e 2–3 intervenções;
 *   revisão 10–14 e 3–5; imersão 14–24 e 5–8, ramificada e com conclusões diferentes);
 * - a Jornada continuar selecionando sempre a primeira cena (ignora contexto).
 *
 * Gera reports/conversation-coverage-report.md.
 */

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import { finalizeReport, reportProvenanceLines } from "./lib/report-meta.mjs";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const reportPath = path.join(rootDir, "reports/conversation-coverage-report.md");
const errors = [];
const err = (area, ref, message) => errors.push({ area, ref, message });

const CJK_RE = /[㐀-鿿豈-﫿]/u;
const PUNCT_RE = /[　-〿＀-￯,.!?\s:;"'()？！。，、]/g;
const MIN_CATALOG_SIZE = 30;

const ROLE_LIMITS = {
  common: { lines: [6, 10], interactions: [2, 3] },
  module_review: { lines: [10, 14], interactions: [3, 5] },
  immersion: { lines: [14, 24], interactions: [5, 8] },
};

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
        "src/data/conversationVocabulary.ts",
        "src/data/journey.ts",
        "src/data/characters.ts",
        "src/data/chunks.ts",
        "src/data/types.ts",
        "src/features/lesson/exerciseValidation.ts",
        "src/features/lesson/lessonTasks.ts",
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
      conversationSceneStats,
      conversationSceneMainPath,
      scoreConversationScene,
      pickBestConversationScene,
      minimalRequiredRefs,
      isConversationSceneEligible,
      conversationVariantLevelFor,
      conversationSelectionContextFromHistory,
    } = load("src/data/conversationScenes.js");
    const { buildConversationVocabularyManifest } = load("src/data/conversationVocabulary.js");
    const { ALL_LESSONS, JOURNEY } = load("src/data/journey.js");
    const { CHUNKS } = load("src/data/chunks.js");
    const { CHARACTERS } = load("src/data/characters.js");
    const { validateExercise } = load("src/features/lesson/exerciseValidation.js");
    const { lessonRoundStepsFor, analyzeConversationSceneCoverage } = load("src/features/lesson/lessonTasks.js");

    // Papel de imersão / lição de imersão (mesma heurística do motor).
    const isImmersionLesson = (lesson) => {
      const id = String(lesson.id ?? "").toLocaleLowerCase("pt-BR");
      const title = String(lesson.title ?? "").toLocaleLowerCase("pt-BR");
      return id.includes("immersion") || id.includes("imers") || title.includes("imersão") || title.includes("immersion");
    };
    const sceneRoleOf = (scene) => scene.sceneRole ?? "common";

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
          } else {
            err("catalog", ref, `chunk desconhecido em refs: ${id}`);
          }
        } else if (type === "char") {
          const char = charById.get(id);
          if (char) set.add(cleanHanzi(char.hanzi));
          else err("catalog", ref, `char desconhecido em refs: ${id}`);
        }
      }
      return set;
    }

    function uncoveredTokens(hanziText, allowed) {
      const clean = cleanHanzi(hanziText);
      if (!clean) return [];
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

    function checkVocabCoverage(refLabel, hanziText, allowed) {
      if (!String(hanziText ?? "").trim()) return;
      const missing = uncoveredTokens(hanziText, allowed);
      if (missing.length === 0) return;
      const unknown = missing.filter((token) => {
        const asChunk = chunkByHanzi.get(token);
        const asChar = charByHanzi.get(token);
        return Boolean(asChunk || asChar || CJK_RE.test(token));
      });
      if (unknown.length > 0) {
        err("pedagogy", refLabel, `palavra/hànzì não coberto por learnedRefs/newRefs: ${[...new Set(unknown)].join(" ")}`);
      }
    }

    // Interações de escolha precisam da resposta entre as opções; order_reply
    // precisa poder ser montada com as peças do banco.
    function checkInteraction(refLabel, interaction, nodeIds) {
      if (!interaction.prompt?.trim()) err("catalog", refLabel, "interação sem prompt");
      if (!interaction.correctAnswer?.trim()) err("catalog", refLabel, "interação sem resposta correta");
      const options = interaction.options ?? [];
      const duplicate = hasDuplicate(options);
      if (duplicate) err("catalog", refLabel, `options duplicadas: "${duplicate}"`);
      if (!interaction.correctNextNodeId || !nodeIds.has(interaction.correctNextNodeId)) {
        err("graph", refLabel, `correctNextNodeId desconhecido: "${interaction.correctNextNodeId}"`);
      }
      if (interaction.wrongNextNodeId && !nodeIds.has(interaction.wrongNextNodeId)) {
        err("graph", refLabel, `wrongNextNodeId desconhecido: "${interaction.wrongNextNodeId}"`);
      }
      if (interaction.type === "order_reply") {
        if (options.length < 2) err("catalog", refLabel, "order_reply sem peças suficientes");
        // Montagem gulosa: a resposta precisa ser componível com as peças.
        let rest = cleanHanzi(interaction.correctAnswer);
        const pieces = options.map((piece) => cleanHanzi(piece)).filter(Boolean).sort((a, b) => b.length - a.length);
        let guard = 0;
        while (rest.length > 0 && guard < 60) {
          const piece = pieces.find((candidate) => rest.startsWith(candidate));
          if (!piece) break;
          rest = rest.slice(piece.length);
          guard += 1;
        }
        if (rest.length > 0) {
          err("catalog", refLabel, `order_reply: resposta "${interaction.correctAnswer}" não pode ser montada com as peças`);
        }
      } else if (options.length >= 2) {
        if (!options.some((option) => norm(option) === norm(interaction.correctAnswer))) {
          err("catalog", refLabel, `resposta correta fora das options: "${interaction.correctAnswer}"`);
        }
      } else {
        err("catalog", refLabel, "interação de escolha com menos de 2 opções");
      }
    }

    // Grafo V2: todo nó precisa ser alcançável a partir da entrada, e de todo
    // nó alcançável deve existir caminho até um terminal (sem loop infinito).
    function checkNodeGraph(ref, nodes, entryNodeId) {
      nodes = nodes ?? [];
      const byId = new Map();
      for (const node of nodes) {
        if (!node.id?.trim()) err("graph", ref, "nó sem id");
        else if (byId.has(node.id)) err("graph", ref, `nó duplicado: "${node.id}"`);
        byId.set(node.id, node);
      }
      const entryId = entryNodeId ?? nodes[0]?.id;
      if (!entryId || !byId.has(entryId)) {
        err("graph", ref, `entryNodeId desconhecido: "${entryNodeId}"`);
        return;
      }

      const edgesOf = (node) =>
        [node.nextNodeId, node.interaction?.correctNextNodeId, node.interaction?.wrongNextNodeId].filter((id) =>
          Boolean(id && byId.has(id))
        );

      const reachable = new Set();
      const queue = [entryId];
      while (queue.length > 0) {
        const id = queue.shift();
        if (reachable.has(id)) continue;
        reachable.add(id);
        for (const next of edgesOf(byId.get(id))) queue.push(next);
      }
      for (const node of nodes) {
        if (!reachable.has(node.id)) err("graph", ref, `nó inalcançável: "${node.id}"`);
      }

      const terminals = new Set(nodes.filter((node) => edgesOf(node).length === 0).map((node) => node.id));
      if (terminals.size === 0) {
        err("graph", ref, "loop infinito: a cena não tem nó terminal");
        return;
      }
      // Alcança terminal? Busca reversa a partir dos terminais.
      const reverse = new Map(nodes.map((node) => [node.id, []]));
      for (const node of nodes) {
        for (const next of edgesOf(node)) reverse.get(next)?.push(node.id);
      }
      const canFinish = new Set();
      const stack = [...terminals];
      while (stack.length > 0) {
        const id = stack.pop();
        if (canFinish.has(id)) continue;
        canFinish.add(id);
        for (const prev of reverse.get(id) ?? []) stack.push(prev);
      }
      for (const id of reachable) {
        if (!canFinish.has(id)) err("graph", ref, `loop infinito: do nó "${id}" não há caminho até um terminal`);
      }
    }

    if (!Array.isArray(CONVERSATION_SCENES) || CONVERSATION_SCENES.length < MIN_CATALOG_SIZE) {
      err("catalog", "conversationScenes", `Esperava ao menos ${MIN_CATALOG_SIZE} cenas (achou ${CONVERSATION_SCENES?.length ?? 0}).`);
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
      if (!scene.intent?.trim()) err("catalog", ref, "cena sem intent (necessário para seleção)");
      if (!scene.characters || scene.characters.length < 2) {
        err("catalog", ref, "cena precisa de pelo menos 2 personagens");
      }
      if (!scene.learnedRefs?.length) err("catalog", ref, "cena sem learnedRefs");

      const newRefs = scene.newRefs ?? [];
      if (newRefs.length > 1 && !scene.dedicatedLesson) {
        err("catalog", ref, `mais de 1 novidade (${newRefs.length}) sem dedicatedLesson`);
      }

      const allowed = refsToHanziSet([...(scene.learnedRefs ?? []), ...newRefs]);
      const nodes = scene.nodes ?? [];
      if (nodes.length === 0) {
        err("catalog", ref, "cena do catálogo sem nós V2 (formato autoral V1 removido)");
      }
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
        checkVocabCoverage(lineRef, line.hanzi, allowed);
      }

      // V2: valida TODOS os nós (inclusive ramos de erro que não estão nas lines).
      if (nodes.length > 0) {
        const main = conversationSceneMainPath(nodes, scene.entryNodeId);
        if (main.length !== lines.length) {
          err("catalog", ref, `lines derivadas (${lines.length}) divergem do caminho principal (${main.length})`);
        }
        for (let i = 0; i < main.length; i += 1) {
          const derived = lines[i];
          if (!derived || main[i].hanzi !== derived.hanzi || main[i].speakerId !== derived.speakerId) {
            err("catalog", ref, `lines[${i}] diverge do nó ${main[i].id} (duplicação manual?)`);
          }
        }
        const firstInteraction = main.find((node) => node.interaction)?.interaction;
        const checkpoint = scene.checkpoint;
        if (firstInteraction && checkpoint && norm(checkpoint.correctAnswer) !== norm(firstInteraction.correctAnswer)) {
          err("catalog", ref, "checkpoint derivado diverge da primeira interação V2");
        }

        checkNodeGraph(ref, nodes, scene.entryNodeId);
        const nodeIds = new Set(nodes.map((node) => node.id));
        for (const node of nodes) {
          const nodeRef = `${ref}@${node.id}`;
          if (!node.hanzi?.trim()) err("catalog", nodeRef, "nó sem hanzi");
          if (!node.pinyin?.trim()) err("catalog", nodeRef, "nó sem pinyin");
          if (!node.speakerId?.trim()) err("catalog", nodeRef, "nó sem speakerId");
          else if (!scene.characters?.some((character) => character.id === node.speakerId)) {
            err("catalog", nodeRef, `speakerId desconhecido "${node.speakerId}"`);
          }
          if (node.nextNodeId && !nodeIds.has(node.nextNodeId)) {
            err("graph", nodeRef, `nextNodeId desconhecido: "${node.nextNodeId}"`);
          }
          checkVocabCoverage(nodeRef, node.hanzi, allowed);
          if (node.interaction) checkInteraction(nodeRef, node.interaction, nodeIds);
        }

        // Limites por papel pedagógico (falas do caminho principal).
        const role = scene.sceneRole ?? "common";
        const limits = ROLE_LIMITS[role];
        const stats = conversationSceneStats(scene);
        if (limits) {
          if (stats.lineCount < limits.lines[0] || stats.lineCount > limits.lines[1]) {
            err("role", ref, `cena "${role}" com ${stats.lineCount} falas (esperado ${limits.lines[0]}–${limits.lines[1]}).`);
          }
          if (stats.interactionCount < limits.interactions[0] || stats.interactionCount > limits.interactions[1]) {
            err("role", ref, `cena "${role}" com ${stats.interactionCount} intervenções (esperado ${limits.interactions[0]}–${limits.interactions[1]}).`);
          }
        }
        if (role === "immersion") {
          if (!stats.branching) err("role", ref, "cena de imersão sem escolhas ramificadas (wrongNextNodeId).");
          if (stats.endingCount < 2) err("role", ref, "cena de imersão precisa de conclusões diferentes (≥2 nós terminais).");
        }
      }

      // ————— Variantes por estágio —————
      // Cada variante é validada de forma independente (vocabulário, grafo,
      // interação) contra os SEUS próprios refs. Uma variante nunca pode exigir
      // mais vocabulário que o nível de topo (avançado), e a mais simples
      // (beginner) precisa exigir estritamente menos — do contrário não há
      // ganho pedagógico e a versão avançada apareceria cedo demais.
      const variants = scene.variants ?? [];
      const stageRank = { beginner: 0, intermediate: 1, advanced: 2 };
      const topRefs = new Set(scene.learnedRefs ?? []);
      for (const variant of variants) {
        const vref = `${ref}~${variant.stage}`;
        if (!variant.stage || !(variant.stage in stageRank)) err("variant", vref, `stage inválido: ${variant.stage}`);
        if (!Array.isArray(variant.learnedRefs) || variant.learnedRefs.length === 0) {
          err("variant", vref, "variante sem learnedRefs");
        }
        const vnodes = variant.nodes ?? [];
        if (vnodes.length === 0) {
          err("variant", vref, "variante sem nós");
          continue;
        }
        const vallowed = refsToHanziSet([...(variant.learnedRefs ?? []), ...(variant.newRefs ?? [])]);
        checkNodeGraph(vref, vnodes, variant.entryNodeId);
        const vNodeIds = new Set(vnodes.map((node) => node.id));
        let hasInteraction = false;
        for (const node of vnodes) {
          const nodeRef = `${vref}@${node.id}`;
          if (!node.hanzi?.trim()) err("variant", nodeRef, "nó sem hanzi");
          if (!node.pinyin?.trim()) err("variant", nodeRef, "nó sem pinyin");
          if (!node.speakerId?.trim()) err("variant", nodeRef, "nó sem speakerId");
          else if (!scene.characters?.some((character) => character.id === node.speakerId)) {
            err("variant", nodeRef, `speakerId desconhecido "${node.speakerId}"`);
          }
          checkVocabCoverage(nodeRef, node.hanzi, vallowed);
          if (node.interaction) {
            hasInteraction = true;
            checkInteraction(nodeRef, node.interaction, vNodeIds);
          }
        }
        if (!hasInteraction) err("variant", vref, "variante sem nenhuma interação do aluno");
        // Variante nunca pode exigir vocabulário que a versão avançada não tem.
        const extra = (variant.learnedRefs ?? []).filter((r) => !topRefs.has(r));
        if (extra.length > 0) {
          err("variant", vref, `variante exige refs ausentes do nível avançado: ${extra.join(", ")}`);
        }
        // A variante iniciante precisa exigir MENOS que o avançado (senão a
        // versão avançada apareceria já no primeiro momento elegível).
        if (variant.stage === "beginner" && (variant.learnedRefs ?? []).length >= (scene.learnedRefs ?? []).length) {
          err("variant", vref, "variante beginner não simplifica o vocabulário (não reduz requiredRefs).");
        }
      }
      // optionalRefs NUNCA podem ser tratados como obrigatórios: não podem
      // entrar no conjunto mínimo que controla a elegibilidade.
      const minimal = new Set(minimalRequiredRefs(scene));
      for (const opt of scene.optionalRefs ?? []) {
        if (minimal.has(opt)) {
          err("pedagogy", ref, `optionalRef tratado como obrigatório (entra no gate mínimo): ${opt}`);
        }
      }
      // requiredRefs sem "frases desnecessárias": todo learnedRef precisa
      // aparecer em ALGUMA camada renderizável da cena — falas, opções de
      // interação, respostas ou checkpoint.
      const interactionTexts = (nodeList) =>
        nodeList.flatMap((node) => [
          node.hanzi,
          node.interaction?.correctAnswer,
          ...(node.interaction?.options ?? []),
        ]);
      const renderedHanzi = [
        ...lines.map((line) => line.hanzi),
        ...interactionTexts(nodes),
        ...variants.flatMap((variant) => interactionTexts(variant.nodes ?? [])),
        scene.checkpoint?.correctAnswer,
        ...(scene.checkpoint?.options ?? []),
      ];
      const usedTokens = new Set();
      for (const text of renderedHanzi) for (const token of extractCjkTokens(text)) usedTokens.add(token);
      for (const learnedRef of scene.learnedRefs ?? []) {
        const refTokens = extractCjkTokens([...refsToHanziSet([learnedRef])].join(""));
        if (refTokens.length > 0 && !refTokens.some((token) => usedTokens.has(token))) {
          err("pedagogy", ref, `requiredRef desnecessário (não aparece em nenhuma fala da cena): ${learnedRef}`);
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
      if (nodes.length === 0 && !checkpoint) {
        err("catalog", ref, "cena sem interação (nem checkpoint nem nós com interaction)");
      }
      if (nodes.length > 0 && !nodes.some((node) => node.interaction)) {
        err("catalog", ref, "cena V2 sem nenhuma interação do aluno");
      }

      const asStep = {
        ...scene,
        prompt: checkpoint?.prompt ?? nodes.find((node) => node.interaction)?.interaction?.prompt,
        options: checkpoint?.options ?? nodes.find((node) => node.interaction)?.interaction?.options,
        correctAnswer: checkpoint?.correctAnswer ?? nodes.find((node) => node.interaction)?.interaction?.correctAnswer,
        explanation: checkpoint?.explanation,
      };
      const validation = validateExercise(asStep);
      if (!validation.valid) {
        for (const message of validation.errors) err("runtime", ref, message);
      }
    }

    // ————— Passos autorais na jornada —————
    let authoredCount = 0;
    const authoredUseBySceneId = new Map();
    for (const lesson of ALL_LESSONS) {
      const scenes = (lesson.steps ?? []).filter((step) => step.kind === "conversation_scene");
      authoredCount += scenes.length;
      const immersionLesson = isImmersionLesson(lesson);
      const maxAllowed = immersionLesson ? 99 : lesson.isReview ? 2 : 1;
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
        } else {
          authoredUseBySceneId.set(step.sceneId, (authoredUseBySceneId.get(step.sceneId) ?? 0) + 1);
          // Cena de imersão só pode ser inserida em lição de imersão.
          const catalogScene = CONVERSATION_SCENES.find((s) => s.sceneId === step.sceneId);
          if (catalogScene && sceneRoleOf(catalogScene) === "immersion" && !immersionLesson) {
            err("coverage", ref, `cena de imersão "${step.sceneId}" inserida em lição comum (${lesson.id}).`);
          }
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

    // ————— Seleção: nunca "sempre a primeira cena" —————
    // 1) A pontuação precisa reagir ao contexto: uma cena vista há pouco não
    //    pode vencer uma equivalente ainda não vista.
    const sample = CONVERSATION_SCENES[0];
    if (typeof scoreConversationScene !== "function" || typeof pickBestConversationScene !== "function") {
      err("selection", "scoring", "scoreConversationScene/pickBestConversationScene ausentes.");
    } else if (sample) {
      const lessonInfo = { focusRefs: new Set(sample.learnedRefs), reviewRefs: new Set() };
      const fresh = scoreConversationScene(sample, lessonInfo, {});
      const repeated = scoreConversationScene(sample, lessonInfo, {
        recentConversationSceneIds: [sample.sceneId],
        recentConversationIntentIds: [sample.intent],
      });
      if (repeated >= fresh) {
        err("selection", "scoring", "cena recém-vista não é penalizada pela pontuação (esperava score menor).");
      }

      // 1b) Diversidade pelo histórico: a cena da lição anterior não pode vencer
      //     uma equivalente nunca realizada (não repete duas vezes seguidas).
      const other = CONVERSATION_SCENES.find((s) => s.sceneId !== sample.sceneId && s.intent !== sample.intent);
      if (other) {
        const info = { focusRefs: new Set([...sample.learnedRefs, ...other.learnedRefs]), reviewRefs: new Set() };
        const history = [
          { sceneId: sample.sceneId, intent: sample.intent, lessonId: "lx", completedAt: Date.now(), result: "completed", attempts: 1 },
        ];
        const ctx = conversationSelectionContextFromHistory(history, {
          recentConversationSceneIds: [sample.sceneId],
          recentConversationIntentIds: [sample.intent],
        });
        const scoreSame = scoreConversationScene(sample, info, ctx);
        const scoreOther = scoreConversationScene(other, info, ctx);
        if (scoreSame >= scoreOther) {
          err("diversity", "history", "cena da lição anterior não deve vencer uma cena nunca realizada (repetição consecutiva).");
        }
      }

      // 1c) Nível da variante: aluno novo → guided; aluno avançado → independent+.
      if (typeof conversationVariantLevelFor === "function") {
        const newUser = conversationVariantLevelFor(sample, []);
        if (newUser !== "guided") {
          err("variant", "new-user", `usuário novo deveria receber cena básica (guided), recebeu ${newUser}.`);
        }
        const advancedHistory = Array.from({ length: 14 }, (_, i) => ({
          sceneId: `s${i}`,
          intent: `i${i}`,
          lessonId: `l${i}`,
          completedAt: Date.now() - i,
          result: "completed",
          attempts: 1,
        }));
        const advanced = conversationVariantLevelFor(sample, advancedHistory);
        const rank = { guided: 0, assisted: 1, independent: 2, audio_first: 3 };
        if ((rank[advanced] ?? 0) < rank.independent) {
          err("variant", "advanced-user", `usuário avançado deveria receber variante independente ou acima, recebeu ${advanced}.`);
        }
        // Uma cena que reaparece não volta na mesma versão (sobe de nível).
        const repeatHistory = [
          { sceneId: sample.sceneId, intent: sample.intent, lessonId: "l1", completedAt: 1, result: "completed", attempts: 1 },
        ];
        const afterFirst = conversationVariantLevelFor(sample, repeatHistory);
        if (afterFirst === "guided") {
          err("variant", "repeat", "cena que reaparece deveria subir de nível (não repetir a mesma versão).");
        }
      }

      // 1d) Erro permite retorno pedagógico: uma cena que trabalha o ref errado é
      //     favorecida (+20), mas a MESMA cena não volta na lição seguinte (−100).
      if (other) {
        const info = { focusRefs: new Set([...sample.learnedRefs, ...other.learnedRefs]), reviewRefs: new Set() };
        const errorRefs = new Set(other.learnedRefs);
        const withError = scoreConversationScene(other, info, { recentErrorRefs: errorRefs });
        const withoutError = scoreConversationScene(other, info, {});
        if (withError <= withoutError) {
          err("diversity", "error-return", "cena que trabalha um erro recente deveria ser favorecida (+20).");
        }
        const immediateRepeat = scoreConversationScene(sample, info, { lastLessonSceneIds: [sample.sceneId] });
        const freshAgain = scoreConversationScene(sample, info, {});
        if (immediateRepeat >= freshAgain) {
          err("diversity", "error-return", "após erro, a mesma cena não deve reaparecer imediatamente (−100 última lição).");
        }
      }
    }

    // 2) Cobertura real dos planos, medida como um aluno realmente percorre a
    //    jornada: com rotação encadeada (recentConversationSceneIds/Intents).
    //    Fonte única compartilhada com o relatório (analyzeConversationSceneCoverage).
    const coverage = analyzeConversationSceneCoverage();
    const generatedUseBySceneId = coverage.generatedUseBySceneId;
    const generatedModes = coverage.generatedByIntent;
    const lessonsWithGeneratedScene = coverage.lessonsWithGeneratedScene;
    const totalGenerated = coverage.totalGenerated;
    const lessonCount = coverage.lessonCount;

    // Rotação sob contexto (anti "sempre a primeira cena"): marcar a cena como
    // recente deve mudar a escolha em pelo menos uma lição.
    let rotationObserved = false;
    let rotationCandidates = 0;
    for (const lesson of ALL_LESSONS) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      const generatedScenes = plan.filter((step) => step.kind === "conversation_scene" && step.generated && step.sceneId);
      if (generatedScenes.length === 0) continue;
      const first = generatedScenes[0];
      const rerun = lessonRoundStepsFor(lesson, {
        silent: true,
        recentConversationSceneIds: [first.sceneId],
        recentConversationIntentIds: first.sceneIntent ? [first.sceneIntent] : [],
      });
      const rerunScenes = rerun.filter((step) => step.kind === "conversation_scene" && step.generated && step.sceneId);
      if (rerunScenes.length > 0) {
        rotationCandidates += 1;
        if (rerunScenes.some((step) => step.sceneId !== first.sceneId)) rotationObserved = true;
      }
    }
    if (rotationCandidates > 0 && !rotationObserved) {
      err(
        "selection",
        "journey",
        "a seleção de cena ignora o contexto: mesmo marcando a cena como recente, todos os planos repetem a mesma cena."
      );
    }

    // ————— Metas de cobertura (falham no beta) —————
    const MIN_DISTINCT_USED = 20;
    const SCENE_DOMINANCE_CAP = 0.15; // nenhuma cena em > 15% das lições
    const INTENT_DOMINANCE_CAP = 0.2; // nenhuma intenção em > 20% das conversas geradas

    if (coverage.distinctUsed < MIN_DISTINCT_USED) {
      err(
        "coverage",
        "catalog",
        `apenas ${coverage.distinctUsed}/${coverage.distinctScenes} cenas aparecem em algum plano (mínimo ${MIN_DISTINCT_USED}).`
      );
    }

    for (const row of coverage.rows) {
      const isCommonish = row.role === "common";
      const uses = row.authoredUses + row.generatedUses;
      // (a) cena comum já elegível que nunca é usada.
      if (isCommonish && row.eligibleCommon && uses === 0) {
        err(
          "coverage",
          row.sceneId,
          `cena comum elegível (desde ${row.firstEligibleLessonId}) nunca aparece em nenhum plano.`
        );
      }
      // (b) cena excessivamente dominante.
      if (uses > lessonCount * SCENE_DOMINANCE_CAP) {
        err(
          "dominance",
          row.sceneId,
          `aparece em ${uses}/${lessonCount} lições (${((uses / lessonCount) * 100).toFixed(0)}% > ${SCENE_DOMINANCE_CAP * 100}%).`
        );
      }
      // (c) cena gerada sem lição elegível = pode aparecer antes do vocabulário.
      if (row.generatedUses > 0 && row.firstEligibleLessonId === null) {
        err("coverage", row.sceneId, "cena gerada sem primeira lição elegível (risco de vir antes do vocabulário).");
      }
    }

    // (d) nenhuma intenção domina as conversas geradas.
    for (const [intent, count] of coverage.generatedByIntent) {
      if (totalGenerated > 0 && count > totalGenerated * INTENT_DOMINANCE_CAP) {
        err(
          "dominance",
          intent,
          `intenção domina ${count}/${totalGenerated} conversas geradas (${((count / totalGenerated) * 100).toFixed(0)}% > ${INTENT_DOMINANCE_CAP * 100}%).`
        );
      }
    }

    // (e) optionalRefs não podem bloquear a elegibilidade (tratados como
    //     obrigatórios): a cena precisa continuar elegível SEM os optionalRefs.
    for (const scene of CONVERSATION_SCENES) {
      const optional = scene.optionalRefs ?? [];
      if (optional.length === 0) continue;
      const required = new Set(minimalRequiredRefs(scene));
      const eligibleWithoutOptional = isConversationSceneEligible(scene, {
        lessonRefs: required,
        knownRefs: required,
        isReviewLesson: true,
        allowImmersion: true,
        generatedContext: false,
      });
      if (!eligibleWithoutOptional) {
        err("pedagogy", scene.sceneId, "optionalRefs bloqueiam a elegibilidade (tratados como obrigatórios).");
      }
    }

    // ————— Módulo comunicativo inteiro sem conversa (portão beta) —————
    // Um módulo com focusChunks é comunicativo: o conjunto dos planos das suas
    // lições precisa conter pelo menos uma conversation_scene.
    const sceneByLessonId = new Map();
    for (const lesson of ALL_LESSONS) {
      const plan = lessonRoundStepsFor(lesson, { silent: true });
      sceneByLessonId.set(lesson.id, plan.some((step) => step.kind === "conversation_scene"));
    }
    for (const phase of JOURNEY) {
      for (const unit of phase.units ?? []) {
        if ((unit.focusChunks?.length ?? 0) === 0) continue;
        const hasScene = unit.lessons.some((lesson) => sceneByLessonId.get(lesson.id));
        if (!hasScene) {
          err("coverage", unit.id, `módulo comunicativo (${unit.title}) inteiro sem conversation_scene em nenhum plano.`);
        }
      }
    }

    // ————— Conversa reutilizada excessivamente (warning, não bloqueia) —————
    const overusedScenes = [...generatedUseBySceneId.entries()].filter(
      ([, count]) => count > Math.max(12, Math.round(lessonsWithGeneratedScene * 0.3))
    );
    for (const [sceneId, count] of overusedScenes) {
      console.warn(
        `⚠ conversa reutilizada excessivamente: ${sceneId} aparece em ${count}/${lessonsWithGeneratedScene} planos gerados (rotação por aluno reduz na prática).`
      );
    }

    // ————— Conversation Vocabulary Loop: cobertura reversa —————
    // Para cada cena, monta o manifesto da variante mais simples ({}) e da mais
    // rica (todos os refs disponíveis). O caminho DIRETO (acima) já garante que
    // nenhuma cena mostra vocabulário não ensinado; esta camada é o caminho
    // INVERSO: cataloga o que foi exibido e SINALIZA (sem bloquear o portão) dois
    // itens de qualidade de dados que o validador direto não pega:
    //  - texto exibido sem referência canônica standalone (ex.: 那/里 só existem
    //    dentro de chunks — não há char: dedicado): registrado como não resolvido;
    //  - ref declarado em learnedRefs/newRefs que nunca aparece no texto exibido
    //    (over-declaração).
    // Ambos viram AVISO + entram no relatório (nada é ignorado silenciosamente).
    const missingRefWarnings = [];
    const unresolvedWarnings = [];
    let manifestScenes = 0;
    let manifestItems = 0;
    for (const scene of CONVERSATION_SCENES) {
      const allRefs = new Set([
        ...scene.learnedRefs,
        ...(scene.newRefs ?? []),
        ...(scene.optionalRefs ?? []),
      ]);
      for (const variant of scene.variants ?? []) {
        for (const ref of variant.learnedRefs) allRefs.add(ref);
        for (const ref of variant.newRefs ?? []) allRefs.add(ref);
      }
      const contexts = [{}, { availableRefs: allRefs, phaseOrder: Number.MAX_SAFE_INTEGER }];
      const seenStages = new Set();
      for (const ctx of contexts) {
        const manifest = buildConversationVocabularyManifest(scene, ctx);
        if (seenStages.has(manifest.stage)) continue;
        seenStages.add(manifest.stage);
        manifestScenes += 1;
        manifestItems += manifest.items.length;
        for (const text of manifest.coverage.unresolvedTexts) {
          unresolvedWarnings.push(`${scene.sceneId} (${manifest.stage}): sem referência canônica → "${text}"`);
        }
        for (const ref of manifest.coverage.missingRefs) {
          missingRefWarnings.push(`${scene.sceneId} (${manifest.stage}): ref declarado nunca exibido → ${ref}`);
        }
      }
    }
    for (const warning of unresolvedWarnings) console.warn(`⚠ vocabulary loop (não resolvido): ${warning}`);
    for (const warning of missingRefWarnings) console.warn(`⚠ vocabulary loop (over-declaração): ${warning}`);

    // ————— Relatório —————
    const roleCounts = new Map();
    const settingCounts = new Map();
    const intents = new Map();
    let v2Count = 0;
    for (const scene of CONVERSATION_SCENES) {
      const role = sceneRoleOf(scene);
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
      settingCounts.set(scene.setting, (settingCounts.get(scene.setting) ?? 0) + 1);
      intents.set(scene.intent, (intents.get(scene.intent) ?? 0) + 1);
      if (scene.nodes?.length) v2Count += 1;
      else err("catalog", scene.sceneId, "cena do catálogo sem nós V2 (formato autoral V1 removido).");
    }
    const unusedScenes = CONVERSATION_SCENES.filter(
      (scene) => !authoredUseBySceneId.has(scene.sceneId) && !generatedUseBySceneId.has(scene.sceneId)
    );

    const lines = [
      "# Relatório de cobertura de cenas de conversa",
      "",
      ...reportProvenanceLines(rootDir, { lessonCount: ALL_LESSONS.length }),
      "## Resumo",
      "",
      "| Indicador | Valor |",
      "|-----------|------:|",
      `| Cenas no catálogo | ${CONVERSATION_SCENES.length} |`,
      `| Cenas V2 (nós/ramificação) | ${v2Count} |`,
      `| Cenas V1 autorais (sem nós) | ${CONVERSATION_SCENES.length - v2Count} |`,
      `| Fallback V1 derivado (lines/checkpoint) | ${v2Count} |`,
      `| Intenções distintas | ${intents.size} |`,
      `| Passos autorais na jornada | ${authoredCount} |`,
      `| Lições com cena gerada no plano | ${lessonsWithGeneratedScene} |`,
      `| Cenas geradas distintas | ${generatedUseBySceneId.size} |`,
      `| Cenas nunca usadas (autoral ou plano) | ${unusedScenes.length} |`,
      `| Rotação sob contexto (anti "primeira cena") | ${rotationObserved ? "OK" : rotationCandidates === 0 ? "—" : "FALHOU"} |`,
      "",
      "## Cenas por papel",
      "",
      "| Papel | Cenas |",
      "|-------|------:|",
      ...[...roleCounts.entries()].map(([role, count]) => `| ${role} | ${count} |`),
      "",
      "## Cenas por cenário",
      "",
      "| Cenário | Cenas |",
      "|---------|------:|",
      ...[...settingCounts.entries()].map(([setting, count]) => `| ${setting} | ${count} |`),
      "",
      "## Catálogo",
      "",
      "| Cena | Papel | Intenção | Falas | Intervenções | Ramificada | Conclusões | Uso autoral | Uso gerado |",
      "|------|-------|----------|------:|-------------:|-----------:|-----------:|------------:|-----------:|",
    ];
    for (const scene of CONVERSATION_SCENES) {
      const stats = conversationSceneStats(scene);
      const role = sceneRoleOf(scene);
      lines.push(
        `| ${scene.sceneId} | ${role} | ${scene.intent} | ${stats.lineCount} | ${stats.interactionCount} | ${stats.branching ? "sim" : "—"} | ${stats.endingCount} | ${authoredUseBySceneId.get(scene.sceneId) ?? 0} | ${generatedUseBySceneId.get(scene.sceneId) ?? 0} |`
      );
    }

    lines.push("", "## Cenas nunca usadas", "");
    if (unusedScenes.length === 0) {
      lines.push("Nenhuma — todas as cenas aparecem na jornada (autoral) ou em planos gerados.");
    } else {
      lines.push("| Cena | Intenção | Refs necessários |", "|------|----------|------------------|");
      for (const scene of unusedScenes) {
        lines.push(`| ${scene.sceneId} | ${scene.intent} | ${[...scene.learnedRefs, ...(scene.newRefs ?? [])].join(", ")} |`);
      }
      lines.push("", "_Cena não usada = nenhum foco de lição cobre todos os refs dela ainda; ela fica disponível para os próximos módulos._");
    }

    lines.push(
      "",
      "## Conversation Vocabulary Loop (cobertura reversa)",
      "",
      "| Indicador | Valor |",
      "|-----------|------:|",
      `| Variantes com manifesto gerado | ${manifestScenes} |`,
      `| Itens de vocabulário mapeados | ${manifestItems} |`,
      `| Textos exibidos sem referência canônica (aviso) | ${unresolvedWarnings.length} |`,
      `| Refs declarados nunca exibidos (aviso) | ${missingRefWarnings.length} |`,
      ""
    );
    if (unresolvedWarnings.length > 0) {
      lines.push(
        "### Texto exibido sem referência canônica standalone",
        "",
        "_Glifos mostrados que só existem dentro de chunks (sem `char:` dedicado). O caminho direto já garante que foram ensinados; falta um ref standalone para reúso granular em SRS._",
        ""
      );
      for (const warning of unresolvedWarnings.slice(0, 60)) lines.push(`- ${warning}`);
      if (unresolvedWarnings.length > 60) lines.push(`- …mais ${unresolvedWarnings.length - 60}.`);
      lines.push("");
    }
    if (missingRefWarnings.length > 0) {
      lines.push("### Refs declarados que não aparecem no texto exibido (over-declaração)", "");
      for (const warning of missingRefWarnings.slice(0, 60)) lines.push(`- ${warning}`);
      if (missingRefWarnings.length > 60) lines.push(`- …mais ${missingRefWarnings.length - 60}.`);
      lines.push("");
    }

    lines.push(
      "",
      "---",
      "",
      "_Falas contadas no caminho principal (entry → correctNextNodeId). Ramos de erro (wrongNextNodeId) também são validados quanto a vocabulário e alcançabilidade. O Vocabulary Loop mapeia o vocabulário realmente exibido em cada variante para reúso em atividades e revisões._",
      ""
    );

    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, finalizeReport(lines), "utf8");

    if (errors.length > 0) {
      console.error(`\nvalidate:conversation-scenes encontrou ${errors.length} problema(s):`);
      for (const item of errors.slice(0, 80)) {
        console.error(`- [${item.area}] ${item.ref}: ${item.message}`);
      }
      if (errors.length > 80) console.error(`...mais ${errors.length - 80}.`);
      process.exitCode = 1;
    } else {
      console.log(
        `OK: validate:conversation-scenes passou (${CONVERSATION_SCENES.length} cenas · ${v2Count} V2 · ${authoredCount} passos autorais · ${generatedUseBySceneId.size} cenas geradas distintas).`
      );
    }
    console.log(`Relatório: ${reportPath}`);
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
} catch (error) {
  if (process.exitCode !== 1) {
    console.error(error);
    process.exitCode = 1;
  }
}
