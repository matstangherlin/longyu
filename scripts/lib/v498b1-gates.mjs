/**
 * V4.9.8B.1 — lexical bridge, production scaffolding, hanzi-fill integration.
 */
import fs from "node:fs";
import path from "node:path";
import { finalizeReport, reportProvenanceLines } from "./report-meta.mjs";

const CJK = /[\u3400-\u9fff]/u;
const PUNCT = /[，。！？、,.!?\s]/g;
const TEACH_KINDS = new Set([
  "listen",
  "flashcard",
  "recognize",
  "image_choice",
  "intro",
  "sentence_build",
  "fill_blank",
  "hanzi_build",
  "match_pairs",
  "comprehend",
  "sign_reading",
  "place_label",
  "listen_select",
]);
const RETRIEVAL_KINDS = new Set(["fill_blank", "sentence_build", "hanzi_build", "dictation", "reverse_recall"]);
const OPEN_KINDS = new Set(["free_production", "produce"]);
const SURVIVAL_SCENE_IDS = new Set([
  "pedir-cardapio",
  "imersao-restaurante",
  "revisao-restaurante",
  "comprar-itens",
  "conversa-na-loja",
  "imersao-mercado",
  "pegar-taxi",
  "imersao-estacao",
  "checkin-hotel",
  "no-aeroporto",
]);
const HIGH_VALUE = [
  {
    id: "zheshiwodehuzhao",
    phrase: "这是我的护照",
    transferScene: "no-aeroporto",
    firstScene: "checkin-hotel",
  },
  { id: "woyouyuding", phrase: "我有预订", firstScene: "checkin-hotel" },
  { id: "wodefangjianzainali", phrase: "我的房间在哪里", firstScene: "checkin-hotel" },
  { id: "dengjikouzainali", phrase: "登机口在哪里", firstScene: "no-aeroporto" },
];

export function cleanHanzi(value) {
  return String(value ?? "").replace(PUNCT, "").trim();
}

function glyphsOf(value) {
  return [...String(value ?? "")].filter((ch) => CJK.test(ch));
}

function stepTeachBlob(step) {
  return [
    step.text,
    step.hanzi,
    step.audioText,
    step.correctAnswer,
    step.answer,
    step.blankAnswer,
    ...(step.targetParts ?? []),
    step.targetHanzi,
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ]
    .filter(Boolean)
    .join("");
}

function chunkById(chunks, id) {
  return (chunks ?? []).find((item) => item.id === id);
}

function charById(characters, id) {
  return (characters ?? []).find((item) => item.id === id);
}

function refHanzi(ref, chunks, characters) {
  if (ref.startsWith("chunk:")) return chunkById(chunks, ref.slice(6))?.hanzi ?? "";
  if (ref.startsWith("char:")) return charById(characters, ref.slice(5))?.hanzi ?? "";
  return "";
}

function teachRefsFromStep(step, chunks, characters) {
  const refs = new Set();
  if (!TEACH_KINDS.has(step.kind)) return refs;
  if (step.chunkId) refs.add(`chunk:${step.chunkId}`);
  if (step.charId) refs.add(`char:${step.charId}`);
  const blob = cleanHanzi(stepTeachBlob(step));
  for (const chunk of chunks ?? []) {
    const hanzi = cleanHanzi(chunk.hanzi);
    if (hanzi && blob.includes(hanzi)) refs.add(`chunk:${chunk.id}`);
  }
  for (const character of characters ?? []) {
    if (character.hanzi && blob.includes(character.hanzi)) refs.add(`char:${character.id}`);
  }
  return refs;
}

function conversationNodes(scene) {
  return scene.nodes ?? [];
}

export function validateConversationLexicalBridge(data) {
  const failures = [];
  const rows = [];
  const globalGaps = [];
  const fail = (code, message) => failures.push({ code, message });
  const { lessons = [], scenes = [], chunks = [], characters = [] } = data;
  const taught = new Set();
  const firstTeach = new Map();

  for (const lesson of lessons) {
    const steps = lesson.steps ?? [];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (step.kind === "conversation_scene") {
        const scene = scenes.find((item) => item.sceneId === step.sceneId) ?? step;
        const learned = scene.learnedRefs ?? step.learnedRefs ?? [];
        const news = scene.newRefs ?? step.newRefs ?? [];
        const blocking = SURVIVAL_SCENE_IDS.has(step.sceneId);
        for (const ref of learned) {
          const ok = taught.has(ref) || teachRefsFromStep(step, chunks, characters).has(ref);
          if (!ok) {
            const message = `${lesson.id}/${step.sceneId}: learnedRef ${ref} never taught before conversation`;
            if (blocking) fail("LEXICAL_GAP", message);
            else globalGaps.push({ code: "LEXICAL_GAP", message, sceneId: step.sceneId, ref });
          }
          const teachLesson = firstTeach.get(ref) ?? "(none)";
          rows.push({
            sceneId: step.sceneId,
            ref,
            role: "learned",
            teachLesson,
            conversationLesson: lesson.id,
            status: ok ? "PASS" : blocking ? "FAIL" : "GLOBAL_GAP",
          });
        }
        for (const ref of news) {
          const prior = taught.has(ref);
          const sameLessonTeach = steps.slice(0, index).some((item) => teachRefsFromStep(item, chunks, characters).has(ref));
          const ok = prior || sameLessonTeach;
          if (!ok) {
            const message = `${lesson.id}/${step.sceneId}: newRef ${ref} appears only in dialogue`;
            if (blocking) fail("NEW_REF_NO_TEACH", message);
            else globalGaps.push({ code: "NEW_REF_NO_TEACH", message, sceneId: step.sceneId, ref });
          }
          rows.push({
            sceneId: step.sceneId,
            ref,
            role: "new",
            teachLesson: firstTeach.get(ref) ?? lesson.id,
            conversationLesson: lesson.id,
            status: ok ? "PASS" : blocking ? "FAIL" : "GLOBAL_GAP",
          });
        }
        continue;
      }
      for (const ref of teachRefsFromStep(step, chunks, characters)) {
        if (!taught.has(ref)) firstTeach.set(ref, lesson.id);
        taught.add(ref);
      }
    }
  }

  return { failures, rows, globalGaps };
}

function phraseHits(step, phrase) {
  const blob = cleanHanzi(
    [
      step.correctAnswer,
      step.answer,
      step.blankAnswer,
      ...(step.targetParts ?? []),
      step.text,
      step.hanzi,
    ]
      .filter(Boolean)
      .join("")
  );
  return blob.includes(cleanHanzi(phrase));
}

function firstIndex(steps, predicate) {
  return steps.findIndex(predicate);
}

export function validateProductionScaffolding(data) {
  const failures = [];
  const rows = [];
  const fail = (code, message) => failures.push({ code, message });
  const { lessons = [], scenes = [], conversationPlayerSource = "" } = data;

  if (!/evaluateLearnerResponse/.test(conversationPlayerSource)) {
    fail("EVALUATOR", "conversation produce_reply must use evaluateLearnerResponse");
  }
  if (!/data-conversation-build-bank/.test(conversationPlayerSource)) {
    fail("SCAFFOLD_UI", "guided produce_reply must expose phrase-piece bank");
  }
  if (!/data-conversation-help-request/.test(conversationPlayerSource)) {
    fail("HELP_UI", "independent produce_reply must expose progressive help");
  }
  if (!/micOnly/.test(conversationPlayerSource) || !/FreeAnswerField/.test(conversationPlayerSource)) {
    fail("SPEAKING", "speaking must remain available when phrase pieces appear");
  }
  if (!/nextConversationHelpLevel/.test(conversationPlayerSource)) {
    fail("PROGRESSIVE_HELP", "first help must not jump to full pieces");
  }

  for (const item of HIGH_VALUE) {
    let teachLesson = null;
    let guidedLesson = null;
    let openLesson = null;
    for (const lesson of lessons) {
      const steps = lesson.steps ?? [];
      const teachAt = firstIndex(
        steps,
        (step) =>
          (step.kind === "listen" && cleanHanzi(step.text).includes(cleanHanzi(item.phrase))) ||
          (step.kind === "flashcard" && step.chunkId === item.id) ||
          (step.kind === "listen" && cleanHanzi(step.text) === cleanHanzi(item.phrase.split("？")[0]))
      );
      const guidedAt = firstIndex(
        steps,
        (step) =>
          (step.kind === "fill_blank" || step.kind === "sentence_build") && phraseHits(step, item.phrase)
      );
      const openAt = firstIndex(
        steps,
        (step) =>
          (OPEN_KINDS.has(step.kind) && step.productionOpen && phraseHits(step, item.phrase)) ||
          (step.kind === "conversation_scene" && step.sceneId === item.firstScene)
      );
      if (teachAt >= 0 && !teachLesson) teachLesson = lesson.id;
      if (guidedAt >= 0 && !guidedLesson) guidedLesson = lesson.id;
      if (openAt >= 0 && !openLesson) openLesson = { id: lesson.id, index: openAt, teachAt, guidedAt };
    }

    if (!teachLesson) fail("NO_TEACH", `${item.phrase}: no acquisition lesson`);
    if (!guidedLesson) fail("NO_GUIDED", `${item.phrase}: TEACH → OPEN without fill/build rung`);
    if (openLesson && teachLesson === openLesson.id && (openLesson.guidedAt < 0 || openLesson.guidedAt > openLesson.index)) {
      fail("TEACH_TO_OPEN", `${item.phrase}: open production before guided rung in ${openLesson.id}`);
    }

    const firstScene = scenes.find((scene) => scene.sceneId === item.firstScene);
    const transferScene = item.transferScene ? scenes.find((scene) => scene.sceneId === item.transferScene) : null;
    const firstProduce = conversationNodes(firstScene ?? {}).find(
      (node) => node.interaction?.type === "produce_reply" && cleanHanzi(node.interaction.correctAnswer).includes(cleanHanzi(item.phrase))
    );
    if (item.firstScene === "checkin-hotel" && firstProduce) {
      if (firstProduce.interaction.productionScaffold !== "first") {
        fail("GUIDED_CONTRACT", `${item.phrase}: hotel produce_reply must be first-use scaffold`);
      }
      if (!(firstProduce.interaction.productionHelpBuildBank ?? []).length) {
        fail("GUIDED_CONTRACT", `${item.phrase}: hotel guided produce_reply missing phrase bank`);
      }
    }
    if (transferScene && item.transferScene === "no-aeroporto" && item.id === "zheshiwodehuzhao") {
      const transferProduce = conversationNodes(transferScene).find(
        (node) => node.interaction?.type === "produce_reply" && cleanHanzi(node.interaction.correctAnswer).includes("这是我的护照")
      );
      if (!transferProduce) fail("TRANSFER", "airport passport produce_reply missing");
      else {
        if (transferProduce.interaction.productionScaffold !== "transfer") {
          fail("OVER_SCAFFOLD", "airport passport must be marked transfer, not a mandatory full bank");
        }
        if ((transferProduce.interaction.options ?? []).length) {
          fail("OVER_SCAFFOLD", "airport passport transfer still has multiple-choice options");
        }
      }
      const airport = lessons.find((lesson) => lesson.id === "p7-imersao-aeroporto");
      const reflash = (airport?.steps ?? []).some((step) => step.kind === "flashcard" && step.chunkId === "huzhao");
      if (reflash) fail("LEXICAL_NOVELTY", "airport re-teaches 护照 as acquisition");
    }

    rows.push({
      phrase: item.phrase,
      teach: teachLesson,
      guided: guidedLesson,
      open: openLesson?.id ?? item.firstScene,
      transfer: item.transferScene ?? "—",
      status: failures.some((failure) => failure.message.includes(item.phrase)) ? "FAIL" : "PASS",
    });
  }

  return { failures, rows };
}

export function validateHanziFillIntegration(data) {
  const failures = [];
  const lessonRows = [];
  const fail = (code, message) => failures.push({ code, message });
  const { lessons = [], hanziMemoryTargets = [], chunks = [], characters = [] } = data;

  function retrievalHits(step, glyph) {
    if (!RETRIEVAL_KINDS.has(step.kind)) return false;
    if (step.kind === "fill_blank") return String(step.blankAnswer ?? "").includes(glyph);
    if (step.kind === "sentence_build" || step.kind === "hanzi_build") {
      return (step.targetParts ?? []).join("").includes(glyph) || String(step.correctAnswer ?? "").includes(glyph);
    }
    return String(step.answer ?? step.correctAnswer ?? "").includes(glyph);
  }

  for (const target of hanziMemoryTargets) {
    const moments = [];
    for (const lesson of lessons) {
      for (const step of lesson.steps ?? []) {
        if (retrievalHits(step, target.glyph)) moments.push({ lessonId: lesson.id, kind: step.kind });
      }
    }
    if (moments.length === 0) {
      fail("HANZI_CORE_RETRIEVAL", `${target.glyph}: CORE never receives active retrieval`);
    }
    const intro = lessons.find((lesson) => lesson.id === target.introduceLessonId);
    const introSteps = intro?.steps ?? [];
    const teachAt = introSteps.findIndex((step) => TEACH_KINDS.has(step.kind) && stepTeachBlob(step).includes(target.glyph));
    const testAt = introSteps.findIndex((step) => retrievalHits(step, target.glyph) || OPEN_KINDS.has(step.kind));
    if (testAt >= 0 && (teachAt < 0 || teachAt >= testAt)) {
      fail("TEACH_BEFORE_TEST", `${target.glyph}: retrieval before presentation in ${target.introduceLessonId}`);
    }
  }

  for (const lesson of lessons) {
    const steps = lesson.steps ?? [];
    const fill = steps.filter((step) => step.kind === "fill_blank").length;
    const build = steps.filter((step) => step.kind === "sentence_build").length;
    const hanziBuild = steps.filter((step) => step.kind === "hanzi_build").length;
    const delayed = steps.filter((step) => step.kind === "reverse_recall" || step.kind === "dictation").length;
    const core = lesson.hanziMemoryTargets ?? [];
    const newHanzi = lesson.newHanzi ?? [];
    const eligible = core.length > 0 || newHanzi.some((glyph) => hanziMemoryTargets.some((target) => target.glyph === glyph));
    let klass = "NOT_ELIGIBLE";
    if (eligible) klass = fill + build + hanziBuild + delayed > 0 ? "ENOUGH" : "UNDERUSED";
    lessonRows.push({
      lessonId: lesson.id,
      newHanzi: newHanzi.join(""),
      core: core.join(""),
      fill,
      sentence_build: build,
      hanzi_build: hanziBuild,
      delayed,
      klass,
    });
    for (const step of steps) {
      if (step.kind !== "fill_blank" || !step.audioText) continue;
      const leakBlob = `${step.title ?? ""}${step.prompt ?? ""}${step.sentenceBefore ?? ""}${step.sentenceAfter ?? ""}`;
      if (String(step.blankAnswer ?? "") && leakBlob.includes(step.blankAnswer)) {
        fail("TARGET_LEAK", `${lesson.id}: audio fill leaks ${step.blankAnswer} in the prompt`);
      }
      if (cleanHanzi(step.audioText) && leakBlob.includes(step.audioText)) {
        fail("LISTENING", `${lesson.id}: audio fill shows target hànzì before listening`);
      }
    }
  }

  void chunks;
  void characters;
  return { failures, lessonRows };
}

export function classifyConversationScenes(data) {
  const { scenes = [], lessons = [] } = data;
  return (scenes ?? []).map((scene) => {
    const produces = conversationNodes(scene).filter((node) => node.interaction?.type === "produce_reply");
    if (!produces.length) return { sceneId: scene.sceneId, klass: "N/A" };
    const hosted = lessons.filter((lesson) => (lesson.steps ?? []).some((step) => step.sceneId === scene.sceneId));
    const first = produces[0]?.interaction;
    if (first?.productionScaffold === "transfer") return { sceneId: scene.sceneId, klass: "GOOD_INDEPENDENT", hosted: hosted.map((item) => item.id) };
    if (first?.productionScaffold === "first" && (first.productionHelpBuildBank ?? []).length) {
      return { sceneId: scene.sceneId, klass: "NEEDS_GUIDED_PREDECESSOR", hosted: hosted.map((item) => item.id) };
    }
    if (SURVIVAL_SCENE_IDS.has(scene.sceneId)) return { sceneId: scene.sceneId, klass: "NEEDS_BUILD_STEP", hosted: hosted.map((item) => item.id) };
    return { sceneId: scene.sceneId, klass: "GOOD_INDEPENDENT", hosted: hosted.map((item) => item.id) };
  });
}

export function writeBridgeReport(rootDir, result) {
  const survivalRows = result.rows.filter((row) => SURVIVAL_SCENE_IDS.has(row.sceneId));
  const globalGapRows = result.rows.filter((row) => row.status === "GLOBAL_GAP");
  const lines = [
    "# Conversation lexical bridge",
    "",
    ...reportProvenanceLines(rootDir, { lessonCount: result.lessonCount ?? 0 }),
    "## Contrato",
    "",
    "CONVERSATION REF → acquisition lesson → recognition → guided use → conversation.",
    "",
    "Uma fala de NPC não conta como ensino.",
    "",
    "Nesta remessa o gate **bloqueia** só China Survival (restaurante, compras, mobilidade, hotel, aeroporto).",
    "Lacunas globais de arcos anteriores entram no relatório e não reescrevem o currículo inteiro.",
    "",
    "## China Survival",
    "",
    "| Cena | Ref | Papel | Teach | Conversa | Resultado |",
    "|------|-----|-------|-------|----------|-----------|",
    ...survivalRows.map(
      (row) => `| ${row.sceneId} | ${row.ref} | ${row.role} | ${row.teachLesson} | ${row.conversationLesson} | ${row.status} |`
    ),
    "",
    "## Lacunas globais (não bloqueantes)",
    "",
    ...(globalGapRows.length
      ? [
          "| Cena | Ref | Teach | Conversa |",
          "|------|-----|-------|----------|",
          ...globalGapRows.map(
            (row) => `| ${row.sceneId} | ${row.ref} | ${row.teachLesson} | ${row.conversationLesson} |`
          ),
        ]
      : ["Nenhuma."]),
    "",
  ];
  const out = path.join(rootDir, "docs/reports/conversation-lexical-bridge.md");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, finalizeReport(lines));
  return out;
}
