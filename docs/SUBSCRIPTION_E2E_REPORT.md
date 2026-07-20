# Longyu — Auditoria E2E da assinatura real (0.2.0-beta.1)

Auditoria de ponta a ponta do fluxo de monetização: **frontend → Stripe → webhook
→ Supabase → troca de conta → energia → recursos Pro**. Objetivo central: garantir
que **o usuário não continue Pro indevidamente** e **não perca Pro enquanto ainda
tem direito**.

- **Build auditado:** branch `claude/longyu-mobile-qa-real-f89lfl`.
- **Método:** auditoria de código (webhook, RPC de entitlement, store, energia,
  paywall, edge functions), correções de correção/segurança e um **teste
  automatizado de cenários** (`npm run test:subscription-webhook`) que exercita
  A–F, idempotência e eventos fora de ordem contra um espelho fiel do RPC atômico.

## ⚠️ Escopo honesto (leia antes do veredito)

Este ambiente de automação **não tem chaves do Stripe nem `.env.local`**, então
**os fluxos não foram disparados em Stripe Test Mode real** aqui. O que foi feito:

1. **Auditoria do código** de todo o caminho e **correção dos defeitos** encontrados.
2. **Teste automatizado** que modela o webhook + entitlement + energia e valida os
   6 cenários, idempotência e ordenação de eventos (verde).
3. **Runbook de Stripe Test Mode** (seção 7) para fechar o critério num ambiente
   com chaves. Enquanto esse runbook não rodar num projeto Stripe de teste, a
   monetização **não deve ser considerada 100% pronta** — conforme o critério.

**Veredito:** os defeitos que quebravam o critério (Pro indevido / perda de Pro)
foram **corrigidos e cobertos por teste**. Falta a passada final em **Stripe Test
Mode** com chaves reais (runbook pronto na seção 7).

---

## 0. Defeitos encontrados e corrigidos

| # | Área | Defeito | Impacto no critério | Correção |
|---|---|---|---|---|
| 1 | webhook | `customer.subscription.created` **não era tratado** | Estado inicial do trial dependia só do checkout | Passa a tratar `created` (+ `updated`/`deleted`) pelo RPC |
| 2 | webhook | `checkout.session.completed` **forçava `status: "active"`** mesmo em trial e sem `current_period_end` | Trial aparecia como "active"; sem data de expiração | Agora **busca a assinatura real** (`subscriptions.retrieve`) e grava status/período corretos |
| 3 | webhook | Upsert **incondicional**: evento antigo fora de ordem revertia estado novo; `deleted` podia voltar a ativo | **Pro indevido** / assinatura removida "ressuscitando" | RPC atômico `apply_subscription_event` aplica só se `event.created >= ` ao persistido |
| 4 | webhook | `constructEvent` (síncrono) **quebra no Deno/edge** (sem crypto do Node) | Webhook falharia em produção → Supabase nunca atualizava | Troca por `constructEventAsync` (Web Crypto) |
| 5 | checkout | `success_url`/`cancel_url` vinham do header `Origin` **sem allowlist** | Redirecionamento de retorno para domínio arbitrário | Allowlist de origins (`STRIPE_ALLOWED_ORIGINS` + canônico) e de `planKey` |
| 6 | app (UX) | Sem estado de **carregando** do entitlement | Paywall podia piscar para Pro legítimo | Flag transitória + **"Verificando seu plano…"** na ProPage |

Nenhum defeito de **perda de Pro com direito** foi encontrado no lado do app: a
reconciliação de energia e o `effectivePremium` já eram conservadores. O risco real
estava no **webhook** (defeitos 1–4).

---

## 1. Cenários obrigatórios (A–F)

Legenda resultado: ✅ auditado + coberto por teste automatizado · 🧪 requer Stripe
Test Mode para a passada final (runbook §7).

| Cenário | Usuário | Status Stripe | Status Supabase (`subscriptions`) | Resultado no app | Energia | Recursos Pro | Resultado |
|---|---|---|---|---|---|---|---|
| **A. Trial iniciado** | grátis → checkout | `trialing` | `status=trialing`, `current_period_end=+30d` | **Pro liberado** (RPC: trialing + período válido) | **Ilimitada** (Pro ignora consumo de cargas) | Abertos | ✅ 🧪 |
| **A. logout/login** | mesmo | `trialing` | inalterado | Pro mantido (revalida no servidor no login) | Ilimitada | Abertos | ✅ 🧪 |
| **B. Trial→pago** | trial vence, paga | `active` | `status=active`, `current_period_end` **atualizado** | Pro continua | Ilimitada | Abertos | ✅ 🧪 |
| **C. Pagamento falha** | trial vence, falha | `past_due`/`unpaid` | `status=past_due`/`unpaid` | **Pro removido** (RPC nega) | **Volta a 5** (+ bônus reais do dia) | **Paywall** | ✅ 🧪 |
| **D. Cancelamento** | cancela no fim | `active` + `cancel_at_period_end=true` | idem | **Pro até a data**; após a data, período vence e `deleted`→`canceled` derruba | Ilimitada até a data; depois 5 | Abertos até a data | ✅ 🧪 |
| **E. Reativação** | cancela e reativa antes do fim | `active`, `cancel_at_period_end` volta a `false` | idem | **Pro sem interrupção** | Ilimitada | Abertos | ✅ 🧪 |
| **F. Troca de conta** | A Pro → logout → B grátis → volta A | A: `active` / B: sem linha | A tem linha; B não | A Pro; **B não herda** Pro nem energia; voltar a A restaura | B: energia própria (não infinita) | B: paywall | ✅ 🧪 |

**Progresso** (lições, XP, hànzì, Qi) **é preservado** em C, D e F: a reconciliação
opera **só sobre `dailyEnergy`** — nunca zera Qi nem progresso (ver §3).

**Por que "energia ilimitada" não vaza** (C/D/F): o Pro não guarda um número
"infinito"; ele é **comportamental** — `hasProAccess` faz o app **pular o consumo
de cargas** (`canStartEnergyActivity`/`consumeEnergyActivity`). Ao perder Pro,
`hasProAccess` vira `false` e as cargas passam a ser consumidas normalmente; um
teto inflado é cortado pelo `reconcileFreePlanEnergy`. Então uma conta grátis
(B) simplesmente não recebe o bypass — não existe valor infinito para herdar.

---

## 2. Webhooks

Eventos tratados por `supabase/functions/stripe-webhook/index.ts`:

| Evento | Ação |
|---|---|
| `checkout.session.completed` | Busca a assinatura real e grava status/período via RPC; registra transação. **Fallback resiliente:** se o `retrieve` falhar, ainda grava o vínculo `user↔assinatura` + Pro (o checkout é o único evento com `client_reference_id`), e um `updated` posterior corrige status/período |
| `customer.subscription.created` | Grava estado via RPC (novo) |
| `customer.subscription.updated` | Grava estado via RPC |
| `customer.subscription.deleted` | Grava `canceled` via RPC |
| `invoice.paid` | Registra transação `paid` |
| `invoice.payment_failed` | Registra transação `failed` |

### Idempotência e ordenação (garantias)

- **Mesmo evento duas vezes não duplica:** transações usam `upsert` no índice
  único `stripe_event_id`; a assinatura reaplica os mesmos dados (mesmo
  `event.created`) sem efeito colateral.
- **Evento antigo não reverte estado novo:** o RPC `apply_subscription_event`
  (migração 014) só escreve se `excluded.stripe_event_created >=
  subscriptions.stripe_event_created` — a checagem é **atômica** no `ON CONFLICT …
  WHERE` (sem janela de corrida entre ler e escrever).
- **Assinatura removida não permanece ativa:** `deleted` grava `canceled`; um
  `updated` (active) atrasado é **descartado** pela guarda de ordem. Além disso, o
  RPC de entitlement exige `current_period_end > now()`, então mesmo antes do
  `deleted` a expiração já derruba o Pro.
- **Assinatura desconhecida sem `user_id`:** o RPC **só atualiza linha existente**
  (nunca cria linha órfã), evitando registro inconsistente.

Cobertura automatizada: `scripts/test-subscription-webhook.mjs` (A–F, replay
idêntico, `deleted`→`updated` fora de ordem, transação duplicada).

---

## 3. Reconciliação de energia (ao sair do Pro)

`reconcileFreePlanEnergy` (store) roda em `setServerEntitlement(false)` e na
migração/normalização das contas guardadas. Garante:

- **remove o infinito** (Pro é bypass; sem Pro o consumo volta);
- **restaura a base de 5 cargas** (`FREE_DAILY_CHARGES`);
- **preserva bônus legítimos** (`story-energy:<dia>:*` reais do dia);
- **limita ao teto correto** (`charges ≤ maxCharges = 5 + bônus`);
- **sem valor negativo** (`Math.max(0, …)`);
- **não apaga Qi** (opera só em `dailyEnergy`; Qi/progresso intactos).

Coberto por `test:entitlements` (teto 5+bônus, corte do 999) e
`test:subscription-webhook` (cenário C: `usedCharges` preservado, sem negativo).

---

## 4. Estado "carregando"

- **Não mostra energia infinita por engano:** `serverIsPro` começa do valor
  **persistido** (ou `false`), nunca "infinito"; a energia infinita depende de
  `hasProAccess`, que é conservador.
- **Não pisca paywall para Pro legítimo:** `serverIsPro` é persistido, então um Pro
  que recarrega já entra Pro. Para o **primeiro login em um device novo**, a flag
  transitória `entitlementChecking` (não persistida) mostra **"Verificando seu
  plano…"** na ProPage enquanto o servidor responde, evitando o flicker reverso.
- **Estado curto e sem trava:** a flag só liga quando há **sessão cloud real** a
  consultar e é **sempre limpa no `finally`** — quem não tem login nunca vê o
  estado; nenhuma sessão fica presa em "Verificando".

---

## 5. Produção

| Item | Estado | Evidência |
|---|---|---|
| Pro Preview desligado em produção | ✅ | `isProPreviewBuildAllowed` bloqueia `production_beta` mesmo com flag; `test:entitlements` cobre |
| Conta QA não afeta usuários normais | ✅ | Pro de QA só para `teste@longyu.app` em sessão **cloud**; nunca herdado (`effectivePremium`, `switchAccount`, `logout`) |
| Price ID é permitido (não injetável) | ✅ | `create-checkout-session` usa **allowlist de `planKey`** e pega o price do **env do servidor** (`STRIPE_PRICE_*`) |
| URLs de retorno na allowlist | ✅ **corrigido** | Origin validado contra `STRIPE_ALLOWED_ORIGINS` + canônico; fallback ao canônico |
| Service role fora do frontend | ✅ | `validate:frontend-secrets` (dist limpo); service role só nas edge functions (Deno env) |
| Webhook verifica assinatura Stripe | ✅ | `constructEventAsync` com `STRIPE_WEBHOOK_SECRET`; sem assinatura → 400 |

**Config necessária no ambiente Supabase (produção):** `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`,
`STRIPE_PRICE_PRO_MONTHLY` / `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_ALLOWED_ORIGINS`
(ex.: `https://longyu.app,https://www.longyu.app`), `APP_CANONICAL_ORIGIN`.
Aplicar `supabase/migrations/014_subscription_event_ordering.sql` (já no bundle
`longyu_apply_all.sql`).

---

## 6. Comandos rodados nesta auditoria

| Comando | Resultado |
|---|---|
| `npm run test:entitlements` | ✅ OK |
| `npm run validate:plans` | ✅ OK (inclui `test:subscription-webhook`) |
| `npm run validate:economy` | ✅ OK |
| `npm run validate:economy-server` | ✅ OK |
| `npm run test:economy-server` | ✅ OK |
| `npm run test:subscription-webhook` | ✅ OK (A–F, idempotência, ordem) |
| `npm run validate:frontend-secrets` | ✅ OK (dist sem segredos) |
| `npm run verify:production` | ⚠️ sem `.env.local` neste sandbox → não sondou endpoints; rodar num ambiente com credenciais |
| `npm run build` | ✅ OK |
| `npm run test:e2e` | ✅ ver rodada (Chromium subset) |

---

## 6.1 Ressalvas de implantação (revisão do próprio diff)

Do code-review deste diff, itens que dependem de **configuração/operação** (não são
bugs de código, mas precisam de atenção antes do live):

- **URLs de retorno:** a allowlist cai no `APP_CANONICAL_ORIGIN` (padrão apex
  `https://longyu.app`) quando o `Origin` não está listado. Se o site for servido
  de `www.` ou de um preview, defina `STRIPE_ALLOWED_ORIGINS`/`APP_CANONICAL_ORIGIN`
  para o host real, senão o retorno do checkout cai no apex.
- **Migração 014 obrigatória:** o webhook chama o RPC `apply_subscription_event`.
  Se a migração não estiver aplicada no projeto, as escritas de assinatura viram
  no-op silencioso (o webhook não checa o erro do RPC, para não reprocessar em
  loop). Aplicar 014 **antes** de publicar a função é parte do checklist.
- **`verify:production`** precisa de `.env.local` com as credenciais para sondar
  os endpoints; sem isso ele sai OK sem testar (foi o caso neste sandbox).

## 7. Critério — passada final em Stripe Test Mode (runbook)

> A monetização **não é considerada pronta** até todos os cenários rodarem em
> **Stripe Test Mode**. O código está pronto e coberto por teste; falta executar
> este runbook num projeto Stripe de teste com chaves.

**Pré-requisitos:** projeto Supabase de teste com a migração 014 aplicada; edge
functions publicadas; env de teste (`STRIPE_SECRET_KEY=sk_test_…`,
`STRIPE_WEBHOOK_SECRET=whsec_…`, prices de teste); Stripe CLI.

```bash
# 1. Encaminhar eventos do Stripe para a função local/remota
stripe listen --forward-to "$SUPABASE_URL/functions/v1/stripe-webhook"

# 2. A) Trial: iniciar checkout no app com cartão 4000 0000 0000 0077 (sucesso)
#    → conferir subscriptions.status = 'trialing', current_period_end ~ +30d
#    → app libera Pro; cargas ilimitadas; logout/login mantém Pro

# 3. B) Trial→pago: adiantar o relógio de teste ou usar cartão que cobra
stripe trigger customer.subscription.updated   # status active + novo período

# 4. C) Falha de pagamento: cartão 4000 0000 0000 0341
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated   # status past_due → Pro cai, energia 5

# 5. D) Cancelamento no fim do período (portal) → cancel_at_period_end=true
#    depois: stripe trigger customer.subscription.deleted  → canceled

# 6. E) Reativação antes do fim (portal) → cancel_at_period_end=false

# 7. Idempotência/ordem: reenviar o mesmo evento e um updated com created menor
stripe events resend evt_...           # replay (não duplica, não reverte)
```

**Checklist de aceite por cenário:** para cada A–F, confira a tripla
`subscriptions.status` × `get_server_entitlement().is_pro` × UI (Pro/paywall +
energia). Todos devem bater com a tabela da §1. Só então marcar a monetização
como pronta para o público.

---

## Apêndice — Fonte da verdade do Pro

1. **Primária:** RPC `get_server_entitlement()` (migração 008) — `status ∈
   {active, trialing}` **e** `current_period_end > now()`.
2. **Fallback:** `resolveServerSubscriptionRow` / `subscriptionGrantsPro`
   (`entitlementService.ts`) — trata `real_trialing`/`real_active`/`real_canceling`.
3. **App:** `effectivePremium(isPremium, serverIsPro, conta)` — servidor manda;
   preview local só fora de produção; QA só para a conta cloud `teste@longyu.app`.
