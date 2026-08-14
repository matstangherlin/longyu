# Transfer Reviews — checkpoints entre-módulos

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | e83bdffa79cff5ce85219b66f122f1cd51d01536 |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-08-14T00:26:02.114Z |
| Lições | 127 |
| Hash da Jornada | f4250a774515 |


`TRANSFER_REVIEWS` (`src/data/masteryCoverage.ts`) mistura itens de várias
lições já migradas para testar transferência (não trivia de origem). Cada
checkpoint roda como revisão avulsa depois que suas lições pré-requisito
entram no Mastery Loop.

Total de checkpoints: **4**

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

| # | Situação | Resposta esperada |
|---|----------|--------------------|
| 1 | Alguem te ve pela primeira vez e diz 你好. Como voce responde? | `你好` |
| 2 | Ela pergunta 你好吗？ Diga que voce esta bem. | `我很好` |
| 3 | Ela te ajudou com as malas. Como voce agradece? | `谢谢` |
| 4 | Alguem pergunta seu nome. Qual frase inicia sua apresentacao? | `我叫` |
| 5 | Hora de ir. Como voce se despede? | `再见` |

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

| # | Situação | Resposta esperada |
|---|----------|--------------------|
| 1 | Voce mostra uma foto e aponta para seu pai. O que voce diz? | `这是我爸爸` |
| 2 | No restaurante, voce quer agua. O que voce diz? | `我要水` |
| 3 | Voce acabou de acordar. Como voce diz isso? | `我起床` |
| 4 | Voce quer saber que horas sao. O que voce pergunta? | `现在几点？` |
| 5 | Voce nao esta bem e quer avisar. Qual opcao combina melhor? | `我病了` |

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

| # | Situação | Resposta esperada |
|---|----------|--------------------|
| 1 | Voce quer saber onde fica a capital da China. O que pergunta? | `北京在哪里？` |
| 2 | Voce esta perdido numa rua e quer saber como chegar. O que pergunta? | `怎么走？` |
| 3 | O atendente pede para virar. Qual instrucao combina com virar para a esquerda? | `左转` |
| 4 | Voce chegou de trem e precisa de um bilhete de volta. O que voce diz? | `我要票` |
| 5 | Voce esta na Nanjing Road e quer confirmar que esta no lugar certo. O que voce diz? | `我在南京路` |

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

| # | Situação | Resposta esperada |
|---|----------|--------------------|
| 1 | Voce aponta para um produto e quer saber o preco. O que voce pergunta? | `多少钱？` |
| 2 | O preco esta bom e voce quer fechar a compra. O que voce diz? | `我要这个` |
| 3 | O vendedor disse um preco alto demais. Qual reacao combina? | `太贵了` |
| 4 | Voce quer saber se pode pagar com cartao. O que voce pergunta? | `可以刷卡吗？` |

<!-- integridade:b674ae90213a765b -->
