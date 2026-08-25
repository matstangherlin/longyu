/**
 * Portão V4.4.1 — Business operational hardening.
 * RLS helpers, entitlement explícito, seats canônicos, rate atômico,
 * honeypot antes da quota, funnel anti-abuse, Turnstile, Privacy, copy.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const foundation = read("supabase/migrations/20260825043000_business_foundation.sql");
const hardening = read("supabase/migrations/20260825062000_business_operational_hardening.sql");
const edge = read("supabase/functions/submit-business-lead/index.ts");
const form = read("src/features/business/BusinessLeadForm.tsx");
const service = read("src/services/businessLeadService.ts");
const offer = read("src/data/businessOffer.ts");
const proOffer = read("src/features/pro/ProBusinessOffer.tsx");
const businessPage = read("src/features/business/BusinessPage.tsx");
const sqlTest = read("scripts/sql/business-rls-a-ne-b.sql");

assert(fs.existsSync(path.join(root, "scripts/sql/business-rls-a-ne-b.sql")), "SQL A≠B Business");
assert(sqlTest.includes("is_organization_member"), "SQL testa helper member");
assert(sqlTest.includes("get_server_entitlement"), "SQL testa entitlement");
assert(sqlTest.includes("membership sem grant"), "SQL garante sem premium implícito");
assert(sqlTest.includes("organization_invites"), "SQL testa invites admin-only");

assert(hardening.includes("is_organization_member"), "helper is_organization_member");
assert(hardening.includes("is_organization_admin"), "helper is_organization_admin");
assert(hardening.includes("security definer"), "helpers SECURITY DEFINER");
assert(hardening.includes("set search_path = ''"), "helpers search_path vazio");
assert(
  /using \(public\.is_organization_member\(organization_id\)\)/.test(hardening),
  "policy members usa helper (sem self-SELECT)"
);
assert(!/from public\.organization_members me/.test(hardening.split("create policy organization_members_select_peer")[1]?.slice(0, 400) ?? ""), "policy members sem join recursivo");

assert(hardening.includes("organization_entitlement_grants"), "tabela de grants");
assert(hardening.includes("s.id is null") === false, "hardening não usa s.id is null");
assert(!foundation.includes("s.id is null"), "foundation sem premium implícito por ausência de cobrança");
assert(
  foundation.includes("organization_entitlement_grants") || hardening.includes("organization_entitlement_grants"),
  "grant explícito no schema"
);

assert(hardening.includes("drop column if exists seat_limit"), "remove organizations.seat_limit");
assert(
  /comment on column public\.organization_subscriptions\.seat_limit/.test(hardening) ||
    /seat_limit aqui é a fonte canônica/.test(foundation),
  "seat_limit canônico documentado"
);
assert(hardening.includes("organization_seat_entitlement"), "RPC seat entitlement");
assert(hardening.includes("organization_seats_within_entitlement"), "validação active <= entitlement");

assert(hardening.includes("pg_advisory_xact_lock"), "rate limit com advisory lock");
assert(foundation.includes("pg_advisory_xact_lock"), "foundation também atômica");
assert(hardening.includes("check_and_record_business_funnel_rate"), "funnel rate limit");

const honeypotIdx = edge.indexOf("honeypot");
const rateIdx = edge.indexOf("check_and_record_business_lead_rate");
assert(honeypotIdx >= 0 && rateIdx >= 0 && honeypotIdx < rateIdx, "honeypot antes do rate limit de e-mail");
assert(edge.includes("check_and_record_business_funnel_rate"), "Edge aplica funnel rate");
assert(edge.includes("verifyTurnstile") || edge.includes("resolveTurnstileSecret"), "Turnstile preparado");
assert(edge.includes("captcha_failed"), "Edge devolve captcha_failed");
assert(edge.includes("BUSINESS_LEAD_NOTIFY_WEBHOOK_URL"), "notificação via webhook privado");
assert(edge.includes("TURNSTILE_ALLOW_SKIP"), "skip Turnstile só com flag explícita");

assert(service.includes("getTurnstileToken"), "cliente envia Turnstile");
assert(form.includes('to="/privacidade"'), "formulário linka Privacidade");
assert(form.includes("Política de Privacidade"), "rótulo Privacidade visível");

assert(!/checkout de 1 assento/i.test(proOffer), "copy /pro sem jargão de checkout");
assert(!/não estão ligados neste app/i.test(proOffer), "copy /pro sem tom de changelog");
assert(!/não está ligado neste app/i.test(businessPage), "copy /business sem tom de changelog");
assert(proOffer.includes("programas piloto") || offer.includes("programas piloto"), "copy de piloto");
assert(
  offer.includes("avaliados conforme a implantação") || proOffer.includes("avaliados conforme a implantação"),
  "copy Enterprise honesta sem claim falso"
);
assert(offer.includes("Não publicamos preço") || offer.includes("Não publicamos preço nesta página"), "sem preço público");

assert(
  read("scripts/validate-backend-ready.mjs").includes("20260825062000_business_operational_hardening.sql"),
  "validate-backend-ready lista hardening"
);

if (errors.length > 0) {
  console.error("ERRO: test-business-hardening falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: test-business-hardening — V4.4.1 operational hardening.");
