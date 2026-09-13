# Evidência — iOS físico (P9)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a um iPhone/iPad físico, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/ios-real-device.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- iPhone ou iPad **físico**
- Safari
- Candidate publicado

## Passos

Registrar modelo, versão do iOS e versão do Safari.

Mesma matriz do Android, com atenção a:

1. **P9.2 Autoplay** — o Safari pode bloquear. A lição **não pode travar**: o
   replay manual funciona e o avanço continua.
2. **P9.3 Speech** — se `SpeechRecognition` não existir, o fallback precisa ser
   coerente. "Falar" não pode ser um CTA morto, e digitar/montar continuam.
3. Viewport com teclado aberto e CTA sticky.
4. PWA / service worker.

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
