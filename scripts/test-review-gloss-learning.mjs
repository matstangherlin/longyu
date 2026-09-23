/**
 * RC2.2.8 — test:review-gloss-learning
 *
 * D: consulta permitida e registrada na revisão; bloqueada em prova.
 * D7: acerto assistido nunca sugere Easy (teto Hard) e nunca vale como
 * recordação independente. Mutações 8–12.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gateReviewLearningUx, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const {
  ASSISTED_GRADE_CEILING,
  atlasHrefForHanzi,
  capAssistedGrade,
  isGlossLookupAllowed,
  isIndependentRecall,
  reviewSuggestedGrade,
  tracksReviewAssistance,
} = rcRequire("../../src/lib/reviewLookup.ts");

it(cases, "D1/D8 — revisão e remediação da Jornada permitem consulta", () => {
  for (const surface of ["review", "journey_review", "journey_remediation"]) {
    assert.equal(isGlossLookupAllowed(surface), true, surface);
    assert.equal(tracksReviewAssistance(surface), true, surface);
  }
});

it(cases, "D5/K12 — prova bloqueia consulta (mutações 11/12)", () => {
  for (const surface of ["placement", "phase_challenge", "module_challenge", "graded_assessment"]) {
    assert.equal(isGlossLookupAllowed(surface), false, surface);
  }
});

it(cases, "P1.2/D7 — com consulta, sugestão nunca é Easy (rápido, médio, lento)", () => {
  for (const elapsedMs of [1000, 12000, 30000]) {
    const grade = reviewSuggestedGrade({ correct: true, elapsedMs, assisted: true });
    assert.notEqual(grade, "easy");
    assert.equal(grade, "hard", "preferência: Hard");
  }
});

it(cases, "D7 — sem consulta a política antiga continua", () => {
  assert.equal(reviewSuggestedGrade({ correct: true, elapsedMs: 1000, assisted: false }), "easy");
  assert.equal(reviewSuggestedGrade({ correct: true, elapsedMs: 12000, assisted: false }), "good");
  assert.equal(reviewSuggestedGrade({ correct: false, elapsedMs: 1000, assisted: true }), "again");
});

it(cases, "D6.2 mutação 10 — nota manual Easy/Good com consulta cai para Hard", () => {
  assert.equal(ASSISTED_GRADE_CEILING, "hard");
  assert.equal(capAssistedGrade("easy", true), "hard");
  assert.equal(capAssistedGrade("good", true), "hard");
  assert.equal(capAssistedGrade("again", true), "again");
  assert.equal(capAssistedGrade("easy", false), "easy");
  assert.equal(isIndependentRecall({ correct: true, assisted: true }), false);
  assert.equal(isIndependentRecall({ correct: true, assisted: false }), true);
});

it(cases, "F4 — 'Ver no Atlas' usa a rota canônica", () => {
  assert.equal(atlasHrefForHanzi("你好"), "/hanzi/atlas?char=%E4%BD%A0");
  assert.equal(atlasHrefForHanzi("abc"), null);
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateReviewLearningUx(src), []));
expectMutationCaught(cases, "8. Hànzì da revisão continua pequeno", gateReviewLearningUx,
  mutate(src, "revisao", '"text-5xl leading-tight text-ink sm:text-6xl"', '"text-3xl text-ink"'));
expectMutationCaught(cases, "9. consulta bloqueada na revisão", gateReviewLearningUx,
  mutate(src, "revisao", 'activation="hover-hold"\n      />', 'activation="hover-hold"\n        examMode={!revealed}\n      />'));
expectMutationCaught(cases, "10. consulta conta como recordação independente", gateReviewLearningUx,
  mutate(src, "revisao", "capAssistedGrade(g, reviewAssistanceUsed)", "g"));
expectMutationCaught(cases, "11. nivelamento permite consulta", gateReviewLearningUx,
  mutate(src, "comecar", 'import { Button } from "../../components/ui/primitives";', 'import { Button } from "../../components/ui/primitives";\nimport { GlossText } from "../../components/hanzi/GlossText";'));
expectMutationCaught(cases, "12. Phase Challenge permite consulta", gateReviewLearningUx,
  mutate(src, "phaseChallengePage", "<MandarinHelpProvider disabled>", "<MandarinHelpProvider>"));
expectMutationCaught(cases, "E3. opção menor que 56px", gateReviewLearningUx,
  mutate(src, "revisao", '"relative min-h-14 rounded-xl border px-3 py-2 text-center', '"relative min-h-10 rounded-xl border px-3 py-2 text-center'));

runCases("test:review-gloss-learning", cases);
