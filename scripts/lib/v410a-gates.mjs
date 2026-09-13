/**
 * Gates da V4.10A — contrato comercial.
 *
 * A regra que dá sentido a este arquivo: o valor cobrado é público e aprovado,
 * e o Stripe Price ID é segredo de servidor. Tudo aqui existe para que essas
 * duas coisas não troquem de lado sem alguém perceber.
 *
 * As funções recebem o catálogo e o código-fonte por parâmetro em vez de ler do
 * disco, para que as mutações do P48 consigam atacar o contrato de verdade.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

/** Preços aprovados no contrato V4.10A, em unidades menores. */
export const APPROVED_PRICES = {
  pro: {
    BR: { monthly: 1700, annual: 17000 },
    INTERNATIONAL: { monthly: 500, annual: 5000 },
  },
  family: {
    BR: { monthly: 2700, annual: 27000 },
    INTERNATIONAL: { monthly: 800, annual: 8000 },
  },
};

export const APPROVED_CURRENCY = { BR: "BRL", INTERNATIONAL: "USD" };
export const ANNUAL_MONTHS = 10;

/** Remove comentários para que a prosa explicativa não acuse o próprio gate. */
export function code(source) {
  return String(source ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function fail(failures, code, message) {
  failures.push({ code, message });
}

/**
 * P0.1 / P0.2 / P0.3 / P1.2 — o catálogo público é o preço aprovado, o anual
 * equivale a dez meses, e ninguém converte câmbio em runtime.
 */
export function validateCommercialPricing(input) {
  const failures = [];
  const catalog = input.catalog;
  const billingSource = code(input.billingSource);

  if (!catalog || typeof catalog !== "object") {
    fail(failures, "NO_CATALOG", "catálogo comercial público ausente");
    return { failures };
  }

  for (const plan of ["pro", "family"]) {
    for (const market of ["BR", "INTERNATIONAL"]) {
      for (const cycle of ["monthly", "annual"]) {
        const entry = catalog?.[plan]?.[market]?.[cycle];
        const approved = APPROVED_PRICES[plan][market][cycle];
        const label = `${plan}/${market}/${cycle}`;
        if (!entry || typeof entry.amountMinor !== "number") {
          fail(failures, "PRICE_MISSING", `${label}: sem valor público declarado`);
          continue;
        }
        if (entry.amountMinor !== approved) {
          fail(
            failures,
            "PRICE_NOT_APPROVED",
            `${label}: ${entry.amountMinor} difere do aprovado ${approved}`
          );
        }
        if (entry.currency !== APPROVED_CURRENCY[market]) {
          fail(
            failures,
            "CURRENCY_MISMATCH",
            `${label}: moeda ${entry.currency} não é a do mercado (${APPROVED_CURRENCY[market]})`
          );
        }
        if (entry.providerPriceId) {
          fail(failures, "PRICE_ID_IN_PUBLIC_CATALOG", `${label}: Stripe Price ID não pode ser público`);
        }
      }

      // P0.3 — anual é dez mensalidades. Sem isso, "2 meses grátis" vira copy
      // solta, e a conta que a tela mostra deixa de fechar com a cobrança.
      const monthly = catalog?.[plan]?.[market]?.monthly?.amountMinor;
      const annual = catalog?.[plan]?.[market]?.annual?.amountMinor;
      if (typeof monthly === "number" && typeof annual === "number" && monthly > 0) {
        if (annual !== monthly * ANNUAL_MONTHS) {
          fail(
            failures,
            "ANNUAL_NOT_TEN_MONTHS",
            `${plan}/${market}: anual ${annual} não equivale a ${ANNUAL_MONTHS} × ${monthly}`
          );
        }
      }
    }
  }

  // P0.2 — USD não é BRL convertido. Nada de cotação em runtime.
  for (const pattern of [
    /\bexchangeRate\b/i,
    /\bfxRate\b/i,
    /\bconvertCurrency\b/i,
    /openexchangerates|exchangerate\.host|currencyapi/i,
  ]) {
    if (pattern.test(billingSource)) {
      fail(failures, "FX_CONVERSION", `conversão de câmbio no contrato comercial (${pattern})`);
    }
  }

  // P1.1 — o cliente não tem autoridade sobre preço.
  for (const field of ["priceId", "providerPriceId", "amountMinor", "currency", "discount"]) {
    if (!billingSource.includes(`"${field}"`)) {
      fail(failures, "CLIENT_AUTHORITY_UNGUARDED", `campo ${field} não está na lista barrada do cliente`);
    }
  }
  if (!/assertNoClientPriceAuthority/.test(billingSource)) {
    fail(failures, "NO_CLIENT_AUTHORITY_GUARD", "assertNoClientPriceAuthority sumiu do contrato");
  }

  return { failures };
}

/**
 * P1 — Stripe Price IDs continuam sendo segredo de servidor. Um `price_...`
 * literal em código de cliente é vazamento de configuração comercial e, pior,
 * convida o frontend a virar autoridade de preço.
 */
export function validateNoStripeIdsInClient(input) {
  const failures = [];
  for (const [file, source] of Object.entries(input.clientSources ?? {})) {
    const body = code(source);
    if (/["'`]price_[A-Za-z0-9]{6,}["'`]/.test(body)) {
      fail(failures, "STRIPE_ID_IN_CLIENT", `${file}: Stripe Price ID literal no cliente`);
    }
    if (/\bsk_(live|test)_/.test(body)) {
      fail(failures, "STRIPE_SECRET_IN_CLIENT", `${file}: chave secreta do Stripe no cliente`);
    }
  }
  return { failures };
}

/**
 * P4 / P4.1 — seis contas no total: dono mais cinco convidados. E a copy não
 * pode dizer "5 membros" para significar dono + 4.
 */
export function validateFamilySeats(input) {
  const failures = [];
  const { maxMembers, maxInvitees } = input;

  if (maxMembers !== 6) {
    fail(failures, "FAMILY_MAX_NOT_SIX", `FAMILY_MAX_MEMBERS é ${maxMembers}, deveria ser 6`);
  }
  if (maxInvitees !== 5) {
    fail(failures, "FAMILY_INVITEES_NOT_FIVE", `FAMILY_MAX_INVITEES é ${maxInvitees}, deveria ser 5`);
  }
  if (typeof maxMembers === "number" && typeof maxInvitees === "number" && maxInvitees !== maxMembers - 1) {
    fail(failures, "FAMILY_SEATS_INCOHERENT", "convidados precisam ser o total menos o dono");
  }

  // Convite pendente precisa ocupar lugar, senão seis convites entram em cinco vagas.
  const familySource = code(input.familySource);
  if (!/pendingInvites/.test(familySource)) {
    fail(failures, "PENDING_INVITE_FREE_SEAT", "convite pendente não ocupa lugar");
  }

  for (const [file, source] of Object.entries(input.copySources ?? {})) {
    const body = code(source);
    // "5 membros" / "5 pessoas" só é honesto se contar o dono. Como aqui o
    // total é 6, qualquer promessa de 5 contas é copy errada.
    if (/\b5\s+(membros|pessoas|contas|members|people|accounts)\b/i.test(body)) {
      fail(failures, "COPY_SAYS_FIVE", `${file}: copy promete 5 contas, mas o plano tem 6`);
    }
  }

  return { failures };
}

export function loadSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
