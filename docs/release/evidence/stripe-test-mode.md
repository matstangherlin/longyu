# Evidência — Stripe Test Mode real (P7)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a uma conta Stripe em Test Mode e o Supabase de QA, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/stripe-test-mode.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Stripe **Test Mode** (nunca live)
- Supabase de QA
- Webhook apontando para o candidate
- Cartões de teste do Stripe

## Passos

Para cada item, registrar: status no Stripe, status no Supabase, status no app.

1. **P7.1 Mensal** — FREE → checkout mensal → webhook → entitlement Pro ativo.
2. **P7.2 Anual** — mesmo fluxo no preço anual.
3. **P7.3 Trial** — confirmar o contrato comercial vigente (30 dias, se ainda for
   o caso). Stripe `trialing` → app Pro.
4. **P7.4 Sucesso** — trial/pagamento vira `active`, Pro continua.
5. **P7.5 Falha** — simular `past_due` / `unpaid`. O app reage conforme o
   contrato e **nunca apaga progresso**.
6. **P7.6 Cancelamento** — `cancel_at_period_end` mantém Pro até o fim; depois cai para Free.
7. **P7.7 Reativação** — reativar antes do fim não pode derrubar o acesso.
8. **P7.8 Isolamento** — conta A Pro, logout, conta B Free. B **não** herda Pro.
9. **P7.9 Idempotência** — reprocessar o mesmo evento não duplica estado, e um
   evento antigo não pode reverter um estado mais recente.
10. **P7.10 Preços** — conferir que UI, checkout, Stripe Price e landing concordam.

Mascarar todos os IDs: `cus_***`, `sub_***`, `evt_***`.

## RESULTADO

| Campo | Valor |
| --- | --- |
| date | _(não executado)_ |
| environment | _(não executado)_ |
| result | **NOT_RUN** |
| commitSha | _(não executado)_ |
| tester | _(não executado)_ |

### Observações

_(preencher ao executar — incluir o que falhou, não só o que passou)_
