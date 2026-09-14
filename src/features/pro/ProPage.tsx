import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { IconCheck, IconLock } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import { isQaFastPathAllowed } from "../../lib/appEnvironment";
import {
  PLAN_PRICE_MATRIX,
  PRICE_PENDING,
  billingCurrencyForMarket,
  billingMarketFromCountry,
  formatBillingAmount,
  freeMonthsOnAnnual,
  publicPrice,
  type BillingCycle,
  type BillingMarket,
  type CheckoutPlan,
  type ProductPlan,
} from "../../commercial/billing";
import { FAMILY_MAX_MEMBERS } from "../../commercial/family";
import {
  availabilityLabelKey,
  productAvailability,
  type ProductCapabilityId,
} from "../../commercial/productTruth";
import { createCheckoutSession, isBillingPortalAvailable, openBillingPortal } from "../../services/subscriptionService";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";

/**
 * Cada cartão diz o que a oferta é hoje, lido do registro de verdade.
 *
 * Antes disso a página inteira soava igualmente comprável: Free, Pro, Família,
 * Business e Enterprise lado a lado, com o mesmo peso visual e nenhum sinal de
 * que três deles ainda não têm caminho de compra.
 */
const TRUTH_BY_PLAN: Record<ProductPlan, ProductCapabilityId> = {
  free: "free_plan",
  pro: "pro_individual",
  family: "family_plan",
  business: "business_workspace",
  enterprise: "enterprise_plan",
};

const PERSONAL_PLANS: readonly ProductPlan[] = ["free", "pro", "family"];
const COMPANY_PLANS: readonly ProductPlan[] = ["business", "enterprise"];

export function ProPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const serverIsPro = useStore((state) => state.serverIsPro);
  const checkingPlan = useEntitlementStatus((state) => state.checking);
  const [billingCountry, setBillingCountry] = useState<"BR" | "US">("BR");
  const [qaMarketOverride, setQaMarketOverride] = useState<BillingMarket | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<CheckoutPlan>("pro");
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("annual");
  const [notice, setNotice] = useState<string | null>(null);
  const qaMarketSwitch = isQaFastPathAllowed();
  const billingMarket = qaMarketOverride ?? billingMarketFromCountry(billingCountry);

  const selectedPrice = PLAN_PRICE_MATRIX[selectedPlan][billingMarket][selectedCycle];
  const checkoutEnabled = selectedPrice.status !== PRICE_PENDING && Boolean(selectedPrice.providerPriceId);

  const planCopy = useMemo(
    () => ({
      free: { title: t("pro.planFree"), lead: t("pro.freeLead"), access: t("pro.freeAccess") },
      pro: { title: t("pro.planPro"), lead: t("pro.proLead"), access: t("pro.proAccess") },
      family: { title: t("pro.planFamily"), lead: t("pro.familyLead"), access: t("pro.familyAccess") },
      business: { title: t("pro.planBusiness"), lead: t("pro.businessLead"), access: t("pro.businessAccess") },
      enterprise: { title: t("pro.planEnterprise"), lead: t("pro.enterpriseLead"), access: t("pro.enterpriseAccess") },
    }),
    [t]
  );

  const currency = billingCurrencyForMarket(billingMarket);

  /**
   * Preço público do catálogo aprovado — não do que o servidor devolveu.
   *
   * A tela mostra o valor porque ele está aprovado; o checkout continua
   * fechado até o slot ter Price ID. São duas perguntas diferentes, e juntá-las
   * deixava a página dizendo "preço a definir" sobre um preço já definido.
   */
  function priceFor(plan: CheckoutPlan, cycle: BillingCycle) {
    const entry = publicPrice(plan, billingMarket, cycle);
    return formatBillingAmount(entry.amountMinor, entry.currency, locale);
  }

  /**
   * Equivalência mensal do anual. Sai da conta, nunca de um número fixo: se o
   * catálogo mudar e a divisão não fechar, a linha some em vez de mentir.
   */
  function annualCopyFor(plan: CheckoutPlan) {
    const monthly = publicPrice(plan, billingMarket, "monthly").amountMinor;
    const annual = publicPrice(plan, billingMarket, "annual").amountMinor;
    const perMonth = annual / 12;
    const equivalent = Number.isInteger(perMonth)
      ? t("pro.annualEquivalent", { amount: formatBillingAmount(perMonth, currency, locale) })
      : null;
    const free = freeMonthsOnAnnual(monthly, annual);
    return { equivalent, freeMonths: free && free > 0 ? t("pro.freeMonthsOnAnnual", { count: free }) : null };
  }

  async function handleCheckout() {
    if (!checkoutEnabled) return;
    const result = await createCheckoutSession({
      plan: selectedPlan,
      cycle: selectedCycle,
      billingCountry,
      returnPath: "/pro",
    });
    setNotice(localizeUserMessage(result.message));
    if (result.data?.checkoutUrl) window.location.assign(result.data.checkoutUrl);
  }

  async function handlePortal() {
    const result = await openBillingPortal();
    setNotice(localizeUserMessage(result.message));
    if (result.data?.url) window.location.assign(result.data.url);
  }

  function renderPlanCard(plan: ProductPlan) {
    const sellable = plan === "pro" || plan === "family";
    const active = sellable && selectedPlan === plan;
    return (
      <Card key={plan} className={active ? "border-gold/35 bg-gold/[0.06] p-4" : "p-4"}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-ink">{planCopy[plan].title}</h3>
          <Pill tone={productAvailability(TRUTH_BY_PLAN[plan]) === "available" ? "good" : "muted"}>
            {t(availabilityLabelKey(productAvailability(TRUTH_BY_PLAN[plan])))}
          </Pill>
        </div>
        <p className="mt-1 min-h-10 text-xs leading-5 text-ink-soft">{planCopy[plan].lead}</p>
        {plan === "free" ? (
          <p className="mt-3 font-serif text-xl font-semibold text-ink">{t("pro.freeForever")}</p>
        ) : sellable ? (
          <div className="mt-3" data-plan-price={plan}>
            <p className="font-serif text-xl font-semibold text-ink">
              {priceFor(plan as CheckoutPlan, selectedCycle)}{" "}
              <span className="font-sans text-xs font-normal text-ink-soft">
                {selectedCycle === "monthly" ? t("pro.perMonth") : t("pro.perYear")}
              </span>
            </p>
            {selectedCycle === "annual" && annualCopyFor(plan as CheckoutPlan).equivalent && (
              <p className="mt-0.5 text-[11px] text-ink-faint">{annualCopyFor(plan as CheckoutPlan).equivalent}</p>
            )}
          </div>
        ) : null}
        <div className="mt-3 flex items-center gap-2 text-xs text-ink">
          <IconCheck width={13} height={13} className="text-gold" />
          {planCopy[plan].access}
        </div>
        {plan === "family" && (
          <ul className="mt-2 space-y-1 text-[11px] text-ink-soft">
            <li>{t("pro.upToMembers", { count: FAMILY_MAX_MEMBERS })}</li>
            <li>{t("pro.separateAccounts")}</li>
            <li>{t("pro.individualProgress")}</li>
          </ul>
        )}
        {sellable ? (
          <Button variant={active ? "primary" : "outline"} className="mt-4 w-full" onClick={() => setSelectedPlan(plan)}>
            {t("pro.selectPlan", { plan: planCopy[plan].title })}
          </Button>
        ) : plan === "business" ? (
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink to="/business" className="w-full" data-business-cta="pro-page">
              {t("pro.meetBusiness")}
            </ButtonLink>
            <ButtonLink to="/business#contato" variant="outline" className="w-full" data-business-cta="pro-sales">
              {t("pro.contactSales")}
            </ButtonLink>
          </div>
        ) : plan === "enterprise" ? (
          <ButtonLink
            to="/business#contato"
            variant="outline"
            className="mt-4 w-full"
            data-business-cta="pro-enterprise"
          >
            {t("pro.contactSales")}
          </ButtonLink>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]" data-pro-page>
      <section className="rounded-2xl border border-gold/20 bg-[linear-gradient(160deg,rgb(var(--gold)/0.12)_0%,rgb(var(--surface))_48%,rgb(var(--bg))_100%)] p-5 text-center shadow-card sm:p-7">
        <Mascot size={88} variant="celebrate" className="mx-auto" />
        <Pill tone="gold" className="mt-3">{t("pro.badge")}</Pill>
        <h1 className="mt-3 font-serif text-2xl font-semibold text-ink sm:text-3xl">{t("pro.pricingHeadline")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ink-soft">{t("pro.pricingLead")}</p>
        {serverIsPro && !checkingPlan && (
          <div className="mx-auto mt-4 max-w-sm space-y-2">
            <div className="rounded-xl border border-good/30 bg-good/10 px-4 py-2.5 text-sm font-semibold text-good">{t("pro.activeThanks")}</div>
            {isBillingPortalAvailable() && (
              <Button variant="outline" className="w-full" onClick={() => void handlePortal()}>{t("pro.manageBilling")}</Button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line/60 bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-ink">{t("pro.billingRegion")}</h2>
            <p className="mt-1 text-xs text-ink-soft">{t("pro.serverAuthority")}</p>
            <label className="mt-3 block text-xs font-semibold text-ink" htmlFor="billing-country">{t("pro.billingCountry")}</label>
            <select
              id="billing-country"
              value={billingCountry}
              onChange={(event) => setBillingCountry(event.target.value === "BR" ? "BR" : "US")}
              className="mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="BR">{t("pro.brazil")}</option>
              <option value="US">{t("pro.outsideBrazil")}</option>
            </select>
          </div>
          {qaMarketSwitch && (
            <div>
              <div className="flex rounded-lg border border-line p-1" data-testid="qa-billing-market-switch">
                {(["BR", "INTERNATIONAL"] as const).map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => setQaMarketOverride(market)}
                    aria-pressed={qaMarketOverride === market}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${billingMarket === market ? "bg-gold text-white" : "text-ink-soft"}`}
                  >
                    {market === "BR" ? t("pro.brazil") : t("pro.international")}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-ink-faint">{t("pro.qaMarketSwitch")}</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("pro.forYou")}</div>
          <h2 className="font-serif text-xl font-semibold text-ink">{t("pro.fullCatalog")}</h2>
        </div>
        <div
          className="mx-auto mb-4 flex w-full max-w-xs rounded-xl border border-line p-1"
          role="group"
          aria-label={t("pro.billingCycle")}
          data-testid="billing-cycle-switch"
        >
          {(["monthly", "annual"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setSelectedCycle(cycle)}
              aria-pressed={selectedCycle === cycle}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${
                selectedCycle === cycle ? "bg-gold text-white" : "text-ink-soft"
              }`}
            >
              {cycle === "monthly" ? t("pro.monthlyLabel") : t("pro.annualLabel")}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {PERSONAL_PLANS.map((plan) => renderPlanCard(plan))}
        </div>
      </section>

      <section data-pro-business className="space-y-3">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">{t("pro.forCompanies")}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {COMPANY_PLANS.map((plan) => renderPlanCard(plan))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-4">
          <h2 className="font-serif text-lg font-semibold text-ink">{t("pro.planFamily")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("pro.familyLead")}</p>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {[t("pro.upToMembers", { count: FAMILY_MAX_MEMBERS }), t("pro.proEveryMember"), t("pro.ownJourney"), t("pro.oneSubscription"), t("pro.noSharedProgress")].map((item) => (
              <li key={item} className="flex gap-2"><IconCheck width={14} height={14} className="mt-0.5 shrink-0 text-gold" />{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-ink-faint">{t("pro.privacyNote")}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">{planCopy[selectedPlan].title}</h2>
              <p className="mt-1 text-xs text-ink-soft">{currency}</p>
            </div>
            <Pill tone="gold">{t("pro.approvedPrice")}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["monthly", "annual"] as const).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setSelectedCycle(cycle)}
                aria-pressed={selectedCycle === cycle}
                className={`rounded-xl border p-3 text-left ${selectedCycle === cycle ? "border-gold/40 bg-gold/10" : "border-line"}`}
              >
                <span className="text-sm font-semibold text-ink">{cycle === "monthly" ? t("pro.monthlyLabel") : t("pro.annualLabel")}</span>
                <span className="mt-1 block text-xs text-ink-faint" data-checkout-price={cycle}>
                  {priceFor(selectedPlan, cycle)}
                </span>
              </button>
            ))}
          </div>
          {selectedCycle === "annual" && annualCopyFor(selectedPlan).freeMonths && (
            <p className="mt-3 text-xs font-semibold text-good">{annualCopyFor(selectedPlan).freeMonths}</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            {checkoutEnabled ? t("pro.serverAuthority") : t("pro.checkoutNotLive")}
          </p>
          <Button className="mt-3 w-full" disabled={!checkoutEnabled} onClick={() => void handleCheckout()}>
            {checkoutEnabled ? (
              t("pro.subscribeNow", { plan: planCopy[selectedPlan].title })
            ) : (
              <>
                <IconLock width={14} height={14} /> {t("pro.unavailable")}
              </>
            )}
          </Button>
          {notice && <p className="mt-2 text-xs text-ink-soft">{notice}</p>}
        </Card>
      </section>

      <section className="rounded-xl border border-line/50 bg-surface p-4 text-center">
        <p className="text-xs text-ink-soft">{t("pro.existingTerms")}</p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate(-1)}>{t("common.back")}</Button>
      </section>
    </div>
  );
}
