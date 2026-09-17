# Evidência — PWA / service worker upgrade (P10)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a dois deploys reais em sequência, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/pwa-upgrade.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Capacidade de publicar duas versões **no candidate** (N e N+1)
- Dispositivo com o app já instalado / aba aberta
- `/version.json` acessível (Cache-Control `no-cache`)

## Passos

1. Instalar / abrir a versão N; anotar `commitSha` de `/version.json`.
2. Publicar a versão N+1 no mesmo site candidate.
3. Voltar ao app **sem limpar dados**.
4. Confirmar: o service worker assume, as rotas lazy funcionam e nenhuma tela
   branca permanente ("Algo saiu do prumo" só se recovery falhar).
5. Deixar uma aba aberta durante o deploy e navegar depois (Journey, Cultura,
   Profile, lesson). Reload controlado no máximo **uma** vez; nunca loop.
6. Confirmar `/version.json` = SHA de N+1.
7. Offline: Longyu **não** promete currículo offline completo. Indicadores
   "Sem conexão" / sync posterior são honestos; não marcar offline-ready.

## RESULTADO

| Campo | Valor |
| --- | --- |
| date | _(não executado)_ |
| environment | _(não executado)_ |
| result | **NOT_RUN** |
| shaN | _(não executado — 40 hex)_ |
| shaN1 | _(não executado — 40 hex)_ |
| commitSha | _(não executado — deve = shaN1)_ |
| openTabSurvived | _(não executado)_ |
| reloadLoop | _(não executado — deve ser false)_ |
| tester | _(não executado)_ |

### Observações

_(preencher ao executar — incluir o que falhou, não só o que passou)_

> `test:pwa-upgrade-preflight` é **LOCAL PREFLIGHT** e **não** fecha `pwa_upgrade.pass`.
