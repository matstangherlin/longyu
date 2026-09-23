/**
 * RC2.2.8 — validate:review-learning-ux
 * D/E — Review = learning. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateReviewLearningUx, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:review-learning-ux", gateReviewLearningUx);
