/**
 * RC2.2.8 — validate:phase-challenge-economy
 * K — Phase Challenge economy. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gatePhaseChallengeEconomy, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:phase-challenge-economy", gatePhaseChallengeEconomy);
