# Mastery pass duration (telemetria)

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 7969e03a5eca78508c2de026a960876ea43ace8a |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-14T01:45:22.559Z |
| Lições | 127 |
| Hash da Jornada | 07da44be3a20 |


Eventos: `mastery_pass_started` / `mastery_pass_completed` (V3.3).

Schema agregado (ainda sem amostra de produção neste ambiente):

| lessonId | pass | medianDuration | p75 | completionRate | abandonRate | n |
|----------|-----:|---------------:|----:|---------------:|------------:|--:|
| — | — | — | — | — | — | 0 |

Metas iniciais de produto (orientação, não gate):

- M1/M2: ~4–7 min
- M3/M4: ~5–8 min

Quando houver dados reais no pipeline de telemetria, este relatório
deve ser preenchido a partir da agregação server-side — sem hard gate.

<!-- integridade:8809fc93c8c4d670 -->
