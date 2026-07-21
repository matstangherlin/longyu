/**
 * validate:conversation-migration
 *
 * Testes de regressão da migração V1→V2: catálogo 100% V2, fallback derivado,
 * feature flag, histórico antigo, fluxos correto/errado/repetição/abandono/fim,
 * variantes guided/independent/audio_first e Conversation Vocabulary Loop.
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

const norm = (v) =>
  String(v ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR");

/** Espelha ConversationSceneStep: V2 quando flag ligada e há nós. */
function wouldUseV2Player(step, v2Enabled) {
  return v2Enabled && (step.nodes?.length ?? 0) > 0;
}

/** Simula o grafo V2 (correto, erro, abandono). */
function simulateConversation(scene, choices = []) {
  const nodes = scene.nodes ?? [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let nodeId = scene.entryNodeId ?? nodes[0]?.id ?? "";
  let hadMistake = false;
  let interactionIndex = 0;
  const path = [];
  let transitions = 0;

  while (nodeId && byId.has(nodeId) && transitions < 60) {
    transitions += 1;
    const node = byId.get(nodeId);
    path.push(node.id);

    if (node.interaction) {
      const choice = choices[interactionIndex] ?? "correct";
      interactionIndex += 1;
      if (choice === "abandon") {
        return { finished: false, abandoned: true, hadMistake, path, interactions: interactionIndex };
      }
      if (choice === "wrong" && node.interaction.wrongNextNodeId) {
        hadMistake = true;
        nodeId = node.interaction.wrongNextNodeId;
      } else if (choice === "wrong") {
        hadMistake = true;
        return { finished: false, abandoned: false, hadMistake, path, interactions: interactionIndex };
      } else {
        nodeId = node.interaction.correctNextNodeId;
      }
    } else if (node.nextNodeId) {
      nodeId = node.nextNodeId;
    } else {
      return { finished: true, abandoned: false, hadMistake, path, interactions: interactionIndex };
    }
  }
  return { finished: true, abandoned: false, hadMistake, path, interactions: interactionIndex };
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-migration-"));
try {
  const program = ts.createProgram(
    [
      "src/data/conversationScenes.ts",
      "src/data/conversationVocabulary.ts",
      "src/data/journey.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
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
  if (program.emit().emitSkipped) {
    console.error("Falha ao compilar o grafo para validate:conversation-migration.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const flagEnabled = (value, defaultEnabled) => {
    if (value === undefined || value === "") return defaultEnabled;
    const normalized = String(value).trim().toLowerCase();
    if (["0", "false", "off", "no"].includes(normalized)) return false;
    if (["1", "true", "on", "yes"].includes(normalized)) return true;
    return defaultEnabled;
  };
  const isConversationV2Enabled = (env = {}) => flagEnabled(env.VITE_ENABLE_CONVERSATION_V2, true);
  const {
    CONVERSATION_SCENES,
    conversationSceneMainPath,
    conversationSceneStats,
    conversationVariantLevelFor,
    conversationSelectionContextFromHistory,
    isConversationSceneEligible,
    minimalRequiredRefs,
  } = load("src/data/conversationScenes.js");
  const { buildConversationVocabularyManifest } = load("src/data/conversationVocabulary.js");
  const { ALL_LESSONS } = load("src/data/journey.js");
  const { lessonRoundStepsFor, manifestFromConversationStep, applyConversationVocabularyLoop } = load(
    "src/features/lesson/lessonTasks.js"
  );

  const sample =
    CONVERSATION_SCENES.find((scene) => scene.sceneId === "primeiro-cumprimento") ?? CONVERSATION_SCENES[0];
  assert(sample, "deve existir cena de amostra no catálogo");

  // ── 1. Catálogo 100% V2 (sem cenas autorais V1) ───────────────────────────
  {
    assert(CONVERSATION_SCENES.length >= 30, "catálogo deve ter ao menos 30 cenas");
    for (const scene of CONVERSATION_SCENES) {
      assert((scene.nodes?.length ?? 0) > 0, `${scene.sceneId}: sem nós V2`);
      assert((scene.lines?.length ?? 0) > 0, `${scene.sceneId}: lines derivadas ausentes`);
      assert(scene.checkpoint?.correctAnswer, `${scene.sceneId}: checkpoint derivado ausente`);
      const main = conversationSceneMainPath(scene.nodes, scene.entryNodeId);
      assert(main.length === scene.lines.length, `${scene.sceneId}: lines divergem do caminho principal`);
      for (let i = 0; i < main.length; i += 1) {
        assert(
          main[i].hanzi === scene.lines[i].hanzi && main[i].speakerId === scene.lines[i].speakerId,
          `${scene.sceneId}: lines[${i}] não derivada do nó ${main[i].id}`
        );
      }
      const stats = conversationSceneStats(scene);
      const role = scene.sceneRole ?? "common";
      if (role === "common") {
        assert(stats.lineCount >= 6, `${scene.sceneId}: comum com <6 falas`);
        assert(stats.interactionCount >= 2, `${scene.sceneId}: comum com <2 intervenções`);
      }
      if (role !== "common") {
        assert(stats.branching || role !== "immersion", `${scene.sceneId}: imersão sem ramificação`);
      }
      const required = new Set(minimalRequiredRefs(scene));
      assert(
        isConversationSceneEligible(scene, {
          lessonRefs: required,
          knownRefs: required,
          isReviewLesson: true,
          allowImmersion: true,
          generatedContext: false,
        }),
        `${scene.sceneId}: perdeu elegibilidade após migração`
      );
    }
  }

  // ── 2. Feature flag V2 ligada / desligada ─────────────────────────────────
  {
    assert(isConversationV2Enabled({}) === true, "V2: default ligado");
    assert(isConversationV2Enabled({ VITE_ENABLE_CONVERSATION_V2: "true" }) === true, "V2: explicit true");
    assert(isConversationV2Enabled({ VITE_ENABLE_CONVERSATION_V2: "false" }) === false, "V2: rollback false");
    assert(isConversationV2Enabled({ VITE_ENABLE_CONVERSATION_V2: "0" }) === false, "V2: rollback 0");
    assert(wouldUseV2Player(sample, true) === true, "player V2 com flag ligada");
    assert(wouldUseV2Player(sample, false) === false, "player V1 com flag desligada");
    assert((sample.lines?.length ?? 0) > 0 && sample.checkpoint, "fallback V1 derivado disponível");
  }

  // ── 3. Histórico antigo (sceneIds preservados) ────────────────────────────
  {
    const legacyHistory = [
      {
        sceneId: "primeiro-cumprimento",
        intent: "greet",
        lessonId: "l1",
        completedAt: Date.now() - 86_400_000,
        result: "completed",
        attempts: 1,
      },
      {
        sceneId: "agradecer-rapido",
        intent: "thank",
        lessonId: "l2",
        completedAt: Date.now() - 43_200_000,
        result: "mistake",
        attempts: 2,
      },
    ];
    const ctx = conversationSelectionContextFromHistory(legacyHistory);
    assert(ctx.playedSceneIds?.has("primeiro-cumprimento"), "histórico antigo: cena concluída reconhecida");
    assert((ctx.intentPracticeCount?.get("greet") ?? 0) >= 1, "histórico antigo: intenção contabilizada");
    const repeatLevel = conversationVariantLevelFor(
      { sceneId: "primeiro-cumprimento", intent: "greet" },
      legacyHistory.filter((e) => e.result === "completed")
    );
    assert(repeatLevel === "assisted", `repetição sobe variante (esperado assisted, obteve ${repeatLevel})`);
  }

  // ── 4. Cena migrada no currículo ──────────────────────────────────────────
  {
    const l1 = ALL_LESSONS.find((lesson) => lesson.id === "l1");
    assert(l1, "lição l1 existe");
    const plan = lessonRoundStepsFor(l1, { silent: true });
    const conv = plan.find((step) => step.kind === "conversation_scene");
    assert(conv?.sceneId, "l1 tem conversation_scene no plano");
    const catalogScene = CONVERSATION_SCENES.find((scene) => scene.sceneId === conv.sceneId);
    assert(catalogScene?.nodes?.length, "cena do plano l1 é V2 no catálogo");
    assert(manifestFromConversationStep(conv)?.format === "v2", "plano real entrega conversa V2");
  }

  // ── 5. Resposta correta → fim da cena ─────────────────────────────────────
  {
    const stats = conversationSceneStats(sample);
    const correctChoices = Array(stats.interactionCount).fill("correct");
    const run = simulateConversation(sample, correctChoices);
    assert(run.finished && !run.abandoned, "caminho correto termina a cena");
    assert(!run.hadMistake, "caminho correto sem erro");
    assert(run.interactions === stats.interactionCount, "caminho correto passa por todas as intervenções");
  }

  // ── 6. Resposta errada → ramo de reação e continuação ─────────────────────
  {
    const branching = CONVERSATION_SCENES.find((scene) =>
      (scene.nodes ?? []).some((node) => node.interaction?.wrongNextNodeId)
    );
    assert(branching, "deve existir cena com ramo de erro");
    const stats = conversationSceneStats(branching);
    const wrongFirst = ["wrong", ...Array(Math.max(0, stats.interactionCount - 1)).fill("correct")];
    const run = simulateConversation(branching, wrongFirst);
    assert(run.hadMistake, "primeiro erro marca hadMistake");
    assert(run.finished, "ramo de erro não encerra a cena");
    assert(run.path.length > stats.lineCount, "ramo de erro percorre nós extras");
  }

  // ── 7. Repetição (variante sobe) ──────────────────────────────────────────
  {
    const history = Array.from({ length: 6 }, (_, i) => ({
      sceneId: `other-${i}`,
      intent: `intent-${i}`,
      lessonId: "syn",
      completedAt: Date.now() - i * 1000,
      result: "completed",
      attempts: 1,
    }));
    history.unshift({
      sceneId: sample.sceneId,
      intent: sample.intent,
      lessonId: "l1",
      completedAt: Date.now(),
      result: "completed",
      attempts: 1,
    });
    const level = conversationVariantLevelFor(sample, history);
    assert(level === "assisted", `repetição da mesma cena → assisted (obteve ${level})`);
    const advanced = conversationVariantLevelFor(sample, [
      ...history,
      ...Array.from({ length: 6 }, (_, i) => ({
        sceneId: `adv-${i}`,
        intent: "x",
        lessonId: "syn",
        completedAt: Date.now() - 10_000 - i,
        result: "completed",
        attempts: 1,
      })),
    ]);
    assert(
      advanced === "independent" || advanced === "audio_first",
      `aluno avançado → independent+ (obteve ${advanced})`
    );
  }

  // ── 8. Abandono (skip antes do fim) ───────────────────────────────────────
  {
    const run = simulateConversation(sample, ["abandon"]);
    assert(run.abandoned && !run.finished, "abandono interrompe antes do terminal");
    assert(run.interactions === 1, "abandono na primeira intervenção");
  }

  // ── 9. Final coerente (nó terminal alcançável) ────────────────────────────
  {
    for (const scene of CONVERSATION_SCENES) {
      const stats = conversationSceneStats(scene);
      assert(stats.endingCount >= 1, `${scene.sceneId}: sem nó terminal`);
      const run = simulateConversation(scene, Array(stats.interactionCount).fill("correct"));
      assert(run.finished, `${scene.sceneId}: caminho principal não termina`);
    }
  }

  // ── 10. Variantes guided / independent / audio_first ──────────────────────
  {
    assert(conversationVariantLevelFor(sample, []) === "guided", "aluno novo → guided");
    const independentHistory = Array.from({ length: 12 }, (_, i) => ({
      sceneId: `hist-${i}`,
      intent: "misc",
      lessonId: "syn",
      completedAt: Date.now() - i,
      result: "completed",
      attempts: 1,
    }));
    const indep = conversationVariantLevelFor(sample, independentHistory);
    assert(indep === "independent" || indep === "audio_first", `avançado → independent+ (obteve ${indep})`);
    const audioFirstHistory = [
      ...independentHistory,
      { sceneId: sample.sceneId, intent: sample.intent, lessonId: "l1", completedAt: Date.now(), result: "completed", attempts: 1 },
      { sceneId: sample.sceneId, intent: sample.intent, lessonId: "l1", completedAt: Date.now() - 1, result: "completed", attempts: 1 },
      { sceneId: sample.sceneId, intent: sample.intent, lessonId: "l1", completedAt: Date.now() - 2, result: "completed", attempts: 1 },
    ];
    assert(conversationVariantLevelFor(sample, audioFirstHistory) === "audio_first", "muitas repetições → audio_first");
  }

  // ── 11. Conversation Vocabulary Loop no plano ─────────────────────────────
  {
    const lesson = ALL_LESSONS.find((l) => {
      const plan = lessonRoundStepsFor(l, { silent: true });
      return plan.some((s) => s.conversationDerived);
    });
    assert(lesson, "deve existir lição com derivadas do loop");
    const plan = lessonRoundStepsFor(lesson, { silent: true });
    const convIndex = plan.findIndex((s) => s.kind === "conversation_scene");
    assert(convIndex >= 0, "lição com loop tem conversa");
    const derived = plan.filter((s) => s.conversationDerived);
    assert(derived.length > 0, "loop gera tarefas derivadas");
    for (const step of derived) {
      assert(step.conversationSourceSceneId, "derivada referencia cena de origem");
      const ci = plan.findIndex((s) => s.kind === "conversation_scene" && s.sceneId === step.conversationSourceSceneId);
      assert(ci >= 0 && plan.indexOf(step) > ci, "derivada vem depois da conversa");
    }
    const conv = plan[convIndex];
    const m = manifestFromConversationStep(conv);
    assert(m && m.format === "v2", "loop processa manifesto V2");
    const focus = (m.items ?? [])
      .filter((it) => it.resolved)
      .slice(0, 2)
      .map((it) => {
        const [type, itemId] = it.ref.split(":");
        return { key: it.ref, hanzi: it.text ?? "", meaningPt: "x", type, itemId };
      });
    const looped = applyConversationVocabularyLoop([conv], { id: "syn", title: "syn", steps: [] }, {
      focus,
      reviewFocus: [],
      errorFocus: [],
      phaseOrder: 99,
    });
    assert(looped.some((s) => s.conversationDerived), "applyConversationVocabularyLoop insere derivadas");
  }

  // ── 12. Manifesto V2 cobre ramo de erro e fallback V1 ─────────────────────
  {
    const m = buildConversationVocabularyManifest(sample);
    assert(m.format === "v2", "manifesto real é V2");
    const v1Fallback = {
      ...sample,
      nodes: undefined,
      entryNodeId: undefined,
    };
    const m1 = buildConversationVocabularyManifest(v1Fallback);
    assert(m1.format === "v1", "fallback sem nós ainda gera manifesto V1");
    assert(m1.items.length > 0, "fallback V1 extrai vocabulário das lines");
  }

  if (errors.length > 0) {
    console.error("ERRO: validate:conversation-migration falhou.");
    for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
    if (errors.length > 40) console.error(`  ...mais ${errors.length - 40}.`);
    process.exit(1);
  }
  console.log(
    `OK: validate:conversation-migration passou (${CONVERSATION_SCENES.length} cenas · flag · histórico · fluxos · variantes · loop).`
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
}
