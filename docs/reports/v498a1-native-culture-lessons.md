# V4.9.8A.1 — Native Culture Lessons

Uma jornada + um player + um sistema de tarefas + dois domínios (mandarim e cultura).

Cada CultureItem publicado vira uma Lição canônica. Hub e Jornada abrem o mesmo `LessonPlayer`. O Hub continua passaporte, mapa, revisão e atalho — não uma segunda escola.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#246 — V4.9.8A City Mobility** (MERGED) |
| SHA de merge da #246 | `8aafd7fb9580a785fc5e31367bda765a605c96bc` (`Merge pull request #246`) |
| Branch | `cursor/v498a1-native-culture-lessons-6ae2` |
| Fingerprint da Jornada (#246) | `6a18e9fbf42f` |
| Fingerprint da Jornada (esta remessa) | `bebd8925b576` |
| Store persist | v24 |
| Teaching topics | **113** (inalterado) |

Não se inseriu cultura em `JOURNEY` / `ALL_LESSONS` (isso relockaria alunos avançados via `currentLessonId`). As 19 lições vivem no catálogo paralelo `CULTURE_NATIVE_LESSONS`; `getLesson()` as encontra.

Não se começou V4.9.8B (hotel / aeroporto / check-in / bagagem).

## Princípio

| Superfície | Papel |
|------------|--------|
| Jornada | caminho; nós CORE parecem trilha; EXPLORE são laterais |
| Hub | passaporte + mapa + revisão + atalho `/cultura/:id` → player |
| Player | o mesmo `LessonPlayer`, feedback, XP, vitória |
| Tarefas | motores padrão (`contextual_choice`, `fill_blank`, `match_pairs`, `dialogue_choice`, `spot_error`, `image_choice`) |

## Arquitetura

- `src/data/cultureNative.ts` — ids `culture-{itemId}`, CORE/EXPLORE, `afterTopicId`, migração bidirecional de progresso
- `src/data/cultureLessons.ts` — 19 lições canônicas (3 telas `intro` + extras + recall)
- `src/data/journeyOrchestrator.ts` — nós `CULTURE_LESSON` (não entram em `ALL_LESSONS`)
- `CultureItemPage` — id inválido → `culture-missing`; publicado → `Navigate` para `/licao/culture-{id}/player`
- Bridges de catálogo permanecem como arquivo; `cultureBridgeForLesson()` não injeta overlay no player

Desbloqueio do nó da Jornada: o tópico de língua âncora precisa estar path-complete (`requiredCompletedLessonIds` + `isJourneyTopicComplete`). O Hub pode abrir a lição sem esse portão (`canStartLesson` não acha cultura em `ALL_LESSONS`).

## Colocação CORE / EXPLORE

| Item | Trilha | Depois de |
|------|--------|-----------|
| greetings-nihao | CORE | l2 |
| thanks-keqi | CORE | l4 |
| qingwen-ask | CORE | p1-qingwen-cortesia |
| gift-receiving | EXPLORE | l4 |
| teacher-title | EXPLORE | l9 |
| four-and-eight | EXPLORE | l19 |
| family-terms | EXPLORE | l24 |
| mid-autumn | EXPLORE | l24 |
| spring-festival | EXPLORE | l25 |
| host-insistence | CORE | l26 |
| shared-dishes | CORE | l26b |
| chopsticks-rest | CORE | l26c |
| digital-pay | CORE | l27 |
| metro-qr | CORE | p6-cidade-lugares |
| bargaining-context | CORE | p6-compras |
| office-hours | EXPLORE | p6-horarios |
| dragon-boat | EXPLORE | p6-natureza |
| qingming | EXPLORE | p6-rotina-trabalho |
| visiting-home | CORE | p7-imersao-casa-amigo |

## Pontuação / XP / SRS

- Estrelas: `lessonStars` + `hadMistakes` (o mesmo contrato do player)
- XP de lição: `LESSON_BASE_XP` + bônus 3★ só na primeira conclusão
- `applyCultureMissionComplete(..., { grantXp: false })` evita o XP antigo `culture-complete:{id}`
- Replay: `firstCompletion` falso → XP 0
- Finish cultural **não** chama `ensureSrs` / `gradeSrs` lexical
- Conceito já `practiced` / `mastered` / `review_due` → pula telas `intro`

## Migração v24

`migrateNativeCultureProgress` sincroniza `completedLessons` (`culture-{id}`) ↔ `cultureCompletedIds` (`{id}`). Não zera `cultureMasteryById`. Seeds de E2E continuam em persist v21 para exercitar v22–v24.

## Gates

- `validate:culture-native-lessons` / `test:culture-native-lessons`
- `validate:culture-journey-nodes` / `test:culture-journey-nodes`
- `validate:culture-standard-tasks` / `test:culture-standard-tasks`
- `validate:culture-journey-integration` (cobertura nativa obrigatória; overlay redundante é vermelho)

E2E: `e2e/culture-hub.spec.ts`, `e2e/v497b-shopping.spec.ts`, `e2e/v498a-city-mobility.spec.ts`, `e2e/v498a1-native-culture-lessons.spec.ts`.

## Preservado

Restaurant Survival, shopping, city mobility, 113 teaching topics, Culture Memory / revisão, i18n PT/EN. `CultureMissionPlayer` permanece no tree mas **não** é o renderer do Hub.
