/**
 * V4.7.4 — contratos de hardening (hotkeys Firefox, sentinelas, RC).
 * Não marca PASS físico. Não toca Stripe Live nem produção.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { LONGYU_EDGE_FUNCTIONS } from "./lib/edge-functions.mjs";

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
assert(hotkeys.includes("data-option-label"), "opções publicam data-option-label semântico");

const mobile = read("e2e/mobile-device.spec.ts");
assert(mobile.includes("Digit1"), "e2e Firefox pressiona Digit1");
assert(mobile.includes('data-option-index="0"'), "e2e afirma data-selected, não só border-accent");
assert(mobile.includes("advanceToChoiceOptions"), "Firefox avança o passo imitate antes do atalho");

const sentinels = read("e2e/historical-bug-sentinels.spec.ts");
assert(sentinels.includes("advanceToChoiceOptions"), "sentinela listen_select espera opções de verdade");
assert(sentinels.includes("data-option-label"), "unicidade por atributo semântico, não CSS");
assert(sentinels.includes("assertNoStickyBarOverlap"), "sticky usa geometria");
assert(sentinels.includes("Preparando atividades"), "sentinela de freeze");
assert(sentinels.includes("transfer_task"), "sentinela de leak de transferência");
assert(sentinels.includes("data-mission-surface"), "sentinela de missão");
assert(sentinels.includes("data-topic-progress"), "sentinela 1/4");
assert(sentinels.includes("/qa/review"), "sentinela Review grande");
assert(sentinels.includes("data-review-page"), "Review usa atributo semântico, não só h1");
assert(sentinels.includes("sync-error"), "sentinela loading de sync");
assert(sentinels.includes("data-cloud-sync-status"), "sync error usa atributo semântico na /conta");
assert(sentinels.includes("data-conta-page"), "sync error afirma ContaPage, não AccountPage");
assert(read("src/features/revisao/RevisaoPage.tsx").includes("data-review-page"), "RevisaoPage publica data-review-page");
assert(read("src/features/conta/ContaPage.tsx").includes("data-cloud-sync-status"), "ContaPage publica status de sync");

const helpers = read("e2e/helpers.ts");
assert(helpers.includes("advanceToChoiceOptions"), "helper compartilhado para listen_select");

const mandarin = read("src/components/hanzi/MandarinText.tsx");
assert(mandarin.includes("data-hanzi"), " MandarinText expõe data-hanzi");
assert(mandarin.includes("data-pinyin"), "MandarinText expõe data-pinyin");

const player = read("src/features/lesson/LessonPlayer.tsx");
assert(player.includes("Preparando atividades"), "copy de preparing ainda existe para o watchdog");
assert(/setPlanReady|planReady/.test(player), "player tem planReady (não congela para sempre)");
assert(player.includes("Continuar Jornada") && player.includes("Voltar à Jornada"), "CTA de vitória permanece no player");

const coordinator = read("src/services/cloudSyncCoordinator.ts");
assert(coordinator.includes("CLOUD_SYNC_TIMEOUT_MS"), "sync tem timeout — não loading infinito");
assert(coordinator.includes("isQaTestStateActive"), "sync recusa TEST STATE");

const store = read("src/lib/store.ts");
assert(store.includes("if ((state.rewardHistory ?? []).some((entry) => entry.id === rewardId)) return false"), "grantLessonReward é idempotente");
assert(/version:\s*20/.test(store), "persist version 20");

const placement = read("src/lib/placement/types.ts");
assert(placement.includes("export const PLACEMENT_VERSION = 2"), "Placement v2");
const snapshot = read("src/lib/progressSnapshot.ts");
assert(snapshot.includes("PROGRESS_SNAPSHOT_SCHEMA_VERSION = 1"), "schema snapshot 1");

const identity = read("src/lib/releaseCandidate.ts");
assert(identity.includes('LONGYU_RC_VERSION = "v4.7.4-rc.1"'), "RC version");
assert(identity.includes("EXPECTED_PLACEMENT_VERSION = 2"), "RC placement 2");
assert(identity.includes("EXPECTED_PROGRESS_SCHEMA_VERSION = 1"), "RC schema 1");
assert(identity.includes("EXPECTED_STORE_VERSION = 20"), "RC store 20");
for (const slug of LONGYU_EDGE_FUNCTIONS) {
  assert(identity.includes(`"${slug}"`), `RC lista Edge ${slug}`);
}

const mastery = read("e2e/topic-mastery-hardening.spec.ts");
assert(mastery.includes("goForward"), "invariante forward");
assert(mastery.includes("dblclick"), "invariante double click");
assert(mastery.includes("rewardHistory"), "invariante reward não duplica");
assert(mastery.includes("rehidratação mock"), "logout/login mock");

const ci = read(".github/workflows/ci.yml");
assert(ci.includes("test:e2e:firefox"), "CI ainda roda Firefox");
assert(
  ci.includes("informativo") || ci.includes("continue-on-error"),
  "falhas não-determinísticas de motor extra continuam documentadas no job"
);
assert(ci.includes("E2E WebKit"), "WebKit permanece passo próprio");
assert(/E2E WebKit[\s\S]{0,200}continue-on-error/.test(ci), "WebKit continue-on-error só no passo");

const rc = read("docs/reports/closed-beta-release-candidate.md");
for (const field of [
  "CODE_READY",
  "CROSS_BROWSER_READY",
  "STAGING_READY",
  "AUTH_READY",
  "PLACEMENT_READY",
  "SYNC_READY",
  "PHYSICAL_QA_READY",
  "PAYMENTS_READY",
  "SECURITY_READY",
  "SECURITY_STAGING_READY",
  "READY_FOR_CLOSED_BETA_BR",
]) {
  assert(rc.includes(field), `RC report tem ${field}`);
}
assert(rc.includes("NOT_READY"), "closed beta permanece NOT_READY");
assert(rc.includes("BLOCKED_BY_INFRASTRUCTURE") || rc.includes("INACTIVE"), "staging permanece bloqueado");
assert(!/READY_FOR_CLOSED_BETA_BR[^\n]*PASS/.test(rc), "READY_FOR_CLOSED_BETA_BR não pode ser PASS nesta remessa");
assert(!rc.includes("HUMAN PASS"), "relatório RC não inventa HUMAN PASS");
assert(rc.includes("v4.7.4-rc.1"), "report cita LONGYU_RC");
assert(rc.includes("CODE_READY não promove"), "CODE_READY independente");

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

const pack = read("docs/reports/first-20-sessions-human-review.md");
assert(pack.includes("Sessão 20"), "pacote cobre sessão 20");
assert(pack.includes("p1-o-que-e-mandarim"), "pacote começa no primeiro tema");
assert(pack.includes("Não altera conteúdo automaticamente"), "pacote não auto-corrige");

if (failures.length) {
  console.error("FAIL test:rc-hardening:");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("OK: test:rc-hardening — contratos Firefox, sentinelas, identidade RC.");
