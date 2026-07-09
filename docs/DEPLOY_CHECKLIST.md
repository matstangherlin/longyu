# Checklist — Fase C (backend Supabase, pré-Stripe)

Status do projeto Longyu. Atualize este arquivo ao concluir cada etapa operacional.

## Infra Supabase

| Item | Status | Notas |
|------|--------|-------|
| Projeto criado (`drjcfalvlbbeblmmyhwj`) | ✅ | |
| Migrations 001–003 aplicadas | ✅ | `user_progress`, RLS, `client_snapshot`, trigger de perfil |
| Edge Functions publicadas | ✅ | checkout, billing-portal, webhook, delete-account |
| `npm run verify:production` | ✅ | REST + functions respondendo |
| RLS testado (usuário A ≠ B) | ⬜ | Manual no SQL Editor ou Dashboard |
| Secrets Stripe no Supabase | ✅ | Price IDs mensal/anual + trial 30 dias |
| Webhook Stripe apontando para `stripe-webhook` | ✅ | `whsec` configurado |

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
npm run verify:production
npm run validate:beta
npm run ci
```

## Próximo marco (Fase 5 — Stripe)

1. `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_PRICE_PRO_MONTHLY=... STRIPE_PRICE_PRO_ANNUAL=...`
2. Webhook no Stripe Dashboard → `https://<ref>.supabase.co/functions/v1/stripe-webhook`
3. Prices no Stripe:
   - mensal: `R$ 24,90/mês`
   - anual: `R$ 120/ano` (apresentado como `R$ 10/mês`, com desconto)
   - ambos com `30 dias grátis`
4. Checkout de teste em `/pro` com cartão `4242…`
5. Confirmar `serverIsPro` após webhook
