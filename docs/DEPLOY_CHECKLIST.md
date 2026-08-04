# Checklist — Fase C (backend Supabase + Stripe)

Status do projeto Longyu. Atualize este arquivo ao concluir cada etapa operacional.

## Infra Supabase

| Item | Status | Notas |
|------|--------|-------|
| Projeto criado (`drjcfalvlbbeblmmyhwj`) | ✅ | |
| Migrations 001–003 aplicadas | ✅ | `user_progress`, RLS, `client_snapshot`, trigger de perfil |
| Migration 004 (Ligas) aplicada | ✅ | `league_tiers`, RPCs, backfill Bronze — via SQL Editor (09/07/2026) |
| Migrations 011–013 (pedagogia) no remoto | ✅ | Aplicadas 2026-08-04 via MCP; `verify:beta-feedback` verde |
| Migration 014–015 (ordenação Stripe) no remoto | ✅ | `apply_subscription_event` + fix row_count; webhook v8+ |
| Edge Functions publicadas | ✅ | checkout v9, billing-portal/webhook/delete-account v8 (2026-08-04) |
| `npm run verify:production` | ✅ | REST + functions respondendo (2026-08-04) |
| RLS testado (usuário A ≠ B) | ⬜ | Manual no SQL Editor ou Dashboard |
| Secrets Stripe no Supabase | ✅ | Presentes (webhook responde 400 sem assinatura, não 501) |
| Webhook Stripe apontando para `stripe-webhook` | ✅ | `whsec` configurado; usa `constructEventAsync` + RPC |

## App (frontend)

| Item | Status | Notas |
|------|--------|-------|
| `VITE_BACKEND_MODE=supabase` em dev | ✅ | `.env.local` |
| Auth: criar conta / login / logout | ✅ | |
| Sync automático (sem botões manuais) | ✅ | `CloudSyncBootstrap` |
| Botão **Sair** visível (TopBar + Conta) | ✅ | |
| Copy “sincronização em breve” removida com Supabase ativo | ✅ | |
| Restauração de sessão após reload | ✅ | `AuthBootstrap` + hidratação da store |
| Economia autoritativa no servidor (Fase 4) | ⬜ | Qi/Cargas ainda locais |

## Netlify (produção)

| Item | Status | Notas |
|------|--------|-------|
| Repositório conectado | ✅ | Site `singular-meringue-7838cd`, deploy GitHub `main` |
| `VITE_*` no painel do site | ✅ | Também em `netlify.toml` (produção) |
| Redirect URLs no Supabase Auth | ✅ | `singular-meringue-7838cd.netlify.app` |
| Smoke: criar conta → jogar → sair → entrar | ✅ | `c5c9dfd` em https://singular-meringue-7838cd.netlify.app — guest `/login`, `/pro` sem tutorial, signup+logout+login ok (08/07/2026) |
| PWA no celular (360px) | ⬜ | |

## Comandos rápidos

```bash
npm run setup:supabase          # checklist A→I no terminal
npm run configure:supabase-auth # dev: login sem confirmar email
npm run deploy:backend -- --all
npm run deploy:leagues          # só migration 004 (requer SUPABASE_ACCESS_TOKEN)
npm run verify:leagues
npm run verify:production
npm run verify:beta-feedback
npm run validate:beta
npm run ci
```

## Próximo marco (operacional)

Backend pedagogia + webhook Stripe atualizados no remoto (2026-08-04). Pendências reais:

1. Rodar runbook Stripe Test Mode (`docs/SUBSCRIPTION_E2E_REPORT.md`) com cartão `4242…` e confirmar `serverIsPro` — precisa de `STRIPE_SECRET_KEY=sk_test_…` no ambiente local (secrets já estão no Supabase)
2. PWA em device real (iOS Safari + Android Chrome)
3. Fase 4: Qi/Cargas autoritativos no servidor (ainda ⬜ na tabela App)
4. Opcional: `STRIPE_ALLOWED_ORIGINS` / `APP_CANONICAL_ORIGIN` no Supabase secrets (checkout já inclui Netlify beta + localhost por padrão)
