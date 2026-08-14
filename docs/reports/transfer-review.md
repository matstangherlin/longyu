# Transfer Reviews — checkpoints entre-módulos

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 7969e03a5eca78508c2de026a960876ea43ace8a |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-14T01:45:12.838Z |
| Lições | 127 |
| Hash da Jornada | 07da44be3a20 |


`TRANSFER_REVIEWS` (`src/data/masteryCoverage.ts`) mistura itens de várias
lições já migradas para testar transferência (não trivia de origem). Cada
checkpoint roda como revisão avulsa depois que suas lições pré-requisito
entram no Mastery Loop.

Total de checkpoints: **7**

## Revisao: contato e apresentacao (`foundation_transfer`)

Uma sequencia de mini-encontros: cumprimentar, agradecer, se despedir e se apresentar, tudo misturado.

Pré-requisitos: **8/8 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `l2` | migrated ✅ |
| `l3` | migrated ✅ |
| `l4` | migrated ✅ |
| `p1-ate-logo` | migrated ✅ |
| `l9` | migrated ✅ |
| `l9-qual-nome` | migrated ✅ |
| `l10` | migrated ✅ |
| `l11` | migrated ✅ |

Tarefas curadas: **5**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Alguem te ve pela primeira vez e diz 你好. Como voce responde? | `你好` | 你好 / 你好！ |
| 2 | 1 (Reconhecimento / contexto) | Ela pergunta 你好吗？ Qual resposta combina? | `我很好` | 我很好 / 我很好。 |
| 3 | 2 (Recuperação) | Ela te ajudou com as malas. Como voce agradece? | `谢谢` | 谢谢 / 谢谢！ |
| 4 | 3 (Produção) | Alguem pergunta seu nome. Qual frase inicia sua apresentacao? | `我叫` | 我叫 |
| 5 | 4 (Cenário misto) | Hora de ir. Como voce se despede? | `再见` | 再见 / 再见！ |

## Revisao: familia, comida e rotina (`daily_life_transfer`)

Um dia comum: apresentar a familia, pedir comida, falar da rotina e da saude.

Pré-requisitos: **8/8 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `l24` | migrated ✅ |
| `l25` | migrated ✅ |
| `l26` | migrated ✅ |
| `l26b` | migrated ✅ |
| `l27` | migrated ✅ |
| `p6-rotina-trabalho` | migrated ✅ |
| `p6-horarios` | migrated ✅ |
| `p6-saude` | migrated ✅ |

Tarefas curadas: **5**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Voce mostra uma foto e aponta para seu pai. O que voce diz? | `这是我爸爸` | 这是我爸爸 / 这是我爸爸。 |
| 2 | 2 (Recuperação) | No restaurante, voce quer agua. O que voce diz? | `我要水` | 我要水 / 我要水。 / 我想喝水 |
| 3 | 2 (Recuperação) | Voce acabou de acordar. Como voce diz isso? | `我起床` | 我起床 / 我起床。 |
| 4 | 3 (Produção) | Voce quer saber que horas sao. O que voce pergunta? | `现在几点？` | 现在几点？ / 现在几点 |
| 5 | 4 (Cenário misto) | Voce nao esta bem e quer avisar. Qual opcao combina melhor? | `我病了` | — |

## Revisao: cidades, ruas e direcoes (`city_transfer`)

Voce viaja de cidade em cidade: reconhecer o lugar, achar a rua e pedir informacao no caminho.

Pré-requisitos: **6/6 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `p6-china-cidades` | migrated ✅ |
| `p6-china-cidades-2` | migrated ✅ |
| `p6-china-ruas` | migrated ✅ |
| `p6-direcoes` | migrated ✅ |
| `p7-imersao-estacao` | migrated ✅ |
| `p7-imersao-mercado` | migrated ✅ |

Tarefas curadas: **5**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Voce quer saber onde fica a capital da China. O que pergunta? | `北京在哪里？` | 北京在哪里？ / 北京在哪里 |
| 2 | 2 (Recuperação) | Voce esta perdido numa rua e quer saber como chegar. O que pergunta? | `怎么走？` | 怎么走？ / 怎么走 |
| 3 | 2 (Recuperação) | O atendente pede para virar. Qual instrucao combina com virar para a esquerda? | `左转` | — |
| 4 | 3 (Produção) | Voce chegou de trem e precisa de um bilhete de volta. O que voce diz? | `我要票` | 我要票 / 我要票。 |
| 5 | 4 (Cenário misto) | Voce esta na Nanjing Road e quer confirmar que esta no lugar certo. O que voce diz? | `我在南京路` | 我在南京路 / 我在南京路。 |

## Revisao: comprar e negociar (`shopping_transfer`)

No mercado ou na loja: perguntar preco, escolher item, reclamar do preco e pagar.

Pré-requisitos: **4/4 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `l27` | migrated ✅ |
| `p6-compras` | migrated ✅ |
| `p6-survival-mandarin` | migrated ✅ |
| `p7-imersao-mercado` | migrated ✅ |

Tarefas curadas: **4**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Voce aponta para um produto e quer saber o preco. O que voce pergunta? | `多少钱？` | 多少钱？ / 多少钱 |
| 2 | 2 (Recuperação) | O preco esta bom e voce quer fechar a compra. O que voce diz? | `我要这个` | 我要这个 / 我要这个。 |
| 3 | 3 (Produção) | O vendedor disse um preco alto demais. Qual reacao combina? | `太贵了` | — |
| 4 | 4 (Cenário misto) | Voce quer saber se pode pagar com cartao. O que voce pergunta? | `可以刷卡吗？` | 可以刷卡吗？ / 可以刷卡吗 |

## Revisao: sobrevivencia comunicativa (`communication_survival_transfer`)

Voce precisa se virar: pedir para repetir, dizer que nao fala chines, pedir ajuda e achar o hotel.

Pré-requisitos: **5/5 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `p3-qing-zai-shuo-yibian` | migrated ✅ |
| `p3-wobuhui-shuo-zhongwen` | migrated ✅ |
| `p6-survival-mandarin` | migrated ✅ |
| `p6-direcoes` | migrated ✅ |
| `p6-china-ruas` | migrated ✅ |

Tarefas curadas: **4**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Voce nao entendeu. Qual pedido de repeticao combina? | `请再说一遍` | 请再说一遍 / 请再说一遍。 |
| 2 | 2 (Recuperação) | Voce precisa avisar que nao fala chines. O que diz? | `我不会说中文` | 我不会说中文 / 我不会说中文。 |
| 3 | 3 (Produção) | Voce precisa de ajuda. O que diz? | `我需要帮助` | 我需要帮助 / 我需要帮助。 / 我需要帮忙 |
| 4 | 4 (Cenário misto) | No lobby, voce pergunta onde fica o hotel/quarto. Qual pergunta combina? | `酒店在哪里？` | 酒店在哪里？ / 酒店在哪里 / 宾馆在哪里？ |

## Revisao: saude no dia a dia (`health_daily_transfer`)

Saude + rotina + horario + clima misturados num dia real.

Pré-requisitos: **4/4 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `p6-saude` | migrated ✅ |
| `p6-rotina-trabalho` | migrated ✅ |
| `p6-horarios` | migrated ✅ |
| `p6-clima` | migrated ✅ |

Tarefas curadas: **4**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Voce esta com dor de cabeca. O que diz? | `我头疼` | 我头疼 / 我头疼。 |
| 2 | 2 (Recuperação) | Voce quer dizer que acordou. O que diz? | `我起床` | 我起床 / 我起床。 |
| 3 | 3 (Produção) | Pergunte que horas sao agora. | `现在几点？` | 现在几点？ / 现在几点 |
| 4 | 4 (Cenário misto) | Esta frio e voce nao se sente bem. Qual comentario de clima combina? | `天气很冷` | 天气很冷 / 天气很冷。 / 今天很冷 |

## Revisao: estruturas intermediarias (`intermediate_transfer`)

Numeros, pronomes, amigos e microtextos misturados sem rotulo de origem.

Pré-requisitos: **7/7 migrados** ✅ (checkpoint pronto)

| Pré-requisito | Estado |
|---------------|--------|
| `l19` | migrated ✅ |
| `l20` | migrated ✅ |
| `l21` | migrated ✅ |
| `l22` | migrated ✅ |
| `l23` | migrated ✅ |
| `l29` | migrated ✅ |
| `l30` | migrated ✅ |

Tarefas curadas: **4**

| # | Nível | Situação | Resposta | Accepts |
|---|------:|----------|----------|---------|
| 1 | 1 (Reconhecimento / contexto) | Qual numero e tres? | `三` | 三 |
| 2 | 2 (Recuperação) | Como se diz 'nos'? | `我们` | 我们 |
| 3 | 3 (Produção) | Diga que gosta de chines. | `我喜欢中文` | 我喜欢中文 / 我喜欢中文。 |
| 4 | 4 (Cenário misto) | Voce quer convidar os amigos a sair. O que diz? | `我们走吧` | 我们走吧 / 我们走吧。 |

<!-- integridade:39064f00f32d28e9 -->
