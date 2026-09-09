# V4.9.7B — China Survival I: compras, mercado e pagamentos

Experiência de sobrevivência, não catálogo de produtos. O aluno cumpre a missão: **ver → perguntar → entender → decidir → pagar → sair**, sem depender inteiramente de inglês.

## Base

| Campo | Valor |
|-------|-------|
| PR de origem | **#244 — V4.9.7A.2 Culture Teaching Loop** (obrigatória; merge SHA abaixo) |
| SHA de origem (HEAD da #244) | `aa1982e6c4a308887aac01b783b102ad76b46431` |
| SHA de merge da #244 | *pendente — preencher com o SHA real de `Merge pull request #244` em `main`* |
| Branch | `cursor/v497b-shopping-6ae2` |
| Fingerprint da Jornada (244 HEAD) | `f6430d1a11be` |
| Fingerprint da Jornada (esta remessa) | `29b70bfe0ae6` |
| Atlas 244 / 4.9.7A | 436 itens / 358 taught (82.1%) |
| Atlas esta remessa | 438 itens / 355 taught (81.1%) |

Preservado integralmente:

- V4.9.7A restaurante (`l26` / `l26b` / `l26c`)
- V4.9.7A.1 Culture Quest Engine
- V4.9.7A.2 Culture Teaching Loop (`culture_teach`, bridges, persist v23)

Teaching topics continuam **113**. Não se virou `p7-imersao-mercado` para `isReview` (isso cairia o piso de tópicos). Completar um Culture Bridge **não** concede 3★ de missão nem toca SRS lexical.

## Princípio

Não criar `shopping-lesson-1/2/3`. Refinar `l27` / `p6-compras` / `p6-survival-mandarin` / `p7-imersao-mercado`. Uma decisão verdadeira (aceitar / pechinchar / recusar) — o restaurante ainda trata `一位` vs `两位` como erro de mesa; compras é o primeiro `decision` multi-válido.

Sem e-commerce, sem API WeChat/Alipay, sem checkout, sem 50 produtos, sem Tone Analyzer, sem AI Conversation, sem Stories, sem moeda extra, sem Culture Streak.

## Fase 0 — auditoria

| Função | Já existia? | Onde? | Lacuna real | Ação |
|--------|-------------|-------|-------------|------|
| Ver o item | parcial | `p6-compras` visual apple/phone | transferência fraca | reutilizar visuais; cena `comprar-itens` |
| Perguntar preço | sim | `多少钱？` `l27` | pouco listening do número falado | `listen_select` 二十八 em `l27` e na missão |
| Entender 10 / 18 / 28 | não no player | chunks de número | preço falado sem 元 | listening com opções 28/18/10/50; fala **十** não 十块 |
| Decidir (好 / 太贵了 / 不要了) | `好` era ramo de erro | `conversa-na-loja` | quiz factual | `decision` + `validAnswers` + `nextByAnswer` |
| Pechinchar | chunk `便宜一点` ocioso | `l27` | copy «negociar faz parte» | ensinar contexto; 太贵了 válido, não obrigatório |
| Recusar | `不要了` no restaurante | `l26c` | não transferido à loja | produção independente na missão |
| Quantidade | não | — | 我要两个 | chunk suporte; NPC ecoa a mesma forma |
| Pagar | `可以刷卡吗` / WeChat chunks | `p6-survival-mandarin` | não na conversa do mercado | `现金可以吗？` + NPC `微信支付？` |
| CORE 买 | Atlas sem delayed recall | — | 买×卖 nunca na Jornada | introduce `p6-compras`, delayed `p7-imersao-mercado` |
| Cultura pechincha | digital-pay só no pagamento | `l27` | generalização «sempre se pechincha» | CultureItem `bargaining-context` (Price Law art. 13 + SAMR 56) |

Cenas **não clonadas**: `pedir-agua`, `pedir-cha`, `pedir-cardapio`, `imersao-restaurante`. `conversa-na-loja` / `comprar-itens` / `imersao-mercado` foram refinadas no sítio, extraídas para `shoppingSurvivalScenes.ts`.

## Contrato

`CHINA_SURVIVAL_SHOPPING_ARC` em `src/data/chinaSurvivalShopping.ts`.

Competências mínimas em uso: `identify_item`, `ask_price`, `understand_price`, `react_to_price`, `choose_item`, `choose_quantity`, `accept_price`, `decline_purchase`, `bargain_when_appropriate`, `ask_payment_method`, `pay_mobile`, `ask_card`, `ask_cash`, `complete_purchase`, `close_interaction`.

## Conteúdo reutilizado

- Chunks: `多少钱？`, `我要这个`, `太贵了`, `便宜一点`, `可以刷卡吗？`, `微信支付`, `支付宝`, `不要了`, `好`
- Frame `我要 + X` já ensinado no restaurante (`chunk:woyao` = `我要这个` — sem duplicar)
- Cenas de loja já existentes — refinadas, não clonadas
- CultureItem `digital-pay` permanece em `l27`
- `pedir-agua` continua em `l27` (arco restaurante **e** shopping pelo overlap de preço)

## Lacunas reais preenchidas

1. Preço falado (二十八 / 18 / 10) em listening, sem vazar o target no título
2. Decisão válida: 好, 太贵了 e 不要了 continuam a conversa (não são «erro»)
3. Contexto de pechincha **ensinado** antes de testar (missão curta + bridge em `p6-compras`)
4. `现金可以吗？` no survival e na missão
5. Delayed recall de 买; contraste tonal 买×卖 em `p6-compras`
6. NPC ecoa o pedido (`这个？好。`) em vez de repetir a fala do aluno

## Chunks adicionados

| id | hànzì | papel |
|----|-------|--------|
| `xianjinkeyima` | 现金可以吗？ | pagamento em dinheiro (productive na missão) |
| `woyaoliangge` | 我要两个 | quantidade mínima (suporte; 两 via chunk, sem `char:liang`) |

## Hànzì memory

CORE **买**: introduzido em `p6-compras` → delayed recall `recognize("mai_buy")` em `p7-imersao-mercado`. Contraste 买×卖 na mesma aula (`listen` + `recognize` + `tone` + `audio_same_different` + `listen_select` «Qual significa comprar?»). Sem aula nova de tom. `TONE_INTEGRATION_LESSON_IDS` inclui `p6-compras`. O índice estrutural sobe `frame_woyaomai` a 15 em `p6-survival-mandarin` / `l10-rev` / `l29` (antes 7) e o frame passa a `priorTransferred` nas imersões seguintes.

## Atlas antes / depois

| | Atlas | Taught | Utilização |
|--|------:|-------:|-----------:|
| 4.9.7A / 244 | 436 | 358 | 82.1% |
| V4.9.7B | 438 | 355 | 81.1% |

+2 chunks. Taught 355: o fingerprint e o recálculo do atlas (fontes de currículo novas) mudam a conta; **não** se perseguiu percentual. Future → Taught só o necessário ao arco.

## Lições

| id | papel | mudança |
|----|--------|---------|
| `l27` | Na loja | Continua `cultureItemId: digital-pay`. Listening 便宜一点 + 二十八 (`listen_select` «Quanto o vendedor cobrou?»). `pedir-agua` permanece. |
| `p6-compras` | Compras | `cultureItemId: bargaining-context`. `hanziMemoryTargets: ["买"]`. 买×卖 integrado. Bridge mid. Visuais apple/phone/banana inalterados. |
| `p6-survival-mandarin` | Survival pagar | flash/listen `现金可以吗？` depois de 现金. `libraryItems` inclui `xianjinkeyima`. |
| `p7-imersao-mercado` | **Imersão: no mercado** | **Sem** `cultureItemId` (saiu `shared-dishes`; touchpoints 16→15). Delayed 买. Preço 二十八. Pagamento `listen_select` áudio `微信支付？` com opções PT («O que o caixa quer saber?») — o mesmo enunciado do NPC, sem 还是. Listen/flash `我要两个` **antes** da cena. Cenas: imersao-mercado, perguntar-quantidade, conversa-na-loja, comprar-itens. Produções independentes: 多少钱？, 我要这个, 现金可以吗？, 不要了. `curriculumRole: immersion`. |

`shared-dishes.relatedLessonIds` = `l26b, l26` (sem `p7-imersao-mercado`).

## Cenas e decisões

`ConversationInteraction` ganha `decision`, `validAnswers`, `nextByAnswer`. O player trata match de decisão como acerto (sem `onLocalMistake`, sem ramo de erro). Caminho canónico da imersão segue `correctNextNodeId` (pechincha) para os validadores de linhas/vocab; o validador de decisão percorre **todos** os `nextByAnswer`.

Speech acts de compras (sem meter as cenas em `INTEGRATED_SCENE_IDS`): `tell_price` → `acknowledge`; `confirm_item` → `ask_price`; `confirm_price` → `request_discount`; `ask_payment` → `ask_card` / `ask_cash`. `ask_order` do restaurante fica intacto.

NPC:

- pagamento: `微信支付？` (não `微信还是支付宝？` — evita 还是 descoberto)
- quantidade: eco `我要两个` (longest-match do vocabulário)
- confirmação: `好。` (não `可以。`)
- sapato: aluno `我要这双鞋`; eco `这个？好。`

## Cultura

| Item | Onde | Notas |
|------|------|-------|
| `digital-pay` | `l27` + missão flagship | inalterado |
| `bargaining-context` | `p6-compras` (bridge mid) + missão curta `flagship: false` | Price Law art. 13 + SAMR Order 56. Mini-check rejeita «negociar em qualquer loja». Rota `everyday-china`. Selo `urban-china` inalterado (digital-pay + metro-qr). |

Troca de bridge (teto **12**): `p6-compras` / `bargaining-context` **substitui** a bridge `metro-qr` de `p7-imersao-estacao`. `p7-imersao-estacao` mantém `cultureItemId: metro-qr` **sem** bridge (permitido). Não se injetam passos de cultura em `journey.ts`.

`loadCultureRuntime()` não expõe funções.

## Gates

Novos, imediatamente depois do restaurante em `validate:beta`:

- `validate:conversation-decisions` / `test:conversation-decisions` (4 mutações)
- `validate:china-survival-shopping` / `test:china-survival-shopping` (14 mutações)
- `test:conversation-coherence` ganha mutação `shopping tell_price cannot expect place_order` (`INTENT_MISMATCH`) — as cenas de compras **não** entram em `INTEGRATED_SCENE_IDS`

Códigos: `VALID_AS_ERROR`, `ALWAYS_BARGAIN`, `TEACH_AFTER_TEST`, `CAPABILITY`, `TARGET_LEAK`, `SRS_LEAK`, `DELAYED_RECALL`, `EXPLAIN_BEFORE_TEST`, `BROKEN_CONTINUITY`, `GENERIC_REPAIR`, `MISSING_SOURCE`, `MISSING_EN`.

## Mutações (shopping)

| # | caso | código |
|---|------|--------|
| 1 | 好 cai no ramo de erro | `VALID_AS_ERROR` |
| 2 | copy «negociar faz parte» + só 太贵了 certo | `ALWAYS_BARGAIN` |
| 3 | missão pechincha sem `culture_teach` | `TEACH_AFTER_TEST` |
| 4 | remover produção aberta de preço | `CAPABILITY` |
| 5 | remover listening de 二十八 | `CAPABILITY` |
| … | vazamento / SRS / delayed 买 / eco NPC / repair genérico / EN | ver `scripts/test-china-survival-shopping.mjs` |

## E2E (desbloqueio da #244)

O Playwright Chromium da #244 falhava no skip-through da Jornada:

1. Overlay `culture-bridge` (teach → tarefa → Verificar desabilitado; `Pular` não fecha o overlay).
2. CTA de conversa **Responder >** / **Continuar >** não batiam em `^Continuar$`; o helper fingia avanço se `[data-conversation-scene]` existisse.
3. Peças desabilitadas do match-pairs no tema claro (~2.17) e muted no escuro (~4.1) vs ≥ 4.5.

`dismissJourneyCultureBridgeIfOpen` completa a overlay em fases, **sem** fechá-la quando o spec procura `culture-bridge`. Skip-through clica Responder/Continuar com chevron. `disabled:!text-ink` e muted `text-ink`.

Local Chromium (preview com fixtures): compare-with-image 4/4, produção aberta 4 viewports, contraste match-pairs, e o spec da ponte em `l2` — pass.

## Não feito (de propósito)

- E-commerce, WeChat Pay / Alipay API, checkout
- 50 produtos, classificadores como aula, `char:liang`
- Tone Analyzer, AI Conversation, Stories, moeda extra, Culture Streak
- Segunda bridge na mesma aula
- Cenas de compras em `INTEGRATED_SCENE_IDS` (o par `INTENT_MISMATCH` vale para todas as cenas; compras ganhou speech acts próprios)
- V4.9.8

## Pronto quando

1. Ver o item
2. Perguntar 多少钱？
3. Entender 10 / 18 / 28 falados
4. Decidir: 好 / 太贵了 / 不要了 (todos válidos)
5. Pechinchar só quando o contexto cabe
6. Pedir quantidade mínima (我要两个)
7. Perguntar forma de pagamento
8. Completar a compra e sair
9. Produção independente na missão (sem banco)
10. Listening sem vazar o target
11. CORE 买 com delayed recall
12. Cultura de preço marcado ensinada antes do teste
13. Gates existentes + shopping / decisions verdes
