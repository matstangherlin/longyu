# Evidência — Feedback backend real (P6)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a o backend de feedback e o fluxo administrativo que o lê, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/feedback-backend.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Candidate publicado
- Acesso ao armazenamento de feedback para conferir a persistência

## Passos

1. Enviar um feedback pelo app (categoria + texto, com `lessonId` quando aplicável).
2. Confirmar no backend que o registro existe, com categoria, texto, lesson id,
   timestamp e conta.
3. **P10.1** — conferir que nada além disso foi guardado.
4. **P6.1 / P10.2** — derrubar o backend (ou bloquear a rota) e enviar de novo.
   A UI **não pode** dizer "Enviado com sucesso". Precisa oferecer retry.
5. Restaurar o backend e confirmar que o retry persiste.

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
