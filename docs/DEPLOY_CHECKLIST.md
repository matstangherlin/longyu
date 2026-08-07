# Checklist — Fase C (backend Supabase + Stripe) + estabilização

Status do projeto Longyu. Atualize este arquivo ao concluir cada etapa operacional.

## Infra Supabase

| Item | Status | Notas |
|------|--------|-------|
| Projeto produção (`drjcfalvlbbeblmmyhwj`) | ✅ | MandarimProject |
| Projeto preview (`longyu-preview`) | 🗑️ | Pausado/removido 2026-08-04 — liberou cota Free (reativou `atomurus`). Netlify Preview fica em `local` |
| Migrations 001–017 no produção | ✅ | Inclui `017_referrals` (referrals, rewards, entitlement_grants) — verificado 2026-08-04 |
| Migration 018 signup rate limits | ✅ | Aplicada 2026-08-04: `signup_rate_events` + `check_and_record_signup_rate` + `admin_cleanup_unconfirmed_signups` |
| Edge Functions produção | ✅ | checkout/billing/delete/webhook + `create-account` (confirmação; `verify_jwt=false`; hardening rate limit/anti-enum/redirect allowlist) |
| `npm run verify:production` | ✅ | |
| `npm run verify:beta-feedback` | ✅ | |
| RLS testado (usuário A ≠ B) | ✅ | `scripts/sql/rls-a-ne-b.sql` executado em 2026-08-04 no MandarimProject (read/update bloqueados; admin RPCs negadas). Alternativa: `npm run test:rls` com `SUPABASE_SERVICE_ROLE_KEY` |
| Secrets Stripe no Supabase | ✅ | Webhook 400 sem assinatura (não 501) |
| Webhook Stripe | ✅ | `constructEventAsync` + `apply_subscription_event` |
| Confirmação de email | ✅ | Dashboard **Confirm email ON** (verificado 2026-08-04). App `/confirmar-email` + Edge `create-account` |
| Hardening create-account | ✅ | Rate limit Postgres (018), anti-enum, allowlist `emailRedirectTo`, cleanup dry-run — PRs #93/#94; `signup_rate_events` ativo em prod |
| Cloudflare Turnstile | ✅ | Managed no client (`size: normal`); Vault secret + site key Netlify; probe sem token = `captcha_failed` |
| Redirect canônico de e-mail | ✅ | Fallback da Edge = `singular-meringue-7838cd.netlify.app/confirmar-email` (não longyu.com.br até ter DNS) |
| Migration 019 Turnstile vault RPC | ✅ | Aplicada 2026-08-04 |
| Migration 020 signup cleanup job | ✅ | `run_signup_cleanup_job` + log `signup_cleanup_runs` (+ pg_cron dry-run se disponível) |
| Migration 022 fix `_referral_try_qualify` | ✅ | Alias `u` colidia com record → qualify quebrava; aplicado 2026-08-07 |
| Referral operacional | 🟡 | 017 + 022; rules + **pipeline smoke verde** (2026-08-07). Falta E2E humano 48h (`ops/REFERRAL_E2E.md`) |
| Testes referral/hardening | ✅ | `test:referrals` + `test:create-account-hardening` + `referral-rules-smoke` + `referral-pipeline-smoke` |

## App / Netlify

| Item | Status | Notas |
|------|--------|-------|
| Production → Supabase produção | ✅ | `netlify.toml` context.production |
| Deploy Preview isolado da produção | ✅ | `VITE_BACKEND_MODE=local`; assert bloqueia URL do projeto prod |
| Headers de segurança básicos | ✅ | X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Stripe Test Mode E2E completo | 🟡 | Espelho A–F verde; runbook humano + `npm run test:stripe` com `sk_test_` |
| PWA iPhone/Android reais | ⬜ | Ver `docs/REAL_DEVICE_QA.md` |
| Proteção da branch `main` | ⬜ | `GITHUB_TOKEN=ghp_... node scripts/setup-branch-protection.mjs` (precisa admin) |

## Portões

```bash
npm run gate:public-beta   # validate:beta + build + e2e chromium + verify remoto
npm run gate:production    # + firefox/webkit + test:rls + test:stripe
npm run test:rls           # A ≠ B (precisa service_role)
npm run test:stripe        # API test mode + probe webhook (precisa sk_test_)
```

## Próximo marco

1. ~~Pagar Netlify + restaurar Turnstile~~ ✅ (2026-08-07)
2. **Smoke de cadastro real** (1 conta inédita humana em `/conta`)
3. **E2E referral** 2 contas + 48h — `ops/REFERRAL_E2E.md`
4. **Branch protection na `main`** (precisa PAT admin do owner):
   ```bash
   export GITHUB_TOKEN=ghp_...
   node scripts/setup-branch-protection.mjs
   ```
5. Device real iOS + Android (`docs/REAL_DEVICE_QA.md`)
6. Stripe Test Mode live se beta paga
7. Marketing progressivo (depois de 2–3)

### Pacote mínimo create-account (relatório) — status

| Item | Status |
|------|--------|
| Rate limit IP/email/combo (Postgres) | ✅ 018 |
| Resposta genérica (anti-enum) | ✅ |
| Allowlist `emailRedirectTo` | ✅ canônico Netlify |
| Turnstile na Edge | ✅ ligado (Vault + Netlify) |
| Limpeza contas abandonadas | ✅ RPC + job 020 (dry-run default) |
