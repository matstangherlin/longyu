function interaction(correct, wrong) {
  return {
    type: "choose_reply",
    prompt: "Responda.",
    options: ["好", "不"],
    correctAnswer: "好",
    correctNextNodeId: correct,
    wrongNextNodeId: wrong,
  };
}

function baseScene(id = "fixture-scene") {
  const nodes = [
    { id: "n1", speakerId: "a", hanzi: "好", pinyin: "hǎo", pt: "Certo.", interaction: interaction("n2", "e1") },
    { id: "e1", speakerId: "b", hanzi: "不", pinyin: "bù", pt: "Não.", nextNodeId: "n1" },
    { id: "n2", speakerId: "b", hanzi: "好", pinyin: "hǎo", pt: "Certo.", nextNodeId: "n3" },
    { id: "n3", speakerId: "a", hanzi: "好", pinyin: "hǎo", pt: "Certo.", interaction: interaction("n4", "e2") },
    { id: "e2", speakerId: "b", hanzi: "不", pinyin: "bù", pt: "Não.", nextNodeId: "n3" },
    { id: "n4", speakerId: "b", hanzi: "好", pinyin: "hǎo", pt: "Certo.", nextNodeId: "n5" },
    { id: "n5", speakerId: "a", hanzi: "好", pinyin: "hǎo", pt: "Certo.", nextNodeId: "n6" },
    { id: "n6", speakerId: "b", hanzi: "好", pinyin: "hǎo", pt: "Certo." },
  ];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const lines = ["n1", "n2", "n3", "n4", "n5", "n6"].map((nodeId) => {
    const node = byId.get(nodeId);
    return { speakerId: node.speakerId, hanzi: node.hanzi, pinyin: node.pinyin, pt: node.pt };
  });
  return {
    kind: "conversation_scene",
    sceneId: id,
    title: "Fixture",
    sceneRole: "common",
    setting: "school",
    intent: "fixture-intent-" + id,
    characters: [
      { id: "a", name: "A", avatar: "a", side: "left" },
      { id: "b", name: "B", avatar: "b", side: "right" },
    ],
    entryNodeId: "n1",
    nodes,
    lines,
    learnedRefs: ["chunk:ok"],
  };
}

function baseManifest(sceneId) {
  return {
    sceneId,
    expectedAnswers: ["好"],
    coverage: { unresolvedTexts: [] },
    items: [{
      ref: "chunk:ok",
      text: "好",
      resolved: true,
      occurrences: 6,
      roles: ["required", "reused", "response"],
    }],
  };
}

function modelFor(scenes, options = {}) {
  const sceneManifests = new Map(scenes.map((scene) => [scene.sceneId, [baseManifest(scene.sceneId)]]));
  const steps = [];
  const manifests = new Map();
  scenes.forEach((scene, index) => {
    const at = steps.length;
    steps.push({ ...scene, generated: true });
    manifests.set(at, baseManifest(scene.sceneId));
    steps.push({
      kind: "dialogue_choice",
      prompt: "Use em outra situação.",
      options: ["好", "不"],
      correctAnswer: "好",
      conversationDerived: true,
      conversationSourceSceneId: scene.sceneId,
      __transformsConversation: true,
    });
  });
  return {
    scenes,
    plans: [{ lessonId: "fixture-lesson", phaseOrder: 9, steps, manifests }],
    catalogRefs: new Set(["chunk:ok", "chunk:optional"]),
    sceneManifests,
    authoredPlacements: scenes.map((scene) => ({
      lessonId: "fixture-lesson",
      sceneId: scene.sceneId,
      knownRefs: new Set(scene.learnedRefs ?? []),
    })),
    authoredUseCounts: new Map(scenes.map((scene) => [scene.sceneId, 1])),
    provenance: { commit: "current", journeyHash: "current" },
    ...options,
  };
}

function clone(value) {
  return structuredClone(value);
}

export const INVALID_CONVERSATION_PEDAGOGY_FIXTURES = [
  {
    name: "cena comum curta e sem intervenções suficientes",
    expected: ["TOO_FEW_LINES", "TOO_FEW_INTERVENTIONS"],
    model() {
      const scene = baseScene();
      scene.nodes = scene.nodes.filter((node) => ["n1", "e1", "n2"].includes(node.id));
      scene.nodes[0].interaction.correctNextNodeId = "n2";
      scene.nodes[2].nextNodeId = undefined;
      scene.lines = scene.lines.slice(0, 2);
      return modelFor([scene]);
    },
  },
  {
    name: "revisão e imersão abaixo dos mínimos",
    expected: ["TOO_FEW_LINES", "TOO_FEW_INTERVENTIONS"],
    model() {
      const review = baseScene("review");
      review.sceneRole = "module_review";
      const immersion = baseScene("immersion");
      immersion.sceneRole = "immersion";
      return modelFor([review, immersion]);
    },
  },
  {
    name: "V2 sem ramo de erro",
    expected: ["V2_WITHOUT_ERROR_BRANCH"],
    model() {
      const scene = baseScene();
      for (const node of scene.nodes) if (node.interaction) delete node.interaction.wrongNextNodeId;
      return modelFor([scene]);
    },
  },
  {
    name: "erro terminal abrupto",
    expected: ["ABRUPT_ERROR_END"],
    model() {
      const scene = baseScene();
      const target = scene.nodes.find((node) => node.id === "e1");
      delete target.nextNodeId;
      return modelFor([scene]);
    },
  },
  {
    name: "grafo quebrado, inalcançável e infinito",
    expected: ["MISSING_NODE_REFERENCE", "UNREACHABLE_NODE", "INFINITE_LOOP"],
    model() {
      const scene = baseScene();
      scene.nodes.find((node) => node.id === "n5").nextNodeId = "fantasma";
      scene.nodes.find((node) => node.id === "n6").nextNodeId = "n5";
      scene.nodes.push({ id: "isolado", speakerId: "a", hanzi: "好", pinyin: "hǎo", pt: "Certo." });
      return modelFor([scene]);
    },
  },
  {
    name: "camadas linguísticas incompletas e inconsistentes",
    expected: ["MISSING_PINYIN", "MISSING_GUIDED_TRANSLATION", "INCONSISTENT_TEXT_LAYERS"],
    model() {
      const scene = baseScene();
      scene.nodes[0].pinyin = "";
      scene.nodes[1].pt = "";
      scene.lines[2].hanzi = "不";
      return modelFor([scene]);
    },
  },
  {
    name: "catálogo, optional e texto não resolvido",
    expected: ["MISSING_CANONICAL_REFERENCE", "OPTIONAL_AS_REQUIRED", "TEXT_OUTSIDE_CATALOG"],
    model() {
      const scene = baseScene();
      scene.learnedRefs.push("chunk:missing", "chunk:optional");
      scene.optionalRefs = ["chunk:optional"];
      const model = modelFor([scene]);
      model.sceneManifests.set(scene.sceneId, [{
        ...baseManifest(scene.sceneId),
        coverage: { unresolvedTexts: ["龍"] },
        items: [...baseManifest(scene.sceneId).items, { ref: "unresolved:龍", text: "龍", resolved: false, roles: ["exposed"] }],
      }]);
      return model;
    },
  },
  {
    name: "interação sem resposta e com opções inválidas",
    expected: ["INTERACTION_NO_CORRECT_ANSWER", "INVALID_DISTRACTORS"],
    model() {
      const scene = baseScene();
      const interaction = scene.nodes[0].interaction;
      interaction.correctAnswer = "";
      interaction.options = ["好", "好"];
      return modelFor([scene]);
    },
  },
  {
    name: "vocabulário antecipado e variante avançada cedo",
    expected: ["VOCABULARY_BEFORE_TAUGHT", "ADVANCED_VARIANT_TOO_EARLY"],
    model() {
      const scene = baseScene();
      scene.variants = [{
        stage: "beginner",
        minPhaseOrder: 0,
        learnedRefs: ["chunk:ok"],
        nodes: clone(scene.nodes),
        entryNodeId: "n1",
      }];
      const model = modelFor([scene]);
      model.authoredPlacements[0].knownRefs = new Set();
      return model;
    },
  },
  {
    name: "loop memorístico sem tarefa, reuso ou transformação",
    expected: ["VOCABULARY_WITHOUT_POST_TASK", "NEW_WORD_SINGLE_EXPOSURE", "MAIN_ANSWER_NOT_REUSED", "NO_COGNITIVE_TRANSFORMATION"],
    model() {
      const scene = baseScene();
      scene.newRefs = ["chunk:ok"];
      scene.learnedRefs = [];
      const model = modelFor([scene]);
      const manifest = baseManifest(scene.sceneId);
      manifest.items[0].roles = ["new", "response"];
      manifest.items[0].occurrences = 1;
      model.sceneManifests.set(scene.sceneId, [manifest]);
      model.plans[0].steps = [
        { ...scene, generated: true },
        {
          kind: "intro",
          conversationDerived: true,
          conversationSourceSceneId: scene.sceneId,
          __transformsConversation: false,
        },
      ];
      model.plans[0].manifests = new Map([[0, manifest]]);
      return model;
    },
  },
  {
    name: "repetição consecutiva, situação e intenção dominantes",
    expected: ["CONSECUTIVE_SCENE_REPEAT", "INTENT_DOMINANCE", "REPEATED_SITUATION"],
    model() {
      const scene = baseScene();
      const model = modelFor([scene]);
      const first = model.plans[0];
      model.plans = [first, { ...first, lessonId: "fixture-lesson-2" }];
      return model;
    },
  },
  {
    name: "cena nunca utilizada",
    expected: ["UNUSED_SCENE"],
    model() {
      const used = baseScene("used");
      const unused = baseScene("unused");
      const model = modelFor([used]);
      model.scenes.push(unused);
      model.sceneManifests.set(unused.sceneId, [baseManifest(unused.sceneId)]);
      model.authoredUseCounts.set(unused.sceneId, 0);
      return model;
    },
  },
  {
    name: "relatório obsoleto",
    expected: ["STALE_REPORT"],
    model() {
      const scene = baseScene();
      return modelFor([scene], { reportSnapshot: { commit: "old", journeyHash: "old" } });
    },
  },
];
