# Relatório de cobertura de cenas de conversa

## Procedência

| Campo | Valor |
|-------|-------|
| Commit | 8bb7bd7d00fcaf8168bb781062d1f07565dd574a |
| Versão do app | 0.2.0-beta.1 |
| Gerado em | 2026-07-21T06:53:26.979Z |
| Lições | 108 |
| Hash da Jornada | ead22051a61c |

## Resumo

| Indicador | Valor |
|-----------|------:|
| Cenas no catálogo | 33 |
| Cenas V2 (nós/ramificação) | 33 |
| Cenas V1 autorais (sem nós) | 0 |
| Fallback V1 derivado (lines/checkpoint) | 33 |
| Intenções distintas | 33 |
| Passos autorais na jornada | 35 |
| Lições com cena gerada no plano | 94 |
| Cenas geradas distintas | 19 |
| Cenas nunca usadas (autoral ou plano) | 0 |
| Rotação sob contexto (anti "primeira cena") | OK |

## Cenas por papel

| Papel | Cenas |
|-------|------:|
| common | 26 |
| module_review | 4 |
| immersion | 3 |

## Cenas por cenário

| Cenário | Cenas |
|---------|------:|
| school | 3 |
| park | 5 |
| shop | 8 |
| street | 8 |
| classroom | 5 |
| home | 4 |

## Catálogo

| Cena | Papel | Intenção | Falas | Intervenções | Ramificada | Conclusões | Uso autoral | Uso gerado |
|------|-------|----------|------:|-------------:|-----------:|-----------:|------------:|-----------:|
| primeiro-cumprimento | common | greet | 7 | 2 | sim | 1 | 2 | 3 |
| perguntando-se-esta-bem | common | ask-wellbeing | 6 | 2 | sim | 1 | 3 | 6 |
| agradecendo | common | thank | 6 | 2 | sim | 1 | 3 | 3 |
| despedida | common | farewell | 6 | 2 | sim | 1 | 1 | 1 |
| me-apresentando | common | introduce-self | 6 | 2 | sim | 1 | 1 | 3 |
| revisao-cumprimento-completo | common | greet-review | 9 | 3 | sim | 1 | 2 | 8 |
| pedir-repeticao | common | ask-repeat | 7 | 2 | sim | 1 | 1 | 3 |
| cortesia-loja | common | polite-question | 7 | 2 | sim | 1 | 1 | 8 |
| de-onde-sou | common | ask-origin | 6 | 2 | sim | 1 | 1 | 0 |
| nao-entendi-reparo | common | repair-not-understood | 8 | 3 | sim | 1 | 1 | 0 |
| nao-falo-chinês | common | cannot-speak | 6 | 2 | sim | 1 | 1 | 9 |
| como-se-chama | common | ask-name | 6 | 2 | sim | 1 | 1 | 7 |
| pedir-agua | common | ask-water | 8 | 3 | sim | 1 | 1 | 6 |
| pedir-cha | common | ask-tea | 7 | 2 | sim | 1 | 1 | 0 |
| perguntar-quantidade | common | ask-quantity | 8 | 3 | sim | 1 | 1 | 1 |
| identificar-pessoa | common | identify-person | 6 | 2 | sim | 1 | 1 | 0 |
| encontrar-amigo | common | meet-friend | 6 | 2 | sim | 1 | 1 | 0 |
| onde-esta | common | ask-where | 8 | 2 | sim | 1 | 1 | 0 |
| apontar-natureza | common | point-nature | 7 | 3 | sim | 1 | 1 | 1 |
| sala-de-aula | common | classroom-intro | 7 | 2 | sim | 1 | 0 | 6 |
| pedir-ajuda | common | ask-help | 7 | 2 | sim | 1 | 1 | 0 |
| fale-de-novo | common | ask-slow-repeat | 7 | 3 | sim | 1 | 0 | 6 |
| encontro-amanha | common | plan-tomorrow | 6 | 2 | sim | 1 | 0 | 12 |
| o-que-e-isto | common | ask-what-object | 7 | 2 | sim | 1 | 1 | 0 |
| conversa-em-casa | common | home-chat | 6 | 2 | sim | 1 | 0 | 9 |
| conversa-na-loja | common | shop-chat | 8 | 3 | sim | 1 | 1 | 0 |
| comprar-itens | module_review | buy-items | 10 | 4 | sim | 1 | 1 | 1 |
| revisao-restaurante | module_review | restaurant-review | 10 | 4 | sim | 1 | 1 | 0 |
| revisao-numeros | module_review | numbers-review | 10 | 4 | sim | 1 | 1 | 0 |
| revisao-hanzi-natureza | module_review | hanzi-nature-review | 10 | 4 | sim | 1 | 1 | 1 |
| imersao-mercado | immersion | immersion-market | 14 | 6 | sim | 2 | 1 | 0 |
| imersao-estacao | immersion | immersion-station | 15 | 6 | sim | 2 | 1 | 0 |
| imersao-casa-amigo | immersion | immersion-visit | 14 | 6 | sim | 2 | 1 | 0 |

## Cenas nunca usadas

Nenhuma — todas as cenas aparecem na jornada (autoral) ou em planos gerados.

## Conversation Vocabulary Loop (cobertura reversa)

| Indicador | Valor |
|-----------|------:|
| Variantes com manifesto gerado | 34 |
| Itens de vocabulário mapeados | 401 |
| Textos exibidos sem referência canônica (aviso) | 5 |
| Refs declarados nunca exibidos (aviso) | 0 |

### Texto exibido sem referência canônica standalone

_Glifos mostrados que só existem dentro de chunks (sem `char:` dedicado). O caminho direto já garante que foram ensinados; falta um ref standalone para reúso granular em SRS._

- onde-esta (advanced): sem referência canônica → "那"
- onde-esta (advanced): sem referência canônica → "里"
- apontar-natureza (advanced): sem referência canônica → "那"
- imersao-estacao (advanced): sem referência canônica → "那"
- imersao-estacao (advanced): sem referência canônica → "里"


---

_Falas contadas no caminho principal (entry → correctNextNodeId). Ramos de erro (wrongNextNodeId) também são validados quanto a vocabulário e alcançabilidade. O Vocabulary Loop mapeia o vocabulário realmente exibido em cada variante para reúso em atividades e revisões._

<!-- integridade:a86fb71d6fa5999d -->
