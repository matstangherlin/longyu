/**
 * Regras puras do portão de pedagogia de conversas.
 *
 * Sem I/O e sem TypeScript: as mesmas regras auditam a jornada real e fixtures
 * deliberadamente inválidas.
 */

const ROLE_MINIMUMS = {
  common: { lines: 6, interventions: 2 },
  module_review: { lines: 10, interventions: 3 },
  immersion: { lines: 14, interventions: 5 },
};

const CHOICE_TYPES = new Set(["choose_reply", "choose_meaning", "fill_reply", "listen_reply"]);
const CONTEXTUAL_KINDS = new Set([
  "sentence_build",
  "translation_build",
  "fill_blank",
  "produce",
  "write",
  "hanzi_build",
  "dialogue_choice",
  "match_pairs",
]);
const PUNCT_RE = /[\u3000-\u303f\uff00-\uffef,.!?\s:;"'()？！。，、]/gu;

export function normalizeConversationText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("pt-BR")
    .replace(PUNCT_RE, "");
}

function issue(list, code, ref, message, severity = "failure") {
  list.push({ code, ref, message, severity });
}

function edges(node) {
  return [node?.nextNodeId, node?.interaction?.correctNextNodeId, node?.interaction?.wrongNextNodeId].filter(Boolean);
}

function mainPath(nodes, entryNodeId) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set();
  const path = [];
  let current = byId.get(entryNodeId ?? nodes[0]?.id);
  while (current && !seen.has(current.id)) {
    path.push(current);
    seen.add(current.id);
    const next = current.interaction?.correctNextNodeId ?? current.nextNodeId;
    current = next ? byId.get(next) : undefined;
  }
  return path;
}

function graphSummary(nodes, entryNodeId) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const entry = entryNodeId ?? nodes[0]?.id;
  const reachable = new Set();
  const queue = entry ? [entry] : [];
  while (queue.length) {
    const id = queue.shift();
    if (!id || reachable.has(id) || !byId.has(id)) continue;
    reachable.add(id);
    queue.push(...edges(byId.get(id)));
  }
  const terminals = nodes.filter((node) => edges(node).length === 0).map((node) => node.id);
  const reverse = new Map(nodes.map((node) => [node.id, []]));
  for (const node of nodes) {
    for (const next of edges(node)) reverse.get(next)?.push(node.id);
  }
  const canFinish = new Set();
  const stack = [...terminals];
  while (stack.length) {
    const id = stack.pop();
    if (!id || canFinish.has(id)) continue;
    canFinish.add(id);
    stack.push(...(reverse.get(id) ?? []));
  }
  return { byId, entry, reachable, terminals, canFinish };
}

function validateInteraction(interaction, nodeIds, ref, failures) {
  if (!String(interaction?.correctAnswer ?? "").trim()) {
    issue(failures, "INTERACTION_NO_CORRECT_ANSWER", ref, "interação sem resposta correta");
  }
  const options = interaction?.options ?? [];
  const normalized = options.map(normalizeConversationText).filter(Boolean);
  if (new Set(normalized).size !== normalized.length) {
    issue(failures, "INVALID_DISTRACTORS", ref, "opções duplicadas após normalização");
  }
  if (CHOICE_TYPES.has(interaction?.type)) {
    const answer = normalizeConversationText(interaction?.correctAnswer);
    if (options.length < 2 || !normalized.includes(answer)) {
      issue(failures, "INVALID_DISTRACTORS", ref, "resposta correta ausente das opções ou sem distrator");
    }
    if (!normalized.some((option) => option && option !== answer)) {
      issue(failures, "INVALID_DISTRACTORS", ref, "nenhum distrator semanticamente distinto");
    }
  }
  if (interaction?.type === "order_reply") {
    if (options.length < 2) issue(failures, "INVALID_DISTRACTORS", ref, "order_reply sem peças suficientes");
    const bank = options.map(normalizeConversationText).join("");
    const target = normalizeConversationText(interaction.correctAnswer);
    if (!target || !target.split("").every((char) => bank.includes(char))) {
      issue(failures, "INTERACTION_NO_CORRECT_ANSWER", ref, "resposta não pode ser montada com o banco");
    }
  }
  for (const [field, nextId] of [
    ["correctNextNodeId", interaction?.correctNextNodeId],
    ["wrongNextNodeId", interaction?.wrongNextNodeId],
  ]) {
    if (nextId && !nodeIds.has(nextId)) {
      issue(failures, "MISSING_NODE_REFERENCE", ref, field + " aponta para nó inexistente: " + nextId);
    }
  }
}

function validateLayer(scene, layer, layerRef, failures, pinyinByHanzi) {
  const nodes = layer.nodes ?? [];
  if (nodes.length === 0) {
    issue(failures, "V2_WITHOUT_NODES", layerRef, "cena V2 sem nós");
    return { path: [], branches: 0, endings: 0, interactions: 0 };
  }
  const ids = new Set();
  for (const node of nodes) {
    if (!String(node.id ?? "").trim() || ids.has(node.id)) {
      issue(failures, "DUPLICATE_NODE", layerRef, "nó ausente ou duplicado: " + (node.id ?? "(sem id)"));
    }
    ids.add(node.id);
  }
  const summary = graphSummary(nodes, layer.entryNodeId);
  if (!summary.entry || !ids.has(summary.entry)) {
    issue(failures, "MISSING_NODE_REFERENCE", layerRef, "entryNodeId inexistente: " + (summary.entry ?? "(ausente)"));
  }
  for (const node of nodes) {
    const ref = layerRef + "@" + node.id;
    if (!String(node.hanzi ?? "").trim()) issue(failures, "MISSING_HANZI", ref, "fala sem hànzì");
    if (!String(node.pinyin ?? "").trim()) issue(failures, "MISSING_PINYIN", ref, "texto sem pinyin correspondente");
    if (!String(node.pt ?? "").trim()) issue(failures, "MISSING_GUIDED_TRANSLATION", ref, "variante guiada exige tradução");
    if (node.nextNodeId && !ids.has(node.nextNodeId)) {
      issue(failures, "MISSING_NODE_REFERENCE", ref, "nextNodeId aponta para nó inexistente: " + node.nextNodeId);
    }
    if (node.interaction) validateInteraction(node.interaction, ids, ref, failures);

    const hanziKey = normalizeConversationText(node.hanzi);
    const pinyinKey = String(node.pinyin ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(PUNCT_RE, "")
      .toLocaleLowerCase("pt-BR");
    if (hanziKey && pinyinKey) {
      const prior = pinyinByHanzi.get(hanziKey);
      if (prior && prior !== pinyinKey) {
        issue(failures, "INCONSISTENT_TEXT_LAYERS", ref, "mesmo hànzì com pinyin divergente: " + prior + " != " + pinyinKey);
      } else {
        pinyinByHanzi.set(hanziKey, pinyinKey);
      }
    }
  }
  for (const node of nodes) {
    if (!summary.reachable.has(node.id)) issue(failures, "UNREACHABLE_NODE", layerRef, "nó inalcançável: " + node.id);
  }
  if (summary.terminals.length === 0) issue(failures, "INFINITE_LOOP", layerRef, "nenhum caminho termina a conversa");
  for (const id of summary.reachable) {
    if (!summary.canFinish.has(id)) issue(failures, "INFINITE_LOOP", layerRef, "nó sem caminho para final: " + id);
  }

  const wrongTargets = nodes.flatMap((node) => (node.interaction?.wrongNextNodeId ? [node.interaction.wrongNextNodeId] : []));
  if (wrongTargets.length === 0) issue(failures, "V2_WITHOUT_ERROR_BRANCH", layerRef, "cena V2 sem ramo de erro");
  for (const wrongId of wrongTargets) {
    const target = summary.byId.get(wrongId);
    if (target && edges(target).length === 0) {
      issue(failures, "ABRUPT_ERROR_END", layerRef + "@" + wrongId, "erro encerra a conversa abruptamente");
    }
  }

  const path = mainPath(nodes, layer.entryNodeId);
  return {
    path,
    branches: wrongTargets.length,
    endings: summary.terminals.length,
    interactions: path.filter((node) => node.interaction).length,
  };
}

function validateScene(scene, model, failures, metrics, pinyinByHanzi) {
  const ref = scene.sceneId ?? "(sem sceneId)";
  const role = scene.sceneRole ?? "common";
  const base = validateLayer(scene, scene, ref, failures, pinyinByHanzi);
  const minimum = ROLE_MINIMUMS[role] ?? ROLE_MINIMUMS.common;
  if (base.path.length < minimum.lines) {
    issue(failures, "TOO_FEW_LINES", ref, role + " com " + base.path.length + " falas; mínimo " + minimum.lines);
  }
  if (base.interactions < minimum.interventions) {
    issue(failures, "TOO_FEW_INTERVENTIONS", ref, role + " com " + base.interactions + " intervenções; mínimo " + minimum.interventions);
  }

  const mainLines = scene.lines ?? [];
  if (mainLines.length !== base.path.length) {
    issue(failures, "INCONSISTENT_TEXT_LAYERS", ref, "lines não corresponde ao caminho principal V2");
  } else {
    base.path.forEach((node, index) => {
      const line = mainLines[index];
      if (
        normalizeConversationText(line?.hanzi) !== normalizeConversationText(node.hanzi) ||
        normalizeConversationText(line?.pinyin) !== normalizeConversationText(node.pinyin) ||
        normalizeConversationText(line?.pt) !== normalizeConversationText(node.pt)
      ) {
        issue(failures, "INCONSISTENT_TEXT_LAYERS", ref + "#" + (index + 1), "hànzì, pinyin ou tradução diverge do nó canônico");
      }
    });
  }

  const learned = new Set(scene.learnedRefs ?? []);
  const optional = new Set(scene.optionalRefs ?? []);
  const novel = new Set(scene.newRefs ?? []);
  for (const item of [...learned, ...optional, ...novel]) {
    if (!model.catalogRefs.has(item)) issue(failures, "MISSING_CANONICAL_REFERENCE", ref, "referência canônica inexistente: " + item);
  }
  for (const item of optional) {
    if (learned.has(item) || novel.has(item)) {
      issue(failures, "OPTIONAL_AS_REQUIRED", ref, "vocabulário opcional tratado como obrigatório: " + item);
    }
  }

  const variants = scene.variants ?? [];
  const rank = { beginner: 0, intermediate: 1, advanced: 2 };
  let previousRank = -1;
  let previousPhase = -1;
  for (const variant of [...variants].sort((a, b) => (rank[a.stage] ?? 99) - (rank[b.stage] ?? 99))) {
    const vref = ref + "~" + variant.stage;
    validateLayer(scene, variant, vref, failures, pinyinByHanzi);
    const currentRank = rank[variant.stage];
    const phase = variant.minPhaseOrder ?? 0;
    if (currentRank == null || currentRank <= previousRank || phase < previousPhase) {
      issue(failures, "ADVANCED_VARIANT_TOO_EARLY", vref, "ordem de estágio/fase permite variante avançada cedo demais");
    }
    previousRank = currentRank ?? previousRank;
    previousPhase = phase;
    const extras = (variant.learnedRefs ?? []).filter((item) => !learned.has(item));
    if (extras.length) issue(failures, "ADVANCED_VARIANT_TOO_EARLY", vref, "variante exige refs fora da camada avançada: " + extras.join(", "));
  }
  const beginner = variants.find((variant) => variant.stage === "beginner");
  if (beginner && (beginner.learnedRefs?.length ?? 0) >= learned.size) {
    issue(failures, "ADVANCED_VARIANT_TOO_EARLY", ref, "camada beginner não reduz os pré-requisitos da avançada");
  }

  for (const manifest of model.sceneManifests.get(ref) ?? []) {
    for (const text of manifest.coverage?.unresolvedTexts ?? []) {
      issue(failures, "TEXT_OUTSIDE_CATALOG", ref, "texto fora do catálogo sem justificativa: " + text);
    }
    for (const item of manifest.items ?? []) {
      if (!item.resolved) issue(failures, "MISSING_CANONICAL_REFERENCE", ref, "vocabulário sem referência canônica: " + item.text);
    }
  }

  metrics.sceneStats.push({
    sceneId: ref,
    title: scene.title ?? ref,
    role,
    setting: scene.setting ?? "(sem cenário)",
    intent: scene.intent ?? "(sem intenção)",
    lines: base.path.length,
    interventions: base.interactions,
    branches: base.branches,
    endings: base.endings,
  });
}

function stepTextBlob(step) {
  return normalizeConversationText([
    step.text,
    step.hanzi,
    step.answer,
    step.prompt,
    step.promptPt,
    step.sourceText,
    step.correctAnswer,
    step.blankAnswer,
    step.sentenceBefore,
    step.sentenceAfter,
    step.dialoguePrompt,
    step.target?.join(""),
    step.targetParts?.join(""),
    ...(step.options ?? []),
    ...(step.bank ?? []),
    ...(step.pairs ?? []).flatMap((pair) => [pair.left, pair.right]),
  ].filter(Boolean).join(" "));
}

function stepCoversItem(step, item) {
  const [type, id] = String(item.ref ?? "").split(":");
  if (type === "char" && (step.charId === id || (step.charIds ?? []).includes(id))) return true;
  if (type === "chunk" && step.chunkId === id) return true;
  if ((step.learnedRefs ?? []).includes(item.ref) || (step.newRefs ?? []).includes(item.ref)) return true;
  const needle = normalizeConversationText(item.text);
  return Boolean(needle && stepTextBlob(step).includes(needle));
}

function validatePlans(model, failures, metrics) {
  const sceneById = new Map(model.scenes.map((scene) => [scene.sceneId, scene]));
  const used = new Map();
  const intentCounts = new Map();
  const situationCounts = new Map();
  const vocabulary = new Map();
  const coveredRefs = new Set();
  const newRefs = new Set();
  const answerRecovered = new Set();
  const answerNeeds = new Map();
  let reuseCount = 0;
  let conversationCount = 0;
  let previousPrimary = null;
  const timeline = model.plans.flatMap((plan) =>
    plan.steps.map((step) => ({ step, lessonId: plan.lessonId }))
  );
  const orderOf = new Map(timeline.map((event, index) => [event.step, index]));

  for (const plan of model.plans) {
    const conversations = plan.steps.map((step, index) => ({ step, index })).filter(({ step }) => step.kind === "conversation_scene");
    const primary = conversations[0]?.step;
    if (
      primary?.sceneId &&
      previousPrimary?.sceneId === primary.sceneId &&
      !primary.conversationRepeatJustification &&
      !sceneById.get(primary.sceneId)?.repeatJustification
    ) {
      issue(failures, "CONSECUTIVE_SCENE_REPEAT", plan.lessonId, "cena " + primary.sceneId + " repetida em lições consecutivas sem justificativa");
    }
    if (primary?.sceneId) previousPrimary = primary;

    for (const { step: conversation, index } of conversations) {
      conversationCount += 1;
      const scene = sceneById.get(conversation.sceneId);
      if (!scene) {
        issue(failures, "MISSING_SCENE_REFERENCE", plan.lessonId, "sceneId inexistente: " + conversation.sceneId);
        continue;
      }
      used.set(scene.sceneId, (used.get(scene.sceneId) ?? 0) + 1);
      intentCounts.set(scene.intent, (intentCounts.get(scene.intent) ?? 0) + 1);
      const signature = scene.setting + ":" + scene.intent;
      situationCounts.set(signature, (situationCounts.get(signature) ?? 0) + 1);
      const manifest = plan.manifests?.get(index);
      if (!manifest) continue;
      const conversationOrder = orderOf.get(conversation) ?? 0;

      const later = plan.steps.slice(index + 1).filter((candidate) => candidate.kind !== "conversation_scene");
      const relevant = (manifest.items ?? []).filter(
        (item) => item.resolved && item.roles?.some((role) => ["required", "new", "reused", "response"].includes(role))
      );
      for (const item of relevant) {
        const record = vocabulary.get(item.ref) ?? {
          ref: item.ref,
          text: item.text,
          shown: 0,
          reuse: 0,
          firstSeen: conversationOrder,
        };
        record.shown += item.occurrences ?? 1;
        record.firstSeen = Math.min(record.firstSeen, conversationOrder);
        const tasks = later.filter((candidate) => stepCoversItem(candidate, item));
        record.reuse += tasks.length;
        reuseCount += tasks.length;
        if (tasks.length) coveredRefs.add(item.ref);
        vocabulary.set(item.ref, record);
        if (item.roles.includes("new")) {
          newRefs.add(item.ref);
          if ((item.occurrences ?? 1) + tasks.length < 2) {
            issue(failures, "NEW_WORD_SINGLE_EXPOSURE", plan.lessonId + ":" + scene.sceneId, item.ref + " teve apenas uma exposição");
          }
          if (tasks.length === 0) {
            issue(failures, "VOCABULARY_WITHOUT_POST_TASK", plan.lessonId + ":" + scene.sceneId, item.ref + " sem tarefa posterior");
          }
        }
      }

      for (const expected of manifest.expectedAnswers ?? []) {
        const answer = normalizeConversationText(expected);
        const recovered = later.some((candidate) => CONTEXTUAL_KINDS.has(candidate.kind) && stepTextBlob(candidate).includes(answer));
        if (recovered) answerRecovered.add(scene.sceneId);
      }
      const need = answerNeeds.get(scene.sceneId) ?? {
        firstSeen: conversationOrder,
        answers: new Set(),
        responseItems: new Map(),
      };
      need.firstSeen = Math.min(need.firstSeen, conversationOrder);
      for (const expected of manifest.expectedAnswers ?? []) {
        const answer = normalizeConversationText(expected);
        if (answer) need.answers.add(answer);
      }
      for (const item of relevant.filter((candidate) => candidate.roles.includes("response"))) {
        need.responseItems.set(item.ref, item);
      }
      answerNeeds.set(scene.sceneId, need);

      for (const derived of later.filter((candidate) => candidate.conversationDerived && candidate.conversationSourceSceneId === scene.sceneId)) {
        if (derived.__transformsConversation === false) {
          issue(failures, "NO_COGNITIVE_TRANSFORMATION", plan.lessonId + ":" + scene.sceneId, "tarefa derivada " + derived.kind + " não transforma cognitivamente a conversa");
        }
      }
      if (conversation.__variantMinPhase != null && plan.phaseOrder < conversation.__variantMinPhase) {
        issue(failures, "ADVANCED_VARIANT_TOO_EARLY", plan.lessonId + ":" + scene.sceneId, "variante liberada antes da fase mínima");
      }
    }
  }

  for (const placement of model.authoredPlacements ?? []) {
    const scene = sceneById.get(placement.sceneId);
    if (!scene) continue;
    for (const ref of scene.learnedRefs ?? []) {
      if (!placement.knownRefs.has(ref)) {
        issue(failures, "VOCABULARY_BEFORE_TAUGHT", placement.lessonId + ":" + placement.sceneId, ref + " mostrado antes de ser ensinado");
      }
    }
  }

  for (const scene of model.scenes) {
    if (!used.has(scene.sceneId) && !(model.authoredUseCounts?.get(scene.sceneId) > 0)) {
      issue(failures, "UNUSED_SCENE", scene.sceneId, "cena nunca utilizada no plano real nem na jornada autoral");
    }
  }

  // Cobertura posterior pode acontecer na própria fase Pós-Conversa ou numa
  // lição futura. Nunca damos crédito a tarefa anterior à primeira exibição.
  for (const [ref, record] of vocabulary) {
    if (model.srsCoveredRefs?.has(ref)) coveredRefs.add(ref);
    if (!coveredRefs.has(ref)) {
      const future = timeline.filter(
        (event, order) =>
          order > record.firstSeen &&
          event.step.kind !== "conversation_scene" &&
          stepCoversItem(event.step, record)
      );
      if (future.length) {
        coveredRefs.add(ref);
        record.reuse += future.length;
        reuseCount += future.length;
      }
    }
    if (!coveredRefs.has(ref)) issue(failures, "VOCABULARY_WITHOUT_POST_TASK", ref, "vocabulário exibido sem tarefa posterior em nenhum plano");
  }

  for (const [sceneId, need] of answerNeeds) {
    if (answerRecovered.has(sceneId)) continue;
    const recovered = timeline.some((event, order) => {
      if (order <= need.firstSeen || event.step.kind === "conversation_scene" || !CONTEXTUAL_KINDS.has(event.step.kind)) return false;
      const blob = stepTextBlob(event.step);
      if ([...need.answers].some((answer) => blob.includes(answer))) return true;
      return [...need.responseItems.values()].some((item) => stepCoversItem(event.step, item));
    });
    if (recovered) answerRecovered.add(sceneId);
    else issue(failures, "MAIN_ANSWER_NOT_REUSED", sceneId, "resposta principal nunca reutilizada em tarefa contextual");
  }
  for (const [intent, count] of intentCounts) {
    if (conversationCount > 0 && count / conversationCount > 0.2) {
      issue(failures, "INTENT_DOMINANCE", intent, "intenção domina " + count + "/" + conversationCount + " conversas");
    }
  }
  for (const [signature, count] of situationCounts) {
    if (conversationCount > 0 && count / conversationCount > 0.2) {
      issue(failures, "REPEATED_SITUATION", signature, "mesma situação aparece " + count + "/" + conversationCount + " vezes");
    }
  }

  metrics.conversationCount = conversationCount;
  metrics.sceneUseCounts = used;
  metrics.intentUseCounts = intentCounts;
  metrics.situationUseCounts = situationCounts;
  metrics.vocabulary = vocabulary;
  metrics.coveredRefs = coveredRefs;
  metrics.newRefs = newRefs;
  metrics.reuseCount = reuseCount;
}

export function validateReportSnapshot(snapshot, current) {
  const failures = [];
  if (!snapshot || snapshot.commit !== current.commit || snapshot.journeyHash !== current.journeyHash) {
    issue(failures, "STALE_REPORT", "reports/conversation-pedagogy-report.md", "relatório desatualizado em relação ao commit ou à jornada");
  }
  return failures;
}

export function validateConversationPedagogy(model) {
  const failures = [];
  const warnings = [];
  const metrics = {
    sceneStats: [],
    conversationCount: 0,
    sceneUseCounts: new Map(),
    intentUseCounts: new Map(),
    situationUseCounts: new Map(),
    vocabulary: new Map(),
    coveredRefs: new Set(),
    newRefs: new Set(),
    reuseCount: 0,
  };
  const ids = new Set();
  const pinyinByHanzi = new Map();
  for (const scene of model.scenes ?? []) {
    if (!scene.sceneId || ids.has(scene.sceneId)) issue(failures, "DUPLICATE_SCENE", scene.sceneId ?? "(sem id)", "sceneId ausente ou duplicado");
    ids.add(scene.sceneId);
    validateScene(scene, model, failures, metrics, pinyinByHanzi);
  }
  validatePlans(model, failures, metrics);
  if (model.reportSnapshot) failures.push(...validateReportSnapshot(model.reportSnapshot, model.provenance));
  return { failures, warnings, metrics };
}

export function summarizeConversationMetrics(result) {
  const stats = result.metrics.sceneStats;
  const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  const minLines = stats.length ? Math.min(...stats.map((item) => item.lines)) : 0;
  const maxLines = stats.length ? Math.max(...stats.map((item) => item.lines)) : 0;
  const countBy = (key) => {
    const map = new Map();
    for (const item of stats) map.set(item[key], (map.get(item[key]) ?? 0) + 1);
    return map;
  };
  return {
    sceneCount: stats.length,
    averageLines: average(stats.map((item) => item.lines)),
    averageInterventions: average(stats.map((item) => item.interventions)),
    branchCount: stats.reduce((sum, item) => sum + item.branches, 0),
    endingCount: stats.reduce((sum, item) => sum + item.endings, 0),
    vocabularyTotal: result.metrics.vocabulary.size,
    vocabularyCovered: result.metrics.coveredRefs.size,
    coveragePercent: result.metrics.vocabulary.size ? (result.metrics.coveredRefs.size / result.metrics.vocabulary.size) * 100 : 0,
    newWordCount: result.metrics.newRefs.size,
    averageReuse: result.metrics.vocabulary.size ? result.metrics.reuseCount / result.metrics.vocabulary.size : 0,
    shortest: stats.filter((item) => item.lines === minLines),
    longest: stats.filter((item) => item.lines === maxLines),
    bySetting: countBy("setting"),
    byIntent: countBy("intent"),
    mostRepeated: [...result.metrics.sceneUseCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}
