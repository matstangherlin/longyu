#!/usr/bin/env node
/** test:partial-capability-closure — exigências específicas das 11 e do benchmark. */
import assert from "node:assert/strict";
import { loadCapabilityGateContext } from "./lib/capability-evidence-runtime.mjs";
import { runCapabilityRuntimeGates, runPartialClosureGates } from "./lib/capability-closure-gates.mjs";

const base = loadCapabilityGateContext();
const available = new Set(base.registry.chunkHanziByRef.keys());
assert.deepEqual(runPartialClosureGates({ ...base, available }), [], "estado real precisa passar");

function withEvidence(edit) {
  const evidenceById = new Map([...base.evidenceById].map(([id, ev]) => [id, structuredClone(ev)]));
  edit(evidenceById);
  return runPartialClosureGates({ ...base, evidenceById, available });
}

const cases = [
  ["G1 família sem 我没有…", (ev) => { ev.get("talk_family").structural.find((row) => row.structure === "我没有…").ok = false; }, "CAPABILITY_REQUIREMENT"],
  ["G1 família sem transferência fora da foto", (ev) => { ev.get("talk_family").transfer = ev.get("talk_family").transfer.map((ref) => ({ ...ref, lessonId: "l24" })); }, "CAPABILITY_REQUIREMENT"],
  ["G2 restaurante sem 不要辣", (ev) => { ev.get("order_food").structural.find((row) => row.structure === "不要辣").ok = false; }, "CAPABILITY_REQUIREMENT"],
  ["G4 pechincha sem produção de 便宜一点", (ev) => { ev.get("negotiate_basic").productive = ev.get("negotiate_basic").productive.filter((ref) => !ref.text.includes("便宜一点")); }, "CAPABILITY_REQUIREMENT"],
  ["G5 pagamento sem 现金 ensinado", (ev) => { ev.get("pay").lexical.find((row) => row.ref === "chunk:xianjin").ok = false; }, "CAPABILITY_REQUIREMENT"],
  [
    "G7 trem = tarefa do metrô com outra palavra",
    (ev) => {
      const metro = ev.get("use_metro");
      const train = ev.get("use_train");
      train.productive = metro.productive.slice(0, 2);
      train.transfer = metro.transfer.slice(0, 2);
    },
    "CAPABILITY_REQUIREMENT",
  ],
  ["G7 trem sem escuta de 火车", (ev) => { ev.get("use_train").listening = []; }, "CAPABILITY_REQUIREMENT"],
  ["G8 ajuda sem escuta", (ev) => { ev.get("ask_for_help").listening = []; }, "CAPABILITY_REQUIREMENT"],
  ["G9 repetir sem 请慢一点", (ev) => { ev.get("ask_repeat").structural.find((row) => row.structure === "请慢一点").ok = false; }, "CAPABILITY_REQUIREMENT"],
  [
    "G10 preferência sobre um objeto só",
    (ev) => {
      const pref = ev.get("express_preference");
      pref.productive = pref.productive.map((ref) => ({ ...ref, text: "我喜欢茶" }));
      pref.transfer = pref.transfer.map((ref) => ({ ...ref, text: "我喜欢茶" }));
    },
    "CAPABILITY_REQUIREMENT",
  ],
  [
    "G11 plano que é só despedida",
    (ev) => {
      const plan = ev.get("make_simple_plan");
      plan.productive = plan.productive.map((ref) => ({ ...ref, text: "明天见" }));
      plan.transfer = plan.transfer.map((ref) => ({ ...ref, text: "明天见" }));
    },
    "CAPABILITY_REQUIREMENT",
  ],
  ["P benchmark: restaurante sem pagar", (ev) => { ev.delete("pay"); }, "SURVIVAL_NOT_READY"],
  ["P benchmark: transporte sem metrô", (ev) => { ev.get("use_metro").listening = []; }, "SURVIVAL_NOT_READY"],
];
for (const [label, edit, code] of cases) {
  const failures = withEvidence(edit);
  assert.ok(failures.some((item) => item.code === code), `"${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`);
  console.log(`KILLED ${label}: ${code}`);
}

// K1 — uma das 11 deixada PARTIAL com toda a evidência: o gate de runtime pega.
const partial = { ...base, capabilities: structuredClone(base.capabilities) };
partial.capabilities.find((cap) => cap.id === "make_simple_plan").status = "PARTIAL";
const k1 = runCapabilityRuntimeGates(partial).map((item) => item.code);
assert.ok(k1.includes("CLOSURE_NOT_READY") && k1.includes("STATUS_MISMATCH"), `PARTIAL com evidência deveria falhar; veio ${k1.join(", ")}`);
console.log("KILLED G2 make_simple_plan deixada PARTIAL: CLOSURE_NOT_READY + STATUS_MISMATCH");

console.log(`PASS test:partial-capability-closure (${cases.length + 1} mutações)`);
