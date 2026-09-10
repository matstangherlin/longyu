# V4.9.8A — China Survival II: transporte, estação e navegação urbana

Experiência de deslocamento, não um Google Maps. O aluno cumpre a missão: **perguntar → entender → navegar → reparar → chegar**.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#245 — V4.9.7B compras → mercado → pagamento** (obrigatória) |
| SHA de merge da #245 | _ainda não existe — #245 está MERGEABLE mas BLOCKED pela branch protection (sem `--admin`)_ |
| Branch | `cursor/v498a-city-mobility-6ae2` (empilhada em `cursor/v497b-shopping-6ae2` até o merge da #245) |
| Fingerprint da Jornada (#245) | `e8007959fb1f` |
| Fingerprint da Jornada (esta remessa) | `9841a47409d3` |
| Atlas #245 | 438 itens / 355 taught (81,1%) |
| Atlas esta remessa | 439 itens / 358 taught (81,5%) |

Não se perseguiu percentual. O item novo no Atlas é `chunk:qunali` (去哪里？). Taught sobe com CORE 左 / 右 + o chunk de destino.

O corpus exige hànzì sem ficha em `CHARACTERS` listados em `newHanzi` da lição que os mostra. Por isso 地/铁 entram no allowlist de `p6-cidade-lugares` e `p6-direcoes`, e 直/转/入/出/停/北/京/怎 voltam no allowlist da missão — reúso, não ensino novo. `char:zuo_left` / `char:you_right` entram em `libraryItems` de `p6-direcoes` para o recognize CORE.

O mastery loop gerava 8 passos e trocava `pegar-taxi` por conversa de loja. `mobilitySurvivalPlanFor` reparte o autoral: M1 vê, M2 ouve, M3 segue/produz com apoio, M4 conversa e produz sem alternativas. Os cortes obedecem `validate:topic-mastery-depth`, `test:mastery-coverage` e `test:mastery-coverage:strict` (`no_false_depth`: flashcard só no M1). `p6-cidade-lugares` M3/M4 voltam ao planner gerado. `p6-direcoes` ensina tom + 左/右 no M1 e aplica o mapa no M2. `p6-china-ruas` M3 leva `address_build`/`city_context` sem flash; M4 abre com `pegar-taxi`. `p7-imersao-estacao` M3 inclui a produção de `地铁站在哪里？`.

Preservado integralmente:

- `CHINA_SURVIVAL_SHOPPING_ARC`
- conversation decisions / bargaining-context / digital-pay
- Culture Teaching Loop, Culture Journey Bridges, Culture Memory
- 买 × 卖 e CORE 买
- Restaurant Survival
- todos os gates atuais

Teaching topics continuam **113**. Hotel e aeroporto entram só como **lugar / destino**. Sem check-in, bagagem, portão, voo, 房卡, Wi-Fi.

## Princípio

Não criar `estacao-survival-2`. Refinar `p6-cidade-lugares` / `p6-direcoes` / `p6-china-ruas` / `p7-imersao-estacao` e as cenas `imersao-estacao` / `pegar-taxi`.

Sem GPS, sem API Maps, sem mapa real da China, sem Tone Analyzer, sem AI Navigation Tutor, sem Stories, sem V4.9.8B.

## Fase 0 — auditoria

| Capacidade | Já existia? | Ensino | Listening | Mapa | Produção | Conversa | Cultura | Transferência | Ação |
|---|---|---|---|---|---|---|---|---|---|
| ask_where | sim | `在哪里？` em `p6-cidade-lugares` | parcial | — | fraca | parcial | — | lugares novos | produção livre na missão |
| understand_where | sim | 在那里 / placas | parcial | — | — | sim | — | — | reusar |
| ask_route | sim | `怎么走？` | pouco | — | escolha | pouca | — | 请问 + lugar | produção livre |
| understand_left | reconhecimento | `左边` / `左转` | sim | `map_direction` | botão | — | — | — | tom + mapa + recall |
| understand_right | reconhecimento | `右边` / `右转` | sim | sim | botão | — | — | — | idem |
| understand_straight | sim | `一直走` | sim | sim | — | — | — | — | áudio sem vazamento |
| follow_route | uma instrução | mapas M1–M2 | pouco | sim | — | — | — | hotel→metrô | M3 sequência + M4 |
| identify_station | sim | `地铁站` | sim | label | — | — | metro-qr | — | missão |
| identify_metro | sim | `地铁` | visual | — | — | — | metro-qr | — | placa → ação |
| identify_taxi | sim | `我坐出租车` | visual | — | — | `pegar-taxi` | — | — | diálogo funcional |
| state_destination | frase pronta | `我要去酒店` | pouco | — | escolha | NPC não ecoava | — | 北京路 | produção + eco |
| ask_ticket_price | sim | `票多少钱？` | pouco | — | escolha | sim | — | 十 falado | listening 10/18/28/8 |
| understand_ticket_price | número | 十 | fraco | — | — | — | — | — | áudio sem target |
| request_stop | frase pronta | `在这里停车` | — | — | escolha | pouco | — | — | produção livre |
| recover_when_lost | `请再说一遍` | sim | — | — | — | um só reparo | — | `请慢一点` | decisão com ramos |
| complete_trip | cenas soltas | — | — | — | — | estação / táxi | metro-qr | — | missão composta |

Lacunas reais: mapa resolvido pelo áudio sem vazar o alvo; rota de 2–3 passos; 左/右 CORE com delayed recall; NPC ecoando destino; reparo contextual (não só 请再说一遍); 去哪里？ ensinada antes do táxi; produção independente das quatro falas mínimas.

Não se criou aula «o que significa esquerda?». `左转` já era mapa; a remessa liga som + hànzì + tom + espaço.

## Contrato

`CHINA_SURVIVAL_MOBILITY_ARC` em `src/data/chinaSurvivalMobility.ts`.

Lições: `p6-cidade-lugares`, `p6-direcoes`, `p6-china-ruas`, `p7-imersao-estacao`.  
Cenas: `imersao-estacao`, `pegar-taxi`.  
Missão: `p7-imersao-estacao`.  
Cultura: somente `metro-qr` (bridge em `p6-cidade-lugares`, sem segunda bridge).

## Conteúdo reutilizado

- Motores: `map_direction`, `route_sequence`, `place_label`, `sign_reading`, `city_context`, `address_build`
- `怎么走？`, `在哪里？`, `请问`, `我要去酒店`, `去北京路`, `在这里停车`, `请再说一遍`, `请慢一点`, `入口` / `出口`
- Cenas existentes — extraídas para `mobilitySurvivalScenes.ts`, não clonadas
- CultureItem `metro-qr` (sem CultureItem novo de táxi: sem fonte nova necessária)

## Chunks / chars novos

| id | hànzì | papel |
|----|-------|--------|
| `qunali` | 去哪里？ | pergunta do motorista; teach-before-test em `p6-china-ruas` |

CORE novos (máximo 2): **左** e **右**. Introduce `p6-direcoes`, delayed recall `p7-imersao-estacao`. Sem CORE 站.

## Lições alteradas

- `p6-cidade-lugares` — M1 VER: 酒店 / 地铁站 / 银行 / 公园. Bridge `metro-qr` intacta.
- `p6-direcoes` — tom 左 (3º) × 右 (4º); mapas M1–M4; áudio sem vazamento; sequência 一直走 → 左转 → 地铁站; produção guiada de `怎么走？` (ask_route). A produção aberta da mesma estrutura fica na missão (`p7-imersao-estacao`) para `validate:prerequisite-progression`.
- `p6-china-ruas` — ensina `去哪里？`; listening de confirmação; produção de destino e parada; `pegar-taxi`.
- `p7-imersao-estacao` — City Mobility Mission: recall 左/右, mapa de transferência, rota, placa → ação, listening de direção e preço, cenas de estação e táxi, quatro produções livres faláveis.

## Cenas refinadas

**imersao-estacao:** perguntar onde fica → direção rápida → decisão 请再说一遍 / 请慢一点 (ramos diferentes) → placa 入口 ou pergunta → preço → 我要这个 → 谢谢. Reparos: 地铁站吗？ / 左边？ / 入口？ / 十？ / 这个？.

**pegar-taxi:** 你好。去哪里？ → decisão 我要去酒店 / 去北京路 → eco 酒店，好。 / 北京路，好。 → 在这里停车. Sem 你好吗. Hotel é destino.

## Mapas e variantes

| Variante | De | Para | Instrução |
|----------|----|------|-----------|
| A | 酒店 | 地铁站 | 左转 |
| B | 公园 | 地铁站 | 一直走 |
| C | 地铁站 | 酒店 | 右转 |
| sequência | parque / hotel | estação | 一直走 → 左转 → 地铁站 |

Erro de mapa mostra consequência espacial (`player.mapWrongTurn`), não só «Errado».

## Produção / listening / speaking

Produção independente (sem alternativas, `productionOpen`): ask location, ask route, state destination, request stop.

Listening sem target no título: direção (`一直走，右转。`), preço (`十。`), confirmação de destino (`酒店，好。`).

## Tom

Microtouch em `p6-direcoes`: ouvir contorno → explicar 3º (baixo/curva) vs 4º (queda) → aplicar no mapa. Sem aula de tons.

## Cultura

- CultureItem: `metro-qr` (existente)
- Bridge: `p6-cidade-lugares` (teto 12 mantido; bargaining-context permanece em `p6-compras`)
- Missão: Culture Teaching Loop já injeta `culture_teach` antes da tarefa
- Sem CultureItem de ride-hailing (sem lacuna + fonte que justificasse catálogo)

## Fingerprint / backend

| | |
|--|--|
| Fingerprint | `9841a47409d3` |
| Contratos | `docs/backend/v478-backend-rc.json`, `v489-backend-rc.json` regenerados |

`CURRICULUM_SOURCES` passa a incluir `chinaSurvivalMobility.ts`, `mobilitySurvivalScenes.ts` e `mobilitySurvivalPlans.ts`.

## Gates

Novos: `validate:china-survival-mobility`, `test:china-survival-mobility` (15/15 mutações).

Preservados: culture-*, china-survival-restaurant/shopping, conversation-*, hanzi-memory, tone-*, teach-before-test, listening-affordance, modality-contract, production-transfer, exercise-depth, lesson-novelty, i18n, journey-en, sync-merge, backend-contract, validate:beta, build.

O plano autoral expôs strings antigas da cidade/estação que o gerador de 8 passos escondia. `instructionGloss.en.json` cobre essas falas + as novas da missão. `validate:journey-en` PASS.

## Mutações (15/15)

1. 右转 no mapa antes de ensinar → `TEACH_BEFORE_TEST`
2. remover mapa / consequência espacial → `NO_MAP`
3. listening com target no título → `TARGET_LEAK`
4. remover produção de 怎么走？ → `CAPABILITY`
5. retirar speaking (`productionOpen`) → `CAPABILITY`
6. remover request_stop → `CAPABILITY`
7. NPC ignora destino → `BROKEN_CONTINUITY`
8. todos os reparos = 请再说一遍 → `GENERIC_REPAIR`
9. CORE 左/右 sem delayed recall → `DELAYED_RECALL`
10. teste tonal antes da explicação → `EXPLAIN_BEFORE_TEST`
11. cultura testa antes de ensinar → `TEACH_AFTER_TEST`
12. bridge altera SRS lexical → `SRS_LEAK`
13. rota alternativa válida no ramo de erro → `VALID_AS_ERROR`
14. hotel/aeroporto avançado no arco → `SCOPE`
15. EN ausente → `MISSING_EN`

## QA

Playwright `e2e/v498a-city-mobility.spec.ts`: **8/8** no Chromium (preview `4173`, plano autoral). O skip-through completa o microtouch de tom (`data-tone-first-exposure` → Percebi a curva). O mapa de `p6-direcoes` fica no M2 (flashcards no M1).

Checklist humano (desktop + 390×844): p6-cidade-lugares, p7-imersao-estacao, pegar-taxi, City Mobility Mission, metro-qr CultureMission.

Perguntas: «Eu consigo chegar a algum lugar?», mapa exige compreensão, direção sem tradução, pedir ajuda/repetição, NPC ecoa destino, táxi parece táxi, reúso de mandarim antigo, cultura antes da tarefa.
