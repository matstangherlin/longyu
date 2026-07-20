/**
 * test:conversation-loop
 *
 * Testa que o Conversation Vocabulary Loop ALTERA o plano real (lessonRoundStepsFor):
 * lição comum, revisão, imersão; conversa sem/uma novidade; conversa com erro;
 * cena V1 e V2; variante beginner; plano perto do limite; substituição de
 * exercício superficial (crescimento limitado); preservação da ordem pedagógica.
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
const fail = (m) => errors.push(m);
const assert = (c, m) => {
  if (!c) fail(m);
};

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-loop-test-"));
try {
  const program = ts.createProgram(
    [
      "src/features/lesson/lessonTasks.ts",
      "src/data/conversationVocabulary.ts",
      "src/data/conversationScenes.ts",
      "src/data/journey.ts",
      "src/data/characters.ts",
      "src/data/chunks.ts",
      "src/data/types.ts",
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
  if (program.emit().emitSkipped) {
    console.error("emit skipped");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const { lessonRoundStepsFor, applyConversationVocabularyLoop, manifestFromConversationStep } = load(
    "src/features/lesson/lessonTasks.js"
  );
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { CONVERSATION_SCENES } = load("src/data/conversationScenes.js");

  const isImmersion = (lesson) => /imers|immersion/i.test(`${lesson.id} ${lesson.title}`);
  const planOf = (lesson, ctx = {}) => lessonRoundStepsFor(lesson, { silent: true, ...ctx });
  const firstConvIndex = (plan) => plan.findIndex((s) => s.kind === "conversation_scene");
  const derivedOf = (plan) => plan.filter((s) => s.conversationDerived);

  const lessonsWithConv = ALL_LESSONS.filter((l) => firstConvIndex(planOf(l)) >= 0);
  assert(lessonsWithConv.length > 0, "deve haver lições com conversa");

  // ── A ligação altera o plano REAL: há tarefas derivadas com metadados. ─────
  {
    let withDerived = 0;
    for (const lesson of lessonsWithConv) {
      const plan = planOf(lesson);
      const derived = derivedOf(plan);
      if (derived.length === 0) continue;
      withDerived += 1;
      for (const step of derived) {
        assert(step.conversationSourceSceneId, `derivada sem sceneId de origem (${lesson.id})`);
        assert(step.conversationCoveredRef, `derivada sem ref coberto (${lesson.id})`);
        assert(step.conversationModality === step.kind, `modalidade != kind (${lesson.id})`);
        assert(typeof step.conversationExposureNumber === "number", `exposição ausente (${lesson.id})`);
        assert(["error", "rule"].includes(step.conversationDerivedReason), `motivo inválido (${lesson.id})`);
      }
    }
    assert(withDerived > 20, `esperava muitas lições com derivadas, obteve ${withDerived}`);
  }

  // ── (8 + ordem pedagógica) toda derivada aparece DEPOIS da sua conversa. ───
  for (const lesson of lessonsWithConv) {
    const plan = planOf(lesson);
    const convIndexByScene = new Map();
    plan.forEach((s, i) => {
      if (s.kind === "conversation_scene" && s.sceneId && !convIndexByScene.has(s.sceneId)) convIndexByScene.set(s.sceneId, i);
    });
    plan.forEach((s, i) => {
      if (!s.conversationDerived) return;
      const ci = convIndexByScene.get(s.conversationSourceSceneId);
      assert(ci == null || i > ci, `derivada antes da conversa em ${lesson.id}`);
    });
  }

  // ── Tipos de lição: comum, revisão, imersão têm derivadas. ─────────────────
  {
    const common = lessonsWithConv.find((l) => !l.isReview && !isImmersion(l) && derivedOf(planOf(l)).length > 0);
    const review = lessonsWithConv.find((l) => l.isReview && derivedOf(planOf(l)).length > 0);
    const immersion = lessonsWithConv.find((l) => isImmersion(l) && derivedOf(planOf(l)).length > 0);
    assert(common, "lição comum com derivadas");
    assert(review, "revisão de módulo com derivadas");
    assert(immersion, "imersão com derivadas");
  }

  // ── Cena V1 e V2 ambas geram manifesto + derivadas em algum plano. ─────────
  {
    let v1 = false;
    let v2 = false;
    for (const lesson of lessonsWithConv) {
      const plan = planOf(lesson);
      for (const step of plan) {
        if (step.kind !== "conversation_scene") continue;
        const m = manifestFromConversationStep(step);
        if (!m) continue;
        if (m.format === "v1") v1 = true;
        if (m.format === "v2") v2 = true;
      }
    }
    assert(v1, "alguma conversa V1 processada");
    assert(v2, "alguma conversa V2 processada");
  }

  // ── Conversa com uma novidade: item novo tem >= 2 tarefas posteriores. ─────
  {
    let checkedNew = false;
    for (const lesson of ALL_LESSONS) {
      if (lesson.isReview || isImmersion(lesson)) continue;
      const plan = planOf(lesson);
      const ci = firstConvIndex(plan);
      if (ci < 0) continue;
      const conv = plan[ci];
      const m = manifestFromConversationStep(conv);
      if (!m) continue;
      const newItems = m.items.filter((it) => it.resolved && it.roles.includes("new"));
      if (newItems.length === 0) continue;
      const later = plan.slice(ci + 1);
      for (const item of newItems) {
        const needle = String(item.text ?? "");
        const covering = later.filter((s) => {
          const blob = [s.hanzi, s.correctAnswer, s.answer, ...(s.options ?? []), ...(s.bank ?? [])].filter(Boolean).join("");
          return blob.includes(needle) || s.conversationCoveredRef === item.ref;
        });
        assert(covering.length >= 2, `novo ${item.ref} com <2 exposições em ${lesson.id}`);
        checkedNew = true;
      }
      if (checkedNew) break;
    }
    assert(checkedNew, "deve haver ao menos uma conversa comum com novidade testada");
  }

  // ── Conversa sem novidade: ainda assim há reúso do vocabulário antigo. ─────
  {
    const lesson = ALL_LESSONS.find((l) => {
      const plan = planOf(l);
      const ci = firstConvIndex(plan);
      if (ci < 0) return false;
      const m = manifestFromConversationStep(plan[ci]);
      return m && m.items.every((it) => !it.roles.includes("new")) && derivedOf(plan).length > 0;
    });
    assert(lesson, "conversa sem novidade ainda gera reúso");
  }

  // ── Modalidade não pode ser toda igual entre as derivadas de uma conversa. ─
  for (const lesson of lessonsWithConv) {
    const plan = planOf(lesson);
    const bySceneId = new Map();
    for (const s of plan) {
      if (!s.conversationDerived) continue;
      const list = bySceneId.get(s.conversationSourceSceneId) ?? [];
      list.push(s);
      bySceneId.set(s.conversationSourceSceneId, list);
    }
    for (const [sceneId, list] of bySceneId) {
      if (list.length >= 2) {
        const kinds = new Set(list.map((s) => s.kind));
        assert(kinds.size >= 2, `todas as derivadas de ${sceneId} iguais em ${lesson.id}`);
      }
    }
  }

  // ── Conversa com erro: recentErrors marca a derivada como "error". ─────────
  {
    // Acha uma lição comum cuja conversa mostra um chunk; erra esse chunk.
    let tested = false;
    for (const lesson of ALL_LESSONS) {
      if (lesson.isReview || isImmersion(lesson)) continue;
      const plan = planOf(lesson);
      const ci = firstConvIndex(plan);
      if (ci < 0) continue;
      const m = manifestFromConversationStep(plan[ci]);
      const chunkItem = m?.items.find((it) => it.resolved && it.ref.startsWith("chunk:") && !it.roles.includes("new"));
      if (!chunkItem) continue;
      const itemId = chunkItem.ref.split(":")[1];
      const withError = planOf(lesson, {
        recentErrors: [
          { hanzi: chunkItem.text, correctAnswer: chunkItem.text, targets: [{ type: "chunk", itemId }] },
        ],
      });
      const errorDerived = withError.filter((s) => s.conversationDerived && s.conversationDerivedReason === "error");
      if (errorDerived.length > 0) {
        tested = true;
        break;
      }
    }
    assert(tested, "conversa com erro deve marcar alguma derivada como reason=error");
  }

  // ── Variante beginner: manifesto e derivadas usam o vocabulário da beginner. ─
  {
    const scene = CONVERSATION_SCENES.find((s) => (s.variants ?? []).some((v) => v.stage === "beginner"));
    assert(scene, "deve existir cena com variante beginner");
    if (scene) {
      const beginner = scene.variants.find((v) => v.stage === "beginner");
      const step = {
        kind: "conversation_scene",
        sceneId: scene.sceneId,
        setting: scene.setting,
        characters: scene.characters,
        lines: [],
        nodes: beginner.nodes,
        entryNodeId: beginner.entryNodeId,
        learnedRefs: beginner.learnedRefs,
        newRefs: beginner.newRefs,
        sceneIntent: scene.intent,
        lessonStageId: "usage",
      };
      const m = manifestFromConversationStep(step);
      assert(m && m.stage === "beginner", "manifesto deve resolver a variante beginner");
      // Loop sobre um plano mínimo: a conversa + espaço para derivadas.
      const focus = beginner.learnedRefs.map((ref) => {
        const [type, itemId] = ref.split(":");
        return { key: ref, hanzi: m.items.find((i) => i.ref === ref)?.text ?? "", meaningPt: "x", type, itemId };
      });
      const plan = applyConversationVocabularyLoop([step], { id: "syn", title: "syn", steps: [] }, {
        focus,
        reviewFocus: [],
        errorFocus: [],
        phaseOrder: 99,
      });
      const derived = plan.filter((s) => s.conversationDerived);
      assert(derived.length > 0, "variante beginner deve gerar derivadas");
      for (const s of derived) {
        assert(beginner.learnedRefs.includes(s.conversationCoveredRef) || (beginner.newRefs ?? []).includes(s.conversationCoveredRef),
          `derivada da beginner cobre ref fora da variante: ${s.conversationCoveredRef}`);
      }
    }
  }

  // ── Crescimento limitado (perto do limite / substituição): nunca explode. ──
  for (const lesson of lessonsWithConv) {
    const derived = derivedOf(planOf(lesson));
    const cap = isImmersion(lesson) ? 14 : lesson.isReview ? 14 : 8;
    assert(derived.length <= cap, `crescimento acima do orçamento em ${lesson.id}: ${derived.length} > ${cap}`);
  }

  if (errors.length > 0) {
    console.error("ERRO: test:conversation-loop falhou.");
    for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("OK: test:conversation-loop passou (comum/revisão/imersão · V1/V2 · novo/antigo/erro · beginner · ordem · limite).");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
