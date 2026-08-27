# Stripe Test Mode — checklist da Release Candidate

**Stripe Live está fora de escopo.** Não usar `sk_live`, não apontar webhook de produção.
A execução real deste checklist é **V4.7.5+** no staging (`longyu-preview`), não nesta remessa.

`PAYMENTS_READY` permanece `NOT_RUN` até cada linha abaixo ter evidência operacional
(IDs de evento Stripe + user id + timestamp). Scripts `npm run test:stripe`,
`test:subscription-webhook` e `test:subscription-event-ordering` **não** marcam este
arquivo como PASS.

Ver também `docs/SUBSCRIPTION_E2E_REPORT.md` §7.

## Pré-requisitos (staging)

| Item | Estado |
| --- | --- |
| Projeto Stripe **Test Mode** | NOT_RUN |
| `sk_test_` só em secret do staging | NOT_RUN |
| Webhook Test Mode → Edge do **preview** | NOT_RUN |
| Origin allowlist inclui o host de staging | NOT_RUN |
| Produção / MandarimProject intocado | PASS (não mexer) |

## Sequência automatizável (execução humana ou script com chaves test)

| # | Cenário | Resultado esperado | Estado | Evidência |
| --- | --- | --- | --- | --- |
| 1 | Checkout Test Mode | sessão criada, redirect Stripe | NOT_RUN | |
| 2 | Retorno sucesso | `success_url` allowlisted; Pro no servidor | NOT_RUN | |
| 3 | Retorno cancelamento | `cancel_url`; usuário continua grátis | NOT_RUN | |
| 4 | Assinatura Pro | `subscriptions.status` coerente (`trialing`/`active`) | NOT_RUN | |
| 5 | Customer portal | portal Test Mode abre | NOT_RUN | |
| 6 | Cancelamento | `cancel_at_period_end` até a data; depois grátis | NOT_RUN | |
| 7 | Renovação / invoice.paid | período atualizado; Pro mantido | NOT_RUN | |
| 8 | Webhook duplicado | mesmo `event.id` é no-op | NOT_RUN | |
| 9 | Webhook fora de ordem | evento antigo não reverte estado novo | NOT_RUN | |
| 10 | Paga e fecha a aba | checkout.session.completed ainda vincula user↔assinatura | NOT_RUN | |

## Comandos (quando o staging tiver chaves)

```bash
npm run test:subscription-webhook
npm run test:subscription-event-ordering
# test:stripe sai 2 sem sk_test_ — esperado neste agente; não inventar PASS
npm run test:stripe
```

## Proibição

- Não promover `PAYMENTS_READY` porque o código do webhook existe.
- Não usar cartão real.
- Não aplicar a migration de assinatura em produção nesta remessa.
