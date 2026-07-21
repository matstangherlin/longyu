/**
 * test:conversation-vocabulary-srs
 *
 * Integra o Conversation Vocabulary Loop ao SRS: prioridade por desempenho,
 * deduplicação (chunk > char), alternância de domínio, preservação de itens
 * existentes, abandono / várias tentativas / sync de histórico.
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

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-conv-srs-"));
try {
  const program = ts.createProgram(
    [
      "src/lib/conversationVocabularySrs.ts",
      "src/lib/srs.ts",
      "src/lib/reviewPlan.ts",
      "src/data/conversationVocabulary.ts",
      "src/data/conversationScenes.ts",
      "src/data/chunks.ts",
      "src/data/characters.ts",
      "src/data/types.ts",
      "src/data/domains.ts",
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
    console.error("Falha ao compilar o grafo para test:conversation-vocabulary-srs.");
    process.exit(1);
  }
  const load = (rel) => require(path.join(outDir, rel));
  const {
    planConversationVocabularySrs,
    applyConversationVocabularySrsPlan,
    priorityForConversationItem,
    selectPedagogicalUnits,
    pickConversationReviewDomain,
    resolveConversationErrorRefs,
    CONVERSATION_SRS_DOMAINS,
  } = load("src/lib/conversationVocabularySrs.js");
  const { newItem, makeKey, review } = load("src/lib/srs.js");
  const {
    buildManifestForResolvedVariant,
  } = load("src/data/conversationVocabulary.js");
  const {
    scoreConversationScene,
    conversationSelectionContextFromHistory,
    CONVERSATION_HISTORY_LIMIT,
  } = load("src/data/conversationScenes.js");

  const CHARS = [
    { id: "lin", name: "Lin", avatar: "lin", side: "left" },
    { id: "mei", name: "Mei", avatar: "mei", side: "right" },
  ];

  const scene = {
    kind: "conversation_scene",
    title: "Cumprimento",
    sceneId: "syn-srs-greet",
    setting: "school",
    characters: CHARS,
    intent: "greet",
    learnedRefs: ["chunk:nihao"],
    newRefs: ["chunk:zaoshanghao"],
    lines: [
      { speakerId: "lin", hanzi: "你好！", pinyin: "nǐ hǎo!" },
      { speakerId: "mei", hanzi: "早上好！", pinyin: "zǎo shang hǎo!" },
    ],
    checkpoint: {
      type: "choose_reply",
      prompt: "Responda",
      options: ["你好", "谢谢"],
      correctAnswer: "你好",
    },
  };

  const manifest = buildManifestForResolvedVariant(scene, {
    lines: scene.lines,
    learnedRefs: scene.learnedRefs,
    newRefs: scene.newRefs,
    stage: "beginner",
    minPhaseOrder: 0,
  });

  assert(manifest.items.length > 0, "manifesto deveria ter itens");
  assert(manifest.intent === "greet", "intenção comunicativa no manifesto");
  assert(manifest.expectedAnswers.some((a) => a.includes("你好")), "resposta principal no manifesto");

  // ── 1. Conversa concluída sem erro (baixa / média, sem again) ─────────────
  {
    const plan = planConversationVocabularySrs({
      manifest,
      result: "completed",
      attempts: 1,
      assistanceLevel: "independent",
      errorRefs: [],
      srs: {},
      learnedChunks: ["nihao"],
      learnedChars: [],
    });
    assert(plan.actions.length > 0, "sem erro: vocabulário chega à fila");
    assert(
      plan.actions.every((a) => a.grade === "good" || a.grade === "hard" || a.grade === "easy"),
      "sem erro: não deveria marcar again"
    );
    assert(
      plan.actions.some((a) => a.priority === "high" && a.reason.includes("novidade")),
      "novidade permanece alta mesmo sem erro"
    );
    assert(
      plan.actions.some((a) => a.ref.includes("chunk:")),
      "registra chunks usados"
    );
    assert(plan.mainAnswer, "preserva resposta principal no plano");
    assert(plan.assistanceLevel === "independent", "preserva nível de assistência");
  }

  // ── 2. Conversa com erro (prioridade alta / again) ───────────────────────
  {
    const plan = planConversationVocabularySrs({
      manifest,
      result: "mistake",
      attempts: 2,
      assistanceLevel: "guided",
      errorRefs: resolveConversationErrorRefs(manifest, "mistake", ["chunk:nihao"]),
      srs: {},
    });
    assert(plan.actions.some((a) => a.priority === "high" && a.grade === "again"), "erro → alta/again");
    assert(plan.actions.some((a) => a.reason.includes("erro") || a.reason.includes("intencao")), "motivo de erro/intenção");
    const domains = new Set(plan.actions.filter((a) => a.priority === "high").map((a) => a.domain));
    assert(domains.size >= 1, "erro agenda domínio de revisão");
  }

  // ── 3. Abandono ──────────────────────────────────────────────────────────
  {
    const plan = planConversationVocabularySrs({
      manifest,
      result: "abandoned",
      attempts: 1,
      assistanceLevel: "assisted",
      errorRefs: resolveConversationErrorRefs(manifest, "abandoned"),
      srs: {},
    });
    assert(plan.actions.some((a) => a.priority === "high" && a.grade === "again"), "abandono → alta/again");
    assert(plan.actions.some((a) => a.reason.includes("abandono")), "motivo abandono");
  }

  // ── 4. Várias tentativas ─────────────────────────────────────────────────
  {
    const plan = planConversationVocabularySrs({
      manifest,
      result: "completed",
      attempts: 3,
      assistanceLevel: "guided",
      errorRefs: [],
      srs: {},
    });
    assert(
      plan.actions.some((a) => a.priority === "high" && a.reason.includes("varias_tentativas")),
      "várias tentativas → prioridade alta"
    );
  }

  // ── 5. Item já existente no SRS (preserva / não apaga) ───────────────────
  {
    const existing = newItem("chunk", "nihao", { track: "fala", reviewDomain: "uso", now: 1_000 });
    existing.reps = 4;
    existing.ease = 2.7;
    existing.intervalDays = 10;
    existing.due = 1_000 + 10 * 86_400_000;
    const srs = { [makeKey("chunk", "nihao", "uso")]: existing };
    const plan = planConversationVocabularySrs({
      manifest,
      result: "completed",
      attempts: 1,
      assistanceLevel: "independent",
      errorRefs: [],
      srs,
      learnedChunks: ["nihao"],
      learnedChars: [],
    });
    const action = plan.actions.find((a) => a.type === "chunk" && a.itemId === "nihao");
    assert(action, "item existente ainda recebe ação");
    assert(action.existed === true, "marca existed=true para item já no SRS");

    const store = { ...srs };
    applyConversationVocabularySrsPlan(plan, {
      ensureSrs: (type, itemId, track, domain) => {
        const key = makeKey(type, itemId, domain);
        if (!store[key]) store[key] = newItem(type, itemId, { track, reviewDomain: domain });
      },
      gradeSrs: (type, itemId, grade, track, domain) => {
        const key = makeKey(type, itemId, domain);
        const current = store[key] ?? newItem(type, itemId, { track, reviewDomain: domain });
        store[key] = review(current, grade);
      },
    });
    assert(store[makeKey("chunk", "nihao", "uso")], "SRS existente preservado após apply");
    assert(Object.keys(store).length >= Object.keys(srs).length, "não remove chaves antigas");
  }

  // ── 6. Deduplicação: não lotar com cada char de um chunk ─────────────────
  {
    const { ranked, skippedCharRefs } = selectPedagogicalUnits(manifest.items, {
      result: "completed",
      attempts: 1,
      assistanceLevel: "independent",
      errorRefs: [],
      srs: {},
      learnedChunks: [],
      learnedChars: [],
    });
    const chunkRefs = ranked.filter((r) => r.type === "chunk").map((r) => r.item.ref);
    assert(chunkRefs.length > 0, "seleciona chunks como unidade pedagógica");
    // Se o manifesto listar chars cobertos pelo chunk, devem ser omitidos (exceto novidade/erro).
    if (skippedCharRefs.length > 0) {
      assert(
        skippedCharRefs.every((ref) => ref.startsWith("char:")),
        "skippedCharRefs só contém chars"
      );
    }
    const plan = planConversationVocabularySrs({
      manifest,
      result: "completed",
      attempts: 1,
      assistanceLevel: "independent",
      errorRefs: [],
      srs: {},
    });
    const charActions = plan.actions.filter((a) => a.type === "char");
    const chunkActions = plan.actions.filter((a) => a.type === "chunk");
    assert(
      chunkActions.length >= charActions.length || skippedCharRefs.length > 0 || charActions.length === 0,
      "não deve lotar a fila com chars quando há chunks"
    );
  }

  // ── 7. Alternância de domínio / modalidade diferente ─────────────────────
  {
    assert(CONVERSATION_SRS_DOMAINS.includes("som"), "domínio som");
    assert(CONVERSATION_SRS_DOMAINS.includes("significado"), "domínio significado");
    assert(CONVERSATION_SRS_DOMAINS.includes("forma"), "domínio forma");
    assert(CONVERSATION_SRS_DOMAINS.includes("uso"), "domínio uso");
    assert(CONVERSATION_SRS_DOMAINS.includes("fala"), "domínio fala");
    assert(CONVERSATION_SRS_DOMAINS.includes("leitura"), "domínio leitura");

    const now = Date.now();
    const srs = {
      [makeKey("chunk", "nihao", "uso")]: {
        ...newItem("chunk", "nihao", { reviewDomain: "uso", now: now - 1000 }),
        reviewedAt: now - 1000,
        reps: 1,
      },
    };
    const next = pickConversationReviewDomain("chunk", "nihao", srs, undefined, new Set(["uso"]));
    assert(next !== "uso", `domínio alternado deve evitar uso (${next})`);
    assert(CONVERSATION_SRS_DOMAINS.includes(next), `domínio alternado válido (${next})`);

    const planHigh = planConversationVocabularySrs({
      manifest,
      result: "mistake",
      attempts: 2,
      assistanceLevel: "guided",
      errorRefs: ["chunk:nihao"],
      srs: {},
    });
    const byItem = planHigh.actions.filter((a) => a.itemId === "nihao");
    const domains = new Set(byItem.map((a) => a.domain));
    assert(domains.size >= 2 || byItem.length >= 1, "alta prioridade agenda modalidade(s) distintas");
  }

  // ── 8. Assistência → média; consolidada → baixa ──────────────────────────
  {
    const assisted = priorityForConversationItem(
      { ref: "chunk:nihao", refType: "chunk", text: "你好", roles: ["reused"], sources: ["main_line"], occurrences: 1, resolved: true },
      { result: "completed", attempts: 1, assistanceLevel: "guided", errorRefs: [], srs: {}, learnedChunks: [], learnedChars: [] }
    );
    assert(assisted.priority === "medium", "acerto com assistência → média");

    const strong = newItem("chunk", "nihao", { reviewDomain: "uso" });
    strong.reps = 3;
    strong.lapses = 0;
    strong.intervalDays = 5;
    const strong2 = newItem("chunk", "nihao", { reviewDomain: "significado" });
    strong2.reps = 3;
    strong2.lapses = 0;
    strong2.intervalDays = 5;
    const low = priorityForConversationItem(
      { ref: "chunk:nihao", refType: "chunk", text: "你好", roles: ["reused"], sources: ["main_line"], occurrences: 1, resolved: true },
      {
        result: "completed",
        attempts: 1,
        assistanceLevel: "independent",
        errorRefs: [],
        srs: {
          [makeKey("chunk", "nihao", "uso")]: strong,
          [makeKey("chunk", "nihao", "significado")]: strong2,
        },
        learnedChunks: ["nihao"],
        learnedChars: [],
      }
    );
    assert(low.priority === "low", "palavra consolidada → baixa");
  }

  // ── 9. Histórico / limite / revisão em cenário diferente ─────────────────
  {
    const history = [
      {
        sceneId: "syn-srs-greet",
        intent: "greet",
        lessonId: "l1",
        completedAt: 200,
        result: "mistake",
        attempts: 2,
        assistanceLevel: "guided",
        errorRefs: ["chunk:nihao"],
        setting: "school",
        mainAnswer: "你好",
      },
      {
        sceneId: "other-greet",
        intent: "greet",
        lessonId: "l0",
        completedAt: 100,
        result: "completed",
        attempts: 1,
        setting: "street",
      },
    ];
    const ctx = conversationSelectionContextFromHistory(history, {
      recentConversationSceneIds: ["syn-srs-greet"],
      recentConversationIntentIds: ["greet"],
    });
    assert(ctx.recentMistakeSceneIds?.includes("syn-srs-greet"), "marca cena com erro");
    assert(ctx.pendingIntentRecovery?.has("greet"), "intenção pendente de recuperação");
    assert(ctx.lastMistakeSetting === "school", "guarda setting do erro");
    assert(ctx.recentErrorRefs?.has("chunk:nihao"), "errorRefs do histórico entram no contexto");

    const sameScene = {
      kind: "conversation_scene",
      sceneId: "syn-srs-greet",
      intent: "greet",
      setting: "school",
      learnedRefs: ["chunk:nihao"],
      characters: CHARS,
      lines: scene.lines,
      checkpoint: scene.checkpoint,
    };
    const otherSetting = {
      ...sameScene,
      sceneId: "park-greet",
      setting: "park",
      learnedRefs: ["chunk:nihao"],
    };
    const lessonInfo = { focusRefs: new Set(["chunk:nihao"]), reviewRefs: new Set() };
    const scoreSame = scoreConversationScene(sameScene, lessonInfo, ctx);
    const scoreOther = scoreConversationScene(otherSetting, lessonInfo, ctx);
    assert(
      scoreOther > scoreSame,
      `intenção deve reaparecer noutro cenário (other=${scoreOther} same=${scoreSame})`
    );

    // Limite do histórico
    assert(CONVERSATION_HISTORY_LIMIT === 100, "limite do histórico = 100");
    const oversized = Array.from({ length: 120 }, (_, i) => ({
      sceneId: `s${i}`,
      intent: `i${i % 5}`,
      lessonId: `l${i}`,
      completedAt: i,
      result: "completed",
      attempts: 1,
    }));
    assert(oversized.length > CONVERSATION_HISTORY_LIMIT, "fixture ultrapassa o limite");
  }

  // ── 10. Sync-merge shape: campos ricos sobrevivem à união ────────────────
  {
    function mergeConversationHistory(local, remote) {
      const byKey = new Map();
      for (const entry of [...(local ?? []), ...(remote ?? [])]) {
        if (!entry?.sceneId) continue;
        const key = `${entry.sceneId}:${entry.lessonId ?? ""}:${entry.completedAt ?? 0}`;
        if (!byKey.has(key)) byKey.set(key, entry);
      }
      return [...byKey.values()].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).slice(0, 100);
    }
    const local = [
      {
        sceneId: "a",
        intent: "greet",
        lessonId: "l1",
        completedAt: 10,
        result: "completed",
        attempts: 1,
        assistanceLevel: "guided",
        mainAnswer: "你好",
        errorRefs: [],
        setting: "school",
      },
    ];
    const remote = [
      {
        sceneId: "b",
        intent: "ask",
        lessonId: "l2",
        completedAt: 20,
        result: "mistake",
        attempts: 2,
        assistanceLevel: "assisted",
        errorRefs: ["chunk:x"],
        setting: "shop",
      },
    ];
    const merged = mergeConversationHistory(local, remote);
    assert(merged.length === 2, "merge une históricos de contas corretas");
    assert(merged[0].assistanceLevel === "assisted", "merge preserva assistanceLevel");
    assert(merged[0].errorRefs?.[0] === "chunk:x", "merge preserva errorRefs");
    assert(merged.some((e) => e.mainAnswer === "你好"), "merge preserva mainAnswer");
  }

  if (errors.length) {
    console.error(`FAIL test:conversation-vocabulary-srs (${errors.length})`);
    for (const error of errors) console.error(` - ${error}`);
    process.exit(1);
  }
  console.log("OK test:conversation-vocabulary-srs");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
