/**
 * Portão V4.4 — Longyu for Business foundation.
 * Contrato de planos, RLS de leads, Edge, copy sem clientes fictícios,
 * isolamento do checkout Pro individual.
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

const EMPLOYEE = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const GOALS = [
  "work_with_chinese_teams",
  "travel_to_china",
  "relocation",
  "industry_operations",
  "export_import",
  "custom",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLead(draft) {
  const errorsLocal = {};
  const firstName = String(draft.firstName ?? "").trim();
  const lastName = String(draft.lastName ?? "").trim();
  const workEmail = String(draft.workEmail ?? "").trim().toLowerCase();
  if (firstName.length < 2) errorsLocal.firstName = "nome";
  if (lastName.length < 2) errorsLocal.lastName = "sobrenome";
  if (!EMAIL_RE.test(workEmail)) errorsLocal.workEmail = "email";
  if (String(draft.company ?? "").trim().length < 2) errorsLocal.company = "empresa";
  if (String(draft.jobTitle ?? "").trim().length < 2) errorsLocal.jobTitle = "cargo";
  if (!EMPLOYEE.includes(draft.employeeCountRange)) errorsLocal.employeeCountRange = "faixa";
  if (String(draft.country ?? "").trim().length < 2) errorsLocal.country = "pais";
  if (!GOALS.includes(draft.goal)) errorsLocal.goal = "objetivo";
  if (!["asap", "this_quarter", "this_year", "exploring"].includes(draft.startWindow)) {
    errorsLocal.startWindow = "prazo";
  }
  return { ok: Object.keys(errorsLocal).length === 0, errors: errorsLocal };
}

const validDraft = {
  firstName: "Ana",
  lastName: "Silva",
  workEmail: "ana.silva@empresa.com.br",
  company: "Operação Brasil-China",
  jobTitle: "People Partner",
  employeeCountRange: "51-200",
  country: "Brasil",
  goal: "work_with_chinese_teams",
  startWindow: "this_quarter",
  message: "Piloto para time de qualidade.",
};

assert(validateLead(validDraft).ok, "lead válido deve passar");
assert(!validateLead({ ...validDraft, workEmail: "nao-e-email" }).ok, "email inválido deve falhar");
assert(!validateLead({ ...validDraft, employeeCountRange: "999" }).ok, "faixa fora do enum deve falhar");
assert(!validateLead({ ...validDraft, firstName: "A" }).ok, "nome curto deve falhar");

const leadTs = read("src/lib/businessLead.ts");
for (const range of EMPLOYEE) {
  assert(leadTs.includes(`"${range}"`), `businessLead.ts deve listar ${range}`);
}
assert(leadTs.includes("isBusinessHoneypotTriggered"), "honeypot no contrato TS");

const accessTier = read("src/lib/accessTier.ts");
assert(accessTier.includes("premiumAccessFromTier"), "premiumAccessFromTier");
assert(accessTier.includes('"business"'), "AccessTier business");
assert(accessTier.includes('"enterprise"'), "AccessTier enterprise");
assert(
  accessTier.includes("tier === \"pro\"") && accessTier.includes("tier === \"business\""),
  "premiumAccess cobre pro/business/enterprise"
);

const entitlementService = read("src/services/entitlementService.ts");
assert(entitlementService.includes("parseServerEntitlementRpc"), "RPC parseia ServerEntitlement");
assert(entitlementService.includes("fetchServerEntitlement"), "fetchServerEntitlement exportado");
assert(entitlementService.includes("entitlement.premiumAccess"), "serverIsPro deriva de premiumAccess");

const planFeatures = read("src/data/planFeatures.ts");
assert(planFeatures.includes('export type PlanTier = "free" | "pro"'), "PlanTier B2C permanece free|pro");

const checkout = read("supabase/functions/create-checkout-session/index.ts");
assert(checkout.includes('new Set(["pro_monthly", "pro_annual"])'), "checkout só Pro mensal/anual");
assert(checkout.includes('"line_items[0][quantity]": "1"'), "checkout quantity = 1");
assert(!/business_monthly|business_annual/.test(checkout), "checkout sem plano Business");

const proPage = read("src/features/pro/ProPage.tsx");
assert(proPage.includes("<ProBusinessOffer"), "ProPage usa oferta Business/Enterprise");
assert(proPage.includes("Para você"), "ProPage separa oferta individual");
assert(!/createCheckoutSession\([^)]*business/.test(proPage), "ProPage não faz checkout Business");

const proOffer = read("src/features/pro/ProBusinessOffer.tsx");
assert(proOffer.includes("Longyu for Business"), "bloco Longyu for Business");
assert(proOffer.includes("Longyu Business"), "card Business em /pro");
assert(proOffer.includes("Longyu Enterprise"), "card Enterprise em /pro");
assert(proOffer.includes('to="/business"'), "CTA Conhecer Business vai para /business");
assert(proOffer.includes("Falar com vendas"), "CTA Falar com vendas em /pro");
assert(proOffer.includes("Falar com nosso time"), "CTA Enterprise em /pro");
assert(proOffer.includes('trackBusinessEvent("business_cta_clicked"'), "CTA /pro dispara business_cta_clicked");
assert(proOffer.includes("oferta comercial") || proOffer.includes("piloto") || proOffer.includes("implantação"), "recursos não ligados como oferta comercial");
assert(!/R\$\s*\d/.test(proOffer), "oferta Business em /pro sem preço público");
assert(!/createCheckoutSession/.test(proOffer), "oferta Business não chama Stripe");

const businessPage = read("src/features/business/BusinessPage.tsx");
assert(businessPage.includes("Falar com vendas"), "CTA Falar com vendas");
assert(businessPage.includes("Falar com nosso time"), "CTA Enterprise");
assert(businessPage.includes("id=\"enterprise\""), "âncora Enterprise");
assert(!/BYD|byd\.com/i.test(businessPage), "página Business sem nome/logotipo de cliente");
assert(!/R\$\s*\d/.test(businessPage), "Business sem preço público");
assert(businessPage.includes("oferta comercial") || businessPage.includes("piloto") || businessPage.includes("Roadmap"), "não finge recursos Enterprise já ativos");

const offer = read("src/data/businessOffer.ts");
assert(!/BYD/i.test(offer), "copy comercial sem BYD");
assert(offer.includes("Não publicamos preço"), "sem preço público");
assert(offer.includes("piloto") || offer.includes("implantação"), "Enterprise/Business como oferta comercial");

const routes = read("src/routes.tsx");
assert(routes.includes('path: "/business"'), "rota pública /business");
assert(routes.includes("BusinessPage"), "BusinessPage lazy");

const appShell = read("src/components/layout/AppShell.tsx");
assert(!appShell.includes('path: "/business"'), "/business não vive no AppShell autenticado");

const seo = read("src/lib/seo.ts");
assert(seo.includes('path: "/business"'), "SEO /business");
assert(seo.includes("Treinamento de Mandarim para Empresas"), "título SEO corporativo");

const form = read("src/features/business/BusinessLeadForm.tsx");
assert(form.includes('htmlFor='), "labels htmlFor");
assert(form.includes('name="website"'), "honeypot website");
assert(form.includes("submitBusinessLead"), "envio via serviço, não insert direto");
assert(!form.includes('.from("business_leads")'), "form não insere em business_leads");

const service = read("src/services/businessLeadService.ts");
assert(service.includes('invoke') && service.includes("submit-business-lead"), "lead via Edge Function");
assert(!service.includes('.from("business_leads")'), "serviço não faz insert público");

const events = read("src/services/businessEvents.ts");
for (const name of [
  "business_page_view",
  "business_cta_clicked",
  "business_lead_started",
  "business_lead_submitted",
]) {
  assert(events.includes(name) || read("src/lib/businessLead.ts").includes(name), `evento ${name}`);
}
assert(!events.includes("workEmail"), "eventos sem e-mail");
assert(!events.includes("message"), "eventos sem mensagem");

const edge = read("supabase/functions/submit-business-lead/index.ts");
assert(edge.includes("check_and_record_business_lead_rate"), "Edge chama rate limit");
assert(edge.includes("honeypot") || edge.includes("website"), "Edge trata honeypot");
assert(edge.includes("admin.from(\"business_leads\").insert"), "insert com service role");
assert(edge.includes("code: \"rate_limited\""), "Edge devolve rate_limited");
assert(!/cf-connecting-ip/.test(edge), "Edge não confia em cf-connecting-ip");
assert(/parts\.length - 1/.test(edge), "Edge usa hop direito do XFF");
assert(edge.includes("EMAIL_RE"), "Edge valida e-mail");
assert(edge.includes("EMPLOYEE_COUNTS"), "Edge valida enum de colaboradores");

const config = read("supabase/config.toml");
assert(
  /\[functions\.submit-business-lead\]\s*verify_jwt\s*=\s*false/m.test(config),
  "submit-business-lead verify_jwt false (formulário público)"
);

const migration = read("supabase/migrations/20260825043000_business_foundation.sql");
for (const table of [
  "organizations",
  "organization_members",
  "organization_invites",
  "organization_subscriptions",
  "business_leads",
]) {
  assert(migration.includes(`create table if not exists public.${table}`), `tabela ${table}`);
}
assert(migration.includes("enable row level security"), "RLS ligado");
assert(migration.includes("revoke all on table public.business_leads"), "leads sem GRANT a anon/authenticated");
assert(!/create policy[\s\S]{0,80}business_leads/i.test(migration), "business_leads sem policy de insert público");
assert(migration.includes("role in ('owner', 'admin', 'manager', 'learner')"), "roles de organização");
assert(migration.includes("organization_subscriptions"), "assinatura corporativa isolada");
assert(migration.includes("'individual_subscription'"), "source individual_subscription");
assert(migration.includes("'organization'"), "source organization");
assert(migration.includes("v_is_pro := true"), "membership concede is_pro");
assert(
  migration.includes("comment on table public.subscriptions") &&
    migration.includes("pessoa física"),
  "subscriptions permanece individual"
);
assert(migration.includes("check_and_record_business_lead_rate"), "RPC de rate limit");
assert(
  /grant execute on function public\.check_and_record_business_lead_rate\(text, text\) to service_role/.test(
    migration
  ),
  "rate limit só service_role"
);
assert(
  /revoke all on function public\.check_and_record_business_lead_rate\(text, text\) from public, anon, authenticated/.test(
    migration
  ),
  "rate limit revogado de anon/authenticated"
);
assert(migration.includes("grant execute on function public.get_server_entitlement() to authenticated"), "entitlement autenticado");

const deploy = read("scripts/deploy-backend.mjs");
assert(deploy.includes("submit-business-lead"), "deploy lista submit-business-lead");

if (errors.length > 0) {
  console.error("ERRO: test-business-foundation falhou.");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("OK: test-business-foundation — V4.4 Business/Enterprise foundation.");
