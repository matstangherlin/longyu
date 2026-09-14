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

/**
 * P5 / P5.3 / P5.4 / P6.3 / P28.2 — o Family no banco.
 *
 * O gate lê a migration porque as propriedades que importam são do schema, e
 * não dá para inferi-las do TypeScript: se o limite de seis mora só na
 * aplicação, duas requisições simultâneas passam pelas duas checagens.
 */
export function validateFamilyPlanSchema(input) {
  const failures = [];
  const sql = code(input.migrationSource);

  for (const table of ["family_accounts", "family_memberships", "family_invites"]) {
    if (!new RegExp(`create table if not exists public\\.${table}\\b`).test(sql)) {
      fail(failures, "TABLE_MISSING", `tabela ${table} ausente`);
      continue;
    }
    if (!new RegExp(`alter table public\\.${table} enable row level security`).test(sql)) {
      fail(failures, "RLS_DISABLED", `${table} sem row level security`);
    }
  }

  // P5.3 — token nunca em claro.
  if (!/token_hash/.test(sql)) {
    fail(failures, "NO_TOKEN_HASH", "convite sem token_hash");
  }
  if (/\btoken\s+text\b/.test(sql) || /\binvite_token\b/.test(sql)) {
    fail(failures, "PLAINTEXT_TOKEN", "convite guarda token em claro");
  }
  if (!/expires_at/.test(sql)) {
    fail(failures, "NO_INVITE_EXPIRY", "convite sem expiração");
  }
  if (!/'revoked'/.test(sql)) {
    fail(failures, "NO_INVITE_REVOKE", "convite não pode ser revogado");
  }

  // P4 / P5.4 — seis lugares, impostos pelo servidor.
  const maxFn = sql.match(/create or replace function public\.family_max_members\(\)[\s\S]*?select\s+(\d+)/);
  if (!maxFn) {
    fail(failures, "NO_SERVER_LIMIT", "limite de assentos não existe no servidor");
  } else if (Number(maxFn[1]) !== 6) {
    fail(failures, "SERVER_LIMIT_NOT_SIX", `limite do servidor é ${maxFn[1]}, deveria ser 6`);
  }

  if (!/create constraint trigger family_memberships_seat_limit/.test(sql)) {
    fail(failures, "NO_SEAT_TRIGGER", "gravação de participação não passa pelo limite");
  }
  if (!/create constraint trigger family_invites_seat_limit/.test(sql)) {
    fail(failures, "NO_INVITE_SEAT_TRIGGER", "convite não passa pelo limite");
  }

  // Convite pendente ocupa lugar: sem isso, seis convites entram em cinco vagas.
  const seatsFn = sql.match(/create or replace function public\.family_seats_used[\s\S]*?\$\$([\s\S]*?)\$\$/);
  if (!seatsFn) {
    fail(failures, "NO_SEAT_COUNT", "contagem de assentos ausente");
  } else if (!/family_invites[\s\S]*'pending'/.test(seatsFn[1])) {
    fail(failures, "PENDING_INVITE_FREE_SEAT", "convite pendente não conta como lugar ocupado");
  }

  // A corrida de assento depende disto: a função do trigger precisa ser
  // VOLATILE para que cada consulta interna pegue snapshot novo depois do
  // advisory lock. Marcada STABLE, a segunda transação não enxerga a linha que
  // a primeira acabou de commitar e as duas passam — foi medido, não suposto.
  const enforce = sql.match(/create or replace function public\.enforce_family_seat_limit\(\)[\s\S]*?as \$\$/);
  if (!enforce) {
    fail(failures, "NO_SEAT_ENFORCER", "trigger de limite de assento ausente");
  } else if (/\b(stable|immutable)\b/i.test(enforce[0])) {
    fail(
      failures,
      "SEAT_ENFORCER_NOT_VOLATILE",
      "trigger de assento marcado STABLE/IMMUTABLE: a corrida volta"
    );
  } else if (!/pg_advisory_xact_lock/.test(enforce[0] + sql.slice(sql.indexOf(enforce[0])))) {
    fail(failures, "NO_SEAT_LOCK", "escrita de assento não é serializada");
  }

  // P6.3 — Family compartilha assinatura, não progresso.
  for (const forbidden of [
    "lesson_id",
    "xp",
    "mastery",
    "srs",
    "answer",
    "transcript",
    "progress",
    "client_snapshot",
  ]) {
    if (new RegExp(`^\\s*${forbidden}\\b`, "mi").test(sql)) {
      fail(failures, "FAMILY_TOUCHES_PROGRESS", `tabela de família carrega ${forbidden}`);
    }
  }

  return { failures };
}

/**
 * P26 / P27 — o entitlement vem do backend, e nenhuma origem cancela outra.
 *
 * O risco que este gate cobre é específico: alguém "resolve" um bug de
 * carregamento lendo uma flag do localStorage. A partir daí qualquer pessoa
 * com o devtools aberto vira Pro, e a checagem de servidor vira decoração.
 */
export function validateEffectiveEntitlement(input) {
  const failures = [];
  const source = code(input.entitlementSource);

  if (!/export function resolveEffectiveEntitlement/.test(source)) {
    fail(failures, "NO_RESOLVER", "resolveEffectiveEntitlement ausente");
  }
  if (!/activeSources/.test(source)) {
    fail(failures, "SOURCE_COLLAPSED", "origens ativas não são preservadas");
  }

  // Entitlement nunca sai do cliente.
  for (const pattern of [/localStorage/, /sessionStorage/, /document\.cookie/]) {
    if (pattern.test(source)) {
      fail(failures, "CLIENT_TRUSTED", `entitlement lendo armazenamento do cliente (${pattern})`);
    }
  }

  for (const [file, body] of Object.entries(input.consumerSources ?? {})) {
    const clean = code(body);
    if (/localStorage[\s\S]{0,80}(isPro|premiumAccess|family|entitlement)/i.test(clean)) {
      fail(failures, "CLIENT_ENTITLEMENT_FLAG", `${file}: acesso decidido por flag do cliente`);
    }
  }

  return { failures };
}

export function loadSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}
