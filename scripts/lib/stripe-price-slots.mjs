/**
 * Os oito slots de preço, com os nomes exatos que o servidor lê.
 *
 * A convenção vem de buildServerPriceMatrix em src/commercial/billing.ts:
 * `STRIPE_PRICE_<PLANO>_<CICLO>_<MERCADO>`. Ela mora aqui para que os scripts
 * de operação parem de divergir do que a Edge Function realmente consulta —
 * os nomes antigos (STRIPE_PRICE_PRO_MONTHLY, sem mercado) não são lidos por
 * ninguém, e um deploy com eles deixa o checkout devolvendo PRICE_PENDING para
 * sempre, sem erro em lugar nenhum.
 */
export const STRIPE_PRICE_PLANS = ["PRO", "FAMILY"];
export const STRIPE_PRICE_CYCLES = ["MONTHLY", "ANNUAL"];
export const STRIPE_PRICE_MARKETS = ["BR", "INTERNATIONAL"];

/** Sufixos na ordem plano · ciclo · mercado, como o servidor monta. */
export const STRIPE_PRICE_SUFFIXES = STRIPE_PRICE_PLANS.flatMap((plan) =>
  STRIPE_PRICE_CYCLES.flatMap((cycle) => STRIPE_PRICE_MARKETS.map((market) => `${plan}_${cycle}_${market}`))
);

export const STRIPE_PRICE_SLOTS = STRIPE_PRICE_SUFFIXES.map((suffix) => `STRIPE_PRICE_${suffix}`);
