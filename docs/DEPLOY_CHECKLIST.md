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
| Cloudflare Turnstile | ⬜ | Código + CSP prontos; **falta widget + secrets**. Domínio próprio ainda não comprado → widget só com hostnames Netlify. Ver `ops/ENABLE_TURNSTILE.md` |
| Redirect canônico de e-mail | ✅ | Fallback da Edge = `singular-meringue-7838cd.netlify.app/confirmar-email` (não longyu.com.br até ter DNS) |
| Referral operacional | 🟡 | Schema 017 ok; 0 referrals / 0 rewards / 0 codes em prod (2026-08-04). Falta E2E humano 48h/2 contas |
| Testes referral/hardening | ✅ | `npm run test:referrals` + `test:create-account-hardening` no `validate:beta` |

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

Ordem alinhada à prontidão de marketing (Cloudflare já disponível):

1. **Ativar Turnstile** (`ops/ENABLE_TURNSTILE.md`):
   - Widget Invisible no Cloudflare (domínios longyu + netlify + localhost)
   - `supabase secrets set TURNSTILE_SECRET_KEY=... --project-ref drjcfalvlbbeblmmyhwj`
   - `VITE_TURNSTILE_SITE_KEY=...` no Netlify production → Clear cache and deploy
2. **Smoke de cadastro real** (1 conta inédita): criar → e-mail → confirmar → entrar
3. **E2E referral** (2 contas): A indica → B confirma → 3 lições → 48h → `referrals.status=rewarded` + grant Pro
4. **Branch protection na `main`**:
   ```bash
   export GITHUB_TOKEN=ghp_...   # PAT pessoal com admin no repo
   node scripts/setup-branch-protection.mjs
   ```
5. Device real iOS + Android (`docs/REAL_DEVICE_QA.md`)
6. Stripe Test Mode live (`npm run test:stripe` com `sk_test_`) se a beta for paga
7. Marketing progressivo (só depois de 1–3)
