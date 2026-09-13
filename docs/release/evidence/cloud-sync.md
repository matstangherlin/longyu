# Evidência — Cloud Sync real (P5)

> **STATUS: NÃO EXECUTADO.**
>
> Este arquivo é um RUNBOOK, não uma evidência. Ele existe para que o check
> correspondente em `docs/release/rc1-operational-checks.json` possa ser
> fechado por quem de fato executar os passos abaixo.
>
> O agente que preparou este arquivo **não tem acesso** a dois dispositivos reais e um backend de QA, então
> marcar `pass: true` aqui seria inventar evidência. O gate
> `validate:operational-evidence` recusa `pass: true` sem os campos preenchidos.

## Como preencher

Ao executar, substitua o bloco RESULTADO no fim do arquivo e atualize o check
em `rc1-operational-checks.json` com:

```
"pass": true,
"evidence": "docs/release/evidence/cloud-sync.md",
"testedAt": "<ISO 8601>",
"environment": "<ambiente>",
"commitSha": "<SHA do candidate testado>"
```

**Nunca versionar segredo**: chave de API, token, service_role, webhook secret.
IDs de teste devem ser mascarados (`cus_***4242`).

---

## Pré-requisitos

- Conta A autenticada
- Dois dispositivos/navegadores distintos (device 1 e device 2)
- Candidate publicado

## Passos

1. **Device 1** — completar uma lição. Aguardar o sync.
2. **Device 2** — entrar com a mesma conta A. Confirmar que chegaram:
   `completedLessons`, `lessonStarsById`, `lessonMasteryById`, XP, Qi, streak,
   SRS, progresso de Cultura, achievements.
3. **P5.3 Reforço +** — confirmar também os campos que a RC1.1 adicionou:
   `topicPassStarsById` e `plusRoundById`.
4. Fechar o Reforço + no device 1. No device 2, confirmar que ele **não**
   reaparece e que o tema aparece como dominado.
5. Confirmar que o XP do Reforço + entrou **uma vez só**.
6. **P5.2 Conflito** — device 1 offline muda estado; device 2 muda outro estado;
   device 1 volta online. Nenhum progresso válido pode desaparecer.
7. **P3.3 Local-first** — com o backend lento (throttle), concluir uma atividade
   e confirmar que a UI avança na hora e nunca volta para a atividade concluída.

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
