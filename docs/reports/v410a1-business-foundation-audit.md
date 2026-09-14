# V4.10A.1 — P0: auditoria do Business que já existe

> **Entregue antes da implementação, e de propósito.** A Regra Número 1 da
> V4.10A.1 é auditar antes de criar migration. Esta auditoria é read-only sobre
> o que já está no `main`, então nada aqui depende do SHA do merge do #259.

Fonte: `supabase/migrations/20260825043000_business_foundation.sql` (V4.4) e
`supabase/migrations/20260825062000_business_operational_hardening.sql` (V4.4.1).

## BUSINESS FOUNDATION BEFORE V4.10A.1

| Requisito da spec | Estrutura existente | Campo / RPC | Reutilizar? | Lacuna real | Ação |
| --- | --- | --- | --- | --- | --- |
| organizations | `public.organizations` | `id, name, slug, country, company_domain, plan, status, billing_mode, billing_email` | **sim** | — | REUSE |
| organization_memberships | `public.organization_members` | PK `(organization_id, user_id)`, `role`, `seat_status`, `department`, `joined_at` | **sim** | — | REUSE |
| organization_invites | `public.organization_invites` | `token_hash` único, `status`, `expires_at`, `invited_by` | **sim** | — | REUSE |
| seat_limit | `public.organization_subscriptions` | `seat_limit` | **sim** | — | REUSE |
| billing_email | `organizations` **e** `organization_subscriptions` | `billing_email` | **sim** | — | REUSE |
| status da organização | `organizations.status` | `pending / active / suspended / churned` | **sim** | `canceled` chama-se `churned` | REUSE + mapear copy |
| status da participação | `organization_members.seat_status` | `invited / active / suspended / removed` | **sim** | `pending` chama-se `invited` | REUSE + mapear copy |
| roles | `organization_members.role` | `owner / admin / manager / learner` | **sim** | spec diz `member`; banco diz `learner` | REUSE + mapear copy |
| entitlement Business | `_user_organization_entitlement()` | devolve `organization_id, role, tier, access_source` | **sim** | — | REUSE |
| entitlement no cliente | `get_server_entitlement()` | já consumido por `entitlementService` | **sim** | — | REUSE |
| contagem de assentos | `organization_active_seat_count()` | conta `seat_status='active'` | **sim** | ver P14.3 abaixo | EXTEND |
| limite de assentos | `organization_seat_entitlement()` | assinatura ativa, senão grant ativo, senão 0 | **sim** | — | REUSE |
| guarda de assento | `organization_seats_within_entitlement()` | ativos ≤ entitlement | **sim** | ver grants abaixo | REUSE |
| RLS | 5 policies | organizations, members, invites, subscriptions, grants | **sim** | falta policy de escrita | ADD POLICY |
| timezone | — | — | não existe | **ausente** | ADD COLUMN |
| contract_reference | — | — | não existe | **ausente** | ADD COLUMN |

**Resultado: nenhuma tabela nova.** Duas colunas ausentes, uma política de
escrita e as RPCs de leitura do painel. É tudo.

---

## Três divergências entre a spec e o schema real

Estas não são detalhes de nomenclatura. Seguir a spec ao pé da letra em
qualquer uma delas produziria um defeito.

### 1. `seat_limit` **não** pertence a `organizations` — foi removido de propósito

O P15.1 lista `seat_limit` entre os campos mínimos da organização. Mas a V4.4.1
fez exatamente o contrário:

```sql
alter table public.organizations
  drop column if exists seat_limit;

comment on column public.organization_subscriptions.seat_limit is
  'Fonte canônica de licenças Business/Enterprise (compradas ou contratadas).';
```

Recolocar a coluna criaria **duas fontes de verdade para licença** — uma
comercial (a assinatura) e uma solta na organização — e o dia em que
divergissem, a empresa teria mais assentos do que pagou ou menos do que
contratou. A licença hoje sai de `organization_seat_entitlement()`, que lê a
assinatura ativa e cai para o grant de piloto/contrato quando não há
assinatura.

**Ação: não adicionar. Ler pela função.**

### 2. `billing_email` já existe

O P0.1 dá como exemplo `billing_email → ausente → adicionar`. Ele existe em
**duas** tabelas: `organizations.billing_email` e
`organization_subscriptions.billing_email`.

**Ação: reutilizar.** Vale decidir qual das duas manda quando divergirem — a da
assinatura é a que o financeiro usa.

### 3. Convite pendente **não** reserva assento no Business (ao contrário do Family)

O P14.3 pede para auditar isso. A resposta é não:

```sql
select count(*)::integer
from public.organization_members m
where m.organization_id = p_org_id
  and m.seat_status = 'active';
```

Só conta `active`. Um convite pendente não ocupa lugar, então dez convites
cabem em cinco vagas e a empresa estoura o limite quando todos aceitarem.

Isso é uma **assimetria real** com o que o #259 fez no Family, onde convite
pendente reserva e a corrida do último assento foi fechada por trigger com
advisory lock. A preferência declarada no P14.3 é que o Business se comporte
como o Family.

**Ação: EXTEND** — contar convites pendentes válidos junto dos ativos, e impor
por trigger, reaproveitando o desenho já validado no Family.

---

## Uma lacuna que a spec não prevê: as funções de assento são `service_role`

```sql
revoke all on function public.organization_active_seat_count(uuid)
  from public, anon, authenticated;
grant execute on function public.organization_active_seat_count(uuid) to service_role;
```

As três funções de assento — contagem, entitlement e guarda — foram revogadas
de `authenticated`. Um painel Business rodando no browser como `authenticated`
**não consegue chamá-las**.

Isso não é defeito: é a postura de menor privilégio da V4.4.1, tomada quando
não havia painel. Mas o P12 pede `42 / 50 assentos` na tela, então a V4.10A.1
precisa escolher conscientemente entre:

- uma RPC nova, `security definer`, que devolve só o agregado de assentos e é
  concedida a `authenticated`, com a própria função checando
  `is_organization_admin()`; ou
- passar o painel por Edge Function com `service_role`.

A primeira é mais simples e mantém a regra de acesso junto do dado. Recomendo
essa, e é o que o P18 (`get_business_overview`) já sugere na prática.

---

## O que isso muda no plano da V4.10A.1

| Item | Antes da auditoria | Depois |
| --- | --- | --- |
| P15 Business foundation | "criar backend foundation" | já existe; **zero tabela nova** |
| P15.1 campos | criar 10 campos | 8 existem, 2 faltam (`timezone`, `contract_reference`) |
| P15.1 `seat_limit` | criar na organização | **não criar** — quebraria a fonte canônica |
| P10.1 `billing_email` | possivelmente adicionar | já existe em duas tabelas |
| P14.2 seat limit | implementar | função existe; falta conceder acesso |
| P14.3 pending reserva | auditar | **não reserva hoje** — decisão e trigger pendentes |
| P8 resolver central | auditar e integrar | pronto no #259; falta a UI consumir |
| P19 RLS | revalidar | 5 policies de leitura existem; falta escrita |

O trabalho de banco da V4.10A.1 é: **duas colunas, uma política de escrita, um
trigger de assento e duas RPCs de leitura.** O resto do Business é UI sobre
estrutura que já está de pé há uma versão.

---

_Auditoria executada em `3311217`. Nenhum schema foi alterado para produzi-la._
