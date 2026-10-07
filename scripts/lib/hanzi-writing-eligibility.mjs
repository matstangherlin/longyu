/**
 * RC2.3.4A — Hànzì pedagogical eligibility gate (pure checks).
 *
 * A writing exercise (TRACE / COMPLETE / MEMORY_WRITE / CONTEXT_USE) may only
 * exist after `hasLearnerBeenTaught`-backed knowledge says the learner met the
 * character, and memory/production only after recorded progression. Builder
 * SVG is never handwriting authority. `runtime` is injectable so the test
 * script can mutate one rule at a time and require the right code to fire.
 */
import fs from "node:fs";
import path from "node:path";
import { require as tsRequire } from "./v495a-runtime.mjs";

export const UI_WRITING_SITES = {
  "src/features/lesson/steps.tsx": /asWritingStep\(/,
  "src/features/hanzi/HanziTrainingSession.tsx": /eligibleWritingCharacters\(/,
  "src/features/hanzi/writing/HanziWritingLab.tsx": /eligibilityAllowsStage\(/,
};

export function loadEligibilityRuntime(root) {
  const leak = tsRequire("../../src/lib/hanziWriting/curriculumLeak.ts");
  const intro = tsRequire("../../src/lib/hanziWriting/introductions.ts");
  const refs = tsRequire("../../src/lib/hanziWriting/handwritingReference.ts");
  const apply = tsRequire("../../src/lib/hanziWriting/applyWriting.ts");
  const { CHARACTERS } = tsRequire("../../src/data/characters.ts");
  const { HANZI_BUILDERS } = tsRequire("../../src/data/hanziBuilder.ts");
  const { ALL_LESSONS } = tsRequire("../../src/data/journey.ts");
  const { lessonRoundStepsFor } = tsRequire("../../src/features/lesson/lessonTasks.ts");
  const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
  const uiFiles = listWritingRenderSites(root);
  // Real Journey plans, computed once (the planner is the expensive part).
  const journeyPlans = [];
  ALL_LESSONS.forEach((lesson, index) => {
    for (const masteryPass of [1, 2, 3, 4]) {
      try {
        journeyPlans.push({ lesson, index, masteryPass, steps: lessonRoundStepsFor(lesson, { masteryPass }) });
      } catch {
        /* lesson without that pass */
      }
    }
  });
  return {
    journeyPlans,
    CHARACTERS,
    HANZI_BUILDERS,
    ALL_LESSONS,
    lessonRoundStepsFor,
    eligibility: leak.hanziWritingEligibility,
    allows: leak.eligibilityAllowsStage,
    assertEligible: leak.assertWritingEligible,
    eligibleChars: leak.eligibleWritingCharacters,
    exceptions: leak.HANZI_WRITING_PEDAGOGICAL_EXCEPTIONS,
    firstIntroduction: intro.firstIntroductionFor,
    verifiedRefs: refs.VERIFIED_HANDWRITING_WAVE1,
    isVerified: refs.isHandwritingReferenceVerified,
    applyWriting: apply.applyHanziProgressiveWritingToPlan,
    sources: {
      curriculumLeak: read("src/lib/hanziWriting/curriculumLeak.ts"),
      ui: Object.fromEntries(uiFiles.map((rel) => [rel, read(rel)])),
    },
  };
}

/** Every file under src/ that renders <HanziWritingExercise. */
export function listWritingRenderSites(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx$/.test(entry.name) && fs.readFileSync(path.join(root, rel), "utf8").includes("<HanziWritingExercise")) {
        out.push(rel.split(path.sep).join("/"));
      }
    }
  };
  walk("src");
  return out.filter((rel) => rel !== "src/features/hanzi/writing/HanziWritingExercise.tsx").sort();
}

const EMPTY_EVIDENCE = { tracingCorrect: 0, memoryWriteCorrect: 0 };
const TRACED = { tracingCorrect: 1, memoryWriteCorrect: 0 };
const WRITTEN = { tracingCorrect: 2, memoryWriteCorrect: 1 };
const WRITING_STAGES = ["TRACE", "COMPLETE", "MEMORY_WRITE", "CONTEXT_USE"];

export function runEligibilityGate(rt) {
  const failures = [];
  const fail = (code, subject, message) => failures.push({ code, subject, message });
  const charsByGlyph = new Map(rt.CHARACTERS.map((c) => [c.hanzi, c]));
  const lessonIds = rt.ALL_LESSONS.map((l) => l.id);

  // G0 — reference set integrity (11 verified, authorial geometry only).
  if (rt.verifiedRefs.length !== 11) fail("VERIFIED_SET_DRIFT", "references", `${rt.verifiedRefs.length} ≠ 11`);
  for (const ref of rt.verifiedRefs) {
    if (ref.source?.geometrySource !== "HANDWRITING_REFERENCE") {
      fail("BUILDER_AS_GRADING", ref.character, `geometrySource=${ref.source?.geometrySource}`);
    }
  }

  // G1 — fresh learner: nothing is writable.
  for (const ref of rt.verifiedRefs) {
    const e = rt.eligibility({ charId: ref.charId, character: ref.character, knowledge: {}, evidence: EMPTY_EVIDENCE });
    if (e !== "NOT_INTRODUCED") fail("PREMATURE_WRITING_LEAK", ref.character, `aluno novo → ${e}`);
  }
  for (const stage of ["TRACE", "MEMORY_WRITE"]) {
    const pool = rt.eligibleChars(rt.CHARACTERS.filter((c) => rt.isVerified(c.hanzi)), stage, {});
    if (pool.length > 0) fail("PREMATURE_WRITING_LEAK", `pool:${stage}`, `aluno novo vê ${pool.map((c) => c.hanzi).join("")}`);
  }

  // G2 — per verified character: blocked before introduction, open right after,
  // memory only after trace, production only after memory.
  for (const ref of rt.verifiedRefs) {
    const intro = rt.firstIntroduction(ref.charId);
    if (!intro) {
      fail("NO_INTRODUCTION", ref.character, "referência verificada sem lição que ensine o caractere");
      continue;
    }
    const before = lessonIds.slice(0, intro.lessonIndex);
    const after = lessonIds.slice(0, intro.lessonIndex + 1);
    const at = (completedLessons, evidence) =>
      rt.eligibility({ charId: ref.charId, character: ref.character, knowledge: { completedLessons }, evidence });
    if (at(before, WRITTEN) !== "NOT_INTRODUCED") {
      fail("PREMATURE_WRITING_LEAK", ref.character, `elegível antes de ${intro.lessonId}`);
    }
    const traced = at(after, EMPTY_EVIDENCE);
    if (traced !== "TRACE_ELIGIBLE") fail("TAUGHT_NOT_RECOGNIZED", ref.character, `após ${intro.lessonId}: ${traced}`);
    if (rt.allows(traced, "MEMORY_WRITE")) fail("PROGRESSION_SKIP", ref.character, "memória sem traço correto");
    if (at(after, TRACED) !== "MEMORY_ELIGIBLE") fail("PROGRESSION_SKIP", ref.character, "traço correto não abre memória");
    if (rt.allows(at(after, TRACED), "CONTEXT_USE")) fail("PROGRESSION_SKIP", ref.character, "produção sem memória");
    if (at(after, WRITTEN) !== "PRODUCTION_ELIGIBLE") fail("PROGRESSION_SKIP", ref.character, "memória correta não abre produção");
    const learned = rt.eligibility({ charId: ref.charId, character: ref.character, knowledge: { learnedCharIds: [ref.charId] }, evidence: EMPTY_EVIDENCE });
    if (learned !== "TRACE_ELIGIBLE") fail("TAUGHT_NOT_RECOGNIZED", ref.character, `learnedChars ignorado: ${learned}`);
  }

  // G3 — builder-supported or taught characters without verified data never grade.
  const builderGlyphs = new Set(rt.HANZI_BUILDERS.map((b) => b.character));
  for (const glyph of builderGlyphs) {
    const char = charsByGlyph.get(glyph);
    if (!char || rt.isVerified(glyph)) continue;
    const e = rt.eligibility({ charId: char.id, character: glyph, knowledge: { learnedCharIds: [char.id] }, evidence: WRITTEN });
    if (e !== "INTRODUCED_NO_WRITING_DATA") fail("BUILDER_AS_GRADING", glyph, `builder sem referência → ${e}`);
    for (const stage of WRITING_STAGES) {
      const r = rt.assertEligible({ charId: char.id, character: glyph, stage, learnedCharIds: [char.id], evidence: WRITTEN });
      if (r.ok) fail("BUILDER_AS_GRADING", glyph, `${stage} liberado sem referência verificada`);
    }
  }

  // G4 — Journey runtime: every writing overlay the planner emits is eligible
  // for a learner who completed exactly the lessons before this one.
  let journeyWritingSteps = 0;
  const journeyWriting = [];
  for (const { lesson, index, masteryPass, steps } of rt.journeyPlans) {
    const completedLessons = lessonIds.slice(0, index);
    const result = rt.applyWriting({ lessonId: lesson.id, masteryPass, steps: structuredClone(steps), completedLessons });
    for (const step of result.steps) {
      if (!step.hanziWritingMode || step.hanziWritingMode === "none") continue;
      journeyWritingSteps += 1;
      const glyph = step.hanzi ?? step.targetHanzi;
      journeyWriting.push({ lessonId: lesson.id, masteryPass, character: glyph, stage: step.hanziWritingStage, mode: step.hanziWritingMode });
      const charId = step.handwritingCharId ?? charsByGlyph.get(glyph)?.id ?? glyph;
      const r = rt.assertEligible({ charId, character: glyph, stage: step.hanziWritingStage, completedLessons });
      if (!r.ok) fail("PREMATURE_WRITING_LEAK", `${lesson.id}/M${masteryPass}`, `${glyph} ${step.hanziWritingStage}: ${r.code}`);
    }
  }

  // G5 — every UI site that renders a writing exercise is gated by the contract.
  const knownSites = Object.keys(UI_WRITING_SITES);
  for (const [rel, src] of Object.entries(rt.sources.ui)) {
    const rule = UI_WRITING_SITES[rel];
    if (!rule) fail("UI_UNGATED", rel, "novo ponto que renderiza <HanziWritingExercise sem contrato registrado");
    else if (!rule.test(src)) fail("UI_UNGATED", rel, `não passa pela elegibilidade (${rule})`);
  }
  for (const rel of knownSites) {
    if (!(rel in rt.sources.ui)) fail("UI_SITE_MISSING", rel, "site registrado não renderiza mais escrita");
  }

  // G6 — no informal allowlists; exceptions are typed and never graded.
  if (/completedLessons\??\.includes\(\s*["']/.test(rt.sources.curriculumLeak)) {
    fail("INFORMAL_ALLOWLIST", "curriculumLeak.ts", "lição/caractere fixo no código em vez do índice derivado");
  }
  for (const ex of rt.exceptions) {
    if (ex.graded !== false || ex.stage !== "TRACE" || !ex.id || !ex.rationale) {
      fail("UNTYPED_EXCEPTION", ex.id ?? "(sem id)", "exceção pedagógica precisa ser TRACE, graded:false, com id e rationale");
    }
  }

  return { failures, journeyWritingSteps, journeyWriting };
}

/** Audit rows for the report: every character that is taught, builder-backed or verified. */
export function eligibilityAuditRows(rt) {
  const builderGlyphs = new Set(rt.HANZI_BUILDERS.map((b) => b.character));
  const rows = [];
  for (const char of rt.CHARACTERS) {
    const intro = rt.firstIntroduction(char.id);
    const builder = builderGlyphs.has(char.hanzi);
    const verified = rt.isVerified(char.hanzi);
    if (!intro && !builder && !verified) continue;
    rows.push({
      character: char.hanzi,
      charId: char.id,
      taught: intro ? `${intro.lessonId} (${intro.stepKind})` : "NOT_IN_JOURNEY",
      builder,
      handwritingReference: verified ? "VERIFIED" : "HANDWRITING_DATA_REQUIRED",
      trace: verified ? (intro ? "after introduction" : "NOT_INTRODUCED (no lesson)") : "—",
      memory: verified ? "after 1 correct trace" : "—",
      production: verified ? "after 1 correct memory write" : "—",
      firstEligibleLocation: verified && intro ? `Hànzì hub Traçar / Lab after ${intro.lessonId}` : verified ? "none" : "recognition/assembly only",
      introIndex: intro?.lessonIndex ?? Number.MAX_SAFE_INTEGER,
    });
  }
  return rows.sort((a, b) => Number(b.handwritingReference === "VERIFIED") - Number(a.handwritingReference === "VERIFIED") || a.introIndex - b.introIndex);
}
