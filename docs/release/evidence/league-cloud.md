# Evidência — Liga em cloud real (P12)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a três contas reais em backend de QA, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/league-cloud.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Três contas QA autenticadas
- Liga ativa na semana corrente

## Passos

1. Gerar XP semanal: A = 100, B = 80, C = 40.
2. Conferir o ranking: A, B, C.
3. **P11.1** — a tabela mostra nome público, XP semanal, posição e "Você".
   Nenhum "Aluno Demo" pode aparecer em cloud real.
4. C ganha mais 80. Conferir que C vira rank 1.
5. **P11.2 / P30 mutação 18** — o XP do Reforço + entra na pipeline da liga
   **uma vez**; replay não duplica.

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
