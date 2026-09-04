# V4.9.1 — Tone Learning System + Journey Boosters + Assessment Fairness

Base: `a5928e8814c3f4469e6ca2afcc07d0a5d3c1cdd4` (`main`, com a PR #225/V4.9.0 incorporada).

Esta remessa preserva a espinha V4.9.0 e acrescenta progressão granular de tons, boosters contextuais que reutilizam engines existentes e permutação determinística da ordem visual das respostas. Nenhuma identidade canônica, regra de scoring, mastery, SRS ou progresso core foi substituída.

## Métricas computadas

- knowledgeTargets: 435
- teachingTopicsWalked: 113/113
- toneTasksTotal: 161
- toneAwarenessTasks: 25
- toneContourTasks: 72
- toneNumberTasks: 42
- toneMarkTasks: 8
- toneProductionTasks: 2
- toneTransferTasks: 0
- toneNumberBeforeTeaching: 4 → 0
- toneMarkBeforeTeaching: 0
- toneProductionBeforeGuidance: 0
- journeyTeachBeforeTestHighConfidenceViolations: 0
- journeyTeachBeforeTestProgressiveWarnings: 371
- placementCanonicalCorrectPositions: `[31, 6, 2, 1]`
- placementDisplayedCorrectPositionsAcross100Sessions: `[1008, 987, 1023, 982]`
- placementDisplayedShares: `[25.20%, 24.68%, 25.57%, 24.55%]`
- journeyConventionalChoiceQuestions: 359
- journeyDisplayedDistribution2Options: `[350, 350]`
- journeyDisplayedDistribution3Options: `[661, 712, 727]`
- journeyDisplayedDistribution4Options: `[8276, 8434, 8195, 8195]`
- contextualBoostersIntegrated: 7

Os 371 warnings do auditor Journey-wide representam passos legados cuja metadata lexical ainda foi inferida, não violações inequívocas. O gate falha para violações de alta confiança e mantém inferências duvidosas como warning, conforme o contrato da remessa.

## Primeira introdução dos tons

| alvo | exposição/ensino | primeira cobrança numérica |
| --- | --- | --- |
| 1º tom | M1/step2 | M3/step2 |
| 3º tom | M1/step3 | M3/step2 |
| 2º tom | M2/step2 | M3/step2 |
| 4º tom | M2/step3 | M3/step2 |
| tom neutro | política explícita: somente após os quatro contornos marcados | não cobrado na fundação |

M1 apresenta 1º e 3º com áudio, curva, nome e marca antes de uma pergunta descritiva. M2 faz o mesmo com 2º e 4º. M3 consolida áudio → número e marca → tom. M4 transfere para palavras já preparadas. O feedback revela contorno, número, marca e uma explicação curta; o 3º tom documenta a realização contextual mais baixa/curta da fala natural.

## Boosters e engines reutilizados

| JourneyNode | readiness | engine/fila reutilizada | core mastery |
| --- | --- | --- | --- |
| Tone Trainer 1 × 3 | `tone-1` + `tone-3` NOTICED | `ToneTrainer`, tons permitidos `[1,3]` | não altera |
| Tone Trainer 1–4 | tons 1–4 NOTICED | `ToneTrainer`, tons permitidos `[1,2,3,4]` | não altera |
| Pinyin Practice | pinyin GUIDED | `PinyinAccentTrainer`, somente `nǐ hǎo` conhecido | não altera |
| Hanzi Builder | hànzì/components GUIDED | `HanziBuildTrainer`, somente 木/人 | não altera |
| First Conversation | 你好 RECALLED + greeting GUIDED | `ConversationSceneStep` / cena `primeiro-cumprimento`; distractors CJK ainda não ensinados são neutralizados no handoff inicial | não altera |
| Review | itens SRS vencidos | rota e fila SRS atuais | não altera |
| Short Immersion | 8 chunks + 2 patterns + 70% recognition declarados | engine de Immersion atual | não altera |

Completion de nodes auxiliares continua em `longyu:journey-node-completions:v1`. O contrato `AUX_NODE_PROGRESS_LOCAL_ONLY` declara que a ausência do flag em outro dispositivo nunca bloqueia, regride ou apaga lesson mastery, SRS, mistakes ou progresso core.

## Fairness

- `stableOptionPermutation` separa opção canônica de ordem visual.
- Placement usa `placementSessionId + question.id`; rerender, resize e troca PT/EN preservam a ordem.
- Hotkeys 1–4 seguem a ordem visual; a resposta enviada continua sendo o ID canônico.
- Choices convencionais da Journey usam lesson, step, attempt e session seed.
- Sentence ordering, timelines, legends, matching e passos em que a ordem tem significado não recebem shuffle.
- Amount, scoring, Placement version, unlock e evidência server-side não mudaram.

## Scoreboard

- TONE_SYSTEM_MODEL: **PASS**
- TONE_1_TEACHING: **PASS**
- TONE_2_TEACHING: **PASS**
- TONE_3_TEACHING: **PASS**
- TONE_4_TEACHING: **PASS**
- TONE_NEUTRAL_POLICY: **PASS**
- TONE_NUMBER_BEFORE_TEACHING: **PASS**
- TONE_MARK_BEFORE_TEACHING: **PASS**
- TONE_PRODUCTION_BEFORE_GUIDANCE: **PASS**
- TONE_VISUAL_LANGUAGE: **PASS**
- TONE_EDUCATIONAL_FEEDBACK: **PASS**
- PLACEMENT_POSITION_FAIRNESS: **PASS**
- PLACEMENT_SESSION_STABILITY: **PASS**
- PLACEMENT_PT_EN_ORDER_PARITY: **PASS**
- PLACEMENT_SCORING_INVARIANT: **PASS**
- JOURNEY_OPTION_FAIRNESS: **PASS**
- TONE_TRAINER_JOURNEY: **PASS**
- PINYIN_PRACTICE_JOURNEY: **PASS**
- HANZI_BUILDER_JOURNEY: **PASS**
- CONVERSATION_JOURNEY: **PASS**
- REVIEW_SHARED_ENGINE: **PASS**
- IMMERSION_READINESS: **PASS**
- NO_DUPLICATED_ENGINE: **PASS**
- CORE_PROGRESS_INVARIANT: **PASS**
- SRS_INVARIANT: **PASS**
- PT_EN_PARITY: **PASS**

## Evidência e gates

- `npm run validate:beta`: **PASS** (suite integral, executada fora do sandbox local).
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**.
- `npm run test:tone-learning-ladder`: **PASS**.
- `npm run test:v491-boosters`: **PASS**.
- Playwright Chromium `e2e/v491-tone-boosters-fairness.spec.ts`: **6/6 PASS**.
- Evidência visual: 13 capturas em `docs/reports/v491-screenshots`, cobrindo tons 1–4, assessment sem pista, feedback educativo, Tone Trainer, Pinyin, Hànzì, Conversação e Placement estável.

## Blockers pedagógicos restantes

Nenhum blocker de alta confiança foi encontrado. Permanecem dois itens não bloqueadores e explicitamente visíveis:

- 371 warnings de metadata inferida no auditor Journey-wide; não são violações comprovadas e deverão ser reduzidos progressivamente.
- o relatório de profundidade pontua `p1-o-que-e-tom` em 68/70 após a reestruturação; a escada obrigatória e todos os gates de segurança pedagógica passam, mas há margem futura de refinamento sem expandir o escopo desta remessa.

## Limites explícitos

- `VIDEO_CAPSULE` permanece apenas como contrato arquitetural da V4.9.0; nenhum player/streaming V4.9.2 foi iniciado.
- `PHYSICAL_QA_READY` não é promovido por automação.
- Backend de produção, migrations, Edge Functions e Stripe Live não foram tocados.
