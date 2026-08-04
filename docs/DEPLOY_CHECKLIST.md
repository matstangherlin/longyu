# Checklist — Fase C (backend Supabase + Stripe) + estabilização

Status do projeto Longyu. Atualize este arquivo ao concluir cada etapa operacional.

## Infra Supabase

| Item | Status | Notas |
|------|--------|-------|
| Projeto produção (`drjcfalvlbbeblmmyhwj`) | ✅ | MandarimProject |
| Projeto preview (`wpnmygzxqvmpdlcuwrjp`) | ✅ | `longyu-preview` — schema 001–015 aplicado; Netlify Preview ainda em `local` até configurar anon key |
| Migrations 001–016 no produção | ✅ | Pedagogia + Stripe ordering + `fix_leagues_cohort_finalize` |
| Edge Functions produção | ✅ | checkout/billing/delete/webhook + `create-account` (confirmação de email; verify_jwt=false) |
| `npm run verify:production` | ✅ | |
| `npm run verify:beta-feedback` | ✅ | |
| RLS testado (usuário A ≠ B) | ✅ | `scripts/sql/rls-a-ne-b.sql` executado em 2026-08-04 no MandarimProject (read/update bloqueados; admin RPCs negadas). Alternativa: `npm run test:rls` com `SUPABASE_SERVICE_ROLE_KEY` |
| Secrets Stripe no Supabase | ✅ | Webhook 400 sem assinatura (não 501) |
| Webhook Stripe | ✅ | `constructEventAsync` + `apply_subscription_event` |
| Confirmação de email | ✅ | Dashboard **Confirm email ON** (verificado 2026-08-04: signUp sem sessão). App `/confirmar-email` + Edge `create-account`. Workflow Auth opcional (`SUPABASE_ACCESS_TOKEN`) para redirects/CI |

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

1. **Ativar branch protection na `main`**:
   ```bash
   export GITHUB_TOKEN=ghp_...   # PAT pessoal com admin no repo
   node scripts/setup-branch-protection.mjs
   ```
   Ou manualmente em Settings → Branches: exigir `Portão de qualidade`, `Testes E2E`, `npm audit`, `CodeQL`, `Secret scan`.
2. Device real iOS + Android (`docs/REAL_DEVICE_QA.md`) — áudio/PWA/offline após o fix TTS
3. Rodar runbook Stripe Test Mode completo (`npm run test:stripe` com `sk_test_`) se a beta for paga
4. Opcional: `npm run test:rls` com service_role (espelho HTTP do SQL já verde)
