#!/usr/bin/env node
/**
 * test:capability-runtime-evidence — RC2.2.9 mutation testing.
 *
 * Cada mutação quebra UMA prova real (registry, plano do aluno, metadado,
 * cena, fonte) e exige que o gate certo falhe. Estado real: zero falhas.
 */
import assert from "node:assert/strict";
import { loadCapabilityGateContext } from "./lib/capability-evidence-runtime.mjs";
import { runCapabilityRuntimeGates } from "./lib/capability-closure-gates.mjs";

const base = loadCapabilityGateContext();
assert.deepEqual(runCapabilityRuntimeGates(base), [], "o estado real precisa passar sem falhas");

const norm = (text) => String(text ?? "").replace(/[？?！!。，,\s]/g, "");

/** Contexto mutável: clona o que a mutação toca e re-deriva a evidência. */
function mutate(fn) {
  const ctx = {
    ...base,
    plans: structuredClone(base.plans),
    capabilities: structuredClone(base.capabilities),
    closureEntries: structuredClone(base.closureEntries),
    registry: {
      chunkHanziByRef: new Map(base.registry.chunkHanziByRef),
      charHanziByRef: base.registry.charHanziByRef,
      knownWords: base.registry.knownWords,
    },
    enOverlay: { ...base.enOverlay },
    sources: { capabilitiesSource: base.sources.capabilitiesSource, srcFiles: new Map(base.sources.srcFiles) },
    dedicatedScenes: structuredClone(base.dedicatedScenes),
  };
  const options = fn(ctx) ?? {};
  if (!options.keepEvidence) {
    ctx.evidenceById = base.evidenceModule.deriveCapabilityRuntimeEvidence({
      capabilities: ctx.capabilities,
      plans: ctx.plans,
      registry: ctx.registry,
    });
  }
  if (options.dropEvidenceFor) ctx.evidenceById = new Map([...ctx.evidenceById].filter(([id]) => id !== options.dropEvidenceFor));
  return runCapabilityRuntimeGates(ctx);
}

function cap(ctx, id) {
  return ctx.capabilities.find((item) => item.id === id);
}

/** Remove (ou transforma) os passos do plano que satisfazem `match`. */
function editSteps(ctx, match, edit = () => null) {
  for (const plan of ctx.plans) {
    plan.steps = plan.steps.flatMap((step) => {
      if (!match(step, plan)) return [step];
      const next = edit(step, plan);
      return next ? [next] : [];
    });
  }
}

const outputs = (step) =>
  [step.answer, step.correctAnswer, (step.target ?? []).join(""), (step.targetParts ?? []).join(""), ...(step.accepts ?? [])].map(norm);
const says = (step, phrase) => outputs(step).some((text) => text.includes(phrase));
const PRODUCTIVE = new Set(["sentence_build", "produce", "write", "free_production", "transfer_task", "reverse_recall", "sentence_transform", "conversation_repair"]);
const AUDIO = new Set(["listen_select", "audio_to_action", "audio_discrimination", "dictation"]);

const cases = [
  [
    "1. remover um requiredChunk do registry",
    (ctx) => { ctx.registry.chunkHanziByRef.delete("chunk:buyaola"); },
    ["METADATA_CLAIM_UNPROVEN", "DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "2. requiredChunk apontando para chunk inexistente",
    (ctx) => { cap(ctx, "order_food").requiredChunks.push("chunk:naoexiste"); },
    ["METADATA_CLAIM_UNPROVEN"],
  ],
  [
    "3. primeiro ensino depois da primeira cobrança",
    (ctx) => {
      editSteps(ctx, (step, plan) => plan.lesson.id === "l26b" && step.kind === "flashcard" && step.chunkId === "buyaola");
      const late = ctx.plans.find((plan) => plan.lesson.id === "p7-imersao-casa-amigo" && plan.pass === 4);
      late.steps.push({ kind: "flashcard", chunkId: "buyaola" });
    },
    ["TEACH_BEFORE_TEST"],
  ],
  [
    "4. remover a tarefa produtiva",
    (ctx) => editSteps(ctx, (step) => PRODUCTIVE.has(step.kind) && (says(step, "便宜一点") || says(step, "太贵了"))),
    ["DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "5. tarefa produtiva virar múltipla escolha",
    (ctx) =>
      editSteps(
        ctx,
        (step) => PRODUCTIVE.has(step.kind) && (says(step, "便宜一点") || says(step, "太贵了")),
        (step) => ({ ...step, kind: "contextual_choice", options: [step.correctAnswer ?? step.answer, "再见"] })
      ),
    ["DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "6. remover a tarefa de escuta",
    (ctx) => editSteps(ctx, (step) => AUDIO.has(step.kind) && /便宜一点/.test(norm(step.audioText))),
    ["DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "7. áudio opcional com a resposta escrita antes",
    (ctx) => {
      const leak = (step) => ({ ...step, prompt: `Ouça: 便宜一点. ${step.prompt ?? ""}` });
      editSteps(ctx, (step) => AUDIO.has(step.kind) && norm(step.audioText) === "便宜一点", leak);
      const entry = ctx.closureEntries.find((item) => item.step.audioText === "便宜一点");
      entry.step = leak(entry.step);
    },
    ["LISTENING_NOT_INDEPENDENT"],
  ],
  [
    "8. remover a cena de conversa",
    (ctx) => editSteps(ctx, (step) => step.kind === "conversation_scene" && step.sceneId === "gostos-na-casa"),
    ["DECLARED_READY_WITHOUT_EVIDENCE", "METADATA_CLAIM_UNPROVEN"],
  ],
  [
    "9. cena sem resposta do aluno",
    (ctx) =>
      editSteps(
        ctx,
        (step) => step.kind === "conversation_scene" && step.sceneId === "gostos-na-casa",
        (step) => ({ ...step, checkpoint: undefined, nodes: step.nodes.map(({ interaction, ...node }) => node) })
      ),
    ["DECLARED_READY_WITHOUT_EVIDENCE", "METADATA_CLAIM_UNPROVEN"],
  ],
  [
    "10. remover a tarefa de transferência",
    (ctx) => editSteps(ctx, (step, plan) => plan.lesson.id === "p7-imersao-casa-amigo" && says(step, "我没有姐姐")),
    ["DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "11. transferência só como transferScenarios",
    (ctx) => editSteps(ctx, (step, plan) => plan.lesson.id === "p7-imersao-casa-amigo" && says(step, "我没有姐姐")),
    ["METADATA_CLAIM_UNPROVEN"],
  ],
  [
    "12. transferência inalcançável",
    (ctx) => {
      const entry = ctx.closureEntries.find((item) => item.lessonId === "p7-imersao-casa-amigo" && item.capabilityIds.includes("talk_family"));
      entry.lessonId = "licao-fora-da-jornada";
      editSteps(ctx, (step, plan) => plan.lesson.id === "p7-imersao-casa-amigo" && says(step, "我没有姐姐"));
    },
    ["UNREACHABLE"],
  ],
  [
    "13. declarar READY sem evidência",
    () => ({ dropEvidenceFor: "pay" }),
    ["DECLARED_READY_WITHOUT_EVIDENCE"],
  ],
  [
    "14. deixar PARTIAL apesar de toda a evidência",
    (ctx) => { cap(ctx, "ask_repeat").status = "PARTIAL"; },
    ["STATUS_MISMATCH", "CLOSURE_NOT_READY"],
  ],
  [
    "15. vocabulário novo só na prova",
    (ctx) => {
      const step = { kind: "reverse_recall", title: "Café", situationPt: "Peça um café.", answer: "我要咖啡", correctAnswer: "我要咖啡", accepts: ["我要咖啡"] };
      ctx.closureEntries.push({ lessonId: "l26b", passes: [4], capabilityIds: ["order_drink"], reason: "mutação", step });
      ctx.plans.find((plan) => plan.lesson.id === "l26b" && plan.pass === 4).steps.push(step);
      ctx.enOverlay["Café"] = "Coffee";
      ctx.enOverlay["Peça um café."] = "Order a coffee.";
    },
    ["NEW_VOCABULARY"],
  ],
  [
    "16. quebrar paridade PT/EN",
    (ctx) => { delete ctx.enOverlay["Pechincha"]; },
    ["EN_PARITY"],
    { keepEvidence: true },
  ],
  [
    "17. segundo motor de capacidade",
    (ctx) => {
      ctx.sources.srcFiles.set("src/lib/capabilityEngineV2.ts", "export function scoreCapability() { return 1; }\n");
    },
    ["SECOND_CAPABILITY_ENGINE"],
    { keepEvidence: true },
  ],
  [
    "18. segundo motor de conversa",
    (ctx) => {
      ctx.sources.srcFiles.set("src/data/conversationScenesV2.ts", "export const CONVERSATION_SCENES = [];\n");
    },
    ["SECOND_CONVERSATION_ENGINE"],
    { keepEvidence: true },
  ],
  [
    "19. proxy de escuta volta (journeyLessons.length > 0 ? 0.8 : 0)",
    (ctx) => {
      ctx.sources.capabilitiesSource = ctx.sources.capabilitiesSource.replace(
        "const listeningCoverage = present(evidence?.listening);",
        "const listeningCoverage = cap.journeyLessons.length > 0 ? 0.8 : 0;"
      );
    },
    ["PROXY_SCORING"],
    { keepEvidence: true },
  ],
];

let killed = 0;
for (const [label, fn, codes, options = {}] of cases) {
  const failures = mutate((ctx) => {
    const result = fn(ctx);
    return { ...options, ...(result ?? {}) };
  });
  const got = new Set(failures.map((item) => item.code));
  for (const code of codes) {
    assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  }
  killed += 1;
  console.log(`KILLED ${label}: ${codes.join(" + ")}`);
}
console.log(`PASS test:capability-runtime-evidence (${killed}/${cases.length} mutações mortas)`);
