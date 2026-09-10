# V4.9.8B — China Survival II: hotel + airport

Fecha V4.9.8: **chegar ao hotel → check-in → necessidades básicas**, depois **dentro do aeroporto → documento → portão → ouvir → reparar → embarcar**.

Objetivo do aluno: *Consigo atravessar um check-in simples de hotel e uma situação básica de aeroporto em mandarim.*

## Base

| Campo | Valor |
|-------|-------|
| SHA obrigatória (`main` após #248) | `32dbf07fc57a6ba680f0282207bfa1ee2117bf37` |
| #248 fechou | Culture playability, Culture Story Audio, Native Culture Lessons, Culture Rewards, Live Leagues hardening |
| Esta PR | **não** reabre esses sistemas |
| Branch | `cursor/v498b-hotel-airport-6ae2` |
| Fingerprint da Jornada (esta remessa) | `465390e64799` |

V4.9.8A permanece: perguntar → navegar → pegar transporte → chegar. Esta remessa não mistura achar o aeroporto **na rua** com check-in **dentro** do aeroporto.

## Princípio

Não criar unidades «HOTEL — 30 palavras» / «AEROPORTO — 40 palavras». Capacidades. Auditar. Reusar. RECALL / TRANSFER se já adquirido.

## Fase 0 — auditoria (em `32dbf07`)

Inventário já existente (não reensinado como novo): `前台` `酒店` `我有预订` `预订` `护照` `这是我的护照` `房间` `我的房间在哪里？` `房卡` `一晚` `两晚` `行李` `洗手间` `有Wi-Fi吗？` `我需要帮助` `机场` `飞机` `登机口在哪里？` `航班` `入口` `出口`.

`我的航班在哪里？` classificado **AWKWARD** — permanece no Atlas como suporte; produção usa `登机口` / `登机口在哪里？`.

`机场在哪里？` fica em **mobilidade** (`p6-china-cidades-2`). Dentro do aeroporto é 8B.

### Matriz de capacidades

| CAPACIDADE | JÁ EXISTE? | TEACH? | LISTENING? | PRODUÇÃO? | CONVERSA? | HÀNZÌ? | CULTURA? | LACUNA? | AÇÃO |
|---|---|---|---|---|---|---|---|---|---|
| find_reception | `前台` visual/sign | survival | — | — | fraca | 前台 | — | papel de recepção | REFINAR sign + setting `hotel` |
| state_reservation | `我有预订` flash | survival | listen | escolha | contrato bug | 预订 | — | teach-before-test ok; produção fraca | RECALL + produção livre |
| show_passport | `这是我的护照` | survival + cidades-2 | — | escolha | aceite falso na reserva | 护照 | registro legal | misturado com reserva | TRANSFER; ordem natural |
| understand_room_number | NPC `你的房间是305` | leak 305 | texto, não áudio | — | sim | — | — | listening | ADQUIRIR `三零五` como RECALL de números |
| ask_room_location | `我的房间在哪里？` | survival | — | escolha | sim | 房间 | — | produção | RECALL + free production |
| understand_nights | `一晚` `两晚` flash | flash only | — | — | não | 晚 | — | 几晚 | ADQUIRIR `住几晚？` (transfer 几) |
| recognize_room_card | imagem `hotel_key_card` | visual | — | — | não | 房卡 | — | imagem decorativa | REFINAR tarefa funcional |
| ask_wifi | `有Wi-Fi吗？` | survival | — | escolha | Wang agradece Wi-Fi | — | — | papel | RECALL em decisão |
| ask_bathroom | `洗手间在哪里？` | survival | — | escolha | — | — | — | — | RECALL em decisão |
| ask_for_help | `我需要帮助` | survival | — | reverse | — | — | — | — | NÃO TOCAR (já há) |
| resolve_simple_problem | repairs genéricos | `请再说一遍` | — | — | GENERIC_REPAIR | — | — | repair contextual | REFINAR |
| close_checkin | `谢谢` | sim | — | — | — | — | — | — | RECALL |
| identify_airport | `机场` visual | cidades-2 | — | — | rua | — | — | misturado com rua | TRANSFER; cena interior |
| find_gate | `登机口在哪里？` | Atlas | — | escolha | staff pergunta o portão | 口 | — | placa + listening | ADQUIRIR `登机口`; staff informa |
| understand_gate_number | — | — | — | — | — | 号 | — | áudio | ADQUIRIR listening `十八号登机口` |
| understand_basic_direction | `一直走` mobility | 8A | sim | — | — | — | — | — | TRANSFER |
| recognize_luggage | `行李` visual | survival | image | — | — | — | — | — | RECALL visual, sem peso/esteira |
| show_passport (airport) | mesmo chunk | hotel | — | — | — | — | — | reensino | TRANSFER |
| repair airport | `请再说一遍` `请慢一点` | 8A | — | — | um ramo | — | — | NPC não muda | REFINAR decisão |
| culture hotel | — | — | — | — | — | — | ausente | registro legal art. 39 | CRIAR `hotel-checkin-register` |
| culture airport | procedimento mundial | — | — | — | — | — | — | não é cultura chinesa | NÃO TOCAR (fica na aula funcional) |

### Bugs de naturalidade / contrato (antes)

`checkin-hotel`:

| Nó | WHO | WHY | NEXT | Veredito |
|---|---|---|---|---|
| prompt duas respostas / `correctAnswer` só reserva | aluno | UI mente | passaporte = wrong | **ANSWER_CONTRACT_BUG** |
| setting `shop` + PAIR_LIN_WANG | amigos | não é recepção | — | **ROLE_CONFUSION** |
| `你的房间是305` no texto | NPC | leak do alvo | — | listening leak |
| «O que Matheus perguntou?» | conteúdo | nome hardcoded | — | **ANSWER_CONTRACT_BUG** |
| repairs todos `请再说一遍` | NPC | genérico | — | **GENERIC_REPAIR** |
| Wang `有。谢谢！` no Wi-Fi | staff agradece | papel invertido | — | **UNNATURAL** |

`no-aeroporto`:

| Nó | Veredito |
|---|---|
| começa `机场在哪里？` depois passaporte | **CONTEXT_JUMP** (rua → check-in) |
| setting `street` | **WRONG_CONTEXT** |
| funcionário pergunta onde fica o portão | **ROLE_CONFUSION** |
| repairs genéricos | **GENERIC_REPAIR** |

## Conteúdo reutilizado

Chunks: `qiantai` `woyouyuding` `zheshiwodehuzhao` `qinggeiwodehuzhao` `wodefangjianzainali` `yiwan` `liangwan` `youwifima` `xishoujianzainali` `woxuyaobangzhu` `huzhao` `fangjian` `fangka` `xingli` `dengjikouzainali` `jichangzainali` `chuko` `ruko` `yizhizou` `qingzaishuoyibian` `qingmanyidian` `xiexie`.

Motores: `sign_reading` `image_choice` `listen_select` `free_production` `conversation` V2 (`decision` / `validAnswers` / `nextByAnswer` / `produce_reply` / `listen_reply`).

几: transferência `几点` → `几位` → `几晚`. Números 205 / 305 / 508 e 8 / 10 / 18 / 28 como RECALL.

## Conteúdo realmente novo

Três chunks justificados (não 20):

| id | hànzì | papel |
|---|---|---|
| `zhujiwan` | 住几晚？ | teach-before-test de noites |
| `sanlingwu` | 三零五 | room number falado (零 no chunk, sem Character novo) |
| `dengjikou` | 登机口 | placa; `dengjikouzainali` productiveAt → `p7-imersao-aeroporto` |

Chars novos: **nenhum**.

CultureItem novo: `hotel-checkin-register` (Lei de Administração de Saída e Entrada, art. 39). Sem CultureItem de aeroporto.

Lições novas (imersão / review): `p7-imersao-hotel`, `p7-imersao-aeroporto`, `p7-imersao-viagem`.

Settings novos: `hotel`, `airport`. Papéis: Viajante / Recepcionista; Viajante / Funcionário.

## Arcos

- `CHINA_SURVIVAL_HOTEL_ARC` — `p6-survival-mandarin` + `p7-imersao-hotel` + `checkin-hotel`
- `CHINA_SURVIVAL_AIRPORT_ARC` — `p6-china-cidades-2` + `p7-imersao-aeroporto` + `no-aeroporto`
- `CHINA_SURVIVAL_TRAVEL_ARC` — transferência `p7-imersao-viagem` (hotel → transporte → aeroporto, sem vocabulário novo)

## Cenas antes / depois

### `checkin-hotel`

Antes: loja, Lin/Wang, uma resposta obrigatória apesar do prompt duplo, 305 no texto, Matheus, Wi-Fi invertido.

Depois (fluxo natural P2.2 / P3):

1. 你好。
2. 有预订吗？ → produzir `我有预订` (reparo `预订？`) — passaporte **não** é sinônimo.
3. 请给我护照。 → `这是我的护照` (reparo `护照？`)
4. 住几晚？ → `两晚` (reparo `两晚吗？`)
5. NPC `三零五。` + `listenAudioText` — opções 205/305/508 **depois** do áudio
6. 这是房卡。 → significado
7. produzir `我的房间在哪里？`
8. decisão `有Wi-Fi吗？` / `洗手间在哪里？` (as duas válidas)
9. 谢谢

### `no-aeroporto`

Antes: rua, achar aeroporto, staff pergunta o portão.

Depois (já no aeroporto):

1. 你好。 / 护照。 → `这是我的护照` (TRANSFER do hotel)
2. aluno: `登机口在哪里？` (staff **não** pergunta isso)
3. 十八号登机口 — decisão `请再说一遍` / `请慢一点` com ramos **diferentes**
4. listening 8/10/18/28
5. placa 登机口 vs 出口
6. 一直走。在那里。
7. 谢谢 / `我需要帮助`

## Listening / speaking / production

Hotel: áudio `三零五`; produções independentes `我有预订` e `我的房间在哪里？` (hànzì / pinyin / fala).

Airport: áudio `十八号登机口` e `一直走`; produções documento, portão, `请再说一遍`|`请慢一点`.

`listen_reply` fala `listenAudioText`, não o algarismo 305/18.

## Hànzì / tom

Forma → significado → uso → delayed recall. Sem aula isolada de 护/照/房/机. `口` já tem histórico. Sem par tonal ornamental. 几 em 几晚 é transferência lexical, não aula de tom.

## Cultura

Somente hotel, com fonte:

- https://www.nia.gov.cn/n741440/n741547/c757592/content.html
- https://english.www.gov.cn/services/visitchina/202603/21/content_WS69ce124cc6d00ca5f9a0a368.html

Padrão nativo: TEACH → história com áudio (`你好。` / `请给我护照。`) → match/fill/choice → mesmo LessonPlayer, mesmo XP, mesmo progresso Hub/Jornada. Flagship story-audio do #248 preservado.

Aeroporto internacional **não** entra no Culture Hub.

## Economia / ligas

XP padrão. Sem Travel Coins. First completion normal; perfect bônus padrão; replay sem duplicação. Liga: pipeline existente (`claimReward` → weekly XP). Arquitetura de ranking **não** reaberta.

## PT / EN

Instruções, papéis, settings, prompts, Culture Lesson e feedback nascem PT-BR + EN. Mandarim canônico. Sem «Matheus» em conteúdo genérico.

## Gates novos

- `validate:china-survival-hotel` / `test:china-survival-hotel`
- `validate:china-survival-airport` / `test:china-survival-airport`
- `validate:travel-conversation-naturalness` / `test:travel-conversation-naturalness`
- `validate:china-survival-travel` (alias da naturalness)

Mutações 1–12 e 20 cobertas pelos testes novos. 13–18 pelos gates de cultura/liga/affordance já existentes. 19 = orçamento cognitivo (3 chunks).

## E2E

`e2e/v498b-hotel-airport.spec.ts`: hotel (cultura + conversa de reserva), aeroporto já interior, transferência, cultura nativa + Hub 1/20, replay +0 XP, 390×844.

## Gates / build

| Gate | Resultado |
|---|---|
| `validate:beta` | PASS |
| Fingerprint | `465390e64799` |
| `validate:china-survival-hotel` + mutações 1–6 | PASS |
| `validate:china-survival-airport` + mutações 7–10 | PASS |
| `validate:travel-conversation-naturalness` + mutações 11–12 e 20 | PASS |
| `validate:production-transfer` | PASS (produção aberta com 3 variantes) |
| `validate:culture-*` / story-audio / playability / native / rewards | PASS (sem reabrir arquitetura) |
| `validate:live-league` | PASS (XP segue pipeline; ranking não reaberto) |
| `npm run build` | PASS |
| `e2e/v498b-hotel-airport.spec.ts` | 8 passed (chromium, incl. 390×844) |

## Não feito (de propósito)

V4.9.9; reservas reais; mapa de aeroporto; companhia aérea; QR; OCR de passaporte; scanner de bagagem; imigração; catálogo de amenidades; Airport Noise Engine; Culture Player; moeda nova; reabrir Ligas; AI Conversation; Pronunciation Score; Tone Analyzer; Story Mode completo.
