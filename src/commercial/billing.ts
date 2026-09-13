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
export type PriceStatus = typeof PRICE_PENDING | "CONFIGURED" | "PRICE_MISMATCH";

export interface PriceSlot {
  currency: BillingCurrency;
  status: PriceStatus;
  /** Minor units (centavos/cents). Public, approved value. */
  amountMinor: number | null;
  /** Server-only value. It must never be accepted from a checkout client. */
  providerPriceId: string | null;
}

export type PlanPriceMatrix = Record<
  CheckoutPlan,
  Record<BillingMarket, Record<BillingCycle, PriceSlot>>
>;

export interface PublicPriceEntry {
  currency: BillingCurrency;
  amountMinor: number;
}

/**
 * Annual is priced as ten monthly payments — "dois meses grátis" is a literal
 * description of the contract, not a marketing rounding.
 */
export const ANNUAL_EQUIVALENT_MONTHS = 10;

/**
 * Preços comerciais aprovados, em unidades menores. Estes valores são
 * **públicos**: aparecem na UI e podem viver no bundle.
 *
 * USD não é BRL convertido. São dois preços comerciais independentes, por
 * decisão de produto — nada aqui consulta câmbio, hoje nem nunca.
 *
 * O que continua sendo segredo de servidor é o Stripe Price ID, que entra
 * apenas por `buildServerPriceMatrix` lendo o ambiente.
 */
export const PUBLIC_COMMERCIAL_CATALOG: Record<
  CheckoutPlan,
  Record<BillingMarket, Record<BillingCycle, PublicPriceEntry>>
> = {
  pro: {
    BR: {
      monthly: { currency: "BRL", amountMinor: 1700 },
      annual: { currency: "BRL", amountMinor: 17_000 },
    },
    INTERNATIONAL: {
      monthly: { currency: "USD", amountMinor: 500 },
      annual: { currency: "USD", amountMinor: 5000 },
    },
  },
  family: {
    BR: {
      monthly: { currency: "BRL", amountMinor: 2700 },
      annual: { currency: "BRL", amountMinor: 27_000 },
    },
    INTERNATIONAL: {
      monthly: { currency: "USD", amountMinor: 800 },
      annual: { currency: "USD", amountMinor: 8000 },
    },
  },
};

export function publicPrice(
  plan: CheckoutPlan,
  market: BillingMarket,
  cycle: BillingCycle
): PublicPriceEntry {
  return PUBLIC_COMMERCIAL_CATALOG[plan][market][cycle];
}

function pendingFromCatalog(plan: CheckoutPlan, market: BillingMarket, cycle: BillingCycle): PriceSlot {
  const entry = publicPrice(plan, market, cycle);
  return { currency: entry.currency, status: PRICE_PENDING, amountMinor: entry.amountMinor, providerPriceId: null };
}

/**
 * Contrato comercial central. O valor já está aprovado e é público; o que
 * ainda falta em cada slot é a ligação com o provedor de pagamento, então o
 * slot nasce PRICE_PENDING até o ambiente do servidor fornecer o Price ID.
 */
export const PLAN_PRICE_MATRIX: PlanPriceMatrix = {
  pro: {
    BR: { monthly: pendingFromCatalog("pro", "BR", "monthly"), annual: pendingFromCatalog("pro", "BR", "annual") },
    INTERNATIONAL: {
      monthly: pendingFromCatalog("pro", "INTERNATIONAL", "monthly"),
      annual: pendingFromCatalog("pro", "INTERNATIONAL", "annual"),
    },
  },
  family: {
    BR: { monthly: pendingFromCatalog("family", "BR", "monthly"), annual: pendingFromCatalog("family", "BR", "annual") },
    INTERNATIONAL: {
      monthly: pendingFromCatalog("family", "INTERNATIONAL", "monthly"),
      annual: pendingFromCatalog("family", "INTERNATIONAL", "annual"),
    },
  },
};

export type ServerConfigReader = (name: string) => string | undefined;

/**
 * Build the authoritative matrix from server environment only.
 *
 * O ambiente fornece o Stripe Price ID. Se ele também declarar um valor, esse
 * valor precisa bater com o catálogo público aprovado — um deploy que cobre
 * diferente do que a tela mostra é o defeito que este contrato existe para
 * impedir, então o slot falha fechado como PRICE_MISMATCH em vez de cobrar.
 */
export function buildServerPriceMatrix(readConfig: ServerConfigReader): PlanPriceMatrix {
  const matrix = structuredClone(PLAN_PRICE_MATRIX);
  for (const plan of ["pro", "family"] as const) {
    for (const market of BILLING_MARKETS) {
      for (const cycle of BILLING_CYCLES) {
        const suffix = `${plan}_${cycle}_${market}`.toUpperCase();
        const rawAmount = readConfig(`LONGYU_PRICE_${suffix}_MINOR`);
        const providerPriceId = readConfig(`STRIPE_PRICE_${suffix}`)?.trim() || null;
        const approvedMinor = publicPrice(plan, market, cycle).amountMinor;
        const declaredMinor = rawAmount && /^\d+$/.test(rawAmount) ? Number(rawAmount) : null;
        if (declaredMinor !== null && declaredMinor !== approvedMinor) {
          matrix[plan][market][cycle] = {
            currency: billingCurrencyForMarket(market),
            status: "PRICE_MISMATCH",
            amountMinor: approvedMinor,
            providerPriceId: null,
          };
          continue;
        }
        if (providerPriceId) {
          matrix[plan][market][cycle] = {
            currency: billingCurrencyForMarket(market),
            status: "CONFIGURED",
            amountMinor: approvedMinor,
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
  for (const key of [
    "priceId",
    "clientPriceId",
    "providerPriceId",
    "currency",
    "amount",
    "amountMinor",
    "billingMarket",
    "discount",
    "coupon",
    "promotionCode",
  ]) {
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
  if (slot.status === "PRICE_MISMATCH") {
    throw new BillingContractError(
      "PRICE_MISMATCH",
      "Server price does not match the approved public catalog."
    );
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

/** Quantos meses o plano anual custa, em pagamentos mensais equivalentes. */
export function annualEquivalentMonths(monthlyMinor: number, annualMinor: number): number | null {
  if (!Number.isFinite(monthlyMinor) || !Number.isFinite(annualMinor) || monthlyMinor <= 0) return null;
  return annualMinor / monthlyMinor;
}

/**
 * Meses grátis no anual, e só quando forem exatos. Devolver null em vez de
 * arredondar impede que a UI prometa "2 meses grátis" sobre uma conta que não
 * fecha — a copy do P0.3 tem que sair do cálculo, não de um número fixo.
 */
export function freeMonthsOnAnnual(monthlyMinor: number, annualMinor: number): number | null {
  const months = annualEquivalentMonths(monthlyMinor, annualMinor);
  if (months === null || !Number.isInteger(months) || months > 12) return null;
  return 12 - months;
}
