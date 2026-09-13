# Evidência — Configuração Stripe de produção (P9.1)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a a conta Stripe de produção, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/stripe-production-config.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Acesso à conta Stripe live
- Variáveis de produção do candidate

## Passos

Este check é **separado** do Test Mode de propósito (P9.1). Test Mode
passando não autoriza marcar produção.

1. Confirmar que as Price IDs de produção existem e batem com os preços anunciados.
2. Confirmar que o webhook de produção aponta para o domínio de produção.
3. Confirmar que as chaves de produção estão no ambiente do candidate e que
   nenhuma delas está no bundle (`validate:frontend-secrets`).
4. Confirmar o modo de cobrança, moeda e impostos conforme a política comercial.

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
