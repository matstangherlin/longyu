#!/usr/bin/env node
/**
 * V4.9.2B — Parte S: a cápsula entrega o aluno ao exercício, não o contrário.
 *
 * Duas perguntas, e a primeira é mais sutil do que parece.
 *
 * 1. Um exercício obrigatório pode cobrar algo que só a cápsula ensina, antes
 *    de a cápsula estar acessível?
 *
 *    A versão ingênua desta regra — "nenhum graded antes da cápsula" — reprova
 *    dado correto. `chunk:nihao` é cobrado no tópico 0 e a cápsula de Pinyin só
 *    abre depois do tópico 0; mas 你好 já é ensinado inline no próprio tópico 0,
 *    e a cápsula apenas reforça. Reprovar isso seria proibir reforço.
 *
 *    O que importa é dependência: um alvo cujo ÚNICO ensino é a cápsula não
 *    pode ser cobrado antes de ela abrir. Um alvo com ensino inline anterior à
 *    cobrança está coberto — a cápsula vem por cima. Por isso a regra compara
 *    três posições, não duas: primeira cobrança, primeiro ensino inline e
 *    abertura da cápsula.
 *
 * 2. A cápsula declara algum alvo que não existe no manifesto?
 *
 *    Um `knowledgeTargets` com id morto não quebra nada em runtime — a cápsula
 *    toca igual. Ele quebra em silêncio o gate de prerequisite, que passa a
 *    exigir um alvo que ninguém jamais atinge, e o autor descobre pelo aluno
 *    travado. É o tipo de erro que só um validador pega.
 */
import { createRequire } from "node:module";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-v492b-handoff-"));
const MASTERY_PASSES = [1, 2, 3, 4];

try {
  const program = ts.createProgram(
    [
      "src/data/foundationTopicPlans.ts",
      "src/data/pedagogicalSpine.ts",
      "src/data/journeyOrchestrator.ts",
      "src/data/lessonCapsules.ts",
      "src/data/journey.ts",
      "src/data/coreInstructionSlots.ts",
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
      jsx: ts.JsxEmit.ReactJSX,
    }
  );
  if (program.emit().emitSkipped) throw new Error("TypeScript emit failed");
  await mkdir(path.join(outDir, "src/i18n/overlays"), { recursive: true });
  await copyFile(
    path.join(rootDir, "src/i18n/overlays/instructionGloss.en.json"),
    path.join(outDir, "src/i18n/overlays/instructionGloss.en.json")
  );

  const spine = require(path.join(outDir, "src/data/pedagogicalSpine.js"));
  const plans = require(path.join(outDir, "src/data/foundationTopicPlans.js"));
  const orchestrator = require(path.join(outDir, "src/data/journeyOrchestrator.js"));
  const capsuleModule = require(path.join(outDir, "src/data/lessonCapsules.js"));
  const journey = require(path.join(outDir, "src/data/journey.js"));
  const slots = require(path.join(outDir, "src/data/coreInstructionSlots.js"));

  const failures = [];
  const fail = (code, detail) => failures.push({ code, ...detail });

  const topicOrder = journey.ALL_LESSONS.map((lesson) => lesson.id);
  const topicIndex = new Map(topicOrder.map((id, index) => [id, index]));
  const manifest = new Set(spine.KNOWLEDGE_TARGET_MANIFEST.map((target) => target.id));

  // ── Linha do tempo do conteúdo obrigatório ───────────────────────────────
  // Só os planos autorados entram: são o que o aluno é OBRIGADO a fazer.
  // Boosters são RECOMMENDED/OPTIONAL e por definição não cobram ninguém.
  const firstGraded = new Map();
  const firstTaughtInline = new Map();

  for (let index = 0; index < topicOrder.length; index += 1) {
    const topicId = topicOrder[index];
    for (const pass of MASTERY_PASSES) {
      const steps = plans.foundationAuthoredPlanFor(topicId, pass);
      if (!steps?.length) continue;
      for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
        const evidence = steps[stepIndex].pedagogicalEvidence;
        if (!evidence) continue;
        const at = { index, topicId, pass, step: stepIndex + 1 };
        for (const id of evidence.knowledgeTargetIds ?? []) {
          if (evidence.graded) {
            if (!firstGraded.has(id)) firstGraded.set(id, at);
          } else if (!firstTaughtInline.has(id)) {
            // Passo não avaliado que toca o alvo: exposição inline.
            firstTaughtInline.set(id, at);
          }
        }
      }
    }
  }

  const before = (a, b) =>
    a.index !== b.index ? a.index < b.index : a.pass !== b.pass ? a.pass < b.pass : a.step < b.step;

  /**
   * O veredito, isolado das estruturas do repositório.
   *
   * Hoje nenhum alvo de cápsula chega aqui como dependente: `teach-before-test`
   * garante ensino inline antes de toda cobrança, então o ramo que reprova fica
   * inerte sobre o dado real. Regra que nunca roda é regra que ninguém sabe se
   * funciona — por isso o veredito é uma função pura, exercitada logo abaixo
   * com linhas do tempo sintéticas. O dado real passa pelo mesmo caminho.
   */
  const handoffVerdict = (graded, inline, opensAt) => {
    if (!graded) return "OK_NOT_GRADED";
    if (inline && before(inline, graded)) return "OK_TAUGHT_INLINE";
    return before(graded, opensAt) ? "GRADED_BEFORE_REQUIRED_CAPSULE" : "OK_CAPSULE_FIRST";
  };

  const at = (index, pass = 1, step = 1) => ({ index, pass, step });
  const selfTest = [
    // Cobrado no tópico 0; a cápsula só abre no fim do tópico 2. Sem ensino
    // inline, o aluno encontra a pergunta antes da única aula que a responde.
    [handoffVerdict(at(0), undefined, at(2, Infinity, Infinity)), "GRADED_BEFORE_REQUIRED_CAPSULE"],
    // Mesmo caso, mas o tópico 0 já ensinava antes de cobrar: reforço, não dívida.
    [handoffVerdict(at(0, 1, 3), at(0, 1, 1), at(2, Infinity, Infinity)), "OK_TAUGHT_INLINE"],
    // Ensino inline existe, porém depois da cobrança — não cobre nada.
    [handoffVerdict(at(0, 1, 1), at(0, 1, 3), at(2, Infinity, Infinity)), "GRADED_BEFORE_REQUIRED_CAPSULE"],
    // Cápsula abre no fim do tópico 0 e a cobrança vem no tópico 1: ordem certa.
    [handoffVerdict(at(1), undefined, at(0, Infinity, Infinity)), "OK_CAPSULE_FIRST"],
    // Cobrança e abertura no mesmo tópico: a cápsula fecha o tópico, a
    // cobrança acontece dentro dele — logo, antes.
    [handoffVerdict(at(0, 4, 9), undefined, at(0, Infinity, Infinity)), "GRADED_BEFORE_REQUIRED_CAPSULE"],
    // Alvo que nenhum exercício obrigatório cobra.
    [handoffVerdict(undefined, undefined, at(0, Infinity, Infinity)), "OK_NOT_GRADED"],
  ];
  selfTest.forEach(([actual, expected], index) => {
    if (actual !== expected) fail("HANDOFF_RULE_SELF_TEST_FAILED", { case: index + 1, expected, actual });
  });

  // ── Cápsulas ─────────────────────────────────────────────────────────────
  const capsuleNodes = orchestrator.JOURNEY_NODES.filter((node) => node.type === "LESSON_CAPSULE");
  const nodeByCapsuleId = new Map(capsuleNodes.map((node) => [node.sourceId, node]));

  let checkedTargets = 0;
  let dependentTargets = 0;

  for (const capsule of capsuleModule.LESSON_CAPSULES) {
    // Regra 2 — alvos declarados precisam existir.
    for (const target of capsule.knowledgeTargets ?? []) {
      checkedTargets += 1;
      if (!manifest.has(target)) fail("CAPSULE_TARGET_NOT_IN_MANIFEST", { capsule: capsule.id, target });
    }
    if (!topicIndex.has(capsule.topicId)) {
      fail("CAPSULE_TOPIC_NOT_IN_JOURNEY", { capsule: capsule.id, topicId: capsule.topicId });
    }

    // V4.9.3 — passaram a existir DUAS colocações válidas, e a nova é a mais
    // forte. Uma cápsula pode ser ancorada por um `JourneyNode` (`afterTopicId`,
    // o mecanismo da V4.9.1) ou preencher um `CoreInstructionSlot`, que a põe
    // ANTES do tópico e é verificado por `validate:first20-instruction-order`.
    //
    // Este gate continua exigindo que toda cápsula tenha lugar; ele só deixou
    // de assumir que "ter lugar" significa "estar em JOURNEY_NODES". Uma
    // cápsula em slot não é órfã — é currículo.
    const slot = slots.slotForCapsuleId(capsule.id);
    const node = nodeByCapsuleId.get(capsule.id);
    if (!node && !slot) {
      fail("CAPSULE_WITHOUT_PLACEMENT", { capsule: capsule.id });
      continue;
    }
    if (!node) {
      // A ordenação de um slot é auditada por outro gate, com uma linha do
      // tempo que este aqui não constrói. Duplicar a checagem aqui daria duas
      // respostas para a mesma pergunta, e um dia elas discordariam.
      if (slot.placement !== "BEFORE_TOPIC" && slot.placement !== "BETWEEN_PASSES") {
        fail("SLOT_PLACEMENT_DOES_NOT_PRECEDE_GRADING", {
          capsule: capsule.id,
          placement: slot.placement,
        });
      }
      continue;
    }
    if (node.afterTopicId && !topicIndex.has(node.afterTopicId)) {
      fail("CAPSULE_ANCHORED_TO_UNKNOWN_TOPIC", { capsule: capsule.id, afterTopicId: node.afterTopicId });
      continue;
    }
    for (const target of node.allowedKnowledgeTargetIds ?? []) {
      if (!manifest.has(target)) fail("NODE_TARGET_NOT_IN_MANIFEST", { node: node.id, target });
    }
    for (const target of node.requiredKnowledgeTargetIds ?? []) {
      if (!manifest.has(target)) fail("NODE_PREREQUISITE_NOT_IN_MANIFEST", { node: node.id, target });
    }

    if (node.priority !== "CORE") continue;

    // A cápsula abre DEPOIS do tópico âncora — logo, no fim dele.
    const anchorIndex = node.afterTopicId ? topicIndex.get(node.afterTopicId) : -1;
    const opensAt = { index: anchorIndex, topicId: node.afterTopicId, pass: Infinity, step: Infinity };

    // Uma cápsula CORE que só abre depois do tópico que ela ensina chega tarde.
    const servesIndex = topicIndex.get(capsule.topicId);
    if (servesIndex !== undefined && anchorIndex >= servesIndex) {
      fail("CORE_CAPSULE_OPENS_AFTER_ITS_OWN_TOPIC", {
        capsule: capsule.id,
        opensAfter: node.afterTopicId,
        serves: capsule.topicId,
      });
    }

    // Regra 1 — cobrança obrigatória antes da cápsula que ensina.
    for (const target of capsule.knowledgeTargets ?? []) {
      const graded = firstGraded.get(target);
      const verdict = handoffVerdict(graded, firstTaughtInline.get(target), opensAt);
      if (verdict === "OK_TAUGHT_INLINE" || verdict === "OK_NOT_GRADED") continue;

      // Chegou aqui: a cápsula é o primeiro (ou único) ensino do alvo.
      dependentTargets += 1;
      if (verdict === "GRADED_BEFORE_REQUIRED_CAPSULE") {
        fail("GRADED_BEFORE_REQUIRED_CAPSULE", {
          capsule: capsule.id,
          target,
          gradedAt: `${graded.topicId}/M${graded.pass}/step${graded.step}`,
          capsuleOpensAfter: node.afterTopicId ?? "—",
        });
      }
    }
  }

  if (failures.length) {
    console.error("FAIL validate:capsule-pedagogy-handoff");
    for (const failure of failures) console.error(` - ${failure.code}: ${JSON.stringify(failure)}`);
    process.exitCode = 1;
  } else {
    console.log(
      `PASS validate:capsule-pedagogy-handoff — ${capsuleModule.LESSON_CAPSULES.length} cápsula(s), ` +
        `${checkedTargets} alvo(s) no manifesto, ${dependentTargets} dependente(s) de cápsula sem cobrança antecipada.`
    );
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}
