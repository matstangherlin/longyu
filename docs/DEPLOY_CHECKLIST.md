# Checklist — Fase C (backend Supabase + Stripe) + estabilização

Status do projeto Longyu. Atualize este arquivo ao concluir cada etapa operacional.

## Infra Supabase

| Item | Status | Notas |
|------|--------|-------|
| Projeto produção (`drjcfalvlbbeblmmyhwj`) | ✅ | MandarimProject |
| Projeto preview (`wpnmygzxqvmpdlcuwrjp`) | ✅ | `longyu-preview` — schema 001–015 aplicado; Netlify Preview ainda em `local` até configurar anon key |
| Migrations 001–016 no produção | ✅ | Pedagogia + Stripe ordering + `fix_leagues_cohort_finalize` |
| Edge Functions produção | ✅ | checkout/webhook/billing/delete v8–v9 |
| `npm run verify:production` | ✅ | |
| `npm run verify:beta-feedback` | ✅ | |
| RLS testado (usuário A ≠ B) | 🟡 | Script `npm run test:rls` pronto; exige `SUPABASE_SERVICE_ROLE_KEY` local |
| Secrets Stripe no Supabase | ✅ | Webhook 400 sem assinatura (não 501) |
| Webhook Stripe | ✅ | `constructEventAsync` + `apply_subscription_event` |

## App / Netlify

| Item | Status | Notas |
|------|--------|-------|
| Production → Supabase produção | ✅ | `netlify.toml` context.production |
| Deploy Preview isolado da produção | ✅ | `VITE_BACKEND_MODE=local`; assert bloqueia URL do projeto prod |
| Headers de segurança básicos | ✅ | X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Stripe Test Mode E2E completo | 🟡 | Espelho A–F verde; runbook humano + `npm run test:stripe` com `sk_test_` |
| PWA iPhone/Android reais | ⬜ | Ver `docs/REAL_DEVICE_QA.md` |
| Proteção da branch `main` | ⬜ | Ativar no GitHub: require `Portão de qualidade` + `Testes E2E` |

## Portões

```bash
npm run gate:public-beta   # validate:beta + build + e2e chromium + verify remoto
npm run gate:production    # + firefox/webkit + test:rls + test:stripe
npm run test:rls           # A ≠ B (precisa service_role)
npm run test:stripe        # API test mode + probe webhook (precisa sk_test_)
```

## Próximo marco

1. Ativar branch protection na `main` (checks obrigatórios)
2. Configurar Netlify Preview com anon key do `longyu-preview` (ou manter local)
3. Rodar runbook Stripe Test Mode completo
4. Rodar `npm run test:rls` com service_role
5. Device real iOS + Android
6. Regenerar auditoria oficial após o portão verde
