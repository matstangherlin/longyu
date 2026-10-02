# RC2.3.0 — Pedagogy V6 Closure

**Base:** HEAD do PR #309 (`f8662ed…` / branch `cursor/rc2-2-32-voice-speech-guidance-25db`)  
**Não** rebaseado em `main` sem #309.  
**#273:** não tocado.

## Arquitetura criada

| Módulo | Papel |
|---|---|
| `pedagogyV6/discovery.ts` | Descoberta + `hasLearnerBeenTaught` |
| `pedagogyV6/perceptualRepetition.ts` | saturação perceptiva + diversify |
| `pedagogyV6/activityContract.ts` | contrato universal de atividade |
| `pedagogyV6/earlyVisual.ts` | visual piloto + `VISUAL_SUPPORT_MISSING` |
| `pedagogyV6/humanContext.ts` | classificador humano |
| `pedagogyV6/telemetry.ts` | eventos locais sem PII |
| `pedagogyV6/applyPedagogyV6.ts` | orquestra no plano |
| `LessonPlayer` | wire pós `withToneContrastTeaching` |
| `MASTERY_PASS_GRADED_BUDGET` | 7–9 / 8–11 / 10–13 / 12–15 |

## Piloto migrado

Foundation early set + l2/l3 moments · human copy em mandarim P1 · visual enrich para concretos.

## Fora de escopo (próximas ondas)

RC2.3.1 Visual First · RC2.3.2 Everyday · RC2.3.3 Culture Deep · RC2.3.4 Writing · RC2.3.5 Speech Contrast · RC2.3.6 Personal Mastery · RC2.3.7 Sensory polish.

## Status

| Gate | Valor |
|---|---|
| ENGINE_READY | YES (`gate:rc2-3-0-pedagogy-v6` PASS) |
| PILOT_CONTENT_READY | YES (piloto early + first-20) |
| WEB_PASS | NOT_RUN |
| ANDROID_BUILD_PASS | NOT_RUN (sem SDK neste ambiente) |
| APK_PASS | NOT_RUN |
| OWNER_PEDAGOGICAL_ACCEPTANCE | NOT_RUN |

**Não** Closed Beta ready.  
**Não** declarar OWNER_PEDAGOGICAL_ACCEPTANCE automaticamente.

## Testes executados neste ambiente

- `npm run audit:rc230-first20-v6`
- `npm run gate:rc2-3-0-pedagogy-v6` (inclui herança `gate:rc2-2-32` + typecheck)
- Mutation kills discovery / budgets / perceptual / visual / human / contract / #273 billing

## Dívida restante

- saturação perceptiva residual em foundation authored curtas
- expansão visual completa → RC2.3.1
- everyday mandarin profundo → RC2.3.2
- WEB/APK/owner physical proof
