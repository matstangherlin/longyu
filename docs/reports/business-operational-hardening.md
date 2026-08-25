# V4.4.1 — Business operational hardening

Base: `main` `4374f67` (V4.4 foundation mergeada). Esta remessa **não** cria Admin, Stripe seats, SSO nem SCIM. **Não** altera pedagogia.

## Problemas que a V4.4 deixou abertos

| Risco | Situação na V4.4 | Correção V4.4.1 |
| --- | --- | --- |
| Backend em produção | Migration + Edge **não** aplicadas no MandarimProject | Staging-first; checklist; **não** aplicar direto em prod nesta PR |
| RLS recursiva em `organization_members` | Policy faz SELECT na própria tabela | Helpers `is_organization_member` / `is_organization_admin` (SECURITY DEFINER, `search_path=''`) |
| Premium implícito sem cobrança | `s.id is null` concedia acesso | Só assinatura ativa/trialing **ou** `organization_entitlement_grants` |
| Dois `seat_limit` | `organizations` + `organization_subscriptions` | Canônico: `organization_subscriptions.seat_limit` (+ grant). Coluna da org removida |
| Rate limit | COUNT→INSERT sem lock | `pg_advisory_xact_lock` por bucket |
| Honeypot | Depois do rate limit | Antes — bot não consome quota |
| Funnel | Sem limite | `check_and_record_business_funnel_rate` (40/15m + page_view 1/30s) |
| Captura de lead | Sem Turnstile / sem aviso | Turnstile (fail-closed se secret) + webhook `BUSINESS_LEAD_NOTIFY_WEBHOOK_URL` |
| LGPD no form | Só hint na mensagem | Link visível para `/privacidade` |
| Copy | Tom de changelog | Piloto / implantação, sem “checkout de 1 assento” |

## Migrations

1. `20260825043000_business_foundation.sql` — ajustada **antes** da primeira aplicação em produção (ainda não estava no MandarimProject).
2. `20260825062000_business_operational_hardening.sql` — idempotente se a foundation antiga já tiver sido aplicada em algum ambiente.

## Teste real de RLS

```bash
# No SQL Editor / MCP execute_sql, **depois** das duas migrations:
# scripts/sql/business-rls-a-ne-b.sql
```

Cenário: Org A / Org B, owner A, learner A, learner B. Isolamento, invites só admin, membership sem grant ≠ premium, grant ativo = business.

## Deploy (ordem)

1. Staging / branch Supabase (não MandarimProject direto).
2. Aplicar foundation + hardening.
3. Rodar `business-rls-a-ne-b.sql`.
4. Deploy Edge `submit-business-lead` com secrets:
   - `TURNSTILE_SECRET_KEY` (ou Vault)
   - opcional `TURNSTILE_ALLOW_SKIP=1` só em preview local
   - opcional `BUSINESS_LEAD_NOTIFY_WEBHOOK_URL` (+ `BUSINESS_LEAD_NOTIFY_TOKEN`)
5. Smoke: lead válido, honeypot, rate limit, e-mail inválido, funnel flood.
6. Só então produção.

## Portões

```bash
npm run test:business-foundation
npm run test:business-hardening
npm run validate:plans
```

## Fora de escopo

V4.5 Early Transfer, Business Admin MVP, Stripe seats, QA físico Android/desktop.
