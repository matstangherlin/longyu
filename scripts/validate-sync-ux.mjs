/**
 * RC2.2.8 — validate:sync-ux
 * C — Quiet Sync UX. Contrato de código; os casos de runtime e as mutações moram em
 * scripts/test-*.mjs e em scripts/lib/rc2-2-8-gates.mjs.
 */
import { gateSyncUx, runGate } from "./lib/rc2-2-8-gates.mjs";

runGate("validate:sync-ux", gateSyncUx);
