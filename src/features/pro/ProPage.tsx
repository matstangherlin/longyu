import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { IconCheck, IconChevron, IconLock } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import {
  recordProOfferCheckoutStarted,
  recordProOfferSubscriptionStarted,
} from "../../lib/proOfferEngine";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { PRO_LESSON_QI_BONUS } from "../../data/economy";
import {
  getPlanFeature,
  getProOnlyFeatures,
  getProPageFreeHighlights,
  getProPageProHighlights,
  PLAN_FEATURES,
  PRO_BENEFIT_GROUPS,
} from "../../data/planFeatures";
import {
  createCheckoutSession,
  openBillingPortal,
  isBillingPortalAvailable,
  type ProPlanKey,
} from "../../services/subscriptionService";
import {
  parseProPlanKey,
  peekPendingCheckoutPlan,
  savePendingCheckoutPlan,
  subscribeAccountPath,
  takePendingCheckoutPlan,
} from "../../lib/subscribeAuthRedirect";
import { getSupabaseClient } from "../../lib/supabaseClient";

const BILLING_PLANS: {
  key: ProPlanKey;
  eyebrow: string;
  name: string;
  priceLine: string;
  detail: string;
  badge?: string;
  featured?: boolean;
}[] = [
  {
    key: "pro_annual",
    eyebrow: "Melhor economia",
    name: "Anual",
    priceLine: "R$ 10/mês",
    detail: "R$ 120/ano após 30 dias grátis",
    badge: "60% OFF",
    featured: true,
  },
  {
    key: "pro_monthly",
    eyebrow: "Flexível",
    name: "Mensal",
    priceLine: "R$ 24,90/mês",
    detail: "30 dias grátis, cancele quando quiser",
  },
];

export function ProPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serverIsPro = useStore((state) => state.serverIsPro);
  // Enquanto a assinatura é consultada no servidor, evita piscar o paywall para
  // um Pro legítimo: mostra um estado curto "Verificando seu plano...".
  const checkingPlan = useEntitlementStatus((state) => state.checking);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  // A matriz repete, linha a linha, o mesmo texto dos blocos de "O que você
  // ganha" (ambos usam feature.proBenefit). Fica recolhida como referência.
  const [showMatrix, setShowMatrix] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanKey>(() => {
    return parseProPlanKey(searchParams.get("plan")) ?? peekPendingCheckoutPlan() ?? "pro_annual";
  });
  const checkoutReady = isSupabaseBackendEnabled();
  const resumeCheckoutAttempted = useRef(false);

  const selectedPlanMeta = useMemo(
    () => BILLING_PLANS.find((plan) => plan.key === selectedPlan) ?? BILLING_PLANS[0],
    [selectedPlan]
  );

  const freeHighlights = useMemo(() => getProPageFreeHighlights(), []);
  const proHighlights = useMemo(() => getProPageProHighlights(), []);
  const proOnlyCount = getProOnlyFeatures().length;

  // Atribuição de conversão: ao voltar do Stripe com ?checkout=success, registra
  // a origem da oferta que levou à assinatura (métrica, sem dado sensível).
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      recordProOfferSubscriptionStarted();
    }
  }, [searchParams]);

  async function handleSubscribe(planKey = selectedPlan) {
    if (!checkoutReady) return;
    try {
      const result = await createCheckoutSession(planKey);
      if (result.status === "auth_required") {
        savePendingCheckoutPlan(planKey);
        navigate(subscribeAccountPath(planKey));
        return;
      }
      setCheckoutNotice(result.message);
      if (result.data?.url) {
        recordProOfferCheckoutStarted();
        window.location.assign(result.data.url);
      }
    } catch {
      setCheckoutNotice("Não foi possível abrir o checkout. Tente de novo.");
    }
  }

  // Voltou da criação/login de conta: se já há sessão, retoma o checkout.
  useEffect(() => {
    if (!checkoutReady || serverIsPro || checkingPlan || resumeCheckoutAttempted.current) return;
    const pending = peekPendingCheckoutPlan() ?? parseProPlanKey(searchParams.get("plan"));
    if (!pending) return;

    resumeCheckoutAttempted.current = true;
    setSelectedPlan(pending);

    void (async () => {
      const client = getSupabaseClient();
      if (!client) {
        resumeCheckoutAttempted.current = false;
        return;
      }
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session) {
        resumeCheckoutAttempted.current = false;
        return;
      }
      takePendingCheckoutPlan();
      setCheckoutNotice("Conta pronta. Abrindo o checkout…");
      await handleSubscribe(pending);
    })();
    // Resume one-shot após auth; handleSubscribe fecha sobre selectedPlan atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutReady, serverIsPro, checkingPlan, searchParams]);

  async function handleManageBilling() {
    if (!isBillingPortalAvailable()) return;
    try {
      const portal = await openBillingPortal();
      if (portal.data?.url) window.location.assign(portal.data.url);
      else setCheckoutNotice(portal.message);
    } catch {
      setCheckoutNotice("Não foi possível abrir o portal de assinatura.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[linear-gradient(160deg,rgb(var(--gold)/0.12)_0%,rgb(var(--surface))_45%,rgb(var(--bg))_100%)] p-5 text-center shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <Mascot size={88} variant="celebrate" className="relative mx-auto" />
        <Pill tone="gold" className="relative mt-3">Longyu Pro</Pill>
        <h1 className="relative mt-3 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          30 dias grátis. Estude sem limites.
        </h1>
        <p className="relative mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          {getPlanFeature("cargas").proBenefit} {getPlanFeature("revisao_ilimitada").proBenefit.split(".")[0]}.
        </p>

        {serverIsPro ? (
          <div className="relative mx-auto mt-4 max-w-xs space-y-2">
            <div className="rounded-xl border border-good/30 bg-good/10 px-4 py-2.5 text-sm font-semibold text-good">
              Assinatura Pro ativa. Obrigado!
            </div>
            {isBillingPortalAvailable() && (
              <Button size="lg" variant="outline" className="w-full" onClick={() => void handleManageBilling()}>
                Gerenciar ou cancelar assinatura
              </Button>
            )}
          </div>
        ) : checkingPlan ? (
          <div className="relative mx-auto mt-5 max-w-xs">
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink-soft"
            >
              <span className="longyu-audio-bar h-3 w-1 rounded-full bg-gold" aria-hidden />
              Verificando seu plano…
            </div>
          </div>
        ) : (
          <div className="relative mx-auto mt-5 max-w-xs space-y-2">
            <Button
              size="lg"
              className="w-full bg-gold text-white hover:brightness-95"
              onClick={() => void handleSubscribe(selectedPlan)}
              disabled={!checkoutReady}
            >
              {checkoutReady ? "Começar 30 dias grátis" : "Em breve"}
            </Button>
            {checkoutReady && (
              <p className="text-[11px] leading-4 text-ink-faint">
                Cancele quando quiser. Checkout seguro via Stripe.
              </p>
            )}
            {checkoutNotice && <p className="text-xs text-ink-soft">{checkoutNotice}</p>}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-center font-serif text-lg font-semibold text-ink sm:text-xl">
          Grátis vs Pro
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card className="p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Grátis</div>
            <h3 className="mt-0.5 text-sm font-semibold text-ink">Ensina de verdade</h3>
            <p className="mt-1 text-[11px] text-ink-soft">{getPlanFeature("jornada").descricao}</p>
            <ul className="mt-3 space-y-2">
              {freeHighlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-faint">
                    <IconCheck width={11} height={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-gold/25 bg-gold/[0.06] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Pro</div>
              <Pill tone="gold">Recomendado</Pill>
            </div>
            <h3 className="mt-0.5 text-sm font-semibold text-ink">Mais rápido, menos limites</h3>
            <p className="mt-1 text-[11px] text-ink-soft">{proOnlyCount} benefícios extras — sem comprar posição nas ligas.</p>
            <ul className="mt-3 space-y-2">
              {proHighlights.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <IconCheck width={11} height={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          O Pro não conclui lições por você. +{PRO_LESSON_QI_BONUS} Qi por lição concluída.
        </p>
      </section>

      {!serverIsPro && (
        <section className="space-y-3">
          <h2 className="text-center font-serif text-lg font-semibold text-ink">Escolha o plano</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {BILLING_PLANS.map((plan) => {
              const active = selectedPlan === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedPlan(plan.key)}
                  className={[
                    "rounded-xl border p-3.5 text-left transition",
                    active
                      ? "border-gold/40 bg-gold/10 shadow-card"
                      : "border-line/50 bg-surface hover:border-gold/25",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">{plan.eyebrow}</div>
                      <h3 className="mt-0.5 font-serif text-lg font-semibold text-ink">{plan.name}</h3>
                    </div>
                    {plan.badge && <Pill tone="gold">{plan.badge}</Pill>}
                  </div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-ink">{plan.priceLine}</div>
                  <p className="mt-0.5 text-xs text-ink-soft">{plan.detail}</p>
                  {active && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-faint">
                      <IconLock width={11} height={11} />
                      {checkoutReady ? "Checkout Stripe" : "Em breve"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {checkoutReady && (
            <Card className="border-gold/20 bg-gold/[0.05] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Nome e detalhe do plano já estão no cartão selecionado logo
                    acima; aqui repetiam palavra por palavra. Fica só a ação. */}
                <div className="flex items-center gap-2">
                  <Pill tone="gold">30 dias grátis</Pill>
                  <span className="text-sm text-ink-soft">no plano {selectedPlanMeta.name.toLowerCase()}</span>
                </div>
                <Button
                  size="lg"
                  className="w-full shrink-0 bg-gold text-white hover:brightness-95 sm:w-auto"
                  onClick={() => void handleSubscribe(selectedPlan)}
                >
                  Assinar {selectedPlan === "pro_annual" ? "anual" : "mensal"} <IconChevron width={16} height={16} />
                </Button>
              </div>
            </Card>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-center font-serif text-lg font-semibold text-ink">O que você ganha</h2>
        {/* Eram 14 cartões com ícone, um por recurso, ocupando quatro faixas da
            página para repetir o mesmo proBenefit que a matriz já lista. Vira
            uma lista agrupada: mesmo conteúdo, uma fração da altura. */}
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {PRO_BENEFIT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.featureIds.map((featureId) => {
                  const feature = getPlanFeature(featureId);
                  return (
                    <li key={featureId} className="flex gap-2 text-xs leading-5">
                      <IconCheck width={13} height={13} className="mt-1 shrink-0 text-gold" />
                      <span className="text-ink-soft">
                        <span className="font-semibold text-ink">{feature.nome}.</span> {feature.proBenefit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section data-pro-business className="rounded-2xl border border-gold/20 bg-gold/[0.05] p-4 sm:p-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Para empresas</div>
        <h2 className="mt-1 font-serif text-lg font-semibold text-ink sm:text-xl">Longyu for Business</h2>
        <p className="mt-1 text-sm text-ink-soft">Mandarim para a sua equipe.</p>
        <p className="mt-2 text-xs leading-5 text-ink-soft">
          Treine colaboradores que trabalham com equipes chinesas. Sem checkout de 1 assento — o Pro desta página continua sendo a assinatura individual.
        </p>
        <ButtonLink
          to="/business"
          variant="outline"
          size="lg"
          className="mt-4 w-full sm:w-auto"
          data-business-cta="pro-page"
        >
          Conhecer Business
        </ButtonLink>
        <p className="mt-3 text-[11px] leading-4 text-ink-faint">
          Empresa de grande porte? No Longyu Enterprise a implantação, SSO e relatórios entram como oferta comercial —{" "}
          <Link className="font-semibold text-ink underline-offset-2 hover:underline" to="/business#enterprise">
            conhecer Enterprise
          </Link>
          .
        </p>
      </section>

      <section className="rounded-xl border border-line/50 bg-surface p-4">
        <button
          type="button"
          onClick={() => setShowMatrix((current) => !current)}
          aria-expanded={showMatrix}
          className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        >
          <span className="font-serif text-base font-semibold text-ink">Matriz completa</span>
          <span className="text-xs font-semibold text-ink-faint">
            {showMatrix ? "Ocultar" : `Comparar ${PLAN_FEATURES.length} recursos`}
          </span>
        </button>
        <div className={showMatrix ? "mt-3 overflow-x-auto" : "hidden"}>
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="py-2 pr-3 font-semibold">Recurso</th>
                <th className="py-2 pr-3 font-semibold">Grátis</th>
                <th className="py-2 font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map((feature) => (
                <tr key={feature.id} className="border-b border-line/50">
                  <td className="py-2 pr-3 font-medium text-ink">{feature.nome}</td>
                  <td className="py-2 pr-3 text-ink-soft">{feature.freeTier ?? feature.freeLimit ?? "—"}</td>
                  <td className="py-2 text-ink">{feature.proBenefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line/50 bg-surface p-4 text-center shadow-card">
        <p className="text-sm text-ink-soft">
          {checkoutReady
            ? "30 dias grátis no anual — R$ 10/mês depois. Cancele quando quiser."
            : "A assinatura será liberada em breve."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {checkoutReady && !serverIsPro && (
            <Button className="bg-gold text-white hover:brightness-95" onClick={() => void handleSubscribe(selectedPlan)}>
              Começar grátis
            </Button>
          )}
          {serverIsPro && isBillingPortalAvailable() && (
            <Button variant="outline" onClick={() => void handleManageBilling()}>
              Gerenciar assinatura
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </section>
    </div>
  );
}
