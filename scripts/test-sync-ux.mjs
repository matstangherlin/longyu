/**
 * RC2.2.8 — test:sync-ux
 *
 * P5: pending → loading → synced várias vezes = zero aviso global.
 * P5.1: erro = uma notificação acionável, deduplicada (C5).
 * Mutações 6–7 contra o gate.
 */
import assert from "node:assert/strict";
import { expectMutationCaught, gateSyncUx, it, mutate, rcRequire, readSources, runCases } from "./lib/rc2-2-8-gates.mjs";

const cases = [];
const { admitSyncNotice, cloudSyncSurface, decideSyncNotice, discreteSyncState, resetSyncNoticeHistory, SYNC_ERROR_DEDUPE_MS } =
  rcRequire("../../src/lib/syncUx.ts");

it(cases, "C1/P5 — ciclo rotineiro é silencioso (10 ciclos de 30 s)", () => {
  for (let cycle = 0; cycle < 10; cycle += 1) {
    for (const status of ["pending", "loading", "synced"]) assert.equal(cloudSyncSurface(status), "silent");
  }
});

it(cases, "C6.1 — mensagens de progresso da economia não viram toast", () => {
  resetSyncNoticeHistory();
  for (const message of ["Sincronizando carga...", "Sincronizando Qi...", "Ativando Pro com Pérolas...", "Migrando economia..."]) {
    assert.equal(admitSyncNotice(message, 1000), false, message);
  }
});

it(cases, "C3/P5.1 — erro real aparece UMA vez", () => {
  resetSyncNoticeHistory();
  const t0 = 1_000_000;
  assert.equal(admitSyncNotice("Erro ao sincronizar — seu progresso local está seguro.", t0), true);
  for (let i = 1; i <= 19; i += 1) {
    assert.equal(admitSyncNotice("Erro ao sincronizar — seu progresso local está seguro.", t0 + i * 30_000), false, `ciclo ${i}`);
  }
});

it(cases, "C5.1 — depois da janela o mesmo erro pode voltar", () => {
  const first = decideSyncNotice("Qi não confirmado pelo servidor.", 0, {});
  const later = decideSyncNotice("Qi não confirmado pelo servidor.", SYNC_ERROR_DEDUPE_MS + 1, first.lastShownAt);
  assert.equal(first.show, true);
  assert.equal(later.show, true);
});

it(cases, "C6 — erros de economia diferentes não se escondem entre si", () => {
  resetSyncNoticeHistory();
  assert.equal(admitSyncNotice("Qi não confirmado pelo servidor.", 0), true);
  assert.equal(admitSyncNotice("Carga não confirmada pelo servidor.", 1), true);
});

it(cases, "C — limpar a mensagem (null) sempre passa", () => {
  assert.equal(admitSyncNotice(null, 5), true);
});

it(cases, "C4 — estado discreto ✓ • !", () => {
  assert.equal(discreteSyncState("synced"), "synced");
  assert.equal(discreteSyncState("pending"), "saving");
  assert.equal(discreteSyncState("loading"), "saving");
  assert.equal(discreteSyncState("error"), "problem");
});

const src = readSources();
it(cases, "gate real passa", () => assert.deepEqual(gateSyncUx(src), []));
expectMutationCaught(cases, "6. sync rotineiro mostra toast", gateSyncUx,
  mutate(src, "economyBridge", "/* intencionalmente silencioso */", "useStore.getState().setEconomySyncMessage(_message);"));
expectMutationCaught(cases, "7. 'sincronizado' a cada 30 s", gateSyncUx,
  mutate(src, "cloudSync", "useStore.getState().setCloudSyncState(status, message);", "useStore.getState().setCloudSyncState(status, message);\n  useStore.getState().setEconomySyncMessage(message);"));
expectMutationCaught(cases, "C2. faixa de rotina em /conta", gateSyncUx,
  mutate(src, "contaPage", 'cloudSyncState.status === "error" && syncCopy', 'cloudSyncState.status !== "idle" && syncCopy'));

runCases("test:sync-ux", cases);
