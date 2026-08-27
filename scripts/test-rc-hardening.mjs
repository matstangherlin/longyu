/**
 * V4.7.4 — contratos de hardening (hotkeys Firefox, sentinelas, RC).
 * Não marca HUMAN PASS. Não toca Stripe Live nem produção.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const hotkeys = read("src/lib/useExerciseHotkeys.tsx");
assert(hotkeys.includes("optionIndexFromKeyboardEvent"), "hotkeys leem key e code");
assert(hotkeys.includes("Digit1"), "DigitN para Firefox/Playwright");
assert(hotkeys.includes('document.addEventListener("keydown", handleKeyDown, true)'), "listener em capture no document");
assert(!hotkeys.includes("window.addEventListener(\"keydown\", handleKeyDown)"), "não depende só de window keydown");
assert(hotkeys.includes("optionChoiceDomProps"), "props estáveis data-option-index / data-selected");

const mobile = read("e2e/mobile-device.spec.ts");
assert(mobile.includes("Digit1"), "e2e Firefox pressiona Digit1");
assert(mobile.includes('data-option-index="0"'), "e2e afirma data-selected, não só border-accent");

const player = read("src/features/lesson/LessonPlayer.tsx");
assert(player.includes("Preparando atividades"), "copy de preparing ainda existe para o watchdog");
assert(/setPlanReady|planReady/.test(player), "player tem planReady (não congela para sempre)");

const coordinator = read("src/services/cloudSyncCoordinator.ts");
assert(coordinator.includes("CLOUD_SYNC_TIMEOUT_MS"), "sync tem timeout — não loading infinito");

const ci = read(".github/workflows/ci.yml");
assert(ci.includes("test:e2e:firefox"), "CI ainda roda Firefox");
assert(
  ci.includes("informativo") || ci.includes("continue-on-error"),
  "falhas não-determinísticas de motor extra continuam documentadas no job"
);

const rc = read("docs/reports/closed-beta-release-candidate.md");
assert(rc.includes("CODE_READY"), "RC report tem CODE_READY");
assert(rc.includes("STAGING_READY"), "RC report tem STAGING_READY");
assert(rc.includes("PHYSICAL_QA_READY"), "RC report tem PHYSICAL_QA_READY");
assert(rc.includes("PAYMENTS_READY"), "RC report tem PAYMENTS_READY");
assert(rc.includes("SECURITY_READY"), "RC report tem SECURITY_READY");
assert(rc.includes("READY_FOR_CLOSED_BETA_BR"), "RC report tem READY_FOR_CLOSED_BETA_BR");
assert(rc.includes("NOT_READY"), "closed beta permanece NOT_READY");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(rc), "READY_FOR_CLOSED_BETA_BR não pode ser PASS nesta remessa");
assert(!rc.includes("HUMAN PASS"), "relatório RC não inventa HUMAN PASS");

const physical = read("docs/reports/physical-qa-contract.md");
assert(physical.includes("Android"), "contrato físico Android");
assert(physical.includes("iPhone"), "contrato físico iPhone");
assert(physical.includes("NOT_RUN"), "contrato físico começa NOT_RUN");
assert(!physical.includes("HUMAN PASS"), "contrato físico não nasce com HUMAN PASS");

const stripe = read("docs/reports/stripe-test-mode-checklist.md");
assert(stripe.includes("Test Mode"), "checklist Stripe Test Mode");
assert(!stripe.includes("sk_live_"), "checklist não inclui chave Live operacional");
assert(stripe.includes("NOT_RUN"), "pagamentos reais ainda NOT_RUN");

const stale = read("docs/reports/stale-pr-audit.md");
assert(stale.includes("#195"), "auditoria inclui #195");
assert(stale.includes("DO_NOT_MERGE") || stale.includes("#117"), "auditoria recusa merge de #117");

if (failures.length) {
  console.error("FAIL test:rc-hardening:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: test:rc-hardening — contratos Firefox, sentinelas e RC report.");
