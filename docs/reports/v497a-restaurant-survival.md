# V4.9.7A — China Survival I: restaurante e comida

Experiência de sobrevivência, não unidade de vocabulário. O aluno cumpre a missão: entrar → entender a interação → pedir → ajustar → reagir → pedir a conta → sair.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#241 — V4.9.6C Culture Hub (ainda aberto)** |
| SHA de origem | `dae6d1770bc453d0793e896669931399769249cf` (`Corrigir E2E do Culture Hub: persistência e catálogo EN`) |
| `main` antiga | **não usada** |
| Branch | `cursor/v497a-restaurant-survival-6ae2` |
| Fingerprint da Jornada (241 HEAD) | `43d5272e1d4b` |
| Fingerprint da Jornada (esta remessa) | `f3096d32f1ce` |
| Atlas 241 HEAD | 351 / 429 taught (81.8%) |
| Atlas esta remessa | 358 / 436 taught (82.1%) |

Quando #241 mergear, rebasear esta remessa no **SHA real do merge** — não na `main` antiga.

Preservado integralmente:

- V4.9.6A rotina e tempo
- V4.9.6B memória de hànzì, tons integrados, coerência de conversa
- V4.9.6C Culture Hub, cultura distribuída, `CultureItem` / `cultureItemId`

Teaching topics continuam **113**. `l26c` é `isReview: true` (missão / imersão), não um tópico novo de ensino. `newHanzi` em `l26c` / `l10-rev` só declara glifos já vistos (`两` `单` `杯` `务` `员`) para o corpus — não abre aula de classificadores.

## Princípio

Não criar `restaurant-lesson-1/2/3`. Refinar `l26` / `l26b` / `l27` e conectar com **uma** missão nova: `l26c` *Imersão: almoce num restaurante*.

Núcleo de pedido: `我要 + X` com itens já conhecidos (米饭, 茶, 水, 菜单). Sem lista infinita de comidas. Sem pagamentos digitais (V4.9.7B). Sem mercado completo.

## Fase 0 — auditoria

| Função | Já existe? | Onde é ensinada? | Produção? | Conversa? | Cultura? | Lacuna real | Ação |
|--------|------------|------------------|-----------|-----------|----------|-------------|------|
| Entrar / cumprimento | sim | `你好` cedo na Jornada | sim | várias cenas | greetings | nenhuma | reutilizar |
| Quantas pessoas (`几位`) | **não** | — | — | — | — | não entendia a pergunta de mesa | chunks `请问几位？` / `一位` / `两位` + char `位` em `l26b` |
| Pedir cardápio | parcial | `菜单` em `l26b` (reconhecer) | reconhecimento | `pedir-cardapio` antiga | — | não produzia pedido utilizável | frame `我要菜单` (não `请给我菜单`) |
| Pedir comida | sim | `我要米饭` / `我要饭` / `我要这个` `l26b` | sentence_build + diálogo | `pedir-cardapio`, `revisao-restaurante` | shared-dishes | transferência fraca | reutilizar frame; produção independente em `l26c` |
| Pedir bebida | sim | `我想喝水` / `我要一杯茶` | diálogo | `pedir-agua`, `pedir-cha`, restaurante | host-insistence | nenhuma | reutilizar; ramo aceitar/recusar |
| Quantidade (`杯`) | sim | `一杯茶` `l26b` | limitada | — | — | `两杯水` útil e pequeno | chunk suporte `两杯水`; não abrir classificadores |
| Recusar / ajustar | parcial | `不要辣` `l26b`; spec citava `不要了` | diálogo picante | — | — | recusa de oferta (chá) | chunk `不要了` + ramo na imersão |
| Restrição “não como…” | sim no corpus | `我不吃肉` (`wobuchirou`) no packet restaurant | não nesta missão | — | — | alergia/detalhe é V4.9.9 | **fora** desta remessa |
| Reagir à comida | sim | `好吃` `l26` | diálogo | `revisao-restaurante` | mesa | pouco social | `好吃吗？` na imersão e na revisão |
| Chamar atendimento | sim | `服务员` `l26b` | listen | — | — | pouco uso situacional | turno na imersão |
| Pedir a conta | sim | `买单` `l26b` (MC) | MC, não independente | revisão tardia | — | não era capacidade de missão | `produce_reply` + freeProduction na missão |
| Preço / loja | sim | `多少钱？` `l27` / `p6-compras` | sim | `conversa-na-loja` | digital-pay | compras/pagamento digital | **não fechar** aqui (V4.9.7B) |
| Imersão restaurante | não | `p7-imersao-mercado` é mercado | — | mercado | shared-dishes | missão de almoço ausente | cena `imersao-restaurante` + lesson `l26c` |

Cenas auditadas e **não clonadas**: `pedir-agua`, `pedir-cha`, `conversa-na-loja`, `comprar-itens`, `imersao-mercado`. Continuam no sítio original.

## Contrato

`CHINA_SURVIVAL_RESTAURANT_ARC` em `src/data/chinaSurvivalRestaurant.ts`.

Competências mínimas em uso (não só no Atlas): `enter_restaurant`, `get_attention`, `ask_menu`, `order_food`, `order_drink`, `specify_quantity`, `accept_or_refuse`, `react_to_food`, `ask_price_or_bill`, `understand_bill_context`, `close_interaction`.

## Conteúdo reutilizado

- Chunks: `我要米饭`, `我要饭`, `我想喝水`, `我要水`, `我要一杯茶`, `菜单`, `服务员`, `饭馆`, `买单`, `好吃`, `我饿了`, `不要辣`, `请坐`, `你好`, `再见`
- Frame `我要 + X` já ensinado em `l26b`
- `revisao-restaurante` (módulo de revisão tardia) — refinada, não clonada
- `pedir-cardapio` — refinada no sítio `l26b`
- CultureItems: `host-insistence` (`l26`), `shared-dishes` (`l26b`), `chopsticks-rest` (`l26c`)
- `杯` via `一杯茶` já existente

## Lacunas reais preenchidas

1. Pergunta de mesa `请问几位？` + respostas funcionais `一位` / `两位`
2. Pedido de cardápio produtivo `我要菜单`
3. Recusa de oferta `不要了` (interação, não tradução)
4. Missão que combina listening + conversa coerente + produção independente + conta
5. Eco do NPC ao pedido (`米饭，好。`) e reparos situacionais (`两位吗？` / `你要什么？` / `买单？`)

## Chunks adicionados

| id | hànzì | papel |
|----|-------|--------|
| `qingwenjiwei` | 请问几位？ | pergunta de mesa |
| `yiwei` | 一位 | uma pessoa |
| `liangwei` | 两位 | duas pessoas |
| `woyaocaidan` | 我要菜单 | pedir cardápio no frame já conhecido |
| `buyaole` | 不要了 | recusar oferta |
| `liangbeishui` | 两杯水 | quantidade mínima (suporte) |

## Caracteres adicionados

| id | hànzì | papel |
|----|-------|--------|
| `wei_person` | 位 | classificador funcional de pessoas no restaurante — **não** aula de measure words |

Não se declarou CORE novo além de **菜** (já no Atlas; agora com delayed recall). `买` fica para V4.9.7B (compras).

## Atlas antes / depois

| | Atlas | Taught | Utilização |
|--|------:|-------:|-----------:|
| 241 HEAD | 429 | 351 | 81.8% |
| V4.9.7A | 436 | 358 | 82.1% |

+7 itens, +7 taught. Future → Taught só o necessário ao arco. Sem perseguir percentual.

## Lições

| id | papel | mudança |
|----|--------|---------|
| `l26` | Fome e gosto | `cultureItemId: host-insistence` (já 4.9.6C). Sem duplicar cardápio. |
| `l26b` | No cardápio | Ensina o mínimo de mesa **antes** da cena. `hanziMemoryTargets: ["菜"]`. Cena `pedir-cardapio`. Cultura `shared-dishes`. |
| `l26c` | **Imersão: almoce num restaurante** | Missão `isReview` + `curriculumRole: immersion`. Listening audio-first, contraste tonal 好×要, cena `imersao-restaurante`, 3 produções independentes. Cultura `chopsticks-rest`. |
| `l27` | Na loja | Delayed recall de 菜. Sem fechar pagamento digital. |

Planner (escopo estreito): review+imersão não comprime para packet-exchange; cena autoral ganha o primeiro slot; sem transfer/open production gerados que injetavam 苹果/睡觉.

## Cenas

| sceneId | status | papel |
|---------|--------|--------|
| `pedir-cardapio` | **reutilizada / refinada** | module_review em `l26b`: 几位 → 两位 → 请坐 → 我要菜单 → 我要米饭 → 茶 → produce 买单 |
| `revisao-restaurante` | **reutilizada / refinada** | revisão tardia; 我要这个 / chá / 好吃吗 / 买单. Sem 几位 (ainda não ensinado nesse ponto histórico da Jornada). |
| `imersao-restaurante` | **nova** | immersion ~12–18 turnos úteis; ramos 一位/两位 e 我要一杯茶/不要了 |

Speech acts novos (só os estruturais): `ask_party_size`, `tell_party_size`, `offer_menu`, `request_menu`, `ask_order`, `place_order`, `confirm_order`, `request_bill`, `get_attention`, `accept_offer`, `refuse_offer`, `praise_food`.

Repairs: `confirm_quantity` (两位吗？), `reask_order` (你要什么？), `confirm_bill` (买单？). Não é `请再说一遍` para tudo.

## Cultura

Nenhum CultureItem novo. Pesquisa da 4.9.6C cobre mesa (pratos no centro, hashis, insistência do anfitrião).

Touchpoints do arco:

- `l26` → `host-insistence` (oferta / recusa)
- `l26b` → `shared-dishes`
- `l26c` → `chopsticks-rest` (final da missão; não interrompe conversa, listening, produção, Hanzi ou tom)

Total da Jornada: **16** aulas com `cultureItemId` (15 da 4.9.6C + `l26c`; teto do gate: 16). `p7-imersao-mercado` mantém `shared-dishes`. `chopsticks-rest.relatedLessonIds` inclui `l26c`.

## Listening

Contrato do Player, sem Native Listening Engine:

- `listen_select` em `l26c`: áudio `请问几位？`, título **não** vaza o hànzì (“O que a pessoa quer saber?”), opções em PT
- `audio_discrimination` contextual: 请问几位？ × 你要茶吗？ (autoral, garantida no plano)
- `audio_same_different` **好** × **要** (prática da onda 1 no vocabulário do restaurante; replay A/B)
- TTS lento via `slowAudioText` (mesmo texto, ritmo menos artificial). Nunca só áudio acelerado
- M1 de `l26b`: `audio_to_action` da mesma pergunta (opções PT)
- O loop pós-conversa da missão **não** injeta `sound_contrast` aleatório (ex.: 生/省)

## Produção independente (missão)

Sem banco de palavras:

1. Pedir — `我要米饭` (aceita `我想吃米饭` / `我要饭`; frame `我要 + X`)
2. Recusar — `不要了`
3. Conta — `买单`

FreeAnswerField: hànzì / pinyin / fala (`evaluateLearnerResponse` aceita pinyin de 我要米饭, 不要了, 买单, 两位).

## Hànzì memory

CORE **菜**: introduzido em `l26b` (菜单 / 菜) → delayed recall `recognize("cai_dish")` em `l26c` e `l27` (loja/compras, ponte para 4.9.7B). Sem CORE forçado em 饭/水/买 nesta remessa.

## Tons integrados

Sem aula nova de tom. Microtouch em `l26c`: **好** (3º) × **要** (4º) como `audio_same_different` (vocabulário já usado no restaurante). `买`/`卖` fica para compras (4.9.7B). `TONE_INTEGRATION_LESSON_IDS` inclui `l26c`.

## Missão final

`l26c` *Almoce num restaurante*:

- responder ao funcionário (几位 + ramos)
- pedido produtivo
- um turno só pelo áudio
- pedir a conta
- erro não reinicia a missão (remediation existente / retry contextual da cena)

Não é uma fila de 10 múltiplas escolhas.

## Gates

Novos:

- `validate:china-survival-restaurant`
- `test:china-survival-restaurant` (10 mutações)

Preservados na cadeia `validate:beta`: routine-time, conversation-coherence, hanzi-memory-integration, tone-integration, culture-content, culture-distribution, conversation-scenes / pedagogy / loop / vocabulary-srs, teach-before-test (+ journey, 113), listening-affordance, modality-contract, production-transfer, exercise-depth --beta, lesson-novelty, i18n, journey-en, beta, build.

## Mutações (10/10)

| # | caso | código |
|---|------|--------|
| 1 | pedir / 几位 antes de ensinar | `TEACH_BEFORE_TEST` |
| 2 | remover produção independente do pedido | `CAPABILITY` |
| 3 | pedido vira multiple choice | `INDEPENDENT` |
| 4 | listen_select do garçom perde `audioText` | `NO_AUDIO` |
| 5 | vazamento do target no título auditivo | `TARGET_LEAK` |
| 6 | NPC não ecoa 米饭 | `BROKEN_CONTINUITY` |
| 7 | todo repair da cena principal vira 请再说一遍 | `GENERIC_REPAIR` |
| 8 | remover pedido da conta da missão | `CAPABILITY` |
| 9 | CultureItem aponta a lesson inexistente | `CULTURE` |
| 10 | CORE 菜 sem delayed recall | `DELAYED_RECALL` |

## QA humano

Passagem manual em `l26c` (player) e nas fixtures `/qa/conversation-scene`.

| Pergunta | Resultado |
|----------|-----------|
| Consigo entender o que fazer? | Sim — intro da missão, prompts situacionais, áudio com replay |
| Parece restaurante? | Sim — cena «Restaurante real», 几位 → menu → pedido → chá → 好吃吗 → 买单 |
| Estou usando chinês acumulado? | Sim — `我要 + X`, 服务员, 买单, 不要了 |
| Ou parece quiz solto? | A conversa segura o contexto; há reforço pós-conversa (monte a frase) |
| A conversa reage ao que respondi? | NPC ecoa `米饭，好。` / `茶，好。` / `这个，好。` |
| Se eu errar, o reparo faz sentido? | `我很好` em 几位 → `两位吗？` (não `请再说一遍`) |

Desktop: listening «O que a pessoa quer saber?» **não** vaza 请问几位 no título; opções em PT; botão Áudio lento. Produção da conta sem alternativas (`买单`). Viewport 390×844 (Chrome device mode): card da conversa e botão Responder cabem.

Erro na missão não recomeça do zero (remediation / retry da cena). O tester errou um par auditivo e um produce_reply; a UI ofereceu tentar de novo.

`validate:pedagogy-wave-one` exige 75% das lições com variante pedagógica. `l26c` entrou em `ALL_LESSONS` (128) sem variante e o piso subiu para 96; 95/128 falhava. Correção: `audio_same_different` autoral em `l26c` (好×要) + ensure no planner. Sem transfer/open production gerados.

`validate:beta` / `build`: a correr após esta correção. Rebase no SHA real do merge da #241 quando ela fechar.

## Não feito (de propósito)

- Compras completas / mercado / pagamentos digitais (V4.9.7B)
- AI Conversation, Pronunciation Score, Tone Analyzer, handwriting, Stories
- 30 comidas, 15 classificadores, gramática de measure words
- Duplicar l26/l26b/l27 em aulas novas de restaurante
- CultureItem novo sem lacuna de evidência
- `请给我菜单` (estrutura nova desnecessária)

## Pronto quando

1. Entrar num restaurante
2. Entender 几位
3. Pedir / ver o cardápio
4. Pedir comida e bebida
5. Quantidade básica quando necessário
6. Aceitar ou recusar
7. Reagir minimamente à comida
8. Pedir a conta
9. Parte relevante sem alternativas
10. Responder falando
11. Compreender uma fala só pelo áudio
12. Conversa coerente
13. Completar a Restaurant Mission
14. Um contexto cultural relevante
15. Recuperar hànzì previamente apresentado (菜)
16. Gates existentes verdes
