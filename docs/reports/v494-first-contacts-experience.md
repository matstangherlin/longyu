# V4.9.4 — Primeiros contatos, sessão a sessão

Gerado por `npm run validate:first-contacts`. A pergunta de cada linha é
a da Parte Y: um iniciante absoluto saberia por que está respondendo isso?

## Métricas

- themeTopics: 7
- communicativeCapabilities: 8
- coreRequiredCapabilities: 7
- gradedBeforeTeaching: 0
- productionBeforeGuidance: 0
- unknownDistractors: 0
- notYetTaughtDistractors: 57

## Sessões

| tópico | título | passos | ensina | cobra | produz | surpresas |
| --- | --- | --- | --- | --- | --- | --- |
| `l1` | Mandarim, pinyin e tom | 8 | 3 | 2 | 0 | 0 |
| `l2` | Olá | 12 | 4 | 4 | 3 | 0 |
| `l3` | Tudo bem? | 10 | 10 | 10 | 4 | 0 |
| `l4` | Obrigado | 14 | 8 | 8 | 2 | 0 |
| `p1-ate-logo` | Até logo | 15 | 10 | 8 | 3 | 0 |
| `p1-primeira-conversa` | Primeira conversa | 10 | 5 | 15 | 9 | 0 |
| `p1-qingwen-cortesia` | Com licença | 11 | 12 | 10 | 7 | 0 |

## Capabilities e sua evidência

| capability | nível | ensinada em | evidência |
| --- | --- | --- | --- |
| FC01_GREET | CORE_REQUIRED | `l2` | `chunk:nihao`, `chunk:zaoshanghao` |
| FC02_REPLY_TO_GREETING | CORE_REQUIRED | `l3` | `chunk:nihaoma`, `chunk:wohenhao` |
| FC03_SAY_NAME | CORE_REQUIRED | `l2` | `chunk:wojiao` |
| FC04_ASK_NAME | CORE_REQUIRED | `p1-primeira-conversa` | `chunk:nijiaoshenme` |
| FC05_BASIC_COURTESY | CORE_REQUIRED | `l4` | `chunk:xiexie`, `chunk:bukeqi` |
| FC06_POLITE_APPROACH | RECOMMENDED | `p1-qingwen-cortesia` | `chunk:qingwen` |
| FC07_CLOSE_CONVERSATION | CORE_REQUIRED | `p1-ate-logo` | `chunk:zaijian`, `chunk:mingtianjian` |
| FC08_FIRST_CONTACT_CONVERSATION | CORE_REQUIRED | `p1-primeira-conversa` | `chunk:nihao`, `chunk:nijiaoshenme`, `chunk:wojiao`, `chunk:zaijian` |

