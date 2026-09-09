# V4.9.7A.2 — Culture Teaching Loop

Explicação → Demonstração → Tarefa → Diálogo → Jornada → Memória.

Esta remessa **não** reconstrói o Quest Engine. Corrige a pedagogia cultural: ensinar antes de testar, diálogo como modelo, microtouchpoints na Jornada, estado de conhecimento distinto de `completed`.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#243 — V4.9.7A.1 Culture Quest Engine** (MERGED) |
| SHA de trabalho (HEAD da #243) | `9366094c236b522710b2ff58a00c5f3212ae2af2` |
| SHA de merge da #243 | `4618211a63c8ba5db3fac7e02b0d499899abb44a` |
| Branch | `cursor/v497a2-culture-teaching-6ae2` |
| Fingerprint da Jornada | `f6430d1a11be` (inalterado — bridges **não** entram em `journey.ts`) |

O contrato `CULTURE_TEACH_BEFORE_TEST` exige `firstTeachStep < firstScoredStep` para cada `cultureConceptId`. Primeiro contato ensina **dentro da própria missão**.

## Missões auditadas (18/18)

Todas as missões receberam `culture_teach` (o que acontece + como ler o contexto / variação) **depois** da história de abertura e **antes** da primeira tarefa pontuada.

| Missão | Tipo | Steps | firstTeach | firstScored | Demo diálogo | Dialogue practice |
|--------|------|------:|-----------:|------------:|-------------:|------------------:|
| visiting-home | flagship | 11 | 1 | 4 | sim | 7 |
| host-insistence | flagship | 9 | 1 | 4 | sim | 5 |
| shared-dishes | flagship | 9 | 1 | 4 | sim | 6 |
| gift-receiving | flagship | 9 | 1 | 4 | sim | 6 |
| digital-pay | flagship | 9 | 1 | 4 | sim | 5 |
| metro-qr | flagship | 9 | 1 | 4 | sim | 5 |
| chopsticks-rest | curta | 8 | 1 | 4 | — | — |
| greetings-nihao | curta | 7 | 1 | 3 | — | — |
| thanks-keqi | curta | 7 | 1 | 3 | — | — |
| qingwen-ask | curta | 7 | 1 | 3 | — | — |
| family-terms | curta | 7 | 1 | 3 | — | — |
| teacher-title | curta | 7 | 1 | 3 | — | — |
| four-and-eight | curta | 7 | 1 | 3 | — | — |
| spring-festival | curta | 7 | 1 | 3 | — | — |
| mid-autumn | curta | 7 | 1 | 3 | — | — |
| qingming | curta | 7 | 1 | 3 | — | — |
| dragon-boat | curta | 7 | 1 | 3 | — | — |
| office-hours | curta | 7 | 1 | 3 | — | — |

Totais pós-loop: **18 missões, 141 steps, 43 story beats, 18 memory targets, 6 flagship**.

`cultureConceptId` = memory target `${itemId}-core` em todo step pedagógico.

Explicações usam `summary` / `why` / `notice` / `variability` — **não** copiam a alternativa correta da tarefa (transferência, não memória de frase). Drawer opcional **Entender melhor** (`whyMore`: motivo, contexto, variação, fonte).

## Flagship — diálogo como ensino

Ordem obrigatória:

1. História de contexto
2. `culture_teach` (o que / por que / como ler / pode variar)
3. Demonstração (Mei / Lin / Wang, `role: demo`, peso 0)
4. Decisão + outra aplicação
5. Diálogo em que o aluno escolhe — **NPC reage** (`option.reaction`)
6. Recall
7. Resumo (fontes fora do fluxo)

## Pontuação e estrelas

| Papel | Peso |
|-------|------|
| teach / story / demo / summary | 0 |
| primeira aplicação guiada | 0.4 |
| aplicação independente | 1 |
| recall | 1.2 |

Estrelas (só pós-ensino): 1★ concluiu · 2★ ≥70% · 3★ ≥90% + recall correto.

Erro no primeiro contato **não** marca falha cultural; é diagnóstico. `mastered` exige recall correto. Completar um Culture Bridge **não** dá 3★ nem XP de missão.

## Journey Culture Bridges (12)

Injetados pelo `LessonPlayer` a partir de `lesson.cultureItemId`. **Não** alteram `src/data/journey.ts`. Máximo 1 mini explicação + 1 microtarefa. Não bloqueiam completion. Não tocam SRS lexical. Toast pequeno `🏮 Cultura +1`.

| Aula | Item | Conceito | Placement | Tipo |
|------|------|----------|-----------|------|
| l2 | greetings-nihao | greetings-nihao-core | mid | scenario |
| l4 | thanks-keqi | thanks-keqi-core | mid | dialogue |
| p1-qingwen-cortesia | qingwen-ask | qingwen-ask-core | mid | sequence |
| l24 | family-terms | family-terms-core | mid | scenario |
| l26 | host-insistence | host-insistence-core | mid | dialogue |
| l26b | shared-dishes | shared-dishes-core | mid | visual_choice |
| l26c | chopsticks-rest | chopsticks-rest-core | **end** | identify_mistake |
| l27 | digital-pay | digital-pay-core | mid | scenario |
| p6-rotina-trabalho | office-hours | office-hours-core | mid | scenario |
| p6-cidade-lugares | metro-qr | metro-qr-core | mid | sequence |
| p7-imersao-estacao | metro-qr | metro-qr-core | mid | identify_mistake |
| p7-imersao-casa-amigo | visiting-home | visiting-home-core | mid | scenario |

`l26c` não interrompe `conversation_scene`; o bridge abre **depois** da missão de restaurante. Laboratórios de tom / Hanzi Builder permanecem inelegíveis.

Se o aluno já praticou na Cultura, o bridge vira **Você lembra?** e não reexplica. Se praticou na Jornada, a missão pode omitir as telas `culture_teach` (estado comprovado) e mostra **Visto na Jornada ✓**.

## Progress states

`unseen` → `introduced` (teach / bridge) → `practiced` (microtarefa ou aplicação) → `mastered` (missão + recall) → `review_due` (derivado quando a memória cultural vence) → `mastered` de novo.

Persist `longyu-v1` **v23**. Contas v22 com missão concluída migram o conceito para `mastered`. Merge cloud escolhe o estado de maior rank. E2E continua a semear v21 para a cadeia 21→22→23 correr.

Hub: rotas mostram **Visto na Jornada ✓** quando `source === journey`.

Review: cada memory target continua com 3 formatos (situação, erro do personagem, sequência) e a sessão rota por `reps`.

## PT / EN / mobile

Todo `culture_teach`, demonstração, bridge, feedback e explanation nasce PT-BR + EN. Player: uma ideia por tela. CTA `min-h-12`. Viewport 390×844 coberto no spec existente.

## E2E

Chromium `e2e/culture-hub.spec.ts`: **12 passed**.

- Missão nova começa em história; `culture_teach` aparece antes das opções
- Flagship `host-insistence`: teach → demo → prática; NPC reage (`culture-npc-reaction`)
- Missão pula `culture_teach` quando o conceito já está `practiced` na Jornada
- Journey Culture Bridge em `l2`: explica → tarefa → toast `🏮 Cultura +1` → Hub **Visto na Jornada ✓**
- Hub marca conceito praticado na Jornada (persist v21→v23 preserva `cultureKnowledgeById`)
- Touchpoint de `l26c` / `l2` preservado (bridge usa `culture-bridge`, não `culture-touchpoint` no meio do exercício)
- Review cultural não usa chrome de SRS lexical
- Seeds E2E em persist v21 (migrações v22 + v23)
- Mobile 390×844: hub e CTA tappable

Walkthrough: teach → demo → NPC; Hub “Visto na Jornada”; teach em 390×844.

## Mutações

| # | Mutação | Gate |
|---|---------|------|
| 1 | Remover explanation antes da primeira task | `UNTAUGHT_CONCEPT` |
| 2 | Task com conceptId nunca ensinado | `UNTAUGHT_CONCEPT` |
| 3 | Flagship sem dialogue demonstration | `FLAGSHIP_NO_DIALOGUE_DEMO` |
| 4 | Bridge sem explicação PT/EN | `MISSING_EN` |
| 5 | Bridge altera SRS lexical | isolado (`applyCultureBridgeComplete`) |
| 6 | Duas bridges na mesma aula | `DOUBLE_BRIDGE` |
| 7 | Bridge em laboratório de tons | `TECHNICAL_UNIT` |
| 8 | Explanation só em PT | `MISSING_EN` |
| 9 | Bridge aponta CultureItem diferente | `BRIDGE_ITEM_MISMATCH` |
| 10 | Completar bridge dá 3★ | `applyCultureMissionComplete` com score baixo ≠ 3 |
| 11 | Mastered sem recall | estado permanece `practiced` |
| 12 | Diálogo sem reação do NPC | `NO_NPC_REACTION` |

## Gates

Novos (depois de culture-gamification em `validate:beta`):

- `validate:culture-teach-before-test` / `test:culture-teach-before-test`
- `validate:culture-explanation-depth` / `test:culture-explanation-depth`
- `validate:culture-journey-integration` / `test:culture-journey-integration`

Preservados: culture-content, culture-distribution, culture-missions, culture-memory, culture-gamification, china-survival-restaurant, conversation-coherence, hanzi-memory, tone-integration, teach-before-test, i18n, journey-en, sync, validate:beta, build.

`validate:beta` local: **verde** (exit 0). Base `main` após #243: `4618211`.

## Não feito (fora desta remessa)

V4.9.7B, AI Tutor, Stories completo, Culture Streak, outra moeda, dezenas de badges.
