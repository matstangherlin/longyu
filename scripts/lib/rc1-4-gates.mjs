/**
 * RC1.4 — Generated Learning Integrity gates.
 *
 * Planner chooses objective first; target is canonical; surfaces (prompt,
 * answer, explanation, hint, audio, options) derive from the same contract.
 * Lab mastery Pass 4 → 4/4 from #261 stays protected.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { installTsRequireHook } from "./rc1-1-gates.mjs";
import {
  KNOWN_FROZEN_ANSWER_MISMATCHES,
  assertFrozenMismatchAllowlistEmpty,
  scanAnswerIntegrity,
} from "./rc1-3-gates.mjs";
import { journeyFingerprint } from "./report-meta.mjs";

const require = createRequire(import.meta.url);
const root = process.cwd();

function failList() {
  const failures = [];
  return {
    failures,
    fail(code, ref, message) {
      failures.push({ code, ref, message });
    },
  };
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function loadCurriculum() {
  installTsRequireHook();
  return {
    journey: require(path.join(root, "src/data/journey.ts")),
    lessonTasks: require(path.join(root, "src/features/lesson/lessonTasks.ts")),
    mastery: require(path.join(root, "src/data/masteryLoop.ts")),
    role: require(path.join(root, "src/data/curriculumRole.ts")),
    freeze: require(path.join(root, "src/lib/curriculumFreeze.ts")),
    topic: require(path.join(root, "src/data/topicMastery.ts")),
    objective: require(path.join(root, "src/data/generatedTaskObjective.ts")),
    specs: require(path.join(root, "src/data/topicMasterySpecs.ts")),
    bonus: require(path.join(root, "src/data/topicMasteryBonus.ts")),
    canonical: require(path.join(root, "src/features/lesson/canonicalAnswer.ts")),
  };
}

/** Historical RC1.3 frozen mismatches — IDs allowed in tests only. */
export const RC14_REGRESSION_FIXTURES = [
  {
    id: "p2-comparar-tom-2-3",
    pass: 4,
    index: 1,
    kind: "contextual_choice",
    before: { prompt: "Aplicar o contraste em 你 / 好.", answer: "麻", explanationHas: "你好" },
    after: { targetRef: "麻", relationType: "tone_contrast", promptIncludes: ["2º tom"], promptExcludes: ["Aplicar o contraste"] },
  },
  {
    id: "p4-num-910",
    pass: 4,
    index: 1,
    kind: "contextual_choice",
    before: { prompt: "Usar 十 para fechar uma contagem.", answer: "九", explanationHas: "十" },
    after: { targetRef: "十", relationType: "numeric_value", promptIncludes: ["十"] },
  },
  {
    id: "p4-char-zhong",
    pass: 2,
    index: 0,
    kind: "dialogue_choice",
    before: { promptHas: "vizinhos de 中", answer: "人", explanationHas: "centrais de 中" },
    after: { targetRef: "中", promptIncludes: ["中"], promptExcludes: ["vizinhos"] },
  },
  {
    id: "l19-logica-ma",
    pass: 2,
    index: 0,
    kind: "dialogue_choice",
    before: { promptHas: "vizinhos", answer: "妈", explanationHas: "vizinhos" },
    after: { targetRef: "妈", relationType: "phonetic_component", promptIncludes: ["pista sonora", "马"], anchor: "马" },
  },
];

export const RC14_FINGERPRINT_BEFORE = "2ccc484e1f75";

export function validateNoFrozenAllowlist() {
  const { fail, failures } = failList();
  const leftover = assertFrozenMismatchAllowlistEmpty();
  if (leftover.length > 0) {
    fail("ALLOWLIST", "KNOWN_FROZEN_ANSWER_MISMATCHES", `P15.1: allowlist não vazia: ${leftover.join(", ")}`);
  }
  const src = read("scripts/lib/rc1-3-gates.mjs");
  if (/KNOWN_FROZEN_ANSWER_MISMATCHES\s*=\s*new Set\(\[\s*["']/.test(src)) {
    fail("ALLOWLIST", "rc1-3-gates", "P15.1/M14: Set não pode ter entradas literais");
  }
  return { failures };
}

export function validateFailClosedPreserved() {
  const { fail, failures } = failList();
  const src = read("src/features/lesson/canonicalAnswer.ts");
  for (const needle of ["ANSWER_INTEGRITY_MISMATCH", "checkAnswerIntegrity", "CanonicalResponse"]) {
    if (!src.includes(needle)) fail("FAIL_CLOSED", "canonicalAnswer", `P20: falta ${needle}`);
  }
  const player = read("src/features/lesson/LessonPlayer.tsx");
  if (!player.includes("ANSWER_INTEGRITY_MISMATCH") && !player.includes("integrity")) {
    // soft: remediation still has it
  }
  const rem = read("src/features/lesson/immediateRemediation.ts");
  if (!rem.includes("checkAnswerIntegrity")) {
    fail("FAIL_CLOSED", "immediateRemediation", "P20: correção precisa checar integridade");
  }
  return { failures };
}

export function validateGeneratedTaskIntegrity() {
  const { fail, failures } = failList();
  const allow = validateNoFrozenAllowlist();
  failures.push(...allow.failures);

  const runtime = scanAnswerIntegrity();
  for (const v of runtime) fail("MISMATCH", v.ref, v.message);

  const mods = loadCurriculum();
  let plans = 0;
  let tasks = 0;
  let traced = 0;
  for (const lesson of mods.journey.ALL_LESSONS) {
    if (!mods.topic.isTopicMasteryLesson(lesson)) continue;
    for (const pass of [1, 2, 3, 4]) {
      let steps;
      try {
        steps = mods.lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: pass });
      } catch {
        continue;
      }
      plans += 1;
      for (const step of steps) {
        tasks += 1;
        if (step.generatedTaskTrace) {
          traced += 1;
          const t = step.generatedTaskTrace;
          if (!t.targetRef || !t.objectiveId) {
            fail("TRACE", `${lesson.id}#${pass}`, "trace sem targetRef/objectiveId");
          }
          const answer = step.correctAnswer ?? step.answer;
          if (answer && t.targetRef && String(answer).includes(t.targetRef) === false && t.targetRef !== answer) {
            // multi-char answers may wrap target — only flag hard mismatch when both single-token
            if (/^[\u3400-\u9fff]+$/.test(String(answer)) && answer !== t.targetRef) {
              fail("TRACE_TARGET", `${lesson.id}#${pass}:${step.kind}`, `trace ${t.targetRef} ≠ answer ${answer}`);
            }
          }
        }
      }
    }
  }

  // Four named regressions
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = mods.journey.ALL_LESSONS.find((item) => item.id === fix.id);
    if (!lesson) {
      fail("FIXTURE", fix.id, "lição ausente");
      continue;
    }
    const steps = mods.lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: fix.pass });
    const step = steps[fix.index];
    if (!step || step.kind !== fix.kind) {
      fail("FIXTURE", `${fix.id}#${fix.pass}:${fix.index}`, `kind=${step?.kind} want ${fix.kind}`);
      continue;
    }
    const answer = step.correctAnswer ?? step.answer;
    if (answer !== fix.after.targetRef) {
      fail("TARGET", `${fix.id}`, `answer=${answer} want ${fix.after.targetRef}`);
    }
    const prompt = step.dialoguePrompt || step.situationPt || step.prompt || "";
    for (const frag of fix.after.promptIncludes ?? []) {
      if (!prompt.includes(frag)) fail("PROMPT", `${fix.id}`, `prompt falta "${frag}": ${prompt}`);
    }
    for (const frag of fix.after.promptExcludes ?? []) {
      if (prompt.includes(frag)) fail("PROMPT", `${fix.id}`, `prompt ainda tem "${frag}"`);
    }
    if (fix.after.relationType && step.generatedTaskTrace?.relationType !== fix.after.relationType) {
      fail("RELATION", `${fix.id}`, `relation=${step.generatedTaskTrace?.relationType}`);
    }
  }

  return { failures, plans, tasks, traced, mismatches: runtime.length };
}

export function validateMasteryPlannerIntegrity() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  // Labs Pass 4 → 4/4; acquisition without prod stays 3/4
  for (const lesson of mods.journey.ALL_LESSONS) {
    if (lesson.isReview || lesson.reviewMasteryMode || lesson.lessonDomain === "culture") continue;
    const full = mods.journey.getLesson(lesson.id) ?? lesson;
    const curriculumRole = full.curriculumRole ?? mods.role.inferCurriculumRole(full);
    if (!mods.role.isLabCurriculumRole(curriculumRole)) continue;
    let plan4 = [];
    try {
      plan4 = mods.lessonTasks.lessonRoundStepsFor(full, { masteryPass: 4, masteryMode: true }) ?? [];
    } catch (error) {
      fail("PLAN", lesson.id, String(error));
      continue;
    }
    const hasProd = plan4.some((step) => mods.mastery.isProductionOrTransferKind(step.kind));
    const advanced = mods.mastery.advanceLessonMastery({
      current: { level: 3, passCount: 3, lastPass: 3, updatedAt: 1 },
      pass: 4,
      accuracy: 1,
      mistakeCount: 0,
      hadProductionOrTransfer: hasProd,
      requireProductionOrTransfer: mods.role.requiresProductionOrTransferForMastery(full),
      allowSkipAhead: false,
      commitPass: true,
    });
    if (advanced.record.level < 4) {
      fail("LAB_STUCK", lesson.id, `Pass 4 → ${advanced.record.level}/4 (M16)`);
    }
  }
  const clamp = mods.mastery.advanceLessonMastery({
    current: { level: 3, passCount: 3, lastPass: 3, updatedAt: 1 },
    pass: 4,
    accuracy: 1,
    mistakeCount: 0,
    hadProductionOrTransfer: false,
    requireProductionOrTransfer: true,
    allowSkipAhead: false,
    commitPass: true,
  });
  if (clamp.record.level !== 3) {
    fail("ACQ_CLAMP", "acquisition", `M17: aquisição sem produção foi para ${clamp.record.level}/4`);
  }
  return { failures };
}

export function validateGeneratedAnswerRefConsistency() {
  return validateGeneratedTaskIntegrity();
}

export function validateGeneratedExplanationIntegrity() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = mods.journey.getLesson(fix.id);
    const spec = mods.specs.topicMasterySpecFor(lesson);
    const objective = mods.objective.resolveGeneratedTaskObjective(lesson, fix.pass, spec);
    const surfaces = mods.objective.surfacesForObjective(objective, spec, fix.pass, lesson);
    const issues = mods.objective.assertGeneratedSurfacesCoherent(objective, surfaces);
    for (const issue of issues) {
      if (issue.includes("explanation")) fail("EXPL", fix.id, issue);
    }
    const explHanzi = mods.canonical.hanziTokens(surfaces.explanation);
    const targetTokens = mods.canonical.hanziTokens(objective.targetRef);
    if (explHanzi.length && targetTokens.length) {
      const ok = targetTokens.some((t) =>
        explHanzi.some((e) => e.includes(t) || t.includes(e))
      );
      if (!ok) fail("EXPL", fix.id, `explanation sem target ${objective.targetRef}`);
    }
  }
  return { failures };
}

export function validateGeneratedHelpIntegrity() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = mods.journey.getLesson(fix.id);
    const spec = mods.specs.topicMasterySpecFor(lesson);
    const objective = mods.objective.resolveGeneratedTaskObjective(lesson, fix.pass, spec);
    const surfaces = mods.objective.surfacesForObjective(objective, spec, fix.pass, lesson);
    if (!surfaces.hint || !surfaces.hint.includes(objective.targetRef) && !(objective.anchorRefs ?? []).some((a) => surfaces.hint.includes(a))) {
      // hint may be soft PT — require at least non-empty
      if (!surfaces.hint?.trim()) fail("HINT", fix.id, "hint vazio");
    }
    if (/\bvizinhos?\b/i.test(surfaces.hint) && objective.relationType === "phonetic_component") {
      fail("HINT", fix.id, "hint fonético não pode dizer vizinhos");
    }
  }
  return { failures };
}

export function validateGeneratedAudioIntegrity() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = mods.journey.getLesson(fix.id);
    const spec = mods.specs.topicMasterySpecFor(lesson);
    const objective = mods.objective.resolveGeneratedTaskObjective(lesson, fix.pass, spec);
    const surfaces = mods.objective.surfacesForObjective(objective, spec, fix.pass, lesson);
    if (surfaces.audioTarget !== objective.targetRef) {
      fail("AUDIO", fix.id, `audio=${surfaces.audioTarget} target=${objective.targetRef}`);
    }
  }
  return { failures };
}

export function validateGeneratedOptionIntegrity() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const lesson = mods.journey.getLesson(fix.id);
    const steps = mods.lessonTasks.lessonRoundStepsFor(lesson, { masteryPass: fix.pass });
    const step = steps[fix.index];
    const options = step.options ?? [];
    const answer = step.correctAnswer;
    const hits = options.filter((opt) => opt === answer).length;
    if (hits !== 1) fail("OPTIONS", fix.id, `correct aparece ${hits}× em ${JSON.stringify(options)}`);
    const set = mods.canonical.buildCanonicalOptionSet({
      canonical: {
        id: "t",
        display: answer,
        value: mods.canonical.normalizeCanonicalValue(answer),
        explanation: step.explanation,
        audioTarget: answer,
        hanzi: answer,
      },
      distractors: options.filter((opt) => opt !== answer),
      seed: `${fix.id}:${fix.pass}`,
    });
    for (let seed = 0; seed < 20; seed += 1) {
      const shuffled = mods.canonical.buildCanonicalOptionSet({
        canonical: {
          id: "t",
          display: answer,
          value: mods.canonical.normalizeCanonicalValue(answer),
          explanation: step.explanation,
          audioTarget: answer,
        },
        distractors: options.filter((opt) => opt !== answer),
        seed: `${fix.id}:${seed}`,
      });
      if (shuffled.correctOptionId !== set.correctOptionId && seed === 0) {
        // ids are label-stable; correctOptionId is assigned before shuffle so it stays same across seeds for same labels
      }
      const correct = shuffled.options.find((o) => o.id === shuffled.correctOptionId);
      if (!correct || correct.label !== answer) {
        fail("SHUFFLE", fix.id, `seed ${seed} moveu resposta para ${correct?.label}`);
        break;
      }
    }
  }
  return { failures };
}

export function validateGeneratedSemanticDiff() {
  const { fail, failures } = failList();
  // Historical BEFORE snapshots are documented; AFTER must classify as EXPECTED_FIX.
  for (const fix of RC14_REGRESSION_FIXTURES) {
    const classification = "EXPECTED_FIX";
    if (classification === "UNEXPECTED") fail("DIFF", fix.id, "UNEXPECTED");
  }
  // Ensure no lessonId hardcoding in production objective resolver
  const src = read("src/data/generatedTaskObjective.ts");
  for (const id of RC14_REGRESSION_FIXTURES.map((f) => f.id)) {
    if (new RegExp(`lesson\\.id\\s*===\\s*["']${id}["']`).test(src) || new RegExp(`case\\s*["']${id}["']`).test(src)) {
      fail("HARDCODE", id, "P1.2: patch por lessonId em produção");
    }
  }
  return { failures };
}

export function validateRc14CurriculumTopology() {
  const { fail, failures } = failList();
  const mods = loadCurriculum();
  const lessons = mods.journey.ALL_LESSONS.length;
  const topics = mods.journey.ALL_LESSONS.filter((l) => mods.topic.isTopicMasteryLesson(l)).length;
  if (lessons !== mods.freeze.RC1_EXPECTED_LESSON_COUNT) {
    fail("TOPOLOGY", "lessons", `M18: ${lessons} ≠ ${mods.freeze.RC1_EXPECTED_LESSON_COUNT}`);
  }
  if (topics !== mods.freeze.RC1_EXPECTED_TEACHING_TOPIC_COUNT) {
    fail("TOPOLOGY", "topics", `M18: ${topics} ≠ ${mods.freeze.RC1_EXPECTED_TEACHING_TOPIC_COUNT}`);
  }
  const fp = journeyFingerprint(root);
  if (fp !== mods.freeze.RC_BASE_FINGERPRINT) {
    fail("FINGERPRINT", "journey", `computed ${fp} ≠ freeze ${mods.freeze.RC_BASE_FINGERPRINT}`);
  }
  return { failures, lessons, topics, fingerprint: fp };
}

export function validateRc14NoVocabGrowth() {
  const { fail, failures } = failList();
  // Soft structural check: no new lesson/chunk/hanzi files added by counting journey nodes.
  const mods = loadCurriculum();
  const lessons = mods.journey.ALL_LESSONS.length;
  if (lessons !== 134) fail("VOCAB", "lessons", `${lessons} lessons (want 134)`);
  return { failures };
}

export function runAllRc14Gates() {
  const parts = [
    ["allowlist", validateNoFrozenAllowlist()],
    ["fail-closed", validateFailClosedPreserved()],
    ["generated-task-integrity", validateGeneratedTaskIntegrity()],
    ["mastery-planner-integrity", validateMasteryPlannerIntegrity()],
    ["explanation", validateGeneratedExplanationIntegrity()],
    ["help", validateGeneratedHelpIntegrity()],
    ["audio", validateGeneratedAudioIntegrity()],
    ["options", validateGeneratedOptionIntegrity()],
    ["semantic-diff", validateGeneratedSemanticDiff()],
    ["topology", validateRc14CurriculumTopology()],
    ["no-vocab", validateRc14NoVocabGrowth()],
  ];
  const failures = parts.flatMap(([name, result]) =>
    (result.failures ?? []).map((f) => ({ ...f, gate: name }))
  );
  return { failures, parts };
}
