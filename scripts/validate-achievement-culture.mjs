/**
 * RC2.2.8 — validate:achievement-culture
 * G/L/M — medalhas culturais. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateAchievementCulture, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:achievement-culture", gateAchievementCulture);
