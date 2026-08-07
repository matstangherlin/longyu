# E2E humano do programa de indicação (produção)

Use **duas contas inéditas** (e-mails reais). Netlify precisa estar deployado
com a build da `main` (Turnstile restaurado se for marketing).

## Fluxo feliz (2 dias)

1. **Conta A** (indicador)
   - Criar conta → confirmar e-mail → entrar
   - Abrir `/convide` (ou rota de indicação) → copiar link/código
2. **Conta B** (convidado)
   - Abrir o link de A (janela anônima)
   - Criar conta → confirmar e-mail → entrar
   - Completar **3 lições**
   - Voltar em **outro dia** (conta com ≥ 48h)
3. Disparar pipeline (login / sync / `process_referral_pipeline` via app)
4. **Conta A** deve receber **7 dias de Pro**

## SQL de validação

```sql
-- troque os e-mails
select r.status, r.attributed_at, r.qualified_at
from referrals r
join profiles pi on pi.id = r.inviter_id
join auth.users ui on ui.id = pi.id
where ui.email = 'conta-a@exemplo.com';

select status, reward_days, available_at, activated_at, expires_at
from referral_rewards
where user_id = (select id from auth.users where email = 'conta-a@exemplo.com');

select status, starts_at, ends_at, source
from entitlement_grants
where user_id = (select id from auth.users where email = 'conta-a@exemplo.com');

select public.get_server_entitlement(); -- como Conta A autenticada
```

Esperado:

- `referrals.status = rewarded`
- `referral_rewards.status` = `active` ou `available`
- `entitlement_grants.status` = `active` ou `pending`
- `get_server_entitlement()` → `is_pro=true` (quando grant ativo)

## Smoke SQL do pipeline (sem e-mail real)

Roda no SQL Editor (service role / dashboard) o script
`scripts/sql/referral-pipeline-smoke.sql`:

- cria 2 usuários `@longyu.invalid` já confirmados
- attribute → progresso (3 lições + 2 dias) → qualify → grant
- limpa os usuários ao final

Complementa `referral-rules-smoke.sql` (casos negativos / caps).

## Casos negativos (smoke SQL já cobre a maior parte)

Automatizado em `scripts/sql/referral-rules-smoke.sql` (rode no SQL Editor):

- autoindicação bloqueada
- mesmo referral não gera duas recompensas (`already_rewarded`)
- e-mail entra em `referral_email_blocks` após reward
- limite de 8 recompensas / 30 dias → `monthly_cap` / `under_review`
- indicador já Pro (Stripe) → reward `available` + grant `pending` (fila)

Ainda humano (precisa Auth real):

- e-mail recriado não gera novo benefício (`email_blocked` / `email_already_rewarded`)
- expiração remove Pro sem apagar progresso
- Stripe continua sendo a fonte da assinatura paga

## Cleanup de contas de teste

Não use e-mails `@longyu.invalid` no fluxo humano (só no smoke SQL).
Contas QA humanas: apagar pelo painel Auth ou `delete-account` quando terminar.
