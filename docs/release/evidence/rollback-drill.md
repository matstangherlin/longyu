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

- Candidate **publicado** (`qa_candidate`, não deploy-preview local)
- Conta de QA com progresso
- Permissão de rollback no site Netlify do candidate
- Acesso a `/version.json` no candidate

## Procedimento Netlify (RC2 candidate)

Preferir o site/contexto **candidate** (`rc2-candidate` / site QA dedicado),
nunca produção.

1. Abrir Netlify → site do candidate → **Deploys**.
2. Anotar o deploy **N** (candidate C): SHA de `/version.json` = `beforeSha`.
3. Publicar marcador **N+1** (ou promover o deploy seguinte).
4. Confirmar `/version.json` = `afterSha` ≠ `beforeSha`.
5. Em Deploys, escolher o deploy de `beforeSha` → **Publish deploy** (rollback).
6. Confirmar `/version.json` voltou a `beforeSha` (40 hex).
7. Smoke: login, Jornada, progresso, sync, lição, Cultura. Liga só se pública.
8. PWA: no máximo **um** reload controlado após o rollback; sem loop.
9. Opcional: `RC2_CANDIDATE_URL=… RC2_EXPECTED_SHA=<beforeSha> npm run verify:rc2-candidate-identity`.

Rollback de frontend **não** apaga dado de usuário na nuvem.

## Passos (resumo)

Registrar o SHA antes e depois de cada passo (mutação: SHA ausente → FAIL).

1. Publicar o candidate.
2. Gerar progresso numa conta de QA (lição, estrelas, XP, Cultura).
3. Publicar uma versão posterior (marcador de teste).
4. **Rollback** para o candidate (Publish deploy anterior).
5. Conferir: login, Jornada, progresso, sync, lição, Cultura.
6. Confirmar que nenhum progresso na nuvem sumiu.

## RESULTADO

| Campo | Valor |
| --- | --- |
| date | _(não executado)_ |
| environment | _(não executado)_ |
| result | **NOT_RUN** |
| beforeSha | _(não executado — 40 hex)_ |
| afterSha (N+1) | _(não executado — 40 hex)_ |
| commitSha (após rollback) | _(não executado — deve = beforeSha)_ |
| versionJsonMatched | _(não executado)_ |
| progressSurvived | _(não executado)_ |
| tester | _(não executado)_ |

### Observações

_(preencher ao executar — incluir o que falhou, não só o que passou)_

> Preflight local N→N+1 (`test:pwa-upgrade-preflight`) **não** fecha este check.
