/**
 * RC2.2.8 — validate:culture-guide-voice
 * A — Culture Dragon Voice. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateCultureGuideVoice, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:culture-guide-voice", gateCultureGuideVoice);
