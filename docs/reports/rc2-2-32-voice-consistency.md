# RC2.2.32 — Voice Consistency

**Status:** `CODE_READY` (instrumentação + política) · `PHYSICAL_OWNER_PASS: NOT_RUN`

## Objetivo

Todo conteúdo mandarim **fixo** do Longyu usa a mesma voz canônica e nunca troca de locutor silenciosamente via TTS do aparelho.

## Voz canônica

| Campo | Valor |
|---|---|
| Voice profile | `zh-CN-XiaoxiaoNeural` |
| Speaker tag (corpus) | `fixed-speech-xiaoxiao-v1` |
| Gate | `FIXED_CONTENT_NATIVE_TTS_FALLBACK = 0` |

## Contrato de reprodução (FIXED_CONTENT)

```
canonical asset → native canonical player → explicit degraded state
```

TTS nativo/web **não** entra na ordem de FIXED_CONTENT. Dinâmico/QA continua podendo usar TTS.

## Superfícies auditadas

| Superfície | Antes | Depois |
|---|---|---|
| Guided Try | asset-first | mantido |
| Jornada / Lesson steps | vários `speak()` diretos | `playMandarinAudio` + source `LESSON_AUDIO` |
| Review | SpeakButton | SpeakButton com source `LESSON` |
| Cultura | pouca fala | classificada FIXED se usada |
| Imersão | `speak()` direto | `playMandarinAudio` + source `IMMERSION` |
| Tone Trainer (`SomPage`) | `speak()` direto | player canônico + source `TONE` |
| Tone Contrast | `speak()` direto | player canônico (mesma voz A/B) |
| Pinyin Lab | `speak()` direto | player canônico + source `PINYIN` |
| Self Compare (modelo) | `playMandarinAudio` | mantido |
| Diálogos / Conversation | `useAutoSpeak` / asset | mantido + degradado sem TTS |
| Hànzì / gloss tokens | `speak()` | player canônico |

## Corpus

| Métrica | Valor |
|---:|
| Entradas no manifesto | 657 |
| Speaker único | `fixed-speech-xiaoxiao-v1` |
| Regeneração nesta onda | **não** (corpus #308 preservado) |

## Instrumentação

Cada decisão em `playMandarinAudio` registra:

- `audioId`
- texto normalizado (chars)
- `source`
- engine selecionado
- asset utilizado
- `canonicalVoiceProfile`
- fallback ocorrido + motivo
- flag `fixedContentNativeTtsFallback`

Exposto em DEV/QA via `window.__longyuVoiceConsistency`.

## Fallbacks

| Caso | Comportamento |
|---|---|
| Asset ok | toca Xiaoxiao |
| Asset falha (FIXED) | `DEGRADED` / UI continua — **sem** TTS |
| Sem asset (FIXED) | `FIXED_CONTENT_NO_ASSET_NO_TTS` |
| Dinâmico / nome | TTS permitido |
| QA override | TTS permitido |

## Resultado final (código)

- Política FIXED sem TTS: **SIM**
- Instrumentação: **SIM**
- Gate `FIXED_CONTENT_NATIVE_TTS_FALLBACK`: **implementado** (runtime count deve ser 0 em sessão pedagógica)
- Prova física de voz única em 10 falas: **NOT_RUN**
