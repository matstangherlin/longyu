/**
 * RC2.2.9 — gates de evidência de runtime das capacidades conversacionais.
 *
 * Funções puras: recebem capacidades, evidência derivada, planos, registry e
 * fontes, e devolvem falhas com código. Os scripts validate:* chamam com os
 * dados reais; os test:* chamam com dados MUTADOS e exigem que o gate certo
 * falhe (mutation testing).
 *
 * Gates (numeração do plano da remessa):
 *   G1 DECLARED_READY_WITHOUT_EVIDENCE — READY declarado com dimensão ausente
 *   G2 CLOSURE_NOT_READY               — uma das 11 continua PARTIAL/PLANNED/MISSING
 *   G3 METADATA_CLAIM_UNPROVEN         — metadado diz que existe; runtime não acha
 *   G4 UNREACHABLE                     — passo de fechamento que o planner não entrega
 *   G5 LISTENING_NOT_INDEPENDENT       — escuta com a resposta escrita antes do áudio
 *   G6 TRANSFER_ONLY_DECLARED          — transferência só como string de metadado
 *   G7 CONVERSATION_WITHOUT_TURN       — "conversa" sem cena/turno com resposta do aluno
 * e, transversais: STATUS_MISMATCH (K1), TEACH_BEFORE_TEST (A1), NEW_VOCABULARY
 * (A3), EN_PARITY (U), SECOND_ENGINE e PROXY_SCORING (J).
 */

export const CLOSURE_IDS = [
  "talk_family",
  "order_food",
  "order_drink",
  "negotiate_basic",
  "pay",
  "use_metro",
  "use_train",
  "ask_for_help",
  "ask_repeat",
  "express_preference",
  "make_simple_plan",
];

const CJK = /[㐀-鿿]/;
const CJK_G = /[㐀-鿿]/g;

function failer() {
  const failures = [];
  const seen = new Set();
  return {
    failures,
    fail: (gate, code, where, why) => {
      const key = `${gate}|${code}|${where}|${why}`;
      if (seen.has(key)) return;
      seen.add(key);
      failures.push({ gate, code, where, why });
    },
  };
}

function hanziOf(text) {
  return (String(text ?? "").match(CJK_G) ?? []);
}

/** Strings em português (não-CJK) que o aluno lê num passo/cena. */
export function learnerFacingPtStrings(step) {
  const out = [];
  const add = (value) => {
    if (typeof value !== "string" || !value.trim()) return;
    if (/^[㐀-鿿，。！？、\s]+$/.test(value)) return;
    out.push(value);
  };
  for (const key of ["title", "prompt", "situationPt", "pt", "explanation"]) add(step[key]);
  if (!CJK.test(step.correctAnswer ?? "")) add(step.correctAnswer);
  for (const option of step.options ?? []) add(option);
  for (const line of step.lines ?? []) add(line.pt);
  for (const node of step.nodes ?? []) {
    add(node.pt);
    const interaction = node.interaction;
    if (!interaction) continue;
    add(interaction.prompt);
    add(interaction.explanation);
    for (const option of interaction.options ?? []) add(option);
    if (!CJK.test(interaction.correctAnswer ?? "")) add(interaction.correctAnswer);
  }
  return out;
}

/** O passo que o planner entregou corresponde ao passo declarado no registro? */
function sameStep(planned, declared) {
  if (planned.kind !== declared.kind) return false;
  const keys = ["chunkId", "sceneId", "audioText", "correctAnswer", "answer", "text", "prompt", "situationPt"];
  return keys.every((key) => (declared[key] == null ? true : planned[key] === declared[key]));
}

/**
 * @param {object} input
 * @param {Array} input.capabilities         CONVERSATION_CAPABILITIES (possivelmente mutadas)
 * @param {object} input.capabilityModule    módulo src/data/conversationCapabilities
 * @param {object} input.evidenceModule      módulo src/lib/capabilityRuntimeEvidence
 * @param {Map}    input.evidenceById        evidência derivada
 * @param {Array}  input.plans               planos { lesson:{id}, lessonIndex, pass, steps }
 * @param {object} input.registry            { chunkHanziByRef, charHanziByRef, knownWords }
 * @param {Array}  input.lessonIds           ids de ALL_LESSONS na ordem da Jornada
 * @param {Array}  input.closureEntries      CAPABILITY_CLOSURE_STEPS
 * @param {Array}  input.dedicatedScenes     cenas criadas nesta remessa (objetos de cena)
 * @param {Set}    input.sceneIds            ids do catálogo CONVERSATION_SCENES
 * @param {object} input.enOverlay           mapa PT → EN (instructionGloss.en.json)
 * @param {object} input.sources             { capabilitiesSource, srcFiles: Map<path, content> }
 */
export function runCapabilityRuntimeGates(input) {
  const { fail, failures } = failer();
  void input.sceneIds;
  const {
    capabilities,
    capabilityModule,
    evidenceModule,
    evidenceById,
    plans,
    registry,
    lessonIds,
    closureEntries,
    dedicatedScenes = [],
    enOverlay,
    sources,
  } = input;
  const available = new Set(registry.chunkHanziByRef.keys());
  const lessonSet = new Set(lessonIds);
  const { LISTENING_KINDS, TRANSFER_KINDS } = evidenceModule;

  for (const cap of capabilities) {
    const evidence = evidenceById.get(cap.id);
    const gaps = capabilityModule.capabilityReadyGaps(cap, available, evidence);
    const computed = capabilityModule.computeCapabilityStatus(cap, available, evidence);

    // G1 — READY declarado precisa de todas as dimensões em runtime.
    if (cap.status === "READY" && gaps.length > 0) {
      fail("G1", "DECLARED_READY_WITHOUT_EVIDENCE", cap.id, `faltam em runtime: ${gaps.join(", ")}`);
    }
    // K1 — declarado e calculado andam juntos.
    if (cap.status !== computed) {
      fail("K1", "STATUS_MISMATCH", cap.id, `declarado ${cap.status} · runtime ${computed}`);
    }
    if (!evidence) continue;

    // G3 — metadado que promete atividade tem de ser confirmado pelo runtime.
    if (cap.hasProductivePractice && evidence.productive.length === 0) {
      fail("G3", "METADATA_CLAIM_UNPROVEN", cap.id, "hasProductivePractice=true sem tarefa produtiva no runtime");
    }
    if (cap.hasConversation && evidence.conversation.length === 0) {
      fail("G3", "METADATA_CLAIM_UNPROVEN", cap.id, "hasConversation=true sem turno de conversa no runtime");
    }
    if (cap.transferScenarios.length > 0 && evidence.transfer.length === 0) {
      fail("G3", "METADATA_CLAIM_UNPROVEN", cap.id, `transferScenarios=[${cap.transferScenarios.join(", ")}] sem tarefa de transferência no runtime`);
    }
    for (const lessonId of cap.journeyLessons) {
      if (!lessonSet.has(lessonId)) fail("G3", "METADATA_CLAIM_UNPROVEN", cap.id, `journeyLessons aponta lição inexistente: ${lessonId}`);
    }
    for (const row of evidence.lexical) {
      if (!row.inRegistry) fail("G3", "METADATA_CLAIM_UNPROVEN", cap.id, `chunk exigido fora do registry: ${row.ref}`);
    }

    // G4 — toda evidência mora numa lição da Jornada.
    for (const dimension of ["productive", "listening", "conversation", "transfer"]) {
      for (const ref of evidence[dimension]) {
        if (!lessonSet.has(ref.lessonId)) fail("G4", "UNREACHABLE", cap.id, `${dimension} em lição fora da Jornada: ${ref.lessonId}`);
      }
    }

    // G5 — escuta independente: kind auditivo (ou turno listen_reply).
    for (const ref of evidence.listening) {
      if (!LISTENING_KINDS.has(ref.kind) && !(ref.kind === "conversation_scene" && ref.nodeId)) {
        fail("G5", "LISTENING_NOT_INDEPENDENT", cap.id, `escuta em kind não auditivo: ${ref.kind}`);
      }
    }

    // G6 — transferência é tarefa situada, posterior à primeira produção.
    const firstProductive = evidence.productive[0];
    for (const ref of evidence.transfer) {
      if (!TRANSFER_KINDS.has(ref.kind)) fail("G6", "TRANSFER_ONLY_DECLARED", cap.id, `transferência em kind não situado: ${ref.kind}`);
      if (firstProductive && ref.lessonIndex <= firstProductive.lessonIndex) {
        fail("G6", "TRANSFER_ONLY_DECLARED", cap.id, `transferência na mesma lição da primeira produção (${ref.lessonId})`);
      }
    }

    // G7 — conversa = cena real (do catálogo ou gerada pelo planner, como as
    // trocas de packet) + turno em que o aluno responde.
    for (const ref of evidence.conversation) {
      if (ref.kind !== "conversation_scene" || !ref.sceneId || !(ref.nodeId || ref.text)) {
        fail("G7", "CONVERSATION_WITHOUT_TURN", cap.id, `conversa sem cena/turno: ${ref.kind}`);
      }
    }
  }

  // G2 — as 11 capacidades desta remessa: READY declarado, READY calculado,
  // contrato estrito, e nenhuma lista paralela.
  const declaredClosure = [...(capabilityModule.RC2_2_9_CLOSURE_CAPABILITY_IDS ?? [])];
  if (declaredClosure.join("|") !== CLOSURE_IDS.join("|")) {
    fail("G2", "CLOSURE_NOT_READY", "RC2_2_9_CLOSURE_CAPABILITY_IDS", `lista divergente: ${declaredClosure.join(", ")}`);
  }
  for (const id of CLOSURE_IDS) {
    const cap = capabilities.find((candidate) => candidate.id === id);
    if (!cap) {
      fail("G2", "CLOSURE_NOT_READY", id, "capacidade sumiu");
      continue;
    }
    const evidence = evidenceById.get(id);
    const computed = capabilityModule.computeCapabilityStatus(cap, available, evidence);
    if (cap.status !== "READY" || computed !== "READY") {
      fail("G2", "CLOSURE_NOT_READY", id, `declarado ${cap.status} · runtime ${computed}`);
    }
    if (capabilityModule.capabilityRuntimeContract(cap) !== "strict") {
      fail("G2", "CLOSURE_NOT_READY", id, "contrato não é o estrito");
    }
    // A1 — ensinar antes de cobrar, item a item.
    for (const row of evidence?.lexical ?? []) {
      if (row.firstTeach && row.firstTest && evidenceModule.compareEvidenceRefs(row.firstTeach, row.firstTest) > 0) {
        fail("A1", "TEACH_BEFORE_TEST", id, `${row.ref} cobrado em ${row.firstTest.lessonId}/M${row.firstTest.pass} antes do ensino em ${row.firstTeach.lessonId}/M${row.firstTeach.pass}`);
      }
      if (!row.firstTeach) fail("A1", "TEACH_BEFORE_TEST", id, `${row.ref} nunca ensinado em runtime`);
    }
  }

  // G4 — passo de fechamento declarado que o planner não entrega é conteúdo morto.
  const planByKey = new Map(plans.map((plan) => [`${plan.lesson.id}#${plan.pass}`, plan]));
  for (const entry of closureEntries) {
    if (!lessonSet.has(entry.lessonId)) {
      fail("G4", "UNREACHABLE", entry.lessonId, `passo de fechamento em lição fora da Jornada (${entry.capabilityIds.join(", ")})`);
      continue;
    }
    for (const pass of entry.passes) {
      const plan = planByKey.get(`${entry.lessonId}#${pass}`);
      if (!plan || !plan.steps.some((step) => sameStep(step, entry.step))) {
        fail("G4", "UNREACHABLE", `${entry.lessonId}/M${pass}`, `o planner não entrega o passo ${entry.step.kind} (${entry.capabilityIds.join(", ")})`);
      }
    }
    // G5 — escuta de fechamento não pode escrever a resposta antes do áudio.
    const step = entry.step;
    if (LISTENING_KINDS.has(step.kind)) {
      const heard = String(step.audioText ?? "").replace(/[？?！!。，,\s]/g, "");
      const written = [step.prompt, step.title, step.situationPt, step.dialoguePrompt].join("|");
      if (!heard) fail("G5", "LISTENING_NOT_INDEPENDENT", entry.lessonId, `${step.kind} sem áudio`);
      else if (written.replace(/[？?！!。，,\s]/g, "").includes(heard)) {
        fail("G5", "LISTENING_NOT_INDEPENDENT", entry.lessonId, `resposta "${step.audioText}" escrita antes do áudio`);
      }
    }
    // A3 — flashcard só aponta para chunk que já existe no registry.
    if (step.kind === "flashcard" && !registry.chunkHanziByRef.has(`chunk:${step.chunkId}`)) {
      fail("A3", "NEW_VOCABULARY", entry.lessonId, `flashcard de chunk inexistente: ${step.chunkId}`);
    }
  }

  // A3 — nenhum hànzì aparece pela primeira vez numa tarefa de prova. Só o
  // flashcard (ensino do registry) e a fala do personagem na cena podem trazer
  // a primeira exposição; produção, escuta e opções não.
  const firstSeen = new Map();
  const closureSignatures = new Set(closureEntries.filter((entry) => entry.step.kind !== "flashcard").map((entry) => JSON.stringify([entry.lessonId, entry.step.kind, entry.step.audioText ?? entry.step.correctAnswer ?? entry.step.answer ?? entry.step.sceneId ?? entry.step.prompt])));
  plans.forEach((plan) => {
    plan.steps.forEach((step, stepIndex) => {
      const signature = JSON.stringify([plan.lesson.id, step.kind, step.audioText ?? step.correctAnswer ?? step.answer ?? step.sceneId ?? step.prompt]);
      const isClosureProof = closureSignatures.has(signature);
      const texts = [];
      if (step.chunkId) texts.push(registry.chunkHanziByRef.get(`chunk:${step.chunkId}`) ?? "");
      if (step.charId) texts.push(registry.charHanziByRef?.get(`char:${step.charId}`) ?? "");
      for (const key of ["hanzi", "text", "audioText", "answer", "correctAnswer", "sourceText", "dialoguePrompt"]) texts.push(step[key] ?? "");
      for (const list of [step.options, step.target, step.targetParts, step.accepts]) texts.push(...(list ?? []));
      for (const line of step.lines ?? []) texts.push(line.hanzi ?? "");
      for (const node of step.nodes ?? []) {
        texts.push(node.hanzi ?? "");
        if (node.interaction) texts.push(node.interaction.correctAnswer ?? "", ...(node.interaction.options ?? []));
      }
      for (const pair of step.pairs ?? []) texts.push(pair.left ?? "", pair.right ?? "");
      const chars = new Set(texts.flatMap(hanziOf));
      for (const char of chars) {
        if (firstSeen.has(char)) continue;
        firstSeen.set(char, { lessonId: plan.lesson.id, pass: plan.pass, stepIndex });
        if (isClosureProof && step.kind !== "conversation_scene") {
          fail("A3", "NEW_VOCABULARY", `${plan.lesson.id}/M${plan.pass}`, `hànzì "${char}" aparece pela primeira vez numa tarefa de prova (${step.kind})`);
        }
      }
    });
  });

  // U — toda copy nova (passos e cenas desta remessa) tem EN.
  const ptStrings = new Set();
  for (const entry of closureEntries) for (const value of learnerFacingPtStrings(entry.step)) ptStrings.add(value);
  for (const scene of dedicatedScenes) {
    if (scene?.title) ptStrings.add(scene.title);
    for (const value of learnerFacingPtStrings(scene ?? {})) ptStrings.add(value);
  }
  for (const value of ptStrings) {
    if (!(value in enOverlay)) fail("U", "EN_PARITY", "instructionGloss.en.json", `sem EN: "${value}"`);
  }

  // J — um único motor de capacidade e de conversa; nenhum proxy de metadado.
  const unique = [
    ["export function scoreCapability", "src/data/conversationCapabilities.ts"],
    ["export function computeCapabilityStatus", "src/data/conversationCapabilities.ts"],
    ["export const CONVERSATION_CAPABILITIES", "src/data/conversationCapabilities.ts"],
    ["export function deriveCapabilityRuntimeEvidence", "src/lib/capabilityRuntimeEvidence.ts"],
    ["export const CONVERSATION_SCENES", "src/data/conversationScenes.ts"],
    ["export function conversationSceneStepFromId", "src/data/conversationScenes.ts"],
  ];
  for (const [marker, home] of unique) {
    const homes = [...sources.srcFiles.entries()].filter(([, content]) => content.includes(marker)).map(([file]) => file);
    if (homes.length !== 1 || homes[0] !== home) {
      const code = marker.includes("CONVERSATION_SCENES") || marker.includes("conversationSceneStepFromId") ? "SECOND_CONVERSATION_ENGINE" : "SECOND_CAPABILITY_ENGINE";
      fail("J", code, marker, `esperado só em ${home}; achado em ${homes.join(", ") || "nenhum lugar"}`);
    }
  }
  const scoring = sliceFunctions(sources.capabilitiesSource, ["scoreCapability", "capabilityReadyGaps", "computeCapabilityStatus"]);
  for (const proxy of ["journeyLessons", "hasConversation", "hasProductivePractice", "transferScenarios", "readinessScore >=", "? 0.8"]) {
    if (scoring.includes(proxy)) fail("J", "PROXY_SCORING", "conversationCapabilities.ts", `a pontuação voltou a ler ${proxy}`);
  }

  return failures;
}

/** Corpo das funções nomeadas (do `export function nome(` até a próxima export). */
export function sliceFunctions(source, names) {
  const parts = [];
  for (const name of names) {
    const at = source.indexOf(`export function ${name}(`);
    if (at < 0) continue;
    const next = source.indexOf("\nexport ", at + 1);
    parts.push(source.slice(at, next < 0 ? undefined : next));
  }
  return parts.join("\n");
}

// ————————————————————————————————————————————————————————————————
// validate:partial-capability-closure — as 11, uma a uma, e o benchmark.
// ————————————————————————————————————————————————————————————————

const norm = (text) => String(text ?? "").replace(/[？?！!。，,\s]/g, "");

function texts(refs) {
  return refs.map((ref) => norm(ref.text));
}

function structureOk(evidence, structure) {
  return evidence?.structural.find((row) => row.structure === structure)?.ok === true;
}

/**
 * Checagens específicas da auditoria G1–G11 (além do contrato das seis
 * dimensões): o que cada capacidade PRECISA provar, não só "tem evidência".
 */
export function runPartialClosureGates({ capabilities, evidenceById, capabilityModule, available }) {
  const { fail, failures } = failer();
  const get = (id) => evidenceById.get(id);
  const need = (condition, id, why) => {
    if (!condition) fail("G", "CAPABILITY_REQUIREMENT", id, why);
  };

  const family = get("talk_family");
  need(["这是我…", "我有…", "我没有…"].every((s) => structureOk(family, s)), "talk_family", "这是我… / 我有… / 我没有… precisam de ensino, produção e uso");
  need(family?.transfer.some((ref) => ref.lessonId !== "l24"), "talk_family", "transferência fora da lição da foto (visit-home)");

  const food = get("order_food");
  need(["我要…", "我想吃…", "不要辣"].every((s) => structureOk(food, s)), "order_food", "我要… / 我想吃… / 不要辣 completos");
  need(food?.listening.length > 0 && food?.conversation.length > 0, "order_food", "escuta e conversa de restaurante");

  const drink = get("order_drink");
  need(["我想喝…", "我要一杯茶"].every((s) => structureOk(drink, s)), "order_drink", "我想喝… / 我要一杯茶 completos");

  const bargain = get("negotiate_basic");
  need(["太贵了", "便宜一点"].every((s) => structureOk(bargain, s)), "negotiate_basic", "太贵了 / 便宜一点 completos");
  need(texts(bargain?.productive ?? []).some((t) => t.includes("便宜一点")), "negotiate_basic", "produção de 便宜一点");

  const pay = get("pay");
  const payRefs = new Set((pay?.lexical ?? []).filter((row) => row.ok).map((row) => row.ref));
  need(["chunk:maidan", "chunk:xianjin", "chunk:weixinzhifu"].every((ref) => payRefs.has(ref)), "pay", "买单 / 现金 / 微信支付 ensinados antes de cobrados");
  need(structureOk(pay, "可以刷卡吗？"), "pay", "可以刷卡吗？ completo");

  const metro = get("use_metro");
  const train = get("use_train");
  need(metro?.listening.length > 0 && train?.listening.length > 0, "use_metro/use_train", "escuta de metrô e de trem");
  const metroTexts = new Set([...texts(metro?.productive ?? []), ...texts(metro?.transfer ?? [])]);
  const trainOwn = [...texts(train?.productive ?? []), ...texts(train?.transfer ?? [])].filter((t) => !metroTexts.has(t));
  need(trainOwn.length > 0, "use_train", "trem não pode ser só a tarefa do metrô com outra palavra");
  need(texts(train?.listening ?? []).some((t) => t.includes("火车")), "use_train", "escuta específica de trem (火车)");

  const help = get("ask_for_help");
  for (const dimension of ["productive", "listening", "conversation"]) {
    need(texts(help?.[dimension] ?? []).some((t) => t.includes("我需要帮助")), "ask_for_help", `${dimension} com 我需要帮助`);
  }

  const repeat = get("ask_repeat");
  need(["请再说一遍", "请慢一点"].every((s) => structureOk(repeat, s)), "ask_repeat", "请再说一遍 / 请慢一点 completos");
  need((repeat?.transfer ?? []).some((ref) => ref.kind === "conversation_repair") || (repeat?.conversation.length ?? 0) > 0, "ask_repeat", "reparo em situação de fala rápida");

  const preference = get("express_preference");
  need(["我喜欢…", "我不喜欢…"].every((s) => structureOk(preference, s)), "express_preference", "我喜欢… / 我不喜欢… completos");
  const objects = new Set(
    [...texts(preference?.productive ?? []), ...texts(preference?.transfer ?? [])]
      .map((t) => t.replace(/^谢谢/, "").replace(/^我(不)?喜欢/, ""))
      .filter(Boolean)
  );
  need(objects.size >= 2, "express_preference", `preferência sobre ≥2 objetos (achados: ${[...objects].join(", ")})`);

  const plan = get("make_simple_plan");
  const planTexts = [...texts(plan?.productive ?? []), ...texts(plan?.transfer ?? [])];
  need(planTexts.some((t) => /明天|今天/.test(t) && t.includes("去")), "make_simple_plan", "plano com quando + destino (明天 … 去 …)");

  // P — benchmark: cada cenário exige as capacidades READY em runtime.
  const survival = capabilityModule.evaluateChinaSurvivalV2(available, evidenceById);
  for (const row of survival) {
    if (!row.communicativeReady) {
      fail("P", "SURVIVAL_NOT_READY", row.scenario, `capacidades sem READY de runtime: ${row.missingCommunicative.join(", ")}`);
    }
  }
  const coverage = capabilityModule.capabilityCoverage(available, evidenceById);
  for (const step of capabilityModule.SIMULATED_CHINA_JOURNEY) {
    for (const id of step.capabilityIds) {
      const row = coverage.find((candidate) => candidate.id === id);
      if (!row || row.computedStatus !== "READY") {
        fail("P", "SURVIVAL_NOT_READY", `${step.step}. ${step.scene}`, `${id} não está READY em runtime`);
      }
    }
  }
  void capabilities;
  return failures;
}
