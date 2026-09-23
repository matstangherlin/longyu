/**
 * RC2.2.8 — validate:hanzi-atlas-study-sets
 * F — Atlas study sets. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateAtlasStudySets, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:hanzi-atlas-study-sets", gateAtlasStudySets);
