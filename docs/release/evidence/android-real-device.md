# Evidência — Android físico (P8)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a um aparelho Android físico, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/android-real-device.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Aparelho Android **físico** (emulador não fecha este check)
- Chrome atual
- Candidate publicado

## Passos

Registrar modelo, versão do Android e versão do Chrome.

1. **P8.1 Fluxo** — login, Jornada, lição, áudio de tom, áudio automático de
   feedback, Hànzì, Phrase Builder, Speech, Conversa, Revisão, Reforço +,
   Cultura, Victory, Capstone, Liga.
2. **P8.2 Speech** — permitir, negar, cancelar, tentar de novo. Com Speech
   negado, digitar/montar precisa continuar funcionando (a lição não pode travar).
3. **P8.3 Teclado** — abrir o teclado no `FreeAnswerField` e confirmar que o CTA
   continua alcançável.
4. Conferir o áudio automático da correção e o replay.

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
