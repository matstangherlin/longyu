/**
 * RC2.2.8 — validate:email-only-public-account
 * J — Email-only public accounts. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateEmailOnly, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:email-only-public-account", gateEmailOnly);
