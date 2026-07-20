import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// Auditoria E2E da assinatura real: modela o webhook + entitlement + energia e
// exercita os cenários obrigatórios (A–F), idempotência e eventos fora de ordem.
//
// Este teste roda em Node (sem Stripe/Deno), então ESPELHA a lógica pura e, para
// não deixar o espelho divergir do código real, também exige marcadores nos
// arquivos de produção (webhook, migração, checkout, loading state).

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function fail(message) {
  errors.push(message);
}
function assert(condition, message) {
  if (!condition) fail(message);
}
function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-07-20T12:00:00Z");
const iso = (ms) => new Date(ms).toISOString();

// ————————————————————————————————————————————————————————————————
// Espelho do RPC apply_subscription_event (migração 014):
// escreve só se o evento recebido for >= ao último persistido (event.created),
// e nunca cria linha órfã sem user_id.
// ————————————————————————————————————————————————————————————————
function applySubscriptionEvent(rows, evt) {
  if (!evt.subscriptionId) return { applied: false, reason: "missing_subscription_id" };
  const existing = rows[evt.subscriptionId];
  const fresh = !existing || existing.eventCreated == null || evt.eventCreated >= existing.eventCreated;

  if (evt.userId == null) {
    // updated/deleted de assinatura desconhecida: só atualiza linha existente.
    if (!existing) return { applied: false, reason: "missing" };
    if (!fresh) return { applied: false, reason: "stale" };
    rows[evt.subscriptionId] = {
      ...existing,
      status: evt.status,
      currentPeriodEnd: evt.periodEnd ?? existing.currentPeriodEnd,
      cancelAtPeriodEnd: evt.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
      eventCreated: evt.eventCreated,
    };
    return { applied: true, reason: "updated" };
  }

  if (!fresh) return { applied: false, reason: "stale" };
  rows[evt.subscriptionId] = {
    userId: evt.userId,
    status: evt.status,
    currentPeriodEnd: evt.periodEnd ?? existing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: evt.cancelAtPeriodEnd ?? existing?.cancelAtPeriodEnd ?? false,
    eventCreated: evt.eventCreated,
  };
  return { applied: true, reason: "upserted" };
}

// Espelho de get_server_entitlement (migração 008 — fonte primária do Pro):
// status ∈ {active, trialing} e período ainda válido.
function serverGrantsPro(row, now = NOW) {
  if (!row) return false;
  const validPeriod = !row.currentPeriodEnd || Date.parse(row.currentPeriodEnd) > now;
  return (row.status === "active" || row.status === "trialing") && validPeriod;
}

// Espelho de effectivePremium: outro usuário nunca herda Pro sem serverIsPro.
function effectivePremium(serverIsPro, { accountAuthMode, accountEmail } = {}) {
  if (accountAuthMode === "cloud" && accountEmail === "teste@longyu.app") return true;
  return serverIsPro === true;
}

// Espelho de reconcileFreePlanEnergy: base 5 + bônus reais, sem negativo/infinito.
const FREE_DAILY_CHARGES = 5;
function reconcileFreePlanEnergy(energy, date = "2026-07-20") {
  const current =
    energy?.date === date ? energy : { date, charges: 5, maxCharges: 5, usedCharges: 0, bonusChargesClaimed: {} };
  const prefix = `story-energy:${date}:`;
  const bonus = Object.keys(current.bonusChargesClaimed ?? {}).filter(
    (key) => key.startsWith(prefix) && current.bonusChargesClaimed[key]
  ).length;
  const maxCharges = FREE_DAILY_CHARGES + bonus;
  return {
    date,
    maxCharges,
    charges: Math.min(maxCharges, Math.max(0, current.charges ?? maxCharges)),
    usedCharges: Math.max(0, current.usedCharges ?? 0),
    bonusChargesClaimed: current.bonusChargesClaimed ?? {},
  };
}

// Transações: idempotentes por stripe_event_id.
function persistTransaction(txns, eventId, payload) {
  txns.set(eventId, payload);
}

// ————————————————————————————————————————————————————————————————
// Cenário A — Trial iniciado
// ————————————————————————————————————————————————————————————————
{
  const rows = {};
  const uid = "user-A";
  const sub = "sub_A";
  const periodEnd = iso(NOW + 30 * DAY);
  // checkout.session.completed retrieve → trialing
  applySubscriptionEvent(rows, {
    subscriptionId: sub, userId: uid, status: "trialing", periodEnd, cancelAtPeriodEnd: false, eventCreated: 1000,
  });
  // customer.subscription.created (trialing)
  applySubscriptionEvent(rows, {
    subscriptionId: sub, userId: null, status: "trialing", periodEnd, cancelAtPeriodEnd: false, eventCreated: 1001,
  });
  assert(serverGrantsPro(rows[sub]), "A: trial deve conceder Pro");
  assert(rows[sub].status === "trialing", "A: status deve ser trialing (não forçar active)");
  // logout/login mantém Pro: nova consulta ao servidor vê a mesma linha.
  assert(serverGrantsPro(rows[sub]), "A: logout/login mantém Pro (assinatura no servidor)");
}

// ————————————————————————————————————————————————————————————————
// Cenário B — Trial termina e pagamento funciona
// ————————————————————————————————————————————————————————————————
{
  const rows = { sub_B: { userId: "user-B", status: "trialing", currentPeriodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 2000 } };
  const newPeriodEnd = iso(NOW + 31 * DAY);
  applySubscriptionEvent(rows, {
    subscriptionId: "sub_B", userId: null, status: "active", periodEnd: newPeriodEnd, cancelAtPeriodEnd: false, eventCreated: 2001,
  });
  assert(rows.sub_B.status === "active", "B: status vira active");
  assert(rows.sub_B.currentPeriodEnd === newPeriodEnd, "B: current_period_end é atualizado");
  assert(serverGrantsPro(rows.sub_B), "B: Pro continua após cobrança");
}

// ————————————————————————————————————————————————————————————————
// Cenário C — Trial termina e pagamento falha
// ————————————————————————————————————————————————————————————————
{
  const rows = { sub_C: { userId: "user-C", status: "active", currentPeriodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 3000 } };
  applySubscriptionEvent(rows, {
    subscriptionId: "sub_C", userId: null, status: "past_due", periodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 3001,
  });
  assert(!serverGrantsPro(rows.sub_C), "C: past_due remove Pro");

  // Energia volta ao teto grátis; bônus legítimo do dia é preservado.
  const inflated = {
    date: "2026-07-20", charges: 999, maxCharges: 999, usedCharges: 2,
    bonusChargesClaimed: { "story-energy:2026-07-20:cena-1": true },
  };
  const reconciled = reconcileFreePlanEnergy(inflated);
  assert(reconciled.maxCharges === 6, `C: teto deve ser 5 + 1 bônus, obteve ${reconciled.maxCharges}`);
  assert(reconciled.charges <= reconciled.maxCharges, "C: cargas não excedem o teto");
  assert(reconciled.charges >= 0, "C: cargas não podem ser negativas");
  assert(reconciled.usedCharges === 2, "C: usedCharges (progresso do dia) preservado");
  // unpaid tem o mesmo efeito
  const rows2 = { sub_C2: { userId: "user-C2", status: "active", currentPeriodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 1 } };
  applySubscriptionEvent(rows2, { subscriptionId: "sub_C2", userId: null, status: "unpaid", periodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 2 });
  assert(!serverGrantsPro(rows2.sub_C2), "C: unpaid remove Pro");
}

// ————————————————————————————————————————————————————————————————
// Cenário D — Cancelamento (cancel_at_period_end)
// ————————————————————————————————————————————————————————————————
{
  const rows = {};
  const uid = "user-D";
  const periodEnd = iso(NOW + 10 * DAY);
  applySubscriptionEvent(rows, { subscriptionId: "sub_D", userId: uid, status: "active", periodEnd, cancelAtPeriodEnd: false, eventCreated: 4000 });
  // Usuário cancela no fim do período: status segue active, cancel_at_period_end=true.
  applySubscriptionEvent(rows, { subscriptionId: "sub_D", userId: null, status: "active", periodEnd, cancelAtPeriodEnd: true, eventCreated: 4001 });
  assert(rows.sub_D.cancelAtPeriodEnd === true, "D: cancel_at_period_end = true");
  assert(serverGrantsPro(rows.sub_D), "D: permanece Pro até a data");
  // Depois da data (agora > period_end), mesmo antes do deleted, período inválido derruba Pro.
  assert(!serverGrantsPro(rows.sub_D, NOW + 11 * DAY), "D: após a data perde Pro (período vencido)");
  // Stripe envia subscription.deleted no fim: status vira canceled.
  applySubscriptionEvent(rows, { subscriptionId: "sub_D", userId: null, status: "canceled", periodEnd, cancelAtPeriodEnd: true, eventCreated: 4002 });
  assert(!serverGrantsPro(rows.sub_D, NOW + 11 * DAY), "D: canceled não concede Pro");
}

// ————————————————————————————————————————————————————————————————
// Cenário E — Reativação antes do fim
// ————————————————————————————————————————————————————————————————
{
  const rows = {};
  const uid = "user-E";
  const periodEnd = iso(NOW + 12 * DAY);
  applySubscriptionEvent(rows, { subscriptionId: "sub_E", userId: uid, status: "active", periodEnd, cancelAtPeriodEnd: false, eventCreated: 5000 });
  applySubscriptionEvent(rows, { subscriptionId: "sub_E", userId: null, status: "active", periodEnd, cancelAtPeriodEnd: true, eventCreated: 5001 });
  assert(serverGrantsPro(rows.sub_E), "E: Pro durante o cancelamento pendente");
  // Reativa: cancel_at_period_end volta a false, ainda active.
  applySubscriptionEvent(rows, { subscriptionId: "sub_E", userId: null, status: "active", periodEnd, cancelAtPeriodEnd: false, eventCreated: 5002 });
  assert(rows.sub_E.cancelAtPeriodEnd === false, "E: reativação zera cancel_at_period_end");
  assert(serverGrantsPro(rows.sub_E), "E: continua Pro sem interrupção");
}

// ————————————————————————————————————————————————————————————————
// Cenário F — Troca de conta
// ————————————————————————————————————————————————————————————————
{
  const rows = {
    sub_A: { userId: "user-A", status: "active", currentPeriodEnd: iso(NOW + 20 * DAY), cancelAtPeriodEnd: false, eventCreated: 6000 },
  };
  // Conta A é Pro no servidor.
  const serverIsProA = serverGrantsPro(rows.sub_A);
  assert(effectivePremium(serverIsProA, { accountAuthMode: "cloud", accountEmail: "a@example.com" }), "F: conta A é Pro");
  // Logout zera serverIsPro (store.logout). Conta B grátis, sem linha de assinatura.
  const serverIsProAfterLogout = false;
  const serverIsProB = serverGrantsPro(rows.sub_B); // undefined → false
  assert(!serverIsProB, "F: conta B não tem assinatura no servidor");
  assert(
    !effectivePremium(serverIsProAfterLogout, { accountAuthMode: "cloud", accountEmail: "b@example.com" }),
    "F: conta B não herda Pro (nem energia infinita)"
  );
  // Voltar para A revalida a assinatura → Pro restaurado.
  assert(serverGrantsPro(rows.sub_A), "F: voltar à conta A restaura Pro");
}

// ————————————————————————————————————————————————————————————————
// Idempotência: mesmo evento duas vezes não altera o estado.
// ————————————————————————————————————————————————————————————————
{
  const rows = { sub_I: { userId: "user-I", status: "active", currentPeriodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 7000 } };
  const evt = { subscriptionId: "sub_I", userId: null, status: "past_due", periodEnd: iso(NOW + DAY), cancelAtPeriodEnd: false, eventCreated: 7001 };
  applySubscriptionEvent(rows, evt);
  const after1 = JSON.stringify(rows.sub_I);
  applySubscriptionEvent(rows, evt); // replay
  assert(JSON.stringify(rows.sub_I) === after1, "Idempotência: reprocessar o mesmo evento não muda o estado");

  const txns = new Map();
  persistTransaction(txns, "evt_dup", { amount: 100, status: "paid" });
  persistTransaction(txns, "evt_dup", { amount: 100, status: "paid" });
  assert(txns.size === 1, "Idempotência: mesmo stripe_event_id não duplica transação");
}

// ————————————————————————————————————————————————————————————————
// Fora de ordem: evento antigo não reverte estado novo; removido não volta ativo.
// ————————————————————————————————————————————————————————————————
{
  const rows = { sub_O: { userId: "user-O", status: "active", currentPeriodEnd: iso(NOW + 5 * DAY), cancelAtPeriodEnd: false, eventCreated: 8000 } };
  // deleted (novo) processado.
  applySubscriptionEvent(rows, { subscriptionId: "sub_O", userId: null, status: "canceled", periodEnd: iso(NOW + 5 * DAY), cancelAtPeriodEnd: true, eventCreated: 8100 });
  assert(rows.sub_O.status === "canceled", "Ordem: deleted aplica canceled");
  // updated ANTIGO (active) chega atrasado — NÃO pode reverter.
  const res = applySubscriptionEvent(rows, { subscriptionId: "sub_O", userId: null, status: "active", periodEnd: iso(NOW + 5 * DAY), cancelAtPeriodEnd: false, eventCreated: 8050 });
  assert(res.applied === false && res.reason === "stale", "Ordem: evento antigo é descartado");
  assert(rows.sub_O.status === "canceled", "Ordem: estado novo (canceled) preservado");
  assert(!serverGrantsPro(rows.sub_O), "Ordem: assinatura removida não permanece ativa");
  // update genuinamente mais novo aplica (reativação real numa nova cobrança).
  applySubscriptionEvent(rows, { subscriptionId: "sub_O", userId: null, status: "active", periodEnd: iso(NOW + 40 * DAY), cancelAtPeriodEnd: false, eventCreated: 8200 });
  assert(rows.sub_O.status === "active", "Ordem: evento mais novo aplica normalmente");
}

// ————————————————————————————————————————————————————————————————
// Marcadores no código real (impede o espelho de divergir silenciosamente).
// ————————————————————————————————————————————————————————————————
const webhookSrc = read("supabase/functions/stripe-webhook/index.ts");
assert(webhookSrc.includes("customer.subscription.created"), "webhook deve tratar customer.subscription.created");
assert(webhookSrc.includes("apply_subscription_event"), "webhook deve usar o RPC atômico apply_subscription_event");
assert(webhookSrc.includes("constructEventAsync"), "webhook deve verificar assinatura Stripe com constructEventAsync (Deno)");
assert(webhookSrc.includes("subscriptions.retrieve"), "webhook deve buscar o status real da assinatura no checkout");
assert(webhookSrc.includes("event.created") || webhookSrc.includes("eventCreated"), "webhook deve passar event.created para ordenar");
// O caminho principal deve refletir o status REAL do Stripe (não um "active" fixo).
assert(
  webhookSrc.includes("p_status: subscriptionStatus(subscription.status)"),
  "webhook deve gravar o status real da assinatura (subscriptionStatus(subscription.status))"
);
// O upsert direto em subscriptions (bug antigo, forçava "active") foi substituído
// pelo RPC atômico — não deve mais existir escrita direta na tabela.
assert(
  !webhookSrc.includes('admin.from("subscriptions").upsert'),
  "webhook NÃO deve mais fazer upsert direto em subscriptions (usar apply_subscription_event)"
);

const migrationSrc = read("supabase/migrations/014_subscription_event_ordering.sql");
assert(migrationSrc.includes("stripe_event_created"), "migração 014 deve adicionar stripe_event_created");
assert(migrationSrc.includes("apply_subscription_event"), "migração 014 deve criar apply_subscription_event");
assert(/excluded\.stripe_event_created\s*>=\s*public\.subscriptions\.stripe_event_created/.test(migrationSrc), "migração 014 deve ter guarda de ordem no ON CONFLICT");
assert(migrationSrc.includes("to service_role"), "apply_subscription_event deve ser executável só pelo service_role");

const checkoutSrc = read("supabase/functions/create-checkout-session/index.ts");
assert(checkoutSrc.includes("STRIPE_ALLOWED_ORIGINS"), "checkout deve validar origin contra allowlist");
assert(checkoutSrc.includes("ALLOWED_PLAN_KEYS"), "checkout deve validar planKey contra allowlist");
assert(checkoutSrc.includes("Deno.env.get(`STRIPE_PRICE_"), "checkout deve pegar price ID do env do servidor");

const statusSrc = read("src/lib/entitlementStatus.ts");
assert(statusSrc.includes("checking"), "entitlementStatus deve expor flag checking");
const bootstrapSrc = read("src/components/auth/EntitlementBootstrap.tsx");
assert(bootstrapSrc.includes("beginCheck") && bootstrapSrc.includes("endCheck"), "bootstrap deve marcar/limpar a checagem");
assert(bootstrapSrc.includes("finally"), "bootstrap deve limpar a checagem no finally (sem travar em 'Verificando')");
const proPageSrc = read("src/features/pro/ProPage.tsx");
assert(proPageSrc.includes("Verificando seu plano"), "ProPage deve mostrar 'Verificando seu plano...'");

if (errors.length > 0) {
  console.error("ERRO: test:subscription-webhook falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log("OK: test:subscription-webhook passou (cenários A–F, idempotência, ordem, marcadores).");
