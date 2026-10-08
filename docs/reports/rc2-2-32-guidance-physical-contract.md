# RC2.2.32 — Guidance Physical Contract

**Status:** `CODE_READY` · `PHYSICAL_OWNER_PASS: NOT_RUN`

## Separação de camadas

### A) Global Guidance (`GuidanceOrchestrator`)

- Coachmarks / Unlock reveals / tips de superfície
- Orçamento: **1** por sessão normal · **2** na primeira sessão (após 1ª atividade)
- Bloqueado quando `activeLearning`, input focado ou cerimônia ativa
- Cooldown / snooze / skip / skip-all preservados
- Só marca `SHOWN` com evidência de render (≥1200ms)

### B) Pedagogical Inline Guidance (`pedagogicalInlineGuidance`)

- Microorientação **dentro** da atividade
- **Não** consome orçamento global
- Pode aparecer durante aprendizagem
- Primeira exposição automática; depois só via `?`
- Persistência local (`longyu:pedagogical-inline-seen-v1`)

## Inline wired

| Interação | Mensagem (pt) | Componente |
|---|---|---|
| `hanzi_builder` | Arraste as partes para formar o caractere. | `HanziBuilderExercise` |
| `tone_trace` | Toque e acompanhe a direção do tom. | `ToneTrace` |
| `speech_self_compare` | Ouça primeiro. Depois grave sua voz. | `SelfComparePractice` |
| `image_choice` | Observe a imagem e escolha a palavra correspondente. | `StepImageChoice` |
| `audio_contrast` | Ouça a curva… | `ToneContrastCard` |
| `conversation_reply` | Leia a fala… | (definição pronta) |

## Auditoria de primeira sessão limpa (contrato)

| Passo | Orientação esperada | Tipo |
|---|---|---|
| Instalação nova → Jornada | `welcome_journey_v1` | Global |
| Primeira atividade | (budget global pode estar gasto) | — |
| Primeiro Hànzì interativo | `inline_hanzi_builder_v1` | Inline |
| Primeira fala | `inline_speech_self_compare_v1` | Inline |
| Primeiro Tone Trace | `inline_tone_trace_v1` | Inline |
| Image choice | `inline_image_choice_v1` | Inline |
| Cultura / Review / unlocks | unlock reveals quando elegíveis | Global |

## Regras preservadas

- Popup nunca marcado visto sem aparecer  
- Âncora ausente → fallback de card  
- CRITICAL_UX tem prioridade sobre OPTIONAL  
- Sem popup durante gravação/reconhecimento (`activeLearning`)  
- Orientação não bloqueia a tarefa  

## Prova física

Registrar no APK quais orientações **efetivamente** aparecem. Estado: `NOT_RUN`.
