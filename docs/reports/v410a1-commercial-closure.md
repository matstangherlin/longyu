# V4.10A.1 — fechamento comercial depois da auditoria de schema

> **Base real.** Esta remessa foi construída sobre `bf9cda2` (head da branch
> `claude/trusting-heisenberg-o1v5sl`), e não sobre o merge da V4.10A — o PR
> #259 ainda não estava mergeado quando o trabalho começou, e a alternativa era
> ficar parado. A escolha foi confirmada com quem pediu a remessa. Tudo que a
> V4.10A entregou está nesta linha de commits, então não há nada de lá que este
> trabalho ignore; o que muda é que o SHA de base é o da branch e não o do
> merge.
>
> **Leia antes:** [v410a1-business-foundation-audit.md](./v410a1-business-foundation-audit.md).
> Ela é o P0 desta remessa e é o motivo de metade das decisões abaixo.

## O que esta remessa é

Comercial, e só. `CURRICULUM_FREEZE=RC1`, fingerprint `38e70062857d`, 134
lições, 113 temas — conferido por `validate:v410a1-freeze`, que também recusa
qualquer migration desta remessa que escreva conteúdo de currículo. Nenhuma
lição, nenhum chunk, nenhum caractere, nenhum Culture Item, nenhuma
Conversation Scene.

## Os três defeitos que existiam de verdade

Não são refinamentos. Cada um tinha consequência para alguém.

### 1. Dez convites cabiam numa empresa com cinco vagas

`organization_active_seat_count()` contava só `seat_status = 'active'`. Convite
pendente não ocupava lugar, então a licença só estourava quando todos
aceitassem — e aí a empresa já tinha mais gente dentro do que comprou.

A correção não foi mudar aquela função: ela conta ativos e continua contando
exatamente isso (há mutação dedicada para impedir que alguém mude o significado
dela). Quem passou a valer para o limite é
`organization_reserved_seat_count()` — ativos, convidados e convites pendentes
dentro do prazo.

### 2. Aceitar um convite Family não dava acesso a ninguém

Este é o mais instrutivo. A V4.10A entregou tabelas, RLS, trigger de assento com
advisory lock, contagem de lugares e o contrato TypeScript inteiro. Cada peça,
isolada, estava certa. E `get_server_entitlement()` não conhecia família — ele
sabia de organização, assinatura individual, grant e pérola. O membro entrava
numa família paga e continuava no plano grátis.

Passou despercebido porque nenhuma peça estava errada. Só o conjunto não
funcionava. O gate `validate:family-experience` existe por isso: ele cobre o
caminho inteiro, e sua mutação número um é exatamente este estado.

### 3. Os scripts de operação gravavam secrets que ninguém lê

`deploy-backend.mjs` e `set-stripe-price-secrets.mjs` gravavam
`STRIPE_PRICE_PRO_MONTHLY` e `_ANNUAL`. A Edge Function monta
`STRIPE_PRICE_<PLANO>_<CICLO>_<MERCADO>` desde que o catálogo virou plano ×
mercado × ciclo. Quem seguisse o fluxo documentado terminaria com os oito slots
vazios e todo checkout recusado com `PRICE_PENDING`, sem erro em lugar nenhum.

Os nomes agora saem de um lugar só (`scripts/lib/stripe-price-slots.mjs`), e o
script diz em voz alta quais slots seguem sem price id.

## O que foi medido, e onde

**PostgreSQL 16 real, local, com as migrations aplicadas de verdade.** Não é o
banco do deploy — ver a seção de evidência mais abaixo —, mas também não é
leitura de código.

### Reserva e disputa de assento Business

```
licenca=6 ativos=5 reservados=5
com 1 convite pendente: reservados=6 (esperado 6)
OK convite alem da licenca recusado
convite expirado: reservados=5 (esperado 5)
convite revogado: reservados=5 (esperado 5)
apos aceite: reservados=6 (esperado 6, nao 7)
```

Disputa do último assento, duas transações simultâneas:

```
antes da disputa: 5/6
A: A_EXIT=0
B: ERROR: BUSINESS_SEATS_FULL: 7 reservados, licenca e 6
depois: 6/6
```

Isso só funciona porque a função do trigger é **VOLATILE**. Em READ COMMITTED
cada consulta dentro dela pega snapshot novo, então a segunda transação, ao ser
liberada do advisory lock, enxerga a linha que a primeira commitou. Marcada
STABLE, ela herdaria o snapshot da instrução externa, contaria a menos, e as
duas passariam. Há mutação dedicada (`SEAT_ENFORCER_NOT_VOLATILE`).

### Autorização das RPCs do painel

```
owner A, própria org:  ACME | assentos 6/6
owner A, org B:        ERROR: FORBIDDEN
learner A, painel:     ERROR: FORBIDDEN
anônimo:               ERROR: UNAUTHENTICATED
```

### Family, fluxo inteiro

```
token com 64 chars, hash guardado = t
token em claro no banco? f
email normalizado: filho@exemplo.com
lugares apos convite: 2/6
OK convite duplicado recusado
OK email invalido recusado
OK nao-dono recusado (NO_FAMILY)
OK token errado recusado
lugares apos aceite: 2/6 (nao pode ter dobrado)
OK token de uso unico
dono ve 2 membros e 0 convites
membro ve 1 membro(s) e 0 convites, is_owner=false
OK membro nao remove
OK dono nao se remove
```

### Family, entitlement

```
membro:  is_pro=true  source=family_membership
dono:    is_pro=true  source=individual_subscription
de fora: is_pro=false source=none
economia enxerga o membro como pro? t
dono parou de pagar -> membro: is_pro=false
membro removido     -> is_pro=false
```

### Telas, em 390×844

Oito e2e em chromium, todos passando, mais os 16 do `smoke.spec` sem regressão.
O que eles medem está no commit `543ffb7`; o único que testa uma decisão em vez
de uma aparência é o link de convite sobreviver a quem ainda não entrou — sem
ele o convite só funciona para quem já estava logado.

## Onde a spec foi contrariada, e por quê

A auditoria do P0 encontrou o schema real dizendo outra coisa. Estas decisões
estão protegidas por `validate:business-schema-reuse`, cujas mutações são
literalmente o que a spec original pedia.

| A spec pedia | O que foi feito | Por quê |
| --- | --- | --- |
| `organizations.seat_limit` | não criado | a V4.4.1 removeu a coluna de propósito; recolocá-la cria duas fontes de licença, e no dia em que divergirem a empresa tem mais assentos do que pagou |
| `billing_email` novo | reusado | já existe em `organizations` **e** em `organization_subscriptions` |
| role `member` | `learner` | é o que o banco tem desde a V4.4 |
| status `canceled` | `churned` | idem |
| execute das funções de assento para `authenticated` | duas RPCs novas | conceder execute entregaria a contagem de assentos de qualquer organização a qualquer pessoa logada |
| tabelas Business novas | nenhuma | a auditoria mostrou o schema inteiro já de pé |

Uma divergência corrigida de passagem: a ordem das origens no servidor tinha
grant interno antes de pérola, ao contrário do resolvedor central em
`src/commercial/entitlements.ts`. Não muda quem tem acesso; muda o nome da
origem, que é justamente o que a tela mostra e o suporte lê.

## Registro de verdade do produto

`src/commercial/productTruth.ts` é a única fonte do que cada oferta é hoje:

| Oferta | Estado | Por quê |
| --- | --- | --- |
| `journey` | available | 134 lições no ar |
| `free_plan` | available | não depende de cobrança |
| `pro_individual` | **planned** | preço aprovado e checkout escrito; nenhum slot de Price ID exercitado |
| `family_plan` | **planned** | assentos, convite e entitlement prontos; falta poder comprar |
| `business_workspace` | pilot | licença e painel funcionam, mas a organização é provisionada por contrato |
| `enterprise_plan` | planned | cada caso passa por vendas |

`validate:commercial-product-truth` confere isso contra
`docs/release/rc1-operational-checks.json`: nenhuma oferta paga consegue se
declarar disponível enquanto `stripe_test_mode_e2e` não passar de verdade. O
P26.1 sai do texto e vira verificação — e a mutação que tenta escapar largando
o `gatedBy` também morre.

## Evidência operacional: o que continua NOT_RUN

**Nada aqui autoriza marcar check operacional.** O banco onde tudo foi medido é
local; o deploy tem RLS real, `auth.uid()` real, PgBouncer e latência — o timing
da disputa de assento é diferente lá.

A V4.10A.1 **acrescentou dois checks** ao documento operacional em vez de
fechar algum:

- `family_plan_live` — [runbook](../release/evidence/family-plan-live.md)
- `business_seats_live` — [runbook](../release/evidence/business-seats-live.md)

Placar: **zero de treze executados**, verdict **NO-GO**. O P40 da V4.10A pedia
para invalidar a evidência operacional do RC1.2; não havia o que invalidar —
nenhum check jamais passou, `release_candidate_sha` continua vazio.

## Gates novos

Quinze, todos no `validate:beta`:

| Gate | O que morre na mutação |
| --- | --- |
| `business-schema-reuse` | tabela paralela, `seat_limit` de volta, `member` como papel, `canceled` como estado |
| `business-seat-reservation` | voltar a contar só `active`; convite vencido segurando lugar |
| `business-seat-concurrency` | trigger STABLE, sem advisory lock, ramos colapsados numa condição só |
| `business-overview-rpc` | execute para `authenticated`, organization_id do cliente sem checagem, página sem teto |
| `business-progress-privacy` | resposta livre, fala transcrita, snapshot bruto, erro cru do banco |
| `family-experience` | aceitar convite sem conceder acesso; token do cliente; link multiuso |
| `commercial-product-truth` | oferta paga se declarando disponível sem evidência |
| `v410a1-freeze` | fingerprint, contagem de lições e temas, migration comercial escrevendo currículo |

Um detalhe do ramo colapsado merece registro, porque só apareceu ao executar: as
duas tabelas nomeiam o estado diferente (`seat_status` e `status`), e o PL/pgSQL
avalia o acesso ao campo mesmo quando a comparação de `tg_table_name` é falsa.
Numa condição só, gravar um membro estourava com `record "new" has no field
"status"`. Leitura de código não pegava isso.

## O que não foi feito

- **Compra de Family e de Pro.** O checkout está escrito e os oito slots são
  lidos pelo servidor; sem Price ID configurado, o botão falha fechado. É por
  isso que os dois estão `planned` no registro de verdade.
- **Autoatendimento Business.** Organização continua sendo provisionada por
  contrato. O painel funciona; a entrada, não.
- **Sair da família por conta própria.** Hoje só o dono remove. Um membro que
  quer sair depende dele.
- **WebKit.** Continua sem engine neste ambiente, e o passo de CI segue
  `continue-on-error`, então ninguém verifica Safari hoje. Está aberto desde a
  RC1.2 e esta remessa não mudou isso.

---

_Trabalho a partir de `bf9cda2`, na branch `claude/trusting-heisenberg-o1v5sl`.
Todo número deste relatório saiu de execução._
