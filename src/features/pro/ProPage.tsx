import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { IconCheck, IconLock } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import { isQaFastPathAllowed } from "../../lib/appEnvironment";
import {
  PLAN_PRICE_MATRIX,
  PRICE_PENDING,
  billingMarketFromCountry,
  type BillingCycle,
  type BillingMarket,
  type CheckoutPlan,
  type ProductPlan,
} from "../../commercial/billing";
import { FAMILY_MAX_MEMBERS } from "../../commercial/family";
import { createCheckoutSession, isBillingPortalAvailable, openBillingPortal } from "../../services/subscriptionService";
import { useTranslation } from "../../i18n/useTranslation";
import { localizeUserMessage } from "../../i18n/errors";

const PLAN_ORDER: readonly ProductPlan[] = ["free", "pro", "family", "business", "enterprise"];

export function ProPage() {
  const { t } = useTranslation();
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
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
            <select id="billing-country" value={billingCountry} onChange={(event) => setBillingCountry(event.target.value === "BR" ? "BR" : "US")}
              className="mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
              <option value="BR">{t("pro.brazil")}</option>
              <option value="US">{t("pro.outsideBrazil")}</option>
            </select>
          </div>
          {qaMarketSwitch && (
            <div>
              <div className="flex rounded-lg border border-line p-1" data-testid="qa-billing-market-switch">
                {(["BR", "INTERNATIONAL"] as const).map((market) => (
                  <button key={market} type="button" onClick={() => setQaMarketOverride(market)} aria-pressed={qaMarketOverride === market}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${billingMarket === market ? "bg-gold text-white" : "text-ink-soft"}`}>
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
        <h2 className="mb-3 text-center font-serif text-xl font-semibold text-ink">{t("pro.fullCatalog")}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {PLAN_ORDER.map((plan) => {
            const sellable = plan === "pro" || plan === "family";
            const active = sellable && selectedPlan === plan;
            return (
              <Card key={plan} className={active ? "border-gold/35 bg-gold/[0.06] p-4" : "p-4"}>
                <h3 className="font-serif text-lg font-semibold text-ink">{planCopy[plan].title}</h3>
                <p className="mt-1 min-h-10 text-xs leading-5 text-ink-soft">{planCopy[plan].lead}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-ink"><IconCheck width={13} height={13} className="text-gold" />{planCopy[plan].access}</div>
                {plan === "family" && (
                  <ul className="mt-2 space-y-1 text-[11px] text-ink-soft">
                    <li>{t("pro.upToMembers", { count: FAMILY_MAX_MEMBERS })}</li><li>{t("pro.separateAccounts")}</li><li>{t("pro.individualProgress")}</li>
                  </ul>
                )}
                {sellable ? (
                  <Button variant={active ? "primary" : "outline"} className="mt-4 w-full" onClick={() => setSelectedPlan(plan)}>{t("pro.selectPlan", { plan: planCopy[plan].title })}</Button>
                ) : plan === "business" || plan === "enterprise" ? (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => navigate("/business#contato")}>{t("pro.contactSales")}</Button>
                ) : null}
              </Card>
            );
          })}
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
            <div><h2 className="font-serif text-lg font-semibold text-ink">{planCopy[selectedPlan].title}</h2><p className="mt-1 text-xs text-ink-soft">{billingMarket === "BR" ? "BRL" : "USD"}</p></div>
            <Pill tone="gold">{t("pro.pricePending")}</Pill>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["monthly", "annual"] as const).map((cycle) => (
              <button key={cycle} type="button" onClick={() => setSelectedCycle(cycle)} aria-pressed={selectedCycle === cycle}
                className={`rounded-xl border p-3 text-left ${selectedCycle === cycle ? "border-gold/40 bg-gold/10" : "border-line"}`}>
                <span className="text-sm font-semibold text-ink">{cycle === "monthly" ? t("pro.monthlyLabel") : t("pro.annualLabel")}</span>
                <span className="mt-1 block text-xs text-ink-faint">{t("pro.pricePending")}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">{t("pro.pricePendingDetail")}</p>
          <Button className="mt-3 w-full" disabled={!checkoutEnabled} onClick={() => void handleCheckout()}><IconLock width={14} height={14} /> {t("pro.unavailable")}</Button>
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
