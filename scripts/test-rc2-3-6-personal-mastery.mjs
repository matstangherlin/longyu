#!/usr/bin/env node
/**
 * test:rc2-3-6-personal-mastery — mutation testing for gate:rc2-3-6-personal-mastery.
 * Each mutation reintroduces ONE forbidden behaviour; the right code must fire.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMasteryRuntime, runMasteryGate } from "./lib/personal-mastery-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadMasteryRuntime(root);
assert.deepEqual(runMasteryGate(base), [], "estado real precisa passar");

const rules = (r) => ({ rules: r });
const firstLesson = base.lessons[0];

const cases = [
  ["1. ASR success → tom dominado", { speechToEvidence: (e, c) => base.speechToEvidence(e, c).map((x) => (x.skill === "ASR_TEXT" ? { ...x, targetId: "tone:3", targetType: "TONE" } : x)) }, "ASR_NOT_TONE"],
  ["1b. ASR sem teto", rules({ ceiling: { ASR_TEXT: "STABLE" } }), "ASR_NOT_TONE"],
  ["2. falha de microfone → fraqueza de produção", { speechToEvidence: (e, c) => base.speechToEvidence(e, {}).map((x) => ({ ...x, skill: "PRODUCTION_STEP", dimension: "production", result: "FAILURE" })) }, "TECHNICAL_NOT_LEARNING"],
  ["3. reconhecer Hànzì → escrita dominada", rules({ handwritingSkills: ["HANZI_RECOGNITION", "HANZI_TRACE", "HANZI_MEMORY_WRITE", "HANZI_CONTEXT_USE"] }), "RECOGNITION_NOT_WRITING"],
  ["4. traço guiado = escrita de memória", { hanziFormToEvidence: (i) => base.hanziFormToEvidence({ ...i, channel: i.channel === "tracing" ? "memoryWrite" : i.channel }) }, "TRACE_NOT_MEMORY"],
  ["5. sem evidência → fraco", { deriveViewState: (i) => { const s = base.deriveViewState(i); return s.graded === 0 && s.state === "UNSEEN" ? { ...s, state: "NEEDS_PRACTICE" } : s; } }, "UNKNOWN_NOT_WEAK"],
  ["6. uma resposta → estável", rules({ policy: { minGradedForLabel: 1, stableIndependentSuccesses: 1, stableDistinctDays: 1, stableSpanDays: 0, stableDistinctActivities: 1, strongIndependentSuccesses: 1, stableP: 0.6, strongP: 0.55 } }), "ONE_ANSWER_NOT_STABLE"],
  ["7. ajuda ignorada", { makeEvidence: (i) => ({ ...base.makeEvidence(i), independence: 1 }) }, "HELP_LOWERS_INDEPENDENCE"],
  ["8. duplicata contada duas vezes", { appendEvidence: (rec, evs) => { const out = base.appendEvidence({ ...rec, seen: [] }, evs.map((e, i) => ({ ...e, id: `${e.id}#${rec.recent.length}${i}` }))); return out; } }, "IDEMPOTENT"],
  ["9. alvo futuro recomendado", { createPersonalMastery: (input) => base.createPersonalMastery({ ...input, completedLessons: base.lessons }) }, "CURRICULUM_LEAK"],
  ["10. ciclo de pré-requisito no grafo", { graph: { ...base.graph, relations: [...base.graph.relations, { from: "hanzi:水", to: "word:水果", type: "prerequisite_of" }, { from: "word:水果", to: "hanzi:水", type: "prerequisite_of" }] } }, "GRAPH_INTEGRITY"],
  ["11. Jev ligado no runtime do aluno", { learnerSrc: { ...base.learnerSrc, "src/lib/jevClient.ts": "fetch('https://api.typesafe.ai/v1/systemone')" } }, "JEV_ISOLATION"],
  ["11b. flag JEV_RUNTIME_ENABLED true", { budgetPolicy: base.budgetPolicy.replace(/JEV_RUNTIME_ENABLED:\s*false/, "JEV_RUNTIME_ENABLED: true") }, "JEV_ISOLATION"],
  ["12. fala crua no registro", { evidenceFields: [...base.evidenceFields, "transcript"], sanitizeEvidence: (raw) => ({ ...base.sanitizeEvidence(raw), transcript: raw.transcript }) }, "PRIVACY"],
  ["13. legado fabrica escrita à mão", { legacyPriorToEvidence: (items) => items.map((it, i) => base.makeEvidence({ targetId: `hanzi:${it.text[0]}`, targetType: "HANZI", skill: "HANZI_MEMORY_WRITE", result: "SUCCESS", source: { activityId: "legacy" }, attemptKey: `lg${i}`, timestamp: it.lastAt })) }, "LEGACY_NO_FABRICATION"],
  ["14. escolha contextual = produção livre", rules({ ceiling: { CONTEXTUAL_CHOICE: "STABLE" } }), "CHOICE_NOT_FREE_PRODUCTION"],
  ["15. revisão recomenda não ensinado", { practiceTasksToReviewRefs: (tasks, srs) => tasks.map((task) => ({ key: task.targetId, type: "char", itemId: task.targetId, domain: "significado", task })) }, "REVIEW_TAUGHT_ONLY"],
];

let killed = 0;
for (const [label, patch, code] of cases) {
  const got = new Set(runMasteryGate({ ...base, ...patch }).map((f) => f.code));
  assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
void firstLesson;
console.log(`PASS test:rc2-3-6-personal-mastery (${killed}/${cases.length} mutações mortas)`);
