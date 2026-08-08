/**
 * Portão estático do programa de indicação + hardening de create-account.
 * Prove regras no SQL/código sem depender de e-mail real ou espera de 48h.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) errors.push(msg);
}

const referralSql = read("supabase/migrations/017_referrals.sql");
const rateSql = read("supabase/migrations/018_signup_rate_limits.sql");
const createAccount = read("supabase/functions/create-account/index.ts");
const authService = read("src/services/authService.ts");
const turnstile = read("src/lib/turnstile.ts");
const checklist = read("docs/DEPLOY_CHECKLIST.md");

// —— Referral schema / regras ——
assert(referralSql.includes("create table if not exists public.referral_codes"), "017: referral_codes");
assert(referralSql.includes("create table if not exists public.referrals"), "017: referrals");
assert(referralSql.includes("create table if not exists public.referral_rewards"), "017: referral_rewards");
assert(referralSql.includes("create table if not exists public.entitlement_grants"), "017: entitlement_grants");
assert(referralSql.includes("create table if not exists public.referral_email_blocks"), "017: email_blocks");
assert(referralSql.includes("constraint referrals_no_self"), "017: bloqueia autoindicação");
assert(referralSql.includes("interval '48 hours'"), "017: espera 48h");
assert(referralSql.includes("interval '14 days'"), "017: prazo 14 dias");
assert(referralSql.includes("lesson_count < 3"), "017: 3 lições");
assert(referralSql.includes("active_days < 2"), "017: 2 dias ativos");
assert(referralSql.includes("rewards_30d >= 8"), "017: limite 8/30d");
assert(referralSql.includes("pending_days + 7 > 84"), "017: teto 12 semanas (84d)");
assert(referralSql.includes("reward_days"), "017: reward_days");
assert(referralSql.includes("'referral'"), "017: source referral em grants");
assert(referralSql.includes("attribute_referral"), "017: attribute_referral");
assert(referralSql.includes("process_referral_pipeline"), "017: process_referral_pipeline");
assert(referralSql.includes("get_referral_dashboard"), "017: get_referral_dashboard");
assert(referralSql.includes("ensure_referral_code"), "017: ensure_referral_code");
assert(referralSql.includes("enable row level security"), "017: RLS ligado");

// —— Signup rate limits ——
assert(rateSql.includes("signup_rate_events"), "018: tabela rate events");
assert(rateSql.includes("check_and_record_signup_rate"), "018: RPC rate limit");
assert(rateSql.includes("ip_15 >= 5"), "018: IP 5/15m");
assert(rateSql.includes("ip_24h >= 15"), "018: IP 15/24h");
assert(rateSql.includes("email_1h >= 3"), "018: email 3/1h");
assert(rateSql.includes("combo_15 >= 2"), "018: combo 2/15m");
assert(rateSql.includes("admin_cleanup_unconfirmed_signups"), "018: cleanup unconfirmed");
assert(rateSql.includes("grant execute on function public.check_and_record_signup_rate"), "018: grant service_role rate");

// —— create-account hardening ——
assert(createAccount.includes("GENERIC_PENDING_MESSAGE"), "create-account: mensagem genérica");
assert(createAccount.includes("already_exists") === false || !/code:\s*[\"']already_exists[\"']/.test(createAccount), "create-account: não exporta already_exists");
assert(!createAccount.includes('code: already ? "already_exists"'), "create-account: sem code already_exists");
assert(createAccount.includes("ALLOWED_EMAIL_REDIRECTS"), "create-account: allowlist redirect");
assert(createAccount.includes("sanitizeEmailRedirect"), "create-account: sanitize redirect");
assert(
  createAccount.includes("singular-meringue-7838cd.netlify.app/confirmar-email"),
  "create-account: canônico Netlify (sem domínio próprio ainda)",
);
assert(createAccount.includes("check_and_record_signup_rate"), "create-account: chama rate RPC");
assert(createAccount.includes("verifyTurnstile"), "create-account: Turnstile");
assert(createAccount.includes("TURNSTILE_SECRET_KEY"), "create-account: secret Turnstile");
assert(createAccount.includes("_edge_get_turnstile_secret"), "create-account: vault fallback");
assert(createAccount.includes("rate_limited"), "create-account: code rate_limited");
assert(createAccount.includes("email_confirm: false"), "create-account: email_confirm false");

const turnstileMig = read("supabase/migrations/019_turnstile_vault_secret.sql");
assert(turnstileMig.includes("_edge_get_turnstile_secret"), "019: vault RPC");
assert(!/0x4AAAAA/.test(turnstileMig), "019: sem secret hardcoded");

const netlifyToml = read("netlify.toml");
assert(netlifyToml.includes("VITE_TURNSTILE_SITE_KEY"), "netlify: site key Turnstile");
assert(
  /https:\/\/challenges\.cloudflare\.com/.test(netlifyToml),
  "netlify: CSP Turnstile (host canônico)",
);
assert(authService.includes("GENERIC_PENDING_MESSAGE") || authService.includes("Se o endereço puder ser utilizado"), "authService: mensagem genérica");
assert(authService.includes("getTurnstileToken"), "authService: turnstile token");
assert(authService.includes("turnstileSiteKey"), "authService: exige token quando site key existe");
assert(authService.includes("rate_limited"), "authService: trata rate_limited");
assert(authService.includes("captcha_failed"), "authService: trata captcha_failed");
assert(!authService.includes("already_exists"), "authService: sem ramo already_exists");

assert(turnstile.includes("VITE_TURNSTILE_SITE_KEY"), "turnstile helper: site key");
assert(turnstile.includes("getTurnstileToken"), "turnstile helper: export");
assert(turnstile.includes("interaction-only") || turnstile.includes("normal"), "turnstile helper: managed widget");
assert(!/size:\s*["']invisible["']/.test(turnstile), "turnstile helper: sem size invisible (API atual)");

const pipelineSmoke = read("scripts/sql/referral-pipeline-smoke.sql");
assert(pipelineSmoke.includes("_referral_try_qualify"), "pipeline-smoke: qualify");
assert(pipelineSmoke.includes("_referral_grant_reward"), "pipeline-smoke: grant");
assert(pipelineSmoke.includes("@longyu.invalid"), "pipeline-smoke: e-mails de teste");

assert(checklist.includes("001–017") || checklist.includes("001-017"), "checklist: 017 documentado");
assert(checklist.includes("018"), "checklist: 018 documentado");

const rulesSmoke = read("scripts/sql/referral-rules-smoke.sql");
assert(rulesSmoke.includes("self-referral"), "rules-smoke: autoindicação");
assert(rulesSmoke.includes("already_rewarded"), "rules-smoke: already_rewarded");
assert(rulesSmoke.includes("monthly_cap"), "rules-smoke: monthly_cap");
assert(rulesSmoke.includes("queued"), "rules-smoke: fila Pro");
assert(rulesSmoke.includes("referral_email_blocks"), "rules-smoke: email_blocks");

const cleanupMig = read("supabase/migrations/020_signup_cleanup_job.sql");
assert(cleanupMig.includes("run_signup_cleanup_job"), "020: cleanup job");
assert(cleanupMig.includes("signup_cleanup_runs"), "020: cleanup log table");

const qualifyFix = read("supabase/migrations/022_fix_referral_try_qualify.sql");
assert(qualifyFix.includes("invitee_user"), "022: rename record var");
assert(qualifyFix.includes("_referral_try_qualify"), "022: qualify function");

const referralQualificationHardening = read(
  "supabase/migrations/20260808093000_harden_referral_qualification.sql"
);
assert(
  referralQualificationHardening.includes("_referral_verified_progress"),
  "referral: qualification uses server-verified progress"
);
assert(
  !referralQualificationHardening
    .slice(referralQualificationHardening.indexOf("create or replace function public._referral_try_qualify"))
    .includes("_referral_progress_from_snapshot"),
  "referral: current qualification ignores client snapshot"
);

assert(fs.existsSync(path.join(root, "ops/REFERRAL_E2E.md")), "ops: REFERRAL_E2E runbook");

// —— Rotas / UI mínimas ——
const routes = read("src/routes.tsx");
assert(routes.includes("confirmar-email"), "rota /confirmar-email");
assert(routes.includes("convide") || fs.existsSync(path.join(root, "src/features/referral/ReferralPage.tsx")), "UI convide");

if (errors.length) {
  console.error("test:referrals FALHOU:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}

console.log("OK: test:referrals — regras 017/018 + create-account hardening presentes no código.");
