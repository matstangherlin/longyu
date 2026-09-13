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

- Capacidade de publicar duas versões (N e N+1)
- Dispositivo com o app já instalado

## Passos

1. Instalar a versão N e abrir o app.
2. Publicar a versão N+1.
3. Voltar ao app **sem limpar dados**.
4. Confirmar: o service worker assume, as rotas lazy funcionam e nenhuma tela
   "Algo saiu do prumo" aparece.
5. **P8.2 / P10** — deixar uma aba aberta durante o deploy e navegar depois.
   Reload controlado no máximo uma vez; nunca loop.
6. **P10.1 Offline** — se offline for suportado oficialmente, testar. Se não
   for, remover qualquer promessa pública de offline.

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
