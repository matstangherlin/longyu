#!/usr/bin/env node
/**
 * test:hanzi-writing-eligibility — RC2.3.4A mutation testing.
 * Each mutation breaks ONE rule of the eligibility contract and requires the
 * gate to fail with the right code. Real state: zero failures.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEligibilityRuntime, runEligibilityGate } from "./lib/hanzi-writing-eligibility.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = loadEligibilityRuntime(root);
assert.deepEqual(runEligibilityGate(base).failures, [], "o estado real precisa passar sem falhas");

const RANK = ["NOT_INTRODUCED", "INTRODUCED_NO_WRITING_DATA", "TRACE_ELIGIBLE", "MEMORY_ELIGIBLE", "PRODUCTION_ELIGIBLE"];
const withRt = (patch) => ({ ...base, ...patch, sources: { ...base.sources, ...(patch.sources ?? {}) } });
const ui = (rel, from, to) => ({ ui: { ...base.sources.ui, [rel]: base.sources.ui[rel].replaceAll(from, to) } });

const cases = [
  [
    "1. referência verificada vira permissão (ignora 'ensinado')",
    withRt({
      eligibility: (input) => {
        const e = base.eligibility({ ...input, knowledge: { learnedCharIds: [input.charId] } });
        return e;
      },
    }),
    "PREMATURE_WRITING_LEAK",
  ],
  [
    "2. memória sem traço correto",
    withRt({
      eligibility: (input) => {
        const e = base.eligibility(input);
        return e === "TRACE_ELIGIBLE" ? "MEMORY_ELIGIBLE" : e;
      },
    }),
    "PROGRESSION_SKIP",
  ],
  [
    "3. builder SVG tratado como referência",
    withRt({
      eligibility: (input) => {
        const e = base.eligibility(input);
        return e === "INTRODUCED_NO_WRITING_DATA" ? "TRACE_ELIGIBLE" : e;
      },
    }),
    "BUILDER_AS_GRADING",
  ],
  [
    "4. assert libera estágio sem dados",
    withRt({ assertEligible: (input) => ({ ok: true, stage: input.stage, eligibility: "TRACE_ELIGIBLE" }) }),
    "BUILDER_AS_GRADING",
  ],
  [
    "5. laboratório sem elegibilidade",
    withRt({ sources: ui("src/features/hanzi/writing/HanziWritingLab.tsx", "eligibilityAllowsStage(", "alwaysOpen(") }),
    "UI_UNGATED",
  ],
  [
    "6. treino sem elegibilidade",
    withRt({ sources: ui("src/features/hanzi/HanziTrainingSession.tsx", "eligibleWritingCharacters(", "allVerified(") }),
    "UI_UNGATED",
  ],
  [
    "7. novo ponto de escrita sem contrato",
    withRt({ sources: { ui: { ...base.sources.ui, "src/features/arcade/WritingBlitz.tsx": "<HanziWritingExercise />" } } }),
    "UI_UNGATED",
  ],
  [
    "8. allowlist informal volta",
    withRt({
      sources: {
        curriculumLeak: `${base.sources.curriculumLeak}\nif (completedLessons?.includes("p1-primeiros-hanzi")) return true;`,
      },
    }),
    "INFORMAL_ALLOWLIST",
  ],
  [
    "9. exceção pedagógica avaliada",
    withRt({ exceptions: [{ id: "preview", stage: "TRACE", graded: true, scope: "x", rationale: "y" }] }),
    "UNTYPED_EXCEPTION",
  ],
  [
    "10. índice de introdução perde lições",
    withRt({ eligibility: (input) => base.eligibility({ ...input, knowledge: { ...input.knowledge, completedLessons: [] } }) }),
    "TAUGHT_NOT_RECOGNIZED",
  ],
  [
    "11. planner injeta escrita antes do ensino",
    withRt({
      applyWriting: (input) => {
        const out = base.applyWriting(input);
        if (input.lessonId !== base.ALL_LESSONS[0].id || input.masteryPass !== 3) return out;
        const ref = base.verifiedRefs[0];
        return {
          ...out,
          steps: [
            ...out.steps,
            { kind: "hanzi_build", hanzi: ref.character, hanziWritingMode: "trace", hanziWritingStage: "TRACE", handwritingCharId: ref.charId },
          ],
        };
      },
    }),
    "PREMATURE_WRITING_LEAK",
  ],
  [
    "12. produção liberada só com traço",
    withRt({
      eligibility: (input) => {
        const e = base.eligibility(input);
        return e === "MEMORY_ELIGIBLE" ? "PRODUCTION_ELIGIBLE" : e;
      },
    }),
    "PROGRESSION_SKIP",
  ],
];

let killed = 0;
for (const [label, rt, code] of cases) {
  const got = new Set(runEligibilityGate(rt).failures.map((f) => f.code));
  assert.ok(got.has(code), `mutação "${label}" deveria falhar com ${code}; veio ${[...got].join(", ") || "nada"}`);
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
assert.equal(RANK.length, 5);
console.log(`PASS test:hanzi-writing-eligibility (${killed}/${cases.length} mutações mortas)`);
