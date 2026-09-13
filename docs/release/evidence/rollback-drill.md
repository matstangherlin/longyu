# Evidência — Rollback drill (P11)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a o painel de deploy (Netlify) e permissão de publicar/reverter, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/rollback-drill.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Candidate publicado
- Conta de QA com progresso
- Permissão de rollback

## Passos

Registrar o SHA antes e depois de cada passo (P30 mutação 9).

1. Publicar o candidate RC1.2.
2. Gerar progresso numa conta de QA (lição, estrelas, XP, Cultura).
3. Publicar uma versão posterior (marcador de teste).
4. **Rollback** para o candidate.
5. Conferir: login, Jornada, progresso, sync, lição, Cultura, Liga, assinatura.
6. **P11.2 / P12.2** — nenhum progresso na nuvem pode ter sumido. Rollback de
   frontend não apaga dado de usuário.

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
