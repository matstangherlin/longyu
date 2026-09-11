# V4.9.9A — China Survival III: saúde + emergência

Objetivo do aluno: *Não estou bem → explicar o básico → pedir ajuda → entender → reparar → chegar ao atendimento.*

Mandarim funcional. Não é curso de medicina.

## Procedência

A identidade do currículo auditado é o **Hash da Jornada** (fingerprint dos fontes). O SHA em Commit/HEAD é o git no instante da geração — em geral o commit *anterior* ao que inclui este markdown.

| Campo | Valor |
|-------|-------|
| Hash da Jornada | 29954edf3c51 |
| HEAD no instante da geração | 64f818424145fe723d7bb95b8175cf32d7bca4f3 |
| Árvore de trabalho | com mudanças locais (pré-commit) |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-09-11T08:00:00.000Z |
| Lições | 132 |

## Base

| Campo | Valor |
|-------|-------|
| SHA de trabalho (#251 tip, **não** é merge) | `5b2ced9d2ab950fc10963c88cbb8d10e34119ad2` |
| SHA **obrigatória** (`main` após merge #251) | *ainda inexistente — #251 OPEN em 2026-09-11T08:00Z* |
| #251 fecha | Speaking First, Phrase Chips, Progressive Assistance, Conversation Auto-Reveal, Hanzi Fill, Culture Lessons na Jornada, Culture Hub canônico, Victory mínima, UX mobile compacta |
| Esta PR | **não** reabre esses sistemas |
| Branch | `cursor/v499a-health-emergency-6ae2` |
| Fingerprint da Jornada (#251 tip) | `003cb0ed7858` |
| Fingerprint da Jornada (esta remessa) | `29954edf3c51` |
| Tópicos de ensino | 113 (imersão `p7-imersao-saude` é `isReview` + `curriculumRole: "immersion"`) |

Quando a #251 mergear, rebasear esta branch no SHA real do merge e substituir a linha «ainda inexistente». Não inventar SHA.

## Princípio

Não criar unidade «Vocabulário de saúde». Auditar. Reusar. FILL → BUILD → PRODUCTION → CONVERSA → TRANSFERÊNCIA.

## P0 — auditoria (em `5b2ced9`)

### Chunks já no catálogo (zero chunks novos)

| Chunk | Hanzi | Antes em p6-saude | Ação |
|-------|-------|-------------------|------|
| `wobushufu` | 我不舒服 | listen + flash tarde | REFINAR → fill/build/produção/fala |
| `wobingle` | 我病了 | listen + fill | RECALL |
| `wotouteng` | 我头疼 | listen + match + build | REFINAR padrão X+疼 |
| `woduziteng` | 我肚子疼 | library, sem passo | ADQUIRIR na aula existente |
| `wofashao` | 我发烧了 | catálogo, fora da aula | ADQUIRIR |
| `woyaokanyisheng` | 我要看医生 | listen + build 医+生 | REFINAR (医生 como palavra) |
| `woxuyaoyisheng` | 我需要医生 | listen + flash | REFINAR (necessidade direta) |
| `yiyuanzainali` | 医院在哪里？ | match + dialogue (reensino) | TRANSFER (já em `p6-cidade-lugares`) |
| `woxuyaobangzhu` | 我需要帮助 | survival, não na aula | RECALL na imersão |
| `qingzaishuoyibian` | 请再说一遍 | ensinado cedo | RECALL (ramo real) |
| `qingmanyidian` | 请慢一点 | aeroporto/repair | RECALL (ramo ≠ repeat) |
| `zenmeyang` | 你怎么样？ | ensinado | RECALL receptivo (não 你怎么了？) |

### Matriz de capacidades

| CAPACIDADE | CHUNK | JÁ ENSINADO? | RECOGNITION? | HANZI? | LISTENING? | FILL? | BUILD? | PRODUCTION? | CONVERSATION? | TRANSFER? | AÇÃO |
|---|---|---|---|---|---|---|---|---|---|---|---|
| say_unwell | 我不舒服 | listen tardio | fraca | unidade 舒服 | ouvir | não | não | não | choose_meaning «O que Matheus disse?» | — | REFINAR |
| say_sick | 我病了 | sim | sim | 病 | sim | sim | — | não | — | — | RECALL |
| describe_headache | 我头疼 | sim | match frase | 头+疼 | listen_select com leak | — | sim | escolha | choose_reply | — | REFINAR |
| describe_stomach_pain | 我肚子疼 | library só | não | 肚子 | não | não | não | não | não | — | ADQUIRIR |
| describe_fever | 我发烧了 | catálogo | não | unidade 发烧 | não | não | não | não | não | — | ADQUIRIR |
| ask_for_doctor | 我要看医生 / 我需要医生 | sim, misturados | sim | 医+生 no build | sim | — | char isolado | dialogue | Lin diz as duas de uma vez | — | REFINAR |
| ask_for_hospital | 医院在哪里？ | **já em mobilidade** | match reensina | 医院 | dialogue | — | — | escolha | NPC pergunta o hospital | V4.9.8 | TRANSFER |
| ask_for_help | 我需要帮助 | survival | — | — | — | — | — | — | — | — | RECALL (imersão) |
| understand_symptom_q | 头疼吗？ | não | — | — | não | — | — | — | 头疼？ sem áudio-first | — | ADQUIRIR listening |
| answer_symptom_q | 我头疼 | escolha | — | — | — | — | — | MC | sim | — | REFINAR produce |
| ask_repeat / ask_slow | 请再说一遍 / 请慢一点 | sim | — | — | — | — | — | — | repairs = 请再说一遍 | aeroporto | TRANSFER ramos |
| complete_health | cena curta | artificial | — | — | — | — | — | MC | ROLE/GENERIC | — | REFINAR + CRIAR clínica |

### Cena `nao-me-sinto-bem` antes

| Nó | WHO | WHY | Veredito |
|---|---|---|---|
| `saude-2` choose_meaning «O que Matheus disse?» | conteúdo | nome hardcoded | ANSWER_CONTRACT_BUG |
| Lin narra 我不舒服 | aluno não produz | receptivo | LEXICAL_GAP de produção |
| repairs `请再说一遍` | NPC | genérico | GENERIC_REPAIR |
| `saude-6` Lin diz 我头疼。我需要医生。 | aluno | duas falas numa | UNNATURAL |
| Mei pergunta 医院在哪里？ | amigo | o aluno é quem precisa | ROLE_CONFUSION |
| Mei 在那里。 | direção | 那里 não ensinado (KNOWN_DEBT `char:na_that`) | LEXICAL_GAP |
| setting street + amigos | ok para rua | misturava atendimento | ROLE_CONFUSION se lido como clínica |

## Decisões desta remessa

| Tema | Decisão |
|------|---------|
| 你怎么了？ | **Não ensinar.** Usar 你怎么样？ (já conhecido), só receptivo. |
| 药店 / farmácia | **Não.** Orçamento + vocabulário novo. |
| Número 120 | **Pesquisado, não implementado.** Fontes abaixo. Gate de emergência não exige número. |
| Culture Lesson / 挂号 | **Não.** Processo real, mas exigiria hànzì + pipeline cultural. Spec permite pular se não houver aula local sourced. Sem TCM/dosagem. |
| Chunks novos | **Zero.** |
| CORE Hanzi | **Só 疼.** 医/院 entram no catálogo para a conversa; não são memória produtiva. |
| 舒服 / 发烧 | Unidades lexicais. Não exigir 舒+服 nem 发+烧+了. |
| 我要看医生 vs 我需要医生 | Consulta vs necessidade direta. `validAnswers` / accepts quando as duas são naturais. |
| Setting | Um só novo: `clinic`. Amigo fica `street`. |
| Papéis | Rua: `PAIR_LIN_MEI`. Clínica: `PAIR_CLINIC` Paciente / Atendente. |

## Fontes — números de emergência (não entram no produto)

Acesso **2026-09-11**. Informação prática apenas. **Não** vai para SRS lexical.

| Fonte | O que confirma | URL |
|-------|----------------|-----|
| Portal do Governo da RPC — «常用应急号码» | 医疗救护 **120** | https://www.gov.cn/ztzl/yjzn/content_562406.htm |
| Comissão Nacional de Saúde (NHC) | «120» é o número especial único de socorro pré-hospitalar | https://www.nhc.gov.cn/wjw/gfxwj/200405/a605256a46904ebb8c91d2c45808053f.shtml |
| Comissão de Saúde de Pequim (EN) | «120» é o telefone nacional unificado de resgate médico | https://wjw.beijing.gov.cn/English/HealthServices/HealthIndications/202212/t20221230_2887819.html |

`officialEmergencyNumberImplemented: false` em `CHINA_SURVIVAL_EMERGENCY_ARC`.

## Contratos

- `CHINA_SURVIVAL_HEALTH_ARC` — `p6-saude` + `p7-imersao-saude`; cenas `nao-me-sinto-bem`, `na-clinica`.
- `CHINA_SURVIVAL_EMERGENCY_ARC` — mesma missão; cena `na-clinica`.
- Agregação `CHINA_SURVIVAL_HEALTH_EMERGENCY_ARC`.

## p6-saude depois

Progressão: ouvir 我不舒服 → significado → fill `我不______` (舒服) → montar 我/不/舒服 → 我病了 → 我头疼 / 我肚子疼 + match 头/肚子/疼 → fill `我______疼` → montar 我/头/疼 → produção 我不舒服 → 我发烧了 (unidade) → listening `头疼吗？` (opções em PT, sem leak) → 我要看医生 (build word-level 医生) → 我需要医生 → produção (as duas valem) → fill `______在哪里？` 医院 (TRANSFER) → produção 医院在哪里？ → conversa.

Nota discreta no intro: treino de idioma, não orientação médica.

`p6-saude` é tema de mastery. `healthSurvivalPlans.ts` corta os 25 passos autorais em quatro passes (Wave-1 医+生 fica desligado):

| Pass | Índices | Função |
|------|---------|--------|
| M1 | 0–11 | ouvir / fill / montar 我不舒服, 我病了, X+疼 |
| M2 | 13, 14, 15, 17, 18, 19, 20, 22 | febre, listening `头疼吗？`, 医生 como palavra, fill 医院 (transfer) |
| M3 | 12, 16, 19, 21 | Falar 我不舒服 / 我发烧了; montar 医生; Falar médico |
| M4 | 17, 22, 23, 24 | listening atrasado + fill 医院 + produzir 医院在哪里？ + conversa na rua |

M3/M4 têm ≥4 passos (massa do mastery-coverage). M1 não abre produção nem conversa.

## Cenas

### `nao-me-sinto-bem` (amigo na rua)

Mei: 你好！你怎么样？ → aluno produz 我不舒服 (chips 我/不/舒服) → 头疼吗？ → 我头疼 → 我需要医生 → 医院在哪里？ (transfer). Repairs: 不舒服？ / 头？ / 医生？ / 医院？. Fecha com 好。 Sem 在那里, sem 一直走 (ainda não ensinado).

### `na-clinica` (atendimento)

Setting `clinic`. Paciente / Atendente. 我不舒服 (transfer) → listen_reply 头疼吗？ → decisão 我头疼 / 我肚子疼 / 我发烧了 → 我要看医生 (aceita 我需要医生) → 一直走 → decisão 请再说一遍 ≠ 请慢一点 (nós `clinic-repeat` vs `clinic-slow-1/2`) → 谢谢 ou 我需要帮助.

## Health Mission (`p7-imersao-saude`)

Após `p7-imersao-aeroporto`. Variantes A/B/C (cabeça / barriga / febre). ≥2 produções abertas + Falar. Mapa 这里→医院 (一直走). Termina na clínica, não em quiz.

## Hanzi / fills

| Fill | Resposta | Nível |
|------|----------|-------|
| 我不______ | 舒服 | word |
| 我______疼 | 肚子 | word |
| 我______了 | 发烧 | word |
| ______在哪里？ | 医院 | transfer |
| 我需要______ (imersão) | 医生 | delayed |
| 我头______ (imersão) | 疼 | delayed CORE |

CORE novo: **疼** (`teng_pain`), recall em `p7-imersao-saude`. Não 医/病 como CORE.

## Atlas

| Métrica | #251 tip (`003cb0ed7858`) | V4.9.9A (`29954edf3c51`) |
|---------|---------------------------|--------------------------|
| Atlas items | 442 | 444 |
| Taught | 361 | 362 |
| Scheduled | 14 | 13 |
| Future / untouched | 67 | 69 |
| Utilization | 81.7% | 81.5% |

Dois chars de catálogo (`医`, `院`) para a conversa. Não perseguir percentual.

## Cultura

Nenhuma Culture Lesson de saúde nesta remessa. Sem medicamento, dose, TCM ou «chineses usam X para Y».

## PT / EN / UX #251

Todo conteúdo novo nasce PT-BR + EN (`instructionGloss` + `generate:stable-pedagogy`). Labels sem ponto (`Não me sinto bem`, `Estou com febre`, `Dor de cabeça?`) e a equivalência `我头疼 = estou com dor de cabeça.` entram no overlay. `validate:journey-en` PASS (113 temas READY). Victory = `LessonVictory` mínima. Falar primário. Auto-reveal. Mobile 390×844 coberto no e2e.

## Gates novos

| Script | Resultado |
|--------|-----------|
| `validate/test:china-survival-health` | PASS (mutações 1, 4, 5, 6, 9, 12, 16) |
| `validate/test:china-survival-emergency` | PASS (help, slow≠repeat, hospital) |
| `validate/test:health-conversation-naturalness` | PASS (7, 8, papéis) |

## Mutations (P33)

| # | Mutação | Gate |
|---|---------|------|
| 1 | 我发烧了 antes do ensino | `test:china-survival-health` TEACH_BEFORE_TEST |
| 2 | phrase só na scene | `validate:conversation-lexical-bridge` |
| 3 | teach → open sem guided | `validate:production-scaffolding` |
| 4 | 我不舒服 perde speaking | health CAPABILITY |
| 5 | sem listening de sintoma | health CAPABILITY |
| 6 | target leak | health TARGET_LEAK |
| 7 | repairs = 请再说一遍 | naturalness GENERIC_REPAIR / ROLE |
| 8 | 请慢一点 = repeat | emergency + naturalness REPAIR_BRANCH |
| 9 | 医院在哪里？ reensinado | health NOVELTY |
| 10 | CORE sem retrieval | `validate:hanzi-fill-integration` / memory |
| 11 | fill de char nunca ensinado | `validate:teach-before-test` |
| 12 | missão só MC | health CAPABILITY |
| 13 | missão sem speaking | health CAPABILITY |
| 14–15 | culture test/áudio | *N/A — sem Culture Lesson* |
| 16 | dose / conselho médico | health HEALTH_POLICY |
| 17 | PT sem EN | `validate:i18n` / `journey-en` |
| 18 | mobile esconde Falar | e2e 390×844 |
| 19 | Victory dashboard | `validate:completion-experience` |
| 20 | replay XP | e2e / live-league (preservado) |

## Gates preservados (amostra já verde nesta branch)

`lesson-ui-consistency`, `conversation-auto-reveal`, `culture-journey-placement`, `completion-experience`, `conversation-lexical-bridge`, `production-scaffolding`, `hanzi-fill-integration`, `teach-before-test` (+ journey), `conversation-coherence/scenes/loop/pedagogy/decisions/vocabulary-srs`, `hanzi-memory-integration`, `tone-integration/progression/teach-before-test`, `exercise-affordance`, `listening-affordance`, `modality-contract`, `production-transfer`, `transfer-integrity`, `lesson-novelty`, `cognitive-budget`, `culture-native-lessons/playability/story-audio/rewards`, `live-league`, `i18n`, `journey-en`.

| Gate | Resultado |
|------|-----------|
| `validate:beta` | PASS 2026-09-11T07:58Z (~1661 s, `pipefail`) |
| `npm run build` | PASS (~7 s, PWA + seo-prerender) |
| `e2e/v499a-health-emergency.spec.ts` Chromium | **5/5** PASS |
| `test:mastery-quality:all` | 46/46 |
| `validate:journey-en` | PASS |

E2E (Chromium, preview com fixtures): listen+fill 舒服+montar; conversa M4 auto-reveal + chips 我/不/舒服 + Falar; missão com produção aberta + setting `clinic`; 390×844 Falar visível; EN Speak/Falar visível.

## Backend

| Arquivo | Fingerprint |
|---------|-------------|
| `docs/backend/v478-backend-rc.json` | `29954edf3c51` |
| `docs/backend/v489-backend-rc.json` | `29954edf3c51` |

## O que esta remessa não faz

V4.9.9B. Curso médico. Diagnóstico. Dose. 30 sintomas. Scanner. AI Doctor. Novo LessonPlayer/ConversationPlayer. Reabrir Culture Hub / Ligas. Pronunciation Score. Tone Analyzer. Story Mode. Número 120 no app.
