# V4.9.8A.2 — Culture playability + live leagues

Fechar o que impede a experiência de parecer pronta: Cultura jogável (com história e áudio no LessonPlayer da #247) e Ligas com ranking real.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#247 — V4.9.8A.1 Native Culture Lessons** (MERGED) |
| SHA de merge da #247 | `26054e95514cc6b2e5ab4839816fbffb79743c3b` (`Merge pull request #247`) |
| Branch | `cursor/v498a2-release-hardening-6ae2` |
| Fingerprint da Jornada (#247) | `bebd8925b576` |
| Fingerprint da Jornada (esta remessa) | `b727b36129b1` |
| Store persist | v24 (inalterado) |
| Teaching topics | **113** (inalterado) |
| Economia | `LESSON_BASE_XP = 10`, `LESSON_THREE_STAR_XP_BONUS = 5` |

Não se desfez a arquitetura da #247: 19 lições canônicas, mesmo LessonPlayer, Hub → `/licao/culture-{id}/player`, progresso único, persist v24, `CultureMissionPlayer` fora do fluxo publicado.

Não se começou V4.9.8B (hotel / aeroporto).

## Cultura

### 19 lessons

Auditoria estrutural (`auditCultureLessons`): **19/19 PASS**. Nenhuma tarefa scored sem controle.

| lessonId | steps | interactive | audioBeats | storyBeats | kinds | affordance |
|----------|------:|------------:|-----------:|-----------:|-------|------------|
| culture-greetings-nihao | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-thanks-keqi | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-qingwen-ask | 9 | 4 | 1 | 1 | **sentence_build**, fill, match, choice | PASS |
| culture-gift-receiving | 9 | 3 | 2 | 2 | dialogue, fill, choice | PASS |
| culture-teacher-title | 6 | 3 | 0 | 0 | fill, match, choice | PASS |
| culture-four-and-eight | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-family-terms | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-mid-autumn | 6 | 3 | 0 | 0 | fill, match, choice | PASS |
| culture-spring-festival | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-host-insistence | 10 | 3 | 3 | 3 | dialogue, fill, choice | PASS |
| culture-shared-dishes | 11 | 5 | 2 | 2 | image, choice, match, dialogue | PASS |
| culture-chopsticks-rest | 9 | 4 | 1 | 1 | image, spot, fill, choice | PASS |
| culture-digital-pay | 8 | 3 | 1 | 1 | match, dialogue, choice | PASS |
| culture-metro-qr | 9 | 4 | 1 | 1 | image, spot, dialogue, choice | PASS |
| culture-bargaining-context | 9 | 4 | 1 | 1 | match, fill, dialogue, choice | PASS |
| culture-office-hours | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-dragon-boat | 6 | 3 | 0 | 0 | fill, match, choice | PASS |
| culture-qingming | 6 | 3 | 0 | 0 | match, fill, choice | PASS |
| culture-visiting-home | 12 | 4 | 3 | 3 | dialogue, fill, spot, choice | PASS |

Impossible tasks encontradas: **1** (qingwen “Ordene” sem peças). Corrigidas: **1**.

### qingwen-ask (P9)

A bridge antiga (`taskKind: sequence`) **não** volta. A lição canônica usa `sentence_build` no LessonPlayer:

1. História no corredor + Mei `请问，地铁站怎么走？` com áudio.
2. “Ordene o pedido a um desconhecido no corredor.” — peças visíveis.
3. Fill + pares existentes.

Verificar fica `disabled` até existir pelo menos uma peça (`canCheck = picked.length > 0`).

### Histórias + áudio (P1–P2)

Flagships (`CULTURE_STORY_FLAGSHIP_IDS`): visiting-home, host-insistence, shared-dishes, chopsticks-rest, digital-pay, metro-qr, bargaining-context, gift-receiving.

Padrão: EXPLICAÇÃO (intros de teach) → HISTÓRIA (personagem + situação + evento) → ÁUDIO (MandarinText + SpeakButton, autoplay respeita `autoPlayAudio` / TTS) → TAREFA → CONSEQUÊNCIA → NOVA SITUAÇÃO → RECALL.

Falas Mandarin usam o TTS já existente. Não há `CultureTTS`. Autoplay falho não bloqueia Continuar; o botão de ouvir permanece (`showAudioStatus`).

Listening cobrado só depois de ensinar: `再吃一点吧！` / `再喝一点吧！` aparecem no beat de história **antes** do dialogue.

Histórias vivem nas Culture Lessons canônicas, portanto já estão nos nós da Jornada da #247.

### Save / resume / rewards (P3–P6)

- Player: sem `culture-save`. Hub card: `Salvar para depois` com `stopPropagation`.
- Resume: `lessonSessionStepById` / `setLessonSessionStep` (fluxo padrão de lição).
- Primeira conclusão: `LESSON_BASE_XP` + bônus 3★. Vitória: “🏮 Cultura concluída”, Perfect, acertos/erros/precisão.
- Replay: `firstCompletion` falso → XP 0. Hub e Jornada compartilham `culture-{id}`. Patch cultural `grantXp: false`.
- Liga: `leagueXpKeyLesson` → `claimReward` → `syncLeagueXpToServerAsync`. Sem sync paralelo.

### Review / legacy (P7, P10)

Review passa pelo contrato de affordance (options ≥2 ou sequence ≥2 peças) e renderiza `StepRenderer`. `CultureMissionPlayer` não tem rota pública; mount acidental redireciona.

### PT / EN / mobile

Overlays EN das novas falas entram via `CULTURE_NATIVE_GLOSS_EN`. Locales: `culture.lessonComplete`, `player.perfect`, `player.hits`, `player.errorsShort`. E2E 390×844 no qingwen order.

## Ligas

### authMode (P12)

`resolveLeagueAuthIntent(authMode, hasCloudSession || fixture || pendingCloudCheck)`.

Se existe sessão Supabase, a liga trata a conta como cloud mesmo com `authMode` local stale, e chama `restoreCloudSessionIfPresent()`. Enquanto a sessão não resolve e o backend cloud está disponível, `allowBots` é false (loading, não demo).

`syncLeagueXpToServer` também resolve cloud via `getUser()` se o store ainda estiver em local.

### RPC (P13, P18, P25)

`get_league_standings`: `auth.uid()`, ranking por `rank_position` / `weekly_xp`, campos públicos (`user_id` interno não é renderizado; UI mostra nome, avatar, XP, streak, Pro, Você). Sem email.

`add_league_weekly_xp`: `auth.uid()`, `on conflict (user_id, source_key) do nothing`.

Fixture de teste (não produção): Ana 100, Matheus 80, João 40 → João +80 sobe para 1º.

### Fallback (P20–P21)

| Caso | UI |
|------|----|
| local / sem sessão | Demonstração explícita + bots |
| cloud + live | ranking real, banner “Liga real” |
| cloud + RPC vazio | empty, sem bots |
| cloud + erro | erro + retry; snapshot cache se houver (“Última atualização: HH:MM”) |
| cloud + demo do fetch | tratado como erro, não como bots |

### Culture XP → liga (P15–P16, P28)

Qualquer `claimReward` de XP (lição, revisão, imersão, cultura na primeira conclusão) incrementa `weeklyXp` local e enfileira `add_league_weekly_xp`. Replay cultural não reclama. `refreshLive` observa `weeklyXp` e o evento de sync.

### E2E liga

`e2e/v498a2-release-hardening.spec.ts`: fixture live sem “Demonstração”; Ana/Matheus/João; XP; Você; primeira conclusão cultural alimenta weekly XP; replay `+0`.

RPC com 3 contas cloud reais no projeto de produção **não** foi populado (proibido inventar usuários). Contrato + fixture preview cobrem A/B/C.

## Gates

| Gate | Papel |
|------|--------|
| `validate:exercise-affordance` | contrato por StepKind |
| `validate:culture-playability` / `test:culture-playability` | 19 lessons + mutações 1–3, 6 |
| `validate:culture-story-audio` / `test:culture-story-audio` | flagship + mutações 4–5 |
| `validate:culture-rewards` / `test:culture-rewards` | mutações 7–9 |
| `validate:live-league` / `test:live-league` | mutações 10–12, 15, 20.1, 22, 24 |

Inseridos em `validate:beta` imediatamente após `test:culture-standard-tasks`.

Gates da #247 preservados (`culture-native-lessons`, `culture-journey-nodes`, `culture-standard-tasks`, teach-before-test).

## Mutações

1. sequence sem peças → playability falha  
2. fill_blank sem bank → falha  
3. choice sem options → falha  
4. flagship Mandarin sem áudio → story-audio falha  
5. remover superfície de replay → falha  
6. “Salvar para depois” no LessonPlayer → falha  
7. vitória cultural sem XP chip → reward falha  
8. replay concede XP (`grantXp: true`) → falha  
9. Culture XP sem `leagueXpKeyLesson` → falha  
10. cloud + bots ungated → live-league falha  
11. RPC error vira demo silenciosa → falha  
12. standings omit XP → falha  
15. `source_key` não idempotente → falha  

## Backend / build

- Contratos SQL de liga: `004_leagues.sql` (`get_league_standings`, `add_league_weekly_xp`). Sem mudança de schema nesta PR.
- Persist v24 inalterado.
- `validate:beta` / `test:backend-contract` / `build` — a correr no CI desta PR.

## Preservado

Culture Hub, 19 nós da Jornada, LessonPlayer único, Restaurant / shopping / mobility, 113 tópicos, Culture Memory, i18n PT/EN. Sem CultureMissionPlayer publicado, sem Story Mode, sem bots de produção, sem moeda nova.
