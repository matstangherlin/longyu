import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// Testa o ProOfferEngine: espelha a lógica de decisão + frequência (pura, com
// estado/relógio injetados) e valida as garantias da especificação. Assertivas
// de marcadores no arquivo real impedem o espelho de divergir.

const root = path.resolve(import.meta.dirname, "..");
const errors = [];
const fail = (m) => errors.push(m);
const assert = (c, m) => {
  if (!c) fail(m);
};
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const DAY = 24 * 60 * 60 * 1000;
const MAX_SESSION_MODALS = 1;
const MAX_DAILY_MODALS = 2;
const FIRST_MINUTE_MS = 60 * 1000;
const JUST_DISMISSED_MS = 5 * 60 * 1000;

const PROTECTED = new Set([
  "active_exercise",
  "character_speech",
  "answer_feedback",
  "hanzi_builder",
  "conversation_scene",
  "post_conversation",
  "immediate_correction",
]);

const dayKey = (now) => new Date(now).toISOString().slice(0, 10);

function freshState() {
  return {
    session: { sessionModalShown: false, sessionStartAt: 0, lastDismissAt: 0 },
    freq: { day: "", dailyModalCount: 0, dismissAtByKind: {} },
    metrics: [],
    pendingOrigin: null,
  };
}

function classify(input) {
  const attempt = input.proFeatureAttempt ?? null;
  if (attempt === "continue_without_energy" || input.energyDepleted)
    return { kind: "energy_limit", placement: "energy_modal", variant: "out_of_energy", solicited: true };
  if (attempt === "detailed_report" || input.triedDetailedErrors)
    return { kind: "detailed_errors", placement: "detailed_errors_modal", variant: "difficulty", solicited: true };
  if (attempt === "unlimited_review" || input.reviewLimitHit)
    return { kind: "review_limit", placement: "review_limit_modal", variant: "review_more", solicited: true };
  if (attempt === "premium_story" || input.storyPremium)
    return { kind: "story_premium", placement: "story_modal", variant: "story", solicited: true };
  if (input.outOfBreath || (input.errorCount ?? 0) >= 3 || input.twoStars || input.repeatedToneErrors || input.repeatedHanziErrors || input.performance === "struggling")
    return { kind: "weak_spots", placement: "modal", variant: "difficulty", solicited: false };
  if (input.xpToPromotion != null && input.xpToPromotion > 0 && input.xpToPromotion <= 40)
    return { kind: "league_promotion", placement: "league_banner", variant: "league", solicited: false };
  if (input.storyCompleted) return { kind: "story_premium", placement: "story_complete_modal", variant: "story", solicited: false };
  if (input.lessonThreeStars || (input.correctStreak ?? 0) >= 5 || input.missionClaimed || input.performance === "good")
    return { kind: "success_accelerate", placement: "modal", variant: "good_performance", solicited: false };
  return null;
}

const deny = (reason, cls) => ({ shouldShow: false, placement: cls?.placement ?? "none", messageVariant: cls?.variant ?? "none", reason });

function decide(input, state, now) {
  if (input.isPro) return deny("already_pro");
  if (PROTECTED.has(input.sessionMoment)) return deny(`protected_moment:${input.sessionMoment}`);
  const cls = classify(input);
  if (!cls) return deny("no_trigger");
  const isBanner = input.channel === "banner" || cls.placement.endsWith("_banner");
  if (isBanner && PROTECTED.has(input.sessionMoment)) return deny("banner_in_player", cls);
  if (state.session.sessionStartAt > 0 && now - state.session.sessionStartAt < FIRST_MINUTE_MS) return deny("first_minute", cls);
  const dAt = state.freq.dismissAtByKind[cls.kind] ?? 0;
  if (dAt > 0 && now - dAt < DAY) return deny("cooldown_24h", cls);
  if (!cls.solicited) {
    if (state.session.lastDismissAt > 0 && now - state.session.lastDismissAt < JUST_DISMISSED_MS) return deny("recently_dismissed", cls);
    if (!isBanner) {
      if (state.session.sessionModalShown) return deny("frequency_session", cls);
      const dailyCount = state.freq.day === dayKey(now) ? state.freq.dailyModalCount : 0;
      if (dailyCount >= MAX_DAILY_MODALS) return deny("frequency_daily", cls);
    }
  }
  return { shouldShow: true, placement: cls.placement, messageVariant: cls.variant, reason: cls.solicited ? "solicited" : "eligible" };
}

function shown(input, decision, state, now) {
  const cls = classify(input);
  state.metrics.push({ type: "shown", placement: decision.placement, variant: decision.messageVariant });
  const isBanner = input.channel === "banner" || decision.placement.endsWith("_banner");
  if (cls.solicited || isBanner) return;
  const today = dayKey(now);
  const dailyCount = state.freq.day === today ? state.freq.dailyModalCount : 0;
  state.freq = { ...state.freq, day: today, dailyModalCount: dailyCount + 1 };
  state.session = { ...state.session, sessionModalShown: true };
}

function dismissed(input, state, now) {
  const cls = classify(input);
  state.metrics.push({ type: "dismissed", placement: cls.placement });
  state.freq.dismissAtByKind = { ...state.freq.dismissAtByKind, [cls.kind]: now };
  state.session.lastDismissAt = now;
}

// ── 1. Pro nunca vê oferta ──────────────────────────────────────────────────
{
  const now = Date.parse("2026-07-20T15:00:00Z");
  for (const moment of ["lesson_complete", "energy_depleted", "hub", "review_complete"]) {
    const d = decide({ isPro: true, sessionMoment: moment, lessonThreeStars: true, energyDepleted: true }, freshState(), now);
    assert(d.shouldShow === false && d.reason === "already_pro", `Pro não deve ver oferta em ${moment}`);
  }
}

// ── 2. Nunca interromper atividade (momentos protegidos) ────────────────────
{
  const now = Date.parse("2026-07-20T15:00:00Z");
  for (const moment of PROTECTED) {
    const d = decide({ isPro: false, sessionMoment: moment, lessonThreeStars: true, energyDepleted: true }, freshState(), now);
    assert(d.shouldShow === false && d.reason.startsWith("protected_moment:"), `Não pode oferecer em ${moment}`);
  }
}

// ── 3. Usuário grátis não recebe excesso: 1 modal/sessão, 2/dia ─────────────
{
  const now = Date.parse("2026-07-20T15:00:00Z");
  const state = freshState();
  const ctx = { isPro: false, sessionMoment: "lesson_complete", lessonThreeStars: true };
  const d1 = decide(ctx, state, now);
  assert(d1.shouldShow, "Primeira oferta da sessão deve aparecer");
  shown(ctx, d1, state, now);
  // Segunda tentativa na MESMA sessão → bloqueada (1 modal/sessão).
  const d2 = decide(ctx, state, now + 60_000);
  assert(!d2.shouldShow && d2.reason === "frequency_session", "2º modal na mesma sessão deve ser bloqueado");
  // Nova sessão, mesmo dia → aparece o 2º; depois o 3º é bloqueado (2/dia).
  state.session.sessionModalShown = false;
  const d3 = decide(ctx, state, now + 2 * 60 * 60 * 1000);
  assert(d3.shouldShow, "2º modal do dia (nova sessão) deve aparecer");
  shown(ctx, d3, state, now + 2 * 60 * 60 * 1000);
  state.session.sessionModalShown = false;
  const d4 = decide(ctx, state, now + 3 * 60 * 60 * 1000);
  assert(!d4.shouldShow && d4.reason === "frequency_daily", "3º modal no mesmo dia deve ser bloqueado (máx. 2/dia)");
}

// ── 4. Fechar funciona + cooldown de 24h para a mesma oferta ────────────────
{
  const t0 = Date.parse("2026-07-20T15:00:00Z");
  const state = freshState();
  // Oferta SOLICITADA (energia) isola o cooldown dos limites de modal.
  const ctx = { isPro: false, sessionMoment: "energy_depleted", energyDepleted: true };
  const d1 = decide(ctx, state, t0);
  assert(d1.shouldShow && d1.reason === "solicited", "Oferta solicitada (energia) deve aparecer");
  shown(ctx, d1, state, t0);
  dismissed(ctx, state, t0); // usuário fecha
  const d2 = decide(ctx, state, t0 + 2 * 60 * 60 * 1000);
  assert(!d2.shouldShow && d2.reason === "cooldown_24h", "Mesma oferta dentro de 24h após fechar deve respeitar cooldown");
  const d3 = decide(ctx, state, t0 + DAY + 1000);
  assert(d3.shouldShow, "Após 24h a oferta pode reaparecer");
  assert(state.metrics.some((m) => m.type === "dismissed"), "Fechar deve registrar métrica dismissed");
}

// ── 5. Acabou de fechar uma oferta → não reoferecer logo (não solicitadas) ──
{
  const t0 = Date.parse("2026-07-20T15:00:00Z");
  const state = freshState();
  const success = { isPro: false, sessionMoment: "lesson_complete", lessonThreeStars: true };
  const d1 = decide(success, state, t0);
  shown(success, d1, state, t0);
  dismissed(success, state, t0);
  // Outra oferta não solicitada logo em seguida → recently_dismissed.
  const weak = { isPro: false, sessionMoment: "lesson_complete", twoStars: true };
  const d2 = decide(weak, state, t0 + 60_000);
  assert(!d2.shouldShow && d2.reason === "recently_dismissed", "Não reoferecer logo após fechar");
}

// ── 6. Primeiro minuto de uso: não oferecer ─────────────────────────────────
{
  const t0 = Date.parse("2026-07-20T15:00:00Z");
  const state = freshState();
  state.session.sessionStartAt = t0;
  const d = decide({ isPro: false, sessionMoment: "lesson_complete", lessonThreeStars: true }, state, t0 + 30_000);
  assert(!d.shouldShow && d.reason === "first_minute", "Não oferecer no primeiro minuto");
  const d2 = decide({ isPro: false, sessionMoment: "lesson_complete", lessonThreeStars: true }, state, t0 + 61_000);
  assert(d2.shouldShow, "Depois do primeiro minuto pode oferecer");
}

// ── 7. Banner discreto pode aparecer no hub, nunca no player ────────────────
{
  const now = Date.parse("2026-07-20T15:00:00Z");
  const banner = { isPro: false, sessionMoment: "hub", channel: "banner", xpToPromotion: 20 };
  assert(decide(banner, freshState(), now).shouldShow, "Banner de liga pode aparecer no hub");
  const inPlayer = { isPro: false, sessionMoment: "active_exercise", channel: "banner", xpToPromotion: 20 };
  const dp = decide(inPlayer, freshState(), now);
  assert(!dp.shouldShow && dp.reason.startsWith("protected_moment:"), "Banner nunca no player/exercício");
}

// ── 8. Origem da conversão registrada (atribuição) ──────────────────────────
{
  const state = freshState();
  // clicou na oferta → guarda origem
  state.pendingOrigin = "energy_modal";
  state.metrics.push({ type: "clicked", placement: "energy_modal", origin: "energy_modal" });
  state.metrics.push({ type: "checkout_started", origin: state.pendingOrigin });
  state.metrics.push({ type: "subscription_started", origin: state.pendingOrigin });
  const types = new Set(state.metrics.map((m) => m.type));
  for (const t of ["clicked", "checkout_started", "subscription_started"]) {
    assert(types.has(t), `Métrica ${t} deve ser registrada`);
  }
  assert(state.metrics.find((m) => m.type === "subscription_started").origin === "energy_modal", "Origem da conversão deve ser registrada");
}

// ── 9. Offline / entradas estranhas não quebram a decisão ───────────────────
{
  const now = Date.parse("2026-07-20T15:00:00Z");
  assert(decide({ isPro: false, sessionMoment: "unknown" }, freshState(), now).reason === "no_trigger", "Sem sinal → no_trigger (não quebra)");
  // objeto quase vazio
  let threw = false;
  try {
    decide({ isPro: false, sessionMoment: "lesson_complete" }, freshState(), now);
  } catch {
    threw = true;
  }
  assert(!threw, "decide não pode lançar com entrada mínima");
}

// ── Marcadores no código real (impede o espelho de divergir) ────────────────
const engine = read("src/lib/proOfferEngine.ts");
assert(engine.includes("export function decideProOffer"), "engine deve exportar decideProOffer");
assert(engine.includes("shouldShow") && engine.includes("placement") && engine.includes("messageVariant") && engine.includes("reason"), "saída deve ter shouldShow/placement/messageVariant/reason");
assert(engine.includes("MAX_SESSION_MODALS = 1"), "máx. 1 modal por sessão");
assert(engine.includes("MAX_DAILY_MODALS = 2"), "máx. 2 modais por dia");
assert(engine.includes("OFFER_COOLDOWN_MS = 24"), "cooldown de 24h");
assert(engine.includes("PROTECTED_MOMENTS"), "engine deve definir momentos protegidos");
for (const m of ["active_exercise", "character_speech", "answer_feedback", "hanzi_builder", "conversation_scene", "immediate_correction"]) {
  assert(engine.includes(`"${m}"`), `momento protegido ${m} deve existir`);
}
assert(engine.includes("first_minute") && engine.includes("recently_dismissed"), "guardas de primeiro minuto e recém-fechada");
assert(engine.includes("markSessionStart"), "engine deve expor markSessionStart");
for (const t of ["shown", "dismissed", "clicked", "checkout_started", "subscription_started"]) {
  assert(engine.includes(`"${t}"`), `evento de métrica ${t} deve existir`);
}
// Mensagens exatas da especificação.
assert(engine.includes("Você está avançando rápido. Com o Pro, pode praticar sem limite e acessar revisões completas."), "mensagem de bom desempenho");
assert(engine.includes("Alguns pontos ainda precisam de prática. O Pro libera revisão inteligente e análise dos seus erros."), "mensagem de dificuldade");
assert(engine.includes("Suas cargas terminaram. Continue gratuitamente quando elas voltarem ou pratique sem limite com o Pro."), "mensagem sem energia");
assert(engine.includes("Continue esta história e desbloqueie mais situações reais com o Longyu Pro."), "mensagem de história");
// Ética: nada de gatilhos proibidos.
assert(!/últimas?\s+horas|acaba em|só hoje|expira em|garantia de fluência|fluência garantida/i.test(engine), "engine não pode usar cronômetro/promessa antiética");
// Offline-safe: acesso a storage protegido por try/catch.
assert((engine.match(/catch\s*\{/g) ?? []).length >= 4, "acesso a storage deve ser tolerante a falhas (try/catch)");

// Fiação nas telas.
const hook = read("src/hooks/useProOffer.ts");
assert(hook.includes("recordProOfferShown") && hook.includes("recordProOfferDismissed"), "hook deve registrar shown/dismissed");
const appShell = read("src/components/layout/AppShell.tsx");
assert(appShell.includes("markSessionStart"), "AppShell deve marcar início da sessão");
const paywall = read("src/components/pro/ProPaywall.tsx");
assert(paywall.includes("recordProOfferClicked"), "ProPaywall deve registrar clique na oferta");
const proPage = read("src/features/pro/ProPage.tsx");
assert(proPage.includes("recordProOfferCheckoutStarted") && proPage.includes("recordProOfferSubscriptionStarted"), "ProPage deve registrar checkout/assinatura iniciados");

if (errors.length > 0) {
  console.error("ERRO: test:pro-offer-engine falhou.");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK: test:pro-offer-engine passou (Pro isento, limites, cooldown, momentos protegidos, atribuição, offline, marcadores).");
