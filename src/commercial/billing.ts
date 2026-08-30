import type { InterfaceLocale } from "../i18n/config";

export const BILLING_MARKETS = ["BR", "INTERNATIONAL"] as const;
export type BillingMarket = (typeof BILLING_MARKETS)[number];

export const BILLING_CURRENCIES = ["BRL", "USD"] as const;
export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

export const PRODUCT_PLANS = ["free", "pro", "family", "business", "enterprise"] as const;
export type ProductPlan = (typeof PRODUCT_PLANS)[number];
export type CheckoutPlan = Extract<ProductPlan, "pro" | "family">;

export const BILLING_CYCLES = ["monthly", "annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const PRICE_PENDING = "PRICE_PENDING" as const;
export type PriceStatus = typeof PRICE_PENDING | "CONFIGURED";

export interface PriceSlot {
  currency: BillingCurrency;
  status: PriceStatus;
  /** Minor units (centavos/cents). Null until commercial approval. */
  amountMinor: number | null;
  /** Server-only value. It must never be accepted from a checkout client. */
  providerPriceId: string | null;
}

export type PlanPriceMatrix = Record<
  CheckoutPlan,
  Record<BillingMarket, Record<BillingCycle, PriceSlot>>
>;

function pending(currency: BillingCurrency): PriceSlot {
  return { currency, status: PRICE_PENDING, amountMinor: null, providerPriceId: null };
}

/**
 * Central commercial contract. No final value has been approved in V4.8.6,
 * therefore every sellable slot fails closed as PRICE_PENDING.
 */
export const PLAN_PRICE_MATRIX: PlanPriceMatrix = {
  pro: {
    BR: { monthly: pending("BRL"), annual: pending("BRL") },
    INTERNATIONAL: { monthly: pending("USD"), annual: pending("USD") },
  },
  family: {
    BR: { monthly: pending("BRL"), annual: pending("BRL") },
    INTERNATIONAL: { monthly: pending("USD"), annual: pending("USD") },
  },
};

export type ServerConfigReader = (name: string) => string | undefined;

/** Build the authoritative matrix from server environment only. */
export function buildServerPriceMatrix(readConfig: ServerConfigReader): PlanPriceMatrix {
  const matrix = structuredClone(PLAN_PRICE_MATRIX);
  for (const plan of ["pro", "family"] as const) {
    for (const market of BILLING_MARKETS) {
      for (const cycle of BILLING_CYCLES) {
        const suffix = `${plan}_${cycle}_${market}`.toUpperCase();
        const rawAmount = readConfig(`LONGYU_PRICE_${suffix}_MINOR`);
        const providerPriceId = readConfig(`STRIPE_PRICE_${suffix}`)?.trim() || null;
        const amountMinor = rawAmount && /^\d+$/.test(rawAmount) ? Number(rawAmount) : null;
        if (amountMinor && providerPriceId) {
          matrix[plan][market][cycle] = {
            currency: billingCurrencyForMarket(market),
            status: "CONFIGURED",
            amountMinor,
            providerPriceId,
          };
        }
      }
    }
  }
  return matrix;
}

export const BILLING_MARKET_STORAGE_KEY = "longyu:billing-market";

export function billingMarketFromCountry(country: string): BillingMarket {
  return country.trim().toUpperCase() === "BR" ? "BR" : "INTERNATIONAL";
}

export function billingCurrencyForMarket(market: BillingMarket): BillingCurrency {
  return market === "BR" ? "BRL" : "USD";
}

export type MarketSuggestionSource = "account_country" | "explicit_choice" | "approximate_geo" | "fallback";

export interface BillingMarketSuggestion {
  market: BillingMarket;
  source: MarketSuggestionSource;
  authoritative: false;
}

/** Convenience only. Checkout always sends billingCountry for server resolution. */
export function suggestBillingMarket(input: {
  accountCountry?: string | null;
  explicitMarket?: BillingMarket | null;
  approximateCountry?: string | null;
}): BillingMarketSuggestion {
  if (input.accountCountry) {
    return { market: billingMarketFromCountry(input.accountCountry), source: "account_country", authoritative: false };
  }
  if (input.explicitMarket) {
    return { market: input.explicitMarket, source: "explicit_choice", authoritative: false };
  }
  if (input.approximateCountry) {
    return { market: billingMarketFromCountry(input.approximateCountry), source: "approximate_geo", authoritative: false };
  }
  return { market: "INTERNATIONAL", source: "fallback", authoritative: false };
}

export interface CheckoutRequest {
  plan: CheckoutPlan;
  cycle: BillingCycle;
  billingCountry: string;
  returnPath: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  resolvedPlan: CheckoutPlan;
  resolvedMarket: BillingMarket;
  resolvedCurrency: BillingCurrency;
}

export type AllowedPriceResolution = {
  plan: CheckoutPlan;
  cycle: BillingCycle;
  market: BillingMarket;
  currency: BillingCurrency;
  status: PriceStatus;
  amountMinor: number | null;
  providerPriceId: string | null;
};

export class BillingContractError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BillingContractError";
  }
}

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return value === "pro" || value === "family";
}

function isBillingCycle(value: unknown): value is BillingCycle {
  return value === "monthly" || value === "annual";
}

function assertNoClientPriceAuthority(input: Record<string, unknown>): void {
  for (const key of ["priceId", "clientPriceId", "providerPriceId", "currency", "amount", "amountMinor", "billingMarket"]) {
    if (key in input) throw new BillingContractError("CLIENT_PRICE_OVERRIDE", `Client field ${key} is not allowed.`);
  }
}

/**
 * Server-authority contract. The country selects the market; the server-owned
 * matrix selects currency, amount and provider price. UI locale is deliberately
 * absent from the input.
 */
export function resolveAllowedPrice(input: unknown, matrix: PlanPriceMatrix = PLAN_PRICE_MATRIX): AllowedPriceResolution {
  if (!input || typeof input !== "object") throw new BillingContractError("INVALID_REQUEST", "Invalid checkout request.");
  const value = input as Record<string, unknown>;
  assertNoClientPriceAuthority(value);
  if (!isCheckoutPlan(value.plan)) throw new BillingContractError("UNKNOWN_PLAN", "Unknown checkout plan.");
  if (!isBillingCycle(value.cycle)) throw new BillingContractError("UNKNOWN_CYCLE", "Unknown billing cycle.");
  if (typeof value.billingCountry !== "string" || !/^[A-Za-z]{2}$/.test(value.billingCountry.trim())) {
    throw new BillingContractError("UNKNOWN_BILLING_COUNTRY", "A two-letter billing country is required.");
  }

  const market = billingMarketFromCountry(value.billingCountry);
  const slot = matrix[value.plan][market][value.cycle];
  if (slot.currency !== billingCurrencyForMarket(market)) {
    throw new BillingContractError("INVALID_SERVER_PRICE", "Server price currency does not match its market.");
  }
  if (slot.status === "CONFIGURED" && (!Number.isInteger(slot.amountMinor) || (slot.amountMinor ?? 0) <= 0 || !slot.providerPriceId)) {
    throw new BillingContractError("INVALID_SERVER_PRICE", "Configured server price is incomplete.");
  }
  return { plan: value.plan, cycle: value.cycle, market, ...slot };
}

export function formatBillingAmount(
  amountMinor: number,
  currency: BillingCurrency,
  interfaceLocale: InterfaceLocale
): string {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) return "";
  return new Intl.NumberFormat(interfaceLocale === "pt-BR" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amountMinor / 100);
}

export function calculateAnnualSavingsPercent(monthlyMinor: number, annualMinor: number): number | null {
  if (!Number.isFinite(monthlyMinor) || !Number.isFinite(annualMinor) || monthlyMinor <= 0 || annualMinor < 0) return null;
  const baseline = monthlyMinor * 12;
  return Math.max(0, Math.round(((baseline - annualMinor) / baseline) * 100));
}
